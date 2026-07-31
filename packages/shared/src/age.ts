/**
 * Âge : tranches, écart révélé, viviers.
 *
 * Deux principes de la spec gouvernent ce module :
 *
 * 1. La date de naissance ne quitte jamais l'appareil (§5.2). Ce qui circule, c'est
 *    au maximum une tranche et un bit majeur/mineur. L'écart entre deux personnes se
 *    calcule entre les deux appareils une fois le duo formé (§11.7).
 * 2. L'écart est révélé dès le premier écran, **avec son sens**, par exception au
 *    principe de non-révélation. Cacher le sens protégerait la vie privée du plus âgé
 *    au détriment de la sécurité du plus jeune — c'est le mauvais arbitrage (§11.7).
 */

import { AGE } from './constants.js';
import type { TrancheAge, Vivier } from './types.js';

/** Âge en années révolues à une date donnée. */
export function ageA(dateNaissanceIso: string, maintenant: number): number {
  const naissance = new Date(dateNaissanceIso);
  const ref = new Date(maintenant);

  let age = ref.getUTCFullYear() - naissance.getUTCFullYear();
  const moisEcoule = ref.getUTCMonth() - naissance.getUTCMonth();
  const jourNonAtteint =
    moisEcoule < 0 || (moisEcoule === 0 && ref.getUTCDate() < naissance.getUTCDate());
  if (jourNonAtteint) age -= 1;

  return age;
}

/** Bornes des tranches, dans l'ordre. La dernière est ouverte. */
const BORNES_TRANCHES: readonly (readonly [TrancheAge, number, number])[] = [
  ['13-15', 13, 15],
  ['16-17', 16, 17],
  ['18-25', 18, 25],
  ['26-39', 26, 39],
  ['40-55', 40, 55],
  ['56+', 56, Number.POSITIVE_INFINITY],
];

export function trancheDe(age: number): TrancheAge | null {
  if (age < AGE.MINIMUM) return null;
  for (const [tranche, min, max] of BORNES_TRANCHES) {
    if (age >= min && age <= max) return tranche;
  }
  return null;
}

export function vivierDe(age: number): Vivier {
  return age < AGE.MAJORITE ? 'mineur' : 'majeur';
}

export function estEligible(age: number): boolean {
  return age >= AGE.MINIMUM;
}

/**
 * Écart maximal autorisé entre deux joueurs.
 *
 * Chez les majeurs, c'est un réglage de l'utilisateur. Chez les mineurs, c'est une
 * constante non réglable : avec une plage de 13 à 17 ans, le défaut majeur de 15 ans
 * autoriserait un appariement 13/17, considérable à cet âge (§5.4).
 */
export function ecartMaxAutorise(vivier: Vivier, reglageUtilisateur: number): number {
  return vivier === 'mineur'
    ? AGE.ECART_MAX_MINEUR
    : Math.max(0, reglageUtilisateur);
}

export type TrancheEcart = 'moins_5' | '5_10' | '10_20' | 'plus_20';
export type SensEcart = 'plus_age' | 'plus_jeune' | 'meme_age';

export interface EcartAge {
  readonly tranche: TrancheEcart;
  readonly sens: SensEcart;
}

/**
 * Écart tel qu'il est présenté à `observateur`, par tranches et avec le sens.
 *
 * Effet secondaire remarquable, et souhaitable : quand on a 20 ans et qu'on lit
 * « 40 ans d'écart », on déduit que l'autre a 60 ans ; mais à 45 ans, « 15 ans
 * d'écart » peut désigner 30 comme 60. La fuite d'information joue en faveur des plus
 * jeunes, c'est-à-dire de ceux qu'il faut protéger.
 */
export function ecartPresente(ageObservateur: number, ageAutre: number): EcartAge {
  const delta = ageAutre - ageObservateur;
  const absolu = Math.abs(delta);

  const tranche: TrancheEcart =
    absolu < 5 ? 'moins_5' : absolu < 10 ? '5_10' : absolu <= 20 ? '10_20' : 'plus_20';

  const sens: SensEcart = delta > 0 ? 'plus_age' : delta < 0 ? 'plus_jeune' : 'meme_age';

  return { tranche, sens };
}

/**
 * Tranches dans lesquelles piocher les questions d'un duo : l'intersection des deux
 * joueurs, plus le fonds universel (§11.5 bis).
 *
 * Retourne les tranches communes. Un duo 25/40 n'en a aucune et ne reçoit donc que de
 * l'universel ; un duo 22/24 partage « 18-25 » et reçoit en plus tout ce qui lui est
 * propre. C'est ce qui évite de fabriquer six banques séparées.
 */
export function tranchesCommunes(a: TrancheAge, b: TrancheAge): readonly TrancheAge[] {
  return a === b ? [a] : [];
}
