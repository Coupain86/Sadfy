/**
 * Les supports de stockage, par plateforme.
 *
 * La clé privée est le seul secret de l'application : elle **est** l'identité du
 * joueur. Sur mobile, elle va dans le trousseau sécurisé du système, pas dans le
 * stockage ordinaire.
 *
 * Sur le web, ce trousseau n'existe pas — d'où une limite qu'il faut annoncer plutôt
 * que cacher : **Safari purge le stockage local après sept jours sans visite.** Une
 * relation à 900 points construite depuis un navigateur peut donc disparaître toute
 * seule. C'est l'une des raisons pour lesquelles la version web est une version
 * d'essai (§4).
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { Support } from './stockage.js';

/** Clés qui contiennent un secret et doivent aller au trousseau. */
const SECRETES = new Set(['sadfy.identite']);

export const supportNatif: Support = {
  async lire(cle) {
    return await SecureStore.getItemAsync(assainir(cle));
  },
  async ecrire(cle, valeur) {
    await SecureStore.setItemAsync(assainir(cle), valeur, {
      // Le trousseau reste lisible après un redémarrage sans déverrouillage : sans ça,
      // les notifications de présence ne pourraient pas fonctionner en arrière-plan.
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  },
  async supprimer(cle) {
    await SecureStore.deleteItemAsync(assainir(cle));
  },
};

export const supportWeb: Support = {
  async lire(cle) {
    return globalThis.localStorage?.getItem(cle) ?? null;
  },
  async ecrire(cle, valeur) {
    globalThis.localStorage?.setItem(cle, valeur);
  },
  async supprimer(cle) {
    globalThis.localStorage?.removeItem(cle);
  },
};

export const support: Support = Platform.OS === 'web' ? supportWeb : supportNatif;

/** `expo-secure-store` n'accepte pas les points dans les clés. */
function assainir(cle: string): string {
  return cle.replace(/\./g, '_');
}

export function estSecrete(cle: string): boolean {
  return SECRETES.has(cle);
}

/**
 * La version web perd-elle des capacités ?
 *
 * Utilisé pour l'annoncer honnêtement dans l'interface plutôt que de laisser croire à
 * un dysfonctionnement : sans arrière-plan, il n'y a ni notification de présence, ni
 * sollicitation application fermée, et l'endgame est indisponible (§4, §C7 de la revue).
 */
export const capacites = {
  arrierePlan: Platform.OS !== 'web',
  notificationsPresence: Platform.OS !== 'web',
  endgame: Platform.OS !== 'web',
  stockageDurable: Platform.OS !== 'web',
} as const;
