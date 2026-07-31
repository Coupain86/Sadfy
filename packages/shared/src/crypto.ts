/**
 * Identité et confidentialité cryptographiques.
 *
 * Sadfy n'a **pas de comptes** : ni email, ni mot de passe, ni numéro de téléphone.
 * L'identité d'un joueur est une paire de clés Ed25519 générée sur son appareil, et
 * il prouve qui il est en signant un défi. Le serveur ne stocke jamais rien qui
 * permette de le retrouver ailleurs.
 *
 * Ce module porte aussi la brique qui rend la détection de présence acceptable : le
 * **secret de duo**, dérivé par échange Diffie-Hellman entre les deux appareils. Le
 * serveur ne peut pas le calculer, donc il ne peut pas savoir où sont les gens — il
 * ne peut que constater que deux empreintes opaques coïncident.
 */

import { ed25519, x25519 } from '@noble/curves/ed25519.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';

import type { CelluleId, DuoId, EmpreintePresence, UserId } from './types.js';

export interface Identite {
  /** Ne quitte JAMAIS l'appareil. */
  readonly clePriveeHex: string;
  readonly clePubliqueHex: string;
  readonly userId: UserId;
}

/** Génère une identité. Aucun serveur n'est contacté, rien n'est déclaré. */
export function genererIdentite(): Identite {
  const clePrivee = ed25519.utils.randomSecretKey();
  const clePublique = ed25519.getPublicKey(clePrivee);
  return {
    clePriveeHex: bytesToHex(clePrivee),
    clePubliqueHex: bytesToHex(clePublique),
    userId: userIdDe(bytesToHex(clePublique)),
  };
}

/**
 * Identifiant public : les 16 premiers octets de l'empreinte de la clé publique.
 *
 * Tronqué volontairement — 128 bits suffisent largement à éviter toute collision à
 * l'échelle de l'application, et un identifiant court reste lisible dans les journaux
 * quand il faut déboguer.
 */
export function userIdDe(clePubliqueHex: string): UserId {
  return bytesToHex(sha256(hexToBytes(clePubliqueHex)).slice(0, 16)) as UserId;
}

/** Signe un défi. Le client seul en est capable : la clé privée ne sort pas. */
export function signerDefi(defi: string, clePriveeHex: string): string {
  return bytesToHex(ed25519.sign(utf8ToBytes(defi), hexToBytes(clePriveeHex)));
}

/** Vérifie une signature de défi. Ne lève jamais : une entrée malformée est un échec. */
export function verifierDefi(
  defi: string,
  signatureHex: string,
  clePubliqueHex: string,
): boolean {
  try {
    return ed25519.verify(
      hexToBytes(signatureHex),
      utf8ToBytes(defi),
      hexToBytes(clePubliqueHex),
    );
  } catch {
    return false;
  }
}

/**
 * Identifiant d'un duo : dérivé des deux identifiants, dans un ordre stable.
 *
 * L'ordre est imposé par le tri, sinon A et B calculeraient deux identifiants
 * différents pour la même relation et rien ne se retrouverait jamais.
 */
export function duoIdDe(a: UserId, b: UserId): DuoId {
  const [premier, second] = [a, b].sort();
  return bytesToHex(sha256(utf8ToBytes(`${premier}|${second}`)).slice(0, 16)) as DuoId;
}

/**
 * Secret partagé d'un duo, dérivé par Diffie-Hellman à partir des deux paires de clés.
 *
 * **Le serveur ne peut pas le calculer** — c'est tout l'intérêt. Chacun des deux
 * appareils l'obtient de son côté, à partir de sa propre clé privée et de la clé
 * publique de l'autre, sans que rien de secret ne transite.
 *
 * Sans cette propriété, la détection de présence obligerait le serveur à tenir une
 * carte vivante de qui est où : il n'y a que quelques millions de cellules habitées,
 * donc un secret connu du serveur serait cassé par force brute en quelques secondes.
 */
export function secretDuo(maClePriveeHex: string, saClePubliqueHex: string): Uint8Array {
  const monX = ed25519.utils.toMontgomerySecret(hexToBytes(maClePriveeHex));
  const sonX = ed25519.utils.toMontgomery(hexToBytes(saClePubliqueHex));
  const partage = x25519.getSharedSecret(monX, sonX);
  // On dérive plutôt que d'utiliser le point brut : le résultat de l'échange n'est pas
  // uniformément distribué, le hacher est la pratique attendue.
  return sha256(partage);
}

/**
 * Empreinte de présence : `HMAC(cellule, secret du duo)`.
 *
 * Le serveur ne peut rien faire d'autre que constater l'égalité de deux empreintes.
 * Il n'apprend ni où c'est, ni ce que ça vaut — seulement que deux jetons opaques
 * coïncident, donc que deux partenaires sont dans la même zone (§3.3, §12.2).
 *
 * `periode` fait tourner l'empreinte dans le temps : sans elle, un même lieu
 * produirait éternellement le même jeton, et le serveur pourrait reconnaître un
 * endroit récurrent sans jamais savoir lequel — ce qui suffirait à dessiner des
 * habitudes.
 */
export function empreintePresence(
  cellule: CelluleId,
  secret: Uint8Array,
  periode: number,
): EmpreintePresence {
  const message = utf8ToBytes(`${cellule}|${periode}`);
  return bytesToHex(hmac(sha256, secret, message).slice(0, 16)) as EmpreintePresence;
}

/** Période courante pour la rotation des empreintes : une par heure. */
export function periodePresence(instant: number): number {
  return Math.floor(instant / 3_600_000);
}

/** Aléa cryptographique, pour les défis et les identifiants de proposition. */
export function alea(octets = 16): string {
  const tampon = new Uint8Array(octets);
  crypto.getRandomValues(tampon);
  return bytesToHex(tampon);
}
