/**
 * Le registre des parties en cours.
 *
 * Fait le lien entre la salle d'appariement — qui produit des duos — et le moteur de
 * parties, qui les fait jouer. C'est la pièce qui manquait entre les deux : sans elle,
 * la logique existait des deux côtés sans que rien ne les relie.
 *
 * Reste sans réseau ni base : la couche WebSocket traduit les événements produits ici.
 */

import { PARTIE, type JeuId, type UserId } from '@sadfy/shared';

import { moteurDe } from './jeux/index.js';
import { Partie, type EvenementPartie } from './moteur.js';

interface Vivante {
  readonly partie: Partie<unknown, unknown>;
  readonly joueurs: readonly [UserId, UserId];
  readonly jeu: JeuId;
  readonly demarreeLe: number;
  readonly memeCellule: boolean;
}

export class PartiesVives {
  readonly #parties = new Map<string, Vivante>();
  /** Un joueur ne peut être que dans une partie à la fois. */
  readonly #parJoueur = new Map<UserId, string>();

  get nombre(): number {
    return this.#parties.size;
  }

  partieDe(joueur: UserId): string | undefined {
    return this.#parJoueur.get(joueur);
  }

  demarrer(
    id: string,
    joueurs: readonly [UserId, UserId],
    jeu: JeuId,
    graine: number,
    maintenant: number,
    memeCellule: boolean,
  ): readonly EvenementPartie[] {
    const moteur = moteurDe(jeu);
    const partie = new Partie(moteur, joueurs, graine);

    this.#parties.set(id, { partie, joueurs, jeu, demarreeLe: maintenant, memeCellule });
    for (const joueur of joueurs) this.#parJoueur.set(joueur, id);

    // Le briefing précède toujours la partie : sans lui, les vingt premières secondes
    // d'un jeu asymétrique sont de la confusion pure (§9.5).
    return [...partie.briefer(), ...partie.demarrer(maintenant)];
  }

  agir(joueur: UserId, action: unknown, maintenant: number): readonly EvenementPartie[] {
    const vivante = this.#trouver(joueur);
    if (!vivante) return [];
    const evenements = vivante.partie.agir(joueur, action, maintenant);
    this.#nettoyerSiTerminee(joueur);
    return evenements;
  }

  quitter(
    joueur: UserId,
    motif: Parameters<Partie<unknown, unknown>['quitter']>[1],
    maintenant: number,
  ): readonly EvenementPartie[] {
    const vivante = this.#trouver(joueur);
    if (!vivante) return [];
    const evenements = vivante.partie.quitter(joueur, motif, maintenant);
    this.#nettoyerSiTerminee(joueur);
    return evenements;
  }

  /**
   * Une déconnexion **n'est pas un abandon** : la partie se met en pause et attend.
   * Confondre les deux punirait exactement les joueurs en transport (§10.6).
   */
  deconnecter(joueur: UserId, maintenant: number): readonly EvenementPartie[] {
    return this.#trouver(joueur)?.partie.deconnecter(joueur, maintenant) ?? [];
  }

  reconnecter(joueur: UserId, maintenant: number): readonly EvenementPartie[] {
    return this.#trouver(joueur)?.partie.reconnecter(joueur, maintenant) ?? [];
  }

  /** Horloge : chronomètres de manche, inactivité, fenêtre de reconnexion. */
  tick(maintenant: number): readonly EvenementPartie[] {
    const evenements: EvenementPartie[] = [];

    for (const [id, vivante] of [...this.#parties]) {
      evenements.push(...vivante.partie.tick(maintenant));

      if (vivante.partie.phase === 'terminee') {
        this.#retirer(id);
        continue;
      }
      // Filet de sécurité : une partie qui traîne bien au-delà de toute durée
      // plausible est nettoyée, sinon une fuite de mémoire s'installe en silence.
      if (maintenant - vivante.demarreeLe > 6 * PARTIE.REPRISE_POSSIBLE_MS) {
        this.#retirer(id);
      }
    }

    return evenements;
  }

  /** Résumé d'une partie terminée : sert au calcul des points et à la fiabilité. */
  resume(id: string) {
    const vivante = this.#parties.get(id);
    if (!vivante) return undefined;
    return { ...vivante.partie.resume, memeCellule: vivante.memeCellule };
  }

  #trouver(joueur: UserId): Vivante | undefined {
    const id = this.#parJoueur.get(joueur);
    return id ? this.#parties.get(id) : undefined;
  }

  #nettoyerSiTerminee(joueur: UserId): void {
    const id = this.#parJoueur.get(joueur);
    if (!id) return;
    if (this.#parties.get(id)?.partie.phase === 'terminee') this.#retirer(id);
  }

  #retirer(id: string): void {
    const vivante = this.#parties.get(id);
    if (!vivante) return;
    for (const joueur of vivante.joueurs) this.#parJoueur.delete(joueur);
    this.#parties.delete(id);
  }
}
