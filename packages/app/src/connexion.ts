/**
 * La connexion au serveur.
 *
 * Trois responsabilités, et une seule vraiment délicate :
 *
 * 1. **Prouver son identité** en signant un défi. Aucun mot de passe n'existe.
 * 2. **Survivre au réseau mobile.** Une connexion qui tombe dans un tunnel n'est pas
 *    une erreur, c'est le quotidien — et c'est le cas d'usage central du produit.
 * 3. **Détecter une version de protocole trop ancienne** et afficher « mets à jour pour
 *    continuer » plutôt qu'un plantage incompréhensible (§A6).
 */

import {
  VERSION_PROTOCOLE,
  signerDefi,
  type MessageClient,
  type MessageServeur,
} from '@sadfy/shared';

export type EtatConnexion =
  | 'deconnecte'
  | 'connexion'
  | 'authentification'
  | 'connecte'
  /** Le serveur refuse cette version : rien ne sert de réessayer (§A6). */
  | 'mise_a_jour_requise';

export interface OptionsConnexion {
  readonly url: string;
  readonly clePriveeHex: string;
  readonly clePubliqueHex: string;
  /** Injecté pour les tests ; `WebSocket` global en production. */
  readonly fabriquer?: (url: string) => WebSocketLike;
  readonly maintenant?: () => number;
}

export interface WebSocketLike {
  send(donnees: string): void;
  close(): void;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onerror: ((erreur: unknown) => void) | null;
  onmessage: ((evenement: { data: string }) => void) | null;
}

/** Attente avant reconnexion, en millisecondes. */
const RECULS_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000];

export class Connexion {
  #ws: WebSocketLike | null = null;
  #etat: EtatConnexion = 'deconnecte';
  #tentatives = 0;
  #ferméeVolontairement = false;

  readonly #options: OptionsConnexion;
  readonly #ecouteurs = new Set<(message: MessageServeur) => void>();
  readonly #ecouteursEtat = new Set<(etat: EtatConnexion) => void>();

  /**
   * Messages émis pendant une coupure.
   *
   * Ils sont rejoués à la reconnexion : sans cette file, une action faite juste avant
   * d'entrer dans un tunnel serait perdue en silence, et l'utilisateur croirait
   * l'application cassée.
   */
  readonly #enAttente: MessageClient[] = [];

  constructor(options: OptionsConnexion) {
    this.#options = options;
  }

  get etat(): EtatConnexion {
    return this.#etat;
  }

  get messagesEnAttente(): number {
    return this.#enAttente.length;
  }

  surMessage(ecouteur: (message: MessageServeur) => void): () => void {
    this.#ecouteurs.add(ecouteur);
    return () => this.#ecouteurs.delete(ecouteur);
  }

  surEtat(ecouteur: (etat: EtatConnexion) => void): () => void {
    this.#ecouteursEtat.add(ecouteur);
    return () => this.#ecouteursEtat.delete(ecouteur);
  }

  connecter(): void {
    if (this.#etat === 'mise_a_jour_requise') return;
    this.#ferméeVolontairement = false;
    this.#ouvrir();
  }

  fermer(): void {
    this.#ferméeVolontairement = true;
    this.#ws?.close();
    this.#ws = null;
    this.#changerEtat('deconnecte');
  }

  envoyer(message: MessageClient): void {
    if (this.#etat === 'connecte' && this.#ws) {
      this.#ws.send(JSON.stringify(message));
      return;
    }
    this.#enAttente.push(message);
  }

  /** Délai avant la prochaine tentative. Exposé pour que l'interface puisse l'afficher. */
  reculMs(): number {
    return RECULS_MS[Math.min(this.#tentatives, RECULS_MS.length - 1)] ?? 30_000;
  }

  #ouvrir(): void {
    const fabriquer = this.#options.fabriquer ?? defautFabriquer;
    this.#changerEtat('connexion');

    const ws = fabriquer(`${this.#options.url}?v=${VERSION_PROTOCOLE}`);
    this.#ws = ws;

    ws.onopen = () => {
      this.#tentatives = 0;
      this.#changerEtat('authentification');
    };

    ws.onmessage = (evenement) => this.#recevoir(evenement.data);

    ws.onclose = () => {
      this.#ws = null;
      if (this.#ferméeVolontairement || this.#etat === 'mise_a_jour_requise') return;
      this.#changerEtat('deconnecte');
      this.#tentatives += 1;
    };

    ws.onerror = () => {
      // Le navigateur ferme systématiquement après une erreur : `onclose` s'en charge.
    };
  }

  #recevoir(brut: string): void {
    let message: MessageServeur;
    try {
      message = JSON.parse(brut) as MessageServeur;
    } catch {
      return;
    }

    if (message.type === 'defi') {
      // La signature d'un défi unique par connexion : une signature interceptée n'est
      // pas rejouable.
      this.#ws?.send(
        JSON.stringify({
          type: 'bonjour',
          clePublique: this.#options.clePubliqueHex,
          signature: signerDefi(message.nonce, this.#options.clePriveeHex),
        } satisfies MessageClient),
      );
      return;
    }

    if (message.type === 'mise_a_jour_requise') {
      // Rien ne sert de réessayer : c'est l'application qui doit changer.
      this.#changerEtat('mise_a_jour_requise');
      this.#ferméeVolontairement = true;
      return;
    }

    if (message.type === 'bienvenue') {
      this.#changerEtat('connecte');
      this.#viderLaFile();
    }

    for (const ecouteur of this.#ecouteurs) ecouteur(message);
  }

  #viderLaFile(): void {
    const aRejouer = this.#enAttente.splice(0, this.#enAttente.length);
    for (const message of aRejouer) this.#ws?.send(JSON.stringify(message));
  }

  #changerEtat(etat: EtatConnexion): void {
    if (this.#etat === etat) return;
    this.#etat = etat;
    for (const ecouteur of this.#ecouteursEtat) ecouteur(etat);
  }
}

function defautFabriquer(url: string): WebSocketLike {
  return new WebSocket(url) as unknown as WebSocketLike;
}
