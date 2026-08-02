/**
 * Le stockage local.
 *
 * **C'est l'endroit le plus dangereux de tout le projet.**
 *
 * Sadfy n'a pas de comptes : le carnet d'un duo et sa progression vivent sur le
 * téléphone. Une migration ratée détruit **définitivement** une relation à 900 points,
 * sans aucun recours. Il n'y a pas de « mot de passe oublié », pas de support qui puisse
 * restaurer quoi que ce soit — c'est le prix de l'architecture sans compte (§A7).
 *
 * D'où trois règles, appliquées ici sans exception :
 *
 * 1. **Toute écriture est validée avant d'écraser.** Si les données relues ne
 *    correspondent pas à ce qu'on croyait écrire, on n'écrase pas.
 * 2. **On refuse de démarrer plutôt que de corrompre.** Des données plus récentes que
 *    l'application — l'utilisateur a été basculé sur une version antérieure — ne sont
 *    jamais réécrites.
 * 3. **L'essentiel est dupliqué côté serveur.** Duos et points survivent à une
 *    catastrophe locale. Le carnet détaillé, lui, ne survit pas : c'est assumé, et c'est
 *    la raison pour laquelle ce fichier est aussi prudent.
 */

import {
  VERSION_STOCKAGE_LOCAL,
  migrerStockage,
  type DuoId,
  type ProfilLocal,
  type UserId,
} from '@sadfy/shared';

// ---------------------------------------------------------------------------
// Ce qui est stocké
// ---------------------------------------------------------------------------

export interface EntreeCarnet {
  readonly jour: number;
  readonly questionId: string;
  readonly maReponse: number;
  readonly saReponse?: number;
  readonly jaime?: boolean;
}

export interface DuoLocal {
  readonly duoId: DuoId;
  readonly partenaire: UserId;
  readonly points: number;
  readonly etat: string;
  readonly rencontreLe: number;
  /**
   * Cellule de la première rencontre. **Elle ne quitte jamais l'appareil.**
   *
   * C'est elle qui permet de tirer le point mystère de l'endgame sans que le serveur
   * sache où le duo s'est rencontré : les deux téléphones la connaissent et partagent
   * une graine, donc ils tombent sur le même lieu (§13.5).
   */
  readonly cellulePremiereRencontre: string;
  readonly offsetMinutes: number;
  readonly carnet: readonly EntreeCarnet[];
}

export interface DonneesLocales {
  readonly version: number;
  readonly identite: {
    readonly clePriveeHex: string;
    readonly clePubliqueHex: string;
    readonly userId: UserId;
  } | null;
  readonly profil: ProfilLocal | null;
  readonly duos: readonly DuoLocal[];
}

export const DONNEES_VIERGES: DonneesLocales = {
  version: VERSION_STOCKAGE_LOCAL,
  identite: null,
  profil: null,
  duos: [],
};

// ---------------------------------------------------------------------------
// Le support
// ---------------------------------------------------------------------------

/**
 * Abstraction du support de stockage.
 *
 * Sur mobile, la clé privée va dans le trousseau sécurisé et le reste dans le stockage
 * ordinaire ; sur le web, tout va dans `localStorage`, avec la limite connue et
 * documentée : **Safari purge le stockage local après sept jours sans visite**. C'est
 * l'une des raisons pour lesquelles la version web est une version d'essai (§4).
 */
export interface Support {
  lire(cle: string): Promise<string | null>;
  ecrire(cle: string, valeur: string): Promise<void>;
  supprimer(cle: string): Promise<void>;
}

export const CLE_DONNEES = 'sadfy.donnees';
export const CLE_SAUVEGARDE = 'sadfy.donnees.sauvegarde';

export class ErreurStockage extends Error {}

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

/**
 * Charge les données locales, en appliquant les migrations si nécessaire.
 *
 * Ne renvoie **jamais** de données partiellement migrées : soit tout le chemin de
 * migration existe et s'applique, soit on lève. Il vaut infiniment mieux un écran
 * d'erreur qu'un carnet à moitié converti qu'on écraserait ensuite.
 */
export async function charger(support: Support): Promise<DonneesLocales> {
  const brut = await support.lire(CLE_DONNEES);
  if (brut === null) return DONNEES_VIERGES;

  let donnees: unknown;
  try {
    donnees = JSON.parse(brut);
  } catch {
    // Données illisibles : on tente la sauvegarde avant de rendre les armes.
    return await restaurerDepuisSauvegarde(support);
  }

  const version = versionDe(donnees);
  if (version === null) return await restaurerDepuisSauvegarde(support);

  // Lève si le chemin de migration est incomplet, ou si les données viennent d'une
  // version plus récente que cette application.
  const migrees = migrerStockage(donnees, version);
  return migrees as DonneesLocales;
}

function versionDe(donnees: unknown): number | null {
  if (typeof donnees !== 'object' || donnees === null) return null;
  const version = (donnees as { version?: unknown }).version;
  return typeof version === 'number' && Number.isInteger(version) ? version : null;
}

async function restaurerDepuisSauvegarde(support: Support): Promise<DonneesLocales> {
  const sauvegarde = await support.lire(CLE_SAUVEGARDE);
  if (sauvegarde === null) {
    throw new ErreurStockage(
      'Données locales illisibles et aucune sauvegarde disponible. Ne rien écraser : ' +
        'le serveur peut restaurer les duos et les points.',
    );
  }
  try {
    const donnees = JSON.parse(sauvegarde) as unknown;
    const version = versionDe(donnees);
    if (version === null) throw new Error('sauvegarde illisible');
    return migrerStockage(donnees, version) as DonneesLocales;
  } catch {
    throw new ErreurStockage('Données locales et sauvegarde toutes deux illisibles.');
  }
}

