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
 * **La bûche est la seule chose figurative de toute l'application.** Elle a une raison
 * d'être : le jeu ne demande aucune adresse, donc s'il n'y a rien à regarder il ne reste
 * qu'un bouton et un compteur — et personne ne joue deux fois à un compteur. La voir
 * s'entailler est tout ce que ce jeu a à offrir, et c'est suffisant.
 *
 * L'écran ne décide de rien. Le tour, les entailles, les blocages : tout vient de la
 * vue que le serveur a projetée. Quand il calculait lui-même, deux joueurs pouvaient
 * voir deux parties différentes.
 */

import { Pressable, StyleSheet, View } from 'react-native';

import type { VueScie } from '@sadfy/shared';

import { Espace, Pastille, Pousse, Txt } from '../src/composants.js';
import { CoquillePartie } from '../src/coquille-partie.js';
import { creerStyles, espace, ombresDe, rayons, useTheme } from '../src/theme.js';

export default function Partie() {
  const c = useTheme();
  const styles = useStyles();
  return (
    <CoquillePartie<VueScie>
      jeu="la_scie"
      rendre={(vue, agir) => {
        const avance = vue.coupes / vue.requises;

        return (
          <View style={styles.plein}>
            <View style={styles.entete}>
              <Txt variante="minuscule" ton="eteint" capitales>
                La Scie
              </Txt>
              <Pastille ton={vue.monTour ? 'accent' : 'eteint'}>
                {vue.monTour ? 'à toi' : 'à lui'}
              </Pastille>
            </View>

            <Espace taille="xxxl" />

            <Buche coupes={vue.coupes} requises={vue.requises} monTour={vue.monTour} />

            <Espace taille="xl" />
            <Txt variante="heros" centre>
              {vue.coupes}
              <Txt variante="titre" ton="eteint">
                {' '}
                / {vue.requises}
              </Txt>
            </Txt>
            <Espace taille="s" />
            <Txt variante="petit" ton="adouci" centre>
              {avance === 0
                ? 'Tirez chacun votre tour.'
                : avance < 0.5
                  ? 'Ça mord.'
                  : avance < 0.9
                    ? 'Elle va céder.'
                    : 'Encore un peu.'}
            </Txt>
            {vue.blocages > 0 && (
              <>
                <Espace taille="m" />
                <View style={styles.centre}>
                  {/* Un blocage n'est pas une faute, c'est de l'impatience : on le
                      montre sans le sanctionner (§15.3). */}
                  <Pastille>
                    {vue.blocages} fois en même temps
                  </Pastille>
                </View>
              </>
            )}

            <Pousse />

            {/* Tirer hors tour n'est pas une faute, c'est de l'impatience : le bouton
                reste actif, le serveur compte un blocage et personne n'est grondé. */}
            <Pressable
              onPress={() => agir({ type: 'tirer' })}
              style={({ pressed }) => [
                styles.poignee,
                vue.monTour && styles.poigneeActive,
                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={styles.poigneeReflet} />
              <Txt
                variante="titre"
                ton={vue.monTour ? 'normal' : 'eteint'}
                style={{ color: vue.monTour ? c.fondEnfonce : c.texteEteint }}
              >
                Tirer
              </Txt>
            </Pressable>
            <Espace taille="s" />
          </View>
        );
      }}
    />
  );
}

// ---------------------------------------------------------------------------

/**
 * La bûche.
 *
 * Construite en vues empilées, sans image ni dégradé : elle est donc identique sur les
 * trois plateformes et ne coûte aucun fichier. Trois éléments suffisent à la faire lire
 * comme du bois — une écorce plus sombre sur les bords, des cernes concentriques au
 * bout, et une entaille claire qui avance.
 */
function Buche({
  coupes,
  requises,
  monTour,
}: {
  coupes: number;
  requises: number;
  monTour: boolean;
}) {
  const c = useTheme();
  const styles = useStyles();
  const avance = Math.min(1, coupes / requises);
  const coupee = avance >= 1;

  return (
    <View style={styles.zoneBuche}>
      {/* La lame descend dans le bois. C'est la **profondeur** qui progresse, pas la
          largeur : une scie ouvre une fente, elle ne creuse pas un trou. */}
      <View style={styles.buche}>
        <View style={styles.ecorce} />
        <View style={[styles.ecorce, styles.ecorceBas]} />

        {/* Les cernes : ce qui fait qu'on voit une section de tronc et pas un tube. */}
        <View style={styles.bout}>
          {[46, 34, 22, 10].map((d) => (
            <View
              key={d}
              style={{
                position: 'absolute',
                width: d,
                height: d,
                borderRadius: rayons.rond,
                borderWidth: 1.5,
                borderColor: c.boisSombre,
                opacity: 0.55,
              }}
            />
          ))}
        </View>

        {/* La fente. Elle s'enfonce à chaque coupe, et traverse au douzième. */}
        <View style={[styles.fente, { height: `${avance * 100}%` }]} />
        {avance > 0 && !coupee && (
          <View style={[styles.levre, { top: `${avance * 100}%` }]} />
        )}
      </View>

      {/* La lame et sa poignée, posées au-dessus, qui s'éclairent quand c'est à toi. */}
      <View style={styles.zoneLame} pointerEvents="none">
        <View style={[styles.manche, monTour && styles.mancheActif]} />
        <View style={[styles.lameCorps, monTour && styles.lameActive]} />
        <View style={styles.dents}>
          {Array.from({ length: 6 }, (_, i) => (
            <View key={i} style={[styles.dent, monTour && styles.dentActive]} />
          ))}
        </View>
      </View>

      {/* La sciure, au pied de la coupe. Trois points suffisent à raconter qu'on scie. */}
      {avance > 0 && (
        <View style={styles.sciure}>
          {[0.55, 0.35, 0.2].map((o, i) => (
            <View key={i} style={[styles.grain, { opacity: o }]} />
          ))}
        </View>
      )}
    </View>
  );
}

const HAUTEUR_BUCHE = 104;

const useStyles = creerStyles((couleurs) => {
  const ombres = ombresDe(couleurs);

    return StyleSheet.create({
      plein: { flex: 1 },
      entete: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      centre: { alignItems: 'center' },

      zoneBuche: {
        height: HAUTEUR_BUCHE + 78,
        justifyContent: 'flex-end',
        paddingBottom: 22,
      },
      zoneLame: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
      manche: {
        width: 34,
        height: 12,
        borderRadius: rayons.rond,
        backgroundColor: couleurs.texteEteint,
      },
      mancheActif: { backgroundColor: couleurs.accentClair },
      buche: {
        height: HAUTEUR_BUCHE,
        borderRadius: rayons.xl,
        backgroundColor: couleurs.bois,
        overflow: 'hidden',
        justifyContent: 'center',
        ...ombres.posee,
      },
      ecorce: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 10,
        backgroundColor: couleurs.boisSombre,
        opacity: 0.55,
      },
      ecorceBas: { top: undefined, bottom: 0, height: 14, opacity: 0.75 },
      bout: {
        position: 'absolute',
        left: espace.s,
        width: 52,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: rayons.rond,
        backgroundColor: couleurs.boisClair,
      },

      /** La fente : sombre, étroite, et de plus en plus profonde. */
      fente: {
        position: 'absolute',
        top: 0,
        left: '50%',
        marginLeft: -4,
        width: 8,
        backgroundColor: couleurs.fondEnfonce,
      },
      /** La lèvre claire au fond de la fente : c'est le bois frais, là où ça coupe. */
      levre: {
        position: 'absolute',
        left: '50%',
        marginLeft: -9,
        marginTop: -2,
        width: 18,
        height: 3,
        borderRadius: rayons.rond,
        backgroundColor: couleurs.boisClair,
      },

      lameCorps: {
        width: 6,
        height: 62,
        borderRadius: rayons.rond,
        backgroundColor: couleurs.texteAdouci,
      },
      lameActive: { backgroundColor: couleurs.accentClair },
      /** Les dents courent **le long** de la lame : posées à côté, elles ressemblaient à
       *  des étincelles et la scie n'en était plus une. */
      dents: {
        position: 'absolute',
        top: 22,
        left: '50%',
        marginLeft: 1,
        gap: 7,
      },
      dent: {
        width: 6,
        height: 6,
        backgroundColor: couleurs.texteAdouci,
        opacity: 0.55,
        transform: [{ rotate: '45deg' }],
      },
      dentActive: { backgroundColor: couleurs.accentClair, opacity: 0.9 },

      sciure: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
      },
      grain: {
        width: 4,
        height: 4,
        borderRadius: rayons.rond,
        backgroundColor: couleurs.boisClair,
      },

      poignee: {
        minHeight: 92,
        borderRadius: rayons.xl,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: couleurs.voile,
        borderWidth: 1,
        borderColor: couleurs.bordure,
        overflow: 'hidden',
      },
      poigneeActive: {
        backgroundColor: couleurs.accent,
        borderColor: couleurs.accent,
        ...ombres.lueur,
      },
      poigneeReflet: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: couleurs.reflet,
      },
  });
});
