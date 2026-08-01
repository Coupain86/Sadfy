/**
 * La racine de l'application.
 *
 * Elle ne fait que trois choses, et c'est voulu : charger l'état local, afficher un
 * écran d'erreur explicite si le stockage est corrompu — jamais repartir de zéro en
 * silence, ce serait effacer une relation sans le dire (§A7) —, et router vers
 * l'onboarding ou l'accueil.
 */

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Ecran, Espace, Txt } from '../src/composants.js';
import { FournisseurEtat, useMagasin } from '../src/etat.js';
import { support } from '../src/support.js';
import { couleurs } from '../src/theme.js';

export default function Racine() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <FournisseurEtat support={support}>
        <Garde />
      </FournisseurEtat>
    </SafeAreaProvider>
  );
}

function Garde() {
  const { etat, erreur } = useMagasin();

  if (etat === 'chargement') {
    return (
      <View style={{ flex: 1, backgroundColor: couleurs.fond, justifyContent: 'center' }}>
        <ActivityIndicator color={couleurs.accent} />
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
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: couleurs.fond },
        animation: 'fade',
      }}
    />
  );
}
