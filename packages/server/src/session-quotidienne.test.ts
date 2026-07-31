import { describe, expect, it } from 'vitest';

import {
  POINTS,
  SEUILS_PALIERS,
  jourSadfy,
  type DuoId,
  type Question,
  type UserId,
} from '@sadfy/shared';

import {
  calculerRevelation,
  cloturerSession,
  jaimeAutorise,
  questionRecevable,
  tirerQuestions,
  type CritereTirage,
} from './session-quotidienne.js';

const DUO = 'duo-42' as DuoId;
const A = 'a' as UserId;
const B = 'b' as UserId;
const PARIS_ETE = 120;

function question(over: Partial<Question> = {}): Question {
  return {
    id: 'q1',
    texte: 'Sous la douche, tu es plutôt…',
    choix: ['concerts', 'disputes imaginaires', 'trois minutes chrono', 'jusqu\'à l\'eau froide'],
    tranches: [],
    vivier: 'les_deux',
    theme: 'habitudes',
    ...over,
  };
}

function critere(over: Partial<CritereTirage> = {}): CritereTirage {
  return {
    duoId: DUO,
    jour: 100,
    vivier: 'majeur',
    trancheA: '26-39',
    trancheB: '26-39',
    dejaPosees: new Set(),
    ...over,
  };
}

// ---------------------------------------------------------------------------

