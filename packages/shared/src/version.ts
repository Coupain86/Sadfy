/**
 * Versionnage — trois axes indépendants.
 *
 * C'est ce qui permet de corriger un bug ou d'ajouter des questions sans passer par la
 * validation d'Apple, tout en garantissant que deux téléphones qui n'ont pas la même
 * version puissent quand même jouer ensemble.
 *
 * 1. **Version de l'application** (`1.4.2`) — ce que voit l'utilisateur.
 * 2. **Version du protocole** (entier) — la façon dont téléphones et serveur se parlent.
 *    Quelqu'un qui n'a pas mis à jour depuis trois semaines doit pouvoir jouer avec
 *    quelqu'un qui vient d'installer. En dessous du minimum accepté, l'utilisateur voit
 *    un écran « mets à jour pour continuer » plutôt qu'un plantage.
 * 3. **Version du contenu** (entier) — questions et textes, mis à jour sans toucher à
 *    l'application.
 */

/** Version du protocole embarquée dans cette base de code. */
export const VERSION_PROTOCOLE = 1;

/**
 * Version minimale qu'un client doit annoncer pour être servi.
 *
 * On ne la remonte que lorsqu'un changement rend une ancienne version réellement
 * incapable de fonctionner — jamais par confort. Chaque incrément met dehors tous les
 * utilisateurs qui n'ont pas encore mis à jour.
 */
export const VERSION_PROTOCOLE_MINIMALE = 1;

/** Version du schéma des données stockées sur l'appareil. Pilote les migrations. */
export const VERSION_STOCKAGE_LOCAL = 1;

export type CompatibiliteProtocole =
  | { readonly statut: 'compatible' }
  /** Le client est trop ancien : écran de mise à jour obligatoire. */
  | { readonly statut: 'mise_a_jour_requise'; readonly minimale: number }
  /** Le client est plus récent que le serveur : le serveur doit être déployé. */
  | { readonly statut: 'serveur_obsolete'; readonly serveur: number };

export function verifierProtocole(versionClient: number): CompatibiliteProtocole {
  if (versionClient < VERSION_PROTOCOLE_MINIMALE) {
    return { statut: 'mise_a_jour_requise', minimale: VERSION_PROTOCOLE_MINIMALE };
  }
  if (versionClient > VERSION_PROTOCOLE) {
    return { statut: 'serveur_obsolete', serveur: VERSION_PROTOCOLE };
  }
  return { statut: 'compatible' };
}

// ---------------------------------------------------------------------------
// Migrations du stockage local
// ---------------------------------------------------------------------------

/**
 * Une migration transforme les données locales d'une version vers la suivante.
 *
 * Point le plus délicat de tout le projet : le carnet d'un duo et sa progression vivent
 * sur le téléphone. **Une erreur ici détruit définitivement une relation à 900 points**,
 * sans aucun recours — c'est le prix de l'architecture sans compte.
 *
 * Deux protections, et elles sont toutes les deux obligatoires :
 * - chaque migration est testée sur des données réelles avant publication ;
 * - l'essentiel (duos et points) est dupliqué côté serveur, donc une catastrophe locale
 *   reste réparable. Le carnet détaillé, lui, ne l'est pas.
 */
export interface Migration {
  readonly de: number;
  readonly vers: number;
  readonly appliquer: (donnees: unknown) => unknown;
}

export const MIGRATIONS: readonly Migration[] = [];

/**
 * Applique la suite de migrations menant de `versionActuelle` à la version courante.
 * Lève si le chemin est incomplet — mieux vaut refuser de démarrer que corrompre.
 */
export function migrerStockage(donnees: unknown, versionActuelle: number): unknown {
  if (versionActuelle === VERSION_STOCKAGE_LOCAL) return donnees;

  if (versionActuelle > VERSION_STOCKAGE_LOCAL) {
    throw new Error(
      `Données locales en version ${versionActuelle}, plus récentes que cette ` +
        `application (${VERSION_STOCKAGE_LOCAL}). L'utilisateur a probablement été ` +
        `basculé sur une version antérieure : ne rien écraser.`,
    );
  }

  let courant = donnees;
  let version = versionActuelle;

  while (version < VERSION_STOCKAGE_LOCAL) {
    const migration = MIGRATIONS.find((m) => m.de === version);
    if (!migration) {
      throw new Error(
        `Aucune migration depuis la version ${version}. Chemin de migration incomplet.`,
      );
    }
    courant = migration.appliquer(courant);
    version = migration.vers;
  }

  return courant;
}
