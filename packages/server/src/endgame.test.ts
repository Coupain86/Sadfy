import { describe, expect, it } from 'vitest';

import { ENDGAME, JOUR, SEUILS_PALIERS, type UserId } from '@sadfy/shared';

import {
  creneauJourMemeAutorise,
  creneauxCommuns,
  grainePointMystere,
  lapinCompteDansLaFiabilite,
  optionsEndgame,
  peutOuvrir,
  peutRouvrir,
  pingAutoriseApresArret,
  quiOuvreLaDecision,
  resoudreTour,
  suiteApresLapin,
  type TourEndgame,
} from './endgame.js';

const A = 'a' as UserId;
const B = 'b' as UserId;
const T0 = Date.parse('2026-07-31T18:00:00Z');

function tour(over: Partial<TourEndgame> = {}): TourEndgame {
  return { a: A, b: B, genreA: 'femme', genreB: 'homme', graine: 1, ...over };
}

// ---------------------------------------------------------------------------

describe('ouverture de la Décision', () => {
  it('exige les 1000 points', () => {
    expect(peutOuvrir({ points: 999, tentatives: 0 }, T0)).toBe('points_insuffisants');
    expect(peutOuvrir({ points: SEUILS_PALIERS.DECISION, tentatives: 0 }, T0)).toBeNull();
  });

  it('impose sept jours entre deux tentatives', () => {
    // Sans ce verrou, celui qui veut se rencontrer pourrait reposer la question tous
    // les jours à celui qui ne veut pas : une machine à pression (§13.1).
    const etat = { points: 1_000, tentatives: 1, derniereTentativeLe: T0 };
    expect(peutOuvrir(etat, T0 + 6 * JOUR)).toBe('delai_de_latence');
    expect(peutOuvrir(etat, T0 + 8 * JOUR)).toBeNull();
  });

  it('cesse de proposer après trois tentatives', () => {
    expect(
      peutOuvrir({ points: 1_000, tentatives: ENDGAME.TENTATIVES_MAX }, T0 + 100 * JOUR),
    ).toBe('trop_de_tentatives');
  });
});

// ---------------------------------------------------------------------------

describe('résolution d\'un tour', () => {
  it('conclut un accord quand les deux veulent la même chose', () => {
    const r = resoudreTour(tour({ choixA: 'rencontre', choixB: 'rencontre' }));
    expect(r).toEqual({ type: 'accord', sur: 'rencontre' });
  });

  it('révèle les préférences divergentes', () => {
    // Ce n'est pas un rejet : les deux veulent continuer, ils ne s'accordent pas sur
    // la forme. Le révéler est ce qui rend le second tour possible (§13.2).
    const r = resoudreTour(tour({ choixA: 'rencontre', choixB: 'reseaux' }));
    expect(r.type).toBe('divergence');
    if (r.type === 'divergence') {
      expect(r.choixA).toBe('rencontre');
      expect(r.choixB).toBe('reseaux');
    }
  });

  it('attend sans rien dire tant qu\'un seul a répondu', () => {
    expect(resoudreTour(tour({ choixA: 'rencontre' })).type).toBe('en_attente');
  });

  it('détecte le Cadeau des rois mages', () => {
    // Les deux ont changé d'avis : chacun a cédé pour faire plaisir à l'autre. C'est
    // le meilleur signal de bonne foi mutuelle observable (§13.4).
    const r = resoudreTour(
      tour({
        precedentA: 'rencontre',
        precedentB: 'reseaux',
        choixA: 'reseaux',
        choixB: 'rencontre',
      }),
    );
    expect(r.type).toBe('double_retournement');
  });

  it('ne confond pas un seul changement d\'avis avec un double retournement', () => {
    const r = resoudreTour(
      tour({
        precedentA: 'rencontre',
        precedentB: 'reseaux',
        choixA: 'reseaux',
        choixB: 'reseaux',
      }),
    );
    expect(r.type).toBe('accord');
  });

  it('fait primer un arrêt sur tout le reste', () => {
    // Celui qui a demandé à arrêter n'a pas à attendre la réponse de l'autre.
    const r = resoudreTour(tour({ choixA: 'en_rester_la', motifA: 'pas_pret' }));
    expect(r).toEqual({ type: 'arret', par: A, motif: 'pas_pret' });
  });
});

// ---------------------------------------------------------------------------

