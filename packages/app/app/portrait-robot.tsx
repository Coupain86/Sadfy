/**
 * Le Portrait Robot — le premier jeu asymétrique à l'écran.
 *
 * **Deux interfaces réellement différentes, pas une interface avec des parties
 * masquées.** C'est la traduction visible de la règle qui fonde tout le produit : le
 * visage recherché n'est pas caché à l'Inspecteur, il n'est jamais envoyé à son
 * téléphone (§A9).
 *
 * Conséquence pour ce fichier : les deux composants ci-dessous ne partagent aucune
 * donnée. Le Témoin reçoit la cible, l'Inspecteur reçoit la liste des options — et
 * aucun des deux ne peut afficher ce qu'il n'a pas.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Bouton, Ecran, Espace, Txt, VoixMachine } from '../src/composants.js';
import { couleurs, espace, rayons } from '../src/theme.js';

const EMPLACEMENTS = ['cheveux', 'yeux', 'nez', 'bouche', 'accessoire'] as const;
const LIBELLES = ['Cheveux', 'Yeux', 'Nez', 'Bouche', 'Accessoire'] as const;
const TRAITS = ['◜◝', '◉◉', '△', '‿', '☂'] as const;
const OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

type Role = 'temoin' | 'inspecteur';

export default function PortraitRobot() {
  // Le rôle sera attribué par le serveur ; il s'inverse à la seconde manche (§9.3).
  const [role, setRole] = useState<Role | null>(null);
  const [emplacement, setEmplacement] = useState(0);
  const [construit, setConstruit] = useState<(number | null)[]>(
    EMPLACEMENTS.map(() => null),
  );
  const [proposition, setProposition] = useState<number | null>(null);

  // Côté Témoin uniquement : cette donnée n'existe pas dans la vue de l'Inspecteur.
  const [cible] = useState(() => EMPLACEMENTS.map((_, i) => (i * 2 + 1) % OPTIONS.length));

  if (role === null) {
    return (
      <Ecran>
        <Espace taille="xxl" />
        <Txt variante="titre">Vous ne verrez pas la même chose</Txt>
        <Espace taille="m" />
        <Txt ton="adouci">
          L'un voit un visage. L'autre doit le reconstituer sans jamais le voir. C'est
          tout l'intérêt.
        </Txt>
        <Espace taille="xl" />
        <Bouton titre="Je suis le Témoin" onPress={() => setRole('temoin')} />
        <Espace taille="s" />
        <Bouton
          titre="Je suis l'Inspecteur"
          variante="secondaire"
          onPress={() => setRole('inspecteur')}
        />
      </Ecran>
    );
  }

  function repondre(oui: boolean) {
    if (proposition === null) return;
    if (oui) {
      const suivant = [...construit];
      suivant[emplacement] = proposition;
      setConstruit(suivant);
      setEmplacement((e) => e + 1);
    }
    setProposition(null);
  }

  const termine = emplacement >= EMPLACEMENTS.length;

  if (termine) {
    const reussi = construit.every((v, i) => v === cible[i]);
    return (
      <Ecran>
        <Espace taille="xxl" />
        <Txt variante="heros">{reussi ? 'Identique' : 'Presque'}</Txt>
        <Espace taille="m" />
        <Txt ton="adouci">
          {reussi
            ? "Vous vous êtes compris sans jamais voir la même chose."
            : "Pas tout à fait le bon visage. Les points sont quand même à vous."}
        </Txt>
        <Espace taille="l" />
        <VoixMachine>
          {reussi ? 'Voilà, c’est exactement ça.' : 'Raté. Ce n’est pas grave, ça compte quand même.'}
        </VoixMachine>
        <View style={styles.bas}>
          <Bouton titre="Continuer" onPress={() => router.replace('/duos')} />
        </View>
      </Ecran>
    );
  }

  return role === 'temoin' ? (
    <VueTemoin
      cible={cible}
      construit={construit}
      emplacement={emplacement}
      proposition={proposition}
      onRepondre={repondre}
    />
  ) : (
    <VueInspecteur
      construit={construit}
      emplacement={emplacement}
      proposition={proposition}
      onProposer={setProposition}
    />
  );
}

// ---------------------------------------------------------------------------

/** Le Témoin voit la cible. Il ne peut répondre que par oui ou non. */
function VueTemoin({
  cible,
  construit,
  emplacement,
  proposition,
  onRepondre,
}: {
  cible: number[];
  construit: (number | null)[];
  emplacement: number;
  proposition: number | null;
  onRepondre: (oui: boolean) => void;
}) {
  return (
    <Ecran>
      <Espace taille="m" />
      <Txt variante="minuscule" ton="eteint">
        Témoin · {LIBELLES[emplacement]}
      </Txt>
      <Espace taille="l" />

      <Txt variante="petit" ton="adouci">
        Le visage recherché
      </Txt>
      <Espace taille="s" />
      <Visage valeurs={cible} accent />

      <Espace taille="l" />
      <Txt variante="petit" ton="adouci">
        Ce qu'il a construit
      </Txt>
      <Espace taille="s" />
      <Visage valeurs={construit} />

      <View style={styles.bas}>
        {proposition === null ? (
          <Txt ton="eteint" centre>
            Il réfléchit…
          </Txt>
        ) : (
          <>
            <Txt variante="sousTitre" centre>
              Il propose {LIBELLES[emplacement]} {OPTIONS[proposition]}
            </Txt>
            <Espace taille="m" />
            <Bouton titre="Oui, c'est ça" onPress={() => onRepondre(true)} />
            <Espace taille="s" />
            <Bouton titre="Non" variante="secondaire" onPress={() => onRepondre(false)} />
          </>
        )}
      </View>
    </Ecran>
  );
}

