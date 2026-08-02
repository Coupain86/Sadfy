/**
 * @sadfy/shared — le noyau de règles.
 *
 * Tout ce qui décide de quelque chose dans Sadfy vit ici : les constantes de la spec,
 * le calcul des points et des paliers, les règles d'âge et d'appariement, le protocole.
 * L'application et le serveur importent le même code, donc il leur est impossible de ne
 * pas être d'accord sur ce que vaut une partie.
 *
 * La spec de référence est `docs/SPEC-v2.md`. Chaque règle porte le numéro de la
 * section dont elle est issue.
 */

export * from './constants.js';
export * from './types.js';
export * from './age.js';
export * from './paliers.js';
export * from './session.js';
export * from './matching.js';
export * from './version.js';
export * from './protocol.js';
export * from './vues.js';
export * from './geohash.js';
export * from './crypto.js';
