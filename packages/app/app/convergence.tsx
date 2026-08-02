/**
 * Convergence — aboutir au même mot.
 *
 * Placé au palier 3 délibérément : y arriver demande de savoir comment l'autre pense.
 * Excellent jeu de fin de parcours, mauvais jeu de premier jour — et c'est littéralement
 * la métaphore du produit, se comprendre sans se parler (§15.2).
 *
 * Liste fermée de propositions, donc aucun texte libre (P3). Et la simultanéité vient
 * de la vue : tant que les deux n'ont pas proposé, le mot de l'autre n'est pas envoyé.
 */

import { Pressable, StyleSheet, View } from 'react-native';

import type { VueConvergence } from '@sadfy/shared';

import { Carte, Espace, Txt, VoixMachine } from '../src/composants.js';
import { motA } from '../src/contenu.js';
import { CoquillePartie } from '../src/coquille-partie.js';
import { couleurs, espace, rayons } from '../src/theme.js';

export default function Convergence() {
  return (
    <CoquillePartie<VueConvergence>
      jeu="convergence"
      rendre={(vue, agir) => (
        <View>
          <Espace taille="m" />
          <Txt variante="minuscule" ton="eteint">
            Convergence · tour {vue.tour + 1} sur {vue.toursMax}
          </Txt>
          <Espace taille="l" />
          <Txt variante="titre">Trouvez le même mot</Txt>
          <Espace taille="s" />
          <Txt variante="petit" ton="adouci">
            Vous proposez en même temps, sans vous concerter.
          </Txt>
          <Espace taille="l" />

          <View style={styles.mots}>
            {vue.propositions.map((indice) => (
              <Pressable
                key={indice}
                onPress={() =>
                  vue.maProposition === null && agir({ type: 'proposer', mot: indice })
                }
                style={[styles.mot, vue.maProposition === indice && styles.motActif]}
              >
                <Txt ton={vue.maProposition === indice ? 'normal' : 'adouci'}>
                  {motA(indice)}
                </Txt>
              </Pressable>
            ))}
          </View>

          <Espace taille="l" />
          {vue.historique.length > 0 && (
            <>
              <Txt variante="minuscule" ton="eteint">
                Vos propositions
              </Txt>
              <Espace taille="s" />
              {/* L'histoire de la partie vaut plus que le score : c'est elle qu'on se
                  raconte après, et elle montre qu'on s'est rapprochés même sans y
                  arriver. */}
              {vue.historique.map((paire, i) => (
                <View key={i} style={{ marginBottom: espace.xs }}>
                  <Carte>
                    <Txt variante="petit">
                      {motA(paire.a)} · {motA(paire.b)}
                    </Txt>
                  </Carte>
                </View>
              ))}
            </>
          )}

          <Espace taille="l" />
          {vue.trouve ? (
            <VoixMachine>
              Ce n'est plus de la convergence, c'est de la télépathie.
            </VoixMachine>
          ) : vue.enAttenteDeLAutre ? (
            <Txt ton="eteint" centre>
              On attend sa proposition…
            </Txt>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  mots: { flexDirection: 'row', flexWrap: 'wrap', gap: espace.s },
  mot: {
    paddingVertical: espace.m,
    paddingHorizontal: espace.m,
    borderRadius: rayons.rond,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.fondEleve,
  },
  motActif: { borderColor: couleurs.accent, backgroundColor: couleurs.bordureAccent },
});
