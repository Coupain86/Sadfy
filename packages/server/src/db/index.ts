/**
 * Accès à la base.
 *
 * Volontairement mince. Le serveur ne stocke presque rien (§17), donc il n'y a presque
 * rien à écrire ici — et c'est la meilleure garantie qu'on puisse donner.
 */

import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

import { RELATIONS, type DuoId, type UserId } from '@sadfy/shared';

import { config } from '../config.js';

export const pool = new Pool({ connectionString: config.urlBase });

export async function migrer(): Promise<void> {
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
}

/** Enregistre un joueur, ou met à jour sa dernière visite. Idempotent. */
export async function enregistrerJoueur(
  userId: UserId,
  clePublique: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO joueur (user_id, cle_publique)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET vu_le = now()`,
    [userId, clePublique],
  );
}

export interface DuoEnBase {
  readonly duoId: DuoId;
  readonly a: UserId;
  readonly b: UserId;
  readonly points: number;
  readonly etat: string;
  readonly offsetMinutes: number;
  readonly derniereSessionJour: number | null;
  readonly arreteePar: UserId | null;
}

export async function duosDe(userId: UserId): Promise<readonly DuoEnBase[]> {
  const { rows } = await pool.query(
    `SELECT duo_id, joueur_a, joueur_b, points, etat, offset_minutes,
            derniere_session_jour, arretee_par
     FROM duo
     WHERE (joueur_a = $1 OR joueur_b = $1) AND etat <> 'bloquee'
     ORDER BY derniere_activite DESC`,
    [userId],
  );

  return rows.map((r) => ({
    duoId: r.duo_id as DuoId,
    a: r.joueur_a as UserId,
    b: r.joueur_b as UserId,
    points: r.points as number,
    etat: r.etat as string,
    offsetMinutes: r.offset_minutes as number,
    derniereSessionJour: r.derniere_session_jour as number | null,
    arreteePar: r.arretee_par as UserId | null,
  }));
}

/**
 * Nombre de relations qui comptent dans le plafond (§12.1).
 *
 * Seules les relations **actives** comptent. Une mise en pause — manuelle,
 * automatique, ou consécutive à un arrêt d'endgame — libère immédiatement le créneau,
 * et **des deux côtés** : sans ça, celui qui n'a rien décidé se retrouverait avec une
 * relation morte immobilisant un créneau pour toujours.
 */
export async function relationsActives(userId: UserId): Promise<number> {
  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM duo
     WHERE (joueur_a = $1 OR joueur_b = $1) AND etat = 'active'`,
    [userId],
  );
  return (rows[0]?.n as number | undefined) ?? 0;
}

export async function plafondAtteint(userId: UserId): Promise<boolean> {
  return (await relationsActives(userId)) >= RELATIONS.PLAFOND_ACTIVES;
}

/** Blocages : réciproques et définitifs (§14.5). */
export async function bloquesDe(userId: UserId): Promise<readonly UserId[]> {
  const { rows } = await pool.query(
    `SELECT joueur_a, joueur_b FROM blocage WHERE joueur_a = $1 OR joueur_b = $1`,
    [userId],
  );
  return rows.map((r) => (r.joueur_a === userId ? r.joueur_b : r.joueur_a) as UserId);
}

export async function bloquer(a: UserId, b: UserId): Promise<void> {
  const [premier, second] = [a, b].sort();
  await pool.query(
    `INSERT INTO blocage (joueur_a, joueur_b) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [premier, second],
  );
  await pool.query(
    `UPDATE duo SET etat = 'bloquee' WHERE joueur_a = $1 AND joueur_b = $2`,
    [premier, second],
  );
}

/** Partenaires déjà connus : on ne réapparie jamais deux personnes déjà liées (§7.7). */
export async function partenairesDe(userId: UserId): Promise<readonly UserId[]> {
  const { rows } = await pool.query(
    `SELECT joueur_a, joueur_b FROM duo WHERE joueur_a = $1 OR joueur_b = $1`,
    [userId],
  );
  return rows.map((r) => (r.joueur_a === userId ? r.joueur_b : r.joueur_a) as UserId);
}

export interface Fiabilite {
  readonly score: number;
  readonly exclu: boolean;
}

/** Interne, jamais affiché, jamais transmis à quiconque (§14.6). */
export async function fiabiliteDe(userId: UserId): Promise<Fiabilite> {
  const { rows } = await pool.query(
    `SELECT score_fiabilite, exclu FROM joueur WHERE user_id = $1`,
    [userId],
  );
  return {
    score: (rows[0]?.score_fiabilite as number | undefined) ?? 1,
    exclu: (rows[0]?.exclu as boolean | undefined) ?? false,
  };
}

/**
 * Un abandon **silencieux** dégrade le score. Un départ expliqué ne compte pas : le
 * système récompense ainsi la politesse sans jamais le dire (§10.7).
 */
export async function noterAbandonSilencieux(userId: UserId): Promise<void> {
  await pool.query(
    `UPDATE joueur
     SET abandons_silencieux = abandons_silencieux + 1,
         score_fiabilite = greatest(0, score_fiabilite - 0.1)
     WHERE user_id = $1`,
    [userId],
  );
}

export async function fermer(): Promise<void> {
  await pool.end();
}
