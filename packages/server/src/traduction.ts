/**
 * La traduction des événements internes en messages de protocole.
 *
 * Elle existe parce qu'elle a manqué. La salle d'appariement émet
 * `proposition_initiateur` ; le protocole, lui, définit `proposition`. Les deux
 * vocabulaires avaient divergé sans que rien ne le signale — et le résultat était
 * silencieux et total : **l'application n'aurait jamais affiché une seule
 * proposition**, sans erreur, sans avertissement, sans plantage.
 *
 * Les casts qui traversaient les frontières sans vérification étaient la vraie cause.
 * Cette fonction rend la frontière explicite, et un test garantit que chaque événement
 * possible y trouve une traduction.
 */

import type { MessageServeur, UserId } from '@sadfy/shared';

import type { EvenementPartie } from './moteur.js';
import type { Evenement as EvenementSalle } from './salle.js';

export interface MessageAdresse {
  readonly pour: UserId;
  readonly message: MessageServeur;
}

/**
 * Certains événements ne quittent **jamais** le serveur.
 *
 * `apparies` déclenche le démarrage d'une partie côté serveur ; l'envoyer au client ne
 * lui apprendrait rien d'utile et exposerait l'identifiant de l'autre avant l'heure.
 */
export function traduireSalle(evenement: EvenementSalle): MessageAdresse | null {
  switch (evenement.type) {
    case 'scan':
      return {
        pour: evenement.pour,
        message: { type: 'scan', rayonM: evenement.rayonM, ecouleMs: evenement.ecouleMs },
      };

    // Les deux faces d'une proposition deviennent le même message : le destinataire
    // n'a pas à savoir s'il est l'initiateur ou la cible, et ne pas le lui dire évite
    // de laisser deviner qui a cherché qui.
    case 'proposition_initiateur':
    case 'proposition_cible':
      return {
        pour: evenement.pour,
        message: {
          type: 'proposition',
          propositionId: evenement.propositionId,
          avatar: evenement.avatar,
          jeu: evenement.jeu,
          dureeMs: 0,
          expireLe: evenement.expireLe,
        },
      };

    case 'recherche_continue':
      return { pour: evenement.pour, message: { type: 'recherche_continue' } };

    case 'plus_disponible':
      return { pour: evenement.pour, message: { type: 'plus_disponible' } };

    case 'personne_trouvee':
      return {
        pour: evenement.pour,
        message: { type: 'personne_trouvee', proposerTrace: true },
      };

    case 'apparies':
      return null;
  }
}

export function traduirePartie(evenement: EvenementPartie): MessageAdresse | null {
  switch (evenement.type) {
    case 'briefing':
      return {
        pour: evenement.pour,
        message: {
          type: 'partie_demarre',
          // Le jeu vient de l'événement, jamais de l'appelant. Quand il venait de
          // l'appelant, aucun appelant ne le connaissait : les deux écrivaient
          // `'la_scie'` en dur et toutes les parties s'annonçaient sous ce nom.
          jeu: evenement.jeu,
          role: evenement.role,
          briefing: evenement.texte,
        },
      };

    case 'vue':
      return {
        pour: evenement.pour,
        message: {
          type: 'vue_jeu',
          vue: evenement.vue,
          finMancheLe: evenement.finMancheLe,
        },
      };

    case 'rappel_inactivite':
      return { pour: evenement.pour, message: { type: 'rappel_inactivite' } };

    case 'partenaire_deconnecte':
      return {
        pour: evenement.pour,
        message: {
          type: 'partenaire_deconnecte',
          reprendAvantLe: evenement.reprendAvantLe,
        },
      };

    case 'partenaire_reconnecte':
      return { pour: evenement.pour, message: { type: 'partenaire_reconnecte' } };

    case 'manche_terminee':
      return {
        pour: evenement.pour,
        message: { type: 'manche_terminee', reussie: evenement.reussie },
      };

    case 'partie_terminee':
      return {
        pour: evenement.pour,
        message: {
          type: 'partie_terminee',
          reussie: evenement.reussie,
          // Le motif s'il a été donné, et rien d'autre : le caractère silencieux d'un
          // départ ne quitte jamais le serveur (§10.7).
          ...(evenement.motifPartenaire
            ? { motifPartenaire: evenement.motifPartenaire }
            : {}),
          points: 0,
        },
      };
  }
}
