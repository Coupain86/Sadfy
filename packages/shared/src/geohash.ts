/**
 * Geohash — le découpage du monde en cellules.
 *
 * C'est la brique qui permet de tenir le principe P2. **Aucune position brute ne quitte
 * jamais l'appareil** : le téléphone encode sa position en cellule et n'envoie que la
 * cellule. À 6 caractères, une cellule mesure environ 1,2 km × 0,6 km — l'approximation
 * la plus proche de la zone d'1 km de la spec (§3.3).
 *
 * Implémenté ici plutôt qu'importé : l'algorithme tient en cent lignes, il est figé
 * depuis 2008, et il est trop central à la promesse de confidentialité pour dépendre
 * d'un paquet tiers dont personne ne relit les mises à jour.
 */

import { GEO } from './constants.js';
import type { CelluleId } from './types.js';

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/** Rayon moyen de la Terre, en mètres. */
const RAYON_TERRE_M = 6_371_000;

export interface BoiteCellule {
  readonly lat: number;
  readonly lon: number;
  /** Demi-hauteur et demi-largeur de la cellule, en degrés. */
  readonly latErr: number;
  readonly lonErr: number;
}

/** Encode une position en identifiant de cellule. */
export function encoderCellule(
  lat: number,
  lon: number,
  precision: number = GEO.PRECISION_GEOHASH,
): CelluleId {
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;

  let hash = '';
  let bit = 0;
  let ch = 0;
  let pairImpair = true; // on commence par la longitude

  while (hash.length < precision) {
    if (pairImpair) {
      const milieu = (lonMin + lonMax) / 2;
      if (lon >= milieu) {
        ch = (ch << 1) + 1;
        lonMin = milieu;
      } else {
        ch <<= 1;
        lonMax = milieu;
      }
    } else {
      const milieu = (latMin + latMax) / 2;
      if (lat >= milieu) {
        ch = (ch << 1) + 1;
        latMin = milieu;
      } else {
        ch <<= 1;
        latMax = milieu;
      }
    }

    pairImpair = !pairImpair;

    if (bit < 4) {
      bit += 1;
    } else {
      hash += BASE32[ch] ?? '0';
      bit = 0;
      ch = 0;
    }
  }

  return hash as CelluleId;
}

/** Décode une cellule en son centre et ses demi-dimensions. */
export function decoderCellule(cellule: CelluleId): BoiteCellule {
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let pairImpair = true;

  for (const caractere of cellule) {
    const index = BASE32.indexOf(caractere);
    if (index === -1) throw new Error(`Cellule invalide : « ${cellule} »`);

    for (let masque = 16; masque >= 1; masque >>= 1) {
      const bitActif = (index & masque) !== 0;
      if (pairImpair) {
        const milieu = (lonMin + lonMax) / 2;
        if (bitActif) lonMin = milieu;
        else lonMax = milieu;
      } else {
        const milieu = (latMin + latMax) / 2;
        if (bitActif) latMin = milieu;
        else latMax = milieu;
      }
      pairImpair = !pairImpair;
    }
  }

  return {
    lat: (latMin + latMax) / 2,
    lon: (lonMin + lonMax) / 2,
    latErr: (latMax - latMin) / 2,
    lonErr: (lonMax - lonMin) / 2,
  };
}

/**
 * Les 8 cellules voisines.
 *
 * Indispensable, et pas seulement par souci d'exactitude : sans elles, **deux personnes
 * distantes de dix mètres mais de part et d'autre d'une frontière de cellule ne se
 * verraient jamais**. Le téléphone transmet donc toujours sa cellule et ses 8 voisines.
 *
 * Calculées en sortant de la boîte plutôt que par les tables de correspondance
 * classiques : c'est plus lent de quelques microsecondes, et beaucoup plus difficile à
 * se tromper.
 */
export function cellulesVoisines(cellule: CelluleId): readonly CelluleId[] {
  const { lat, lon, latErr, lonErr } = decoderCellule(cellule);
  const precision = cellule.length;

  const voisines: CelluleId[] = [];

  for (const dLat of [-1, 0, 1]) {
    for (const dLon of [-1, 0, 1]) {
      if (dLat === 0 && dLon === 0) continue;

      const latVoisine = lat + dLat * 2 * latErr;
      // Au-delà des pôles il n'y a rien à chercher.
      if (latVoisine > 90 || latVoisine < -90) continue;

      // La longitude, elle, boucle : ±180° est une frontière, pas un mur.
      let lonVoisine = lon + dLon * 2 * lonErr;
      if (lonVoisine > 180) lonVoisine -= 360;
      if (lonVoisine < -180) lonVoisine += 360;

      voisines.push(encoderCellule(latVoisine, lonVoisine, precision));
    }
  }

  return voisines;
}

/** Cellule et ses 8 voisines — ce que le téléphone transmet à chaque recherche. */
export function celluleEtVoisines(cellule: CelluleId): readonly CelluleId[] {
  return [cellule, ...cellulesVoisines(cellule)];
}

/** Distance en mètres entre deux points, formule de haversine. */
export function distanceM(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * RAYON_TERRE_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Distance approximative entre deux cellules, mesurée de centre à centre.
 *
 * C'est volontairement grossier : on n'a jamais besoin de mieux, et on ne **veut**
 * jamais mieux. Une distance précise entre deux joueurs permettrait de trianguler
 * quelqu'un en marchant trois minutes — c'est exactement ce que la spec interdit
 * d'afficher (§11.8).
 */
export function distanceCellulesM(a: CelluleId, b: CelluleId): number {
  if (a === b) return 0;
  const ca = decoderCellule(a);
  const cb = decoderCellule(b);
  return distanceM(ca.lat, ca.lon, cb.lat, cb.lon);
}

/** Deux joueurs sont-ils « dans la même zone » au sens des retrouvailles (§11.8) ? */
export function memeZone(a: CelluleId, b: CelluleId): boolean {
  return a === b;
}
