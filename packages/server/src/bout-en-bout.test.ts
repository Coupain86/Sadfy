import { describe, expect, it } from 'vitest';

import {
  AGE,
  celluleEtVoisines,
  encoderCellule,
  type UserId,
} from '@sadfy/shared';

import { PartiesVives } from './parties-vives.js';
import { SalleAppariement, type Evenement, type Inscrit } from './salle.js';

/**
 * Le parcours complet, de la recherche à la fin de partie.
 *
 * Les tests précédents vérifient chaque pièce isolément. Celui-ci vérifie **qu'elles se
 * parlent** — c'est-à-dire précisément ce qui manquait avant le raccordement : la salle
 * produisait des duos, le moteur savait faire jouer, et rien ne reliait les deux.
 */

const ALICE = 'alice' as UserId;
const BOB = 'bob' as UserId;
const T0 = Date.parse('2026-07-31T18:00:00Z');
const EIFFEL = encoderCellule(48.8584, 2.2945);

function inscrit(id: UserId, over: Partial<Inscrit> = {}): Inscrit {
  return {
    userId: id,
    cellule: EIFFEL,
    cellules: celluleEtVoisines(EIFFEL),
    age: 30,
    vivier: 'majeur',
    genre: 'femme',
    filtreGenre: 'peu_importe',
    ecartAgeMax: AGE.ECART_DEFAUT_MAJEUR,
    relationsExistantes: [],
    bloques: [],
    relationsActives: 0,
    scoreFiabilite: 1,
    exclu: false,
    palier: 'fantome',
    joignable: true,
    ...over,
  };
}

/** Rejoue le parcours jusqu'au démarrage effectif de la partie. */
function jusquALaPartie() {
  const salle = new SalleAppariement();
  const parties = new PartiesVives();
  salle.configurer({ tirerJeu: () => 'la_scie' });

  salle.inscrire(inscrit(ALICE, { genre: 'femme' }));
  salle.inscrire(inscrit(BOB, { genre: 'homme' }));

  salle.demarrerRecherche(ALICE, T0);
  const [proposition] = salle.tick(T0 + 100);
  if (proposition?.type !== 'proposition_initiateur') throw new Error('proposition attendue');

  salle.confirmerProposition(ALICE, proposition.propositionId, T0 + 200);
  const resultat = salle.accepterProposition(BOB, proposition.propositionId, T0 + 300);

  const apparies = resultat.find((e): e is Extract<Evenement, { type: 'apparies' }> =>
    e.type === 'apparies',
  );
  if (!apparies) throw new Error('appariement attendu');

  const debut = parties.demarrer(
    'p1',
    [apparies.a, apparies.b],
    apparies.jeu,
    1,
    T0 + 300,
    apparies.memeCellule,
  );

  return { salle, parties, debut };
}

describe('parcours complet', () => {
  it('mène de la recherche à une partie réellement démarrée', () => {
    const { parties, debut } = jusquALaPartie();

    // Les deux ont reçu leur briefing et leur vue : la partie existe vraiment.
    expect(debut.filter((e) => e.type === 'briefing')).toHaveLength(2);
    expect(debut.filter((e) => e.type === 'vue')).toHaveLength(2);
    expect(parties.nombre).toBe(1);
  });

  it('donne à chaque joueur une vue qui lui est propre', () => {
    const { debut } = jusquALaPartie();

    const vues = debut.filter((e) => e.type === 'vue');
    const pourAlice = vues.find((e) => e.pour === ALICE);
    const pourBob = vues.find((e) => e.pour === BOB);

    expect(pourAlice).toBeDefined();
    expect(pourBob).toBeDefined();
    // Même sur un jeu symétrique, chacun reçoit sa propre projection — « est-ce mon
    // tour » diffère, et c'est le serveur qui le décide.
    expect(pourAlice).not.toEqual(pourBob);
  });

  it('accepte les coups et termine la partie', () => {
    const { parties } = jusquALaPartie();

    let t = T0 + 1_000;
    let dernier: readonly unknown[] = [];
    for (let i = 0; i < 12; i += 1) {
      t += 1_000;
      dernier = parties.agir(i % 2 === 0 ? ALICE : BOB, { type: 'tirer' }, t);
    }

    expect(dernier.length).toBeGreaterThan(0);
    // La partie s'est terminée et a libéré ses joueurs.
    expect(parties.partieDe(ALICE)).toBeUndefined();
  });

  it("survit à une coupure réseau au milieu d'une partie", () => {
    // Le métro : la partie doit attendre, pas mourir.
    const { parties } = jusquALaPartie();

    parties.agir(ALICE, { type: 'tirer' }, T0 + 1_000);
    const coupure = parties.deconnecter(BOB, T0 + 2_000);
    expect(coupure.some((e) => e.type === 'partenaire_deconnecte')).toBe(true);

    const retour = parties.reconnecter(BOB, T0 + 3_000);
    expect(retour.some((e) => e.type === 'vue')).toBe(true);
    // Et la partie est toujours là.
    expect(parties.partieDe(BOB)).toBe('p1');
  });

  it('ne laisse jamais fuiter une vue vers le mauvais joueur', () => {
    // Chaque événement porte un destinataire unique. C'est ce qui permet à la couche
    // réseau de se contenter de traduire, sans jamais avoir à filtrer.
    const { debut } = jusquALaPartie();

    for (const evenement of debut) {
      expect([ALICE, BOB]).toContain((evenement as { pour: UserId }).pour);
    }
  });

  it('ne réapparie jamais deux joueurs déjà liés', () => {
    // Retrouver un partenaire connu passe par la notification de présence, pas par le
    // bouton « chercher » (§7.7).
    const salle = new SalleAppariement();
    salle.inscrire(inscrit(ALICE, { genre: 'femme', relationsExistantes: [BOB] }));
    salle.inscrire(inscrit(BOB, { genre: 'homme' }));

    salle.demarrerRecherche(ALICE, T0);
    const evenements = salle.tick(T0 + 100);
    expect(evenements.map((e) => e.type)).not.toContain('proposition_initiateur');
  });
});
