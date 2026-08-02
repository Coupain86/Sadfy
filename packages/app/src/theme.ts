/**
 * Le langage visuel de Sadfy.
 *
 * Une contrainte gouverne tout : **il n'y a aucune photo, aucun média, aucun profil à
 * regarder.** L'interface ne peut donc pas s'appuyer sur des images pour exister — c'est
 * la lumière, la typographie et l'espace qui doivent porter l'émotion. Un écran plat et
 * gris ne raconte rien ; et comme il n'y a rien d'autre à regarder, il ne reste rien.
 *
 * Trois partis pris :
 *
 * - **Nocturne, pas gris.** Sadfy se joue le soir, dans un métro, sous un lampadaire.
 *   Le fond est presque noir, avec une teinte froide — et **la chaleur ne vient que de
 *   ce qui compte** : l'accent, les moments de révélation, l'autre. C'est le contraste
 *   entre les deux qui fait l'émotion, pas la couleur toute seule.
 * - **De la profondeur, pas des boîtes.** Chaque surface posée sur le fond reçoit un
 *   filet de lumière sur son bord haut, comme un objet éclairé par en haut. C'est ce
 *   détail d'un pixel qui sépare une interface d'un formulaire.
 * - **Beaucoup d'espace, peu d'éléments.** Un écran pose une question à la fois. La
 *   densité serait un contresens pour un produit qui vend l'attention portée à une
 *   seule personne.
 *
 * Aucun dégradé ni flou : ils demanderaient une bibliothèque de plus, et tout ce qui
 * suit s'obtient avec des vues empilées, donc identiquement sur les trois plateformes.
 */

export const couleurs = {
  /** Presque noir, légèrement bleu : le noir pur écrase, le gris salit. */
  fond: '#07080D',
  fondEleve: '#13151E',
  fondHaut: '#1B1E2A',
  fondEnfonce: '#04050A',

  texte: '#F4F5FA',
  texteAdouci: '#AEB3C4',
  texteEteint: '#6E7489',

  /** L'accent du produit. Chaud, parce que tout le reste est froid. */
  accent: '#FF7A4D',
  accentClair: '#FFA278',
  accentEnfonce: '#C9552F',
  /** Halo de l'accent : la même couleur, très diluée, pour poser de la lumière. */
  accentVoile: 'rgba(255, 122, 77, 0.14)',

  /** La voix de la machine — elle ne parle jamais avec la couleur des joueurs. */
  machine: '#9A8CFF',
  machineVoile: 'rgba(154, 140, 255, 0.12)',

  succes: '#46D08A',
  attention: '#F0C258',
  /** Utilisé pour le Kill Switch et le signalement, jamais pour un échec de jeu :
   *  perdre une partie n'est pas une alerte (§10.4). */
  danger: '#F05A5A',

  bordure: 'rgba(255, 255, 255, 0.09)',
  bordureVive: 'rgba(255, 255, 255, 0.16)',
  bordureAccent: 'rgba(255, 122, 77, 0.38)',

  /** Le filet de lumière posé sur le bord haut des surfaces. */
  reflet: 'rgba(255, 255, 255, 0.07)',
  /** Surfaces translucides : elles laissent voir le fond, donc elles s'y intègrent. */
  voile: 'rgba(255, 255, 255, 0.05)',
  voileFort: 'rgba(255, 255, 255, 0.09)',

  /** Le bois de La Scie. La seule matière figurative du produit. */
  bois: '#7A4A2B',
  boisClair: '#A8703F',
  boisSombre: '#4A2A16',
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
  xl: 30,
  rond: 999,
} as const;

/**
 * L'échelle typographique.
 *
 * Le resserrement des grandes tailles n'est pas cosmétique : sans lui, un titre de 40
 * points paraît lâche et amateur. Le corps, lui, reste largement interligné — c'est un
 * texte qu'on lit vraiment, pas une étiquette.
 */
export const typo = {
  /** Réservé aux moments qui comptent : la révélation, le palier, le mot de passe. */
  heros: { fontSize: 44, lineHeight: 48, fontWeight: '800' as const, letterSpacing: -1.2 },
  titre: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: -0.6 },
  sousTitre: { fontSize: 19, lineHeight: 26, fontWeight: '600' as const, letterSpacing: -0.2 },
  corps: { fontSize: 17, lineHeight: 26, fontWeight: '400' as const },
  petit: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  /** Les libellés discrets : petits, espacés, en capitales dans l'interface. */
  minuscule: { fontSize: 12, lineHeight: 17, fontWeight: '600' as const, letterSpacing: 0.8 },
} as const;

/**
 * Les élévations.
 *
 * `lueur` porte la couleur de l'accent plutôt que du noir : un bouton qui compte doit
 * **éclairer** ce qui l'entoure, pas projeter une ombre dessus.
 */
export const ombres = {
  posee: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  lueur: {
    shadowColor: couleurs.accent,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
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
