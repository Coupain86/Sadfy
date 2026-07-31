import { describe, expect, it } from 'vitest';

import { AGE, GEO, POINTS, RELATIONS, SEUILS_PALIERS } from './constants.js';
import { ageA, ecartMaxAutorise, ecartPresente, trancheDe, vivierDe } from './age.js';
import {
  jeuxDisponibles,
  niveauRevelation,
  palierPour,
  passionsVisibles,
  pointsAvantPalierSuivant,
  pointsSession,
  pseudoVisible,
} from './paliers.js';
import { graineSession, jourSadfy, nombreQuestions, sessionCompte } from './session.js';
import {
  classerCandidats,
  filtreAccepte,
  raisonsIncompatibilite,
  rayonCourantM,
  type CandidatRecherche,
} from './matching.js';
import { MESSAGES_INTERDITS } from './protocol.js';
import { migrerStockage, verifierProtocole, VERSION_STOCKAGE_LOCAL } from './version.js';
import type { CelluleId, UserId } from './types.js';

const uid = (s: string) => s as UserId;
const cell = (s: string) => s as CelluleId;

function candidat(over: Partial<CandidatRecherche> = {}): CandidatRecherche {
  return {
    userId: uid('a'),
    cellule: cell('u09tvw'),
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
    ...over,
  };
}

// ---------------------------------------------------------------------------

describe('âge', () => {
  it('calcule les années révolues, anniversaire non atteint compris', () => {
    const ref = Date.parse('2026-07-31T12:00:00Z');
    expect(ageA('2000-07-30', ref)).toBe(26);
    expect(ageA('2000-07-31', ref)).toBe(26);
    expect(ageA('2000-08-01', ref)).toBe(25);
  });

  it('range dans les tranches et refuse en dessous du minimum', () => {
    expect(trancheDe(12)).toBeNull();
    expect(trancheDe(13)).toBe('13-15');
    expect(trancheDe(17)).toBe('16-17');
    expect(trancheDe(18)).toBe('18-25');
    expect(trancheDe(40)).toBe('40-55');
    expect(trancheDe(91)).toBe('56+');
  });

  it('sépare les viviers à 18 ans', () => {
    expect(vivierDe(17)).toBe('mineur');
    expect(vivierDe(18)).toBe('majeur');
  });

  it("impose 2 ans d'écart chez les mineurs, sans tenir compte du réglage", () => {
    // C'est la correction du point C5 de la revue : le défaut majeur de 15 ans
    // autoriserait un appariement 13/17, considérable à cet âge.
    expect(ecartMaxAutorise('mineur', 15)).toBe(AGE.ECART_MAX_MINEUR);
    expect(ecartMaxAutorise('mineur', 99)).toBe(AGE.ECART_MAX_MINEUR);
    expect(ecartMaxAutorise('majeur', 15)).toBe(15);
  });

  it("révèle l'écart avec son sens, jamais l'âge exact", () => {
    // Cacher le sens protégerait le plus âgé au détriment du plus jeune (§11.7).
    expect(ecartPresente(19, 44)).toEqual({ tranche: 'plus_20', sens: 'plus_age' });
    expect(ecartPresente(44, 19)).toEqual({ tranche: 'plus_20', sens: 'plus_jeune' });
    expect(ecartPresente(30, 32)).toEqual({ tranche: 'moins_5', sens: 'plus_age' });
    expect(ecartPresente(30, 30)).toEqual({ tranche: 'moins_5', sens: 'meme_age' });
  });
});

// ---------------------------------------------------------------------------

