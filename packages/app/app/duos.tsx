/**
 * L'écran principal, à partir du deuxième jour : la liste des duos (§12.3).
 *
 * Deux règles de rédaction gouvernent cet écran, et elles ne sont pas cosmétiques :
 *
 * - **Ne jamais afficher « X n'a pas joué depuis 4 jours ».** C'est factuel, et ça se
 *   lit comme un abandon. On affiche « en pause », avec le bouton pour relancer.
 * - **Ne jamais afficher le nombre de points brut comme un score.** Ce qui compte,
 *   c'est ce qui va se débloquer — c'est ça qui donne envie de revenir (§11.4).
 */

import { FlatList, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import {
  RELATIONS,
  palierPour,
  pointsAvantPalierSuivant,
  pseudoVisible,
  type Palier,
} from '@sadfy/shared';

import { Bouton, Carte, Ecran, Espace, Txt, VoixMachine } from '../src/composants.js';
import { useMagasin } from '../src/etat.js';
import type { DuoLocal } from '../src/stockage.js';
import { capacites } from '../src/support.js';
import { couleurs, espace, rayons } from '../src/theme.js';

const NOMS_PALIERS: Record<Palier, string> = {
  fantome: 'Le Fantôme',
  partenaire: 'Le Partenaire',
  equipe: "L'Équipe",
  decision: 'La Décision',
};

export default function Duos() {
  const { donnees } = useMagasin();

  const actifs = donnees.duos.filter((d) => d.etat === 'active');
  const enPause = donnees.duos.filter((d) => d.etat === 'en_pause' || d.etat === 'arretee');
  const plafondAtteint = actifs.length >= RELATIONS.PLAFOND_ACTIVES;

  if (donnees.duos.length === 0) return <Vide />;

  return (
    <Ecran>
      <Txt variante="titre">Tes duos</Txt>
      <Espace taille="s" />
      <Txt variante="minuscule" ton="eteint">
        {actifs.length} sur {RELATIONS.PLAFOND_ACTIVES} — Sadfy n'est pas une application
        où l'on collectionne
      </Txt>
      <Espace taille="l" />

      <FlatList
        data={[...actifs, ...enPause]}
        keyExtractor={(d) => d.duoId}
        ItemSeparatorComponent={() => <Espace taille="s" />}
        renderItem={({ item }) => <LigneDuo duo={item} />}
        ListFooterComponent={
          <View>
            <Espace taille="l" />
            {plafondAtteint ? (
              <VoixMachine>
                Quatre relations en cours, c'est déjà beaucoup pour un être humain. Mets-en
                une en pause si tu veux rencontrer quelqu'un.
              </VoixMachine>
            ) : (
              <Bouton titre="Chercher quelqu'un" onPress={() => router.push('/recherche')} />
            )}
            <Espace taille="xl" />
          </View>
        }
      />
    </Ecran>
  );
}

function LigneDuo({ duo }: { duo: DuoLocal }) {
  const palier = palierPour(duo.points);
  const restants = pointsAvantPalierSuivant(duo.points);
  const enPause = duo.etat !== 'active';

  return (
    <Carte onPress={() => router.push(`/duo/${duo.duoId}`)}>
      <View style={styles.enTete}>
        <View style={styles.avatar}>
          <Txt variante="sousTitre">{duo.partenaire.slice(0, 2).toUpperCase()}</Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt variante="sousTitre">
            {pseudoVisible(palier) ? 'Ton partenaire' : 'Quelqu\'un'}
          </Txt>
          <Txt variante="minuscule" ton="eteint">
            {NOMS_PALIERS[palier]}
          </Txt>
        </View>
        {/* « En pause », jamais « n'a pas joué depuis 4 jours » : le second se lit
            comme un abandon et décourage de relancer (§12.3). */}
        {enPause && (
          <View style={styles.badge}>
            <Txt variante="minuscule" ton="eteint">
              en pause
            </Txt>
          </View>
        )}
      </View>

      {!enPause && (
        <>
          <Espace taille="m" />
          <Progression points={duo.points} />
          <Espace taille="s" />
          <Txt variante="minuscule" ton="adouci">
            {restants === null
              ? 'La Décision est disponible'
              : `Encore ${restants} points avant la suite`}
          </Txt>
        </>
      )}
    </Carte>
  );
}

/** La barre montre l'avancée dans le palier courant, jamais un score global. */
function Progression({ points }: { points: number }) {
  const restants = pointsAvantPalierSuivant(points);
  const fraction = restants === null ? 1 : Math.min(1, Math.max(0, 1 - restants / 400));

  return (
    <View style={styles.rail}>
      <View style={[styles.remplissage, { flex: fraction }]} />
      <View style={{ flex: 1 - fraction }} />
    </View>
  );
}

function Vide() {
  return (
    <Ecran>
      <Espace taille="xxl" />
      <Txt variante="titre">Personne encore</Txt>
      <Espace taille="s" />
      <Txt ton="adouci">
        Sadfy commence par une rencontre. Ouvre la recherche quand tu es quelque part où
        il y a du monde — un café, un campus, un train.
      </Txt>
      <Espace taille="l" />

      {!capacites.notificationsPresence && (
        <>
          {/* Annoncé plutôt que subi : sans arrière-plan, la version web ne peut pas
              prévenir. Le taire ferait passer une limite pour une panne (§4). */}
          <Carte>
            <Txt variante="petit" ton="adouci">
              Depuis un navigateur, Sadfy ne peut pas te prévenir quand quelqu'un est à
              côté — les navigateurs ne le permettent pas. L'application installée, si.
            </Txt>
          </Carte>
          <Espace taille="l" />
        </>
      )}

      <View style={{ marginTop: 'auto', paddingBottom: espace.l }}>
        <Bouton titre="Chercher quelqu'un" onPress={() => router.push('/recherche')} />
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  enTete: { flexDirection: 'row', alignItems: 'center', gap: espace.m },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.fondEnfonce,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: espace.s,
    paddingVertical: espace.xs,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.fondEnfonce,
  },
  rail: {
    flexDirection: 'row',
    height: 4,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.fondEnfonce,
    overflow: 'hidden',
  },
  remplissage: { backgroundColor: couleurs.accent },
});
