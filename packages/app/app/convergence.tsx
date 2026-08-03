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

import { Espace, Panneau, Pastille, Pousse, Txt, VoixMachine } from '../src/composants.js';
import { motA } from '../src/contenu.js';
import { CoquillePartie } from '../src/coquille-partie.js';
import { creerStyles, espace, rayons } from '../src/theme.js';

export default function Convergence() {
  const styles = useStyles();
  return (
    <CoquillePartie<VueConvergence>
      jeu="convergence"
      rendre={(vue, agir) => (
        <View style={styles.plein}>
          <View style={styles.entete}>
            <Txt variante="minuscule" ton="eteint" capitales>
              Convergence
            </Txt>
            <Pastille ton={vue.trouve ? 'accent' : 'eteint'}>
              tour {vue.tour + 1} / {vue.toursMax}
            </Pastille>
          </View>

          <Espace taille="xl" />
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
                  <Panneau vif={paire.a === paire.b}>
                    <View style={styles.paire}>
                      <Txt variante="petit">{motA(paire.a)}</Txt>
                      <View style={styles.lien} />
                      <Txt variante="petit">{motA(paire.b)}</Txt>
                    </View>
                  </Panneau>
                </View>
              ))}
            </>
          )}

          <Pousse />
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

const useStyles = creerStyles((couleurs) =>
  StyleSheet.create({
    plein: { flex: 1 },
    entete: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    paire: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
    /** Le trait entre deux mots : c'est la distance qui se referme, dessinée. */
    lien: {
      flex: 1,
      height: 1,
      backgroundColor: couleurs.bordureVive,
    },
    mots: { flexDirection: 'row', flexWrap: 'wrap', gap: espace.s },
    mot: {
      paddingVertical: espace.m,
      paddingHorizontal: espace.l,
      borderRadius: rayons.rond,
      borderWidth: 1,
      borderColor: couleurs.bordure,
      backgroundColor: couleurs.voile,
    },
    motActif: { borderColor: couleurs.bordureAccent, backgroundColor: couleurs.accentVoile },
  }),
);
