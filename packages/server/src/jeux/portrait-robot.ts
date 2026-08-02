/**
 * Le Portrait Robot — jeu asymétrique, tour par tour, palier 2.
 *
 * Le Témoin voit un visage. L'Inspecteur doit le reconstituer sans jamais le voir, en
 * proposant des éléments un par un ; le Témoin ne peut répondre que par oui ou non.
 *
 * C'est le jeu le plus représentatif du catalogue, et c'est pour ça qu'il est construit
 * en premier : s'il tient, l'architecture tient pour tous les autres asymétriques.
 *
 * Tour par tour, donc **il survit aux coupures du métro** (§15.2) — le critère qui a
 * façonné tout le catalogue. Et la variété vient du contenu, pas de la mécanique : cinq
 * emplacements à six options font 7 776 visages, donc personne ne dira « encore le même ».
 */

import {
  EMPLACEMENTS_VISAGE,
  MINUTE,
  type ActionPortraitRobot,
  type EmplacementVisage,
  type UserId,
  type Visage,
  type VuePortraitRobot,
} from '@sadfy/shared';

import type { MoteurJeu, ResultatAction } from '../moteur.js';

/** Les emplacements viennent du noyau partagé : l'écran doit connaître les mêmes. */
export const EMPLACEMENTS = EMPLACEMENTS_VISAGE;
export type Emplacement = EmplacementVisage;

const OPTIONS_PAR_EMPLACEMENT = 6;

export interface EtatPortraitRobot {
  readonly temoin: UserId;
  readonly inspecteur: UserId;
  /** Ne doit JAMAIS atteindre l'Inspecteur. */
  readonly cible: Visage;
  emplacementCourant: number;
  /** Ce que l'Inspecteur a déjà fait valider. */
  construit: Partial<Record<Emplacement, number>>;
  propositionEnAttente: number | undefined;
  /** Sert à faire sentir la difficulté sans jamais la dire : au bout de plusieurs
   *  essais infructueux, l'interface peut proposer un coup de pouce. */
  essais: number;
}

/** Générateur déterministe : les deux joueurs doivent voir la même partie. */
function suite(graine: number): () => number {
  let etat = graine | 0;
  return () => {
    etat = (Math.imul(etat, 1664525) + 1013904223) | 0;
    return Math.abs(etat);
  };
}

export const portraitRobot: MoteurJeu<EtatPortraitRobot, ActionPortraitRobot> = {
  id: 'portrait_robot',
  asymetrique: true,
  roles: ['temoin', 'inspecteur'],
  dureeMancheMs: 3 * MINUTE,
  briefings: {
    temoin:
      'Tu es le Témoin. Tu vois un visage, ton partenaire doit le reconstituer sans ' +
      'le voir. Tu ne peux répondre que par oui ou non.',
    inspecteur:
      "Tu es l'Inspecteur. Tu construis un visage que tu ne verras jamais. Propose, " +
      'ton partenaire te dira si tu chauffes.',
  },

  creer(graine, joueurs): EtatPortraitRobot {
    const tirer = suite(graine);
    const cible = Object.fromEntries(
      EMPLACEMENTS.map((e) => [e, tirer() % OPTIONS_PAR_EMPLACEMENT]),
    ) as unknown as Visage;

    // Le premier joueur est Témoin. Les rôles s'inversent à la manche suivante parce
    // que l'orchestrateur recrée l'état avec les joueurs permutés (§9.3).
    return {
      temoin: joueurs[0],
      inspecteur: joueurs[1],
      cible,
      emplacementCourant: 0,
      construit: {},
      propositionEnAttente: undefined,
      essais: 0,
    };
  },

  /**
   * **La projection.** L'Inspecteur ne reçoit jamais `cible` — pas masqué à l'écran :
   * absent de ce qui sort du serveur. C'est la seule façon de garantir l'asymétrie.
   */
  vue(etat, pour): VuePortraitRobot {
    const emplacement = EMPLACEMENTS[etat.emplacementCourant];
    const commun = {
      emplacementCourant: emplacement ?? null,
      construit: etat.construit,
      restants: EMPLACEMENTS.length - etat.emplacementCourant,
    };

    if (pour === etat.temoin) {
      return {
        role: 'temoin',
        ...commun,
        visageCible: etat.cible,
        propositionEnAttente: etat.propositionEnAttente ?? null,
      };
    }

    return {
      role: 'inspecteur',
      ...commun,
      options: Array.from({ length: OPTIONS_PAR_EMPLACEMENT }, (_, i) => i),
      enAttenteDeReponse: etat.propositionEnAttente !== undefined,
      essais: etat.essais,
    };
  },

  roleDe(etat, joueur) {
    return joueur === etat.temoin ? 'temoin' : 'inspecteur';
  },

  appliquer(etat, joueur, action, _maintenant): ResultatAction {
    const emplacement = EMPLACEMENTS[etat.emplacementCourant];
    if (!emplacement) return { acceptee: false };

    if (action.type === 'proposer') {
      // Le serveur valide : un client modifié ne peut pas proposer hors tour, hors
      // bornes, ni pendant qu'une réponse est attendue.
      if (joueur !== etat.inspecteur) return { acceptee: false };
      if (etat.propositionEnAttente !== undefined) return { acceptee: false };
      if (!Number.isInteger(action.valeur)) return { acceptee: false };
      if (action.valeur < 0 || action.valeur >= OPTIONS_PAR_EMPLACEMENT) {
        return { acceptee: false };
      }

      etat.propositionEnAttente = action.valeur;
      etat.essais += 1;
      return { acceptee: true };
    }

    if (joueur !== etat.temoin) return { acceptee: false };
    if (etat.propositionEnAttente === undefined) return { acceptee: false };

    const proposition = etat.propositionEnAttente;
    etat.propositionEnAttente = undefined;

    if (!action.oui) return { acceptee: true, retour: 'non' };

    // Le Témoin valide. On fait confiance à sa réponse : c'est un jeu coopératif, il
    // n'a aucune raison de mentir, et lui donner tort serait le contredire devant son
    // partenaire — exactement ce qu'il ne faut pas faire.
    etat.construit = { ...etat.construit, [emplacement]: proposition };
    etat.emplacementCourant += 1;
    return { acceptee: true, retour: 'oui' };
  },

  terminee(etat) {
    return etat.emplacementCourant >= EMPLACEMENTS.length;
  },

  /**
   * Réussie si le visage construit correspond réellement à la cible.
   *
   * Le Témoin peut se tromper en validant : c'est le sel du jeu, et ça ne se sanctionne
   * pas — perdre rapporte quand même des points (§10.4).
   */
  reussie(etat) {
    return EMPLACEMENTS.every((e) => etat.construit[e] === etat.cible[e]);
  },
};
