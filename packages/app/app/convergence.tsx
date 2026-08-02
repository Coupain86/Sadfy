/**
 * Convergence — aboutir au même mot.
 *
 * Placé au palier 3 délibérément : y arriver demande de savoir comment l'autre pense.
 * Excellent jeu de fin de parcours, mauvais jeu de premier jour — et c'est littéralement
 * la métaphore du produit, se comprendre sans se parler (§15.2).
 *
 * Liste fermée de propositions, donc aucun texte libre (P3).
 */

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Bouton, Carte, Ecran, Espace, Txt, VoixMachine } from '../src/composants.js';
import { couleurs, espace, rayons } from '../src/theme.js';

const TOURS = [
  ['feu', 'mer', 'nuit', 'pierre', 'vent', 'racine'],
  ['braise', 'marée', 'silence', 'falaise', 'souffle', 'sève'],
  ['cendre', 'écume', 'ombre', 'sable', 'murmure', 'bourgeon'],
];

export default function Convergence() {
  const [tour, setTour] = useState(0);
  const [mien, setMien] = useState<string | null>(null);
  const [sien, setSien] = useState<string | null>(null);
  const [histoire, setHistoire] = useState<[string, string][]>([]);

  const propositions = TOURS[tour];
  const trouve = histoire.some(([a, b]) => a === b);

  function proposer(mot: string) {
    setMien(mot);
    setTimeout(() => {
      const choix = propositions ?? [];
      const leur = tour === 2 ? mot : choix[(choix.indexOf(mot) + 2) % choix.length]!;
      setSien(leur);
      setHistoire((h) => [...h, [mot, leur]]);
    }, 900);
  }

  function suivant() {
    setMien(null);
    setSien(null);
    setTour((t) => t + 1);
  }

  if (trouve || !propositions) {
    return (
      <Ecran>
        <Espace taille="xxl" />
        <Txt variante="heros">{trouve ? histoire[histoire.length - 1]?.[0] : 'Pas cette fois'}</Txt>
        <Espace taille="m" />
        <Txt ton="adouci">
          {trouve
            ? `Le même mot, au tour ${histoire.length}.`
            : 'Vous n\'êtes pas tombés sur le même mot. Les points restent à vous.'}
        </Txt>
        <Espace taille="l" />
        <VoixMachine>
          {trouve
            ? 'Ce n’est plus de la convergence, c’est de la télépathie.'
            : 'Si près. Recommencez demain.'}
        </VoixMachine>
        <View style={styles.bas}>
          <Bouton titre="Continuer" onPress={() => router.replace('/duos')} />
        </View>
      </Ecran>
    );
  }

  return (
    <Ecran defilant>
      <Espace taille="m" />
      <Txt variante="minuscule" ton="eteint">
        Convergence · tour {tour + 1}
      </Txt>
      <Espace taille="l" />
      <Txt variante="titre">Trouvez le même mot</Txt>
      <Espace taille="s" />
      <Txt variante="petit" ton="adouci">
        Vous proposez en même temps, sans vous concerter.
      </Txt>
      <Espace taille="l" />

      <View style={styles.mots}>
        {propositions.map((mot) => (
          <Pressable
            key={mot}
            onPress={() => mien === null && proposer(mot)}
            style={[styles.mot, mien === mot && styles.motActif]}
          >
            <Txt ton={mien === mot ? 'normal' : 'adouci'}>{mot}</Txt>
          </Pressable>
        ))}
      </View>

      <Espace taille="l" />
      {histoire.length > 0 && (
        <>
          <Txt variante="minuscule" ton="eteint">
            Vos propositions
          </Txt>
          <Espace taille="s" />
          {histoire.map(([a, b], i) => (
            <View key={i} style={{ marginBottom: espace.xs }}>
              <Carte>
                <Txt variante="petit">
                  {a} · {b}
                </Txt>
              </Carte>
            </View>
          ))}
        </>
      )}

      <Espace taille="l" />
      {mien !== null && sien === null && <Txt ton="eteint" centre>On attend sa proposition…</Txt>}
      {sien !== null && <Bouton titre="Tour suivant" onPress={suivant} />}
      <Espace taille="xl" />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  bas: { marginTop: 'auto', paddingBottom: espace.l },
  mots: { flexDirection: 'row', flexWrap: 'wrap', gap: espace.s },
  mot: {
    paddingVertical: espace.m,
    paddingHorizontal: espace.l,
    borderRadius: rayons.rond,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.fondEleve,
  },
  motActif: { borderColor: couleurs.accent, backgroundColor: couleurs.bordureAccent },
});
