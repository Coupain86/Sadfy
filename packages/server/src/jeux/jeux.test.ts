import { describe, expect, it } from 'vitest';

import { jeuxDisponibles, type JeuId, type UserId } from '@sadfy/shared';

import { Partie } from '../moteur.js';
import { CATALOGUE, blindMatch, convergence, demineurCooperatif, laScie } from './index.js';

const A = 'joueur-a' as UserId;
const B = 'joueur-b' as UserId;
const JOUEURS = [A, B] as const;
const T0 = Date.parse('2026-07-31T18:00:00Z');

// ---------------------------------------------------------------------------

describe('le catalogue', () => {
  it('couvre exactement les jeux annoncés par les paliers', () => {
    // Si un jeu est débloqué par un palier mais absent du catalogue, la partie
    // planterait au moment de la lancer. Ce test relie les deux.
    const annonces = new Set<JeuId>(jeuxDisponibles('decision'));
    for (const jeu of annonces) {
      expect(CATALOGUE[jeu], `le jeu « ${jeu} » est annoncé mais introuvable`).toBeDefined();
    }
    expect(Object.keys(CATALOGUE).sort()).toEqual([...annonces].sort());
  });

  it('donne un briefing à chaque rôle de chaque jeu', () => {
    // Sans briefing, les vingt premières secondes d'un jeu asymétrique sont de la
    // confusion pure (§9.5).
    for (const [id, moteur] of Object.entries(CATALOGUE)) {
      for (const role of new Set(moteur.roles)) {
        expect(moteur.briefings[role], `${id} / ${role}`).toBeTruthy();
      }
    }
  });

  it('ne fait jouer deux manches qu\'aux jeux asymétriques', () => {
    // Un jeu symétrique n'a pas de rôle à inverser (§9.3).
    expect(blindMatch.asymetrique).toBe(false);
    expect(laScie.asymetrique).toBe(false);
    expect(convergence.asymetrique).toBe(false);
    expect(demineurCooperatif.asymetrique).toBe(true);
  });

  it('annonce une durée de manche compatible avec un trajet', () => {
    // « Environ 3 minutes » doit être vrai : quelqu'un dans le métro s'engage
    // sur cette base (§9.6).
    for (const [id, moteur] of Object.entries(CATALOGUE)) {
      expect(moteur.dureeMancheMs, id).toBeGreaterThanOrEqual(60_000);
      expect(moteur.dureeMancheMs, id).toBeLessThanOrEqual(5 * 60_000);
    }
  });
});

// ---------------------------------------------------------------------------

