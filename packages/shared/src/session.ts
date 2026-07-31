/**
 * Le jour Sadfy et la comptabilisation des sessions.
 *
 * Deux règles, subtiles mais décisives (§11.3) :
 *
 * - **La journée court de 4 h à 4 h.** Une session tardive est rattachée à la veille,
 *   ce qui correspond au ressenti de l'utilisateur et empêche surtout d'encadrer minuit
 *   pour gagner deux jours de progression en une soirée.
 * - **On ne limite pas le jeu, on limite la progression.** Un duo peut rejouer autant
 *   qu'il veut ; seule la première session de la journée fait avancer le compteur.
 *   Bloquer les gens au moment où ils ont le plus envie tuerait l'élan du premier jour.
 */

import { JOUR, RYTHME } from './constants.js';

/**
 * Numéro de jour Sadfy pour un instant donné.
 *
 * `offsetMinutes` est le décalage horaire de référence du duo, figé à sa création :
 * les deux joueurs se sont rencontrés physiquement, donc dans le même fuseau. Le
 * conserver garantit qu'ils restent d'accord sur la date même s'ils s'éloignent
 * ensuite — conséquence directe du gel de la distance (§7.6).
 */
export function jourSadfy(instant: number, offsetMinutes: number): number {
  const local = instant + offsetMinutes * 60_000;
  return Math.floor((local - RYTHME.HEURE_BASCULE_JOUR * 3_600_000) / JOUR);
}

/** Instant de la prochaine bascule de journée, pour afficher un compte à rebours. */
export function prochaineBasculeJour(instant: number, offsetMinutes: number): number {
  const jour = jourSadfy(instant, offsetMinutes);
  const debutJourSuivant =
    (jour + 1) * JOUR + RYTHME.HEURE_BASCULE_JOUR * 3_600_000 - offsetMinutes * 60_000;
  return debutJourSuivant;
}

/**
 * Cette partie fait-elle progresser le compteur ?
 *
 * Non si le duo a déjà eu sa session comptabilisée aujourd'hui — mais la partie se joue
 * quand même. Rien n'est jamais refusé, seule la progression est plafonnée.
 */
export function sessionCompte(
  derniereSessionJour: number | undefined,
  jourActuel: number,
): boolean {
  return derniereSessionJour === undefined || derniereSessionJour < jourActuel;
}

/**
 * Nombre de questions d'une session. Varié pour que le rituel ne soit pas mécanique,
 * mais déterministe à partir du duo et du jour, afin que les deux joueurs reçoivent
 * exactement la même chose sans avoir à se synchroniser (§11.2).
 */
export function nombreQuestions(graine: number): number {
  const etendue = RYTHME.QUESTIONS_PAR_SESSION_MAX - RYTHME.QUESTIONS_PAR_SESSION_MIN + 1;
  return RYTHME.QUESTIONS_PAR_SESSION_MIN + (Math.abs(graine) % etendue);
}

/**
 * Graine déterministe pour un duo et un jour donnés.
 *
 * Les questions étant asynchrones, les deux joueurs les tirent chacun de leur côté,
 * potentiellement à des heures très différentes. Il faut donc que le tirage dépende
 * uniquement de (duo, jour) et d'aucun état local.
 */
export function graineSession(duoId: string, jour: number): number {
  let h = 2166136261;
  const entree = `${duoId}:${jour}`;
  for (let i = 0; i < entree.length; i += 1) {
    h ^= entree.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

/**
 * Un jeu non joué dans la journée est simplement perdu, sans report ni pénalité.
 *
 * Toute autre règle créerait une comptabilité de dettes que personne ne comprendrait :
 * si le duo répond aux questions lundi et ne parvient à jouer que mercredi, le jeu du
 * mercredi rapporte les points du mercredi, et celui de lundi n'existe plus.
 */
export function jeuEncoreJouable(jourDeLaSession: number, jourActuel: number): boolean {
  return jourDeLaSession === jourActuel;
}
