/**
 * L'endgame — « La Décision ».
 *
 * Le seul endroit du produit où le principe « un refus ne se révèle jamais » s'inverse,
 * et c'est délibéré : laisser quelqu'un indéfiniment en attente est du ghosting organisé
 * par le produit. Une attente sans fin est plus douloureuse qu'un refus clair — on ne
 * peut pas tourner la page d'une phrase qui ne vient jamais (§13.2).
 *
 * Ce qui rend cette transparence supportable, c'est la **réversibilité** : ce n'est pas
 * « non », c'est « pas maintenant ».
 */

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import type { ChoixEndgame } from '@sadfy/shared';

import { Bouton, Carte, Ecran, Espace, Txt, VoixMachine } from '../src/composants.js';
import { couleurs, espace, rayons } from '../src/theme.js';

type Phase = 'ouverture' | 'choix' | 'divergence' | 'retournement' | 'rendezvous' | 'arret';

const OPTIONS: { valeur: ChoixEndgame; titre: string; detail: string }[] = [
  { valeur: 'rencontre', titre: 'Se rencontrer', detail: 'Pour de vrai, dans un lieu public' },
  { valeur: 'reseaux', titre: 'Échanger les réseaux', detail: 'La conversation continue ailleurs' },
  { valeur: 'continuer_a_jouer', titre: 'Continuer à jouer', detail: 'Rien ne presse' },
  { valeur: 'en_rester_la', titre: 'En rester là', detail: 'Tu pourras revenir sur ta décision' },
];