describe('Blind Match', () => {
  it('ne révèle le choix de l\'autre qu\'une fois les deux tombés', () => {
    // Sinon le second s'aligne, et le jeu ne mesure plus rien.
    const partie = new Partie(blindMatch, JOUEURS, 7);
    partie.demarrer(T0);

    const apresA = partie.agir(A, { type: 'repondre', choix: 2 }, T0 + 100);
    const vueB = apresA.find((e) => e.type === 'vue' && e.pour === B);
    expect(JSON.stringify(vueB)).not.toMatch(/"lui":\s*2/);

    const apresB = partie.agir(B, { type: 'repondre', choix: 2 }, T0 + 200);
    const vueBRevelee = apresB.find((e) => e.type === 'vue' && e.pour === B);
    expect(JSON.stringify(vueBRevelee)).toMatch(/"identique":true/);
  });

  it('interdit de se raviser après avoir répondu', () => {
    const partie = new Partie(blindMatch, JOUEURS, 7);
    partie.demarrer(T0);
    partie.agir(A, { type: 'repondre', choix: 1 }, T0 + 100);
    expect(partie.agir(A, { type: 'repondre', choix: 3 }, T0 + 200)).toHaveLength(0);
  });

  it('ne fait jamais échouer une partie', () => {
    // Deux personnes très différentes ne doivent pas terminer leur première partie
    // sur un constat de défaite : il n'y a pas de bonne réponse (§16).
    const partie = new Partie(blindMatch, JOUEURS, 7);
    partie.demarrer(T0);

    for (let tour = 0; tour < 5; tour += 1) {
      partie.agir(A, { type: 'repondre', choix: 0 }, T0 + tour * 10);
      partie.agir(B, { type: 'repondre', choix: 3 }, T0 + tour * 10 + 1);
    }

    expect(partie.phase).toBe('terminee');
    expect(partie.resume?.reussie).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe('La Scie', () => {
  it('coupe la bûche quand les deux alternent', () => {
    const partie = new Partie(laScie, JOUEURS, 1);
    partie.demarrer(T0);

    let t = T0;
    for (let i = 0; i < 12; i += 1) {
      t += 1_000;
      partie.agir(i % 2 === 0 ? A : B, { type: 'tirer' }, t);
    }

    expect(partie.phase).toBe('terminee');
    expect(partie.resume?.reussie).toBe(true);
  });

  it('bloque quand les deux tirent dans la même fenêtre', () => {
    // On ne prétend pas mesurer la milliseconde : le réseau mobile varie de 80 à
    // 150 ms, et prétendre le contraire serait un mensonge (§15.2).
    const partie = new Partie(laScie, JOUEURS, 1);
    const debut = partie.demarrer(T0);
    expect(debut).not.toHaveLength(0);

    partie.agir(A, { type: 'tirer' }, T0 + 1_000);
    const apres = partie.agir(B, { type: 'tirer' }, T0 + 1_050);

    const vue = apres.find((e) => e.type === 'vue' && e.pour === A);
    expect(JSON.stringify(vue)).toMatch(/"blocages":1/);
  });

  it('ne punit pas celui qui tire hors tour', () => {
    // C'est de l'impatience, pas une faute : l'interface la montre sans la sanctionner.
    const partie = new Partie(laScie, JOUEURS, 1);
    partie.demarrer(T0);

    const apres = partie.agir(B, { type: 'tirer' }, T0 + 1_000);
    const vue = apres.find((e) => e.type === 'vue' && e.pour === B);
    expect(JSON.stringify(vue)).toMatch(/"coupes":0/);
    expect(partie.phase).toBe('en_cours');
  });
});

// ---------------------------------------------------------------------------

describe('Démineur coopératif', () => {
  it("n'envoie jamais les mines à un joueur", () => {
    const partie = new Partie(demineurCooperatif, JOUEURS, 3);
    const debut = partie.demarrer(T0);

    for (const evenement of debut) {
      expect(JSON.stringify(evenement)).not.toMatch(/"mines"/);
    }
  });

  it('donne à chacun une moitié différente des indices', () => {
    // Le partage est strict : jamais le même indice aux deux, sinon la coopération
    // devient facultative et le jeu perd sa raison d'être (§15.3).
    const partie = new Partie(demineurCooperatif, JOUEURS, 3);
    const debut = partie.demarrer(T0);

    const indices = (pour: UserId) => {
      const e = debut.find((x) => x.type === 'vue' && x.pour === pour);
      const vue = e?.type === 'vue' ? (e.vue as { cases: { i: number; etat: string }[] }) : null;
      return new Set(vue?.cases.filter((c) => c.etat === 'indice').map((c) => c.i) ?? []);
    };

    const aIndices = indices(A);
    const bIndices = indices(B);

    expect(aIndices.size).toBeGreaterThan(0);
    expect(bIndices.size).toBeGreaterThan(0);
    for (const i of aIndices) expect(bIndices.has(i)).toBe(false);
  });

  it('termine la partie sur une mine, sans la déclarer réussie', () => {
    const partie = new Partie(demineurCooperatif, JOUEURS, 3);
    partie.demarrer(T0);

    // On cherche une mine en balayant : le test ne connaît pas la grille, comme un
    // joueur.
    let t = T0;
    for (let i = 0; i < 36 && partie.phase === 'en_cours'; i += 1) {
      t += 10;
      partie.agir(A, { type: 'devoiler', case: i }, t);
    }

    expect(partie.phase).toBe('terminee');
  });
});

// ---------------------------------------------------------------------------

describe('Convergence', () => {
  it('ne révèle la proposition de l\'autre qu\'une fois les deux tombées', () => {
    const partie = new Partie(convergence, JOUEURS, 11);
    const debut = partie.demarrer(T0);

    const vueA = debut.find((e) => e.type === 'vue' && e.pour === A);
    const propositions =
      vueA?.type === 'vue' ? (vueA.vue as { propositions: number[] }).propositions : [];

    const apresA = partie.agir(A, { type: 'proposer', mot: propositions[0]! }, T0 + 100);
    const vueB = apresA.find((e) => e.type === 'vue' && e.pour === B);
    expect(JSON.stringify(vueB)).toMatch(/"historique":\[\]/);
  });

  it('réussit quand les deux proposent le même mot', () => {
    const partie = new Partie(convergence, JOUEURS, 11);
    const debut = partie.demarrer(T0);
    const vueA = debut.find((e) => e.type === 'vue' && e.pour === A);
    const mot =
      vueA?.type === 'vue' ? (vueA.vue as { propositions: number[] }).propositions[0]! : 0;

    partie.agir(A, { type: 'proposer', mot }, T0 + 100);
    partie.agir(B, { type: 'proposer', mot }, T0 + 200);

    expect(partie.phase).toBe('terminee');
    expect(partie.resume?.reussie).toBe(true);
  });

  it('refuse un mot hors de la liste proposée', () => {
    // Liste fermée : c'est ce qui garantit l'absence de texte libre (P3).
    const partie = new Partie(convergence, JOUEURS, 11);
    partie.demarrer(T0);
    expect(partie.agir(A, { type: 'proposer', mot: 99_999 }, T0 + 100)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------

describe('aucun jeu ne laisse fuiter la solution', () => {
  it('vérifie chaque jeu du catalogue', () => {
    // Garde-fou générique : si un jeu ajouté plus tard oublie de filtrer sa vue, ce
    // test le voit. La projection est la seule barrière — l'information non envoyée
    // est la seule information sûre.
    const interdits = /"(cible|mines|solution|reponse)"/;

    for (const [id, moteur] of Object.entries(CATALOGUE)) {
      const etat = moteur.creer(42, JOUEURS);
      for (const joueur of JOUEURS) {
        const vue = JSON.stringify(moteur.vue(etat, joueur));
        expect(vue, `${id} laisse fuiter sa solution`).not.toMatch(interdits);
      }
    }
  });
});
