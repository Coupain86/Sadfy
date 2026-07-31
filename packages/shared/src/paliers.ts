/**
 * Paliers et progression.
 *
 * Rappel de la règle qui structure tout le reste : **la progression appartient au duo,
 * jamais à l'individu** (P6). Il n'existe aucun profil global, aucun niveau à afficher.
 * Avec chaque nouvelle personne, tout recommence.
 */

import { POINTS, SEUILS_PALIERS } from './constants.js';
import type { JeuId, NiveauRevelation, Palier } from './types.js';

export function palierPour(points: number): Palier {
  if (points >= SEUILS_PALIERS.DECISION) return 'decision';
  if (points >= SEUILS_PALIERS.EQUIPE) return 'equipe';
  if (points >= SEUILS_PALIERS.PARTENAIRE) return 'partenaire';
  return 'fantome';
}

const ORDRE_PALIERS: readonly Palier[] = ['fantome', 'partenaire', 'equipe', 'decision'];

export function palierAuMoins(actuel: Palier, requis: Palier): boolean {
  return ORDRE_PALIERS.indexOf(actuel) >= ORDRE_PALIERS.indexOf(requis);
}

/** Points restants avant le palier suivant. `null` une fois la Décision atteinte. */
export function pointsAvantPalierSuivant(points: number): number | null {
  if (points < SEUILS_PALIERS.PARTENAIRE) return SEUILS_PALIERS.PARTENAIRE - points;
  if (points < SEUILS_PALIERS.EQUIPE) return SEUILS_PALIERS.EQUIPE - points;
  if (points < SEUILS_PALIERS.DECISION) return SEUILS_PALIERS.DECISION - points;
  return null;
}

/**
 * Ce que la révélation de fin de session laisse voir (§11.5).
 *
 * Au palier 1, on ne montre que le **nombre** de convergences, jamais lesquelles.
 * C'est frustrant dans le bon sens : c'est ce qui donne envie de revenir.
 */
export function niveauRevelation(palier: Palier): NiveauRevelation {
  switch (palier) {
    case 'fantome':
      return 'nombre_seul';
    case 'partenaire':
      return 'liste_detaillee';
    case 'equipe':
    case 'decision':
      return 'liste_et_pourcentage';
  }
}

/** Le pseudo et la tranche d'âge n'apparaissent qu'au palier 2 (§11.4). */
export function pseudoVisible(palier: Palier): boolean {
  return palierAuMoins(palier, 'partenaire');
}

/** Passions et taux d'affinité : palier 3 (§11.4). */
export function passionsVisibles(palier: Palier): boolean {
  return palierAuMoins(palier, 'equipe');
}

/** Choisir soi-même la question qu'on pose à l'autre : palier 3 (§11.4). */
export function peutChoisirLaQuestion(palier: Palier): boolean {
  return palierAuMoins(palier, 'equipe');
}

/**
 * Jeux débloqués, par palier (§15.2).
 *
 * La répartition épouse la courbe d'apprentissage du duo : deux jeux symétriques
 * d'abord — on apprend l'application avant d'apprendre l'asymétrie —, l'asymétrie au
 * palier 2, et Convergence délibérément placé tard, parce qu'aboutir au même mot
 * demande de savoir comment l'autre pense.
 */
const JEUX_PAR_PALIER: Readonly<Record<Palier, readonly JeuId[]>> = {
  fantome: ['blind_match', 'la_scie'],
  partenaire: ['portrait_robot', 'demineur_cooperatif'],
  equipe: ['convergence'],
  decision: [],
};

export function jeuxDisponibles(palier: Palier): readonly JeuId[] {
  const jusqua = ORDRE_PALIERS.indexOf(palier);
  return ORDRE_PALIERS.slice(0, jusqua + 1).flatMap((p) => JEUX_PAR_PALIER[p]);
}

/**
 * Points d'une session.
 *
 * Deux règles s'appliquent ici, et elles comptent autant l'une que l'autre :
 * perdre rapporte des points — le compteur mesure le temps passé ensemble, pas la
 * performance (§10.4) —, et une session jouée dans la même zone bénéficie du
 * multiplicateur de retrouvailles (§11.8).
 */
export function pointsSession(params: {
  readonly questionsCompletes: boolean;
  readonly jeuJoue: boolean;
  readonly jeuReussi: boolean;
  readonly memeZone: boolean;
}): number {
  let total = 0;
  if (params.questionsCompletes) total += POINTS.QUESTIONS;
  if (params.jeuJoue) {
    // Jouer rapporte, réussir rapporte davantage. Jamais zéro pour avoir joué.
    total += params.jeuReussi ? POINTS.JEU : Math.round(POINTS.JEU * 0.6);
  }
  if (params.memeZone) total = Math.round(total * POINTS.MULTIPLICATEUR_RETROUVAILLES);
  return total;
}

/** Borne le total d'une journée dans la plage de variation prévue (§11.3). */
export function bornerPointsJournee(points: number, memeZone: boolean): number {
  const max = memeZone
    ? Math.round(POINTS.SESSION_MAX * POINTS.MULTIPLICATEUR_RETROUVAILLES)
    : POINTS.SESSION_MAX;
  return Math.min(points, max);
}
