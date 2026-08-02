/**
 * Le Blind Match — cœur du palier 1.
 *
 * Les deux reçoivent la même question. **Les choix sont révélés simultanément** : tant
 * que l'autre n'a pas répondu, rien de sa réponse n'apparaît. Sinon le second
 * s'alignerait, et le jeu ne mesurerait plus rien (§15.2).
 *
 * Cette simultanéité n'est pas gardée par cet écran : elle est **dans la vue**. Tant
 * que les deux n'ont pas tranché, la réponse de l'autre n'est pas envoyée. L'application
 * ne la masque pas — elle ne l'a pas.
 *
 * Aucune bonne réponse, donc aucun échec possible : deux personnes très différentes ne
 * doivent pas terminer leur première partie sur un constat de défaite.
 */

import { Pressable, StyleSheet, View } from 'react-native';

import type { VueBlindMatch } from '@sadfy/shared';

import { Carte, Espace, Txt } from '../src/composants.js';
import { questionA } from '../src/contenu.js';
import { CoquillePartie } from '../src/coquille-partie.js';
import { couleurs, espace, rayons } from '../src/theme.js';

export default function BlindMatch() {
  return (
    <CoquillePartie<VueBlindMatch>
      jeu="blind_match"
      rendre={(vue, agir) => {
        const question = questionA(vue.question);
        const derniere = vue.revelations[vue.revelations.length - 1];
        const revele = vue.revelations.length > vue.tour ? derniere : undefined;

        return (
          <View>
            <Espace taille="m" />
            <Txt variante="minuscule" ton="eteint">
              Blind Match · {Math.min(vue.tour + 1, vue.total)} sur {vue.total}
              {vue.convergences > 0
                ? ` · ${vue.convergences} réponse${vue.convergences > 1 ? 's' : ''} identique${vue.convergences > 1 ? 's' : ''}`
                : ''}
            </Txt>
            <Espace taille="l" />
            <Txt variante="titre">{question?.texte ?? '…'}</Txt>
            <Espace taille="l" />

            <View style={{ gap: espace.s }}>
              {(question?.choix ?? []).map((choix, i) => {
                const mien = revele ? revele.moi === i : false;
                const sien = revele ? revele.lui === i : false;
                return (
                  <Pressable
                    key={choix}
                    onPress={() => !vue.aRepondu && agir({ type: 'repondre', choix: i })}
                    style={[styles.choix, mien && styles.mien, sien && styles.sien]}
                  >
                    <Txt ton={mien || sien ? 'normal' : 'adouci'}>{choix}</Txt>
                    {revele && (mien || sien) && (
                      <Txt variante="minuscule" ton="eteint">
                        {mien && sien ? 'vous deux' : mien ? 'toi' : 'lui'}
                      </Txt>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Espace taille="l" />
            {!vue.aRepondu ? (
              // Désamorce ce que le jeu pourrait faire ressentir à tort : ce n'est pas
              // un examen, et il n'y a rien à réussir.
              <Txt variante="minuscule" ton="eteint" centre>
                Il n'y a pas de bonne réponse. Seulement la tienne.
              </Txt>
            ) : vue.enAttenteDeLAutre ? (
              <Txt ton="eteint" centre>
                On attend sa réponse…
              </Txt>
            ) : revele ? (
              <Carte>
                <Txt centre>
                  {revele.identique ? 'Vous avez répondu pareil.' : 'Pas la même chose.'}
                </Txt>
              </Carte>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  choix: {
    paddingVertical: espace.m,
    paddingHorizontal: espace.m,
    borderRadius: rayons.m,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.fondEleve,
  },
  mien: { borderColor: couleurs.accent },
  sien: { backgroundColor: couleurs.bordureAccent },
});
