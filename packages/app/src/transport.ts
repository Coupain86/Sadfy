/**
 * Les transports — comment l'application parle au serveur.
 *
 * Il y en a deux, et le second est ce qui permet de tester Sadfy **sans héberger quoi
 * que ce soit** :
 *
 * - **`TransportReseau`** — un vrai serveur, au bout d'un WebSocket. La production.
 * - **`TransportLocal`** — le serveur tourne **dans l'application elle-même**.
 *
 * Le second n'est pas une maquette. Il exécute exactement le code du serveur : la même
 * salle d'appariement, le même moteur de parties, les mêmes projections de vues. C'est
 * possible parce que ces modules ne touchent ni au réseau, ni à la base, ni à l'horloge
 * (§A10) — une propriété qu'on s'était donnée pour pouvoir tester, et qui se révèle
 * débloquer bien plus que ça.
 *
 * Deux usages :
 *
 * 1. **Seul**, avec un partenaire simulé : on parcourt tous les écrans et tous les jeux.
 * 2. **À deux onglets**, reliés par `BroadcastChannel` : deux vrais joueurs, le vrai
 *    protocole, sur un seul appareil. Aucun serveur, aucun compte, aucune carte
 *    bancaire.
 */

import {
  AGE,
  alea,
  celluleEtVoisines,
  encoderCellule,
  type CelluleId,
  type MessageClient,
  type MessageServeur,
  type UserId,
} from '@sadfy/shared';
import {
  PartiesVives,
  SalleAppariement,
  traduirePartie,
  traduireSalle,
  type Evenement,
  type EvenementPartie,
  type Inscrit,
} from '@sadfy/server/noyau';

import { Connexion, type EtatConnexion, type OptionsConnexion } from './connexion.js';

/**
 * Le minimum de `BroadcastChannel` dont on se sert.
 *
 * Décrit ici plutôt que d'importer toute la bibliothèque de types du navigateur : sur
 * mobile l'API n'existe pas, et le transport local n'y sert qu'à jouer seul.
 */
export interface CanalDiffusion {
  postMessage(message: unknown): void;
  onmessage: ((evenement: { data: unknown }) => void) | null;
  close?(): void;
}

export interface Transport {
  readonly nom: 'reseau' | 'local';
  connecter(): void;
  fermer(): void;
  envoyer(message: MessageClient): void;
  surMessage(ecouteur: (message: MessageServeur) => void): () => void;
  /**
   * L'interface a besoin de savoir si elle est reliée — pour afficher « connexion
   * perdue » plutôt que de laisser croire que l'application est cassée. Le transport
   * local est toujours relié : il n'y a rien entre lui et le joueur.
   */
  surEtat(ecouteur: (etat: EtatConnexion) => void): () => void;
}

// ---------------------------------------------------------------------------
// Identité par onglet — mode local uniquement
// ---------------------------------------------------------------------------

/** Le peu de `sessionStorage` dont on se sert. Absent sur mobile, et ce n'est pas grave. */
export interface MemoireOnglet {
  getItem(cle: string): string | null;
  setItem(cle: string, valeur: string): void;
}

const CLE_ONGLET = 'sadfy.onglet';

/**
 * Un identifiant distinct **par onglet**, et seulement en mode local.
 *
 * « Ouvrir un deuxième onglet » est la façon dont on joue à deux sans serveur. Mais
 * deux onglets du même navigateur partagent `localStorage`, donc la même identité — et
 * deux joueurs qui portent le même identifiant ne peuvent pas se rencontrer : chacun
 * ignore l'annonce de l'autre en croyant s'entendre lui-même. `sessionStorage`, lui,
 * est propre à l'onglet ; c'est ce qui les sépare.
 *
 * Ce détournement ne concerne **que** le mode local. En réseau, l'identité est la clé
 * privée, une seule, et elle ne se dédouble jamais.
 */
