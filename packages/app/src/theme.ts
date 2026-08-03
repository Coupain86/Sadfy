/**
 * Le langage visuel de Sadfy — en deux apparences.
 *
 * Une contrainte gouverne tout : **il n'y a aucune photo, aucun média, aucun profil à
 * regarder.** L'interface ne peut donc pas s'appuyer sur des images pour exister — c'est
 * la lumière, la typographie et l'espace qui doivent porter l'émotion. Un écran plat et
 * gris ne raconte rien ; et comme il n'y a rien d'autre à regarder, il ne reste rien.
 *
 * **Deux apparences, pas une teinte inversée.** Le sombre et le clair ne se déduisent
 * pas l'un de l'autre : sur fond noir, la profondeur vient d'un filet de lumière sur le
 * bord haut ; sur fond blanc, elle vient d'une ombre portée douce. Inverser
 * mécaniquement les valeurs donne une interface grise et sale — c'est pour ça que
 * chaque palette est écrite à la main.
 *
 * Ce qui ne change pas d'une apparence à l'autre : l'accent reste chaud, la voix de la
 * machine reste violette et distincte de celle des joueurs, et le bois de La Scie reste
 * du bois.
 *
 * Aucun dégradé ni flou : ils demanderaient une bibliothèque de plus, et tout ce qui
 * suit s'obtient avec des vues empilées, donc identiquement sur les trois plateformes.
 */

import { useEffect, useState } from 'react';

export type Apparence = 'sombre' | 'clair';

/** Ce que l'utilisateur choisit. `systeme` suit le réglage du téléphone. */
export type ChoixApparence = 'systeme' | Apparence;

export interface Palette {
  readonly nom: Apparence;

  readonly fond: string;
  readonly fondEleve: string;
  readonly fondHaut: string;
  readonly fondEnfonce: string;

  readonly texte: string;
  readonly texteAdouci: string;
  readonly texteEteint: string;
  /** Le texte posé sur l'accent plein. Clair sur fond sombre, et l'inverse. */
  readonly texteSurAccent: string;

  readonly accent: string;
  readonly accentClair: string;
  readonly accentEnfonce: string;
  readonly accentVoile: string;

  readonly machine: string;
  readonly machineVoile: string;

  readonly succes: string;
  readonly attention: string;
  readonly danger: string;

  readonly bordure: string;
  readonly bordureVive: string;
  readonly bordureAccent: string;

  /** Le filet de lumière du bord haut. Nul en clair : c'est l'ombre qui porte. */
  readonly reflet: string;
  readonly voile: string;
  readonly voileFort: string;

  readonly bois: string;
  readonly boisClair: string;
  readonly boisSombre: string;

  /** Opacité du halo. Un halo trop marqué sur blanc devient une tache. */
  readonly opaciteHalo: number;
}

/**
 * Le sombre : nocturne, pas gris.
 *
 * Sadfy se joue le soir, dans un métro, sous un lampadaire. Le fond est presque noir,
 * avec une teinte froide — et **la chaleur ne vient que de ce qui compte**. C'est le
 * contraste entre les deux qui fait l'émotion, pas la couleur toute seule.
 */
export const SOMBRE: Palette = {
  nom: 'sombre',

  fond: '#07080D',
  fondEleve: '#13151E',
  fondHaut: '#1B1E2A',
  fondEnfonce: '#04050A',

  texte: '#F4F5FA',
  texteAdouci: '#AEB3C4',
  texteEteint: '#6E7489',
  texteSurAccent: '#04050A',

  accent: '#FF7A4D',
  accentClair: '#FFA278',
  accentEnfonce: '#C9552F',
  accentVoile: 'rgba(255, 122, 77, 0.14)',

  machine: '#9A8CFF',
  machineVoile: 'rgba(154, 140, 255, 0.12)',

  succes: '#46D08A',
  attention: '#F0C258',
  danger: '#F05A5A',

  bordure: 'rgba(255, 255, 255, 0.09)',
  bordureVive: 'rgba(255, 255, 255, 0.16)',
  bordureAccent: 'rgba(255, 122, 77, 0.38)',

  reflet: 'rgba(255, 255, 255, 0.07)',
  voile: 'rgba(255, 255, 255, 0.05)',
  voileFort: 'rgba(255, 255, 255, 0.09)',

  bois: '#7A4A2B',
  boisClair: '#A8703F',
  boisSombre: '#4A2A16',

  opaciteHalo: 0.06,
};

/**
 * Le clair : blanc, net, respirant.
 *
 * Pas un sombre inversé. Sur blanc, la profondeur ne peut pas venir de la lumière —
 * elle vient de **l'ombre portée et du blanc pur des surfaces posées sur un fond
 * légèrement teinté**. Les gris de texte sont plus foncés qu'ils n'en ont l'air :
 * sur blanc, un gris moyen devient illisible dehors, en plein jour.
 *
 * L'accent est un peu plus dense qu'en sombre : le même orange paraît fluorescent sur
 * blanc, et fluorescent, ça fait bon marché.
 */
