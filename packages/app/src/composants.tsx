/**
 * Les briques d'interface communes.
 *
 * Peu nombreuses, volontairement. Sadfy n'a ni photos, ni listes de profils, ni fil
 * d'actualité : l'inventaire de composants dont il a besoin est petit, et le garder
 * petit est ce qui donne à l'application une cohérence que du sur-mesure écran par
 * écran ne produirait jamais.
 *
 * Puisqu'il n'y a rien à regarder d'autre, **ces quelques briques portent seules tout
 * le visuel du produit**. Elles doivent donc avoir de la matière : de la lumière sur
 * les bords hauts, des halos sous ce qui compte, des surfaces translucides plutôt que
 * des rectangles opaques.
 */

import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { couleurs, espace, ombres, rayons, typo } from './theme.js';

// ---------------------------------------------------------------------------

export function Ecran({
  children,
  defilant = false,
  /** Pose un halo derrière le contenu. Pour les écrans qui ont un centre de gravité. */
  halo = false,
  style,
}: {
  children: ReactNode;
  defilant?: boolean;
  halo?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const contenu = <View style={[styles.ecran, style]}>{children}</View>;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {halo && <Halo />}
      {defilant ? (
        <ScrollView contentContainerStyle={styles.defilant}>{contenu}</ScrollView>
      ) : (
        contenu
      )}
    </SafeAreaView>
  );
}

/**
 * Le halo — la seule source de lumière de l'application.
 *
 * Empilement de cercles de plus en plus opaques plutôt qu'un dégradé : le résultat est
 * le même à l'œil, et il ne coûte aucune bibliothèque supplémentaire, donc il est
 * identique sur les trois plateformes.
 */