export function identifiantOnglet(base: UserId, memoire?: MemoireOnglet): UserId {
  const stockage = memoire ?? (globalThis as { sessionStorage?: MemoireOnglet }).sessionStorage;
  if (!stockage) return base;

  let jeton = stockage.getItem(CLE_ONGLET);
  if (!jeton) {
    jeton = alea(4);
    stockage.setItem(CLE_ONGLET, jeton);
  }
  return `${base}#${jeton}` as UserId;
}

// ---------------------------------------------------------------------------
// Transport local
// ---------------------------------------------------------------------------

/** Identifiant du partenaire simulé, quand on joue seul. */
export const PARTENAIRE_SIMULE = 'demo-partenaire' as UserId;

export interface OptionsLocal {
  readonly moi: UserId;
  /**
   * Canal partagé entre onglets. Fourni → deux onglets deviennent deux vrais joueurs.
   * Absent → partenaire simulé, on joue seul.
   */
  readonly canal?: CanalDiffusion | undefined;
  readonly cellule?: CelluleId | undefined;
  /**
   * Accélération du temps. Permet de parcourir l'arc de dix jours en une session au
   * lieu de dix jours — indispensable pour vérifier la progression sans attendre.
   */
  readonly acceleration?: number | undefined;
}

export class TransportLocal implements Transport {
  readonly nom = 'local' as const;

  readonly #salle = new SalleAppariement();
  readonly #parties = new PartiesVives();
  readonly #ecouteurs = new Set<(m: MessageServeur) => void>();
  readonly #moi: UserId;
  readonly #canal: CanalDiffusion | undefined;
  readonly #cellule: CelluleId;

  readonly #ecouteursEtat = new Set<(etat: EtatConnexion) => void>();

  #horloge: ReturnType<typeof setInterval> | null = null;
  #partenaire: UserId;
  /** Onglets déjà connus — sans cette mémoire, les annonces rebondissent sans fin. */
  readonly #connus = new Set<UserId>();

  constructor(options: OptionsLocal) {
    this.#moi = options.moi;
    this.#canal = options.canal;
    this.#cellule = options.cellule ?? encoderCellule(48.8584, 2.2945);
    this.#partenaire = PARTENAIRE_SIMULE;
  }

