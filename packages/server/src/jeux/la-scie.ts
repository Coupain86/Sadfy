/**
 * La Scie passe-partout — synchronisation pure. Symétrique, tour par tour, palier 1.
 *
 * Une bûche à l'écran. Chacun tire à son tour. **S'ils tirent en même temps, la scie
 * bloque** ; s'ils alternent bien, la bûche est coupée.
 *
 * Le jeu le plus simple du catalogue, et c'est exactement pourquoi il est au palier 1 :
 * il enseigne la coordination sans rien exiger d'autre, et il ne demande aucune
 * compétence — ce qui est une règle absolue du produit, puisque tout repose sur le fait
 * qu'il n'y a **rien à juger** chez l'autre (§15.3).
 *
 * Tour par tour, donc immunisé aux coupures du métro. Le « à la milliseconde près » de
 * la v1 était irréalisable sur réseau mobile ; ici la simultanéité fautive se mesure
 * avec une fenêtre de tolérance explicite (§15.2).
 */

import { MINUTE, PARTIE, type UserId } from '@sadfy/shared';

import type { MoteurJeu, ResultatAction } from '../moteur.js';

const COUPES_REQUISES = 12;

export type ActionScie = { readonly type: 'tirer' };

export interface EtatScie {
  readonly joueurs: readonly [UserId, UserId];
  /** À qui le tour. */
  aQui: UserId;
  coupes: number;
  blocages: number;
  dernierTirage?: { joueur: UserId; a: number };
}

export const laScie: MoteurJeu<EtatScie, ActionScie> = {
  id: 'la_scie',
  asymetrique: false,
  roles: ['scieur', 'scieur'],
  dureeMancheMs: 2 * MINUTE,
  briefings: {
    scieur:
      'Une bûche, une scie, et vous deux. Tirez chacun votre tour. Si vous tirez en ' +
      'même temps, la scie bloque.',
  },

  creer(_graine, joueurs): EtatScie {
    return {
      joueurs: [joueurs[0], joueurs[1]],
      aQui: joueurs[0],
      coupes: 0,
      blocages: 0,
    };
  },

  /**
   * Vue quasi identique pour les deux — le jeu est symétrique. Seul « est-ce mon
   * tour ? » diffère, et c'est toute l'information dont chacun a besoin.
   */
  vue(etat, pour) {
    return {
      role: 'scieur',
      monTour: etat.aQui === pour,
      coupes: etat.coupes,
      requises: COUPES_REQUISES,
      blocages: etat.blocages,
    };
  },

  roleDe() {
    return 'scieur';
  },

  appliquer(etat, joueur, action, maintenant): ResultatAction {
    if (action.type !== 'tirer') return { acceptee: false };
    if (!etat.joueurs.includes(joueur)) return { acceptee: false };

    const precedent = etat.dernierTirage;

    // Simultanéité fautive : les deux ont tiré dans la même fenêtre de tolérance.
    // On ne cherche pas la milliseconde — le réseau mobile varie de 80 à 150 ms, la
    // prétention à la précision serait un mensonge (§15.2).
    if (
      precedent &&
      precedent.joueur !== joueur &&
      maintenant - precedent.a < PARTIE.TOLERANCE_SYNCHRO_MS
    ) {
      etat.blocages += 1;
      etat.dernierTirage = { joueur, a: maintenant };
      return { acceptee: true, retour: 'blocage' };
    }

    if (etat.aQui !== joueur) {
      // Tirer hors tour ne fait pas avancer la bûche, mais ce n'est pas une faute
      // non plus : c'est de l'impatience, et l'interface la montre sans la punir.
      etat.dernierTirage = { joueur, a: maintenant };
      return { acceptee: true, retour: 'pas_ton_tour' };
    }

    etat.coupes += 1;
    etat.aQui = etat.joueurs[0] === joueur ? etat.joueurs[1] : etat.joueurs[0];
    etat.dernierTirage = { joueur, a: maintenant };
    return { acceptee: true, retour: 'coupe' };
  },

  terminee(etat) {
    return etat.coupes >= COUPES_REQUISES;
  },

  reussie(etat) {
    // Réussie dès que la bûche est coupée. Les blocages ne font pas échouer la
    // partie : ils la rendent plus longue et plus drôle, ce qui est le but.
    return etat.coupes >= COUPES_REQUISES;
  },
};
