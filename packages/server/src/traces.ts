/**
 * Les traces — la dimension temporelle du vide.
 *
 * Le rayon élastique élargit dans l'**espace**, la trace élargit dans le **temps**.
 * Ensemble, ils couvrent les deux dimensions du problème le plus fréquent des premiers
 * mois : il n'y a personne.
 *
 * Une trace est une **invitation simple** — « quelqu'un est passé par ici et aimerait
 * jouer ». Le défi jouable en différé est écarté de la première version et gardé en
 * évolution possible (§8.1).
 *
 * Et elle a un effet qu'on sous-estime : **ramasser une trace crée l'appariement**. Le
 * duo existe donc avant leur première partie en direct, ce qui fait de leur première
 * rencontre réelle des retrouvailles. Un moment vide devient une graine (§8.3).
 */

import { TRACES, type CelluleId, type UserId, type Vivier } from '@sadfy/shared';

export interface Trace {
  readonly traceId: string;
  readonly auteur: UserId;
  readonly cellule: CelluleId;
  readonly vivier: Vivier;
  readonly creeeLe: number;
  readonly expireLe: number;
}

export type RefusDepot =
  | 'deja_une_trace_active'
  | 'meme_zone_trop_recemment'
  | 'plafond_relations';

/**
 * Une trace peut-elle être déposée ?
 *
 * Trois refus, dont un qui n'est pas évident et qui protège vraiment :
 * **pas deux traces dans la même zone à quelques jours d'intervalle**. Même floue, même
 * expirée, la répétition dessinerait une habitude — le trajet quotidien, le quartier du
 * bureau (§8.2).
 */
export function peutDeposer(params: {
  readonly tracesActives: number;
  readonly derniereTraceMemeZoneLe: number | undefined;
  readonly plafondRelationsAtteint: boolean;
  readonly maintenant: number;
}): RefusDepot | null {
  if (params.plafondRelationsAtteint) return 'plafond_relations';
  if (params.tracesActives >= TRACES.MAX_ACTIVES) return 'deja_une_trace_active';
  if (
    params.derniereTraceMemeZoneLe !== undefined &&
    params.maintenant - params.derniereTraceMemeZoneLe < TRACES.DELAI_MEME_ZONE_MS
  ) {
    return 'meme_zone_trop_recemment';
  }
  return null;
}

export function creerTrace(
  traceId: string,
  auteur: UserId,
  cellule: CelluleId,
  vivier: Vivier,
  maintenant: number,
): Trace {
  return {
    traceId,
    auteur,
    cellule,
    vivier,
    creeeLe: maintenant,
    expireLe: maintenant + TRACES.EXPIRATION_MS,
  };
}

export type RefusRamassage =
  | 'expiree'
  | 'pas_dans_la_zone'
  | 'vivier_different'
  | 'sa_propre_trace'
  | 'plafond_relations';

/**
 * Une trace peut-elle être ramassée ?
 *
 * Il faut être **dans la même zone** — la même cellule d'environ 1 km, pas « à moins
 * d'un kilomètre ». C'est le même concept de zone que partout ailleurs, réutilisé, et
 * ça ne demande aucun calcul de distance donc ça ne divulgue rien.
 *
 * Et **rien n'est proposé à quelqu'un au plafond de relations** : jamais laisser
 * ramasser puis refuser, l'auteur croirait sa trace consommée (§8.2, point A5 de la
 * revue).
 */
export function peutRamasser(params: {
  readonly trace: Trace;
  readonly ramasseur: UserId;
  readonly celluleRamasseur: CelluleId;
  readonly vivierRamasseur: Vivier;
  readonly plafondRelationsAtteint: boolean;
  readonly maintenant: number;
}): RefusRamassage | null {
  if (params.trace.auteur === params.ramasseur) return 'sa_propre_trace';
  if (params.maintenant > params.trace.expireLe) return 'expiree';
  if (params.plafondRelationsAtteint) return 'plafond_relations';
  // Le cloisonnement mineurs/majeurs s'applique intégralement : sinon la trace serait
  // un moyen de le contourner.
  if (params.trace.vivier !== params.vivierRamasseur) return 'vivier_different';
  if (params.trace.cellule !== params.celluleRamasseur) return 'pas_dans_la_zone';
  return null;
}

/**
 * Ce qui est montré d'une trace.
 *
 * **Jamais d'heure précise.** « Récemment », pas « à 18 h 07 » — sinon on donne les
 * habitudes de quelqu'un à un inconnu. Et jamais de position : la zone, et rien de plus
 * (§8.2).
 */
export interface VueTrace {
  readonly traceId: string;
  readonly avatar: string;
  readonly quand: 'a_l_instant' | 'recemment' | 'il_y_a_un_moment';
}

export function vueDeTrace(trace: Trace, avatar: string, maintenant: number): VueTrace {
  const ecoule = maintenant - trace.creeeLe;
  const quand =
    ecoule < 15 * 60_000
      ? 'a_l_instant'
      : ecoule < 2 * 3_600_000
        ? 'recemment'
        : 'il_y_a_un_moment';

  return { traceId: trace.traceId, avatar, quand };
}

/** Purge : une trace expirée ne laisse rien derrière elle. */
export function tracesExpirees(
  traces: readonly Trace[],
  maintenant: number,
): readonly Trace[] {
  return traces.filter((t) => maintenant > t.expireLe);
}
