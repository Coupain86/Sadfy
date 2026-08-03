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

import { StyleSheet, View } from 'react-native';

import type { VueBlindMatch } from '@sadfy/shared';

import { Espace, Panneau, Pastille, Pousse, Txt } from '../src/composants.js';
import { questionA } from '../src/contenu.js';
import { CoquillePartie } from '../src/coquille-partie.js';
import { creerStyles, espace } from '../src/theme.js';

export default function BlindMatch() {
  const styles = useStyles();
  return (
    <CoquillePartie<VueBlindMatch>
      jeu="blind_match"
      rendre={(vue, agir) => {
        const question = questionA(vue.question);
        const derniere = vue.revelations[vue.revelations.length - 1];
        const revele = vue.revelations.length > vue.tour ? derniere : undefined;

        return (
          <View style={styles.plein}>
            <View style={styles.entete}>
              <Txt variante="minuscule" ton="eteint" capitales>
                Blind Match · {Math.min(vue.tour + 1, vue.total)} / {vue.total}
              </Txt>
              {vue.convergences > 0 && (
                <Pastille ton="accent">
                  {vue.convergences} en commun
                </Pastille>
              )}
            </View>

            <Espace taille="xl" />
            <Txt variante="titre">{question?.texte ?? '…'}</Txt>
            <Espace taille="l" />

            <View style={{ gap: espace.s }}>
              {(question?.choix ?? []).map((choix, i) => {
                const mien = revele ? revele.moi === i : false;
                const sien = revele ? revele.lui === i : false;
                return (
                  <Panneau
                    key={choix}
                    vif={mien}
                    style={[styles.choix, sien && !mien && styles.sien]}
                    {...(vue.aRepondu
                      ? {}
                      : { onPress: () => agir({ type: 'repondre', choix: i }) })}
                  >
                    <View style={styles.ligneChoix}>
                      <Txt ton={mien || sien ? 'normal' : 'adouci'} style={{ flex: 1 }}>
                        {choix}
                      </Txt>
                      {revele && (mien || sien) && (
                        <Pastille ton={mien && sien ? 'accent' : 'eteint'}>
                          {mien && sien ? 'vous deux' : mien ? 'toi' : 'lui'}
                        </Pastille>
                      )}
                    </View>
                  </Panneau>
                );
              })}
            </View>

            <Pousse />
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
              <Panneau vif={revele.identique}>
                <Txt centre ton={revele.identique ? 'accent' : 'adouci'}>
                  {revele.identique ? 'Vous avez répondu pareil.' : 'Pas la même chose.'}
                </Txt>
              </Panneau>
            ) : null}
            <Espace taille="m" />
          </View>
        );
      }}
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
    choix: { paddingVertical: espace.m + 2, paddingHorizontal: espace.m },
    ligneChoix: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
    /** Le choix de l'autre : marqué, mais jamais plus fort que le tien. */
    sien: { borderColor: couleurs.bordureVive, backgroundColor: couleurs.voileFort },
  }),
);
