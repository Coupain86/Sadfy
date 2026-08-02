/**
 * Le mode test.
 *
 * Sadfy est **volontairement lent** : un jeu par jour, dix jours pour atteindre
 * l'endgame. C'est la bonne conception, et c'est exactement ce qui le rend impossible à
 * essayer — vérifier ce que donne le palier 3 demanderait d'attendre une semaine.
 *
 * Cet écran ne triche sur aucune règle. Les jeux se jouent vraiment, les points se
 * calculent avec la règle partagée, les paliers s'appliquent. Ce qu'il donne, c'est le
 * droit de **sauter l'attente** : lancer n'importe quel jeu sans tomber dessus par
 * hasard, poser un duo à un palier donné, et avancer la date d'un jour.
 *
 * Il n'apparaît **qu'en mode local**. Sans serveur, il n'y a personne à qui mentir : la
 * progression fabriquée ne vit que dans ce navigateur. Relié à un vrai serveur, ce
 * serait de la triche — donc l'écran n'existe pas.
 */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import {
  SEUILS_PALIERS,
  duoIdDe,
  encoderCellule,
  jourSadfy,
  palierPour,
  type DuoId,
  type JeuId,
  type Palier,
  type UserId,
} from '@sadfy/shared';

import { Bouton, Carte, Ecran, Espace, Txt, VoixMachine } from '../src/composants.js';
import { useMagasin } from '../src/etat.js';
import { ECRANS_JEUX, NOMS_JEUX } from '../src/jeux.js';
import {
  maintenantTest,
  modeTestDisponible,
  reglagesTest,
  reglerDecalageJours,
  surReglagesTest,
} from '../src/mode-test.js';
import { useServeur } from '../src/serveur.js';
import { DONNEES_VIERGES, majDuo, oublierDuo } from '../src/stockage.js';
import { support } from '../src/support.js';

/**
 * Le duo d'essai, quand il n'y en a aucun.
 *
 * Dès qu'une partie a été jouée, c'est **ce duo-là** que l'écran manipule plutôt que
 * d'en fabriquer un second : régler le palier d'une relation qu'on ne voit nulle part
 * ne servirait à rien.
 */
const PARTENAIRE_TEST = 'demo-partenaire' as UserId;
const MOI_TEST = 'demo-moi' as UserId;
const DUO_TEST: DuoId = duoIdDe(MOI_TEST, PARTENAIRE_TEST);

const PALIERS: readonly { readonly nom: string; readonly points: number }[] = [
  { nom: 'Le Fantôme', points: 0 },
  { nom: 'Le Partenaire', points: SEUILS_PALIERS.PARTENAIRE },
  { nom: "L'Équipe", points: SEUILS_PALIERS.EQUIPE },
  { nom: 'La Décision', points: SEUILS_PALIERS.DECISION },
];

const NOMS_PALIERS: Readonly<Record<Palier, string>> = {
  fantome: 'Le Fantôme',
  partenaire: 'Le Partenaire',
  equipe: "L'Équipe",
  decision: 'La Décision',
};

