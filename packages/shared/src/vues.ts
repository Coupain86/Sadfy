/**
 * Les vues de jeu — ce que chaque joueur reçoit, et rien d'autre.
 *
 * Ces types vivent dans le noyau partagé pour une raison précise : **le moteur les
 * produit, l'écran les consomme, et ils ne doivent pas pouvoir diverger.** Tant que la
 * vue voyageait en `unknown`, un moteur pouvait renommer un champ sans que l'écran qui
 * l'affiche cesse de compiler — il cessait seulement d'afficher quelque chose. C'est
 * exactement le genre de panne silencieuse que ce projet a déjà payée deux fois.
 *
 * Ce qui n'est **pas** dans une vue est aussi important que ce qui y est. La vue de
 * l'Inspecteur n'a pas de champ pour le visage recherché : il ne pourrait pas
 * l'afficher même si son code le voulait. La contrainte est dans le type, pas dans la
 * vigilance de celui qui l'écrit (§A9).
 */

// ---------------------------------------------------------------------------
// La Scie — §15.2
// ---------------------------------------------------------------------------

export interface VueScie {
  readonly role: 'scieur';
  readonly monTour: boolean;
  readonly coupes: number;
  readonly requises: number;
  /** Tirer en même temps bloque la scie. Le compteur sert à le raconter. */
  readonly blocages: number;
}

export type ActionScie = { readonly type: 'tirer' };

// ---------------------------------------------------------------------------
// Blind Match — §15.2
// ---------------------------------------------------------------------------

export interface RevelationBlindMatch {
  /** Indice dans la banque de questions ; le texte vit dans `content/`. */
  readonly question: number | null;
  readonly moi: 0 | 1 | 2 | 3 | undefined;
  readonly lui: 0 | 1 | 2 | 3 | undefined;
  readonly identique: boolean;
}

export interface VueBlindMatch {
  readonly role: 'joueur';
  readonly question: number | null;
  readonly tour: number;
  readonly total: number;
  readonly aRepondu: boolean;
  readonly enAttenteDeLAutre: boolean;
  /** Uniquement les tours où les deux ont tranché : sinon on lirait l'autre avant
   *  d'avoir répondu, et le jeu n'aurait plus d'intérêt. */
  readonly revelations: readonly RevelationBlindMatch[];
  readonly convergences: number;
}

export type ActionBlindMatch = { readonly type: 'repondre'; readonly choix: 0 | 1 | 2 | 3 };

// ---------------------------------------------------------------------------
// Portrait Robot — §15.2
// ---------------------------------------------------------------------------

export const EMPLACEMENTS_VISAGE = ['cheveux', 'yeux', 'nez', 'bouche', 'accessoire'] as const;
export type EmplacementVisage = (typeof EMPLACEMENTS_VISAGE)[number];

export type Visage = Readonly<Record<EmplacementVisage, number>>;

interface CommunPortraitRobot {
  readonly emplacementCourant: EmplacementVisage | null;
  readonly construit: Readonly<Partial<Record<EmplacementVisage, number>>>;
  readonly restants: number;
}

export interface VuePortraitRobotTemoin extends CommunPortraitRobot {
  readonly role: 'temoin';
  /** Lui seul l'a. C'est tout le jeu. */
  readonly visageCible: Visage;
  readonly propositionEnAttente: number | null;
}

/** Aucun champ pour le visage recherché : il n'est pas masqué, il n'existe pas ici. */
export interface VuePortraitRobotInspecteur extends CommunPortraitRobot {
  readonly role: 'inspecteur';
  readonly options: readonly number[];
  readonly enAttenteDeReponse: boolean;
  readonly essais: number;
}

export type VuePortraitRobot = VuePortraitRobotTemoin | VuePortraitRobotInspecteur;

export type ActionPortraitRobot =
  /** Inspecteur : « et si c'était celui-ci ? » */
  | { readonly type: 'proposer'; readonly valeur: number }
  /** Témoin : la seule chose qu'il puisse dire. */
  | { readonly type: 'repondre'; readonly oui: boolean };

// ---------------------------------------------------------------------------
// Démineur coopératif — §15.2
// ---------------------------------------------------------------------------

export type EtatCase = 'devoilee' | 'marquee' | 'indice' | 'inconnue';

export interface CaseDemineur {
  readonly i: number;
  readonly etat: EtatCase;
  /** Nombre de mines voisines. Absent tant que la case n'est ni révélée ni indice —
   *  c'est ce vide qui rend chacun dépendant de ce que l'autre voit. */
  readonly voisins?: number;
}

export interface VueDemineur {
  readonly role: 'artificier_nord' | 'artificier_sud';
  readonly taille: number;
  readonly minesTotal: number;
  readonly cases: readonly CaseDemineur[];
  readonly marquees: number;
  readonly explose: boolean;
}

export type ActionDemineur =
  | { readonly type: 'devoiler'; readonly case: number }
  | { readonly type: 'marquer'; readonly case: number };

// ---------------------------------------------------------------------------
// Convergence — §15.2
// ---------------------------------------------------------------------------

export interface PaireConvergence {
  readonly a: number;
  readonly b: number;
}

export interface VueConvergence {
  readonly role: 'joueur';
  readonly tour: number;
  readonly toursMax: number;
  /** Indices dans la banque de mots ; les libellés vivent dans `content/`. */
  readonly propositions: readonly number[];
  readonly maProposition: number | null;
  readonly enAttenteDeLAutre: boolean;
  /** L'histoire de la partie : c'est elle qu'on raconte après, pas le score. */
  readonly historique: readonly PaireConvergence[];
  readonly trouve: boolean;
}

export type ActionConvergence = { readonly type: 'proposer'; readonly mot: number };

// ---------------------------------------------------------------------------

export type VueJeu =
  | VueScie
  | VueBlindMatch
  | VuePortraitRobot
  | VueDemineur
  | VueConvergence;
