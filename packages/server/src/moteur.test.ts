import { describe, expect, it } from 'vitest';

import { PARTIE, type UserId } from '@sadfy/shared';

import { Partie, type EvenementPartie } from './moteur.js';
import {
  EMPLACEMENTS,
  portraitRobot,
  type ActionPortraitRobot,
  type EtatPortraitRobot,
} from './jeux/portrait-robot.js';

const TEMOIN = 'temoin' as UserId;
const INSPECTEUR = 'inspecteur' as UserId;
const JOUEURS = [TEMOIN, INSPECTEUR] as const;
const T0 = Date.parse('2026-07-31T18:00:00Z');

function nouvellePartie(): Partie<EtatPortraitRobot, ActionPortraitRobot> {
  return new Partie(portraitRobot, JOUEURS, 42);
}

function vuePour(evenements: readonly EvenementPartie[], joueur: UserId): unknown {
  const e = evenements.find((x) => x.type === 'vue' && x.pour === joueur);
  return e?.type === 'vue' ? e.vue : undefined;
}

/** Rejoue une manche complète en trichant : on lit la cible côté test, pas côté jeu. */
function resoudreManche(
  partie: Partie<EtatPortraitRobot, ActionPortraitRobot>,
  cible: Record<string, number>,
  inspecteur: UserId,
  temoin: UserId,
  t: number,
): readonly EvenementPartie[] {
  let evenements: readonly EvenementPartie[] = [];
  for (const emplacement of EMPLACEMENTS) {
    const valeur = cible[emplacement] ?? 0;
    partie.agir(inspecteur, { type: 'proposer', valeur }, t);
    evenements = partie.agir(temoin, { type: 'repondre', oui: true }, t);
    t += 1;
  }
  return evenements;
}

// ---------------------------------------------------------------------------

describe("l'asymétrie est garantie par le serveur", () => {
  it("n'envoie jamais le visage cible à l'Inspecteur", () => {
    // C'est LA propriété du produit. Si elle tombe, tous les jeux asymétriques
    // deviennent des jeux où l'un des deux a la réponse sous les yeux.
    const partie = nouvellePartie();
    const evenements = partie.demarrer(T0);

    const vueInspecteur = JSON.stringify(vuePour(evenements, INSPECTEUR));
    expect(vueInspecteur).not.toMatch(/visageCible|cible/);
  });

  it('envoie deux vues réellement différentes', () => {
    const partie = nouvellePartie();
    const evenements = partie.demarrer(T0);

    expect(vuePour(evenements, TEMOIN)).not.toEqual(vuePour(evenements, INSPECTEUR));
  });

  it('donne au Témoin ce qu\'il faut pour juger, et rien de plus', () => {
    const partie = nouvellePartie();
    partie.demarrer(T0);
    const apres = partie.agir(INSPECTEUR, { type: 'proposer', valeur: 3 }, T0 + 100);

    const vueTemoin = vuePour(apres, TEMOIN) as { propositionEnAttente: number | null };
    expect(vueTemoin.propositionEnAttente).toBe(3);
  });

  it('ne laisse pas un joueur agir à la place de l\'autre', () => {
    // Le serveur valide chaque action : un client modifié ne contourne rien.
    const partie = nouvellePartie();
    partie.demarrer(T0);

    expect(partie.agir(TEMOIN, { type: 'proposer', valeur: 2 }, T0 + 100)).toHaveLength(0);
    expect(partie.agir(INSPECTEUR, { type: 'repondre', oui: true }, T0 + 100)).toHaveLength(0);
  });

  it('refuse une valeur hors bornes', () => {
    const partie = nouvellePartie();
    partie.demarrer(T0);

    expect(partie.agir(INSPECTEUR, { type: 'proposer', valeur: 99 }, T0 + 100)).toHaveLength(0);
    expect(partie.agir(INSPECTEUR, { type: 'proposer', valeur: -1 }, T0 + 100)).toHaveLength(0);
  });

  it('refuse deux propositions d\'affilée sans réponse', () => {
    const partie = nouvellePartie();
    partie.demarrer(T0);

    expect(partie.agir(INSPECTEUR, { type: 'proposer', valeur: 1 }, T0 + 100)).not.toHaveLength(0);
    expect(partie.agir(INSPECTEUR, { type: 'proposer', valeur: 2 }, T0 + 200)).toHaveLength(0);
  });
});

