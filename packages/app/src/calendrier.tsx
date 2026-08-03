/**
 * Le choix de la date de naissance.
 *
 * On demandait seulement l'année, pour ne détenir qu'une donnée approximative. C'était
 * un mauvais arbitrage, et c'est **la règle la plus sensible du produit** qui en
 * souffrait : avec l'année seule, quelqu'un né en décembre est compté un an trop vieux
 * pendant onze mois. À 17 ans, ça le fait basculer dans le vivier majeur avant son
 * anniversaire — exactement ce que le cloisonnement existe pour empêcher (§5.4).
 *
 * La date exacte est donc demandée. Ce qu'elle ne change pas : **elle ne quitte jamais
 * l'appareil** (§5.2). Ce qui circule reste une tranche d'âge et un bit
 * majeur/mineur — jamais la date, jamais l'âge exact.
 *
 * Trois étapes plutôt qu'un calendrier qu'il faudrait remonter de trente ans : l'année,
 * puis le mois, puis le jour dans le vrai calendrier de ce mois-là. Trois gestes, et le
 * dernier montre un mois réel avec ses jours alignés sous les bons jours de semaine.
 */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AGE, ageA, estEligible } from '@sadfy/shared';

import { Bouton, Espace, Panneau, Txt } from './composants.js';
import {
  JOURS_SEMAINE,
  MOIS,
  dateIso,
  joursDuMois,
  premierJourSemaine,
} from './dates.js';
import { creerStyles, espace, rayons, useTheme } from './theme.js';

/** L'âge le plus élevé qu'on propose. Au-delà, on ne fait plus défiler, on saisit. */
const AGE_MAX_PROPOSE = 95;

type Etape = 'annee' | 'mois' | 'jour';

export function SelecteurNaissance({
  onChoisie,
  maintenant = Date.now(),
}: {
  /** Appelé seulement avec une date complète et éligible. */
  onChoisie: (iso: string) => void;
  maintenant?: number;
}) {
  const c = useTheme();
  const styles = useStyles();

  const [etape, setEtape] = useState<Etape>('annee');
  const [annee, setAnnee] = useState<number | null>(null);
  const [mois, setMois] = useState<number | null>(null);

  const anneeCourante = new Date(maintenant).getUTCFullYear();
  // On propose jusqu'à l'année des tout juste 13 ans : quelqu'un né cette année-là
  // peut ne pas encore les avoir, et c'est le contrôle final qui tranchera.
  const annees = Array.from(
    { length: AGE_MAX_PROPOSE - AGE.MINIMUM + 1 },
    (_, i) => anneeCourante - AGE.MINIMUM - i,
  );

  function choisirJour(jour: number) {
    if (annee === null || mois === null) return;
    onChoisie(dateIso(annee, mois, jour));
  }

  return (
    <View>
      {/* Le fil : il montre ce qui est déjà choisi et permet d'y revenir sans repartir
          de zéro. Un sélecteur qui oblige à tout refaire pour corriger le mois est un
          sélecteur qu'on abandonne. */}
      <View style={styles.fil}>
        <Etiquette
          valeur={annee === null ? 'Année' : String(annee)}
          actif={etape === 'annee'}
          rempli={annee !== null}
          onPress={() => setEtape('annee')}
        />
        <Etiquette
          valeur={mois === null ? 'Mois' : MOIS[mois] ?? 'Mois'}
          actif={etape === 'mois'}
          rempli={mois !== null}
          onPress={() => annee !== null && setEtape('mois')}
        />
        <Etiquette valeur="Jour" actif={etape === 'jour'} rempli={false} onPress={() => {}} />
      </View>

      <Espace taille="l" />

      {etape === 'annee' && (
        <View style={styles.grilleAnnees}>
          {annees.map((a) => (
            <Panneau
              key={a}
              vif={annee === a}
              style={styles.jeton}
              onPress={() => {
                setAnnee(a);
                setEtape('mois');
              }}
            >
              <Txt variante="petit" ton={annee === a ? 'normal' : 'adouci'}>
                {a}
              </Txt>
            </Panneau>
          ))}
        </View>
      )}

      {etape === 'mois' && (
        <View style={styles.grilleMois}>
          {MOIS.map((nom, i) => (
            <Panneau
              key={nom}
              vif={mois === i}
              style={styles.caseMois}
              onPress={() => {
                setMois(i);
                setEtape('jour');
              }}
            >
              <Txt variante="petit" centre ton={mois === i ? 'normal' : 'adouci'}>
                {nom}
              </Txt>
            </Panneau>
          ))}
        </View>
      )}

      {etape === 'jour' && annee !== null && mois !== null && (
        <Calendrier
          annee={annee}
          mois={mois}
          maintenant={maintenant}
          onJour={choisirJour}
        />
      )}

      {etape !== 'annee' && (
        <>
          <Espace taille="l" />
          <Bouton
            titre="Revenir en arrière"
            variante="discret"
            onPress={() => setEtape(etape === 'jour' ? 'mois' : 'annee')}
          />
        </>
      )}

      <Espace taille="l" />
      <Txt variante="petit" ton="eteint" centre style={{ color: c.texteEteint }}>
        Elle ne quitte jamais ton téléphone. Elle sert à ne jamais mettre en relation un
        mineur et un majeur — c'est tout.
      </Txt>
    </View>
  );
}

