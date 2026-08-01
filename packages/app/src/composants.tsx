/**
 * Les briques d'interface communes.
 *
 * Peu nombreuses, volontairement. Sadfy n'a ni photos, ni listes de profils, ni fil
 * d'actualité : l'inventaire de composants dont il a besoin est petit, et le garder
 * petit est ce qui donnera à l'application une cohérence que du sur-mesure écran par
 * écran ne produirait jamais.
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

import { couleurs, espace, rayons, typo } from './theme.js';

// ---------------------------------------------------------------------------

export function Ecran({
  children,
  defilant = false,
  style,
}: {
  children: ReactNode;
  defilant?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const contenu = (
    <View style={[styles.ecran, style]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {defilant ? (
        <ScrollView contentContainerStyle={styles.defilant}>{contenu}</ScrollView>
      ) : (
        contenu
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------

type Variante = 'heros' | 'titre' | 'sousTitre' | 'corps' | 'petit' | 'minuscule';
type Ton = 'normal' | 'adouci' | 'eteint' | 'accent' | 'machine' | 'danger';

const TONS: Record<Ton, string> = {
  normal: couleurs.texte,
  adouci: couleurs.texteAdouci,
  eteint: couleurs.texteEteint,
  accent: couleurs.accent,
  machine: couleurs.machine,
  danger: couleurs.danger,
};

export function Txt({
  children,
  variante = 'corps',
  ton = 'normal',
  centre = false,
  style,
}: {
  children: ReactNode;
  variante?: Variante;
  ton?: Ton;
  centre?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      style={[
        typo[variante],
        { color: TONS[ton] },
        centre && { textAlign: 'center' },
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
      <Txt variante="corps" ton="machine">
        {children}
      </Txt>
    </View>
  );
}

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
        pressed && !desactive && styles.boutonPresse,
        desactive && styles.boutonDesactive,
      ]}
      accessibilityRole="button"
      accessibilityLabel={titre}
    >
      <Text
        style={[
          styles.boutonTexte,
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

export function Carte({
  children,
  onPress,
}: {
  children: ReactNode;
  onPress?: () => void;
}) {
  if (!onPress) return <View style={styles.carte}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.carte, pressed && styles.cartePressee]}
    >
      {children}
    </Pressable>
  );
}

/** Espaceur explicite : plus lisible que des marges éparpillées. */
export function Espace({ taille = 'm' }: { taille?: keyof typeof espace }) {
  return <View style={{ height: espace[taille] }} />;
}

// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: couleurs.fond },
  ecran: { flex: 1, paddingHorizontal: espace.l, paddingTop: espace.l },
  defilant: { flexGrow: 1 },

  machine: {
    backgroundColor: couleurs.fondEleve,
    borderLeftWidth: 3,
    borderLeftColor: couleurs.machine,
    borderRadius: rayons.s,
    paddingVertical: espace.m,
    paddingHorizontal: espace.m,
  },

  bouton: {
    minHeight: 52,
    borderRadius: rayons.m,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espace.l,
  },
  boutonPrincipal: { backgroundColor: couleurs.accent },
  boutonSecondaire: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  boutonDiscret: { backgroundColor: 'transparent', minHeight: 44 },
  boutonDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: couleurs.danger,
  },
  boutonPresse: { opacity: 0.75 },
  boutonDesactive: { opacity: 0.35 },
  boutonTexte: { ...typo.corps, fontWeight: '600', color: couleurs.fond },

  carte: {
    backgroundColor: couleurs.fondEleve,
    borderRadius: rayons.m,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    padding: espace.m,
  },
  cartePressee: { opacity: 0.8 },
});