export default function Endgame() {
  const [phase, setPhase] = useState<Phase>('ouverture');
  const [mien, setMien] = useState<ChoixEndgame | null>(null);

  if (phase === 'ouverture') {
    return (
      <Ecran>
        <Espace taille="xxl" />
        <Txt variante="heros">1000</Txt>
        <Espace taille="m" />
        <Txt variante="titre">Vous y êtes</Txt>
        <Espace taille="m" />
        <Txt ton="adouci">
          Dix jours, une question par jour, et vous voilà. Ce que vous faites maintenant
          n'appartient qu'à vous — et rien ne vous oblige à décider aujourd'hui.
        </Txt>
        <Espace taille="l" />
        <VoixMachine>
          Je m'efface. À partir d'ici, c'est entre vous.
        </VoixMachine>
        <View style={styles.bas}>
          <Bouton titre="Voir les options" onPress={() => setPhase('choix')} />
          <Espace taille="s" />
          <Bouton titre="Plus tard" variante="discret" onPress={() => router.back()} />
        </View>
      </Ecran>
    );
  }

  if (phase === 'choix') {
    return (
      <Ecran defilant>
        <Espace taille="xl" />
        <Txt variante="titre">Qu'est-ce que tu veux ?</Txt>
        <Espace taille="s" />
        <Txt variante="petit" ton="adouci">
          Vous répondez chacun de votre côté. Rien n'est communiqué tant que vous n'avez
          pas choisi la même chose — ni le lieu, ni le moindre pseudo.
        </Txt>
        <Espace taille="l" />

        <View style={{ gap: espace.s }}>
          {OPTIONS.map((option) => (
            <Pressable
              key={option.valeur}
              onPress={() => setMien(option.valeur)}
              style={[styles.option, mien === option.valeur && styles.optionActive]}
            >
              <Txt variante="sousTitre">{option.titre}</Txt>
              <Txt variante="minuscule" ton="eteint">
                {option.detail}
              </Txt>
            </Pressable>
          ))}
        </View>

        <Espace taille="xl" />
        <Bouton
          titre="Valider"
          desactive={mien === null}
          onPress={() =>
            setPhase(
              mien === 'en_rester_la'
                ? 'arret'
                : mien === 'rencontre'
                  ? 'divergence'
                  : 'retournement',
            )
          }
        />
        <Espace taille="xl" />
      </Ecran>
    );
  }

  if (phase === 'divergence') {
    return (
      <Ecran>
        <Espace taille="xxl" />
        <Txt variante="titre">Vous ne voulez pas la même chose</Txt>
        <Espace taille="m" />
        {/* La divergence est révélée — ce n'est pas un rejet : les deux veulent
            continuer, ils ne s'accordent pas sur la forme. Le révéler est ce qui rend
            le second tour possible (§13.2). */}
        <Carte>
          <Txt>Tu as choisi <Txt ton="accent">se rencontrer</Txt>.</Txt>
          <Espace taille="xs" />
          <Txt>Il a choisi <Txt ton="accent">échanger les réseaux</Txt>.</Txt>
        </Carte>
        <Espace taille="l" />
        <Txt ton="adouci">
          Ce n'est pas un refus. Vous voulez tous les deux continuer, simplement pas de la
          même façon. On vous repose la question — vous pouvez changer d'avis.
        </Txt>
        <View style={styles.bas}>
          <Bouton titre="Second tour" onPress={() => setPhase('retournement')} />
        </View>
      </Ecran>
    );
  }

  if (phase === 'retournement') {
    return (
      <Ecran>
        <Espace taille="xxl" />
        <Txt variante="titre">Vous avez tous les deux changé d'avis</Txt>
        <Espace taille="m" />
        <Txt ton="adouci">
          Chacun a cédé pour faire plaisir à l'autre. Vous vous êtes ratés — pour la
          meilleure raison qui soit.
        </Txt>
        <Espace taille="l" />
        <VoixMachine>
          Deux personnes qui renoncent en même temps pour l'autre. Je n'ai rien à ajouter.
        </VoixMachine>
        <Espace taille="l" />
        {/* Priorité à la femme pour ouvrir, tirage au sort sinon — et c'est annoncé,
            pas caché : c'est un argument, pas une mécanique honteuse (§13.4). */}
        <Txt variante="petit" ton="adouci">
          C'est elle qui choisit en premier, à découvert. Tu suivras, ou non.
        </Txt>
        <View style={styles.bas}>
          <Bouton titre="Continuer" onPress={() => setPhase('rendezvous')} />
        </View>
      </Ecran>
    );
  }

  if (phase === 'arret') {
    return (
      <Ecran>
        <Espace taille="xxl" />
        <Txt variante="titre">C'est noté</Txt>
        <Espace taille="m" />
        <Txt ton="adouci">
          Il ne saura pas pourquoi, seulement que tu préfères en rester là. Le carnet de
          vos dix jours reste intact.
        </Txt>
        <Espace taille="l" />
        {/* Réversible, et par elle seule : si l'autre pouvait relancer, on
            transformerait un refus en négociation, donc en pression (§13.3). */}
        <Carte>
          <Txt variante="petit">
            Tu peux revenir sur ta décision quand tu veux. Lui ne peut pas te relancer.
          </Txt>
        </Carte>
        <View style={styles.bas}>
          <Bouton titre="Retour" onPress={() => router.replace('/duos')} />
        </View>
      </Ecran>
    );
  }

  return (
    <Ecran>
      <Espace taille="xl" />
      <Txt variante="minuscule" ton="eteint">
        Votre rendez-vous
      </Txt>
      <Espace taille="m" />
      <Txt variante="titre">Jeudi, 18 h</Txt>
      <Espace taille="s" />
      {/* Le point mystère : ni l'un ni l'autre ne l'a choisi, donc personne n'en est
          responsable. Et on suit le point, jamais la personne (§13.5). */}
      <Txt ton="adouci">
        Un lieu que ni l'un ni l'autre ne connaît, dans le quartier où vous vous êtes
        rencontrés. Ouvre Sadfy le moment venu et suis le point.
      </Txt>

      <Espace taille="xl" />
      <Carte>
        <Txt variante="minuscule" ton="eteint">
          Pour vous reconnaître
        </Txt>
        <Espace taille="s" />
        <Txt variante="heros" ton="accent">
          Pingouin Majestueux
        </Txt>
      </Carte>

      <Espace taille="l" />
      <Txt variante="petit" ton="eteint">
        Tu ne verras jamais où il est. Seulement la destination.
      </Txt>

      <View style={styles.bas}>
        <Bouton titre="J'y serai" onPress={() => router.replace('/duos')} />
        <Espace taille="s" />
        <Bouton titre="Je ne peux plus venir" variante="discret" onPress={() => router.back()} />
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  bas: { marginTop: 'auto', paddingBottom: espace.l },
  option: {
    padding: espace.m,
    borderRadius: rayons.m,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.fondEleve,
  },
  optionActive: { borderColor: couleurs.accent, backgroundColor: couleurs.bordureAccent },
});
