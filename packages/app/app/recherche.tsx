/**
 * La recherche.
 *
 * L'écran le plus délicat du produit, parce que **c'est celui qu'on verra le plus
 * souvent sans rien trouver** pendant les premiers mois. Il doit donc être supportable
 * dans l'échec, pas seulement beau dans le succès.
 *
 * Trois décisions qui en découlent :
 *
 * - **L'élargissement est visible.** L'utilisateur voit la distance monter, donc il
 *   comprend qu'une personne trouvée tard était loin. Et l'attente devient une montée
 *   de tension au lieu d'un chargement (§7.1).
 * - **Jamais un cul-de-sac.** Si personne, on propose la trace ou le solo (§7.8).
 * - **Aucun refus n'est jamais annoncé.** Si l'autre n'accepte pas, on affiche « on
 *   continue à chercher » — sans jamais laisser deviner s'il a refusé ou s'il n'a rien
 *   vu (P5).
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { GEO, type JeuId } from '@sadfy/shared';

import { Bouton, Ecran, Espace, Txt, VoixMachine } from '../src/composants.js';
import { couleurs, espace, rayons } from '../src/theme.js';

type Phase = 'permission' | 'scan' | 'proposition' | 'attente' | 'personne';

const NOMS_JEUX: Record<JeuId, string> = {
  blind_match: 'Blind Match',
  la_scie: 'La Scie',
  portrait_robot: 'Portrait Robot',
  demineur_cooperatif: 'Démineur coopératif',
  convergence: 'Convergence',
};

export default function Recherche() {
  const [phase, setPhase] = useState<Phase>('permission');
  const [rayonM, setRayonM] = useState<number>(GEO.RAYON_INITIAL_M);
  const [jeu] = useState<JeuId>('portrait_robot');

  return (
    <Ecran>
      {phase === 'permission' && <DemandePosition onAccepte={() => setPhase('scan')} />}

      {phase === 'scan' && (
        <Scan
          rayonM={rayonM}
          onRayon={setRayonM}
          onTrouve={() => setPhase('proposition')}
          onPersonne={() => setPhase('personne')}
        />
      )}

      {phase === 'proposition' && (
        <Proposition
          jeu={jeu}
          onAccepte={() => setPhase('attente')}
          onDecline={() => setPhase('scan')}
        />
      )}

      {phase === 'attente' && <Attente onAbandon={() => setPhase('scan')} />}

      {phase === 'personne' && <Personne onTrace={() => router.back()} />}
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

function Scan({
  rayonM,
  onRayon,
  onTrouve,
  onPersonne,
}: {
  rayonM: number;
  onRayon: (m: number) => void;
  onTrouve: () => void;
  onPersonne: () => void;
}) {
  const pulsation = useRef(new Animated.Value(0)).current;
  const debut = useRef(Date.now());

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

  useEffect(() => {
    const minuteur = setInterval(() => {
      const ecoule = Date.now() - debut.current;
      if (ecoule >= GEO.DUREE_SCAN_MS) {
        onPersonne();
        return;
      }
      // Le rayon suit exactement les paliers du noyau partagé : l'application ne
      // réinvente aucune règle, elle affiche celle qui fait autorité.
      const index = Math.min(
        GEO.PALIERS_ELARGISSEMENT_M.length - 1,
        Math.floor((ecoule / GEO.DUREE_SCAN_MS) * GEO.PALIERS_ELARGISSEMENT_M.length),
      );
      onRayon(GEO.PALIERS_ELARGISSEMENT_M[index] ?? GEO.RAYON_INITIAL_M);
    }, 500);
    return () => clearInterval(minuteur);
  }, [onPersonne, onRayon]);

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
          trouvée tard était loin, plutôt que de le découvrir après coup (§7.1). */}
      <Txt ton="adouci" centre>
        {rayonM < 1_500 ? "à moins d'un kilomètre" : `jusqu'à ${Math.round(rayonM / 1_000)} km`}
      </Txt>

      <View style={styles.bas}>
        <Bouton titre="Annuler" variante="discret" onPress={() => router.back()} />
        {/* Bouton de développement : sera retiré du parcours réel. */}
        <Bouton titre="(simuler une rencontre)" variante="discret" onPress={onTrouve} />
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
  jeu,
  onAccepte,
  onDecline,
}: {
  jeu: JeuId;
  onAccepte: () => void;
  onDecline: () => void;
}) {
  return (
    <View style={styles.centre}>
      <View style={styles.avatar}>
        <Txt variante="heros">◕</Txt>
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
        environ 3 minutes
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
function Personne({ onTrace }: { onTrace: () => void }) {
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
        <Bouton titre="Jouer en solo" variante="secondaire" onPress={() => router.back()} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
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
});

