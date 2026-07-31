/**
 * L'endgame — « La Décision ».
 *
 * C'est le moment le plus important du produit, et celui où les règles ont l'air les
 * plus tordues sans leur raison. Elles sont toutes écrites ici, avec leur pourquoi.
 *
 * **Le principe P5 s'inverse ici, et seulement ici.** Partout ailleurs, un refus ne se
 * révèle jamais. À l'endgame, la transparence l'emporte : laisser quelqu'un
 * indéfiniment « en attente » est du ghosting organisé par le produit, et une attente
 * sans fin est plus douloureuse qu'un refus clair — on ne peut pas tourner la page
 * d'une phrase qui ne vient jamais (§13.2).
 *
 * Ce qui rend cette transparence supportable, c'est la **réversibilité** : ce n'est pas
 * « non », c'est « pas maintenant », et celui qui a arrêté peut rouvrir des jours plus
 * tard.
 */

import {
  ENDGAME,
  SEUILS_PALIERS,
  type ChoixEndgame,
  type Genre,
  type MotifArret,
  type UserId,
} from '@sadfy/shared';

// ---------------------------------------------------------------------------
// Disponibilité
// ---------------------------------------------------------------------------

export type RefusOuverture =
  | 'points_insuffisants'
  | 'delai_de_latence'
  | 'trop_de_tentatives';

export interface EtatDecision {
  readonly points: number;
  readonly tentatives: number;
  readonly derniereTentativeLe?: number;
}

/**
 * La Décision peut-elle être ouverte ?
 *
 * Elle est **disponible** à 1000 points, elle ne bloque rien : le jeu continue
 * normalement en attendant, et elle reste déclenchable par l'un ou l'autre (§13.1).
 *
 * Mais elle n'est pas relançable à volonté. Sans le délai de 7 jours et le plafond de
 * 3 tentatives, celui qui veut se rencontrer pourrait reposer la question tous les
 * jours à celui qui ne veut pas : on aurait construit **une machine à pression**.
 */
