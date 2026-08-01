/**
 * La session quotidienne — le vrai cœur du produit.
 *
 * Sadfy n'est pas une application de jeu avec une couche relationnelle : c'est un
 * rituel quotidien de découverte de l'autre, dont le jeu est le prétexte.
 *
 * L'ordre de l'écran n'est pas arbitraire (§11.1) :
 *
 * 1. **les questions d'abord** — rapides, asynchrones, toujours menées à bout ;
 * 2. **le jeu ensuite** — synchrone, donc suspendu à la disponibilité de l'autre ;
 * 3. **la révélation à la fin** — parce que c'est pour elle qu'on revient demain, et
 *    qu'une session doit s'y terminer.
 *
 * Et si le jeu casse en cours de route — métro, batterie, imprévu —, les questions sont
 * déjà répondues : la session n'est pas perdue, et la révélation peut quand même avoir
 * lieu.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import {
  niveauRevelation,
  palierPour,
  pointsAvantPalierSuivant,
  type NiveauRevelation,
} from '@sadfy/shared';

import { Bouton, Carte, Ecran, Espace, Txt, VoixMachine } from '../../src/composants.js';
import { useMagasin } from '../../src/etat.js';
import { duoDe } from '../../src/stockage.js';
import { couleurs, espace, rayons } from '../../src/theme.js';

/** Provisoire : les questions viendront de `content/` via le serveur. */
const QUESTIONS_DEMO = [
  {
    id: 'u-004',
    texte: 'Sous la douche, tu es plutôt…',
    choix: ['concerts privés', 'disputes imaginaires que je gagne', 'trois minutes chrono', "jusqu'à l'eau froide"],
  },
  {
    id: 'u-009',
    texte: "La pizza à l'ananas",
    choix: ['crime contre l\'humanité', 'excellent, assumé', "je n'ai pas d'avis et ça m'inquiète", 'tout dépend du reste'],
  },
  {
    id: 'u-041',
    texte: 'La montagne ou la mer ?',
    choix: ['la montagne', 'la mer', 'la ville, en fait', "celle où il n'y a personne"],
  },
];

type Etape = 'questions' | 'attente_jeu' | 'revelation';

export default function Duo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { donnees } = useMagasin();
  const duo = id ? duoDe(donnees, id as never) : undefined;

  const [etape, setEtape] = useState<Etape>('questions');
  const [index, setIndex] = useState(0);
  const [reponses, setReponses] = useState<number[]>([]);

  if (!duo) {
    return (
      <Ecran>
        <Espace taille="xxl" />
        <Txt variante="titre">Duo introuvable</Txt>
        <Espace />
        <Bouton titre="Retour" variante="discret" onPress={() => router.back()} />
      </Ecran>
    );
  }

  const palier = palierPour(duo.points);
  const niveau = niveauRevelation(palier);

  function repondre(choix: number) {
    const suivantes = [...reponses, choix];
    setReponses(suivantes);
    if (index + 1 >= QUESTIONS_DEMO.length) setEtape('attente_jeu');
    else setIndex(index + 1);
  }

  if (etape === 'questions') {
    const question = QUESTIONS_DEMO[index]!;
    return (
      <Ecran>
        <Espace taille="m" />
        <Txt variante="minuscule" ton="eteint">
          Question {index + 1} sur {QUESTIONS_DEMO.length}
        </Txt>
        <Espace taille="l" />
        <Txt variante="titre">{question.texte}</Txt>
        <Espace taille="l" />

        <View style={{ gap: espace.s }}>
          {question.choix.map((choix, i) => (
            <Pressable key={choix} onPress={() => repondre(i)} style={styles.choix}>
              <Txt>{choix}</Txt>
            </Pressable>
          ))}
        </View>

        <View style={styles.bas}>
          {/* Aucune bonne réponse : le dire explicitement évite que la question soit
              vécue comme un examen (§16). */}
          <Txt variante="minuscule" ton="eteint" centre>
            Il n'y a pas de bonne réponse. Seulement la tienne.
          </Txt>
        </View>
      </Ecran>
    );
  }

  if (etape === 'attente_jeu') {
    return (
      <Ecran>
        <Espace taille="xxl" />
        <Txt variante="titre">C'est répondu</Txt>
        <Espace taille="m" />
        <Txt ton="adouci">
          Tes réponses sont enregistrées. Tu verras ce que vous avez en commun dès que
          ton partenaire aura répondu de son côté.
        </Txt>
        <Espace taille="l" />

        <VoixMachine>
          Vous pouvez aussi jouer une partie tout de suite si vous êtes tous les deux
          disponibles. Sinon, ça attendra — et ce n'est pas grave.
        </VoixMachine>

        <View style={styles.bas}>
          <Bouton titre="Jouer maintenant" onPress={() => setEtape('revelation')} />
          <Espace taille="s" />
          {/* §11.2 : la progression continue sans le jeu. Le dire ici évite de faire
              croire qu'on a raté sa journée. */}
          <Txt variante="minuscule" ton="eteint" centre>
            Sans partie, tu avances quand même — un peu plus lentement.
          </Txt>
        </View>
      </Ecran>
    );
  }

  return <Revelation niveau={niveau} points={duo.points} />;
}

// ---------------------------------------------------------------------------

/**
 * La révélation.
 *
 * **Au palier 1, on ne montre que le nombre**, jamais lesquelles. C'est frustrant dans
 * le bon sens — c'est précisément ce qui donne envie de revenir demain (§11.5).
 *
 * Et jamais de pourcentage avant le palier 3 : un « 34 % de compatibilité » au troisième
 * jour se lit comme un verdict, et fait arrêter des gens alors qu'il ne veut rien dire
 * sur trois questions.
 */
function Revelation({ niveau, points }: { niveau: NiveauRevelation; points: number }) {
  const restants = pointsAvantPalierSuivant(points);

  return (
    <Ecran defilant>
      <Espace taille="xl" />
      <Txt variante="minuscule" ton="eteint">
        Ce que vous avez en commun
      </Txt>
      <Espace taille="m" />

      {niveau === 'nombre_seul' ? (
        <>
          <Txt variante="heros">2 réponses sur 3</Txt>
          <Espace taille="m" />
          <Txt ton="adouci">
            identiques. Lesquelles ? Ça, tu le sauras bientôt.
          </Txt>
          <Espace taille="l" />
          <VoixMachine>
            Deux sur trois dès le premier jour. Ne vous emballez pas, il en reste neuf.
          </VoixMachine>
        </>
      ) : (
        <>
          <Carte>
            <Txt variante="sousTitre">Vous préférez tous les deux la montagne</Txt>
          </Carte>
          <Espace taille="s" />
          <Carte>
            <Txt variante="sousTitre">Vous détestez tous les deux la pizza à l'ananas</Txt>
          </Carte>
          <Espace taille="l" />
          <VoixMachine>
            Deux points communs de plus. À ce rythme, il va falloir trouver un sujet de
            dispute.
          </VoixMachine>
        </>
      )}

      <Espace taille="xl" />
      {restants !== null && (
        <Txt variante="petit" ton="adouci">
          Encore {restants} points avant que vous en appreniez davantage l'un sur l'autre.
        </Txt>
      )}

      <Espace taille="xl" />
      <Bouton titre="À demain" onPress={() => router.replace('/duos')} />
      <Espace taille="xl" />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  bas: { marginTop: 'auto', paddingBottom: espace.l },
  choix: {
    paddingVertical: espace.m,
    paddingHorizontal: espace.m,
    borderRadius: rayons.m,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.fondEleve,
  },
});
