/**
 * Le Blind Match — quiz de complicité. Symétrique, tour par tour, palier 1.
 *
 * Les deux reçoivent la même question et quatre propositions. Les choix sont révélés
 * **simultanément**. Le but n'est pas de trouver une bonne réponse, il n'y en a pas :
 * c'est de découvrir si on pense pareil.
 *
 * C'est le cœur du palier 1, et pour une raison précise : c'est le seul jeu qui produit
 * de l'**information personnelle** comme sous-produit du jeu. Les deux premiers jours
 * sont ceux où l'on ne sait encore rien de l'autre — autant qu'ils servent à quelque
 * chose.
 *
 * Symétrique, donc **manche unique** (§9.3) : il n'y a pas de rôle à inverser.
 */

import {
  MINUTE,
  type ActionBlindMatch,
  type UserId,
  type VueBlindMatch,
} from '@sadfy/shared';

import type { MoteurJeu, ResultatAction } from '../moteur.js';

const QUESTIONS_PAR_PARTIE = 5;

export interface EtatBlindMatch {
  readonly joueurs: readonly [UserId, UserId];
  /** Indices dans la banque de questions ; le texte vit dans `content/`. */
  readonly questions: readonly number[];
  tour: number;
  reponses: Record<string, (0 | 1 | 2 | 3)[]>;
  /** Nombre de tours où les deux ont répondu la même chose. */
  convergences: number;
}

function suite(graine: number): () => number {
  let etat = graine | 0;
  return () => {
    etat = (Math.imul(etat, 1664525) + 1013904223) | 0;
    return Math.abs(etat);
  };
}

export const blindMatch: MoteurJeu<EtatBlindMatch, ActionBlindMatch> = {
  id: 'blind_match',
  asymetrique: false,
  roles: ['joueur', 'joueur'],
  dureeMancheMs: 3 * MINUTE,
  briefings: {
    joueur:
      'Même question pour vous deux, quatre réponses possibles. Vos choix sont ' +
      "révélés en même temps. Il n'y a pas de bonne réponse — seulement la vôtre.",
  },

  creer(graine, joueurs): EtatBlindMatch {
    const tirer = suite(graine);
    return {
      joueurs: [joueurs[0], joueurs[1]],
      questions: Array.from({ length: QUESTIONS_PAR_PARTIE }, () => tirer() % 1_000),
      tour: 0,
      reponses: { [joueurs[0]]: [], [joueurs[1]]: [] },
      convergences: 0,
    };
  },

  /**
   * **La révélation est simultanée.** Tant que les deux n'ont pas répondu, personne ne
   * voit le choix de l'autre — sinon le second s'alignerait, et le jeu ne mesurerait
   * plus rien.
   */
  vue(etat, pour): VueBlindMatch {
    const autre = etat.joueurs[0] === pour ? etat.joueurs[1] : etat.joueurs[0];
    const miennes = etat.reponses[pour] ?? [];
    const siennes = etat.reponses[autre] ?? [];
    const tourResolu = Math.min(miennes.length, siennes.length);

    return {
      role: 'joueur',
      question: etat.questions[etat.tour] ?? null,
      tour: etat.tour,
      total: QUESTIONS_PAR_PARTIE,
      aRepondu: miennes.length > etat.tour,
      enAttenteDeLAutre: miennes.length > etat.tour && siennes.length <= etat.tour,
      // Uniquement les tours où les deux ont tranché.
      revelations: Array.from({ length: tourResolu }, (_, i) => ({
        question: etat.questions[i] ?? null,
        moi: miennes[i],
        lui: siennes[i],
        identique: miennes[i] === siennes[i],
      })),
      convergences: etat.convergences,
    };
  },

  roleDe() {
    return 'joueur';
  },

  appliquer(etat, joueur, action, _maintenant): ResultatAction {
    if (action.type !== 'repondre') return { acceptee: false };
    if (!etat.joueurs.includes(joueur)) return { acceptee: false };
    if (![0, 1, 2, 3].includes(action.choix)) return { acceptee: false };

    const miennes = etat.reponses[joueur] ?? [];
    // Une seule réponse par tour : on ne se ravise pas après avoir vu l'autre.
    if (miennes.length > etat.tour) return { acceptee: false };

    etat.reponses = { ...etat.reponses, [joueur]: [...miennes, action.choix] };

    const [a, b] = etat.joueurs;
    const ra = etat.reponses[a] ?? [];
    const rb = etat.reponses[b] ?? [];

    if (ra.length > etat.tour && rb.length > etat.tour) {
      if (ra[etat.tour] === rb[etat.tour]) etat.convergences += 1;
      etat.tour += 1;
    }

    return { acceptee: true };
  },

  terminee(etat) {
    return etat.tour >= QUESTIONS_PAR_PARTIE;
  },

  /**
   * Toujours réussi.
   *
   * Ce n'est pas un oubli : le Blind Match n'a pas de bonne réponse, donc il n'a pas
   * d'échec. Le nombre de convergences alimente le carnet et l'affinité, il ne
   * sanctionne rien — deux personnes très différentes ne doivent pas terminer leur
   * première partie sur un constat de défaite (§16).
   */
  reussie() {
    return true;
  },
};
