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
import { creerStyles, espace, rayons, useTheme } from '../src/theme.js';

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
  const styles = useStyles();
  const courant = emplacementVisage(emplacement);

  return (
    <View>
      <Espace taille="m" />
      <Txt variante="minuscule" ton="eteint">
        Témoin · {courant?.libelle ?? '—'}
      </Txt>
      <Espace taille="l" />

      <View style={styles.duoVisages}>
        <View style={styles.colonneVisage}>
          <Visage valeurs={cible} accent />
          <Espace taille="s" />
          <Txt variante="minuscule" ton="accent" capitales centre>
            recherché
          </Txt>
        </View>
        <View style={styles.colonneVisage}>
          <Visage valeurs={construit} />
          <Espace taille="s" />
          <Txt variante="minuscule" ton="eteint" capitales centre>
            le sien
          </Txt>
        </View>
      </View>

      <Espace taille="l" />
      <Traits valeurs={cible} />

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
  const styles = useStyles();
  const courant = emplacementVisage(emplacement);

  return (
    <View>
      <Espace taille="m" />
      <Txt variante="minuscule" ton="eteint">
        Inspecteur · {courant?.libelle ?? '—'}
        {essais > 0 ? ` · ${essais} essai${essais > 1 ? 's' : ''}` : ''}
      </Txt>
      <Espace taille="l" />

      <View style={styles.centre}>
        <Visage valeurs={construit} />
      </View>
      <Espace taille="m" />
      <Traits valeurs={construit} />

      <Espace taille="l" />
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

/**
 * Le visage, dessiné.
 *
 * Schématique et assumé : Sadfy n'a **aucune photo**, et un portrait robot qui
 * ressemblerait vraiment à quelqu'un trahirait l'anonymat que tout le reste protège
 * (§5.2). Ce qu'il faut, c'est qu'on voie un visage — pas qui c'est.
 *
 * Chaque trait est une forme dont les proportions sont dérivées du numéro de l'option.
 * Six options par emplacement donnent donc six visages nettement différents sans une
 * seule image, et sans qu'aucun fichier ne soit à charger.
 */
function Visage({
  valeurs,
  accent = false,
}: {
  valeurs: Construit | VisageCible;
  accent?: boolean;
}) {
  const c = useTheme();
  const styles = useStyles();
  const v = valeurs as Record<string, number | undefined>;
  const trait = (cle: string) => v[cle];
  const teinte = accent ? c.accentClair : c.texteAdouci;

  const cheveux = trait('cheveux');
  const yeux = trait('yeux');
  const nez = trait('nez');
  const bouche = trait('bouche');
  const accessoire = trait('accessoire');

  return (
    <View style={[styles.tete, accent && styles.teteAccent]}>
      {/* Cheveux : une masse posée sur le crâne, plus ou moins haute et large. */}
      {cheveux !== undefined && (
        <View
          style={[
            styles.cheveux,
            {
              height: 22 + (cheveux % 3) * 10,
              left: 14 - (cheveux % 2) * 8,
              right: 14 - (cheveux % 2) * 8,
              borderTopLeftRadius: 40 + (cheveux % 3) * 20,
              borderTopRightRadius: 40 + ((cheveux + 1) % 3) * 20,
              backgroundColor: teinte,
              opacity: 0.55,
            },
          ]}
        />
      )}

      <View style={styles.rangeeYeux}>
        {[0, 1].map((i) => (
          <View
            key={i}
            style={[
              styles.oeil,
              yeux === undefined
                ? styles.traitAbsent
                : {
                    width: 14 + (yeux % 3) * 5,
                    height: 6 + (yeux % 4) * 3,
                    borderRadius: rayons.rond,
                    backgroundColor: teinte,
                  },
            ]}
          />
        ))}
      </View>

      <View
        style={[
          styles.nez,
          nez === undefined
            ? styles.traitAbsent
            : {
                width: 4 + (nez % 3) * 3,
                height: 14 + (nez % 4) * 5,
                backgroundColor: teinte,
                opacity: 0.7,
              },
        ]}
      />

      <View
        style={[
          styles.bouche,
          bouche === undefined
            ? styles.traitAbsent
            : {
                width: 26 + (bouche % 4) * 8,
                height: 4 + (bouche % 3) * 3,
                borderBottomLeftRadius: (bouche % 2) * 12,
                borderBottomRightRadius: (bouche % 2) * 12,
                backgroundColor: teinte,
              },
        ]}
      />

      {/* L'accessoire, posé par-dessus : lunettes, couvre-chef ou rien. */}
      {accessoire !== undefined && accessoire % 3 === 0 && (
        <View style={styles.lunettes}>
          <View style={[styles.verre, { borderColor: teinte }]} />
          <View style={[styles.pont, { backgroundColor: teinte }]} />
          <View style={[styles.verre, { borderColor: teinte }]} />
        </View>
      )}
      {accessoire !== undefined && accessoire % 3 === 1 && (
        <View style={[styles.bonnet, { backgroundColor: teinte }]} />
      )}
      {accessoire !== undefined && accessoire % 3 === 2 && (
        <View style={[styles.boucle, { backgroundColor: teinte }]} />
      )}
    </View>
  );
}

/** La liste des traits, en mots — elle reste, parce qu'un dessin schématique ne dit pas
 *  « bouche pincée » et que le Témoin doit pouvoir répondre sans ambiguïté. */
function Traits({ valeurs }: { valeurs: Construit | VisageCible }) {
  const styles = useStyles();
  const v = valeurs as Record<string, number | undefined>;

  return (
    <View style={styles.traits}>
      {EMPLACEMENTS_VISAGE.map((e) => (
        <View key={e.cle} style={styles.ligneTrait}>
          <Txt variante="minuscule" ton="eteint" capitales>
            {e.libelle}
          </Txt>
          <Txt variante="petit" ton={v[e.cle] === undefined ? 'eteint' : 'normal'}>
            {v[e.cle] === undefined ? '—' : libelleVisage(e.cle, v[e.cle])}
          </Txt>
        </View>
      ))}
    </View>
  );
}

const useStyles = creerStyles((couleurs) =>
  StyleSheet.create({
    centre: { alignItems: 'center' },
    duoVisages: { flexDirection: 'row', gap: espace.m, justifyContent: 'center' },
    colonneVisage: { alignItems: 'center' },

    tete: {
      width: 132,
      height: 156,
      borderRadius: 56,
      backgroundColor: couleurs.fondHaut,
      borderWidth: 1,
      borderColor: couleurs.bordure,
      alignItems: 'center',
      overflow: 'hidden',
      paddingTop: 58,
    },
    teteAccent: { borderColor: couleurs.bordureAccent, backgroundColor: couleurs.accentVoile },
    cheveux: { position: 'absolute', top: 0 },
    rangeeYeux: { flexDirection: 'row', gap: 16, alignItems: 'center', height: 20 },
    oeil: { backgroundColor: couleurs.texteAdouci },
    nez: { marginTop: 6, borderRadius: rayons.rond },
    bouche: { marginTop: 10, borderRadius: rayons.rond },
    /** Un trait pas encore trouvé n'est pas vide : c'est une place qui attend. */
    traitAbsent: {
      width: 20,
      height: 2,
      borderRadius: rayons.rond,
      backgroundColor: couleurs.bordureVive,
    },

    lunettes: {
      position: 'absolute',
      top: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    verre: { width: 26, height: 26, borderRadius: rayons.rond, borderWidth: 2 },
    pont: { width: 8, height: 2 },
    bonnet: { position: 'absolute', top: 0, left: 8, right: 8, height: 30, opacity: 0.85 },
    boucle: {
      position: 'absolute',
      top: 86,
      right: 16,
      width: 8,
      height: 8,
      borderRadius: rayons.rond,
    },

    traits: { gap: espace.s },
    ligneTrait: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: espace.m,
    },

    options: { gap: espace.s },
    option: {
      paddingVertical: espace.m,
      paddingHorizontal: espace.m,
      borderRadius: rayons.m,
      borderWidth: 1,
      borderColor: couleurs.bordure,
      backgroundColor: couleurs.voile,
    },
  }),
);
