/**
 * L'écran de partie — les deux jeux du palier 1.
 *
 * Ce sont les seuls jeux qu'un duo voit ses deux premiers jours, donc les seuls qui
 * doivent être compréhensibles **sans avoir rien appris**. C'est pour ça qu'ils sont
 * tous les deux symétriques : on apprend l'application avant d'apprendre l'asymétrie
 * (§15.2).
 *
 * Le briefing n'est pas décoratif : sans lui, les vingt premières secondes d'une partie
 * sont de la confusion pure, et beaucoup abandonnent en croyant l'application cassée
 * (§9.5).
 */

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Bouton, Ecran, Espace, Txt, VoixMachine } from '../src/composants.js';
import { couleurs, espace, rayons } from '../src/theme.js';

type Phase = 'briefing' | 'jeu' | 'fin';

export default function Partie() {
  const [phase, setPhase] = useState<Phase>('briefing');
  const [reussie, setReussie] = useState(false);

  if (phase === 'briefing') {
    return (
      <Ecran>
        <Espace taille="xxl" />
        <Txt variante="minuscule" ton="eteint">
          La Scie · environ 2 minutes
        </Txt>
        <Espace taille="m" />
        <Txt variante="titre">
          Une bûche, une scie, et vous deux.
        </Txt>
        <Espace taille="m" />
        <Txt ton="adouci">
          Tirez chacun votre tour. Si vous tirez en même temps, la scie bloque.
        </Txt>

        <View style={styles.bas}>
          <Bouton titre="Prêt" onPress={() => setPhase('jeu')} />
          <Espace taille="s" />
          {/* Le motif de sortie est proposé, jamais imposé — et partir en le disant ne
              compte pas comme un abandon (§10.7). */}
          <Bouton
            titre="Je ne peux pas maintenant"
            variante="discret"
            onPress={() => router.back()}
          />
        </View>
      </Ecran>
    );
  }

  if (phase === 'jeu') {
    return (
      <Scie
        onFin={(gagne) => {
          setReussie(gagne);
          setPhase('fin');
        }}
      />
    );
  }

  return (
    <Ecran>
      <Espace taille="xxl" />
      <Txt variante="heros">{reussie ? 'Coupée' : 'Pas cette fois'}</Txt>
      <Espace taille="m" />
      {/* Perdre rapporte des points : le compteur mesure le temps passé ensemble, pas
          la performance (§10.4). Le dire évite que l'échec soit vécu comme une perte. */}
      <Txt ton="adouci">
        {reussie
          ? 'Bien coordonnés, tous les deux.'
          : "Ça n'a pas marché. Les points sont quand même à vous — c'est le temps passé ensemble qui compte."}
      </Txt>
      <Espace taille="l" />
      <VoixMachine>
        {reussie
          ? 'Efficaces. Presque trop.'
          : 'Échec complet. On applaudit l’effort.'}
      </VoixMachine>

      <View style={styles.bas}>
        <Bouton titre="Continuer" onPress={() => router.replace('/duos')} />
      </View>
    </Ecran>
  );
}

// ---------------------------------------------------------------------------

const COUPES_REQUISES = 12;

/**
 * La Scie.
 *
 * Aucune compétence n'est requise, et c'est une règle absolue du produit : dès qu'un jeu
 * mesure qui est le meilleur, il crée une hiérarchie entre deux inconnus — l'inverse
 * exact de ce que Sadfy cherche (§15.3).
 */
function Scie({ onFin }: { onFin: (reussie: boolean) => void }) {
  const [coupes, setCoupes] = useState(0);
  const [monTour, setMonTour] = useState(true);
  const [blocages, setBlocages] = useState(0);

  function tirer() {
    if (!monTour) {
      // Tirer hors tour n'est pas une faute, c'est de l'impatience : on la montre
      // sans la sanctionner.
      setBlocages((b) => b + 1);
      return;
    }
    const suivant = coupes + 1;
    setCoupes(suivant);
    setMonTour(false);
    if (suivant >= COUPES_REQUISES) {
      onFin(true);
      return;
    }
    // Le partenaire répond — simulé tant que le relais n'est pas branché.
    setTimeout(() => setMonTour(true), 700);
  }

  return (
    <Ecran>
      <Espace taille="l" />
      <View style={styles.buche}>
        {Array.from({ length: COUPES_REQUISES }, (_, i) => (
          <View
            key={i}
            style={[styles.entaille, i < coupes && { backgroundColor: couleurs.accent }]}
          />
        ))}
      </View>

      <Espace taille="xl" />
      <Txt variante="titre" centre>
        {monTour ? 'À toi' : 'À lui'}
      </Txt>
      <Espace taille="s" />
      <Txt variante="petit" ton="eteint" centre>
        {coupes} entailles sur {COUPES_REQUISES}
        {blocages > 0 ? ` · ${blocages} blocage${blocages > 1 ? 's' : ''}` : ''}
      </Txt>

      <View style={styles.bas}>
        <Pressable
          onPress={tirer}
          style={({ pressed }) => [
            styles.tirer,
            monTour && styles.tirerActif,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Txt variante="titre" ton={monTour ? 'normal' : 'eteint'}>
            Tirer
          </Txt>
        </Pressable>
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  bas: { marginTop: 'auto', paddingBottom: espace.l },
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
