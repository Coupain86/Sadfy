import { beforeEach, describe, expect, it } from 'vitest';

import {
  AGE,
  GEO,
  RECHERCHE,
  celluleEtVoisines,
  encoderCellule,
  type CelluleId,
  type UserId,
} from '@sadfy/shared';

import { SalleAppariement, type Evenement, type Inscrit } from './salle.js';

const uid = (s: string) => s as UserId;

/** Deux points parisiens, à quelques centaines de mètres l'un de l'autre. */
const EIFFEL = encoderCellule(48.8584, 2.2945);
const BIR_HAKEIM = encoderCellule(48.8554, 2.2895);
/** Marseille : hors de portée, même après élargissement maximal. */
const MARSEILLE = encoderCellule(43.2965, 5.3698);

function inscrit(id: string, cellule: CelluleId, over: Partial<Inscrit> = {}): Inscrit {
  return {
    userId: uid(id),
    cellule,
    cellules: celluleEtVoisines(cellule),
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

const T0 = Date.parse('2026-07-31T18:00:00Z');

function typesDe(evenements: readonly Evenement[]): string[] {
  return evenements.map((e) => e.type);
}

// ---------------------------------------------------------------------------

describe('salle d\'appariement', () => {
  let salle: SalleAppariement;

  beforeEach(() => {
    salle = new SalleAppariement();
    // Tirage déterministe : on prend toujours le premier jeu du catalogue restant.
    salle.configurer({ tirerJeu: (jeux) => jeux[0]! });
  });

  it('propose un seul candidat, jamais une liste', () => {
    // Une liste, c'est un catalogue : on serait revenu au balayage de profils (§7.3).
    salle.inscrire(inscrit('moi', EIFFEL, { genre: 'homme' }));
    salle.inscrire(inscrit('a', BIR_HAKEIM));
    salle.inscrire(inscrit('b', BIR_HAKEIM));
    salle.inscrire(inscrit('c', BIR_HAKEIM));

    salle.demarrerRecherche(uid('moi'), T0);
    const evenements = salle.tick(T0 + 100);

    const propositions = evenements.filter((e) => e.type === 'proposition_initiateur');
    expect(propositions).toHaveLength(1);
  });

  it('propose un jeu, pas une personne', () => {
    salle.inscrire(inscrit('moi', EIFFEL, { genre: 'homme' }));
    salle.inscrire(inscrit('elle', BIR_HAKEIM));

    salle.demarrerRecherche(uid('moi'), T0);
    const [proposition] = salle.tick(T0 + 100);

    expect(proposition?.type).toBe('proposition_initiateur');
    if (proposition?.type === 'proposition_initiateur') {
      // L'avatar est aléatoire et ne dit rien de l'autre ; c'est le jeu qui est
      // proposé, et c'est sur lui qu'on se décide (§7.4).
      expect(proposition.jeu).toBeDefined();
      expect(proposition.avatar).toBeTruthy();
    }
  });

  it('décliner relance le jeu, jamais la personne', () => {
    // Sans cette règle, décliner ferait défiler les candidats un par un.
    salle.inscrire(inscrit('moi', EIFFEL, { genre: 'homme' }));
    salle.inscrire(inscrit('elle', BIR_HAKEIM));
    salle.inscrire(inscrit('autre', BIR_HAKEIM));

    salle.demarrerRecherche(uid('moi'), T0);
    const [premiere] = salle.tick(T0 + 100);
    if (premiere?.type !== 'proposition_initiateur') throw new Error('proposition attendue');

    const suite = salle.declinerJeu(uid('moi'), premiere.propositionId, T0 + 200);
    const seconde = suite.find((e) => e.type === 'proposition_initiateur');

    expect(seconde).toBeDefined();
    if (seconde?.type === 'proposition_initiateur') {
      // Même personne, autre jeu.
      expect(seconde.avatar).toBe(premiere.avatar);
      expect(seconde.jeu).not.toBe(premiere.jeu);
    }
  });

  it('rend une cible retenue invisible aux autres, sans jamais dire « occupé »', () => {
    // a et b ne cherchent que des femmes : la seule candidate possible est « cible »,
    // ce qui isole le comportement testé.
    salle.inscrire(inscrit('a', EIFFEL, { genre: 'homme', filtreGenre: 'femmes' }));
    salle.inscrire(inscrit('b', EIFFEL, { genre: 'homme', filtreGenre: 'femmes' }));
    salle.inscrire(inscrit('cible', BIR_HAKEIM));

    salle.demarrerRecherche(uid('a'), T0);
    salle.tick(T0 + 100);

    salle.demarrerRecherche(uid('b'), T0 + 200);
    const pourB = salle.tick(T0 + 300);

    // b ne reçoit aucune proposition, et surtout aucun message négatif : il continue
    // simplement à scanner (§7.7).
    expect(typesDe(pourB)).not.toContain('proposition_initiateur');
    expect(typesDe(pourB)).toContain('scan');
  });

  it("n'annonce jamais un refus : la recherche continue, sans explication", () => {
    salle.inscrire(inscrit('moi', EIFFEL, { genre: 'homme' }));
    salle.inscrire(inscrit('elle', BIR_HAKEIM));

    salle.demarrerRecherche(uid('moi'), T0);
    const [proposition] = salle.tick(T0 + 100);
    if (proposition?.type !== 'proposition_initiateur') throw new Error('proposition attendue');

    salle.confirmerProposition(uid('moi'), proposition.propositionId, T0 + 200);

    // La cible ne répond jamais. À l'expiration, l'initiateur ne doit pas savoir si
    // elle a refusé ou si elle n'a rien vu (P5).
    const apres = salle.tick(T0 + 200 + RECHERCHE.DUREE_DEMANDE_MS + 1);
    expect(typesDe(apres)).toContain('recherche_continue');
    expect(JSON.stringify(apres)).not.toMatch(/refus/i);
  });

  it('laisse un constat neutre, jamais un reproche, si l\'initiateur ne revient pas', () => {
    salle.inscrire(inscrit('moi', EIFFEL, { genre: 'homme', joignable: false }));
    salle.inscrire(inscrit('elle', BIR_HAKEIM));

    salle.demarrerRecherche(uid('moi'), T0);
    const [proposition] = salle.tick(T0 + 100);
    if (proposition?.type !== 'proposition_initiateur') throw new Error('proposition attendue');

    salle.confirmerProposition(uid('moi'), proposition.propositionId, T0 + 200);
    salle.accepterProposition(uid('elle'), proposition.propositionId, T0 + 300);

    const apres = salle.tick(T0 + 300 + RECHERCHE.DELAI_RETOUR_INITIATEUR_MS + 1);
    const pourElle = apres.find((e) => e.type === 'plus_disponible');

    expect(pourElle).toBeDefined();
    expect(JSON.stringify(apres)).not.toMatch(/refus|abandon/i);
  });

  it('apparie les deux joueurs quand tout se passe bien', () => {
    salle.inscrire(inscrit('moi', EIFFEL, { genre: 'homme' }));
    salle.inscrire(inscrit('elle', BIR_HAKEIM));

    salle.demarrerRecherche(uid('moi'), T0);
    const [proposition] = salle.tick(T0 + 100);
    if (proposition?.type !== 'proposition_initiateur') throw new Error('proposition attendue');

    salle.confirmerProposition(uid('moi'), proposition.propositionId, T0 + 200);
    const resultat = salle.accepterProposition(uid('elle'), proposition.propositionId, T0 + 300);

    const apparies = resultat.find((e) => e.type === 'apparies');
    expect(apparies).toBeDefined();
    if (apparies?.type === 'apparies') {
      expect([apparies.a, apparies.b].sort()).toEqual([uid('elle'), uid('moi')].sort());
    }
  });

  it('note si la rencontre a lieu dans la même cellule', () => {
    // Sert au bonus de retrouvailles et à ancrer le point mystère de l'endgame.
    salle.inscrire(inscrit('moi', EIFFEL, { genre: 'homme' }));
    salle.inscrire(inscrit('elle', EIFFEL));

    salle.demarrerRecherche(uid('moi'), T0);
    const [proposition] = salle.tick(T0 + 100);
    if (proposition?.type !== 'proposition_initiateur') throw new Error('proposition attendue');

    salle.confirmerProposition(uid('moi'), proposition.propositionId, T0 + 200);
    const [apparies] = salle.accepterProposition(uid('elle'), proposition.propositionId, T0 + 300);

    if (apparies?.type !== 'apparies') throw new Error('appariement attendu');
    expect(apparies.memeCellule).toBe(true);
  });

  it('élargit le rayon visiblement, puis renonce plutôt que d\'aller trop loin', () => {
    salle.inscrire(inscrit('moi', EIFFEL, { genre: 'homme' }));
    salle.inscrire(inscrit('loin', MARSEILLE));

    salle.demarrerRecherche(uid('moi'), T0);

    const debut = salle.tick(T0 + 100);
    const milieu = salle.tick(T0 + GEO.DUREE_SCAN_MS / 2);

    const rayonDebut = debut.find((e) => e.type === 'scan');
    const rayonMilieu = milieu.find((e) => e.type === 'scan');
    if (rayonDebut?.type !== 'scan' || rayonMilieu?.type !== 'scan') {
      throw new Error('événements de scan attendus');
    }
    expect(rayonMilieu.rayonM).toBeGreaterThan(rayonDebut.rayonM);

    // Marseille reste hors de portée : mieux vaut « personne pour l'instant » qu'une
    // rencontre à 800 km, qui ne raconterait plus rien (§7.1).
    const fin = salle.tick(T0 + GEO.DUREE_SCAN_MS + 1);
    expect(typesDe(fin)).toContain('personne_trouvee');
  });

  it('respecte le cloisonnement des viviers', () => {
    salle.inscrire(inscrit('majeur', EIFFEL, { genre: 'homme' }));
    salle.inscrire(inscrit('mineur', BIR_HAKEIM, { age: 16, vivier: 'mineur' }));

    salle.demarrerRecherche(uid('majeur'), T0);
    expect(typesDe(salle.tick(T0 + 100))).not.toContain('proposition_initiateur');
  });

  it('respecte les filtres de genre dans les deux sens', () => {
    salle.inscrire(inscrit('moi', EIFFEL, { genre: 'femme', filtreGenre: 'hommes' }));
    salle.inscrire(inscrit('elle', BIR_HAKEIM, { genre: 'femme' }));

    salle.demarrerRecherche(uid('moi'), T0);
    expect(typesDe(salle.tick(T0 + 100))).not.toContain('proposition_initiateur');
  });

  it('ne réapparie jamais deux personnes déjà liées', () => {
    // Retrouver un partenaire connu passe par la notification de présence, pas par
    // le bouton « chercher », qui sert aux nouvelles rencontres (§7.7).
    salle.inscrire(
      inscrit('moi', EIFFEL, { genre: 'homme', relationsExistantes: [uid('elle')] }),
    );
    salle.inscrire(inscrit('elle', BIR_HAKEIM));

    salle.demarrerRecherche(uid('moi'), T0);
    expect(typesDe(salle.tick(T0 + 100))).not.toContain('proposition_initiateur');
  });

  it('ne propose personne à quelqu\'un qui a atteint son plafond de relations', () => {
    salle.inscrire(inscrit('plein', EIFFEL, { genre: 'homme', relationsActives: 4 }));
    salle.inscrire(inscrit('elle', BIR_HAKEIM));

    salle.demarrerRecherche(uid('plein'), T0);
    expect(typesDe(salle.tick(T0 + 100))).not.toContain('proposition_initiateur');
  });

  it('oublie tout quand un joueur se retire', () => {
    // Rien de ce qui vit dans la salle n'est écrit : position, âge, genre disparaissent.
    salle.inscrire(inscrit('moi', EIFFEL));
    expect(salle.inscrits).toBe(1);
    salle.retirer(uid('moi'));
    expect(salle.inscrits).toBe(0);
  });

  it('apparie deux personnes qui cherchent en même temps, sans laisser de recherche orpheline', () => {
    // Sans ça, deux personnes qui appuient sur « chercher » à la même seconde ne se
    // trouveraient jamais — ce qui serait absurde, et coûteux quand il y a peu de monde.
    salle.inscrire(inscrit('moi', EIFFEL, { genre: 'homme' }));
    salle.inscrire(inscrit('elle', BIR_HAKEIM));

    salle.demarrerRecherche(uid('moi'), T0);
    salle.demarrerRecherche(uid('elle'), T0);

    const [proposition] = salle.tick(T0 + 100);
    if (proposition?.type !== 'proposition_initiateur') throw new Error('proposition attendue');

    salle.confirmerProposition(proposition.pour, proposition.propositionId, T0 + 200);
    const cible = proposition.pour === uid('moi') ? uid('elle') : uid('moi');
    const resultat = salle.accepterProposition(cible, proposition.propositionId, T0 + 300);

    expect(typesDe(resultat)).toContain('apparies');
    // Les deux recherches doivent avoir disparu : plus aucun événement ensuite.
    expect(salle.tick(T0 + 400)).toHaveLength(0);
  });

  it('libère la cible quand la recherche est annulée', () => {
    salle.inscrire(inscrit('a', EIFFEL, { genre: 'homme', filtreGenre: 'femmes' }));
    salle.inscrire(inscrit('b', EIFFEL, { genre: 'homme', filtreGenre: 'femmes' }));
    salle.inscrire(inscrit('cible', BIR_HAKEIM));

    salle.demarrerRecherche(uid('a'), T0);
    salle.tick(T0 + 100);
    salle.annulerRecherche(uid('a'));

    salle.demarrerRecherche(uid('b'), T0 + 200);
    expect(typesDe(salle.tick(T0 + 300))).toContain('proposition_initiateur');
  });

  it('s\'arrête au lieu de tourner en rond quand tous les jeux ont été déclinés', () => {
    salle.inscrire(inscrit('moi', EIFFEL, { genre: 'homme' }));
    salle.inscrire(inscrit('elle', BIR_HAKEIM));

    salle.demarrerRecherche(uid('moi'), T0);
    let evenements = salle.tick(T0 + 100);

    // Le palier 1 débloque deux jeux : on les décline tous les deux.
    for (let essai = 0; essai < 5; essai += 1) {
      const proposition = evenements.find((e) => e.type === 'proposition_initiateur');
      if (proposition?.type !== 'proposition_initiateur') break;
      evenements = salle.declinerJeu(uid('moi'), proposition.propositionId, T0 + 200 + essai);
    }

    expect(typesDe(evenements)).toContain('personne_trouvee');
  });
});
