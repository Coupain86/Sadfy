/**
 * Le raccordement de l'application au serveur.
 *
 * C'est la pièce qui manquait : les écrans existaient, la logique serveur existait, mais
 * le fil entre les deux n'était pas tiré. Ce fichier tire ce fil.
 *
 * Il ne contient **aucune règle**. Le calcul des points, les paliers, les vues de jeu :
 * tout ça est décidé ailleurs — dans `@sadfy/shared` pour ce que les deux partagent,
 * sur le serveur pour ce qui fait autorité. L'application affiche, elle ne tranche pas.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  celluleEtVoisines,
  encoderCellule,
  userIdDe,
  type JeuId,
  type MessageClient,
  type MessageServeur,
  type MotifSortiePartie,
} from '@sadfy/shared';

import { modeServeur, urlServeur, type ModeServeur } from './config.js';
import { type EtatConnexion } from './connexion.js';
import { useMagasin } from './etat.js';
import {
  TransportLocal,
  TransportReseau,
  identifiantOnglet,
  type CanalDiffusion,
  type Transport,
} from './transport.js';

export interface Proposition {
  readonly propositionId: string;
  readonly avatar: string;
  readonly jeu: JeuId;
  readonly expireLe: number;
}

export interface FinPartie {
  readonly reussie: boolean;
  readonly points: number;
}

export interface EtatServeur {
  readonly connexion: EtatConnexion;
  /** `local` = le serveur tourne dans l'application. À dire à l'utilisateur (§4). */
  readonly mode: ModeServeur;
  /** Rayon courant du scan, en mètres. `null` quand aucune recherche n'est en cours. */
  readonly scanRayonM: number | null;
  readonly proposition: Proposition | null;
  /** Vue de la partie, telle que le serveur l'a projetée POUR CE JOUEUR. */
  readonly vueJeu: unknown;
  /** Le jeu en cours, annoncé par la partie elle-même. `null` hors partie. */
  readonly jeuEnCours: JeuId | null;
  readonly briefing: { readonly role: string; readonly texte: string } | null;
  /** Le partenaire a perdu le réseau — la partie attend, elle n'est pas perdue. */
  readonly partenaireAbsentJusqua: number | null;
  readonly personneTrouvee: boolean;
  /** Renseigné à la fin d'une partie, puis effacé par `oublierFin()`. */
  readonly finPartie: FinPartie | null;

  chercher(lat: number, lon: number): void;
  annulerRecherche(): void;
  /**
   * Répondre à la proposition en cours.
   *
   * Un seul verbe, parce que l'application ne sait pas — et n'a pas à savoir — si elle
   * est du côté de celui qui a cherché ou de celui qu'on a trouvé (§7.4). Le serveur
   * le sait, lui.
   */
  repondre(propositionId: string, accepte: boolean): void;
  agir(action: unknown): void;
  /**
   * Le motif est facultatif, et il le restera : partir sans rien dire n'est jamais
   * interdit. Mais partir **en le disant** ne compte pas comme un abandon, et le
   * système récompense cette politesse sans jamais l'annoncer (§10.7).
   */
  quitterPartie(motif?: MotifSortiePartie): void;
  oublierFin(): void;
}

const Contexte = createContext<EtatServeur | null>(null);

/**
 * Ouvre le bon transport pour l'identité donnée.
 *
 * Séparé du composant parce que c'est **le seul endroit du produit** qui décide s'il y a
 * un serveur ou non, et que cette décision mérite d'être lisible d'un coup d'œil.
 */
function ouvrirTransport(identite: {
  clePriveeHex: string;
  clePubliqueHex: string;
}): Transport {
  if (urlServeur) {
    return new TransportReseau({
      url: urlServeur,
      clePriveeHex: identite.clePriveeHex,
      clePubliqueHex: identite.clePubliqueHex,
    });
  }

  // Sans serveur, l'application en fait tourner un. `BroadcastChannel` relie deux
  // onglets du même navigateur : deux vrais joueurs, le vrai protocole, aucun réseau.
  return new TransportLocal({
    moi: identifiantOnglet(userIdDe(identite.clePubliqueHex)),
    canal: ouvrirCanal(),
  });
}

/**
 * Le canal entre onglets, s'il existe.
 *
 * Il n'existe pas sur mobile, et c'est sans conséquence : à deux onglets est une façon
 * de tester dans un navigateur, pas une façon de jouer. La conversion est explicite
 * parce que `CanalDiffusion` ne décrit volontairement que les trois membres dont le
 * transport se sert — décrire le reste de l'API du navigateur n'apporterait rien.
 */
function ouvrirCanal(): CanalDiffusion | undefined {
  if (typeof BroadcastChannel === 'undefined') return undefined;
  return new BroadcastChannel('sadfy') as unknown as CanalDiffusion;
}