  connecter(): void {
    this.#salle.configurer({ avatar: () => '◕' });
    this.#inscrire(this.#moi);

    if (this.#canal) {
      // Deux onglets : chacun annonce sa présence, l'autre l'inscrit. Le protocole
      // réel circule ensuite entre eux.
      this.#canal.onmessage = (evenement: { data: unknown }) =>
        this.#recevoirDUnAutreOnglet(evenement.data);
      this.#canal.postMessage({ type: 'presence', userId: this.#moi });
    }

    // Le partenaire simulé n'est pas inscrit ici : il ne l'est qu'au moment de
    // chercher, et seulement si aucun autre onglet ne s'est manifesté. L'inscrire
    // plus tôt reviendrait à le faire gagner contre un vrai second onglet ; ne
    // l'inscrire que sans `BroadcastChannel` — ce qu'on faisait — revenait à ne
    // jamais l'inscrire dans un navigateur, où l'API existe toujours : un onglet
    // seul cherchait alors indéfiniment et ne trouvait jamais personne.

    this.#changerEtat('connecte');
    this.#emettre({ type: 'bienvenue', userId: this.#moi, versionContenu: 1 });

    this.#horloge = setInterval(() => {
      const maintenant = Date.now();
      this.#diffuser(this.#salle.tick(maintenant));
      this.#diffuserPartie(this.#parties.tick(maintenant));
    }, 500);
  }

  fermer(): void {
    if (this.#horloge) clearInterval(this.#horloge);
    this.#horloge = null;
    if (this.#canal) this.#canal.onmessage = null;
    this.#changerEtat('deconnecte');
  }

  surMessage(ecouteur: (m: MessageServeur) => void): () => void {
    this.#ecouteurs.add(ecouteur);
    return () => this.#ecouteurs.delete(ecouteur);
  }

  surEtat(ecouteur: (etat: EtatConnexion) => void): () => void {
    this.#ecouteursEtat.add(ecouteur);
    return () => this.#ecouteursEtat.delete(ecouteur);
  }

  envoyer(message: MessageClient): void {
    const maintenant = Date.now();

    switch (message.type) {
      case 'chercher':
        // C'est ici que le partenaire de complaisance apparaît, et seulement si
        // personne d'autre n'est là.
        if (this.#seul()) this.#inscrire(PARTENAIRE_SIMULE, { genre: 'homme' });
        this.#salle.demarrerRecherche(this.#moi, maintenant);
        break;

      case 'annuler_recherche':
        this.#salle.annulerRecherche(this.#moi);
        break;

      case 'repondre_proposition': {
        this.#repondrePour(this.#moi, message.propositionId, message.accepte, maintenant);
        // Le partenaire simulé accepte toujours — c'est un partenaire de complaisance,
        // et c'est assumé : il sert à parcourir les écrans, pas à jouer contre.
        if (this.#seul() && message.accepte) {
          this.#repondrePour(PARTENAIRE_SIMULE, message.propositionId, true, maintenant);
        }
        break;
      }

      case 'action_jeu':
        this.#diffuserPartie(this.#parties.agir(this.#moi, message.action, maintenant));
        // Seul, le partenaire répond de lui-même pour que la partie avance.
        if (this.#seul()) this.#jouerPourLeSimule(maintenant);
        break;

      case 'quitter_partie':
        this.#diffuserPartie(this.#parties.quitter(this.#moi, message.motif, maintenant));
        break;

      default:
        break;
    }

    // À deux onglets, tout ce que j'envoie est aussi transmis à l'autre, qui tient sa
    // propre copie de l'état — chacun est serveur pour sa propre vue.
    this.#canal?.postMessage({ type: 'client', de: this.#moi, message });
  }

  // -------------------------------------------------------------------------

  /**
   * Personne d'autre n'est là.
   *
   * Se mesure au nombre d'onglets connus, pas à l'existence du canal : dans un
   * navigateur le canal existe toujours, même quand on est le seul onglet ouvert.
   */
  #seul(): boolean {
    return this.#connus.size === 0;
  }

  #inscrire(userId: UserId, over: Partial<Inscrit> = {}): void {
    this.#salle.inscrire({
      userId,
      cellule: this.#cellule,
      cellules: celluleEtVoisines(this.#cellule),
      age: 30,
      vivier: 'majeur',
      genre: 'femme',
      filtreGenre: 'peu_importe',
      ecartAgeMax: AGE.ECART_DEFAUT_MAJEUR,
      relationsExistantes: [],
      bloques: [],
      relationsActives: 0,
      scoreFiabilite: 1,
      exclu: false,
      palier: 'fantome',
      joignable: true,
      ...over,
    });
  }

  #repondrePour(
    qui: UserId,
    propositionId: string,
    accepte: boolean,
    maintenant: number,
  ): void {
    const evenements = this.#salle.repondre(qui, propositionId, accepte, maintenant);
    this.#diffuser(evenements);

    for (const evenement of evenements) {
      if (evenement.type !== 'apparies') continue;
      this.#partenaire = evenement.a === this.#moi ? evenement.b : evenement.a;
      this.#diffuserPartie(
        this.#parties.demarrer(
          'locale',
          [evenement.a, evenement.b],
          evenement.jeu,
          maintenant,
          maintenant,
          evenement.memeCellule,
        ),
      );
    }
  }

  /** Le partenaire simulé joue un coup plausible, pour que la partie progresse. */
  #jouerPourLeSimule(maintenant: number): void {
    const actions = [
      { type: 'tirer' },
      { type: 'repondre', oui: true },
      { type: 'repondre', choix: 0 },
      { type: 'devoiler', case: 0 },
    ];
    for (const action of actions) {
      const evenements = this.#parties.agir(PARTENAIRE_SIMULE, action, maintenant + 1);
      if (evenements.length > 0) {
        this.#diffuserPartie(evenements);
        return;
      }
    }
  }

  #recevoirDUnAutreOnglet(donnees: unknown): void {
    const paquet = donnees as { type: string; userId?: UserId; de?: UserId };

    if (paquet.type === 'presence' && paquet.userId && paquet.userId !== this.#moi) {
      // Ne répondre qu'à une annonce nouvelle. Sans ce garde, les deux onglets se
      // re-signalent mutuellement à l'infini : a prévient b, b prévient a, a prévient
      // b… et la pile déborde avant que quiconque ait joué.
      if (this.#connus.has(paquet.userId)) return;
      this.#connus.add(paquet.userId);
      this.#inscrire(paquet.userId, { genre: 'homme' });
      // On se re-signale une fois, pour que l'onglet arrivé en premier nous connaisse.
      this.#canal?.postMessage({ type: 'presence', userId: this.#moi });
      return;
    }

    if (paquet.type === 'client' && paquet.de && paquet.de !== this.#moi) {
      // On rejoue l'action de l'autre onglet dans notre copie de l'état.
      const { message } = donnees as { message: MessageClient };
      this.#appliquerPourAutre(paquet.de, message);
    }
  }

  #appliquerPourAutre(qui: UserId, message: MessageClient): void {
    const maintenant = Date.now();
    switch (message.type) {
      case 'chercher':
        this.#salle.demarrerRecherche(qui, maintenant);
        break;
      case 'repondre_proposition':
        this.#repondrePour(qui, message.propositionId, message.accepte, maintenant);
        break;
      case 'action_jeu':
        this.#diffuserPartie(this.#parties.agir(qui, message.action, maintenant));
        break;
      case 'quitter_partie':
        this.#diffuserPartie(this.#parties.quitter(qui, message.motif, maintenant));
        break;
      default:
        break;
    }
  }

  /**
   * Ne remonte à l'interface que ce qui m'est destiné, **et traduit exactement comme
   * le serveur**. Un transport local plus bavard ou parlant un autre dialecte ferait
   * tester autre chose que la production — ce qui lui retirerait tout intérêt.
   */
  #diffuser(evenements: readonly Evenement[]): void {
    for (const evenement of evenements) {
      const traduit = traduireSalle(evenement);
      if (traduit && traduit.pour === this.#moi) this.#emettre(traduit.message);
    }
  }

  #diffuserPartie(evenements: readonly EvenementPartie[]): void {
    for (const evenement of evenements) {
      const traduit = traduirePartie(evenement);
      if (traduit && traduit.pour === this.#moi) this.#emettre(traduit.message);
    }
  }

  #emettre(message: MessageServeur): void {
    for (const ecouteur of this.#ecouteurs) ecouteur(message);
  }

  #changerEtat(etat: EtatConnexion): void {
    for (const ecouteur of this.#ecouteursEtat) ecouteur(etat);
  }

  get partenaire(): UserId {
    return this.#partenaire;
  }
}

// ---------------------------------------------------------------------------
// Transport réseau
// ---------------------------------------------------------------------------

/**
 * Le vrai serveur, au bout d'un WebSocket.
 *
 * Ce n'est qu'une enveloppe autour de `Connexion` : elle existe pour que les deux
 * transports présentent exactement la même surface, et donc que l'application ne sache
 * pas lequel elle utilise. C'est cette ignorance qui garantit que ce qu'on teste en
 * local est ce qui tournera en production.
 */
export class TransportReseau implements Transport {
  readonly nom = 'reseau' as const;
  readonly #connexion: Connexion;

  constructor(options: OptionsConnexion) {
    this.#connexion = new Connexion(options);
  }

  connecter(): void {
    this.#connexion.connecter();
  }

  fermer(): void {
    this.#connexion.fermer();
  }

  envoyer(message: MessageClient): void {
    this.#connexion.envoyer(message);
  }

  surMessage(ecouteur: (message: MessageServeur) => void): () => void {
    return this.#connexion.surMessage(ecouteur);
  }

  surEtat(ecouteur: (etat: EtatConnexion) => void): () => void {
    return this.#connexion.surEtat(ecouteur);
  }
}