// ---------------------------------------------------------------------------
// Écriture
// ---------------------------------------------------------------------------

/**
 * Enregistre, en conservant une sauvegarde de l'état précédent.
 *
 * L'ordre compte : **on sauvegarde l'ancien avant d'écrire le nouveau.** Si l'écriture
 * échoue à mi-chemin — batterie, application tuée par le système —, la sauvegarde
 * contient encore un état cohérent.
 *
 * Et on **relit ce qu'on vient d'écrire** : sur mobile, une écriture peut échouer
 * silencieusement quand le disque est plein, et on préfère le savoir tout de suite
 * plutôt qu'au prochain démarrage.
 */
export async function enregistrer(
  support: Support,
  donnees: DonneesLocales,
): Promise<void> {
  if (donnees.version !== VERSION_STOCKAGE_LOCAL) {
    throw new ErreurStockage(
      `Refus d'écrire des données en version ${donnees.version} alors que cette ` +
        `application est en version ${VERSION_STOCKAGE_LOCAL}.`,
    );
  }

  const precedent = await support.lire(CLE_DONNEES);
  if (precedent !== null) await support.ecrire(CLE_SAUVEGARDE, precedent);

  const charge = JSON.stringify(donnees);
  await support.ecrire(CLE_DONNEES, charge);

  const relu = await support.lire(CLE_DONNEES);
  if (relu !== charge) {
    throw new ErreurStockage(
      "L'écriture n'a pas été confirmée à la relecture. Le disque est peut-être plein.",
    );
  }
}

// ---------------------------------------------------------------------------
// Le magasin — la seule façon d'écrire
// ---------------------------------------------------------------------------

/**
 * Le détenteur des données locales, et le seul chemin par lequel elles changent.
 *
 * Il existe à cause d'un bug qui a détruit exactement ce que ce fichier était censé
 * protéger. L'inscription enchaînait deux mises à jour — créer l'identité, puis
 * enregistrer le profil — et chacune partait de l'état capturé au dernier rendu de
 * React. La seconde écrasait donc la première : **l'identité, qui est le seul secret
 * irremplaçable de l'application, était effacée à la fin de l'inscription.** Aucune
 * erreur, aucun avertissement ; simplement, au rechargement suivant, l'utilisateur se
 * retrouvait au premier écran comme s'il n'avait jamais existé.
 *
 * Deux garanties, et il faut les deux :
 *
 * 1. **Chaque transformation part de l'état le plus récent**, jamais d'une copie
 *    capturée ailleurs.
 * 2. **Les écritures sont sérialisées.** Comme écrire est asynchrone, deux mises à
 *    jour lancées ensemble pourraient sinon lire toutes deux l'état d'avant et la
 *    seconde effacer la première — le même bug, revenu par une autre porte.
 */
export class MagasinLocal {
  readonly #support: Support;
  #donnees: DonneesLocales = DONNEES_VIERGES;
  /** File d'attente : elle rend le lire-modifier-écrire indivisible. */
  #file: Promise<unknown> = Promise.resolve();

  constructor(support: Support) {
    this.#support = support;
  }

  get donnees(): DonneesLocales {
    return this.#donnees;
  }

  async charger(): Promise<DonneesLocales> {
    const chargees = await charger(this.#support);
    this.#donnees = chargees;
    return chargees;
  }

  maj(
    transformation: (donnees: DonneesLocales) => DonneesLocales,
  ): Promise<DonneesLocales> {
    const suivante = this.#file.then(async () => {
      const suivantes = transformation(this.#donnees);
      await enregistrer(this.#support, suivantes);
      // L'état en mémoire n'avance qu'une fois l'écriture confirmée : sinon on
      // afficherait une progression que le disque n'a pas gardée.
      this.#donnees = suivantes;
      return suivantes;
    });

    // La file ne doit pas rester bloquée sur un échec : l'erreur part à l'appelant,
    // la file, elle, repart.
    this.#file = suivante.catch(() => undefined);
    return suivante;
  }
}

// ---------------------------------------------------------------------------
// Opérations sur les duos
// ---------------------------------------------------------------------------

export function duoDe(donnees: DonneesLocales, duoId: DuoId): DuoLocal | undefined {
  return donnees.duos.find((d) => d.duoId === duoId);
}

/** Met à jour un duo, ou l'ajoute. Ne perd jamais le carnet existant. */
export function majDuo(
  donnees: DonneesLocales,
  duoId: DuoId,
  transformation: (duo: DuoLocal) => DuoLocal,
  creation: () => DuoLocal,
): DonneesLocales {
  const existant = duoDe(donnees, duoId);
  if (!existant) return { ...donnees, duos: [...donnees.duos, creation()] };

  return {
    ...donnees,
    duos: donnees.duos.map((d) => (d.duoId === duoId ? transformation(d) : d)),
  };
}

/**
 * Le Kill Switch efface le duo localement — mais il faut savoir ce que ça ne fait pas.
 *
 * Le blocage lui-même est **réciproque et côté serveur** : c'est lui qui compte. Cette
 * suppression locale n'est que du confort visuel. Et le carnet resté sur l'appareil de
 * l'autre n'est pas effaçable — acceptable, il ne contient rien d'identifiant, mais il
 * ne faut pas laisser croire à un effacement total (§14.5).
 */
export function oublierDuo(donnees: DonneesLocales, duoId: DuoId): DonneesLocales {
  return { ...donnees, duos: donnees.duos.filter((d) => d.duoId !== duoId) };
}