describe('déroulement de la partie', () => {
  it('donne à chacun un briefing correspondant à son rôle', () => {
    // Sans briefing, les vingt premières secondes d'un jeu asymétrique sont de la
    // confusion pure, et beaucoup abandonnent en croyant l'application cassée (§9.5).
    const briefings = nouvellePartie().briefer();

    const pourTemoin = briefings.find((b) => b.pour === TEMOIN);
    const pourInspecteur = briefings.find((b) => b.pour === INSPECTEUR);

    expect(pourTemoin?.type === 'briefing' && pourTemoin.texte).toMatch(/Témoin/);
    expect(pourInspecteur?.type === 'briefing' && pourInspecteur.texte).toMatch(/Inspecteur/);
    expect(pourTemoin).not.toEqual(pourInspecteur);
  });

  it('enchaîne deux manches en inversant les rôles', () => {
    // Sinon l'un aurait joué le rôle actif et l'autre le rôle passif (§9.3).
    const partie = new Partie(portraitRobot, JOUEURS, 42);
    const debut = partie.demarrer(T0);

    const cible = (vuePour(debut, TEMOIN) as { visageCible: Record<string, number> })
      .visageCible;
    const finManche1 = resoudreManche(partie, cible, INSPECTEUR, TEMOIN, T0 + 100);

    expect(partie.manche).toBe(2);
    expect(partie.phase).toBe('en_cours');

    // À la manche 2, c'est l'ancien Inspecteur qui voit le visage.
    const vueInspecteurManche2 = vuePour(finManche1, INSPECTEUR) as { role: string };
    expect(vueInspecteurManche2.role).toBe('temoin');
  });

  it('termine la partie après les deux manches', () => {
    const partie = new Partie(portraitRobot, JOUEURS, 42);
    let evenements = partie.demarrer(T0);

    let cible = (vuePour(evenements, TEMOIN) as { visageCible: Record<string, number> })
      .visageCible;
    evenements = resoudreManche(partie, cible, INSPECTEUR, TEMOIN, T0 + 100);

    cible = (vuePour(evenements, INSPECTEUR) as { visageCible: Record<string, number> })
      .visageCible;
    evenements = resoudreManche(partie, cible, TEMOIN, INSPECTEUR, T0 + 200);

    expect(partie.phase).toBe('terminee');
    expect(partie.resume?.reussie).toBe(true);
  });
});