describe('qui ouvre la Décision', () => {
  it('donne la priorité à la femme dans un duo homme-femme', () => {
    // Règle à annoncer dans l'application, pas à cacher : le public le plus difficile
    // à convaincre sur une application de rencontre, ce sont les femmes (§13.4).
    expect(quiOuvreLaDecision({ a: A, b: B, genreA: 'femme', genreB: 'homme', graine: 1 })).toBe(A);
    expect(quiOuvreLaDecision({ a: A, b: B, genreA: 'homme', genreB: 'femme', graine: 1 })).toBe(B);
  });

  it('tire au sort dans tous les autres cas', () => {
    const memeSexe = { a: A, b: B, genreA: 'homme' as const, genreB: 'homme' as const };
    expect([A, B]).toContain(quiOuvreLaDecision({ ...memeSexe, graine: 2 }));

    const nonBinaire = { a: A, b: B, genreA: 'autre' as const, genreB: 'femme' as const };
    // Une seule femme déclarée : elle ouvre.
    expect(quiOuvreLaDecision({ ...nonBinaire, graine: 1 })).toBe(B);
  });

  it('tire au sort de façon reproductible, donc non manipulable', () => {
    // Sinon on pourrait relancer jusqu'à obtenir le résultat voulu.
    const t = { a: A, b: B, genreA: 'homme' as const, genreB: 'homme' as const, graine: 7 };
    expect(quiOuvreLaDecision(t)).toBe(quiOuvreLaDecision(t));
  });
});

// ---------------------------------------------------------------------------

describe('l\'arrêt', () => {
  const arret = { par: A } as const;

  it('n\'est réouvrable que par celui qui a arrêté', () => {
    // Si l'autre pouvait relancer, on transformerait un refus en négociation, donc en
    // pression (§13.3).
    expect(peutRouvrir(arret, A)).toBe(true);
    expect(peutRouvrir(arret, B)).toBe(false);
  });

  it('désactive le ping dans le sens de celui qui n\'a pas décidé', () => {
    expect(pingAutoriseApresArret(arret, A)).toBe(true);
    expect(pingAutoriseApresArret(arret, B)).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe('le rendez-vous', () => {
  it('calcule l\'intersection des disponibilités', () => {
    // Caler un rendez-vous sans texte libre pousserait vers Instagram par simple
    // friction administrative — ce qui tuerait la fonctionnalité (§13.5).
    expect(creneauxCommuns([1, 3, 5, 7], [3, 4, 7, 9])).toEqual([3, 7]);
  });

  it('ne renvoie rien quand aucun créneau ne coïncide', () => {
    expect(creneauxCommuns([1, 2], [3, 4])).toEqual([]);
  });

  it('n\'autorise le jour même que si les deux sont dispo pour de vrai', () => {
    expect(creneauJourMemeAutorise('dispo_pour_de_vrai', 'dispo_pour_de_vrai')).toBe(true);
    expect(creneauJourMemeAutorise('dispo_pour_de_vrai', 'pose')).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe('le lapin', () => {
  it('laisse celui qui est venu décider', () => {
    expect(suiteApresLapin({ duoLapins: 0, explique: true }, 'reproposer')).toBe('reproposer');
    expect(suiteApresLapin({ duoLapins: 0, explique: true }, 'en_rester_la')).toBe(
      'en_rester_la',
    );
  });

  it('ferme l\'option après deux lapins', () => {
    // Sans plafond, on peut faire attendre quelqu'un indéfiniment dans un café.
    expect(
      suiteApresLapin({ duoLapins: ENDGAME.LAPINS_AVANT_FERMETURE, explique: true }, 'reproposer'),
    ).toBe('option_fermee');
  });

  it('ne compte pas un lapin expliqué contre son auteur', () => {
    // Un lapin n'est pas toujours volontaire : traiter tout le monde comme coupable
    // serait injuste (§13.5 bis).
    expect(lapinCompteDansLaFiabilite({ duoLapins: 1, explique: true })).toBe(false);
    expect(lapinCompteDansLaFiabilite({ duoLapins: 1, explique: false })).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe('le point mystère et les mineurs', () => {
  it('donne aux deux appareils la même graine, sans passer par le serveur', () => {
    // Le tirage se fait sur les téléphones : écrire la cellule en base aurait été une
    // position permanente pour chaque relation.
    expect(grainePointMystere('duo-42')).toBe(grainePointMystere('duo-42'));
    expect(grainePointMystere('duo-42')).not.toBe(grainePointMystere('duo-43'));
  });

  it('n\'offre aux mineurs ni rencontre ni échange de réseaux', () => {
    // Pour les adultes, l'application organise une rencontre ; pour les mineurs, elle
    // donne seulement un moyen de se reconnaître (§13.7).
    const mineurs = optionsEndgame('mineur');
    expect(mineurs).not.toContain('rencontre');
    expect(mineurs).not.toContain('reseaux');
    expect(mineurs).toContain('continuer_a_jouer');
  });

  it('offre les quatre options aux majeurs', () => {
    expect(optionsEndgame('majeur')).toHaveLength(4);
  });
});
