/**
 * Le premier lancement.
 *
 * Trois écrans, pas un de plus. Chaque écran d'onboarding perd du monde, et Sadfy n'a
 * presque rien à demander : **aucune saisie n'est nécessaire pour jouer** (§5.2). Le
 * pseudo et les passions arriveront au fil des paliers, quand ils deviendront utiles.
 *
 * Ce qui est demandé ici l'est pour une raison précise, et elle est dite à
 * l'utilisateur :
 *
 * - **la date de naissance**, pour le cloisonnement mineurs/majeurs. Elle ne quitte
 *   jamais l'appareil ;
 * - **le genre**, parce que le filtre en dépend et parce que c'est lui qui décide de
 *   qui ouvre la Décision à l'endgame — règle qu'on annonce plutôt que de la cacher
 *   (§13.4).
 */

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { AGE, type FiltreGenre, type Genre } from '@sadfy/shared';

import { Bouton, Ecran, Espace, Txt, VoixMachine } from '../src/composants.js';
import { useMagasin } from '../src/etat.js';
import { creerStyles, espace, rayons } from '../src/theme.js';

type Etape = 'accueil' | 'age' | 'genre';

export default function Bienvenue() {
  const styles = useStyles();
  const { creerIdentite, enregistrerProfil } = useMagasin();
  const [etape, setEtape] = useState<Etape>('accueil');
  const [annee, setAnnee] = useState<number | null>(null);
  const [genre, setGenre] = useState<Genre | null>(null);
  const [filtre, setFiltre] = useState<FiltreGenre>('peu_importe');

  const anneeCourante = new Date().getFullYear();

  async function terminer() {
    if (annee === null || genre === null) return;
    await creerIdentite();
    await enregistrerProfil({
      // Le 1er janvier suffit : on ne demande pas le jour exact, l'âge à l'année près
      // est tout ce dont le cloisonnement a besoin, et c'est une donnée de moins.
      dateNaissance: `${annee}-01-01`,
      genre,
      filtreGenre: filtre,
      ecartAgeMax: AGE.ECART_DEFAUT_MAJEUR,
    });
    router.replace('/duos');
  }

  if (etape === 'accueil') {
    return (
      <Ecran>
        <Espace taille="xxxl" />
        <Txt variante="heros">Sadfy</Txt>
        <Espace taille="m" />
        <Txt variante="sousTitre" ton="adouci">
          Quelqu'un, quelque part, à moins d'un kilomètre.
        </Txt>
        <Espace taille="l" />
        <Txt ton="adouci">
          Pas de photo. Pas de profil à faire défiler. Vous jouez ensemble, et vous
          découvrez l'autre un peu plus chaque jour.
        </Txt>
        <Espace taille="l" />
        <VoixMachine>
          Je serai là aussi. Je commente, je juge un peu, et je tranche quand vous
          n'arrivez pas à vous mettre d'accord.
        </VoixMachine>

        <View style={styles.bas}>
          <Bouton titre="Commencer" onPress={() => setEtape('age')} />
          <Espace taille="s" />
          <Txt variante="minuscule" ton="eteint" centre>
            Aucun compte, aucun email, aucun mot de passe.
          </Txt>
        </View>
      </Ecran>
    );
  }

  if (etape === 'age') {
    const annees = Array.from({ length: 80 }, (_, i) => anneeCourante - AGE.MINIMUM - i);

    return (
      <Ecran defilant>
        <Espace taille="xl" />
        <Txt variante="titre">Ton année de naissance</Txt>
        <Espace taille="s" />
        <Txt ton="adouci">
          Elle ne quitte jamais ton téléphone. Elle sert à ne jamais mettre en relation
          un mineur et un majeur — c'est tout.
        </Txt>
        <Espace taille="l" />

        <View style={styles.grille}>
          {annees.map((a) => (
            <Pressable
              key={a}
              onPress={() => setAnnee(a)}
              style={[styles.jeton, annee === a && styles.jetonActif]}
            >
              <Txt variante="petit" ton={annee === a ? 'normal' : 'adouci'}>
                {a}
              </Txt>
            </Pressable>
          ))}
        </View>

        <Espace taille="l" />
        <Bouton
          titre="Continuer"
          onPress={() => setEtape('genre')}
          desactive={annee === null}
        />
        <Espace taille="xl" />
      </Ecran>
    );
  }

  return (
    <Ecran defilant>
      <Espace taille="xl" />
      <Txt variante="titre">Tu es…</Txt>
      <Espace taille="s" />
      <Txt ton="adouci">
        Ça sert au filtre, et à décider qui propose en premier le jour où vous déciderez
        de vous rencontrer. Dans un duo homme-femme, c'est elle.
      </Txt>
      <Espace taille="m" />

      <View style={styles.ligne}>
        {(['femme', 'homme', 'autre'] as const).map((g) => (
          <Pressable
            key={g}
            onPress={() => setGenre(g)}
            style={[styles.option, genre === g && styles.optionActive]}
          >
            <Txt ton={genre === g ? 'normal' : 'adouci'}>
              {g === 'femme' ? 'Une femme' : g === 'homme' ? 'Un homme' : 'Autre'}
            </Txt>
          </Pressable>
        ))}
      </View>

      <Espace taille="xl" />
      <Txt variante="sousTitre">Tu veux jouer avec…</Txt>
      <Espace taille="s" />
      <Txt variante="petit" ton="eteint">
        Un filtre réduit tes chances de trouver quelqu'un. « Peu importe » est le plus
        généreux — tu pourras changer d'avis.
      </Txt>
      <Espace taille="m" />

      <View style={styles.ligne}>
        {(['peu_importe', 'femmes', 'hommes'] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFiltre(f)}
            style={[styles.option, filtre === f && styles.optionActive]}
          >
            <Txt ton={filtre === f ? 'normal' : 'adouci'}>
              {f === 'peu_importe' ? 'Peu importe' : f === 'femmes' ? 'Des femmes' : 'Des hommes'}
            </Txt>
          </Pressable>
        ))}
      </View>

      <Espace taille="xl" />
      <Bouton titre="C'est parti" onPress={() => void terminer()} desactive={genre === null} />
      <Espace taille="xl" />
    </Ecran>
  );
}

const useStyles = creerStyles((couleurs) =>
  StyleSheet.create({
    bas: { marginTop: 'auto', paddingBottom: espace.l },
    grille: { flexDirection: 'row', flexWrap: 'wrap', gap: espace.s },
    ligne: { gap: espace.s },
    jeton: {
      paddingVertical: espace.s,
      paddingHorizontal: espace.m,
      borderRadius: rayons.rond,
      borderWidth: 1,
      borderColor: couleurs.bordure,
      backgroundColor: couleurs.fondEleve,
    },
    jetonActif: { borderColor: couleurs.accent, backgroundColor: couleurs.bordureAccent },
    option: {
      paddingVertical: espace.m,
      paddingHorizontal: espace.m,
      borderRadius: rayons.m,
      borderWidth: 1,
      borderColor: couleurs.bordure,
      backgroundColor: couleurs.fondEleve,
    },
    optionActive: { borderColor: couleurs.accent, backgroundColor: couleurs.bordureAccent },
  }),
);