export default function ModeTest() {
  const { donnees, majDonnees } = useMagasin();
  const serveur = useServeur();
  const [decalage, setDecalage] = useState(reglagesTest().decalageJours);

  useEffect(() => surReglagesTest((r) => setDecalage(r.decalageJours)), []);

  if (!modeTestDisponible) {
    // Ne devrait jamais s'afficher : rien n'y mène quand un serveur est configuré.
    return (
      <Ecran>
        <Espace taille="xxl" />
        <Txt variante="titre">Indisponible</Txt>
        <Espace taille="m" />
        <Txt ton="adouci">
          Le mode test n'existe que sans serveur. Ici, la progression est réelle et
          partagée : la fabriquer serait tricher avec quelqu'un.
        </Txt>
        <Espace taille="l" />
        <Bouton titre="Retour" variante="discret" onPress={() => router.back()} />
      </Ecran>
    );
  }

  // Le duo réellement construit en jouant prime sur celui qu'on fabriquerait.
  const duo = donnees.duos[0];
  const cible: DuoId = duo?.duoId ?? DUO_TEST;
  const jour = jourSadfy(maintenantTest(), duo?.offsetMinutes ?? 0);

  async function poserDuo(points: number) {
    await majDonnees((d) =>
      majDuo(
        d,
        cible,
        (existant) => ({ ...existant, points, etat: 'active' }),
        () => ({
          duoId: cible,
          partenaire: PARTENAIRE_TEST,
          points,
          etat: 'active',
          rencontreLe: maintenantTest(),
          cellulePremiereRencontre: encoderCellule(48.8584, 2.2945),
          offsetMinutes: -new Date().getTimezoneOffset(),
          carnet: [],
        }),
      ),
    );
  }

  async function avancer(jours: number) {
    await reglerDecalageJours(support, reglagesTest().decalageJours + jours);
  }

  return (
    <Ecran defilant>
      <Espace taille="l" />
      <Txt variante="titre">Mode test</Txt>
      <Espace taille="s" />
      <Txt variante="petit" ton="adouci">
        Rien n'est truqué : les jeux se jouent vraiment et les points se calculent avec
        les vraies règles. Ce qu'on saute ici, c'est l'attente.
      </Txt>

      {/* ------------------------------------------------------------ les jeux */}
      <Espace taille="xl" />
      <Txt variante="sousTitre">Lancer un jeu</Txt>
      <Espace taille="xs" />
      <Txt variante="petit" ton="eteint">
        Contre un partenaire de complaisance, qui accepte tout et joue des coups
        plausibles. Il sert à parcourir les écrans, pas à jouer contre.
      </Txt>
      <Espace taille="m" />

      {(Object.keys(NOMS_JEUX) as JeuId[]).map((jeu) => (
        <View key={jeu}>
          <Bouton
            titre={NOMS_JEUX[jeu]}
            variante="secondaire"
            onPress={() => {
              serveur.testerJeu(jeu);
              router.push(ECRANS_JEUX[jeu]);
            }}
          />
          <Espace taille="s" />
        </View>
      ))}

      {/* ---------------------------------------------------------- le duo */}
      <Espace taille="l" />
      <Txt variante="sousTitre">Poser un duo à un palier</Txt>
      <Espace taille="xs" />
      <Txt variante="petit" ton="eteint">
        Ce que chaque palier débloque est décidé par la règle partagée, pas par cet
        écran : ce que tu verras est ce que verrait un vrai duo au même compteur.
      </Txt>
      <Espace taille="m" />

      {duo && (
        <>
          <Carte>
            <Txt variante="petit">
              Duo d'essai · {duo.points} points · {NOMS_PALIERS[palierPour(duo.points)]}
            </Txt>
            <Txt variante="minuscule" ton="eteint">
              jour {jour} · {duo.carnet.length} réponse
              {duo.carnet.length > 1 ? 's' : ''} au carnet
            </Txt>
          </Carte>
          <Espace taille="m" />
        </>
      )}

      {PALIERS.map((palier) => (
        <View key={palier.nom}>
          <Bouton
            titre={`${palier.nom} — ${palier.points} points`}
            variante="secondaire"
            onPress={() => void poserDuo(palier.points)}
          />
          <Espace taille="s" />
        </View>
      ))}

      <Espace taille="s" />
      <Bouton
        titre="Ouvrir la session du jour"
        onPress={() => router.push(`/duo/${cible}`)}
        desactive={!duo}
      />
      <Espace taille="s" />
      <Bouton
        titre="Ouvrir l'endgame"
        variante="secondaire"
        onPress={() => router.push('/endgame')}
      />

      {/* ---------------------------------------------------------- le temps */}
      <Espace taille="xl" />
      <Txt variante="sousTitre">Avancer dans le temps</Txt>
      <Espace taille="xs" />
      <Txt variante="petit" ton="eteint">
        Déplace la date pour l'application seulement — l'horloge de ton téléphone n'y
        touche pas. C'est ce qui permet de refaire une session « demain » tout de suite.
      </Txt>
      <Espace taille="m" />

      <Carte>
        <Txt variante="petit">
          {decalage === 0
            ? "Aujourd'hui"
            : `${decalage > 0 ? '+' : ''}${decalage} jour${Math.abs(decalage) > 1 ? 's' : ''}`}
        </Txt>
      </Carte>
      <Espace taille="m" />

      <Bouton titre="Un jour plus tard" onPress={() => void avancer(1)} />
      <Espace taille="s" />
      <Bouton titre="Un jour plus tôt" variante="secondaire" onPress={() => void avancer(-1)} />
      <Espace taille="s" />
      <Bouton
        titre="Revenir à aujourd'hui"
        variante="discret"
        onPress={() => void reglerDecalageJours(support, 0)}
      />

      {/* --------------------------------------------------------- remise à zéro */}
      <Espace taille="xl" />
      <VoixMachine>
        Tout ce qui se passe ici ne vit que dans ce navigateur. Personne d'autre ne voit
        rien, et rien n'est envoyé nulle part.
      </VoixMachine>
      <Espace taille="m" />

      <Bouton
        titre="Effacer le duo d'essai"
        variante="secondaire"
        onPress={() => void majDonnees((d) => oublierDuo(d, cible))}
      />
      <Espace taille="s" />
      {/* L'identité est conservée : la détruire n'apprendrait rien et obligerait à
          refaire l'inscription à chaque essai. */}
      <Bouton
        titre="Effacer tous les duos"
        variante="danger"
        onPress={() => void majDonnees((d) => ({ ...d, duos: DONNEES_VIERGES.duos }))}
      />

      <Espace taille="xl" />
      <Bouton titre="Retour" variante="discret" onPress={() => router.back()} />
      <Espace taille="xxl" />
    </Ecran>
  );
}
