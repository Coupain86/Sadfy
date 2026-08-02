/**
 * Le Portrait Robot — le premier jeu asymétrique, palier 2.
 *
 * Le Témoin voit un visage. L'Inspecteur doit le reconstituer sans jamais le voir, en
 * proposant des éléments un par un ; le Témoin ne peut répondre que par oui ou non.
 *
 * **C'est ici que la règle fondatrice devient visible** : deux interfaces réellement
 * différentes, pas une interface avec des parties masquées. Le composant de
 * l'Inspecteur ne reçoit même pas le visage recherché — le type de sa vue n'a aucun
 * champ pour ça. Il ne pourrait pas l'afficher si on le lui demandait, et rien dans le
 * navigateur ne permet de l'en extraire, puisque le serveur ne l'a jamais envoyé (§A9).
 *
 * Tour par tour, donc **il survit aux coupures du métro** (§15.2) — le critère qui a
 * façonné tout le catalogue.
 */

import { Pressable, StyleSheet, View } from 'react-native';

import type {
  EmplacementVisage as CleEmplacement,
  Visage as VisageCible,
  VuePortraitRobot,
} from '@sadfy/shared';

import { Bouton, Espace, Txt } from '../src/composants.js';
import { EMPLACEMENTS_VISAGE, emplacementVisage, libelleVisage } from '../src/contenu.js';
import { CoquillePartie } from '../src/coquille-partie.js';
import { couleurs, espace, rayons } from '../src/theme.js';

export default function PortraitRobot() {
  return (
    <CoquillePartie<VuePortraitRobot>
      jeu="portrait_robot"
      rendre={(vue, agir) =>
        vue.role === 'temoin' ? (
          <Temoin
            emplacement={vue.emplacementCourant}
            cible={vue.visageCible}
            construit={vue.construit}
            proposition={vue.propositionEnAttente}
            onRepondre={(oui) => agir({ type: 'repondre', oui })}
          />
        ) : (
          <Inspecteur
            emplacement={vue.emplacementCourant}
            construit={vue.construit}
            options={vue.options}
            enAttente={vue.enAttenteDeReponse}
            essais={vue.essais}
            onProposer={(valeur) => agir({ type: 'proposer', valeur })}
          />
        )
      }
    />
  );
}

// ---------------------------------------------------------------------------

type Construit = Readonly<Partial<Record<CleEmplacement, number>>>;

/** Le Témoin voit la cible. Il ne peut répondre que par oui ou non. */
function Temoin({
  emplacement,
  cible,
  construit,
  proposition,
  onRepondre,
}: {
  emplacement: CleEmplacement | null;
  cible: VisageCible;
  construit: Construit;
  proposition: number | null;
  onRepondre: (oui: boolean) => void;
}) {
  const courant = emplacementVisage(emplacement);

  return (
    <View>
      <Espace taille="m" />
      <Txt variante="minuscule" ton="eteint">
        Témoin · {courant?.libelle ?? '—'}
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

      <Espace taille="xl" />
      {proposition === null ? (
        <Txt ton="eteint" centre>
          Il réfléchit…
        </Txt>
      ) : (
        <>
          <Txt variante="sousTitre" centre>
            Il propose « {libelleVisage(emplacement ?? '', proposition)} »
          </Txt>
          <Espace taille="m" />
          {/* Oui ou non, rien d'autre. Laisser le Témoin en dire plus rouvrirait un
              canal de texte libre par la fenêtre (P3). */}
          <Bouton titre="Oui, c'est ça" onPress={() => onRepondre(true)} />
          <Espace taille="s" />
          <Bouton titre="Non" variante="secondaire" onPress={() => onRepondre(false)} />
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------

/** L'Inspecteur ne reçoit **jamais** la cible — son type de vue n'en a pas de champ. */
function Inspecteur({
  emplacement,
  construit,
  options,
  enAttente,
  essais,
  onProposer,
}: {
  emplacement: CleEmplacement | null;
  construit: Construit;
  options: readonly number[];
  enAttente: boolean;
  essais: number;
  onProposer: (valeur: number) => void;
}) {
  const courant = emplacementVisage(emplacement);

  return (
    <View>
      <Espace taille="m" />
      <Txt variante="minuscule" ton="eteint">
        Inspecteur · {courant?.libelle ?? '—'}
        {essais > 0 ? ` · ${essais} essai${essais > 1 ? 's' : ''}` : ''}
      </Txt>
      <Espace taille="l" />

      <Txt variante="petit" ton="adouci">
        Ce que tu as construit
      </Txt>
      <Espace taille="s" />
      <Visage valeurs={construit} />

      <Espace taille="xl" />
      <Txt variante="sousTitre">{courant ? `Propose ${courant.libelle.toLowerCase()}` : '…'}</Txt>
      <Espace taille="m" />

      <View style={styles.options}>
        {options.map((i) => (
          <Pressable
            key={i}
            onPress={() => onProposer(i)}
            disabled={enAttente}
            style={[styles.option, enAttente && { opacity: 0.3 }]}
          >
            <Txt variante="petit">{libelleVisage(emplacement ?? '', i)}</Txt>
          </Pressable>
        ))}
      </View>

      <Espace taille="l" />
      <Txt ton="eteint" centre>
        {enAttente ? 'Il regarde…' : 'À toi de proposer'}
      </Txt>
    </View>
  );
}

// ---------------------------------------------------------------------------

function Visage({
  valeurs,
  accent = false,
}: {
  valeurs: Construit | VisageCible;
  accent?: boolean;
}) {
  return (
    <View style={[styles.visage, accent && { borderColor: couleurs.accent }]}>
      {EMPLACEMENTS_VISAGE.map((e) => {
        const valeur = (valeurs as Record<string, number | undefined>)[e.cle];
        return (
          <View key={e.cle} style={styles.trait}>
            <Txt variante="minuscule" ton="eteint">
              {e.libelle}
            </Txt>
            <Txt variante="petit" ton={valeur === undefined ? 'eteint' : 'normal'}>
              {valeur === undefined ? '—' : libelleVisage(e.cle, valeur)}
            </Txt>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  visage: {
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.m,
    backgroundColor: couleurs.fondEleve,
    padding: espace.m,
    gap: espace.s,
  },
  trait: { gap: 2 },
  options: { gap: espace.s },
  option: {
    paddingVertical: espace.m,
    paddingHorizontal: espace.m,
    borderRadius: rayons.m,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.fondEleve,
  },
});
