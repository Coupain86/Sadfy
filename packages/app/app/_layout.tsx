/**
 * La racine de l'application.
 *
 * Elle ne fait que quatre choses, et c'est voulu : charger l'état local, afficher un
 * écran d'erreur explicite si le stockage est corrompu — jamais repartir de zéro en
 * silence, ce serait effacer une relation sans le dire (§A7) —, dire honnêtement quand
 * aucun serveur n'est configuré, et router vers l'onboarding ou l'accueil.
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Ecran, Espace, Txt } from '../src/composants.js';
import { FournisseurEtat, useMagasin } from '../src/etat.js';
import { FournisseurServeur, useServeur } from '../src/serveur.js';
import { chargerApparence } from '../src/apparence.js';
import { support } from '../src/support.js';
import {
  creerStyles,
  espace,
  reglerApparenceSysteme,
  useTheme,
} from '../src/theme.js';

export default function Racine() {
  const systeme = useColorScheme();
  const c = useTheme();

  // Le réglage du téléphone alimente l'apparence « systeme ». Sans ça, le choix par
  // défaut serait un sombre imposé à quelqu'un qui a mis son appareil en clair.
  reglerApparenceSysteme(systeme === 'light' ? 'clair' : 'sombre');

  useEffect(() => {
    void chargerApparence(support);
  }, []);

  return (
    <SafeAreaProvider>
      {/* La barre d'état suit l'apparence : du texte clair sur fond blanc disparaît. */}
      <StatusBar style={c.nom === 'clair' ? 'dark' : 'light'} />
      <FournisseurEtat support={support}>
        {/* Serveur configuré ou non : c'est `src/config.ts` qui tranche, et lui seul. */}
        <FournisseurServeur>
          <Garde />
        </FournisseurServeur>
      </FournisseurEtat>
    </SafeAreaProvider>
  );
}

function Garde() {
  const c = useTheme();
  const styles = useStyles();
  const { etat, erreur } = useMagasin();

  if (etat === 'chargement') {
    return (
      <View style={{ flex: 1, backgroundColor: c.fond, justifyContent: 'center' }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  if (etat === 'erreur') {
    // Volontairement un cul-de-sac : proposer « recommencer à zéro » ici serait offrir
    // un bouton qui détruit définitivement une relation à 900 points.
    return (
      <Ecran>
        <Espace taille="xxl" />
        <Txt variante="titre">Impossible de lire tes données</Txt>
        <Espace />
        <Txt ton="adouci">
          Rien n'a été modifié. Tes duos et tes points sont sauvegardés côté serveur et
          peuvent être récupérés — on ne va rien écraser tant qu'on n'est pas sûr.
        </Txt>
        <Espace taille="l" />
        <Txt variante="minuscule" ton="eteint">
          {erreur}
        </Txt>
      </Ecran>
    );
  }

  return (
    <View style={styles.pile}>
      <BandeauMode />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.fond },
          animation: 'fade',
        }}
      />
    </View>
  );
}

/**
 * Le bandeau du mode découverte.
 *
 * Sans serveur, Sadfy fonctionne — mais dans un seul navigateur. Le dire coûte une
 * ligne ; ne pas le dire coûte quelqu'un qui construit un duo pendant trois jours et
 * découvre qu'il n'a jamais existé ailleurs que chez lui.
 */
function BandeauMode() {
  const styles = useStyles();
  const { mode } = useServeur();
  if (mode !== 'local') return null;

  return (
    <SafeAreaView edges={['top']} style={styles.bandeau}>
      <Txt variante="minuscule" ton="eteint" centre>
        Mode découverte — tout se passe dans ce navigateur, rien n'est envoyé nulle part
      </Txt>
    </SafeAreaView>
  );
}

const useStyles = creerStyles((couleurs) =>
  StyleSheet.create({
    pile: { flex: 1, backgroundColor: couleurs.fond },
    bandeau: {
      backgroundColor: couleurs.fondEleve,
      paddingHorizontal: espace.m,
      paddingVertical: espace.xs,
    },
  }),
);
