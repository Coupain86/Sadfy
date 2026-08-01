/**
 * Le langage visuel de Sadfy.
 *
 * Une contrainte gouverne tout : **il n'y a aucune photo, aucun média, aucun profil à
 * regarder.** L'interface ne peut donc pas s'appuyer sur des images pour exister — c'est
 * la typographie, l'espace et la couleur qui doivent porter l'émotion.
 *
 * Deux partis pris qui en découlent :
 *
 * - **Sombre par défaut.** Sadfy se joue le soir, dans un métro, sous un lampadaire.
 *   Un fond blanc à 22 h agresse.
 * - **Beaucoup d'espace, peu d'éléments.** Un écran de Sadfy pose une question à la
 *   fois. La densité serait ici un contresens : le produit vend l'attention portée à une
 *   seule personne.
 */

export const couleurs = {
  fond: '#0E0F13',
  fondEleve: '#171922',
  fondEnfonce: '#08090C',

  texte: '#F2F3F7',
  texteAdouci: '#A8ADBD',
  texteEteint: '#6B7186',

  /** L'accent du produit. Chaud, pour contrebalancer le fond froid. */
  accent: '#F2704B',
  accentEnfonce: '#C9552F',

  /** La voix de la machine — elle ne parle jamais avec la couleur des joueurs. */
  machine: '#8B7FE8',

  succes: '#4BC97A',
  attention: '#E8B84B',
  /** Utilisé pour le Kill Switch et le signalement, jamais pour un échec de jeu :
   *  perdre une partie n'est pas une alerte (§10.4). */
  danger: '#E05252',

  bordure: '#252838',
  bordureAccent: '#3A2E2A',
} as const;

/** Échelle d'espacement en multiples de 4 — assez fine pour être précise, assez
 *  grossière pour rester cohérente sans y penser. */
export const espace = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
  xxxl: 72,
} as const;

export const rayons = {
  s: 8,
  m: 14,
  l: 22,
  rond: 999,
} as const;

export const typo = {
  /** Réservé aux moments qui comptent : la révélation, le palier, le mot de passe. */
  heros: { fontSize: 34, lineHeight: 40, fontWeight: '700' as const },
  titre: { fontSize: 26, lineHeight: 32, fontWeight: '700' as const },
  sousTitre: { fontSize: 19, lineHeight: 26, fontWeight: '600' as const },
  corps: { fontSize: 17, lineHeight: 25, fontWeight: '400' as const },
  petit: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  minuscule: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
} as const;

/**
 * Durées d'animation.
 *
 * `revelation` est volontairement lente : c'est le moment pour lequel on revient chaque
 * jour, et le précipiter le banaliserait.
 */
export const durees = {
  instant: 120,
  normale: 240,
  lente: 400,
  revelation: 900,
} as const;
