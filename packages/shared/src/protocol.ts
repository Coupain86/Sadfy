/**
 * Protocole client ↔ serveur.
 *
 * Deux canaux, selon la nature de l'échange :
 * - **HTTP** pour ce qui est sans état (identité, duos, contenu, signalements) ;
 * - **WebSocket** pour la session vive (recherche, partie, présence).
 *
 * Principe structurant, qui est le cœur de toute la conception asymétrique :
 * **le serveur fait autorité sur l'état de la partie et n'envoie à chaque joueur que
 * SA vue.** L'Artificier ne reçoit jamais le manuel, le Témoin ne reçoit jamais
 * l'interface de construction. Ce n'est pas seulement de l'anti-triche : c'est ce qui
 * rend les jeux asymétriques possibles.
 */

import type {
  ChoixEndgame,
  ChoixQuiChoisit,
  Disponibilite,
  DuoId,
  EmpreintePresence,
  JeuId,
  MotifArret,
  MotifSortiePartie,
  RetourRencontre,
  UserId,
} from './types.js';

// ---------------------------------------------------------------------------
// Enveloppe
// ---------------------------------------------------------------------------

export interface Enveloppe<T> {
  readonly v: number;
  readonly id: string;
  readonly horodatage: number;
  readonly charge: T;
}

// ---------------------------------------------------------------------------
// Client → serveur
// ---------------------------------------------------------------------------

export type MessageClient =
  /** Authentification par signature Ed25519 d'un défi. Aucun mot de passe n'existe. */
  | { readonly type: 'bonjour'; readonly clePublique: string; readonly signature: string }
  | { readonly type: 'disponibilite'; readonly mode: Disponibilite }

  // Recherche — §7
  | {
      readonly type: 'chercher';
      readonly cellule: string;
      readonly cellulesVoisines: readonly string[];
    }
  | { readonly type: 'annuler_recherche' }
  /** Confirmation de l'initiateur sur la proposition. */
  | { readonly type: 'confirmer_proposition'; readonly propositionId: string }
  /** Décliner relance le **jeu**, jamais la personne (§7.4). */
  | { readonly type: 'decliner_jeu'; readonly propositionId: string }
  | { readonly type: 'accepter_proposition'; readonly propositionId: string }

  // Traces — §8
  | { readonly type: 'deposer_trace'; readonly cellule: string }
  | { readonly type: 'ramasser_trace'; readonly traceId: string }

  // Épreuve de convergence — §9.1
  | { readonly type: 'convergence_qui_choisit'; readonly choix: ChoixQuiChoisit }
  | { readonly type: 'convergence_theme'; readonly theme: string }
  | { readonly type: 'choisir_jeu'; readonly jeu: JeuId }

  // Partie — §10
  | { readonly type: 'pret' }
  /** Intention de jeu. Le serveur valide et rediffuse : le client ne décide de rien. */
  | { readonly type: 'action_jeu'; readonly action: unknown }
  | { readonly type: 'message_roue'; readonly messageId: string }
  /** Masque le message chez soi et alimente la modération. Aucun score visible (§10.3). */
  | { readonly type: 'pouce_baisse'; readonly messageId: string }
  | { readonly type: 'quitter_partie'; readonly motif?: MotifSortiePartie }

  // Session quotidienne — §11
  | { readonly type: 'repondre_question'; readonly questionId: string; readonly choix: 0 | 1 | 2 | 3 }
  | { readonly type: 'jaime_reponse'; readonly questionId: string }

  // Présence — §12.2
  | { readonly type: 'empreintes_presence'; readonly empreintes: readonly EmpreintePresence[] }
  | { readonly type: 'ping'; readonly duoId: DuoId }
  | { readonly type: 'couper_notifications'; readonly duoId: DuoId; readonly couper: boolean }
  | { readonly type: 'mettre_en_pause'; readonly duoId: DuoId }
  | { readonly type: 'reactiver'; readonly duoId: DuoId }

  // Endgame — §13
  | { readonly type: 'choix_endgame'; readonly duoId: DuoId; readonly choix: ChoixEndgame; readonly motif?: MotifArret }
  | { readonly type: 'creneaux'; readonly duoId: DuoId; readonly creneaux: readonly number[] }
  | { readonly type: 'je_suis_arrive'; readonly duoId: DuoId }
  | { readonly type: 'je_ne_peux_plus_venir'; readonly duoId: DuoId }
  | { readonly type: 'constater_lapin'; readonly duoId: DuoId; readonly reproposer: boolean }

  // Sécurité — §14
  | { readonly type: 'retour_rencontre'; readonly duoId: DuoId; readonly retour: RetourRencontre }
  | { readonly type: 'signaler'; readonly duoId: DuoId }
  | { readonly type: 'kill_switch'; readonly duoId: DuoId };

