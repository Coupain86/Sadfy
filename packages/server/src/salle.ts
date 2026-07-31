/**
 * La salle d'appariement.
 *
 * Logique pure, sans réseau ni base de données : l'horloge est injectée, tout est
 * testable. La couche WebSocket se contente de traduire les événements produits ici.
 *
 * **Rien de ce qui vit dans cette salle n'est écrit sur disque** (§3.1). Position,
 * âge, genre : tout disparaît quand la recherche s'arrête ou que la connexion tombe.
 *
 * Les trois règles qui façonnent le code ci-dessous :
 * - **Un seul candidat à la fois, jamais de liste.** Une liste, c'est un catalogue, et
 *   on est revenu au balayage de profils que tout le produit refuse (§7.3).
 * - **Décliner relance le jeu, jamais la personne.** Sinon décliner ferait défiler les
 *   candidats un par un : le balayage reconstitué autrement (§7.4).
 * - **Aucun refus n'est jamais annoncé.** L'initiateur voit « on continue à chercher »,
 *   sans jamais savoir si l'autre a dit non ou n'a rien vu (P5).
 */

import {
  GEO,
  RECHERCHE,
  classerCandidats,
  distanceCellulesM,
  jeuxDisponibles,
  rayonCourantM,
  type CandidatRecherche,
  type CelluleId,
  type JeuId,
  type Palier,
  type UserId,
} from '@sadfy/shared';

// ---------------------------------------------------------------------------

export interface Inscrit extends CandidatRecherche {
  /** Cellule et ses 8 voisines, telles que transmises par l'appareil. */
  readonly cellules: readonly CelluleId[];
  /** Le palier ne s'applique qu'aux duos existants ; un inconnu part au palier 1. */
  readonly palier: Palier;
  /** Application ouverte, ou joignable par notification (natif seulement). */
  readonly joignable: boolean;
}

type EtapeRecherche =
  | 'scan'
  | 'attente_confirmation_initiateur'
  | 'attente_acceptation_cible'
  | 'attente_retour_initiateur';

interface Recherche {
  readonly initiateur: UserId;
  readonly demarreeLe: number;
  etape: EtapeRecherche;
  propositionId?: string;
  cible?: UserId;
  jeu?: JeuId;
  /** Jeux déjà déclinés pour ce candidat : on ne repropose pas le même. */
  jeuxDeclines: JeuId[];
  echeance?: number;
}

export type Evenement =
  | { readonly type: 'scan'; readonly pour: UserId; readonly rayonM: number; readonly ecouleMs: number }
  | {
      readonly type: 'proposition_initiateur';
      readonly pour: UserId;
      readonly propositionId: string;
      readonly avatar: string;
      readonly jeu: JeuId;
      readonly expireLe: number;
    }
  | {
      readonly type: 'proposition_cible';
      readonly pour: UserId;
      readonly propositionId: string;
      readonly avatar: string;
      readonly jeu: JeuId;
      readonly expireLe: number;
    }
  /** Jamais « refusé » : on continue simplement à chercher (P5). */
  | { readonly type: 'recherche_continue'; readonly pour: UserId }
  /** Constat neutre pour celui qui avait accepté, jamais « il a refusé » (§7.5). */
  | { readonly type: 'plus_disponible'; readonly pour: UserId }
  | { readonly type: 'personne_trouvee'; readonly pour: UserId }
  | {
      readonly type: 'apparies';
      readonly a: UserId;
      readonly b: UserId;
      readonly jeu: JeuId;
      readonly memeCellule: boolean;
    };

// ---------------------------------------------------------------------------

export class SalleAppariement {
  readonly #inscrits = new Map<UserId, Inscrit>();
  readonly #recherches = new Map<UserId, Recherche>();
  /** Cible → recherche qui la retient. Un inconnu retenu est invisible aux autres. */
  readonly #retenus = new Map<UserId, UserId>();

  #avatar: (u: UserId) => string = (u) => u.slice(0, 8);
  #tirerJeu: (jeux: readonly JeuId[], graine: number) => JeuId = (jeux, graine) =>
    jeux[Math.abs(graine) % jeux.length] ?? 'blind_match';

