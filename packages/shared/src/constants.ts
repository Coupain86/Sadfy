/**
 * Toutes les valeurs chiffrées de la spec, en un seul endroit.
 *
 * Règle de contribution : aucun nombre magique ailleurs dans le code. Si une valeur
 * vient de `docs/SPEC-v2.md`, elle vit ici avec la référence de sa section, pour que
 * modifier la spec et modifier le code restent un seul geste.
 */

/** Durées, exprimées en millisecondes. */
export const MINUTE = 60_000;
export const HEURE = 60 * MINUTE;
export const JOUR = 24 * HEURE;

// ---------------------------------------------------------------------------
// Géographie — §7.1, §11.8
// ---------------------------------------------------------------------------

export const GEO = {
  /** Rayon de départ de toute recherche, et taille de la zone de retrouvailles. */
  RAYON_INITIAL_M: 1_000,
  /** Paliers d'élargissement quand personne n'est trouvé (§7.1). */
  PALIERS_ELARGISSEMENT_M: [1_000, 2_000, 5_000, 10_000, 20_000] as const,
  /** Au-delà, « on aurait pu se croiser » ne tient plus : on préfère ne rien proposer. */
  RAYON_MAX_M: 25_000,
  /** Durée totale du scan avant de proposer une trace ou le mode solo (§7.8). */
  DUREE_SCAN_MS: 45_000,
  /**
   * Longueur du geohash utilisé pour les cellules. 6 caractères ≈ 1,2 km × 0,6 km,
   * l'approximation la plus proche de la zone d'1 km (§3.3).
   */
  PRECISION_GEOHASH: 6,
} as const;

// ---------------------------------------------------------------------------
// Économie de points — §11.1, §11.3, §11.8
// ---------------------------------------------------------------------------

export const POINTS = {
  /** Questions asynchrones : la part qui ne dépend d'aucune synchronisation (§11.2). */
  QUESTIONS: 40,
  /** Jeu synchrone. */
  JEU: 60,
  /** Total nominal d'une session complète. */
  SESSION_NOMINALE: 100,
  /** Bornes de variation pour éviter le simple compteur (§11.3). */
  SESSION_MIN: 80,
  SESSION_MAX: 120,
  /** Multiplicateur quand la session est jouée dans la même zone (§11.8). */
  MULTIPLICATEUR_RETROUVAILLES: 1.5,
} as const;

// ---------------------------------------------------------------------------
// Paliers — §11.4
// ---------------------------------------------------------------------------

export const SEUILS_PALIERS = {
  PARTENAIRE: 200,
  EQUIPE: 600,
  DECISION: 1_000,
} as const;

// ---------------------------------------------------------------------------
// Rythme — §11.3
// ---------------------------------------------------------------------------

export const RYTHME = {
  /**
   * La journée Sadfy court de 4 h à 4 h. Une session tardive est rattachée à la veille,
   * ce qui correspond au ressenti et empêche d'encadrer minuit pour gagner deux jours
   * de progression en une soirée.
   */
  HEURE_BASCULE_JOUR: 4,
  /** Nombre de questions posées par session. */
  QUESTIONS_PAR_SESSION_MIN: 3,
  QUESTIONS_PAR_SESSION_MAX: 5,
  /** « J'aime » attribuables par session : rares, donc signifiants (§11.5). */
  JAIME_PAR_SESSION: 2,
} as const;

// ---------------------------------------------------------------------------
// Relations — §12
// ---------------------------------------------------------------------------

export const RELATIONS = {
  /** Plafond de relations actives (§12.1). Sadfy n'est pas une app où l'on collectionne. */
  PLAFOND_ACTIVES: 4,
  /** Mise en sommeil automatique, sans rien supprimer (§12.5). */
  SOMMEIL_APRES_MS: 14 * JOUR,
  /** Notifications de présence : une par partenaire et par jour (§12.2). */
  PRESENCE_MAX_PAR_JOUR: 1,
  /** Pings : un par partenaire et par jour (§12.4). */
  PING_MAX_PAR_JOUR: 1,
  /** Décroissance : au-delà, les pings sont coupés dans ce sens, silencieusement (§12.4). */
  PING_SANS_REPONSE_AVANT_COUPURE: 3,
} as const;

// ---------------------------------------------------------------------------
// Recherche et sollicitations — §7.2, §7.5
// ---------------------------------------------------------------------------