describe('paliers', () => {
  it('suit les seuils de la spec', () => {
    expect(palierPour(0)).toBe('fantome');
    expect(palierPour(SEUILS_PALIERS.PARTENAIRE - 1)).toBe('fantome');
    expect(palierPour(SEUILS_PALIERS.PARTENAIRE)).toBe('partenaire');
    expect(palierPour(SEUILS_PALIERS.EQUIPE)).toBe('equipe');
    expect(palierPour(SEUILS_PALIERS.DECISION)).toBe('decision');
    expect(palierPour(5_000)).toBe('decision');
  });

  it('ne révèle que le nombre au palier 1', () => {
    expect(niveauRevelation('fantome')).toBe('nombre_seul');
    expect(niveauRevelation('partenaire')).toBe('liste_detaillee');
    expect(niveauRevelation('equipe')).toBe('liste_et_pourcentage');
  });

  it('échelonne la révélation du profil', () => {
    expect(pseudoVisible('fantome')).toBe(false);
    expect(pseudoVisible('partenaire')).toBe(true);
    expect(passionsVisibles('partenaire')).toBe(false);
    expect(passionsVisibles('equipe')).toBe(true);
  });

  it('débloque deux jeux symétriques au palier 1, puis cumule', () => {
    // On apprend l'application avant d'apprendre l'asymétrie (§15.2).
    expect(jeuxDisponibles('fantome')).toEqual(['blind_match', 'la_scie']);
    expect(jeuxDisponibles('partenaire')).toHaveLength(4);
    expect(jeuxDisponibles('equipe')).toContain('convergence');
    // Convergence est délibérément tardif : il faut savoir comment l'autre pense.
    expect(jeuxDisponibles('fantome')).not.toContain('convergence');
  });

  it('a toujours au moins deux jeux à proposer, même au premier jour', () => {
    // Correction du point B2 de la revue : « 5 jeux au choix » était impossible à tenir.
    expect(jeuxDisponibles('fantome').length).toBeGreaterThanOrEqual(2);
  });

  it('donne des points même quand la partie est perdue', () => {
    // Le compteur mesure le temps passé ensemble, pas la performance (§10.4).
    const perdue = pointsSession({
      questionsCompletes: true,
      jeuJoue: true,
      jeuReussi: false,
      memeZone: false,
    });
    expect(perdue).toBeGreaterThan(POINTS.QUESTIONS);
    expect(perdue).toBeLessThan(POINTS.SESSION_NOMINALE);
  });

  it('applique le multiplicateur de retrouvailles', () => {
    const normale = pointsSession({
      questionsCompletes: true,
      jeuJoue: true,
      jeuReussi: true,
      memeZone: false,
    });
    const memeZone = pointsSession({
      questionsCompletes: true,
      jeuJoue: true,
      jeuReussi: true,
      memeZone: true,
    });
    expect(normale).toBe(POINTS.SESSION_NOMINALE);
    expect(memeZone).toBe(150);
  });

  it('permet de progresser sans jamais réussir à se synchroniser', () => {
    // §11.2 : la relation ne doit pas mourir d'un problème d'emploi du temps.
    const questionsSeules = pointsSession({
      questionsCompletes: true,
      jeuJoue: false,
      jeuReussi: false,
      memeZone: false,
    });
    expect(questionsSeules).toBe(POINTS.QUESTIONS);
    const jours = Math.ceil(SEUILS_PALIERS.DECISION / questionsSeules);
    expect(jours).toBe(25); // ~25 jours au lieu de 10, mais l'arc aboutit.
  });

  it('annonce ce qui reste avant le palier suivant', () => {
    expect(pointsAvantPalierSuivant(0)).toBe(SEUILS_PALIERS.PARTENAIRE);
    expect(pointsAvantPalierSuivant(999)).toBe(1);
    expect(pointsAvantPalierSuivant(1_000)).toBeNull();
  });
});

// ---------------------------------------------------------------------------