export function peutOuvrir(etat: EtatDecision, maintenant: number): RefusOuverture | null {
  if (etat.points < SEUILS_PALIERS.DECISION) return 'points_insuffisants';
  if (etat.tentatives >= ENDGAME.TENTATIVES_MAX) return 'trop_de_tentatives';
  if (
    etat.derniereTentativeLe !== undefined &&
    maintenant - etat.derniereTentativeLe < ENDGAME.DELAI_RELANCE_MS
  ) {
    return 'delai_de_latence';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Les deux tours
// ---------------------------------------------------------------------------

export type ResultatTour =
  /** Les deux veulent la même chose : on peut communiquer le lieu ou les pseudos. */
  | { readonly type: 'accord'; readonly sur: 'rencontre' | 'reseaux' }
  /**
   * Préférences divergentes. **Elles sont révélées** : ce n'est pas un rejet, les deux
   * veulent continuer, ils ne s'accordent pas sur la forme. Le révéler est ce qui rend
   * le second tour possible (§13.2).
   */
  | { readonly type: 'divergence'; readonly choixA: ChoixEndgame; readonly choixB: ChoixEndgame }
  /**
   * Le Cadeau des rois mages : les deux ont changé d'avis, donc chacun a cédé pour
   * faire plaisir à l'autre. C'est le meilleur signal de bonne foi mutuelle que
   * l'application puisse observer, et il doit être mis en scène comme tel (§13.4).
   */
  | { readonly type: 'double_retournement'; readonly quiOuvre: UserId }
  /** Un des deux a dit « je préfère qu'on en reste là ». Réversible (§13.3). */
  | { readonly type: 'arret'; readonly par: UserId; readonly motif?: MotifArret }
  | { readonly type: 'continuer_a_jouer' }
  | { readonly type: 'en_attente' };

export interface TourEndgame {
  readonly a: UserId;
  readonly b: UserId;
  readonly genreA: Genre;
  readonly genreB: Genre;
  readonly choixA?: ChoixEndgame;
  readonly choixB?: ChoixEndgame;
  readonly motifA?: MotifArret;
  readonly motifB?: MotifArret;
  /** Choix du tour précédent, pour détecter le double retournement. */
  readonly precedentA?: ChoixEndgame;
  readonly precedentB?: ChoixEndgame;
  /** Graine du tirage au sort, dérivée du duo : reproductible, non manipulable. */
  readonly graine: number;
}

export function resoudreTour(tour: TourEndgame): ResultatTour {
  const { choixA, choixB } = tour;

  // Un arrêt prime sur tout : celui qui l'a demandé n'a pas à attendre l'autre.
  if (choixA === 'en_rester_la') {
    return { type: 'arret', par: tour.a, ...(tour.motifA ? { motif: tour.motifA } : {}) };
  }
  if (choixB === 'en_rester_la') {
    return { type: 'arret', par: tour.b, ...(tour.motifB ? { motif: tour.motifB } : {}) };
  }

  if (choixA === undefined || choixB === undefined) return { type: 'en_attente' };

  if (choixA === 'continuer_a_jouer' && choixB === 'continuer_a_jouer') {
    return { type: 'continuer_a_jouer' };
  }

  if (choixA === choixB && (choixA === 'rencontre' || choixA === 'reseaux')) {
    return { type: 'accord', sur: choixA };
  }

  // Double retournement : chacun a adopté la position que l'autre défendait au tour
  // précédent. Ils sont toujours décalés, mais dans l'autre sens.
  const aChange = tour.precedentA !== undefined && tour.precedentA !== choixA;
  const bChange = tour.precedentB !== undefined && tour.precedentB !== choixB;
  if (aChange && bChange) {
    return { type: 'double_retournement', quiOuvre: quiOuvreLaDecision(tour) };
  }

  return { type: 'divergence', choixA, choixB };
}

/**
 * Qui choisit en premier, à découvert.
 *
 * **Priorité à la femme** dans un duo homme-femme, **tirage au sort** dans tous les
 * autres cas — même sexe, non déclaré, non binaire.
 *
 * Cette règle doit être **annoncée dans l'application, pas cachée**. Le public le plus
 * difficile à convaincre sur une application de rencontre, ce sont les femmes ; annoncer
 * que c'est elle qui fixe les modalités s'adresse exactement à cette inquiétude (§13.4).
 */
export function quiOuvreLaDecision(tour: {
  readonly a: UserId;
  readonly b: UserId;
  readonly genreA: Genre;
  readonly genreB: Genre;
  readonly graine: number;
}): UserId {
  const aFemme = tour.genreA === 'femme';
  const bFemme = tour.genreB === 'femme';

  if (aFemme && !bFemme) return tour.a;
  if (bFemme && !aFemme) return tour.b;

  // Tirage au sort déterministe : dérivé du duo, donc identique des deux côtés et
  // impossible à rejouer jusqu'à obtenir le résultat voulu.
  return Math.abs(tour.graine) % 2 === 0 ? tour.a : tour.b;
}

// ---------------------------------------------------------------------------
// L'arrêt
// ---------------------------------------------------------------------------

export interface Arret {
  readonly par: UserId;
  readonly motif?: MotifArret;
}

/**
 * **Seul celui qui a arrêté peut rouvrir.**
 *
 * Si l'autre pouvait relancer, on transformerait un refus en négociation, donc en
 * pression (§13.3).
 */
export function peutRouvrir(arret: Arret, demandeur: UserId): boolean {
  return arret.par === demandeur;
}

/**
 * Un arrêt libère le créneau **des deux côtés**, immédiatement.
 *
 * Sans ça, celui qui n'a rien décidé se retrouverait avec une relation morte
 * immobilisant un de ses quatre créneaux, potentiellement pour toujours puisque l'autre
 * peut ne jamais rouvrir. Il serait puni d'une décision qui n'est pas la sienne — c'est
 * le point A3 de la revue.
 */
export const ARRET_LIBERE_LE_CRENEAU_DES_DEUX_COTES = true;

/** Le ping est désactivé dans le sens de celui qui n'a pas décidé (§13.3). */
export function pingAutoriseApresArret(arret: Arret, emetteur: UserId): boolean {
  return arret.par === emetteur;
}

// ---------------------------------------------------------------------------
// Le rendez-vous
// ---------------------------------------------------------------------------

/**
 * Intersection de deux grilles de disponibilités.
 *
 * Caler un rendez-vous sans texte libre est pénible, et cette friction pousserait les
 * gens vers Instagram uniquement pour pouvoir s'organiser — ce qui tuerait la
 * fonctionnalité la plus différenciante du produit. La grille règle ça sans un seul
 * mot : chacun tape sur les créneaux qui lui vont, l'application calcule (§13.5).
 */
export function creneauxCommuns(
  a: readonly number[],
  b: readonly number[],
): readonly number[] {
  const ensemble = new Set(b);
  return a.filter((c) => ensemble.has(c)).sort((x, y) => x - y);
}

/**
 * Un créneau le jour même n'est proposé que si **les deux** sont en « dispo pour de
 * vrai » (§6.1). C'est la fonction qu'on a redonnée à ce mode après que la grille de
 * créneaux lui a retiré la sienne.
 */
export function creneauJourMemeAutorise(
  disponibiliteA: string,
  disponibiliteB: string,
): boolean {
  return disponibiliteA === 'dispo_pour_de_vrai' && disponibiliteB === 'dispo_pour_de_vrai';
}

// ---------------------------------------------------------------------------
// Le lapin
// ---------------------------------------------------------------------------

export type SuiteLapin = 'reproposer' | 'en_rester_la' | 'option_fermee';

export interface Lapin {
  readonly duoLapins: number;
  readonly explique: boolean;
}

/**
 * Un lapin n'est pas toujours volontaire, et traiter tout le monde comme coupable
 * serait injuste. Celui qui est venu choisit ; celui qui n'est pas venu peut
 * s'expliquer avec une réponse prédéfinie (§13.5 bis).
 *
 * **Deux lapins et l'option rencontre se ferme** pour ce duo : sans plafond, on peut
 * faire attendre quelqu'un indéfiniment dans un café.
 */
export function suiteApresLapin(lapin: Lapin, souhait: 'reproposer' | 'en_rester_la'): SuiteLapin {
  if (lapin.duoLapins >= ENDGAME.LAPINS_AVANT_FERMETURE) return 'option_fermee';
  return souhait;
}

/**
 * Un lapin **expliqué** ne compte pas dans l'indicateur de fiabilité. Un lapin
 * silencieux, oui.
 *
 * Même mécanique que le message de sortie de partie : le système récompense la
 * politesse sans jamais le dire (§10.7, §13.5 bis).
 */
export function lapinCompteDansLaFiabilite(lapin: Lapin): boolean {
  return !lapin.explique;
}

// ---------------------------------------------------------------------------
// Le point mystère
// ---------------------------------------------------------------------------

/**
 * Graine du tirage du lieu de rendez-vous.
 *
 * **Le tirage se fait sur les téléphones, jamais ici.** Les deux appareils connaissent
 * la cellule de leur première rencontre et partagent cette graine, donc ils tombent
 * nécessairement sur le même lieu — sans que le serveur ait jamais su lequel ni où.
 *
 * Écrire cette cellule en base aurait été une position, permanente, pour chaque
 * relation : de quoi reconstituer le quartier de quelqu'un à partir de quelques duos.
 * Voir la note du schéma SQL.
 */
export function grainePointMystere(duoId: string): number {
  let h = 2166136261;
  for (let i = 0; i < duoId.length; i += 1) {
    h ^= duoId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

/**
 * Les mineurs n'ont **ni rencontre organisée, ni échange de réseaux** (§13.7).
 *
 * La frontière est essentielle : pour les adultes, l'application organise une
 * rencontre ; pour les mineurs, elle donne seulement un moyen de se reconnaître. Le
 * code ne sert que s'ils sont déjà dans le même endroit de leur vie normale — même
 * école, même quartier, même club. **L'application ne les rapproche pas d'un mètre**,
 * et le code n'est jamais accompagné de la moindre indication de lieu ni d'horaire.
 */
export function optionsEndgame(vivier: 'mineur' | 'majeur'): readonly ChoixEndgame[] {
  if (vivier === 'mineur') return ['continuer_a_jouer', 'en_rester_la'];
  return ['rencontre', 'reseaux', 'continuer_a_jouer', 'en_rester_la'];
}