  inscrire(inscrit: Inscrit): void {
    this.#inscrits.set(inscrit.userId, inscrit);
  }

  retirer(userId: UserId): void {
    this.#inscrits.delete(userId);
    this.#libererCible(userId);
    this.#recherches.delete(userId);
    for (const [cible, initiateur] of this.#retenus) {
      if (initiateur === userId) this.#retenus.delete(cible);
    }
  }

  get inscrits(): number {
    return this.#inscrits.size;
  }

  /** Injection pour les tests : rend les avatars et le tirage des jeux déterministes. */
  configurer(options: {
    avatar?: (u: UserId) => string;
    tirerJeu?: (jeux: readonly JeuId[], graine: number) => JeuId;
  }): void {
    if (options.avatar) this.#avatar = options.avatar;
    if (options.tirerJeu) this.#tirerJeu = options.tirerJeu;
  }

  demarrerRecherche(initiateur: UserId, maintenant: number): void {
    if (!this.#inscrits.has(initiateur)) return;
    this.#recherches.set(initiateur, {
      initiateur,
      demarreeLe: maintenant,
      etape: 'scan',
      jeuxDeclines: [],
    });
  }

  annulerRecherche(initiateur: UserId): void {
    const recherche = this.#recherches.get(initiateur);
    if (!recherche) return;
    if (recherche.cible) this.#retenus.delete(recherche.cible);
    this.#recherches.delete(initiateur);
  }

  /**
   * Fait avancer le temps. Produit les élargissements de rayon, les propositions et
   * les expirations. Appelée par la boucle du serveur, et directement par les tests.
   */
  tick(maintenant: number): readonly Evenement[] {
    const evenements: Evenement[] = [];

    for (const recherche of [...this.#recherches.values()]) {
      switch (recherche.etape) {
        case 'scan':
          evenements.push(...this.#avancerScan(recherche, maintenant));
          break;
        default:
          evenements.push(...this.#verifierEcheance(recherche, maintenant));
      }
    }

    return evenements;
  }

  #avancerScan(recherche: Recherche, maintenant: number): readonly Evenement[] {
    const ecouleMs = maintenant - recherche.demarreeLe;
    const rayonM = Math.min(
      GEO.RAYON_MAX_M,
      rayonCourantM([...GEO.PALIERS_ELARGISSEMENT_M], ecouleMs, GEO.DUREE_SCAN_MS),
    );

    const candidat = this.#chercherCandidat(recherche.initiateur, rayonM);

    if (!candidat) {
      // Le scan continue jusqu'au bout de sa durée, en montrant le rayon qui s'élargit :
      // l'utilisateur comprend ainsi qu'une personne trouvée tard était loin (§7.1).
      if (ecouleMs >= GEO.DUREE_SCAN_MS) {
        this.#recherches.delete(recherche.initiateur);
        return [{ type: 'personne_trouvee', pour: recherche.initiateur }];
      }
      return [{ type: 'scan', pour: recherche.initiateur, rayonM, ecouleMs }];
    }

    return this.#proposerA(recherche, candidat, maintenant);
  }

  #proposerA(
    recherche: Recherche,
    candidat: Inscrit,
    maintenant: number,
  ): readonly Evenement[] {
    const initiateur = this.#inscrits.get(recherche.initiateur);
    if (!initiateur) return [];

    // Le catalogue est celui du palier du duo. Un inconnu part au palier 1, qui
    // débloque deux jeux — d'où le garde-fou de la revue : le nombre de propositions
    // s'adapte à ce qui est débloqué, il n'est jamais fixé à cinq (§9.1).
    const catalogue = jeuxDisponibles(initiateur.palier).filter(
      (j) => !recherche.jeuxDeclines.includes(j),
    );
    if (catalogue.length === 0) {
      // Tous les jeux du palier ont été déclinés : on arrête plutôt que de tourner.
      this.#libererCible(candidat.userId);
      this.#recherches.delete(recherche.initiateur);
      return [{ type: 'personne_trouvee', pour: recherche.initiateur }];
    }

    const propositionId = `${recherche.initiateur}:${maintenant}`;
    const jeu = this.#tirerJeu(catalogue, maintenant);

    recherche.etape = 'attente_confirmation_initiateur';
    recherche.propositionId = propositionId;
    recherche.cible = candidat.userId;
    recherche.jeu = jeu;
    recherche.echeance = maintenant + RECHERCHE.DELAI_DECISION_MS;

    // La cible est retenue : les autres inconnus ne la voient plus, silencieusement.
    // Aucun message « occupé » n'est jamais envoyé à personne (§7.7).
    this.#retenus.set(candidat.userId, recherche.initiateur);

    return [
      {
        type: 'proposition_initiateur',
        pour: recherche.initiateur,
        propositionId,
        avatar: this.#avatar(candidat.userId),
        jeu,
        expireLe: recherche.echeance,
      },
    ];
  }

  /** L'initiateur confirme : la proposition part vers la cible. */
  confirmerProposition(initiateur: UserId, propositionId: string, maintenant: number): readonly Evenement[] {
    const recherche = this.#recherches.get(initiateur);
    if (
      !recherche ||
      recherche.propositionId !== propositionId ||
      recherche.etape !== 'attente_confirmation_initiateur' ||
      !recherche.cible ||
      !recherche.jeu
    ) {
      return [];
    }

    recherche.etape = 'attente_acceptation_cible';
    // La cible a le temps de sortir son téléphone : ce délai-là est généreux, et le
    // délai de décision ne démarrera qu'à l'ouverture réelle de la proposition (§7.5).
    recherche.echeance = maintenant + RECHERCHE.DUREE_DEMANDE_MS;

    return [
      {
        type: 'proposition_cible',
        pour: recherche.cible,
        propositionId,
        avatar: this.#avatar(initiateur),
        jeu: recherche.jeu,
        expireLe: recherche.echeance,
      },
    ];
  }

  /**
   * L'initiateur décline. On repropose **un autre jeu avec la même personne** — jamais
   * une autre personne. Pour changer de personne, il faut annuler et relancer un scan
   * complet : la friction est volontaire (§7.4).
   */
  declinerJeu(initiateur: UserId, propositionId: string, maintenant: number): readonly Evenement[] {
    const recherche = this.#recherches.get(initiateur);
    if (
      !recherche ||
      recherche.propositionId !== propositionId ||
      recherche.etape !== 'attente_confirmation_initiateur' ||
      !recherche.cible ||
      !recherche.jeu
    ) {
      return [];
    }

    recherche.jeuxDeclines.push(recherche.jeu);
    const candidat = this.#inscrits.get(recherche.cible);
    if (!candidat) {
      this.#libererCible(recherche.cible);
      recherche.etape = 'scan';
      return [{ type: 'recherche_continue', pour: initiateur }];
    }

    return this.#proposerA(recherche, candidat, maintenant + 1);
  }

  /** La cible accepte. L'initiateur doit encore être là (§7.5). */
  accepterProposition(cible: UserId, propositionId: string, maintenant: number): readonly Evenement[] {
    const recherche = this.#rechercheParProposition(propositionId);
    if (!recherche || recherche.cible !== cible || recherche.etape !== 'attente_acceptation_cible') {
      return [];
    }

    const initiateur = this.#inscrits.get(recherche.initiateur);
    const candidat = this.#inscrits.get(cible);
    if (!initiateur || !candidat || !recherche.jeu) return [];

    // L'initiateur a pu ranger son téléphone : on le notifie et on lui laisse un
    // court délai pour revenir. S'il ne revient pas, la cible verra un constat neutre.
    recherche.etape = 'attente_retour_initiateur';
    recherche.echeance = maintenant + RECHERCHE.DELAI_RETOUR_INITIATEUR_MS;

    if (initiateur.joignable) {
      return this.#apparier(recherche, initiateur, candidat);
    }
    return [];
  }

  /** L'initiateur revient après une acceptation. */
  confirmerRetour(initiateur: UserId, maintenant: number): readonly Evenement[] {
    const recherche = this.#recherches.get(initiateur);
    if (!recherche || recherche.etape !== 'attente_retour_initiateur') return [];
    if (recherche.echeance !== undefined && maintenant > recherche.echeance) return [];

    const a = this.#inscrits.get(initiateur);
    const b = recherche.cible ? this.#inscrits.get(recherche.cible) : undefined;
    if (!a || !b) return [];

    return this.#apparier(recherche, a, b);
  }

  #apparier(recherche: Recherche, a: Inscrit, b: Inscrit): readonly Evenement[] {
    this.#recherches.delete(recherche.initiateur);
    this.#retenus.delete(b.userId);

    // La cible pouvait scanner de son côté : deux personnes qui cherchent en même
    // temps ont le droit de se trouver. Une fois appariée, sa propre recherche n'a
    // plus lieu d'être — sans ça elle resterait orpheline et continuerait à proposer
    // des candidats à quelqu'un qui est déjà en partie.
    this.annulerRecherche(b.userId);

    return [
      {
        type: 'apparies',
        a: a.userId,
        b: b.userId,
        jeu: recherche.jeu ?? 'blind_match',
        // Sert au bonus de retrouvailles et à ancrer le point mystère de l'endgame
        // dans la zone où le duo s'est rencontré (§11.8, §13.5).
        memeCellule: a.cellule === b.cellule,
      },
    ];
  }

  #verifierEcheance(recherche: Recherche, maintenant: number): readonly Evenement[] {
    if (recherche.echeance === undefined || maintenant <= recherche.echeance) return [];

    const cible = recherche.cible;
    const etape = recherche.etape;

    if (cible) this.#retenus.delete(cible);

    if (etape === 'attente_retour_initiateur' && cible) {
      // Celui qui avait accepté ne doit jamais apprendre qu'on l'a laissé tomber
      // volontairement : le message est un constat, pas un refus (§7.5).
      this.#recherches.delete(recherche.initiateur);
      return [{ type: 'plus_disponible', pour: cible }];
    }

    // Expiration côté cible : l'initiateur repart en scan, sans jamais savoir si
    // l'autre a refusé ou n'a simplement rien vu (P5).
    recherche.etape = 'scan';
    delete recherche.propositionId;
    delete recherche.cible;
    delete recherche.jeu;
    delete recherche.echeance;
    recherche.jeuxDeclines = [];

    return [{ type: 'recherche_continue', pour: recherche.initiateur }];
  }

  #chercherCandidat(initiateur: UserId, rayonM: number): Inscrit | undefined {
    const demandeur = this.#inscrits.get(initiateur);
    if (!demandeur) return undefined;

    const dansLeRayon = [...this.#inscrits.values()].filter((c) => {
      if (c.userId === initiateur) return false;
      if (!c.joignable) return false;
      // Un inconnu déjà retenu par une autre demande est invisible, silencieusement.
      if (this.#retenus.has(c.userId)) return false;
      // Quelqu'un qui est lui-même en pleine négociation ne peut pas être sollicité :
      // il serait engagé dans deux appariements à la fois. En revanche, quelqu'un qui
      // ne fait que scanner reste candidat — sans quoi deux personnes qui cherchent
      // en même temps ne se trouveraient jamais, ce qui serait absurde.
      if (this.#recherches.get(c.userId)?.etape !== undefined) {
        if (this.#recherches.get(c.userId)?.etape !== 'scan') return false;
      }
      return this.#distanceMin(demandeur.cellules, c.cellules) <= rayonM;
    });

    const classes = classerCandidats(demandeur, dansLeRayon, distanceCellulesM);
    // Un seul, jamais une liste.
    return classes[0] as Inscrit | undefined;
  }

  /** Distance minimale entre deux ensembles de cellules — la cellule et ses voisines. */
  #distanceMin(a: readonly CelluleId[], b: readonly CelluleId[]): number {
    let min = Number.POSITIVE_INFINITY;
    for (const ca of a) {
      for (const cb of b) {
        if (ca === cb) return 0;
        min = Math.min(min, distanceCellulesM(ca, cb));
      }
    }
    return min;
  }

  #rechercheParProposition(propositionId: string): Recherche | undefined {
    for (const recherche of this.#recherches.values()) {
      if (recherche.propositionId === propositionId) return recherche;
    }
    return undefined;
  }

  #libererCible(cible: UserId): void {
    this.#retenus.delete(cible);
  }
}