describe('journée Sadfy', () => {
  const PARIS_ETE = 120;

  it('rattache une session tardive à la veille', () => {
    const avantMinuit = Date.parse('2026-07-31T23:50:00Z'); // 01h50 le 1er, heure locale
    const apresMinuit = Date.parse('2026-08-01T00:10:00Z'); // 02h10 le 1er, heure locale
    expect(jourSadfy(avantMinuit, PARIS_ETE)).toBe(jourSadfy(apresMinuit, PARIS_ETE));
  });

  it('empêche de gagner deux jours de progression en encadrant minuit', () => {
    // Point C2 de la revue. Sans la bascule à 4 h, ces deux sessions auraient compté
    // pour deux journées distinctes, à vingt minutes d'intervalle.
    const jour = jourSadfy(Date.parse('2026-07-31T23:50:00Z'), PARIS_ETE);
    expect(sessionCompte(undefined, jour)).toBe(true);
    expect(sessionCompte(jour, jourSadfy(Date.parse('2026-08-01T00:10:00Z'), PARIS_ETE))).toBe(
      false,
    );
  });

  it('bascule bien après 4 h locales', () => {
    const veille = jourSadfy(Date.parse('2026-08-01T01:00:00Z'), PARIS_ETE); // 03h locale
    const lendemain = jourSadfy(Date.parse('2026-08-01T03:00:00Z'), PARIS_ETE); // 05h locale
    expect(lendemain).toBe(veille + 1);
  });

  it('laisse rejouer, mais ne compte qu\'une session par jour', () => {
    // On ne limite pas le jeu, on limite la progression (§11.3).
    const jour = 100;
    expect(sessionCompte(undefined, jour)).toBe(true);
    expect(sessionCompte(jour, jour)).toBe(false);
    expect(sessionCompte(jour, jour + 1)).toBe(true);
  });

  it('tire les mêmes questions pour les deux joueurs, sans synchronisation', () => {
    // Les questions étant asynchrones, le tirage ne peut dépendre que de (duo, jour).
    const a = graineSession('duo-42', 100);
    const b = graineSession('duo-42', 100);
    expect(a).toBe(b);
    expect(graineSession('duo-42', 101)).not.toBe(a);
    expect(nombreQuestions(a)).toBeGreaterThanOrEqual(3);
    expect(nombreQuestions(a)).toBeLessThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------

describe('appariement', () => {
  it('ne mélange jamais les viviers', () => {
    const mineur = candidat({ userId: uid('m'), age: 16, vivier: 'mineur' });
    const majeur = candidat({ userId: uid('M'), age: 30, vivier: 'majeur' });
    expect(raisonsIncompatibilite(mineur, majeur)).toContain('vivier_different');
  });

  it('refuse un 13/17 même si le réglage est large', () => {
    const jeune = candidat({ userId: uid('j'), age: 13, vivier: 'mineur', ecartAgeMax: 15 });
    const grand = candidat({ userId: uid('g'), age: 17, vivier: 'mineur', ecartAgeMax: 15 });
    expect(raisonsIncompatibilite(jeune, grand)).toContain('ecart_age_trop_grand');
  });

  it('accepte deux mineurs du même âge scolaire', () => {
    const a = candidat({ userId: uid('a'), age: 15, vivier: 'mineur', genre: 'femme' });
    const b = candidat({ userId: uid('b'), age: 16, vivier: 'mineur', genre: 'homme' });
    expect(raisonsIncompatibilite(a, b)).toEqual([]);
  });

  it('applique les filtres de genre dans les deux sens', () => {
    const a = candidat({ userId: uid('a'), genre: 'femme', filtreGenre: 'hommes' });
    const b = candidat({ userId: uid('b'), genre: 'femme', filtreGenre: 'peu_importe' });
    expect(raisonsIncompatibilite(a, b)).toContain('filtre_genre');

    const c = candidat({ userId: uid('c'), genre: 'homme', filtreGenre: 'peu_importe' });
    expect(raisonsIncompatibilite(a, c)).toEqual([]);
  });

  it('retient le plus contraignant des deux écarts', () => {
    const strict = candidat({ userId: uid('s'), age: 30, ecartAgeMax: 2 });
    const large = candidat({ userId: uid('l'), age: 40, ecartAgeMax: 30 });
    expect(raisonsIncompatibilite(strict, large)).toContain('ecart_age_trop_grand');
  });

  it('respecte les blocages dans les deux sens', () => {
    const a = candidat({ userId: uid('a') });
    const b = candidat({ userId: uid('b'), bloques: [uid('a')] });
    expect(raisonsIncompatibilite(a, b)).toContain('bloque');
  });

  it('ne propose personne à quelqu\'un au plafond', () => {
    const plein = candidat({ userId: uid('p'), relationsActives: RELATIONS.PLAFOND_ACTIVES });
    const autre = candidat({ userId: uid('o') });
    expect(raisonsIncompatibilite(plein, autre)).toContain('plafond_atteint');
  });

  it('classe par distance, puis par fiabilité', () => {
    const demandeur = candidat({ userId: uid('d'), cellule: cell('c0') });
    const loin = candidat({ userId: uid('loin'), cellule: cell('c9'), genre: 'homme' });
    const proche = candidat({ userId: uid('proche'), cellule: cell('c1'), genre: 'homme' });
    const distance = (_a: CelluleId, b: CelluleId) => (b === cell('c1') ? 100 : 5_000);

    const classe = classerCandidats(demandeur, [loin, proche], distance);
    expect(classe.map((c) => c.userId)).toEqual([uid('proche'), uid('loin')]);
  });

  it('élargit le rayon avec le temps, sans dépasser le plafond', () => {
    const paliers = [...GEO.PALIERS_ELARGISSEMENT_M];
    expect(rayonCourantM(paliers, 0, GEO.DUREE_SCAN_MS)).toBe(1_000);
    expect(rayonCourantM(paliers, GEO.DUREE_SCAN_MS, GEO.DUREE_SCAN_MS)).toBe(20_000);
    expect(rayonCourantM(paliers, GEO.DUREE_SCAN_MS * 10, GEO.DUREE_SCAN_MS)).toBeLessThanOrEqual(
      GEO.RAYON_MAX_M,
    );
  });

  it('accepte tout genre avec « peu importe »', () => {
    expect(filtreAccepte('peu_importe', 'autre')).toBe(true);
    expect(filtreAccepte('femmes', 'autre')).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe('versions', () => {
  it('exige une mise à jour en dessous du protocole minimal', () => {
    expect(verifierProtocole(0).statut).toBe('mise_a_jour_requise');
    expect(verifierProtocole(1).statut).toBe('compatible');
    expect(verifierProtocole(99).statut).toBe('serveur_obsolete');
  });

  it('refuse de rétrograder des données plus récentes plutôt que de les écraser', () => {
    // Une migration ratée détruit définitivement une relation à 900 points.
    expect(() => migrerStockage({}, VERSION_STOCKAGE_LOCAL + 1)).toThrow(/plus récentes/);
  });

  it('laisse passer des données déjà à jour', () => {
    const donnees = { duos: [] };
    expect(migrerStockage(donnees, VERSION_STOCKAGE_LOCAL)).toBe(donnees);
  });
});

// ---------------------------------------------------------------------------

describe('garde-fou du protocole', () => {
  it("n'expose aucun message interdit par les principes", async () => {
    // Ce test protège P3, P4, P5 et §12.2 contre une addition distraite six mois
    // plus tard : révéler un refus, ouvrir un canal de texte libre, transporter un
    // média, ou divulguer la position d'un partenaire.
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('./protocol.ts', import.meta.url), 'utf8'),
    );
    const declarations = source.slice(0, source.indexOf('MESSAGES_INTERDITS'));

    for (const interdit of MESSAGES_INTERDITS) {
      expect(declarations, `le protocole ne doit pas exposer « ${interdit} »`).not.toMatch(
        new RegExp(`type:\\s*'${interdit}'`),
      );
    }
  });
});