// ---------------------------------------------------------------------------

/** Le calendrier du mois choisi, avec ses jours alignés sous les bons jours de semaine. */
function Calendrier({
  annee,
  mois,
  maintenant,
  onJour,
}: {
  annee: number;
  mois: number;
  maintenant: number;
  onJour: (jour: number) => void;
}) {
  const styles = useStyles();
  const nombre = joursDuMois(annee, mois);
  const decalage = premierJourSemaine(annee, mois);

  return (
    <View>
      <Txt variante="sousTitre" centre>
        {MOIS[mois]} {annee}
      </Txt>
      <Espace taille="m" />

      <View style={styles.semaine}>
        {JOURS_SEMAINE.map((jour, i) => (
          <View key={i} style={styles.caseJour}>
            <Txt variante="minuscule" ton="eteint" centre>
              {jour}
            </Txt>
          </View>
        ))}
      </View>
      <Espace taille="s" />

      <View style={styles.grilleJours}>
        {/* Les cases vides avant le 1er : sans elles, le mois commencerait un lundi
            quel qu'il soit, et le calendrier serait décoratif au lieu d'être juste. */}
        {Array.from({ length: decalage }, (_, i) => (
          <View key={`vide-${i}`} style={styles.caseJour} />
        ))}

        {Array.from({ length: nombre }, (_, i) => {
          const jour = i + 1;
          // Un jour qui donnerait moins de 13 ans est visible mais inerte : le griser
          // sans explication ferait croire à une panne (§5.4).
          const trop = !estEligible(ageA(dateIso(annee, mois, jour), maintenant));

          return (
            <View key={jour} style={styles.caseJour}>
              <Panneau
                style={[styles.pastilleJour, trop && styles.jourInerte]}
                {...(trop ? {} : { onPress: () => onJour(jour) })}
              >
                <Txt variante="petit" centre ton={trop ? 'eteint' : 'normal'}>
                  {jour}
                </Txt>
              </Panneau>
            </View>
          );
        })}
      </View>

      {/* Le cas se produit pour qui n'a pas encore eu son anniversaire cette année-là. */}
      {!estEligible(ageA(dateIso(annee, mois, nombre), maintenant)) && (
        <>
          <Espace taille="m" />
          <Txt variante="petit" ton="adouci" centre>
            Sadfy commence à {AGE.MINIMUM} ans. Reviens le jour de ton anniversaire — on
            sera là.
          </Txt>
        </>
      )}
    </View>
  );
}

function Etiquette({
  valeur,
  actif,
  rempli,
  onPress,
}: {
  valeur: string;
  actif: boolean;
  rempli: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();

  return (
    <Panneau vif={actif} style={styles.etiquette} onPress={onPress}>
      <Txt variante="petit" centre ton={actif || rempli ? 'normal' : 'eteint'}>
        {valeur}
      </Txt>
    </Panneau>
  );
}

const useStyles = creerStyles(() =>
  StyleSheet.create({
    fil: { flexDirection: 'row', gap: espace.s },
    etiquette: { flex: 1, paddingVertical: espace.s, paddingHorizontal: espace.s },

    grilleAnnees: { flexDirection: 'row', flexWrap: 'wrap', gap: espace.s },
    jeton: { paddingVertical: espace.s, paddingHorizontal: espace.m, borderRadius: rayons.rond },

    grilleMois: { flexDirection: 'row', flexWrap: 'wrap', gap: espace.s },
    caseMois: { width: '31%', paddingVertical: espace.m, paddingHorizontal: espace.xs },

    semaine: { flexDirection: 'row' },
    grilleJours: { flexDirection: 'row', flexWrap: 'wrap', rowGap: espace.xs },
    caseJour: { width: `${100 / 7}%`, paddingHorizontal: 2 },
    pastilleJour: {
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
      borderRadius: rayons.m,
    },
    jourInerte: { opacity: 0.25 },
  }),
);
