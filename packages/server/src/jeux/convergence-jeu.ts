/**
 * Convergence — aboutir au même mot. Symétrique, tour par tour, palier 3.
 *
 * Les deux doivent arriver au **même mot** en un minimum de tours. À chaque tour,
 * chacun propose un mot dans une liste fermée ; s'ils diffèrent, le tour suivant part
 * de leurs deux propositions, et il faut converger vers quelque chose qui les relie.
 *
 * **Placé au palier 3 délibérément.** Aboutir au même mot demande de savoir comment
 * l'autre pense : c'est un excellent jeu de fin de parcours et un mauvais jeu de
 * premier jour. C'est aussi, littéralement, la métaphore du produit — se comprendre
 * sans se parler.
 *
 * Liste fermée de propositions, donc **aucun texte libre** (P3).
 */

import { MINUTE, type UserId } from '@sadfy/shared';

import type { MoteurJeu, ResultatAction } from '../moteur.js';

const TOURS_MAX = 6;
const PROPOSITIONS_PAR_TOUR = 8;

export type ActionConvergence = { readonly type: 'proposer'; readonly mot: number };

export interface EtatConvergence {
  readonly joueurs: readonly [UserId, UserId];
  /** Indices dans la banque de mots ; les libellés vivent dans `content/`. */
  readonly banque: readonly number[];
  tour: number;
  propositions: Record<string, number | undefined>;
  /** Historique des paires proposées : c'est ce qui fait l'histoire de la partie. */
  historique: { readonly a: number; readonly b: number }[];
  trouve: boolean;
}

function suite(graine: number): () => number {
  let etat = graine | 0;
  return () => {
    etat = (Math.imul(etat, 1664525) + 1013904223) | 0;
    return Math.abs(etat);
  };
}

export const convergence: MoteurJeu<EtatConvergence, ActionConvergence> = {
  id: 'convergence',
  asymetrique: false,
  roles: ['joueur', 'joueur'],
  dureeMancheMs: 4 * MINUTE,
  briefings: {
    joueur:
      'Trouvez le même mot. Vous proposez en même temps, sans vous concerter. Si vous ' +
      'tombez à côté, repartez de vos deux propositions et rapprochez-vous.',
  },

  creer(graine, joueurs): EtatConvergence {
    const tirer = suite(graine);
    return {
      joueurs: [joueurs[0], joueurs[1]],
      banque: Array.from(
        { length: TOURS_MAX * PROPOSITIONS_PAR_TOUR },
        () => tirer() % 500,
      ),
      tour: 0,
      propositions: {},
      historique: [],
      trouve: false,
    };
  },

  /**
   * Simultanéité stricte : tant que les deux n'ont pas proposé, personne ne voit le
   * mot de l'autre. Sans ça, le second se contenterait de recopier et le jeu ne
   * mesurerait plus rien.
   */
  vue(etat, pour) {
    const debut = etat.tour * PROPOSITIONS_PAR_TOUR;
    return {
      role: 'joueur',
      tour: etat.tour,
      toursMax: TOURS_MAX,
      propositions: etat.banque.slice(debut, debut + PROPOSITIONS_PAR_TOUR),
      maProposition: etat.propositions[pour] ?? null,
      enAttenteDeLAutre:
        etat.propositions[pour] !== undefined &&
        Object.keys(etat.propositions).length < 2,
      historique: etat.historique,
      trouve: etat.trouve,
    };
  },

  roleDe() {
    return 'joueur';
  },

  appliquer(etat, joueur, action, _maintenant): ResultatAction {
    if (action.type !== 'proposer') return { acceptee: false };
    if (!etat.joueurs.includes(joueur)) return { acceptee: false };
    if (etat.propositions[joueur] !== undefined) return { acceptee: false };

    const debut = etat.tour * PROPOSITIONS_PAR_TOUR;
    const disponibles = etat.banque.slice(debut, debut + PROPOSITIONS_PAR_TOUR);
    if (!disponibles.includes(action.mot)) return { acceptee: false };

    etat.propositions = { ...etat.propositions, [joueur]: action.mot };

    const [a, b] = etat.joueurs;
    const pa = etat.propositions[a];
    const pb = etat.propositions[b];
    if (pa === undefined || pb === undefined) return { acceptee: true };

    etat.historique = [...etat.historique, { a: pa, b: pb }];
    if (pa === pb) etat.trouve = true;

    etat.tour += 1;
    etat.propositions = {};
    return { acceptee: true, retour: pa === pb ? 'trouve' : 'encore' };
  },

  terminee(etat) {
    return etat.trouve || etat.tour >= TOURS_MAX;
  },

  reussie(etat) {
    return etat.trouve;
  },
};
