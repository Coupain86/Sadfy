/** Types du domaine Sadfy. Partagés à l'identique par l'application et le serveur. */

// ---------------------------------------------------------------------------
// Identité
// ---------------------------------------------------------------------------

/**
 * Identifiant public d'un joueur : l'empreinte de sa clé publique Ed25519.
 * Ce n'est pas un compte — il n'existe ni email, ni mot de passe, ni profil serveur.
 */
export type UserId = string & { readonly __brand: 'UserId' };

/** Identifiant d'un duo, dérivé des deux UserId de façon stable et ordonnée. */
export type DuoId = string & { readonly __brand: 'DuoId' };

/** Cellule géographique d'environ 1 km (geohash de 6 caractères). */
export type CelluleId = string & { readonly __brand: 'CelluleId' };

/**
 * Empreinte de présence : HMAC(cellule, secret partagé du duo). Le serveur ne peut
 * que constater l'égalité de deux empreintes — il n'apprend ni où c'est, ni ce que
 * ça vaut (§3.3).
 */
export type EmpreintePresence = string & { readonly __brand: 'EmpreintePresence' };

// ---------------------------------------------------------------------------
// Profil local — ne quitte jamais l'appareil, sauf mention contraire
// ---------------------------------------------------------------------------

export type Genre = 'femme' | 'homme' | 'autre' | 'non_declare';

/** Filtre de genre. « peu importe » par défaut, pour ne pas fragmenter le vivier (§5.2). */
export type FiltreGenre = 'femmes' | 'hommes' | 'peu_importe';

/**
 * Tranches d'âge. Servent à deux choses : la révélation au palier 2, et le tirage
 * des questions dans l'intersection des tranches des deux joueurs (§11.5 bis).
 */
export type TrancheAge = '13-15' | '16-17' | '18-25' | '26-39' | '40-55' | '56+';

/** Les deux viviers d'appariement, hermétiquement étanches (§5.4). */
export type Vivier = 'mineur' | 'majeur';

export interface ProfilLocal {
  /** Date de naissance au format ISO. Ne quitte JAMAIS l'appareil (§5.2). */
  readonly dateNaissance: string;
  readonly genre: Genre;
  readonly filtreGenre: FiltreGenre;
  /** Écart d'âge maximal accepté, en années. Ignoré dans le vivier mineur (§5.4). */
  readonly ecartAgeMax: number;
  /** Demandé à l'approche du palier 2, jamais au premier lancement (§11.4). */
  readonly pseudo?: string;
  /** Trois emojis, demandés à l'approche du palier 3. */
  readonly passions?: readonly string[];
}

// ---------------------------------------------------------------------------
// Disponibilité — §6.1
// ---------------------------------------------------------------------------

/**
 * Le téléphone sait deviner le déplacement ; il ne sait pas deviner l'envie.
 * D'où une question sur la disponibilité plutôt que sur la mobilité.
 */
export type Disponibilite =
  /** J'ai du temps, jeux longs possibles. */
  | 'pose'
  /** J'ai dix minutes, jeux courts. L'épreuve de convergence est sautée. */
  | 'en_mouvement'
  /** Ouvert à rencontrer quelqu'un aujourd'hui. Débloque le créneau du jour même. */
  | 'dispo_pour_de_vrai';

// ---------------------------------------------------------------------------
// Paliers — §11.4
// ---------------------------------------------------------------------------

export type Palier = 'fantome' | 'partenaire' | 'equipe' | 'decision';

/** Ce que la révélation de fin de session laisse voir, selon le palier (§11.5). */
export type NiveauRevelation =
  /** Palier 1 : le nombre de convergences seul, jamais lesquelles. */
  | 'nombre_seul'
  /** Palier 2 : la liste détaillée, qui s'accumule dans le carnet. */
  | 'liste_detaillee'
  /** Palier 3 : la liste, plus le pourcentage global. */
  | 'liste_et_pourcentage';

// ---------------------------------------------------------------------------
// Relations — §12
// ---------------------------------------------------------------------------

export type EtatRelation =
  /** Compte dans le plafond, session quotidienne disponible. */
  | 'active'
  /** Mise en pause manuelle ou automatique. Ne compte plus dans le plafond,
   *  rien n'est supprimé, réactivable (§12.1, §12.5). */
  | 'en_pause'
  /** Un des deux a choisi « je préfère qu'on en reste là ». Seul lui peut rouvrir,
   *  et le créneau est libéré des deux côtés (§13.3). */
  | 'arretee'
  /** Kill Switch : blocage réciproque et définitif (§14.5). */
  | 'bloquee';

export interface Relation {
  readonly duoId: DuoId;
  readonly partenaire: UserId;
  readonly etat: EtatRelation;
  readonly points: number;
  /** Horodatage de la première rencontre — sert au point mystère de l'endgame (§13.5). */
  readonly rencontreLe: number;
  /** Cellule de la première rencontre. C'est là qu'est tiré le point mystère. */
  readonly cellulePremiereRencontre: CelluleId;
  /** Dernière session comptabilisée, en jours Sadfy (§11.3). */
  readonly derniereSessionJour?: number;
  /** Qui a arrêté, quand l'état est « arretee ». Lui seul peut rouvrir (§13.3). */
  readonly arreteePar?: UserId;
}

