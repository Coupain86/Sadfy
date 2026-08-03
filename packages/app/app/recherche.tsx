/**
 * La recherche.
 *
 * L'écran le plus délicat du produit, parce que **c'est celui qu'on verra le plus
 * souvent sans rien trouver** pendant les premiers mois. Il doit donc être supportable
 * dans l'échec, pas seulement beau dans le succès.
 *
 * Quatre décisions qui en découlent :
 *
 * - **L'élargissement est visible.** L'utilisateur voit la distance monter, donc il
 *   comprend qu'une personne trouvée tard était loin. Et l'attente devient une montée
 *   de tension au lieu d'un chargement (§7.1).
 * - **Jamais un cul-de-sac.** Si personne, on propose la trace ou le solo (§7.8).
 * - **Aucun refus n'est jamais annoncé.** Si l'autre n'accepte pas, on affiche « on
 *   continue à chercher » — sans jamais laisser deviner s'il a refusé ou s'il n'a rien
 *   vu (P5).
 * - **Aucune de ces phases n'est simulée.** Le rayon, la proposition, le jeu tiré :
 *   tout vient du serveur. Quand il n'y a pas de serveur, il tourne dans
 *   l'application — mais c'est le même code, et donc le même écran (§A10).
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { GEO, type JeuId } from '@sadfy/shared';

import { Bouton, Ecran, Espace, Txt, VoixMachine } from '../src/composants.js';
import { DUREES_JEUX, ECRANS_JEUX, NOMS_JEUX } from '../src/jeux.js';
import { obtenirPosition } from '../src/position.js';
import { useServeur } from '../src/serveur.js';
import { creerStyles, espace, rayons } from '../src/theme.js';

type Phase = 'permission' | 'sans_position' | 'scan' | 'proposition' | 'attente' | 'personne';

export default function Recherche() {
  const serveur = useServeur();
  const [phase, setPhase] = useState<Phase>('permission');
  const proposition = serveur.proposition;

  // Une partie a commencé : le serveur a tiré le jeu, l'écran correspondant prend la
  // suite. C'est le seul endroit qui décide où va le joueur après un appariement.
  useEffect(() => {
    if (!serveur.jeuEnCours) return;
    router.replace(ECRANS_JEUX[serveur.jeuEnCours]);
  }, [serveur.jeuEnCours]);

  // Les phases suivent le serveur, elles ne l'anticipent pas.
  useEffect(() => {
    if (serveur.proposition) setPhase('proposition');
    else if (serveur.personneTrouvee) setPhase('personne');
    else if (serveur.scanRayonM !== null) setPhase((p) => (p === 'attente' ? p : 'scan'));
  }, [serveur.proposition, serveur.personneTrouvee, serveur.scanRayonM]);

  async function lancer() {
    const position = await obtenirPosition();
    if (position.etat !== 'obtenue') {
      setPhase('sans_position');
      return;
    }
    // La conversion en cellule se fait dans le fournisseur, sur l'appareil : ce qui part
    // sur le réseau n'est déjà plus une position (§A5).
    serveur.chercher(position.lat, position.lon);
    setPhase('scan');
  }

  return (
    <Ecran>
      {phase === 'permission' && <DemandePosition onAccepte={() => void lancer()} />}

      {phase === 'sans_position' && <SansPosition onReessayer={() => void lancer()} />}

      {phase === 'scan' && (
        <Scan
          rayonM={serveur.scanRayonM ?? GEO.RAYON_INITIAL_M}
          onAnnuler={() => {
            serveur.annulerRecherche();
            router.back();
          }}
        />
      )}

      {phase === 'proposition' && proposition && (
        <Proposition
          avatar={proposition.avatar}
          jeu={proposition.jeu}
          onAccepte={() => {
            // Un seul « oui » : c'est le serveur qui sait si ce oui confirme une
            // recherche ou accepte une invitation (§7.4).
            serveur.repondre(proposition.propositionId, true);
            setPhase('attente');
          }}
          onDecline={() => {
            serveur.repondre(proposition.propositionId, false);
            // Celui qui cherchait retourne à son scan ; celui qui a été trouvé sans
            // chercher n'a nulle part où retourner.
            if (serveur.scanRayonM !== null) setPhase('scan');
            else router.back();
          }}
        />
      )}

      {phase === 'attente' && <Attente onAbandon={() => setPhase('scan')} />}

      {phase === 'personne' && (
        <Personne
          onTrace={() => router.back()}
          onReessayer={() => {
            setPhase('permission');
            void lancer();
          }}
        />
      )}
    </Ecran>
  );
}

// ---------------------------------------------------------------------------

/**
 * L'écran d'explication **avant** la fenêtre système.
 *
 * Sans lui, beaucoup refusent par réflexe — et un refus est presque définitif, la
 * plupart des gens ne savent pas revenir dans les réglages. Demandée avec sa raison
 * affichée, l'acceptation est bien meilleure (§5.3).
 */