describe('tirage des questions', () => {
  it('cloisonne strictement mineurs et majeurs', () => {
    // Une question sur l'alcool ou la vie professionnelle n'a rien à faire devant un
    // joueur de 14 ans (§11.5 bis).
    const pourMajeurs = question({ vivier: 'majeur' });
    expect(questionRecevable(pourMajeurs, critere({ vivier: 'mineur' }))).toBe(false);
    expect(questionRecevable(pourMajeurs, critere({ vivier: 'majeur' }))).toBe(true);
  });

  it('laisse toujours passer le fonds universel', () => {
    // C'est lui qui fait la majorité du travail et qui évite six banques séparées.
    const universelle = question({ tranches: [] });
    expect(
      questionRecevable(universelle, critere({ trancheA: '18-25', trancheB: '56+' })),
    ).toBe(true);
  });

  it('ne tire une question ciblée que si elle parle aux deux', () => {
    const jeunes = question({ tranches: ['18-25'] });
    expect(questionRecevable(jeunes, critere({ trancheA: '18-25', trancheB: '18-25' }))).toBe(
      true,
    );
    expect(questionRecevable(jeunes, critere({ trancheA: '18-25', trancheB: '40-55' }))).toBe(
      false,
    );
  });

  it('ne repose jamais une question déjà posée au duo', () => {
    const q = question({ id: 'deja-vue' });
    expect(questionRecevable(q, critere({ dejaPosees: new Set(['deja-vue']) }))).toBe(false);
  });

  it('donne exactement la même liste aux deux appareils', () => {
    // Les questions étant asynchrones, les deux les tirent chacun de leur côté, à des
    // heures potentiellement très différentes : le tirage ne peut dépendre que du duo
    // et du jour.
    const banque = Array.from({ length: 40 }, (_, i) => question({ id: `q${i}` }));

    const cotéA = tirerQuestions(banque, critere());
    const cotéB = tirerQuestions(banque, critere());

    expect(cotéA.map((q) => q.id)).toEqual(cotéB.map((q) => q.id));
  });

  it('change de questions le lendemain', () => {
    const banque = Array.from({ length: 40 }, (_, i) => question({ id: `q${i}` }));
    const jour1 = tirerQuestions(banque, critere({ jour: 100 }));
    const jour2 = tirerQuestions(banque, critere({ jour: 101 }));
    expect(jour1.map((q) => q.id)).not.toEqual(jour2.map((q) => q.id));
  });

  it('tire entre 3 et 5 questions', () => {
    const banque = Array.from({ length: 40 }, (_, i) => question({ id: `q${i}` }));
    for (let jour = 0; jour < 30; jour += 1) {
      const tirees = tirerQuestions(banque, critere({ jour }));
      expect(tirees.length).toBeGreaterThanOrEqual(3);
      expect(tirees.length).toBeLessThanOrEqual(5);
    }
  });

  it('ne plante pas quand la banque est épuisée', () => {
    expect(tirerQuestions([], critere())).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe('révélation', () => {
  const reponses = {
    questions: ['q1', 'q2', 'q3'],
    parJoueur: {
      [A]: { q1: 0, q2: 1, q3: 2 },
      [B]: { q1: 0, q2: 3, q3: 2 },
    },
  };

  it('ne montre que le nombre au palier 1', () => {
    // Frustrant dans le bon sens : c'est ce qui donne envie de revenir demain (§11.5).
    const revelation = calculerRevelation(reponses, A, B, 0);

    expect(revelation.niveau).toBe('nombre_seul');
    expect(revelation.convergences).toBe(2);
    expect(revelation.total).toBe(3);
    expect(revelation.details).toEqual([]);
  });

  it('montre le détail à partir du palier 2', () => {
    const revelation = calculerRevelation(reponses, A, B, SEUILS_PALIERS.PARTENAIRE);

    expect(revelation.niveau).toBe('liste_detaillee');
    expect(revelation.details).toHaveLength(3);
    expect(revelation.details.filter((d) => d.identique)).toHaveLength(2);
  });

  it('n\'affiche le pourcentage qu\'au palier 3', () => {
    // Un « 34 % » au troisième jour se lit comme un verdict, et fait arrêter des gens
    // alors qu'il ne veut rien dire sur trois questions.
    const historique = { communes: 12, total: 20 };

    expect(calculerRevelation(reponses, A, B, 0, historique).pourcentage).toBeUndefined();
    expect(
      calculerRevelation(reponses, A, B, SEUILS_PALIERS.PARTENAIRE, historique).pourcentage,
    ).toBeUndefined();
    expect(
      calculerRevelation(reponses, A, B, SEUILS_PALIERS.EQUIPE, historique).pourcentage,
    ).toBe(60);
  });

  it('ignore les questions auxquelles un seul a répondu', () => {
    // Les réponses sont asynchrones : tant que l'autre n'a pas répondu, rien ne doit
    // fuiter de ce qu'il dira.
    const partielles = {
      questions: ['q1', 'q2'],
      parJoueur: { [A]: { q1: 0, q2: 1 }, [B]: { q1: 0 } },
    };
    const revelation = calculerRevelation(partielles, A, B, SEUILS_PALIERS.PARTENAIRE);

    expect(revelation.total).toBe(1);
    expect(revelation.details.map((d) => d.questionId)).toEqual(['q1']);
  });

  it('ne divulgue jamais la réponse de l\'autre au palier 1', () => {
    const charge = JSON.stringify(calculerRevelation(reponses, A, B, 0));
    expect(charge).not.toMatch(/"lui"/);
  });
});

// ---------------------------------------------------------------------------

describe('« j\'aime »', () => {
  it('en autorise deux, pas trois', () => {
    // Si on peut tout aimer, plus rien ne veut rien dire (§11.5).
    expect(jaimeAutorise(0)).toBe(true);
    expect(jaimeAutorise(1)).toBe(true);
    expect(jaimeAutorise(2)).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe('clôture de session', () => {
  const T = Date.parse('2026-07-31T18:00:00Z');
  const base = {
    pointsActuels: 0,
    derniereSessionJour: undefined,
    instant: T,
    offsetMinutes: PARIS_ETE,
    questionsCompletes: true,
    jeuJoue: true,
    jeuReussi: true,
    memeZone: false,
  };

  it('donne 100 points pour une session complète', () => {
    expect(cloturerSession(base).points).toBe(POINTS.SESSION_NOMINALE);
  });

  it('donne 40 points quand le duo n\'a jamais réussi à se synchroniser', () => {
    // C'est le choix qui décide si l'application fonctionne pour des gens occupés :
    // la relation ne doit pas mourir d'un problème d'agenda (§11.2).
    const bilan = cloturerSession({ ...base, jeuJoue: false, jeuReussi: false });
    expect(bilan.points).toBe(POINTS.QUESTIONS);
  });

  it('donne quand même des points quand la partie est perdue', () => {
    const perdue = cloturerSession({ ...base, jeuReussi: false });
    expect(perdue.points).toBeGreaterThan(POINTS.QUESTIONS);
    expect(perdue.points).toBeLessThan(POINTS.SESSION_NOMINALE);
  });

  it('applique le bonus de retrouvailles', () => {
    expect(cloturerSession({ ...base, memeZone: true }).points).toBe(150);
  });

  it('ne compte qu\'une session par jour, mais laisse rejouer', () => {
    const jour = jourSadfy(T, PARIS_ETE);
    const seconde = cloturerSession({ ...base, derniereSessionJour: jour });

    expect(seconde.compte).toBe(false);
    expect(seconde.points).toBe(0);
  });

  it('recompte le lendemain', () => {
    const jour = jourSadfy(T, PARIS_ETE);
    const lendemain = cloturerSession({ ...base, derniereSessionJour: jour - 1 });
    expect(lendemain.compte).toBe(true);
  });

  it('signale le franchissement d\'un palier', () => {
    const bilan = cloturerSession({ ...base, pointsActuels: SEUILS_PALIERS.PARTENAIRE - 50 });
    expect(bilan.nouveauPalier).toBe('partenaire');
  });

  it('ne signale rien quand on reste dans le même palier', () => {
    expect(cloturerSession({ ...base, pointsActuels: 0 }).nouveauPalier).toBeUndefined();
  });

  it('mène à l\'endgame en une dizaine de jours', () => {
    // Vérification de l'arc lui-même : 100 points par jour, 1000 points, dix jours.
    let points = 0;
    let jours = 0;
    while (points < SEUILS_PALIERS.DECISION && jours < 100) {
      points += cloturerSession({ ...base, pointsActuels: points }).points;
      jours += 1;
    }
    expect(jours).toBe(10);
  });
});
