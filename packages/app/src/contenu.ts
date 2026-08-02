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

import type { Question } from '@sadfy/shared';

import universelles from '../../../content/questions/universelles.json';
import banqueMots from '../../../content/mots.json';
import banqueVisages from '../../../content/visages.json';

/**
 * Le fonds universel, tel que le tirage partagé l'attend.
 *
 * Le vivier et les tranches sont déclarés **une fois par fichier**, pas question par
 * question : c'est ce qui rend un fichier mal étiqueté impossible à moitié — soit tout
 * le fichier est cloisonné, soit rien ne l'est. On les recopie ici sur chaque question
 * parce que le tirage, lui, raisonne question par question.
 *
 * Ce fonds est le seul que deux joueurs sont certains de partager, quels que soient
 * leurs âges. Les extensions par tranche viendront du serveur, qui seul saura quelles
 * tranches un duo a réellement en commun.
 */
const FICHIER = universelles as {
  readonly vivier: Question['vivier'];
  readonly tranches: Question['tranches'];
  readonly questions: readonly {
    readonly id: string;
    readonly theme: string;
    readonly texte: string;
    readonly choix: readonly string[];
  }[];
};

export const BANQUE_UNIVERSELLE: readonly Question[] = FICHIER.questions.flatMap((q) => {
  const [a, b, c, d] = q.choix;
  // Quatre choix, ni plus ni moins : le vérificateur de contenu le garantit déjà, mais
  // une question mal formée ne doit pas faire disparaître un écran en pleine session.
  if (a === undefined || b === undefined || c === undefined || d === undefined) return [];

  return [
    {
      id: q.id,
      texte: q.texte,
      choix: [a, b, c, d] as const,
      tranches: FICHIER.tranches,
      vivier: FICHIER.vivier,
      theme: q.theme,
    },
  ];
});

const QUESTIONS = BANQUE_UNIVERSELLE;
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