function DemandePosition({ onAccepte }: { onAccepte: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.centre}>
      <Txt variante="titre" centre>
        Sadfy a besoin de savoir où tu es
      </Txt>
      <Espace taille="m" />
      <Txt ton="adouci" centre>
        Uniquement pour chercher quelqu'un autour de toi.
      </Txt>
      <Espace taille="l" />
      <Txt variante="petit" ton="eteint" centre>
        Ta position n'est jamais enregistrée et jamais partagée. Ton téléphone calcule
        dans quelle zone d'un kilomètre il se trouve, et n'envoie que ce numéro de zone.
        Personne, pas même nous, ne peut remonter à l'endroit exact.
      </Txt>
      <Espace taille="xl" />
      <Bouton titre="D'accord" onPress={onAccepte} />
      <Espace taille="s" />
      <Bouton titre="Plus tard" variante="discret" onPress={() => router.back()} />
    </View>
  );
}

// ---------------------------------------------------------------------------

/**
 * Le refus de position.
 *
 * C'est le seul endroit du produit où la proximité est **requise** et non récompensée
 * (P7) : sans zone, il n'y a pas de première rencontre. On le dit sans reproche et on
 * laisse la porte ouverte, plutôt que de bloquer sur une erreur système.
 */
function SansPosition({ onReessayer }: { onReessayer: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.centre}>
      <Txt variante="titre" centre>
        Sans ta zone, on ne peut pas chercher
      </Txt>
      <Espace taille="m" />
      <Txt ton="adouci" centre>
        C'est la seule chose que Sadfy demande vraiment, et seulement pour la première
        rencontre. Ensuite, la distance ne compte plus.
      </Txt>
      <Espace taille="xl" />
      <Bouton titre="Réessayer" onPress={onReessayer} />
      <Espace taille="s" />
      <Bouton titre="Retour" variante="discret" onPress={() => router.back()} />
    </View>
  );
}

// ---------------------------------------------------------------------------

function Scan({ rayonM, onAnnuler }: { rayonM: number; onAnnuler: () => void }) {
  const styles = useStyles();
  const pulsation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const boucle = Animated.loop(
      Animated.timing(pulsation, {
        toValue: 1,
        duration: 2_400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    boucle.start();
    return () => boucle.stop();
  }, [pulsation]);

  const echelle = pulsation.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.6] });
  const opacite = pulsation.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <View style={styles.centre}>
      <View style={styles.radar}>
        <Animated.View
          style={[styles.onde, { transform: [{ scale: echelle }], opacity: opacite }]}
        />
        <View style={styles.noyau} />
      </View>

      <Espace taille="xl" />
      <Txt variante="titre" centre>
        On cherche
      </Txt>
      <Espace taille="s" />
      {/* La distance monte à l'écran : c'est ce qui fait comprendre qu'une personne
          trouvée tard était loin, plutôt que de le découvrir après coup (§7.1). Elle
          vient du serveur, qui élargit — l'application ne fait que l'afficher. */}
      <Txt ton="adouci" centre>
        {rayonM < 1_500 ? "à moins d'un kilomètre" : `jusqu'à ${Math.round(rayonM / 1_000)} km`}
      </Txt>

      <View style={styles.bas}>
        <Bouton titre="Annuler" variante="discret" onPress={onAnnuler} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------

