/**
 * Le mode test — parcourir dix jours de Sadfy en dix minutes.
 *
 * Il existe parce que le produit est **volontairement lent** : un jeu par jour, dix
 * jours pour atteindre l'endgame. C'est la bonne conception, et c'est aussi ce qui le
 * rend impossible à essayer. Sans ce mode, vérifier ce qui se passe au palier 3 demande
 * d'attendre une semaine.
 *
 * Deux choses seulement, mais elles ouvrent tout :
 *
 * - **un décalage de jours**, qui déplace la date sans toucher à l'horloge du
 *   téléphone ;
 * - **des raccourcis** vers chaque jeu et chaque palier.
 *
 * Deux règles de sûreté :
 *
 * 1. **Il n'existe qu'en mode local.** Sans serveur, il n'y a personne à qui mentir :
 *    on ne peut fabriquer que sa propre progression, dans son propre navigateur. Relié
 *    à un vrai serveur, ce serait une triche — donc l'écran n'apparaît pas.
 * 2. **Il vit dans sa propre clé de stockage**, à côté des vraies données et jamais
 *    dedans. Un réglage de test n'a rien à faire dans le carnet d'une relation, et
 *    l'ajouter aurait imposé une migration à des données qu'on ne peut pas récupérer
 *    si elle se passe mal (§A7).
 */

import { JOUR } from '@sadfy/shared';

import { modeServeur } from './config.js';
import type { Support } from './stockage.js';

export const CLE_TEST = 'sadfy.test';

export interface ReglagesTest {
  /** Nombre de jours ajoutés à la date réelle. Peut être négatif. */
  readonly decalageJours: number;
}

export const REGLAGES_VIERGES: ReglagesTest = { decalageJours: 0 };

/** Le mode test est-il seulement proposé ? */
export const modeTestDisponible = modeServeur === 'local';

let reglages: ReglagesTest = REGLAGES_VIERGES;
const abonnes = new Set<(r: ReglagesTest) => void>();

export function reglagesTest(): ReglagesTest {
  return reglages;
}

/**
 * L'heure vue par l'application.
 *
 * Tout ce qui date quelque chose passe par ici plutôt que par `Date.now()` — sinon le
 * décalage ne s'appliquerait qu'à la moitié du produit, et on verrait une session du
 * jour 4 côtoyer une révélation du jour 1.
 */
export function maintenantTest(): number {
  return Date.now() + reglages.decalageJours * JOUR;
}

export async function chargerReglagesTest(support: Support): Promise<ReglagesTest> {
  if (!modeTestDisponible) return REGLAGES_VIERGES;
  try {
    const brut = await support.lire(CLE_TEST);
    if (brut === null) return reglages;
    const lus = JSON.parse(brut) as Partial<ReglagesTest>;
    reglages = {
      decalageJours:
        typeof lus.decalageJours === 'number' && Number.isFinite(lus.decalageJours)
          ? Math.trunc(lus.decalageJours)
          : 0,
    };
  } catch {
    // Un réglage de test illisible ne doit jamais empêcher l'application de démarrer :
    // il ne vaut rien, on repart de zéro et on continue.
    reglages = REGLAGES_VIERGES;
  }
  prevenir();
  return reglages;
}

export async function reglerDecalageJours(
  support: Support,
  decalageJours: number,
): Promise<void> {
  if (!modeTestDisponible) return;
  reglages = { decalageJours: Math.trunc(decalageJours) };
  await support.ecrire(CLE_TEST, JSON.stringify(reglages));
  prevenir();
}

export function surReglagesTest(ecouteur: (r: ReglagesTest) => void): () => void {
  abonnes.add(ecouteur);
  return () => abonnes.delete(ecouteur);
}

function prevenir(): void {
  for (const ecouteur of abonnes) ecouteur(reglages);
}
