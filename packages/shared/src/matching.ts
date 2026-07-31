/**
 * Règles d'appariement.
 *
 * Ces données ne vivent qu'en mémoire vive, le temps d'une recherche, et ne sont
 * jamais écrites (§3.1). Le serveur ne conserve ni position, ni âge, ni genre.
 */

import { AGE, RELATIONS } from './constants.js';
import { ecartMaxAutorise } from './age.js';
import type { CelluleId, FiltreGenre, Genre, UserId, Vivier } from './types.js';

/** Ce qu'un joueur expose au moteur d'appariement, le temps de la recherche. */
export interface CandidatRecherche {
  readonly userId: UserId;
  readonly cellule: CelluleId;
  readonly age: number;
  readonly vivier: Vivier;
  readonly genre: Genre;
  readonly filtreGenre: FiltreGenre;
  readonly ecartAgeMax: number;
  /** Duos déjà noués, actifs ou en pause : on ne réapparie pas des gens liés. */
  readonly relationsExistantes: readonly UserId[];
  /** Blocages réciproques (Kill Switch). Définitifs (§14.5). */
  readonly bloques: readonly UserId[];
  /** Relations actives comptant dans le plafond (§12.1). */
  readonly relationsActives: number;
  /** Interne, jamais affiché : dépriorise sans exclure (§14.6). */
  readonly scoreFiabilite: number;
  /** Exclu de l'appariement à la suite de signalements (§14.6). */
  readonly exclu: boolean;
}

export type RaisonIncompatibilite =
  | 'vivier_different'
  | 'ecart_age_trop_grand'
  | 'filtre_genre'
  | 'deja_apparies'
  | 'bloque'
  | 'plafond_atteint'
  | 'exclu';

/** Un filtre de genre accepte-t-il ce genre ? */
export function filtreAccepte(filtre: FiltreGenre, genre: Genre): boolean {
  switch (filtre) {
    case 'peu_importe':
      return true;
    case 'femmes':
      return genre === 'femme';
    case 'hommes':
      return genre === 'homme';
  }
}

/**
 * Compatibilité de deux joueurs. Renvoie la liste des raisons de refus — vide si tout
 * va bien. La symétrie est absolue : chaque contrainte est vérifiée dans les deux sens.
 */
export function raisonsIncompatibilite(
  a: CandidatRecherche,
  b: CandidatRecherche,
): readonly RaisonIncompatibilite[] {
  const raisons: RaisonIncompatibilite[] = [];

  if (a.exclu || b.exclu) raisons.push('exclu');

  // Cloisonnement des viviers : un mineur ne joue jamais avec un majeur (§5.4).
  if (a.vivier !== b.vivier) raisons.push('vivier_different');

  if (a.bloques.includes(b.userId) || b.bloques.includes(a.userId)) {
    raisons.push('bloque');
  }

  if (a.relationsExistantes.includes(b.userId) || b.relationsExistantes.includes(a.userId)) {
    raisons.push('deja_apparies');
  }

  if (
    a.relationsActives >= RELATIONS.PLAFOND_ACTIVES ||
    b.relationsActives >= RELATIONS.PLAFOND_ACTIVES
  ) {
    raisons.push('plafond_atteint');
  }

  // L'écart doit satisfaire les deux réglages. Chez les mineurs, la borne est imposée.
  const ecart = Math.abs(a.age - b.age);
  const maxA = ecartMaxAutorise(a.vivier, a.ecartAgeMax);
  const maxB = ecartMaxAutorise(b.vivier, b.ecartAgeMax);
  if (ecart > Math.min(maxA, maxB)) raisons.push('ecart_age_trop_grand');

  // Filtres de genre, dans les deux sens.
  if (!filtreAccepte(a.filtreGenre, b.genre) || !filtreAccepte(b.filtreGenre, a.genre)) {
    raisons.push('filtre_genre');
  }

  return raisons;
}

export function sontCompatibles(a: CandidatRecherche, b: CandidatRecherche): boolean {
  return raisonsIncompatibilite(a, b).length === 0;
}

/**
 * Ordonne les candidats compatibles.
 *
 * Priorité au plus proche, comme décidé — puis, à distance égale, aux profils les plus
 * fiables. Le serveur n'en désigne **qu'un seul** : jamais de liste à parcourir, sinon
 * on a reconstitué le balayage de profils que tout le produit refuse (§7.3).
 */
export function classerCandidats(
  demandeur: CandidatRecherche,
  candidats: readonly CandidatRecherche[],
  distanceM: (a: CelluleId, b: CelluleId) => number,
): readonly CandidatRecherche[] {
  return candidats
    .filter((c) => c.userId !== demandeur.userId && sontCompatibles(demandeur, c))
    .map((c) => ({ c, d: distanceM(demandeur.cellule, c.cellule) }))
    .sort((x, y) => x.d - y.d || y.c.scoreFiabilite - x.c.scoreFiabilite)
    .map(({ c }) => c);
}

/**
 * Le rayon de recherche courant, en fonction du temps écoulé depuis le début du scan.
 *
 * L'élargissement doit être **visible** : l'utilisateur voit la distance monter, donc
 * il comprend qu'une personne trouvée tard était loin. Et il se resserre tout seul avec
 * la densité — quand il y a du monde, la recherche n'atteint jamais le second palier,
 * sans qu'aucun réglage n'ait à être modifié (§7.1).
 */
export function rayonCourantM(
  paliers: readonly number[],
  ecouleMs: number,
  dureeTotaleMs: number,
): number {
  if (paliers.length === 0) return 0;
  const progression = Math.min(1, Math.max(0, ecouleMs / dureeTotaleMs));
  const index = Math.min(paliers.length - 1, Math.floor(progression * paliers.length));
  return paliers[index] ?? paliers[paliers.length - 1] ?? 0;
}

/** Un âge est-il recevable à l'inscription ? */
export function ageRecevable(age: number): boolean {
  return Number.isFinite(age) && age >= AGE.MINIMUM;
}