export const CLAIR: Palette = {
  nom: 'clair',

  /** Le fond est très légèrement teinté : du blanc pur partout écraserait les cartes. */
  fond: '#F4F5F9',
  fondEleve: '#FFFFFF',
  fondHaut: '#FFFFFF',
  fondEnfonce: '#E9EBF2',

  texte: '#0D0F16',
  texteAdouci: '#4A5063',
  texteEteint: '#858BA0',
  texteSurAccent: '#FFFFFF',

  accent: '#F0562A',
  accentClair: '#FF8256',
  accentEnfonce: '#C13F19',
  accentVoile: 'rgba(240, 86, 42, 0.10)',

  machine: '#6A57E0',
  machineVoile: 'rgba(106, 87, 224, 0.09)',

  succes: '#12A05C',
  attention: '#B5810A',
  danger: '#D93A3A',

  bordure: 'rgba(13, 15, 22, 0.09)',
  bordureVive: 'rgba(13, 15, 22, 0.18)',
  bordureAccent: 'rgba(240, 86, 42, 0.42)',

  /** Aucun filet de lumière : sur blanc il ne se voit pas, et l'ombre suffit. */
  reflet: 'transparent',
  voile: 'rgba(13, 15, 22, 0.035)',
  voileFort: 'rgba(13, 15, 22, 0.07)',

  bois: '#B07344',
  boisClair: '#D3985F',
  boisSombre: '#7A4A2B',

  opaciteHalo: 0.05,
};

// ---------------------------------------------------------------------------
// L'apparence active
// ---------------------------------------------------------------------------

let choix: ChoixApparence = 'systeme';
let systeme: Apparence = 'sombre';
const abonnes = new Set<() => void>();

export function apparenceActive(): Apparence {
  return choix === 'systeme' ? systeme : choix;
}

export function palette(): Palette {
  return apparenceActive() === 'clair' ? CLAIR : SOMBRE;
}

export function choixApparence(): ChoixApparence {
  return choix;
}

export function reglerApparence(nouveau: ChoixApparence): void {
  if (choix === nouveau) return;
  choix = nouveau;
  prevenir();
}

/** Renseigné par la racine à partir du réglage du téléphone. */
export function reglerApparenceSysteme(nouveau: Apparence): void {
  if (systeme === nouveau) return;
  systeme = nouveau;
  if (choix === 'systeme') prevenir();
}

function prevenir(): void {
  for (const abonne of [...abonnes]) abonne();
}

/**
 * S'abonner à l'apparence, et obtenir la palette courante.
 *
 * Tout composant qui lit une couleur passe par ici. C'est ce qui garantit qu'un
 * changement d'apparence redessine **tout** l'écran, et pas la moitié.
 */
export function useTheme(): Palette {
  const [, forcer] = useState(0);

  useEffect(() => {
    const abonne = () => forcer((n) => n + 1);
    abonnes.add(abonne);
    return () => {
      abonnes.delete(abonne);
    };
  }, []);

  return palette();
}

/**
 * Fabrique des styles une fois **par apparence**, pas à chaque rendu.
 *
 * `StyleSheet.create` fige les couleurs au moment où il est appelé : appelé une fois au
 * chargement du module, il gardait éternellement celles du thème initial. En passant
 * par une fabrique mise en cache, chaque palette a sa feuille de styles, calculée à sa
 * première utilisation et réutilisée ensuite.
 */
export function creerStyles<T>(fabrique: (c: Palette) => T): () => T {
  const cache = new Map<Palette, T>();

  // La fonction rendue **s'abonne** : sans ça, un écran garderait ses propres styles
  // au changement d'apparence pendant que ses textes, eux, changeraient de couleur.
  return function useStyles(): T {
    const courante = useTheme();
    let styles = cache.get(courante);
    if (!styles) {
      styles = fabrique(courante);
      cache.set(courante, styles);
    }
    return styles;
  };
}

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
 * Le resserrement des grandes tailles n'est pas cosmétique : sans lui, un titre de 44
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
 * En sombre, une ombre noire ne se voit pas : c'est le filet de lumière du bord haut
 * qui fait le relief. En clair, c'est l'inverse — l'ombre porte tout. D'où deux
 * réglages, et pas un seul paramétré.
 *
 * `lueur` porte la couleur de l'accent plutôt que du noir : un bouton qui compte doit
 * **éclairer** ce qui l'entoure, pas projeter une ombre dessus.
 */
export function ombresDe(c: Palette) {
  const sombre = c.nom === 'sombre';

  return {
    posee: {
      shadowColor: sombre ? '#000' : '#0D0F16',
      shadowOpacity: sombre ? 0.5 : 0.08,
      shadowRadius: sombre ? 18 : 16,
      shadowOffset: { width: 0, height: sombre ? 8 : 6 },
      elevation: sombre ? 6 : 3,
    },
    lueur: {
      shadowColor: c.accent,
      shadowOpacity: sombre ? 0.45 : 0.35,
      shadowRadius: sombre ? 24 : 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: sombre ? 10 : 6,
    },
  } as const;
}

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
