/**
 * Le calendrier, sans interface.
 *
 * Ces quelques fonctions portent **la règle la plus sensible du produit** : c'est de la
 * date de naissance que dépend le cloisonnement mineurs/majeurs, et une erreur d'un
 * jour ici met un mineur en face d'un majeur (§5.4). Elles vivent donc à part de
 * l'écran qui les utilise, où elles sont vérifiables sans rendre quoi que ce soit.
 */

export const MOIS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const;

/** Lundi en tête : en France la semaine commence le lundi. */
export const JOURS_SEMAINE = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

/** Nombre de jours du mois, années bissextiles comprises. */
export function joursDuMois(annee: number, mois: number): number {
  return new Date(Date.UTC(annee, mois + 1, 0)).getUTCDate();
}

/**
 * Index du jour de la semaine du 1er du mois, lundi = 0.
 *
 * `getUTCDay()` compte à partir de dimanche ; un calendrier décalé d'un jour est un
 * calendrier faux, et celui-ci décide de l'âge de quelqu'un.
 */
export function premierJourSemaine(annee: number, mois: number): number {
  return (new Date(Date.UTC(annee, mois, 1)).getUTCDay() + 6) % 7;
}

/** Format ISO, le seul que le noyau partagé sait lire. */
export function dateIso(annee: number, mois: number, jour: number): string {
  const mm = String(mois + 1).padStart(2, '0');
  const jj = String(jour).padStart(2, '0');
  return `${annee}-${mm}-${jj}`;
}

export function dateEnClair(iso: string): string {
  const [a, m, j] = iso.split('-').map(Number);
  if (a === undefined || m === undefined || j === undefined) return iso;
  return `${j} ${MOIS[m - 1] ?? ''} ${a}`;
}
