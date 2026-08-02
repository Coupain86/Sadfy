/**
 * Metro — l'assembleur qui transforme les sources en application.
 *
 * Trois réglages, aucun cosmétique. Sans eux la version web ne se construit tout
 * simplement pas.
 *
 * 1. **Le dépôt est un monorepo.** Les dépendances sont installées à la racine, pas
 *    dans `packages/app`. Metro, laissé seul, ne regarde que le dossier de
 *    l'application et ne trouve ni React ni `@sadfy/shared`.
 *
 * 2. **`@sadfy/server/noyau` n'est pas le point d'entrée du paquet serveur.** Il n'est
 *    atteignable que par la carte `exports`, que Metro n'honore pas par défaut. C'est
 *    ce chemin qui permet de faire tourner un vrai serveur dans l'application.
 *
 * 3. **Le code écrit `./x.js` là où le fichier s'appelle `./x.ts`.** C'est la
 *    convention de TypeScript en modules ES — l'extension est celle du fichier
 *    *compilé*. Le serveur et le noyau partagé en dépendent, et changer de convention
 *    dans la seule application aurait créé deux dialectes dans un même dépôt.
 */

const fs = require('node:fs');
const path = require('node:path');

const { getDefaultConfig } = require('expo/metro-config');

const racineApp = __dirname;
const racineDepot = path.resolve(racineApp, '../..');

const config = getDefaultConfig(racineApp);

// 1 — monorepo
config.watchFolders = [racineDepot];
config.resolver.nodeModulesPaths = [
  path.resolve(racineApp, 'node_modules'),
  path.resolve(racineDepot, 'node_modules'),
];

// 2 — carte `exports`
config.resolver.unstable_enablePackageExports = true;

// 3 — `./x.js` → `./x.ts`
const EXTENSIONS_SOURCE = ['.ts', '.tsx'];

config.resolver.resolveRequest = (contexte, nom, plateforme) => {
  if (nom.endsWith('.js') && (nom.startsWith('./') || nom.startsWith('../'))) {
    const sansExtension = path.resolve(
      path.dirname(contexte.originModulePath),
      nom.slice(0, -'.js'.length),
    );
    for (const extension of EXTENSIONS_SOURCE) {
      const candidat = sansExtension + extension;
      if (fs.existsSync(candidat)) return { type: 'sourceFile', filePath: candidat };
    }
  }
  return contexte.resolveRequest(contexte, nom, plateforme);
};

module.exports = config;
