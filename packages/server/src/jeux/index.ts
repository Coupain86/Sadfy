/**
 * Le catalogue des jeux.
 *
 * Cinq mécaniques pour la première version, pas cent jeux. La variété perçue vient du
 * **contenu par mécanique**, pas de leur nombre : le Portrait Robot est un seul jeu,
 * mais ses cinq emplacements à six options font 7 776 visages (§15.1).
 *
 * Vérification par le format : un arc de dix jours représente une dizaine de sessions.
 * Avec cinq mécaniques bien alimentées, la répétition ne se voit pas.
 */

import type { JeuId } from '@sadfy/shared';

import type { MoteurJeu } from '../moteur.js';
import { blindMatch } from './blind-match.js';
import { convergence } from './convergence-jeu.js';
import { demineurCooperatif } from './demineur.js';
import { laScie } from './la-scie.js';
import { portraitRobot } from './portrait-robot.js';

/* eslint-disable @typescript-eslint/no-explicit-any -- le registre est hétérogène par
   nature : chaque jeu a son propre type d'état et d'action. Les types sont rétablis
   dès qu'on récupère un moteur précis. */
export const CATALOGUE: Readonly<Record<JeuId, MoteurJeu<any, any>>> = {
  blind_match: blindMatch,
  la_scie: laScie,
  portrait_robot: portraitRobot,
  demineur_cooperatif: demineurCooperatif,
  convergence,
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export function moteurDe(jeu: JeuId): MoteurJeu<unknown, unknown> {
  return CATALOGUE[jeu] as MoteurJeu<unknown, unknown>;
}

export { blindMatch, convergence, demineurCooperatif, laScie, portraitRobot };
