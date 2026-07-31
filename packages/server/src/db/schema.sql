-- Schéma Sadfy.
--
-- Il est aussi court que possible, et c'est volontaire : ce qui n'est pas écrit ne
-- peut pas fuiter, ne peut pas être réquisitionné, et n'a pas à être protégé.
-- Chaque table ci-dessous doit pouvoir justifier son existence.
--
-- Ce qui n'est délibérément NULLE PART dans ce fichier :
--
--   * la date de naissance et le genre — ils vivent sur l'appareil, et seuls une
--     tranche et un bit majeur/mineur circulent, le temps d'une recherche (§5.2) ;
--   * toute position, sous quelque forme que ce soit — y compris la cellule où un
--     duo s'est rencontré. Voir la note sur le point mystère plus bas ;
--   * le déroulé des parties — rien n'en subsiste après la fin (§17) ;
--   * le carnet du duo — il appartient aux deux appareils.

-- ---------------------------------------------------------------------------
-- Joueurs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS joueur (
  user_id           TEXT PRIMARY KEY,
  cle_publique      TEXT NOT NULL UNIQUE,
  cree_le           TIMESTAMPTZ NOT NULL DEFAULT now(),
  vu_le             TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Interne, jamais affiché à quiconque, jamais transmis (§14.6). Dépriorise dans
  -- l'appariement ; seule une accumulation finit par exclure.
  score_fiabilite   REAL NOT NULL DEFAULT 1.0,
  abandons_silencieux INTEGER NOT NULL DEFAULT 0,
  exclu             BOOLEAN NOT NULL DEFAULT FALSE,

  -- Attestation d'appareil (App Attest / Play Integrity). Sans elle, une exclusion
  -- ne vaut rien : il suffirait de réinstaller (§3.2).
  appareil_atteste  BOOLEAN NOT NULL DEFAULT FALSE
);

-- ---------------------------------------------------------------------------
-- Duos
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS duo (
  duo_id            TEXT PRIMARY KEY,
  joueur_a          TEXT NOT NULL REFERENCES joueur(user_id) ON DELETE CASCADE,
  joueur_b          TEXT NOT NULL REFERENCES joueur(user_id) ON DELETE CASCADE,

  -- La progression appartient au duo, jamais à l'individu (P6).
  points            INTEGER NOT NULL DEFAULT 0,

  -- 'active' | 'en_pause' | 'arretee' | 'bloquee' (§12).
  etat              TEXT NOT NULL DEFAULT 'active',
  -- Qui a dit « je préfère qu'on en reste là ». Lui seul peut rouvrir (§13.3).
  arretee_par       TEXT,

  rencontre_le      TIMESTAMPTZ NOT NULL DEFAULT now(),
  derniere_activite TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Décalage horaire de référence, figé à la création. Les deux se sont rencontrés
  -- physiquement, donc dans le même fuseau ; le conserver garantit qu'ils restent
  -- d'accord sur la date même s'ils s'éloignent ensuite (§11.3).
  offset_minutes    INTEGER NOT NULL DEFAULT 0,
  -- Jour Sadfy de la dernière session comptabilisée. Une seule par jour (§11.3).
  derniere_session_jour INTEGER,

  CONSTRAINT duo_ordonne CHECK (joueur_a < joueur_b)
);

CREATE INDEX IF NOT EXISTS duo_par_joueur_a ON duo (joueur_a) WHERE etat <> 'bloquee';
CREATE INDEX IF NOT EXISTS duo_par_joueur_b ON duo (joueur_b) WHERE etat <> 'bloquee';

-- NOTE — LE POINT MYSTÈRE ET L'ABSENCE DE POSITION
--
-- L'endgame tire un lieu de rendez-vous dans la zone où le duo s'est rencontré
-- (§13.5). La tentation serait d'écrire cette cellule ici. On ne le fait pas : ce
-- serait une position, permanente, pour chaque relation — de quoi reconstituer le
-- quartier de quelqu'un à partir de quelques duos.
--
-- Les deux appareils connaissent déjà cette cellule. Le tirage du lieu est donc fait
-- côté client, à partir de la cellule locale et d'une graine dérivée du duo_id : les
-- deux téléphones tombent nécessairement sur le même lieu, sans que le serveur ait
-- jamais su lequel ni où.
--
-- Le bonus de retrouvailles n'a pas besoin de position non plus : la collision de
-- deux empreintes de présence prouve que les deux sont dans la même cellule, sans
-- révéler laquelle (§3.3).

-- ---------------------------------------------------------------------------
-- Blocages
-- ---------------------------------------------------------------------------

