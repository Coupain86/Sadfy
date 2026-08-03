import { describe, expect, it } from 'vitest';

import { ageA, estEligible } from '@sadfy/shared';

import { dateEnClair, dateIso, joursDuMois, premierJourSemaine } from './dates.js';

/**
 * Le calendrier de la date de naissance.
 *
 * Il porte la règle la plus sensible du produit : c'est de cette date que dépend le
 * cloisonnement mineurs/majeurs. Une erreur d'un jour ici met un mineur en face d'un
 * majeur — ce que tout le reste du produit existe pour empêcher (§5.4).
 */
describe('longueur des mois', () => {
  it('donne le bon nombre de jours', () => {
    expect(joursDuMois(2003, 0)).toBe(31); // janvier
    expect(joursDuMois(2003, 3)).toBe(30); // avril
    expect(joursDuMois(2003, 11)).toBe(31); // décembre
  });

  it('compte le 29 février des années bissextiles', () => {
    // Sans ça, personne né un 29 février ne peut renseigner sa date.
    expect(joursDuMois(2004, 1)).toBe(29);
    expect(joursDuMois(2003, 1)).toBe(28);
  });

  it('applique la règle séculaire', () => {
    // 1900 n'est pas bissextile, 2000 l'est. Une formule naïve se trompe sur les deux.
    expect(joursDuMois(1900, 1)).toBe(28);
    expect(joursDuMois(2000, 1)).toBe(29);
  });
});

describe('alignement de la grille', () => {
  it('fait commencer la semaine un lundi', () => {
    // Le 1er janvier 2024 était un lundi : première colonne, aucun décalage.
    expect(premierJourSemaine(2024, 0)).toBe(0);
    // Le 1er septembre 2024 était un dimanche : dernière colonne.
    expect(premierJourSemaine(2024, 8)).toBe(6);
  });

  it('ne décale jamais de plus de six cases', () => {
    for (let mois = 0; mois < 12; mois += 1) {
      const decalage = premierJourSemaine(2003, mois);
      expect(decalage).toBeGreaterThanOrEqual(0);
      expect(decalage).toBeLessThanOrEqual(6);
    }
  });
});

describe('la date produite', () => {
  it('est au format que le noyau partagé sait lire', () => {
    expect(dateIso(1996, 2, 5)).toBe('1996-03-05');
    expect(dateIso(2003, 11, 25)).toBe('2003-12-25');
  });

  it('donne le bon âge le jour de l\'anniversaire, et pas la veille', () => {
    const veille = Date.parse('2026-03-14T12:00:00Z');
    const jour = Date.parse('2026-03-15T12:00:00Z');

    expect(ageA(dateIso(2013, 2, 15), veille)).toBe(12);
    expect(ageA(dateIso(2013, 2, 15), jour)).toBe(13);
  });

  it('empêche exactement ce que l\'année seule laissait passer', () => {
    // Quelqu'un né le 20 décembre 2008, le 1er juin 2026 : il a 17 ans, il est mineur.
    // Avec l'année seule — donc un 1er janvier supposé — on lui en comptait 18, et il
    // basculait dans le vivier majeur six mois trop tôt (§5.4).
    const juin2026 = Date.parse('2026-06-01T12:00:00Z');

    expect(ageA(dateIso(2008, 11, 20), juin2026)).toBe(17);
    expect(ageA('2008-01-01', juin2026)).toBe(18);
  });

  it('reste inéligible tant que les treize ans ne sont pas atteints', () => {
    const maintenant = Date.parse('2026-08-03T12:00:00Z');
    expect(estEligible(ageA(dateIso(2013, 11, 25), maintenant))).toBe(false);
    expect(estEligible(ageA(dateIso(2013, 0, 25), maintenant))).toBe(true);
  });

  it('se relit en français', () => {
    expect(dateEnClair('1996-03-05')).toBe('5 mars 1996');
  });
});