describe('coupure réseau et abandon — à ne surtout pas confondre', () => {
  it('met la partie en pause sans la perdre quand le réseau tombe', () => {
    // Le métro est le cas d'usage central : confondre coupure et abandon punirait
    // exactement les gens pour qui le produit est conçu (§10.6).
    const partie = nouvellePartie();
    partie.demarrer(T0);

    const evenements = partie.deconnecter(INSPECTEUR, T0 + 1_000);

    expect(partie.phase).toBe('en_pause_reseau');
    const avis = evenements.find((e) => e.type === 'partenaire_deconnecte');
    expect(avis?.pour).toBe(TEMOIN);
  });

  it('reprend exactement où on en était', () => {
    const partie = nouvellePartie();
    partie.demarrer(T0);
    partie.agir(INSPECTEUR, { type: 'proposer', valeur: 3 }, T0 + 100);

    partie.deconnecter(INSPECTEUR, T0 + 1_000);
    const reprise = partie.reconnecter(INSPECTEUR, T0 + 2_000);

    expect(partie.phase).toBe('en_cours');
    const vueTemoin = vuePour(reprise, TEMOIN) as { propositionEnAttente: number | null };
    // La proposition en cours n'a pas bougé : rien n'est perdu.
    expect(vueTemoin.propositionEnAttente).toBe(3);
  });

  it('termine proprement si la fenêtre de reconnexion expire', () => {
    const partie = nouvellePartie();
    partie.demarrer(T0);
    partie.deconnecter(INSPECTEUR, T0 + 1_000);

    const apres = partie.tick(T0 + 1_000 + PARTIE.RECONNEXION_MS + 1);

    expect(partie.phase).toBe('terminee');
    expect(apres.some((e) => e.type === 'partie_terminee')).toBe(true);
  });

  it('ne compte pas comme abandon un départ expliqué', () => {
    // Le système récompense la politesse sans jamais le dire (§10.7).
    const partie = nouvellePartie();
    partie.demarrer(T0);
    partie.quitter(INSPECTEUR, 'dois_y_aller', T0 + 1_000);

    expect(partie.resume?.abandonSilencieuxPar).toBeUndefined();
  });

  it('compte comme abandon un départ silencieux', () => {
    const partie = nouvellePartie();
    partie.demarrer(T0);
    partie.quitter(INSPECTEUR, undefined, T0 + 1_000);

    expect(partie.resume?.abandonSilencieuxPar).toBe(INSPECTEUR);
  });

  it('ne laisse jamais deviner à celui qui reste que l\'autre s\'est éclipsé', () => {
    // Il ne suffit pas d'éviter le mot « abandon » dans un libellé : le fait même que
    // le départ ait été silencieux ne doit pas sortir du serveur. Sinon l'interface
    // pourrait le reformuler, et le reproche qu'on refuse d'adresser reviendrait par
    // la fenêtre. Ce drapeau vit dans le résumé, pour l'indicateur de fiabilité seul.
    const partie = nouvellePartie();
    partie.demarrer(T0);
    const evenements = partie.quitter(INSPECTEUR, undefined, T0 + 1_000);

    const pourTemoin = evenements.find((e) => e.pour === TEMOIN);
    const charge = JSON.stringify(pourTemoin);

    expect(charge).not.toMatch(/abandon|silencieux|\bparti\b|refus/i);
    // Et le serveur, lui, le sait très bien.
    expect(partie.resume?.abandonSilencieuxPar).toBe(INSPECTEUR);
  });

  it('transmet le motif de sortie quand il y en a un', () => {
    const partie = nouvellePartie();
    partie.demarrer(T0);
    const evenements = partie.quitter(INSPECTEUR, 'probleme_connexion', T0 + 1_000);

    const pourTemoin = evenements.find((e) => e.pour === TEMOIN);
    expect(pourTemoin?.type === 'partie_terminee' && pourTemoin.motifPartenaire).toBe(
      'probleme_connexion',
    );
  });
});

describe('inactivité', () => {
  it('rappelle discrètement, puis termine proprement', () => {
    // Quelqu'un descend du bus, on lui parle, il décroche : l'autre ne doit pas
    // rester planté devant un écran figé (§10.5).
    const partie = nouvellePartie();
    partie.demarrer(T0);

    const rappel = partie.tick(T0 + PARTIE.INACTIVITE_RAPPEL_MS + 1);
    expect(rappel.some((e) => e.type === 'rappel_inactivite')).toBe(true);

    const fin = partie.tick(T0 + PARTIE.INACTIVITE_FIN_MS + 1);
    expect(partie.phase).toBe('terminee');
    expect(fin.some((e) => e.type === 'partie_terminee')).toBe(true);
  });

  it('ne rappelle qu\'une fois tant que rien ne bouge', () => {
    const partie = nouvellePartie();
    partie.demarrer(T0);

    partie.tick(T0 + PARTIE.INACTIVITE_RAPPEL_MS + 1);
    const second = partie.tick(T0 + PARTIE.INACTIVITE_RAPPEL_MS + 2);

    expect(second.some((e) => e.type === 'rappel_inactivite')).toBe(false);
  });
});
