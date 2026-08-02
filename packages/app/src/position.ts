/**
 * La position — obtenue, convertie, oubliée.
 *
 * Trois lignes de conduite, qui sont des règles du produit et pas des précautions :
 *
 * - **La position ne quitte jamais l'appareil.** Ce module rend des coordonnées à
 *   l'appelant, qui les transforme immédiatement en numéro de cellule (§A5). Rien ici
 *   n'écrit sur le disque et rien n'est envoyé.
 * - **Une précision grossière suffit.** Une cellule fait un kilomètre : demander mieux
 *   coûterait de la batterie et n'apporterait rien, sinon un risque.
 * - **Un refus n'est jamais un mur.** L'appelant reçoit un état, pas une exception, et
 *   l'écran propose autre chose (P1).
 */

import * as Location from 'expo-location';

export type ResultatPosition =
  | { readonly etat: 'obtenue'; readonly lat: number; readonly lon: number }
  /** L'utilisateur a dit non. C'est son droit et ça se respecte sans insister. */
  | { readonly etat: 'refusee' }
  /** Permission accordée mais rien n'arrive : GPS coupé, navigateur sans capteur… */
  | { readonly etat: 'indisponible' };

export async function obtenirPosition(): Promise<ResultatPosition> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) return { etat: 'refusee' };

    const position = await Location.getCurrentPositionAsync({
      // La cellule fait un kilomètre : viser mieux dépenserait de la batterie pour une
      // précision qu'on jette de toute façon.
      accuracy: Location.Accuracy.Low,
    });

    return {
      etat: 'obtenue',
      lat: position.coords.latitude,
      lon: position.coords.longitude,
    };
  } catch {
    // Sur le web, un refus se manifeste par une exception plutôt que par un statut.
    // Dans les deux cas, l'écran doit proposer une suite, pas afficher une erreur.
    return { etat: 'indisponible' };
  }
}
