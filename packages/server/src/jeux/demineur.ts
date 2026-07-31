/**
 * Le Démineur coopératif — asymétrique, tour par tour, palier 2.
 *
 * Une grille partagée. **Chacun voit la moitié des indices, jamais les mêmes.** Aucun
 * des deux ne peut résoudre seul ; ensemble, c'est faisable.
 *
 * Le meilleur rapport effort/effet du catalogue, pour trois raisons :
 *
 * - **génération procédurale**, donc contenu infini et gratuit — rien à écrire ;
 * - **aucune compétence préalable** : c'est de la déduction pure. C'est la règle
 *   absolue de la famille « à deux contre la machine » — la difficulté doit venir de
 *   l'information partagée, jamais de la compétence individuelle, sinon on crée une
 *   hiérarchie entre deux inconnus (§15.3) ;
 * - **la machine est l'adversaire commun**, et se liguer contre quelqu'un fabrique du
 *   « nous » beaucoup plus vite que collaborer sur une tâche.
 */

import { MINUTE, type UserId } from '@sadfy/shared';

import type { MoteurJeu, ResultatAction } from '../moteur.js';

const TAILLE = 6;
const MINES = 6;

export type ActionDemineur =
  | { readonly type: 'devoiler'; readonly case: number }
  | { readonly type: 'marquer'; readonly case: number };

export interface EtatDemineur {
  readonly joueurs: readonly [UserId, UserId];
  /** Positions des mines. Ne doit JAMAIS atteindre un joueur. */
  readonly mines: ReadonlySet<number>;
  /** Indices attribués à chaque joueur : la moitié chacun, jamais les mêmes. */
  readonly indices: Readonly<Record<string, ReadonlySet<number>>>;
  devoilees: Set<number>;
  marquees: Set<number>;
  explose: boolean;
}

function suite(graine: number): () => number {
  let etat = graine | 0;
  return () => {
    etat = (Math.imul(etat, 1664525) + 1013904223) | 0;
    return Math.abs(etat);
  };
}

/** Nombre de mines adjacentes à une case. */
function voisinage(mines: ReadonlySet<number>, index: number): number {
  const x = index % TAILLE;
  const y = Math.floor(index / TAILLE);
  let total = 0;

  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= TAILLE || ny < 0 || ny >= TAILLE) continue;
      if (mines.has(ny * TAILLE + nx)) total += 1;
    }
  }

  return total;
}

export const demineurCooperatif: MoteurJeu<EtatDemineur, ActionDemineur> = {
  id: 'demineur_cooperatif',
  asymetrique: true,
  roles: ['artificier_nord', 'artificier_sud'],
  dureeMancheMs: 4 * MINUTE,
  briefings: {
    artificier_nord:
      'Tu vois la moitié des indices. Ton partenaire voit l\'autre moitié. Aucun des ' +
      'deux ne peut y arriver seul.',
    artificier_sud:
      'Tu vois la moitié des indices. Ton partenaire voit l\'autre moitié. Aucun des ' +
      'deux ne peut y arriver seul.',
  },

  creer(graine, joueurs): EtatDemineur {
    const tirer = suite(graine);
    const mines = new Set<number>();
    while (mines.size < MINES) mines.add(tirer() % (TAILLE * TAILLE));

    // Répartition des indices : une case sur deux à chacun, en quinconce. Le partage
    // est strict — jamais le même indice aux deux, sinon la coopération devient
    // facultative et le jeu perd sa raison d'être.
    const nord = new Set<number>();
    const sud = new Set<number>();
    for (let i = 0; i < TAILLE * TAILLE; i += 1) {
      if (mines.has(i)) continue;
      const x = i % TAILLE;
      const y = Math.floor(i / TAILLE);
      if ((x + y) % 2 === 0) nord.add(i);
      else sud.add(i);
    }

    return {
      joueurs: [joueurs[0], joueurs[1]],
      mines,
      indices: { [joueurs[0]]: nord, [joueurs[1]]: sud },
      devoilees: new Set(),
      marquees: new Set(),
      explose: false,
    };
  },

  /**
   * **La projection.** Chacun ne reçoit que ses propres indices, et jamais les mines.
   *
   * Un joueur qui inspecterait le trafic réseau de son téléphone ne verrait que la
   * moitié de la grille : l'information n'est pas masquée à l'affichage, elle n'est
   * pas envoyée.
   */
  vue(etat, pour) {
    const miens = etat.indices[pour] ?? new Set<number>();

    const cases = Array.from({ length: TAILLE * TAILLE }, (_, i) => {
      if (etat.devoilees.has(i)) {
        return { i, etat: 'devoilee' as const, voisins: voisinage(etat.mines, i) };
      }
      if (etat.marquees.has(i)) return { i, etat: 'marquee' as const };
      if (miens.has(i)) {
        return { i, etat: 'indice' as const, voisins: voisinage(etat.mines, i) };
      }
      return { i, etat: 'inconnue' as const };
    });

    return {
      role: pour === etat.joueurs[0] ? 'artificier_nord' : 'artificier_sud',
      taille: TAILLE,
      minesTotal: MINES,
      cases,
      marquees: etat.marquees.size,
      explose: etat.explose,
    };
  },

  roleDe(etat, joueur) {
    return joueur === etat.joueurs[0] ? 'artificier_nord' : 'artificier_sud';
  },

  appliquer(etat, joueur, action, _maintenant): ResultatAction {
    if (!etat.joueurs.includes(joueur)) return { acceptee: false };
    if (etat.explose) return { acceptee: false };

    const index = action.case;
    if (!Number.isInteger(index) || index < 0 || index >= TAILLE * TAILLE) {
      return { acceptee: false };
    }
    if (etat.devoilees.has(index)) return { acceptee: false };

    if (action.type === 'marquer') {
      if (etat.marquees.has(index)) etat.marquees.delete(index);
      else etat.marquees.add(index);
      return { acceptee: true };
    }

    if (etat.marquees.has(index)) return { acceptee: false };

    if (etat.mines.has(index)) {
      etat.explose = true;
      return { acceptee: true, retour: 'explosion' };
    }

    etat.devoilees.add(index);
    return { acceptee: true, retour: 'sure' };
  },

  terminee(etat) {
    if (etat.explose) return true;
    return etat.devoilees.size >= TAILLE * TAILLE - MINES;
  },

  reussie(etat) {
    return !etat.explose && etat.devoilees.size >= TAILLE * TAILLE - MINES;
  },
};
