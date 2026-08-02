/**
 * La Scie — l'un des deux jeux du palier 1.
 *
 * Ce sont les seuls jeux qu'un duo voit ses deux premiers jours, donc les seuls qui
 * doivent être compréhensibles **sans avoir rien appris**. C'est pour ça qu'ils sont
 * tous les deux symétriques : on apprend l'application avant d'apprendre l'asymétrie
 * (§15.2).
 *
 * Aucune compétence n'est requise, et c'est une règle absolue du produit : dès qu'un jeu
 * mesure qui est le meilleur, il crée une hiérarchie entre deux inconnus — l'inverse
 * exact de ce que Sadfy cherche (§15.3).
 *
 * L'écran ne décide de rien. Le tour, les entailles, les blocages : tout vient de la
 * vue que le serveur a projetée. Quand il calculait lui-même, deux joueurs pouvaient
 * voir deux parties différentes.
 */

import { Pressable, StyleSheet, View } from 'react-native';

import type { VueScie } from '@sadfy/shared';

import { Espace, Txt } from '../src/composants.js';
import { CoquillePartie } from '../src/coquille-partie.js';
import { couleurs, espace, rayons } from '../src/theme.js';

export default function Partie() {
  return (
    <CoquillePartie<VueScie>
      jeu="la_scie"
      rendre={(vue, agir) => (
        <View>
          <Espace taille="l" />
          <View style={styles.buche}>
            {Array.from({ length: vue.requises }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.entaille,
                  i < vue.coupes && { backgroundColor: couleurs.accent },
                ]}
              />
            ))}
          </View>

          <Espace taille="xl" />
          <Txt variante="titre" centre>
            {vue.monTour ? 'À toi' : 'À lui'}
          </Txt>
          <Espace taille="s" />
          <Txt variante="petit" ton="eteint" centre>
            {vue.coupes} entailles sur {vue.requises}
            {vue.blocages > 0
              ? ` · ${vue.blocages} blocage${vue.blocages > 1 ? 's' : ''}`
              : ''}
          </Txt>

          <Espace taille="xl" />
          {/* Tirer hors tour n'est pas une faute, c'est de l'impatience : le bouton
              reste actif, le serveur compte un blocage et personne n'est grondé. */}
          <Pressable
            onPress={() => agir({ type: 'tirer' })}
            style={({ pressed }) => [
              styles.tirer,
              vue.monTour && styles.tirerActif,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Txt variante="titre" ton={vue.monTour ? 'normal' : 'eteint'}>
              Tirer
            </Txt>
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  buche: {
    flexDirection: 'row',
    gap: 3,
    height: 60,
    alignItems: 'stretch',
    backgroundColor: couleurs.fondEleve,
    borderRadius: rayons.m,
    padding: espace.s,
  },
  entaille: { flex: 1, borderRadius: 2, backgroundColor: couleurs.fondEnfonce },
  tirer: {
    minHeight: 96,
    borderRadius: rayons.l,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.fondEleve,
  },
  tirerActif: { borderColor: couleurs.accent },
});
