/**
 * La détection de présence entre partenaires.
 *
 * Le serveur reçoit des jetons opaques et ne peut rien faire d'autre que constater
 * qu'ils coïncident. Il ne sait pas où sont les gens, il sait seulement que deux
 * partenaires sont au même endroit (§3.3).
 *
 * Chaque appareil envoie **deux** ensembles, et la distinction compte :
 *
 * - `empreinteExacte` — sa cellule, et elle seule. Sert au **bonus de retrouvailles**,
 *   qui doit être strict : on ne le donne que pour un vrai « même endroit » (§11.8).
 * - `empreintesLarges` — sa cellule et ses 8 voisines. Sert à la **notification**, qui
 *   doit être généreuse : mieux vaut prévenir un peu trop souvent que faire manquer
 *   des retrouvailles à deux personnes séparées par une frontière de cellule.
 *
 * Quatre garde-fous, tous dans ce fichier parce qu'ils sont indissociables de la
 * fonctionnalité (§12.2) :
 *
 * 1. **Symétrie obligatoire** — si A est prévenu, B est prévenu. Toujours. Sans quoi
 *    on pourrait observer quelqu'un à son insu, et c'est la faille principale.
 * 2. **Une notification par partenaire et par jour.** Assez pour se retrouver, trop peu
 *    pour reconstituer un emploi du temps.
 * 3. **Aucun historique.** L'information vit le temps du calcul et disparaît.
 * 4. **Coupure douce respectée** — silencieuse, l'autre n'en sait rien.
 */

import { RELATIONS, type DuoId, type EmpreintePresence, type UserId } from '@sadfy/shared';

export interface DeclarationPresence {
  readonly userId: UserId;
  readonly empreinteExacte: EmpreintePresence;
  readonly empreintesLarges: readonly EmpreintePresence[];
  /**
   * La détection de présence exige l'arrière-plan, donc une application native. Dans
   * un duo natif ↔ web, la symétrie est structurellement impossible : la fonctionnalité
   * ne se déclenche alors pour personne, et l'interface doit le dire pour que ça ne
   * passe pas pour un défaut (§4).
   */
  readonly natif: boolean;
}

export interface DuoSurveille {
  readonly duoId: DuoId;
  readonly a: UserId;
  readonly b: UserId;
  /** Coupure douce : qui a demandé à ne plus être signalé pour ce duo. */
  readonly coupePar: readonly UserId[];
  /** Jour Sadfy de la dernière notification, pour le plafond quotidien. */
  readonly derniereNotificationJour?: number;
}

export interface Retrouvailles {
  readonly duoId: DuoId;
  /** Les deux, toujours. La symétrie n'est pas négociable. */
  readonly prevenir: readonly [UserId, UserId];
  /** Cellule strictement identique : le bonus de retrouvailles s'applique (§11.8). */
  readonly memeCellule: boolean;
}

/**
 * Détecte les retrouvailles parmi les duos surveillés.
 *
 * Fonction pure : aucune écriture, aucun effet de bord, rien de conservé. C'est ce qui
 * permet de garantir par lecture qu'il n'existe pas d'historique.
 */
export function detecterRetrouvailles(
  duos: readonly DuoSurveille[],
  presences: ReadonlyMap<UserId, DeclarationPresence>,
  jourActuel: number,
): readonly Retrouvailles[] {
  const retrouvailles: Retrouvailles[] = [];

  for (const duo of duos) {
    if (duo.derniereNotificationJour !== undefined) {
      const ecoule = jourActuel - duo.derniereNotificationJour;
      if (ecoule < RELATIONS.PRESENCE_MAX_PAR_JOUR) continue;
    }

    const a = presences.get(duo.a);
    const b = presences.get(duo.b);
    if (!a || !b) continue;

    // Sans arrière-plan des deux côtés, la symétrie ne peut pas être tenue : on ne
    // prévient donc personne, plutôt que de prévenir un seul des deux.
    if (!a.natif || !b.natif) continue;

    // La coupure douce d'un seul suffit à tout éteindre — encore la symétrie : si l'un
    // ne veut plus être signalé, l'autre ne doit pas continuer à le voir arriver.
    if (duo.coupePar.length > 0) continue;

    const larges = new Set(a.empreintesLarges);
    const collision = b.empreintesLarges.some((e) => larges.has(e));
    if (!collision) continue;

    retrouvailles.push({
      duoId: duo.duoId,
      prevenir: [duo.a, duo.b],
      memeCellule: a.empreinteExacte === b.empreinteExacte,
    });
  }

  return retrouvailles;
}

// ---------------------------------------------------------------------------
// Pings
// ---------------------------------------------------------------------------

export interface EtatPing {
  readonly duoId: DuoId;
  readonly emetteur: UserId;
  readonly dernierJour?: number;
  readonly sansReponse: number;
}

export type RefusPing = 'deja_aujourd_hui' | 'coupe_apres_trois_sans_reponse';

/**
 * Un ping peut-il partir ?
 *
 * Un par partenaire et par jour, et **coupure automatique après 3 sans réponse**. Sans
 * cette décroissance, un ping quotidien autoriserait quatorze relances en deux semaines
 * sans une seule réponse (§12.4).
 *
 * La coupure est **silencieuse** : l'émetteur n'apprend pas qu'il a été coupé — le lui
 * dire serait lui signifier un refus, ce que le produit ne fait jamais (P5).
 */
export function pingAutorise(etat: EtatPing, jourActuel: number): RefusPing | null {
  if (etat.sansReponse >= RELATIONS.PING_SANS_REPONSE_AVANT_COUPURE) {
    return 'coupe_apres_trois_sans_reponse';
  }
  if (etat.dernierJour !== undefined && etat.dernierJour >= jourActuel) {
    return 'deja_aujourd_hui';
  }
  return null;
}

/** Le destinataire a initié quelque chose : le compteur repart de zéro. */
export function reinitialiserPing(etat: EtatPing): EtatPing {
  return { ...etat, sansReponse: 0 };
}
