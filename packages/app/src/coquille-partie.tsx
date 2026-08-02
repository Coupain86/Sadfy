/**
 * La coquille commune à toutes les parties.
 *
 * Les cinq jeux ne se ressemblent pas, mais **ce qui les entoure est identique** : le
 * briefing avant, la pause quand le réseau de l'autre tombe, la sortie qu'on peut
 * expliquer, l'écran de fin. Écrire ça cinq fois garantissait cinq comportements
 * légèrement différents — et ce sont précisément les endroits où les règles du produit
 * se jouent :
 *
 * - **Le briefing n'est pas décoratif.** Sans lui, les vingt premières secondes d'un jeu
 *   asymétrique sont de la confusion pure, et beaucoup abandonnent en croyant
 *   l'application cassée (§9.5).
 * - **Une coupure n'est pas un abandon.** La partie attend. Confondre les deux
 *   punirait exactement les joueurs en transport, qui sont le cas d'usage central
 *   (§10.6).
 * - **Partir en le disant ne compte pas.** Le motif est proposé, jamais imposé, et
 *   le système récompense la politesse sans jamais le dire (§10.7).
 * - **Perdre rapporte des points.** L'écran de fin le dit, sinon l'échec est vécu
 *   comme une perte alors qu'il n'en est pas une (§10.4).
 *
 * Chaque écran de jeu n'a donc plus qu'à afficher **sa** vue — celle que le serveur a
 * projetée pour ce joueur-là, et qui ne contient pas ce qu'il n'a pas le droit de voir.
 */

import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import type { JeuId, MotifSortiePartie } from '@sadfy/shared';

import { Bouton, Ecran, Espace, Txt, VoixMachine } from './composants.js';
import { DUREES_JEUX, NOMS_JEUX } from './jeux.js';
import { useServeur } from './serveur.js';
import { espace } from './theme.js';

const MOTIFS: readonly { readonly motif: MotifSortiePartie; readonly titre: string }[] = [
  { motif: 'dois_y_aller', titre: 'Je dois y aller' },
  { motif: 'reprendre_plus_tard', titre: 'On reprend plus tard' },
  { motif: 'probleme_connexion', titre: "J'ai un problème de connexion" },
  { motif: 'jeu_ne_plait_pas', titre: 'Ce jeu ne me plaît pas' },
];

export function CoquillePartie<V>({
  jeu,
  rendre,
}: {
  jeu: JeuId;
  /** Reçoit la vue projetée et le moyen d'agir. Ne décide de rien d'autre. */
  rendre: (vue: V, agir: (action: unknown) => void) => ReactNode;
}) {
  const serveur = useServeur();
  const [pret, setPret] = useState(false);
  const [sortie, setSortie] = useState(false);

  // ------------------------------------------------------------------- fin

  if (serveur.finPartie) {
    const { reussie, points } = serveur.finPartie;
    return (
      <Ecran>
        <Espace taille="xxl" />
        <Txt variante="heros">{reussie ? 'Bien joué' : 'Pas cette fois'}</Txt>
        <Espace taille="m" />
        {/* Le compteur mesure le temps passé ensemble, pas la performance (§10.4).
            Le dire évite que l'échec soit vécu comme une perte. */}
        <Txt ton="adouci">
          {reussie
            ? 'Bien coordonnés, tous les deux.'
            : "Ça n'a pas marché. Les points sont quand même à vous — c'est le temps " +
              'passé ensemble qui compte.'}
        </Txt>
        {points > 0 && (
          <>
            <Espace taille="m" />
            <Txt variante="petit" ton="accent">
              +{points} points pour votre duo
            </Txt>
          </>
        )}
        <Espace taille="l" />
        <VoixMachine>
          {reussie ? 'Efficaces. Presque trop.' : "Échec complet. On applaudit l'effort."}
        </VoixMachine>

        <View style={styles.bas}>
          <Bouton
            titre="Continuer"
            onPress={() => {
              serveur.oublierFin();
              router.replace('/duos');
            }}
          />
        </View>
      </Ecran>
    );
  }

  // -------------------------------------------------------- sortie expliquée

  if (sortie) {
    return (
      <Ecran>
        <Espace taille="xxl" />
        <Txt variante="titre">Tu veux dire pourquoi ?</Txt>
        <Espace taille="s" />
        <Txt ton="adouci">
          Rien ne t'y oblige. Mais l'autre attend, et un mot vaut mieux qu'un silence.
        </Txt>
        <Espace taille="l" />

        {MOTIFS.map(({ motif, titre }) => (
          <View key={motif}>
            <Bouton
              titre={titre}
              variante="secondaire"
              onPress={() => {
                serveur.quitterPartie(motif);
                router.replace('/duos');
              }}
            />
            <Espace taille="s" />
          </View>
        ))}

        <Espace taille="m" />
        {/* Partir sans rien dire reste possible : ce n'est jamais interdit, et le fait
            que ce départ ait été silencieux ne sera jamais dit à l'autre (§10.7). */}
        <Bouton
          titre="Partir sans rien dire"
          variante="discret"
          onPress={() => {
            serveur.quitterPartie();
            router.replace('/duos');
          }}
        />
        <Espace taille="s" />
        <Bouton titre="Finalement, je reste" variante="discret" onPress={() => setSortie(false)} />
      </Ecran>
    );
  }

  // -------------------------------------------------------------- briefing

  if (!pret || !serveur.vueJeu) {
    return (
      <Ecran>
        <Espace taille="xxl" />
        <Txt variante="minuscule" ton="eteint">
          {NOMS_JEUX[jeu]} · {DUREES_JEUX[jeu]}
        </Txt>
        <Espace taille="m" />
        {serveur.briefing?.role ? (
          <>
            <Txt variante="titre" ton="accent">
              Tu es {serveur.briefing.role.replace(/_/g, ' ')}
            </Txt>
            <Espace taille="m" />
          </>
        ) : null}
        <Txt variante="titre">{serveur.briefing?.texte ?? 'On prépare la partie…'}</Txt>

        <View style={styles.bas}>
          <Bouton
            titre="Prêt"
            onPress={() => setPret(true)}
            desactive={serveur.briefing === null}
          />
          <Espace taille="s" />
          <Bouton
            titre="Je ne peux pas maintenant"
            variante="discret"
            onPress={() => setSortie(true)}
          />
        </View>
      </Ecran>
    );
  }

  // ------------------------------------------------------ partenaire absent

  if (serveur.partenaireAbsentJusqua !== null) {
    return (
      <Ecran>
        <Espace taille="xxl" />
        <Txt variante="titre">La partie attend</Txt>
        <Espace taille="m" />
        {/* Jamais « il est parti » : une coupure n'est pas un abandon, et le dire
            autrement accuserait quelqu'un qui est simplement dans un tunnel (§10.6). */}
        <Txt ton="adouci">
          Ton partenaire a perdu le réseau. Rien n'est perdu — la partie reprendra
          exactement où vous en étiez.
        </Txt>
        <View style={styles.bas}>
          <Bouton
            titre="Je ne peux pas attendre"
            variante="discret"
            onPress={() => setSortie(true)}
          />
        </View>
      </Ecran>
    );
  }

  // ------------------------------------------------------------------- jeu

  return (
    <Ecran>
      {rendre(serveur.vueJeu as V, serveur.agir)}

      <View style={styles.sortie}>
        <Bouton
          titre="Je ne peux pas maintenant"
          variante="discret"
          onPress={() => setSortie(true)}
        />
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  bas: { marginTop: 'auto', paddingBottom: espace.l },
  sortie: { marginTop: 'auto', paddingTop: espace.m },
});
