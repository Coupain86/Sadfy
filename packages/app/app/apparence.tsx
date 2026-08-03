/**
 * Le choix d'apparence.
 *
 * Sadfy se joue le soir dans un métro **et** à midi dans un train : les deux existent,
 * et imposer l'un des deux revient à agresser la moitié des gens. D'où deux apparences
 * écrites à la main plutôt qu'une teinte inversée, et le choix laissé à celui qui
 * regarde.
 *
 * `Suivre le téléphone` est le défaut : c'est ce à quoi les gens s'attendent, et ça
 * évite d'ouvrir un écran blanc à minuit.
 */

import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Bouton, Ecran, Espace, Panneau, Txt } from '../src/composants.js';
import { enregistrerApparence } from '../src/apparence.js';
import { support } from '../src/support.js';
import {
  choixApparence,
  creerStyles,
  espace,
  rayons,
  useTheme,
  type ChoixApparence,
} from '../src/theme.js';

const OPTIONS: readonly {
  readonly valeur: ChoixApparence;
  readonly titre: string;
  readonly detail: string;
}[] = [
  {
    valeur: 'systeme',
    titre: 'Suivre le téléphone',
    detail: "Clair le jour, sombre le soir — selon le réglage de l'appareil",
  },
  { valeur: 'clair', titre: 'Clair', detail: 'Blanc, net, pour la journée' },
  { valeur: 'sombre', titre: 'Sombre', detail: 'Nocturne, pour le soir et le métro' },
];

export default function Apparence() {
  const c = useTheme();
  const styles = useStyles();
  const actuel = choixApparence();

  return (
    <Ecran halo>
      <Espace taille="l" />
      <Txt variante="titre">Apparence</Txt>
      <Espace taille="s" />
      <Txt variante="petit" ton="adouci">
        Le changement est immédiat, et il est retenu.
      </Txt>
      <Espace taille="xl" />

      {OPTIONS.map((option) => {
        const choisi = actuel === option.valeur;
        return (
          <View key={option.valeur}>
            <Panneau vif={choisi} onPress={() => void enregistrerApparence(support, option.valeur)}>
              <View style={styles.ligne}>
                <View style={{ flex: 1 }}>
                  <Txt variante="sousTitre">{option.titre}</Txt>
                  <Espace taille="xs" />
                  <Txt variante="petit" ton="eteint">
                    {option.detail}
                  </Txt>
                </View>
                <View style={[styles.coche, choisi && { borderColor: c.accent }]}>
                  {choisi && <View style={[styles.pastilleCoche, { backgroundColor: c.accent }]} />}
                </View>
              </View>
            </Panneau>
            <Espace taille="s" />
          </View>
        );
      })}

      <Espace taille="xl" />
      <Bouton titre="Retour" variante="secondaire" onPress={() => router.back()} />
    </Ecran>
  );
}

const useStyles = creerStyles((couleurs) =>
  StyleSheet.create({
    ligne: { flexDirection: 'row', alignItems: 'center', gap: espace.m },
    coche: {
      width: 24,
      height: 24,
      borderRadius: rayons.rond,
      borderWidth: 2,
      borderColor: couleurs.bordureVive,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pastilleCoche: { width: 12, height: 12, borderRadius: rayons.rond },
  }),
);
