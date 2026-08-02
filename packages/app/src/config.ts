/**
 * La configuration de l'application, décidée à la construction.
 *
 * Une seule variable compte vraiment : **l'adresse du serveur**. Son absence n'est pas
 * une panne, c'est un mode.
 *
 * - Adresse fournie → l'application parle à un vrai serveur. C'est la production.
 * - Adresse absente → l'application **fait tourner le serveur en elle-même** (§A10).
 *   Aucun hébergement, aucun compte, aucune carte bancaire : la version publiée sur une
 *   page statique est jouable telle quelle, seul ou à deux onglets.
 *
 * Le second mode n'est pas une maquette. C'est le vrai code du serveur, la vraie salle
 * d'appariement, les vrais moteurs de jeu, les vraies projections de vues. Ce qui lui
 * manque est ce qui suppose un tiers : durer entre deux appareils, prévenir quelqu'un
 * qui n'est pas devant son écran, et donc l'endgame.
 *
 * Les variables `EXPO_PUBLIC_*` sont **inscrites dans le paquet à la construction** et
 * sont donc publiques. Aucun secret ne doit passer par ici — et aucun n'y passe : Sadfy
 * n'a pas de secret côté client autre que la clé privée, qui est engendrée sur
 * l'appareil et n'en sort jamais.
 */

/** Adresse WebSocket du serveur, ou `null` si l'application doit se suffire à elle-même. */
export const urlServeur: string | null = process.env.EXPO_PUBLIC_SADFY_WS ?? null;

export type ModeServeur = 'reseau' | 'local';

export const modeServeur: ModeServeur = urlServeur ? 'reseau' : 'local';

/**
 * Ce qui est indisponible en mode local, et pourquoi.
 *
 * Affiché tel quel dans l'interface. Annoncer une limite coûte moins cher que de
 * laisser quelqu'un croire que l'application est cassée — et c'est la seule façon
 * honnête de proposer une version d'essai.
 */
export const LIMITES_MODE_LOCAL = [
  'Rien n’est partagé entre deux appareils : ton duo vit dans ce navigateur.',
  'Personne ne peut être prévenu quand tu es dans sa zone.',
  'L’endgame — la vraie rencontre — demande un serveur.',
] as const;