export function FournisseurServeur({ children }: { children: ReactNode }) {
  const { donnees } = useMagasin();
  const identite = donnees.identite;

  const [connexion, setConnexion] = useState<EtatConnexion>('deconnecte');
  const [scanRayonM, setScanRayonM] = useState<number | null>(null);
  const [proposition, setProposition] = useState<Proposition | null>(null);
  const [vueJeu, setVueJeu] = useState<unknown>(null);
  const [jeuEnCours, setJeuEnCours] = useState<JeuId | null>(null);
  const [briefing, setBriefing] = useState<EtatServeur['briefing']>(null);
  const [partenaireAbsentJusqua, setPartenaireAbsent] = useState<number | null>(null);
  const [personneTrouvee, setPersonneTrouvee] = useState(false);
  const [finPartie, setFinPartie] = useState<FinPartie | null>(null);

  const client = useRef<Transport | null>(null);

  useEffect(() => {
    if (!identite) return;

    const c = ouvrirTransport(identite);
    client.current = c;

    const desabonnerEtat = c.surEtat(setConnexion);
    const desabonnerMessage = c.surMessage((message) => appliquer(message));
    c.connecter();

    return () => {
      desabonnerEtat();
      desabonnerMessage();
      c.fermer();
      client.current = null;
    };

    function appliquer(message: MessageServeur) {
      switch (message.type) {
        case 'scan':
          setScanRayonM(message.rayonM);
          setPersonneTrouvee(false);
          break;

        case 'proposition':
          setProposition({
            propositionId: message.propositionId,
            avatar: message.avatar,
            jeu: message.jeu,
            expireLe: message.expireLe,
          });
          break;

        // Jamais « refusé » : on continue simplement à chercher, sans que personne
        // n'apprenne jamais avoir été refusé (P5).
        case 'recherche_continue':
        case 'plus_disponible':
          setProposition(null);
          break;

        case 'personne_trouvee':
          setScanRayonM(null);
          setPersonneTrouvee(true);
          break;

        case 'partie_demarre':
          setProposition(null);
          setScanRayonM(null);
          setPersonneTrouvee(false);
          setFinPartie(null);
          // Le jeu vient du serveur, jamais d'une supposition de l'application : c'est
          // lui qui a tiré au sort, et lui seul le sait.
          setJeuEnCours(message.jeu);
          setBriefing({ role: message.role ?? '', texte: message.briefing });
          break;

        // La vue arrive déjà projetée : l'application n'a rien à masquer, elle n'a
        // simplement pas reçu ce qui ne la regarde pas (§A9).
        case 'vue_jeu':
          setVueJeu(message.vue);
          break;

        case 'partenaire_deconnecte':
          setPartenaireAbsent(message.reprendAvantLe);
          break;

        case 'partenaire_reconnecte':
          setPartenaireAbsent(null);
          break;

        case 'partie_terminee':
          setVueJeu(null);
          setBriefing(null);
          setJeuEnCours(null);
          setPartenaireAbsent(null);
          // Perdre rapporte des points : le compteur mesure le temps passé ensemble,
          // pas la performance (§10.4).
          setFinPartie({ reussie: message.reussie, points: message.points });
          break;

        default:
          break;
      }
    }
  }, [identite]);

  const envoyer = useCallback((message: MessageClient) => {
    client.current?.envoyer(message);
  }, []);

  const valeur: EtatServeur = useMemo(
    () => ({
      connexion,
      mode: modeServeur,
      scanRayonM,
      proposition,
      vueJeu,
      jeuEnCours,
      briefing,
      partenaireAbsentJusqua,
      personneTrouvee,
      finPartie,

      chercher(lat, lon) {
        // La position est convertie en cellule **ici**, sur l'appareil. Ce qui part sur
        // le réseau n'est déjà plus une position (§A5).
        const cellule = encoderCellule(lat, lon);
        setPersonneTrouvee(false);
        envoyer({
          type: 'chercher',
          cellule,
          cellulesVoisines: [...celluleEtVoisines(cellule)],
        });
      },
      annulerRecherche() {
        setScanRayonM(null);
        setProposition(null);
        envoyer({ type: 'annuler_recherche' });
      },
      repondre(propositionId, accepte) {
        setProposition(null);
        envoyer({ type: 'repondre_proposition', propositionId, accepte });
      },
      agir(action) {
        envoyer({ type: 'action_jeu', action });
      },
      quitterPartie(motif) {
        envoyer(motif ? { type: 'quitter_partie', motif } : { type: 'quitter_partie' });
      },
      oublierFin() {
        setFinPartie(null);
      },
    }),
    [
      connexion,
      scanRayonM,
      proposition,
      vueJeu,
      jeuEnCours,
      briefing,
      partenaireAbsentJusqua,
      personneTrouvee,
      finPartie,
      envoyer,
    ],
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useServeur(): EtatServeur {
  const valeur = useContext(Contexte);
  if (!valeur) throw new Error('useServeur doit être utilisé dans un FournisseurServeur');
  return valeur;
}
