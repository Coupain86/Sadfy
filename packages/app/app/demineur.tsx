/**
 * Le Démineur coopératif — palier 2.
 *
 * Chacun voit **la moitié des indices, jamais les mêmes**. Sans se décrire ce qu'on
 * voit, on ne peut pas avancer : la coopération n'est pas encouragée, elle est la seule
 * façon de jouer (§15.2).
 *
 * Et « voir la moitié » n'est pas une affaire d'affichage. La vue ne contient pas les
 * indices de l'autre — l'écran ne les cache pas, il ne les a pas. C'est ce qui rend la
 * règle vraie même si quelqu'un ouvrait le code de l'application (§A9).
 *
 * Aucun texte libre pour se décrire les indices : ils se les disent de vive voix,
 * puisqu'ils sont à moins d'un kilomètre l'un de l'autre — ou pas, et alors ils
 * devinent (P3).
 */

import { Pressable, StyleSheet, View } from 'react-native';

import type { VueDemineur } from '@sadfy/shared';

import { Espace, Pastille, Pousse, Txt } from '../src/composants.js';
import { CoquillePartie } from '../src/coquille-partie.js';
import { creerStyles, rayons } from '../src/theme.js';

const NOMS_ROLES = {
  artificier_nord: 'Artificier Nord',
  artificier_sud: 'Artificier Sud',
} as const;

export default function Demineur() {
  const styles = useStyles();
  return (
    <CoquillePartie<VueDemineur>
      jeu="demineur_cooperatif"
      rendre={(vue, agir) => (
        <View style={styles.plein}>
          <View style={styles.entete}>
            <Txt variante="minuscule" ton="eteint" capitales>
              {NOMS_ROLES[vue.role]}
            </Txt>
            <Pastille ton={vue.marquees >= vue.minesTotal ? 'accent' : 'eteint'}>
              {vue.marquees} / {vue.minesTotal} mines
            </Pastille>
          </View>
          <Espace taille="xl" />

          <View style={styles.grille}>
            {vue.cases.map((c) => (
              <Pressable
                key={c.i}
                onPress={() => agir({ type: 'devoiler', case: c.i })}
                onLongPress={() => agir({ type: 'marquer', case: c.i })}
                style={[
                  styles.case,
                  c.etat === 'indice' && styles.indice,
                  c.etat === 'devoilee' && styles.devoilee,
                  c.etat === 'marquee' && styles.marquee,
                ]}
              >
                <Txt
                  variante="petit"
                  ton={c.etat === 'inconnue' ? 'eteint' : 'normal'}
                >
                  {c.etat === 'marquee' ? '⚑' : c.voisins === undefined ? '' : c.voisins || '·'}
                </Txt>
              </Pressable>
            ))}
          </View>

          <Espace taille="l" />
          <Txt variante="petit" ton="adouci">
            Les cases éclairées sont tes indices. Ton partenaire voit les autres —
            décrivez-vous ce que vous voyez. Appui long pour marquer une mine.
          </Txt>
          <Pousse />
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
    grille: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    case: {
      width: '15.4%',
      aspectRatio: 1,
      borderRadius: rayons.m,
      backgroundColor: couleurs.fondEnfonce,
      borderWidth: 1,
      borderColor: couleurs.bordure,
      alignItems: 'center',
      justifyContent: 'center',
    },
    /** Tes indices : éclairés. Ceux de l'autre n'existent pas dans ta vue (§A9). */
    indice: { backgroundColor: couleurs.accentVoile, borderColor: couleurs.bordureAccent },
    devoilee: { backgroundColor: couleurs.voileFort, borderColor: couleurs.bordureVive },
    marquee: { borderColor: couleurs.danger, backgroundColor: 'rgba(240,90,90,0.12)' },
  }),
);