export function Halo({
  couleur = couleurs.accent,
  taille = 460,
  haut = -140,
}: {
  couleur?: string;
  taille?: number;
  haut?: number;
}) {
  const anneaux = [0.05, 0.05, 0.06, 0.07];

  return (
    <View pointerEvents="none" style={[styles.halo, { top: haut }]}>
      {anneaux.map((opacite, i) => {
        const d = taille * (1 - i * 0.22);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: d,
              height: d,
              borderRadius: rayons.rond,
              backgroundColor: couleur,
              opacity: opacite,
            }}
          />
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------

type Variante = 'heros' | 'titre' | 'sousTitre' | 'corps' | 'petit' | 'minuscule';
type Ton = 'normal' | 'adouci' | 'eteint' | 'accent' | 'machine' | 'danger' | 'succes';

const TONS: Record<Ton, string> = {
  normal: couleurs.texte,
  adouci: couleurs.texteAdouci,
  eteint: couleurs.texteEteint,
  accent: couleurs.accent,
  machine: couleurs.machine,
  danger: couleurs.danger,
  succes: couleurs.succes,
};

export function Txt({
  children,
  variante = 'corps',
  ton = 'normal',
  centre = false,
  /** Les libellés discrets se lisent mieux en capitales espacées qu'en petit gris. */
  capitales = false,
  style,
}: {
  children: ReactNode;
  variante?: Variante;
  ton?: Ton;
  centre?: boolean;
  capitales?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      style={[
        typo[variante],
        { color: TONS[ton] },
        centre && { textAlign: 'center' },
        capitales && { textTransform: 'uppercase' },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------

/**
 * La voix de la machine, visuellement distincte de tout le reste.
 *
 * Elle ne doit **jamais** ressembler à un message d'un joueur : les deux sources
 * doivent être discernables en un coup d'œil, sinon une vanne pourrait être prise pour
 * une pique du partenaire — exactement la gêne qu'on cherche à éviter (§16).
 */
export function VoixMachine({ children }: { children: ReactNode }) {
  return (
    <View style={styles.machine}>
      <View style={styles.machineTrait} />
      <Text style={[typo.corps, { color: couleurs.machine, flex: 1 }]}>{children}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------

/**
 * Une surface posée sur le fond.
 *
 * Le filet clair sur le bord haut n'est pas une décoration : c'est lui qui fait qu'une
 * carte a l'air posée sous une lumière plutôt que découpée dans le fond. Sans lui, tout
 * l'écran est plat, et un produit sans images qui est plat n'est rien.
 */
export function Panneau({
  children,
  onPress,
  style,
  /** Met le panneau en avant : bord accentué et halo. Pour ce qui est choisi. */
  vif = false,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  vif?: boolean;
}) {
  const contenu = (
    <>
      <View style={styles.reflet} />
      {children}
    </>
  );

  if (!onPress) {
    return <View style={[styles.panneau, vif && styles.panneauVif, style]}>{contenu}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.panneau,
        vif && styles.panneauVif,
        pressed && styles.presse,
        style,
      ]}
    >
      {contenu}
    </Pressable>
  );
}

/** Conservé pour les écrans qui l'utilisent déjà : une carte est un panneau. */
export const Carte = Panneau;

// ---------------------------------------------------------------------------

export function Bouton({
  titre,
  onPress,
  variante = 'principal',
  desactive = false,
}: {
  titre: string;
  onPress: () => void;
  variante?: 'principal' | 'secondaire' | 'discret' | 'danger';
  desactive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desactive}
      style={({ pressed }) => [
        styles.bouton,
        variante === 'principal' && styles.boutonPrincipal,
        variante === 'secondaire' && styles.boutonSecondaire,
        variante === 'discret' && styles.boutonDiscret,
        variante === 'danger' && styles.boutonDanger,
        pressed && !desactive && styles.presse,
        desactive && styles.boutonDesactive,
      ]}
      accessibilityRole="button"
      accessibilityLabel={titre}
    >
      {variante === 'secondaire' && <View style={styles.reflet} />}
      <Text
        style={[
          typo.corps,
          styles.boutonTexte,
          // Le texte sombre ne vaut que sur le bouton **plein**. Partout ailleurs il
          // était de la couleur du fond : les boutons secondaires étaient des
          // rectangles vides, et tout le mode test était illisible.
          variante === 'principal' && { color: couleurs.fondEnfonce },
          variante === 'secondaire' && { color: couleurs.texte },
          variante === 'discret' && { color: couleurs.texteAdouci },
          variante === 'danger' && { color: couleurs.danger },
        ]}
      >
        {titre}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------

/** Une étiquette compacte : un rôle, un état, un compteur. */
export function Pastille({
  children,
  ton = 'eteint',
}: {
  children: ReactNode;
  ton?: Ton;
}) {
  return (
    <View
      style={[
        styles.pastille,
        ton === 'accent' && {
          backgroundColor: couleurs.accentVoile,
          borderColor: couleurs.bordureAccent,
        },
        ton === 'machine' && { backgroundColor: couleurs.machineVoile },
      ]}
    >
      <Txt variante="minuscule" ton={ton} capitales>
        {children}
      </Txt>
    </View>
  );
}

/** Espaceur explicite : plus lisible que des marges éparpillées. */
export function Espace({ taille = 'm' }: { taille?: keyof typeof espace }) {
  return <View style={{ height: espace[taille] }} />;
}

/** Pousse ce qui suit vers le bas de l'écran. */
export function Pousse() {
  return <View style={{ flex: 1 }} />;
}

// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: couleurs.fond },
  ecran: { flex: 1, paddingHorizontal: espace.l, paddingTop: espace.l },
  defilant: { flexGrow: 1 },
  halo: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: 460,
  },

  machine: {
    flexDirection: 'row',
    gap: espace.m,
    backgroundColor: couleurs.machineVoile,
    borderRadius: rayons.m,
    paddingVertical: espace.m,
    paddingHorizontal: espace.m,
  },
  machineTrait: {
    width: 3,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.machine,
    opacity: 0.7,
  },

  bouton: {
    minHeight: 56,
    borderRadius: rayons.l,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espace.l,
    overflow: 'hidden',
  },
  boutonPrincipal: { backgroundColor: couleurs.accent, ...ombres.lueur },
  boutonSecondaire: {
    backgroundColor: couleurs.voile,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  boutonDiscret: { backgroundColor: 'transparent', minHeight: 44 },
  boutonDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: couleurs.danger,
  },
  boutonDesactive: { opacity: 0.3 },
  boutonTexte: { fontWeight: '600', letterSpacing: -0.2 },

  panneau: {
    backgroundColor: couleurs.fondEleve,
    borderRadius: rayons.l,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    padding: espace.m,
    overflow: 'hidden',
  },
  panneauVif: {
    backgroundColor: couleurs.accentVoile,
    borderColor: couleurs.bordureAccent,
  },
  reflet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: couleurs.reflet,
  },
  presse: { opacity: 0.7, transform: [{ scale: 0.985 }] },

  pastille: {
    alignSelf: 'flex-start',
    paddingHorizontal: espace.s,
    paddingVertical: espace.xs,
    borderRadius: rayons.rond,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.voile,
  },
});