export const RECHERCHE = {
  /** Sollicitations « quelqu'un veut jouer » reçues par jour, application fermée (§7.2). */
  SOLLICITATIONS_MAX_PAR_JOUR: 3,
  /** Plage nocturne pendant laquelle aucune sollicitation n'est envoyée. */
  NUIT_DEBUT_HEURE: 22,
  NUIT_FIN_HEURE: 8,
  /** Temps laissé pour sortir son téléphone et ouvrir la proposition (§7.5). */
  DELAI_ARRIVEE_MS: 60_000,
  /** Temps pour décider — ne démarre qu'à l'ouverture réelle de la proposition (§7.5). */
  DELAI_DECISION_MS: 20_000,
  /** Durée de vie d'une demande, pendant laquelle l'initiateur peut ranger son téléphone. */
  DUREE_DEMANDE_MS: 2 * MINUTE,
  /** Temps laissé à l'initiateur pour revenir après une acceptation (§7.5). */
  DELAI_RETOUR_INITIATEUR_MS: 30_000,
  /** Nombre maximum de jeux proposés au gagnant de l'épreuve de convergence (§9.1). */
  JEUX_PROPOSES_MAX: 5,
} as const;

// ---------------------------------------------------------------------------
// Traces — §8.2
// ---------------------------------------------------------------------------

export const TRACES = {
  EXPIRATION_MS: 6 * HEURE,
  /** Une seule trace active par personne, pour ne pas tapisser une ville. */
  MAX_ACTIVES: 1,
  /** Pas deux traces dans la même zone à quelques jours d'intervalle : la répétition
   *  dessinerait une habitude. */
  DELAI_MEME_ZONE_MS: 7 * JOUR,
} as const;

// ---------------------------------------------------------------------------
// Partie — §9, §10
// ---------------------------------------------------------------------------

export const PARTIE = {
  /** Temps de réflexion de l'épreuve de convergence, sinon le système tranche (§9.1). */
  CONVERGENCE_MS: 5_000,
  /** Rappel discret puis fin propre, quand un joueur ne fait plus rien (§10.5). */
  INACTIVITE_RAPPEL_MS: 15_000,
  INACTIVITE_FIN_MS: 2 * MINUTE,
  /** Fenêtre de reconnexion après une coupure réseau — le métro (§10.6). */
  RECONNEXION_MS: 2 * MINUTE,
  /** Au-delà, on ne propose plus « reprendre » mais « rejouer » (§10.8). */
  REPRISE_POSSIBLE_MS: 2 * HEURE,
  /** Tolérance sur toute contrainte temporelle en jeu : le réseau mobile varie de
   *  80 à 150 ms, le « à la milliseconde près » de la v1 est irréalisable (§15.2). */
  TOLERANCE_SYNCHRO_MS: 300,
} as const;

// ---------------------------------------------------------------------------
// Âge — §5.4, §11.7
// ---------------------------------------------------------------------------

export const AGE = {
  /** Alignement sur Instagram, Snapchat et Facebook (§5.4). */
  MINIMUM: 13,
  MAJORITE: 18,
  /** Écart maximal par défaut chez les majeurs, réglable par l'utilisateur (§11.7). */
  ECART_DEFAUT_MAJEUR: 15,
  /** Écart maximal chez les mineurs. Non réglable : avec une plage de 13 à 17 ans,
   *  le défaut majeur autoriserait un appariement 13/17 (§5.4). */
  ECART_MAX_MINEUR: 2,
} as const;

// ---------------------------------------------------------------------------
// Endgame — §13
// ---------------------------------------------------------------------------

export const ENDGAME = {
  /** Délai avant de pouvoir relancer une Décision qui n'a pas abouti (§13.1). */
  DELAI_RELANCE_MS: 7 * JOUR,
  /** Au-delà, la Décision cesse d'être proposée automatiquement (§13.1). */
  TENTATIVES_MAX: 3,
  /** Deux lapins et l'option rencontre se ferme pour ce duo (§13.5 bis). */
  LAPINS_AVANT_FERMETURE: 2,
  /** Délai après l'heure convenue avant de considérer que l'autre ne viendra pas. */
  DELAI_CONSTAT_LAPIN_MS: 30 * MINUTE,
} as const;

// ---------------------------------------------------------------------------
// Sécurité — §14
// ---------------------------------------------------------------------------

export const SECURITE = {
  /** Nombre de retours « ça s'est mal passé », émanant de personnes distinctes,
   *  avant exclusion de l'appariement (§14.6). */
  SIGNALEMENTS_AVANT_EXCLUSION: 3,
  /** Un seul retour « quelque chose de grave » peut suffire (§14.6). */
  SIGNALEMENTS_GRAVES_AVANT_EXCLUSION: 1,
  /** Abandons silencieux répétés avant dépriorisation. Un départ expliqué ne compte
   *  jamais : le système récompense la politesse sans le dire (§10.7). */
  ABANDONS_SILENCIEUX_AVANT_DEPRIORISATION: 3,
} as const;