// ---------------------------------------------------------------------------
// Session quotidienne — §11.1
// ---------------------------------------------------------------------------

export interface Question {
  readonly id: string;
  readonly texte: string;
  /** Quatre propositions. Aucun texte libre nulle part (P3). */
  readonly choix: readonly [string, string, string, string];
  /** Tranches auxquelles la question s'adresse. Vide = fonds universel (§11.5 bis). */
  readonly tranches: readonly TrancheAge[];
  /** Le cloisonnement du contenu suit celui des viviers d'appariement (§5.4). */
  readonly vivier: Vivier | 'les_deux';
  readonly theme: string;
}

export interface ReponseQuestion {
  readonly questionId: string;
  readonly choix: 0 | 1 | 2 | 3;
  readonly repondueLe: number;
}

export type EtapeSession =
  | 'questions_en_attente'
  | 'questions_completes'
  | 'jeu_en_attente'
  | 'jeu_termine'
  | 'revelation';

export interface Session {
  readonly duoId: DuoId;
  /** Jour Sadfy (§11.3), pas jour calendaire. */
  readonly jour: number;
  readonly etape: EtapeSession;
  readonly questions: readonly string[];
  readonly reponses: Readonly<Record<string, readonly ReponseQuestion[]>>;
  /** « J'aime » posés sur les réponses de l'autre, limités par session (§11.5). */
  readonly jaimes: Readonly<Record<string, readonly string[]>>;
  readonly pointsQuestions?: number;
  readonly pointsJeu?: number;
  /** Session jouée dans la même zone : multiplicateur de retrouvailles (§11.8). */
  readonly memeZone: boolean;
}

// ---------------------------------------------------------------------------
// Jeux — §15.2
// ---------------------------------------------------------------------------

export type JeuId =
  | 'blind_match'
  | 'la_scie'
  | 'portrait_robot'
  | 'demineur_cooperatif'
  | 'convergence';

export type Symetrie = 'symetrique' | 'asymetrique';

/** Les jeux tour par tour survivent aux coupures du métro ; le temps réel strict
 *  n'y survit pas. C'est le critère qui a façonné le catalogue (§15.2). */
export type ModeReseau = 'tour_par_tour' | 'temps_reel_tolerant';

export interface DefinitionJeu {
  readonly id: JeuId;
  readonly nom: string;
  readonly palier: Palier;
  readonly symetrie: Symetrie;
  readonly reseau: ModeReseau;
  /** Durée annoncée avant d'accepter — quelqu'un dans le métro doit savoir (§9.6). */
  readonly dureeMancheMs: number;
  /** Trois lignes maximum, affichées avant chaque partie (§9.5). */
  readonly briefing: Readonly<Record<string, string>>;
  /** Un jeu asymétrique se joue en manche double avec rôles inversés (§9.3). */
  readonly roles?: readonly [string, string];
  /** Un jeu de quiz fait porter l'épreuve de convergence sur le thème (§9.1). */
  readonly convergenceSurTheme: boolean;
}

// ---------------------------------------------------------------------------
// Épreuve de convergence — §9.1
// ---------------------------------------------------------------------------

export type FormeConvergence = 'qui_choisit' | 'quel_theme';

export type ChoixQuiChoisit = 'moi' | 'l_autre';

export type ResultatConvergence =
  /** Accord : l'un a dit « moi », l'autre « l'autre ». Le désigné choisit. */
  | { readonly type: 'accord'; readonly designe: UserId }
  /** Deux chefs. */
  | { readonly type: 'desaccord_deux_moi' }
  /** Deux polis. */
  | { readonly type: 'desaccord_deux_autres' }
  /** Thèmes identiques : l'application le souligne. */
  | { readonly type: 'themes_identiques'; readonly theme: string }
  /** Thèmes différents : on les mélange. Personne n'a perdu (§9.1). */
  | { readonly type: 'themes_melanges'; readonly themes: readonly [string, string] };

// ---------------------------------------------------------------------------
// Endgame — §13
// ---------------------------------------------------------------------------

export type ChoixEndgame =
  | 'rencontre'
  | 'reseaux'
  | 'en_rester_la'
  | 'continuer_a_jouer';

export type MotifArret =
  | 'pas_pret'
  | 'preferer_le_jeu'
  | 'pas_le_bon_moment';

export interface EtatEndgame {
  readonly duoId: DuoId;
  readonly tour: 1 | 2;
  readonly choix: Readonly<Record<string, ChoixEndgame>>;
  readonly tentatives: number;
  readonly derniereTentativeLe?: number;
  readonly lapins: number;
  /** Qui ouvre la grille de disponibilités : la femme, sinon tirage au sort (§13.4). */
  readonly quiOuvre?: UserId;
}

// ---------------------------------------------------------------------------
// Sécurité — §14
// ---------------------------------------------------------------------------

export type RetourRencontre =
  | 'bien_passe'
  | 'mal_passe'
  | 'quelque_chose_de_grave'
  | 'bloquer';

export type MotifSortiePartie =
  | 'probleme_connexion'
  | 'dois_y_aller'
  | 'jeu_ne_plait_pas'
  | 'reprendre_plus_tard';