// ---------------------------------------------------------------------------
// Serveur → client
// ---------------------------------------------------------------------------

export type MessageServeur =
  | { readonly type: 'defi'; readonly nonce: string }
  | { readonly type: 'bienvenue'; readonly userId: UserId; readonly versionContenu: number }
  | { readonly type: 'mise_a_jour_requise'; readonly minimale: number }

  // Recherche
  /** Élargissement visible : l'utilisateur voit la distance monter (§7.1). */
  | { readonly type: 'scan'; readonly rayonM: number; readonly ecouleMs: number }
  /**
   * Un seul candidat, jamais de liste. On propose un **jeu**, pas une personne :
   * l'avatar est aléatoire, donc il ne dit rien de l'autre (§7.4).
   */
  | {
      readonly type: 'proposition';
      readonly propositionId: string;
      readonly avatar: string;
      readonly jeu: JeuId;
      readonly dureeMs: number;
      readonly expireLe: number;
    }
  /** Aucun refus n'est jamais annoncé. On dit qu'on continue à chercher (P5). */
  | { readonly type: 'recherche_continue' }
  /** Constat neutre, jamais « il a refusé » (§7.5). */
  | { readonly type: 'plus_disponible' }
  | { readonly type: 'personne_trouvee'; readonly proposerTrace: boolean }

  // Convergence
  | {
      readonly type: 'convergence_resultat';
      readonly resultat: unknown;
      readonly vanne: string;
      readonly jeuxProposes?: readonly JeuId[];
    }

  // Partie — chaque joueur ne reçoit que sa vue
  | { readonly type: 'partie_demarre'; readonly jeu: JeuId; readonly role?: string; readonly briefing: string }
  | { readonly type: 'vue_jeu'; readonly vue: unknown; readonly finMancheLe?: number }
  | { readonly type: 'partenaire_deconnecte'; readonly reprendAvantLe: number }
  | { readonly type: 'partenaire_reconnecte' }
  | { readonly type: 'partie_terminee'; readonly reussie: boolean; readonly points: number; readonly motifPartenaire?: MotifSortiePartie }

  // Session
  | { readonly type: 'questions_du_jour'; readonly questions: readonly string[]; readonly jour: number }
  | { readonly type: 'revelation'; readonly contenu: unknown }
  | { readonly type: 'palier_atteint'; readonly duoId: DuoId; readonly debloque: readonly string[] }

  // Présence et duos
  | { readonly type: 'partenaire_dans_la_zone'; readonly duoId: DuoId }
  | { readonly type: 'ping_recu'; readonly duoId: DuoId }
  | { readonly type: 'duos'; readonly duos: unknown }

  // Endgame
  | { readonly type: 'endgame_disponible'; readonly duoId: DuoId }
  | { readonly type: 'endgame_resultat'; readonly duoId: DuoId; readonly contenu: unknown }
  | {
      readonly type: 'rendez_vous';
      readonly duoId: DuoId;
      /** Le point mystère : ni l'un ni l'autre ne l'a choisi (§13.5). */
      readonly lieu: { readonly lat: number; readonly lon: number; readonly nom: string };
      readonly quand: number;
      readonly motDePasse: string;
    }

  | { readonly type: 'erreur'; readonly code: string; readonly message: string };

// ---------------------------------------------------------------------------
// Garde-fou de rédaction
// ---------------------------------------------------------------------------

/**
 * Messages qui ne doivent JAMAIS exister dans le protocole, quelle qu'en soit la
 * raison. Cette liste est vérifiée par un test : elle protège les principes P5 et P3
 * contre une addition distraite six mois plus tard.
 */
export const MESSAGES_INTERDITS = [
  // P5 — un refus ne se révèle jamais (hors endgame, où la transparence l'emporte).
  'proposition_refusee',
  'partenaire_a_refuse',
  'ping_ignore',
  'vu',
  'accuse_lecture',
  // P3 — aucun texte libre entre joueurs.
  'message_libre',
  'texte_libre',
  'chat',
  // P4 — aucun média échangé.
  'photo',
  'image',
  'audio',
  'video',
  // §12.2 — aucune position d'un joueur n'est transmise à un autre.
  'position_partenaire',
  'distance_partenaire',
  'direction_partenaire',
] as const;
