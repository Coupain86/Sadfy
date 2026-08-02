/**
 * Point d'entrée du serveur.
 *
 * HTTP pour ce qui est sans état, WebSocket pour la session vive. La couche réseau
 * ne décide de rien : elle authentifie, elle traduit, et elle délègue à la salle
 * d'appariement et au moteur de parties, qui sont testables sans elle.
 */

import { createServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';

import {
  VERSION_PROTOCOLE,
  alea,
  userIdDe,
  verifierDefi,
  verifierProtocole,
  type JeuId,
  type MessageClient,
  type MessageServeur,
  type UserId,
} from '@sadfy/shared';

import { config, enProduction } from './config.js';
import { enregistrerJoueur, fermer, migrer, noterAbandonSilencieux } from './db/index.js';
import { PartiesVives } from './parties-vives.js';
import { SalleAppariement, type Evenement as EvenementSalle } from './salle.js';
import { traduirePartie, traduireSalle } from './traduction.js';
import type { EvenementPartie } from './moteur.js';

const salle = new SalleAppariement();
const parties = new PartiesVives();

/** Connexions authentifiées. Rien n'est écrit : tout disparaît à la déconnexion. */
const connexions = new Map<UserId, WebSocket>();

interface Session {
  defi: string;
  userId?: UserId;
}

const sessions = new WeakMap<WebSocket, Session>();

function envoyer(ws: WebSocket, message: MessageServeur): void {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
}

function envoyerA(userId: UserId, message: MessageServeur): void {
  const ws = connexions.get(userId);
  if (ws) envoyer(ws, message);
}

// ---------------------------------------------------------------------------

const serveurHttp = createServer((requete, reponse) => {
  if (requete.url === '/sante') {
    reponse.writeHead(200, { 'content-type': 'application/json' });
    reponse.end(JSON.stringify({ ok: true, protocole: VERSION_PROTOCOLE }));
    return;
  }
  reponse.writeHead(404);
  reponse.end();
});

const wss = new WebSocketServer({ server: serveurHttp });

wss.on('connection', (ws, requete) => {
  const versionClient = Number(new URL(requete.url ?? '/', 'http://x').searchParams.get('v'));
  const compatibilite = verifierProtocole(Number.isFinite(versionClient) ? versionClient : 0);

  if (compatibilite.statut === 'mise_a_jour_requise') {
    // Un écran « mets à jour pour continuer » plutôt qu'un plantage incompréhensible.
    envoyer(ws, { type: 'mise_a_jour_requise', minimale: compatibilite.minimale });
    ws.close();
    return;
  }

  // Le défi est unique par connexion : une signature interceptée n'est pas rejouable.
  const session: Session = { defi: alea() };
  sessions.set(ws, session);
  envoyer(ws, { type: 'defi', nonce: session.defi });

  ws.on('message', (donnees) => {
    void traiter(ws, session, donnees.toString());
  });

  ws.on('close', () => {
    if (!session.userId) return;
    connexions.delete(session.userId);
    // Position, âge, genre : tout ce que la salle détenait disparaît (§3.1).
    salle.retirer(session.userId);
    // Mais une partie en cours n'est PAS abandonnée : elle se met en pause et attend.
    // Confondre coupure et abandon punirait exactement les joueurs en transport (§10.6).
    diffuserPartie(parties.deconnecter(session.userId, Date.now()), 'la_scie');
  });
});

async function traiter(ws: WebSocket, session: Session, brut: string): Promise<void> {
  let message: MessageClient;
  try {
    message = JSON.parse(brut) as MessageClient;
  } catch {
    envoyer(ws, { type: 'erreur', code: 'json', message: 'Message illisible' });
    return;
  }

  if (message.type === 'bonjour') {
    if (!verifierDefi(session.defi, message.signature, message.clePublique)) {
      envoyer(ws, { type: 'erreur', code: 'signature', message: 'Signature invalide' });
      ws.close();
      return;
    }

    const userId = userIdDe(message.clePublique);
    session.userId = userId;
    connexions.set(userId, ws);
    await enregistrerJoueur(userId, message.clePublique);

    envoyer(ws, { type: 'bienvenue', userId, versionContenu: 1 });
    // Si une partie attendait ce joueur, elle reprend exactement où elle en était.
    diffuserPartie(parties.reconnecter(userId, Date.now()), 'la_scie');
    return;
  }

  if (!session.userId) {
    envoyer(ws, { type: 'erreur', code: 'non_authentifie', message: 'Défi non signé' });
    return;
  }

  await router(session.userId, message);
}

async function router(userId: UserId, message: MessageClient): Promise<void> {
  const maintenant = Date.now();

  switch (message.type) {
    case 'chercher':
      salle.demarrerRecherche(userId, maintenant);
      break;
    case 'annuler_recherche':
      salle.annulerRecherche(userId);
      break;
    case 'confirmer_proposition':
      diffuserSalle(salle.confirmerProposition(userId, message.propositionId, maintenant));
      break;
    case 'decliner_jeu':
      diffuserSalle(salle.declinerJeu(userId, message.propositionId, maintenant));
      break;
    case 'accepter_proposition': {
      const evenements = salle.accepterProposition(userId, message.propositionId, maintenant);
      diffuserSalle(evenements);

      // C'est ici que l'appariement devient une partie : la salle produit un duo, le
      // registre le fait jouer. Sans ce branchement, les deux moitiés du produit
      // existaient sans se parler.
      for (const evenement of evenements) {
        if (evenement.type !== 'apparies') continue;
        diffuserPartie(
          parties.demarrer(
            `${evenement.a}:${evenement.b}:${maintenant}`,
            [evenement.a, evenement.b],
            evenement.jeu,
            maintenant,
            maintenant,
            evenement.memeCellule,
          ),
          evenement.jeu,
        );
      }
      break;
    }

    case 'pret':
      break;

    case 'action_jeu':
      // Le serveur valide et rediffuse : le client n'est qu'un émetteur d'intentions.
      diffuserPartie(parties.agir(userId, message.action, maintenant), 'la_scie');
      break;

    case 'quitter_partie': {
      const evenements = parties.quitter(userId, message.motif, maintenant);
      diffuserPartie(evenements, 'la_scie');
      // Un départ **expliqué** ne compte jamais : le système récompense la politesse
      // sans jamais le dire (§10.7).
      if (message.motif === undefined) await noterAbandonSilencieux(userId);
      break;
    }

    default:
      // Les messages restants seront branchés au fil de l'implémentation.
      break;
  }
}

/**
 * Traduit les événements en messages, chacun vers son seul destinataire.
 *
 * Le cast aveugle qui se trouvait ici a coûté un bug silencieux : la salle émet
 * `proposition_initiateur`, le protocole attend `proposition`, et rien ne le signalait.
 * L'application n'aurait jamais affiché une seule proposition. La traduction est
 * désormais explicite et exhaustive (voir `traduction.ts`).
 */
function diffuserSalle(evenements: readonly EvenementSalle[]): void {
  for (const evenement of evenements) {
    const traduit = traduireSalle(evenement);
    if (traduit) envoyerA(traduit.pour, traduit.message);
  }
}

function diffuserPartie(evenements: readonly EvenementPartie[], jeu: JeuId): void {
  for (const evenement of evenements) {
    const traduit = traduirePartie(evenement, jeu);
    if (traduit) envoyerA(traduit.pour, traduit.message);
  }
}

/** Boucle d'horloge : élargissement des rayons, expirations. */
const horloge = setInterval(() => {
  const maintenant = Date.now();
  diffuserSalle(salle.tick(maintenant));
  diffuserPartie(parties.tick(maintenant), 'la_scie');
}, 1_000);

// ---------------------------------------------------------------------------

async function demarrer(): Promise<void> {
  await migrer();
  serveurHttp.listen(config.port, () => {
    console.log(
      `Sadfy écoute sur :${config.port} — protocole v${VERSION_PROTOCOLE}` +
        (config.modeTest ? ' — MODE TEST' : ''),
    );
  });
}

async function arreter(): Promise<void> {
  clearInterval(horloge);
  wss.close();
  serveurHttp.close();
  await fermer();
}

process.on('SIGTERM', () => void arreter());
process.on('SIGINT', () => void arreter());

if (!enProduction || process.env['SADFY_DEMARRER'] !== '0') {
  await demarrer();
}