-- Kill Switch : réciproque et définitif. C'est la seule fonctionnalité qui exige
-- vraiment que le serveur retienne quelque chose — un blocage purement local
-- rendrait l'autre invisible pour soi, mais on resterait visible pour lui (§14.5).
CREATE TABLE IF NOT EXISTS blocage (
  joueur_a          TEXT NOT NULL,
  joueur_b          TEXT NOT NULL,
  cree_le           TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (joueur_a, joueur_b),
  CONSTRAINT blocage_ordonne CHECK (joueur_a < joueur_b)
);

-- Le cran en dessous du bouton rouge : « ne plus me signaler cette personne ».
-- Silencieux et réversible. Sans lui, personne n'utilise le Kill Switch, et donc
-- personne ne se protège (§14.5).
CREATE TABLE IF NOT EXISTS coupure_douce (
  duo_id            TEXT NOT NULL REFERENCES duo(duo_id) ON DELETE CASCADE,
  par               TEXT NOT NULL,
  PRIMARY KEY (duo_id, par)
);

-- ---------------------------------------------------------------------------
-- Sollicitations — plafonds anti-harcèlement
-- ---------------------------------------------------------------------------

-- Un ping par partenaire et par jour, et coupure automatique après 3 sans réponse
-- (§12.4). La coupure douce existe, mais elle exige une action délibérée de la
-- personne sollicitée — or c'est précisément le profil qu'il faut protéger sans
-- rien lui demander.
CREATE TABLE IF NOT EXISTS ping (
  duo_id            TEXT NOT NULL REFERENCES duo(duo_id) ON DELETE CASCADE,
  emetteur          TEXT NOT NULL,
  jour              INTEGER NOT NULL,
  sans_reponse      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (duo_id, emetteur)
);

-- Une notification de présence par partenaire et par jour (§12.2). Aucun historique
-- n'est conservé : la ligne porte un compteur, jamais un lieu ni une heure précise.
CREATE TABLE IF NOT EXISTS presence_notifiee (
  duo_id            TEXT NOT NULL REFERENCES duo(duo_id) ON DELETE CASCADE,
  jour              INTEGER NOT NULL,
  PRIMARY KEY (duo_id, jour)
);

-- ---------------------------------------------------------------------------
-- Traces
-- ---------------------------------------------------------------------------

-- Seule table qui touche à la géographie, et sous une forme volontairement pauvre :
-- une cellule d'environ 1 km, sans heure précise, effacée au bout de quelques heures.
-- Une seule trace active par personne, et pas deux dans la même zone à quelques jours
-- d'intervalle — sinon la répétition dessinerait une habitude (§8.2).
CREATE TABLE IF NOT EXISTS trace (
  trace_id          TEXT PRIMARY KEY,
  auteur            TEXT NOT NULL REFERENCES joueur(user_id) ON DELETE CASCADE,
  cellule           TEXT NOT NULL,
  vivier            TEXT NOT NULL,
  cree_le           TIMESTAMPTZ NOT NULL DEFAULT now(),
  expire_le         TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS trace_par_cellule ON trace (cellule, vivier);
CREATE UNIQUE INDEX IF NOT EXISTS trace_une_par_auteur ON trace (auteur);

-- ---------------------------------------------------------------------------
-- Endgame
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS endgame (
  duo_id            TEXT PRIMARY KEY REFERENCES duo(duo_id) ON DELETE CASCADE,
  tour              INTEGER NOT NULL DEFAULT 1,
  choix_a           TEXT,
  choix_b           TEXT,
  -- Délai de 7 jours entre deux Décisions, et plafond de 3 tentatives : sans ce
  -- verrou, celui qui veut se rencontrer pourrait reposer la question tous les jours
  -- à celui qui ne veut pas — une machine à pression (§13.1).
  tentatives        INTEGER NOT NULL DEFAULT 0,
  derniere_tentative TIMESTAMPTZ,
  -- Deux lapins et l'option rencontre se ferme pour ce duo (§13.5 bis).
  lapins            INTEGER NOT NULL DEFAULT 0,
  qui_ouvre         TEXT
);

-- ---------------------------------------------------------------------------
-- Signalements
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS signalement (
  id                BIGSERIAL PRIMARY KEY,
  duo_id            TEXT,
  signale_par       TEXT NOT NULL,
  vise              TEXT NOT NULL,
  -- 'bien_passe' | 'mal_passe' | 'quelque_chose_de_grave' | 'bloquer' (§14.1).
  retour            TEXT NOT NULL,
  cree_le           TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Texte libre et email : réservés au canal mineurs (§14.2). C'est le seul endroit
  -- de toute l'application où Sadfy détient une donnée personnelle, et c'est assumé
  -- et annoncé. Purgés après traitement.
  texte_mineur      TEXT,
  email_mineur      TEXT,
  traite_le         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS signalement_par_vise ON signalement (vise, retour);
CREATE INDEX IF NOT EXISTS signalement_a_traiter ON signalement (cree_le) WHERE traite_le IS NULL;
