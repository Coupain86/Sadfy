/**
 * Le choix d'apparence, conservé d'une session à l'autre.
 *
 * Séparé de `theme.ts` volontairement : le thème sait **quelles couleurs**, il n'a pas à
 * savoir **où c'est écrit**. C'est aussi ce qui permet de le tester sans stockage.
 *
 * Le réglage par défaut est `systeme` : suivre le téléphone est ce à quoi les gens
 * s'attendent, et ça évite d'imposer un fond blanc à quelqu'un qui ouvre l'application
 * à minuit dans son lit.
 */

import { reglerApparence, type ChoixApparence } from './theme.js';
import type { Support } from './stockage.js';

export const CLE_APPARENCE = 'sadfy.apparence';

function valide(valeur: unknown): valeur is ChoixApparence {
  return valeur === 'systeme' || valeur === 'clair' || valeur === 'sombre';
}

export async function chargerApparence(support: Support): Promise<void> {
  try {
    const brut = await support.lire(CLE_APPARENCE);
    if (valide(brut)) reglerApparence(brut);
  } catch {
    // Un réglage d'apparence illisible ne doit jamais empêcher l'application de
    // démarrer : on garde celui par défaut et on continue.
  }
}

export async function enregistrerApparence(
  support: Support,
  choix: ChoixApparence,
): Promise<void> {
  reglerApparence(choix);
  await support.ecrire(CLE_APPARENCE, choix);
}
