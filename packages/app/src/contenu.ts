/**
 * Le contenu, côté application.
 *
 * Les moteurs de jeu ne transportent **que des numéros** : un numéro de question, un
 * numéro de mot, un numéro d'option. Les textes n'y sont pas, et ce n'est pas une
 * économie de réseau — c'est ce qui permet de corriger une question sans redéployer le
 * serveur, et de faire évoluer le contenu à son rythme (§A6).
 *
 * **Une règle gouverne tout ce fichier : les deux joueurs doivent lire exactement la
 * même chose.** Le moteur tire un numéro ; si chacun le résolvait dans sa propre
 * banque, deux personnes joueraient à deux jeux différents en croyant jouer ensemble.
 * D'où le choix du fonds : pour les parties, **le fonds universel et lui seul**. C'est
 * le seul que deux joueurs sont certains de partager, quels que soient leurs âges. Les
 * extensions par tranche existent pour la session quotidienne, où le serveur sait
 * quelles tranches le duo a en commun.
 */

import universelles from '../../../content/questions/universelles.json';
import banqueMots from '../../../content/mots.json';
import banqueVisages from '../../../content/visages.json';

export interface Question {
  readonly id: string;
  readonly texte: string;
  readonly choix: readonly string[];
}

const QUESTIONS: readonly Question[] = universelles.questions as readonly Question[];
const MOTS: readonly string[] = banqueMots.mots;

/**
 * Résout un numéro en question.
 *
 * Le modulo n'est pas une approximation : les moteurs tirent dans un espace plus large
 * que la banque actuelle, précisément pour que la banque puisse grandir sans qu'aucun
 * code change. Le repli n'arrive donc jamais en pratique, mais rendre `null` serait
 * afficher un écran vide au milieu d'une partie.
 */
export function questionA(indice: number | null): Question | null {
  if (indice === null || QUESTIONS.length === 0) return null;
  return QUESTIONS[Math.abs(indice) % QUESTIONS.length] ?? null;
}

export function motA(indice: number): string {
  return MOTS[Math.abs(indice) % MOTS.length] ?? '…';
}

export interface EmplacementVisage {
  readonly cle: string;
  readonly libelle: string;
  readonly options: readonly string[];
}

export const EMPLACEMENTS_VISAGE: readonly EmplacementVisage[] =
  banqueVisages.emplacements;

export function libelleVisage(cle: string, option: number | undefined): string {
  const emplacement = EMPLACEMENTS_VISAGE.find((e) => e.cle === cle);
  if (!emplacement || option === undefined) return '—';
  return emplacement.options[option % emplacement.options.length] ?? '—';
}

export function emplacementVisage(cle: string | null): EmplacementVisage | null {
  if (cle === null) return null;
  return EMPLACEMENTS_VISAGE.find((e) => e.cle === cle) ?? null;
}