/**
 * **On propose un jeu, pas une personne.**
 *
 * L'avatar est généré aléatoirement et ne dit rien de l'autre : il n'y a rien à juger,
 * et c'est exactement l'intention. On dit oui à une partie (§7.4).
 */
function Proposition({
  avatar,
  jeu,
  onAccepte,
  onDecline,
}: {
  avatar: string;
  jeu: JeuId;
  onAccepte: () => void;
  onDecline: () => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.centre}>
      <View style={styles.avatar}>
        <Txt variante="heros">{avatar}</Txt>
      </View>

      <Espace taille="l" />
      <Txt variante="titre" centre>
        Quelqu'un est là
      </Txt>
      <Espace taille="s" />
      <Txt ton="adouci" centre>
        à moins d'un kilomètre
      </Txt>

      <Espace taille="xl" />
      <Txt variante="sousTitre" ton="accent" centre>
        {NOMS_JEUX[jeu]}
      </Txt>
      <Espace taille="xs" />
      <Txt variante="petit" ton="eteint" centre>
        {DUREES_JEUX[jeu]}
      </Txt>

      <View style={styles.bas}>
        <Bouton titre="On y va" onPress={onAccepte} />
        <Espace taille="s" />
        {/* Décliner change le jeu, jamais la personne : sinon on aurait reconstitué
            le balayage de profils, présenté un par un (§7.4). */}
        <Bouton titre="Un autre jeu" variante="secondaire" onPress={onDecline} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------

function Attente({ onAbandon }: { onAbandon: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.centre}>
      <Txt variante="titre" centre>
        On attend sa réponse
      </Txt>
      <Espace taille="m" />
      <Txt ton="adouci" centre>
        Tu peux ranger ton téléphone, on te préviendra.
      </Txt>

      <View style={styles.bas}>
        {/* Jamais « il a refusé » : on continue simplement à chercher, sans que
            personne n'apprenne jamais avoir été refusé (P5). */}
        <Bouton titre="Continuer à chercher" variante="discret" onPress={onAbandon} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------

/**
 * L'écran le plus vu des premiers mois — il mérite d'être une vraie proposition, pas un
 * cul-de-sac (§7.8).
 *
 * La trace élargit dans le **temps** ce que le rayon élargit dans l'**espace**.
 */
function Personne({
  onTrace,
  onReessayer,
}: {
  onTrace: () => void;
  onReessayer: () => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.centre}>
      <Txt variante="titre" centre>
        Personne pour l'instant
      </Txt>
      <Espace taille="m" />
      <Txt ton="adouci" centre>
        C'est normal au début, et ça ne veut rien dire de toi.
      </Txt>

      <Espace taille="xl" />
      <VoixMachine>
        Laisse une trace ici. Si quelqu'un passe dans les prochaines heures, il la
        trouvera — et vous serez déjà liés avant même de vous croiser.
      </VoixMachine>

      <View style={styles.bas}>
        <Bouton titre="Laisser une trace" onPress={onTrace} />
        <Espace taille="s" />
        <Bouton titre="Chercher encore" variante="secondaire" onPress={onReessayer} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------

const useStyles = creerStyles((couleurs) =>
  StyleSheet.create({
    centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    bas: { position: 'absolute', bottom: espace.l, left: 0, right: 0 },

    radar: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
    onde: {
      position: 'absolute',
      width: 200,
      height: 200,
      borderRadius: rayons.rond,
      borderWidth: 2,
      borderColor: couleurs.accent,
    },
    noyau: {
      width: 14,
      height: 14,
      borderRadius: rayons.rond,
      backgroundColor: couleurs.accent,
    },

    avatar: {
      width: 96,
      height: 96,
      borderRadius: rayons.rond,
      backgroundColor: couleurs.fondEleve,
      borderWidth: 1,
      borderColor: couleurs.bordure,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }),
);