// ---------------------------------------------------------------------------

/**
 * L'Inspecteur ne reçoit **jamais** la cible.
 *
 * Ce composant ne prend même pas `cible` en paramètre : il ne pourrait pas l'afficher
 * même si on le lui demandait. La contrainte est dans le typage, pas dans la discipline.
 */
function VueInspecteur({
  construit,
  emplacement,
  proposition,
  onProposer,
}: {
  construit: (number | null)[];
  emplacement: number;
  proposition: number | null;
  onProposer: (valeur: number) => void;
}) {
  return (
    <Ecran>
      <Espace taille="m" />
      <Txt variante="minuscule" ton="eteint">
        Inspecteur · {LIBELLES[emplacement]}
      </Txt>
      <Espace taille="l" />

      <Txt variante="petit" ton="adouci">
        Ce que tu as construit
      </Txt>
      <Espace taille="s" />
      <Visage valeurs={construit} />

      <Espace taille="xl" />
      <Txt variante="sousTitre">Propose {LIBELLES[emplacement]?.toLowerCase()}</Txt>
      <Espace taille="m" />

      <View style={styles.options}>
        {OPTIONS.map((option, i) => (
          <Pressable
            key={option}
            onPress={() => onProposer(i)}
            disabled={proposition !== null}
            style={[
              styles.option,
              proposition === i && styles.optionActive,
              proposition !== null && proposition !== i && { opacity: 0.3 },
            ]}
          >
            <Txt variante="sousTitre">{option}</Txt>
          </Pressable>
        ))}
      </View>

      <View style={styles.bas}>
        <Txt ton="eteint" centre>
          {proposition === null ? 'À toi de proposer' : 'Il regarde…'}
        </Txt>
      </View>
    </Ecran>
  );
}

// ---------------------------------------------------------------------------

function Visage({ valeurs, accent = false }: { valeurs: (number | null)[]; accent?: boolean }) {
  return (
    <View style={[styles.visage, accent && { borderColor: couleurs.accent }]}>
      {EMPLACEMENTS.map((_, i) => (
        <View key={i} style={styles.trait}>
          <Txt variante="sousTitre" ton={valeurs[i] === null ? 'eteint' : 'normal'}>
            {valeurs[i] === null ? '—' : `${TRAITS[i]} ${OPTIONS[valeurs[i]!]}`}
          </Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bas: { marginTop: 'auto', paddingBottom: espace.l },
  visage: {
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.m,
    backgroundColor: couleurs.fondEleve,
    padding: espace.m,
    gap: espace.xs,
  },
  trait: { flexDirection: 'row', alignItems: 'center' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: espace.s },
  option: {
    width: 64,
    height: 64,
    borderRadius: rayons.m,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.fondEleve,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: { borderColor: couleurs.accent, backgroundColor: couleurs.bordureAccent },
});
