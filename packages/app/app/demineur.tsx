/**
 * Le Démineur coopératif — asymétrique par le partage des indices.
 *
 * **Chacun voit la moitié de la grille, jamais les mêmes cases.** Aucun des deux ne
 * peut résoudre seul ; ensemble, c'est faisable. Le partage est strict : si un indice
 * était visible des deux, la coopération deviendrait facultative et le jeu perdrait sa
 * raison d'être (§15.3).
 *
 * Aucune compétence préalable — c'est de la déduction pure. La difficulté vient de
 * l'information partagée, jamais du niveau de l'un des deux.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Bouton, Ecran, Espace, Txt, VoixMachine } from '../src/composants.js';
import { couleurs, espace, rayons } from '../src/theme.js';

const TAILLE = 6;
const MINES = new Set([3, 9, 14, 22, 27, 31]);

type Cote = 'nord' | 'sud';

export default function Demineur() {
  const [cote, setCote] = useState<Cote>('nord');
  const [devoilees, setDevoilees] = useState<Set<number>>(new Set());
  const [explose, setExplose] = useState(false);

  const total = TAILLE * TAILLE;
  const gagne = devoilees.size >= total - MINES.size;

  /** Répartition en quinconce : une case sur deux à chacun, jamais les mêmes. */
  function estMonIndice(i: number): boolean {
    const x = i % TAILLE;
    const y = Math.floor(i / TAILLE);
    const pair = (x + y) % 2 === 0;
    return MINES.has(i) ? false : cote === 'nord' ? pair : !pair;
  }

  function voisins(i: number): number {
    const x = i % TAILLE;
    const y = Math.floor(i / TAILLE);
    let n = 0;
    for (let dy = -1; dy <= 1; dy += 1)
      for (let dx = -1; dx <= 1; dx += 1) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= TAILLE || ny < 0 || ny >= TAILLE) continue;
        if (MINES.has(ny * TAILLE + nx)) n += 1;
      }
    return n;
  }

  function toucher(i: number) {
    if (explose || devoilees.has(i)) return;
    if (MINES.has(i)) {
      setExplose(true);
      return;
    }
    setDevoilees(new Set([...devoilees, i]));
  }

  if (explose || gagne) {
    return (
      <Ecran>
        <Espace taille="xxl" />
        <Txt variante="heros">{gagne ? 'Terrain sûr' : 'Boum'}</Txt>
        <Espace taille="m" />
        <Txt ton="adouci">
          {gagne
            ? 'Vous aviez chacun la moitié de la réponse.'
            : 'Une mine. Les points sont quand même à vous.'}
        </Txt>
        <Espace taille="l" />
        <VoixMachine>
          {gagne ? 'Efficaces. Presque trop.' : 'Échec complet. On applaudit l’effort.'}
        </VoixMachine>
        <View style={styles.bas}>
          <Bouton titre="Continuer" onPress={() => router.replace('/duos')} />
        </View>
      </Ecran>
    );
  }

  return (
    <Ecran>
      <Espace taille="m" />
      <Txt variante="minuscule" ton="eteint">
        Démineur · tu vois la moitié des indices
      </Txt>
      <Espace taille="l" />

      <View style={styles.grille}>
        {Array.from({ length: total }, (_, i) => {
          const vue = devoilees.has(i);
          const indice = estMonIndice(i);
          return (
            <Pressable
              key={i}
              onPress={() => toucher(i)}
              style={[styles.case, vue && styles.vue, indice && !vue && styles.indice]}
            >
              <Txt variante="petit" ton={vue || indice ? 'normal' : 'eteint'}>
                {vue || indice ? voisins(i) || '·' : ''}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <Espace taille="l" />
      <Txt variante="petit" ton="adouci">
        Les cases éclairées sont tes indices. Ton partenaire voit les autres — décrivez-vous
        ce que vous voyez.
      </Txt>

      <View style={styles.bas}>
        {/* Bouton de développement : le rôle sera attribué par le serveur. */}
        <Bouton
          titre={`(voir l'autre moitié — ${cote})`}
          variante="discret"
          onPress={() => setCote(cote === 'nord' ? 'sud' : 'nord')}
        />
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  bas: { marginTop: 'auto', paddingBottom: espace.l },
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  case: {
    width: '15.5%',
    aspectRatio: 1,
    borderRadius: rayons.s,
    backgroundColor: couleurs.fondEnfonce,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indice: { backgroundColor: couleurs.fondEleve, borderColor: couleurs.bordureAccent },
  vue: { backgroundColor: couleurs.fondEleve, borderColor: couleurs.accent },
});
