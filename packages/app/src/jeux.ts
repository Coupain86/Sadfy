/**
 * Ce que l'application sait des jeux : leur nom et leur écran.
 *
 * Rien d'autre. **Aucune règle de jeu ne vit ici** — elles sont toutes sur le serveur,
 * qui fait autorité et n'envoie à chaque joueur que sa vue (§A9). Une application qui
 * connaîtrait les règles connaîtrait aussi ce qu'elle est censée ignorer, et l'asymétrie
 * du Portrait Robot ne tiendrait plus qu'à sa bonne volonté.
 *
 * Le `Record<JeuId, …>` n'est pas décoratif : ajouter un jeu au catalogue partagé sans
 * lui donner ici un nom et un écran ne compilera pas.
 */

import type { JeuId } from '@sadfy/shared';

export const NOMS_JEUX: Readonly<Record<JeuId, string>> = {
  blind_match: 'Blind Match',
  la_scie: 'La Scie',
  portrait_robot: 'Portrait Robot',
  demineur_cooperatif: 'Démineur coopératif',
  convergence: 'Convergence',
};

/** Durée annoncée avant d'accepter. Approximative et assumée : c'est une promesse
 *  d'engagement court, pas un chronomètre (§7.4). */
export const DUREES_JEUX: Readonly<Record<JeuId, string>> = {
  blind_match: 'environ 2 minutes',
  la_scie: 'environ 2 minutes',
  portrait_robot: 'environ 4 minutes',
  demineur_cooperatif: 'environ 4 minutes',
  convergence: 'environ 1 minute',
};

export const ECRANS_JEUX: Readonly<Record<JeuId, string>> = {
  blind_match: '/blind-match',
  la_scie: '/partie',
  portrait_robot: '/portrait-robot',
  demineur_cooperatif: '/demineur',
  convergence: '/convergence',
};
