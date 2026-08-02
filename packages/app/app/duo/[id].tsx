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
 *
 * **Les questions sont tirées ici, sur l'appareil**, à partir du duo et du jour et de
 * rien d'autre. Les deux joueurs répondent à des heures très différentes ; il faut donc
 * qu'ils obtiennent la même liste sans avoir échangé un seul octet (§11.2).
 */

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import {
  graineSession,
  jourSadfy,
  niveauRevelation,
  palierPour,
  pointsAvantPalierSuivant,
  pointsSession,
  sessionCompte,
  type DuoId,
  type NiveauRevelation,
} from '@sadfy/shared';
import { tirerQuestions } from '@sadfy/server/noyau';

import { Bouton, Carte, Ecran, Espace, Txt, VoixMachine } from '../../src/composants.js';
import { modeServeur } from '../../src/config.js';
import { BANQUE_UNIVERSELLE } from '../../src/contenu.js';
import { useMagasin } from '../../src/etat.js';
import { maintenantTest } from '../../src/mode-test.js';
import { duoDe, majDuo, type EntreeCarnet } from '../../src/stockage.js';
import { couleurs, espace, rayons } from '../../src/theme.js';

type Etape = 'questions' | 'attente_jeu' | 'revelation';

export default function Duo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { donnees, majDonnees, tranche, vivier } = useMagasin();
  const duo = id ? duoDe(donnees, id as DuoId) : undefined;

  const [etape, setEtape] = useState<Etape>('questions');
  const [index, setIndex] = useState(0);
  const [reponses, setReponses] = useState<number[]>([]);
  /**
   * Cette session-ci a-t-elle compté ?
   *
   * Figé au moment de clôturer, et pas relu ensuite : relu, il devenait faux dès la
   * réponse enregistrée — l'écran annonçait « ta session est déjà comptée » à quelqu'un
   * qui venait justement de la faire compter.
   */
  const [aCompte, setACompte] = useState(true);

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
  const jour = jourSadfy(maintenantTest(), duo.offsetMinutes);

  // Le tirage ne dépend que du duo et du jour : les deux appareils obtiennent la même
  // liste, dans le même ordre, sans se synchroniser. Et une question déjà posée à ce
  // duo ne revient jamais.
  const questions = tirerQuestions(BANQUE_UNIVERSELLE, {
    duoId: duo.duoId,
    jour,
    // Le fonds universel n'est filtré par aucune tranche : ces deux valeurs ne
    // servent qu'à satisfaire le critère partagé. Le jour où les extensions par
    // tranche entreront en jeu, c'est le serveur qui les fournira — lui seul connaît
    // celle de l'autre.
    vivier: vivier ?? 'majeur',
    trancheA: tranche ?? '26-39',
    trancheB: tranche ?? '26-39',
    dejaPosees: new Set(duo.carnet.map((e) => e.questionId)),
  });

  const dernierJour = duo.carnet.reduce((max, e) => Math.max(max, e.jour), -Infinity);
  const compte = sessionCompte(Number.isFinite(dernierJour) ? dernierJour : undefined, jour);

  async function cloturer(toutes: number[]) {
    if (!duo) return;
    const entrees: EntreeCarnet[] = questions.map((q, i) => ({
      jour,
      questionId: q.id,
      maReponse: (toutes[i] ?? 0) as EntreeCarnet['maReponse'],
    }));

    // **La progression appartient au duo** (P6), et la part des questions est acquise
    // même si le jeu ne se joue jamais : c'est ce qui permet à une relation de survivre
    // à deux agendas incompatibles (§11.2).
    const gagnes = compte
      ? pointsSession({
          questionsCompletes: true,
          jeuJoue: false,
          jeuReussi: false,
          memeZone: false,
        })
      : 0;

    setACompte(compte);

    await majDonnees((d) =>
      majDuo(
        d,
        duo.duoId,
        (existant) => ({
          ...existant,
          points: existant.points + gagnes,
          carnet: [...existant.carnet, ...entrees],
        }),
        () => duo,
      ),
    );
  }

  function repondre(choix: number) {
    const suivantes = [...reponses, choix];
    setReponses(suivantes);
    if (index + 1 >= questions.length) {
      void cloturer(suivantes);
      setEtape('attente_jeu');
    } else {
      setIndex(index + 1);
    }
  }

  if (questions.length === 0) {
    // La banque est épuisée pour ce duo. Le dire plutôt que d'afficher un écran vide.
    return (
      <Ecran>
        <Espace taille="xxl" />
        <Txt variante="titre">Plus de questions pour aujourd'hui</Txt>
        <Espace taille="m" />
        <Txt ton="adouci">
          Vous avez fait le tour de ce que j'avais à vous demander. J'en écris d'autres.
        </Txt>
        <Espace taille="l" />
        <Bouton titre="Retour" onPress={() => router.replace('/duos')} />
      </Ecran>
    );
  }

  if (etape === 'questions') {
    const question = questions[index];
    if (!question) return null;

    return (
      <Ecran>
        <Espace taille="m" />
        <Txt variante="minuscule" ton="eteint">
          Jour {jour} · question {index + 1} sur {questions.length}
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
        {!aCompte && (
          <>
            <Espace taille="m" />
            {/* On ne limite pas le jeu, on limite la progression — et le dire évite de
                laisser croire à un bug (§11.3). */}
            <Txt variante="petit" ton="eteint">
              Ta session d'aujourd'hui est déjà comptée. Tu peux continuer à jouer, mais
              le compteur, lui, attend demain.
            </Txt>
          </>
        )}
        <Espace taille="l" />

        <VoixMachine>
          Vous pouvez aussi jouer une partie tout de suite si vous êtes tous les deux
          disponibles. Sinon, ça attendra — et ce n'est pas grave.
        </VoixMachine>

        <View style={styles.bas}>
          <Bouton titre="Jouer maintenant" onPress={() => router.push('/recherche')} />
          <Espace taille="s" />
          <Bouton
            titre="Voir ce qu'on a en commun"
            variante="secondaire"
            onPress={() => setEtape('revelation')}
          />
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

  // Sans serveur, les réponses de l'autre n'existent nulle part. Plutôt que d'afficher
  // un chiffre inventé, on en fabrique un **déterministe à partir de la graine de la
  // session** : c'est le même mécanisme que le tirage des questions, donc la révélation
  // a la forme et la variabilité qu'elle aura en vrai, sans prétendre à autre chose.
  const communs =
    modeServeur === 'local'
      ? compterCommuns(reponses, graineSession(duo.duoId, jour), questions.length)
      : null;

  return (
    <Revelation
      niveau={niveau}
      points={duo.points}
      total={questions.length}
      communs={communs}
    />
  );
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
 *
 * Ce que le partenaire a réellement répondu viendra du serveur : tant qu'il n'y en a
 * pas, l'écran montre la forme de la révélation, pas son contenu.
 */
function Revelation({
  niveau,
  points,
  total,
  communs,
}: {
  niveau: NiveauRevelation;
  points: number;
  total: number;
  /** `null` tant que les réponses de l'autre ne sont pas connues. */
  communs: number | null;
}) {
  const restants = pointsAvantPalierSuivant(points);

  return (
    <Ecran defilant>
      <Espace taille="xl" />
      <Txt variante="minuscule" ton="eteint">
        Ce que vous avez en commun
      </Txt>
      <Espace taille="m" />

      {communs === null ? (
        <>
          <Txt variante="titre">On attend sa réponse</Txt>
          <Espace taille="m" />
          <Txt ton="adouci">
            Tu sauras ce que vous avez en commun dès qu'il aura répondu de son côté.
            Rien ne presse : tes réponses sont déjà là.
          </Txt>
        </>
      ) : niveau === 'nombre_seul' ? (
        <>
          {/* Au palier 1, **le nombre et rien d'autre**. C'est frustrant dans le bon
              sens, et c'est précisément ce qui donne envie de revenir demain (§11.5). */}
          <Txt variante="heros">
            {communs} réponse{communs > 1 ? 's' : ''} sur {total}
          </Txt>
          <Espace taille="m" />
          <Txt ton="adouci">identiques. Lesquelles ? Ça, tu le sauras bientôt.</Txt>
          <Espace taille="l" />
          <VoixMachine>
            {communs === 0
              ? "Rien en commun aujourd'hui. Franchement, ça promet des débats."
              : communs === total
                ? 'Tout pareil. Vous trichez ?'
                : "Un peu d'accord, un peu pas. La zone la plus intéressante."}
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

/**
 * Les réponses du partenaire de complaisance, sans serveur.
 *
 * Tirées de la graine de la session, donc stables : rouvrir l'écran ne change pas le
 * résultat, et deux jours différents ne donnent pas le même. C'est une mise en scène
 * assumée — elle donne la **forme** de la révélation, pas son contenu.
 */
function compterCommuns(miennes: readonly number[], graine: number, total: number): number {
  let etat = graine | 0;
  let communs = 0;

  for (let i = 0; i < total; i += 1) {
    etat = (Math.imul(etat, 1664525) + 1013904223) | 0;
    if (miennes[i] === Math.abs(etat) % 4) communs += 1;
  }
  return communs;
}
