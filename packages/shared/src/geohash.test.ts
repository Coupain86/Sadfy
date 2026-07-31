import { describe, expect, it } from 'vitest';

import {
  celluleEtVoisines,
  cellulesVoisines,
  decoderCellule,
  distanceCellulesM,
  distanceM,
  encoderCellule,
  memeZone,
} from './geohash.js';
import { GEO } from './constants.js';
import type { CelluleId } from './types.js';

const cell = (s: string) => s as CelluleId;

describe('geohash', () => {
  it('encode des positions connues', () => {
    // Références classiques de l'algorithme.
    expect(encoderCellule(57.64911, 10.40744, 11)).toBe('u4pruydqqvj');
    expect(encoderCellule(48.8584, 2.2945, 6)).toBe('u09tun'); // Tour Eiffel
    expect(encoderCellule(0, 0, 6)).toBe('s00000');
  });

  it('décode en revenant au point de départ, à la taille de cellule près', () => {
    const lat = 48.8584;
    const lon = 2.2945;
    const boite = decoderCellule(encoderCellule(lat, lon, 6));

    expect(Math.abs(boite.lat - lat)).toBeLessThanOrEqual(boite.latErr);
    expect(Math.abs(boite.lon - lon)).toBeLessThanOrEqual(boite.lonErr);
  });

  it('produit des cellules d\'environ 1 km à la précision retenue', () => {
    // La spec raisonne en zones d'1 km (§3.3, §11.8). Vérifions que 6 caractères
    // donnent bien cet ordre de grandeur, et pas dix fois plus.
    const boite = decoderCellule(encoderCellule(48.8584, 2.2945, GEO.PRECISION_GEOHASH));
    const hauteurM = distanceM(
      boite.lat - boite.latErr,
      boite.lon,
      boite.lat + boite.latErr,
      boite.lon,
    );
    const largeurM = distanceM(
      boite.lat,
      boite.lon - boite.lonErr,
      boite.lat,
      boite.lon + boite.lonErr,
    );

    expect(hauteurM).toBeGreaterThan(400);
    expect(hauteurM).toBeLessThan(1_500);
    expect(largeurM).toBeGreaterThan(400);
    expect(largeurM).toBeLessThan(1_500);
  });

  it('donne exactement 8 voisines, toutes distinctes', () => {
    const voisines = cellulesVoisines(cell('u09tun'));
    expect(voisines).toHaveLength(8);
    expect(new Set(voisines).size).toBe(8);
    expect(voisines).not.toContain(cell('u09tun'));
  });

  it('rattrape deux personnes séparées par une frontière de cellule', () => {
    // Sans les voisines, dix mètres de part et d'autre d'une frontière suffiraient à
    // rendre deux joueurs invisibles l'un à l'autre.
    const boite = decoderCellule(encoderCellule(48.8584, 2.2945, 6));
    const justeAvant = encoderCellule(boite.lat, boite.lon + boite.lonErr * 0.99, 6);
    const justeApres = encoderCellule(boite.lat, boite.lon + boite.lonErr * 1.01, 6);

    expect(justeAvant).not.toBe(justeApres);
    expect(celluleEtVoisines(justeAvant)).toContain(justeApres);
  });

  it('traite le passage du 180e méridien comme une frontière, pas un mur', () => {
    const voisines = cellulesVoisines(encoderCellule(0, 179.999, 6));
    expect(voisines).toHaveLength(8);
    // Au moins une voisine doit se trouver de l'autre côté de la ligne de changement
    // de date, sinon on aurait créé un mur invisible au milieu du Pacifique.
    const traverse = voisines.some((v) => decoderCellule(v).lon < 0);
    expect(traverse).toBe(true);
  });

  it('ne cherche rien au-delà des pôles', () => {
    expect(cellulesVoisines(encoderCellule(89.999, 0, 6)).length).toBeLessThan(8);
  });

  it('mesure les distances de centre à centre', () => {
    expect(distanceCellulesM(cell('u09tun'), cell('u09tun'))).toBe(0);

    // Tour Eiffel → Notre-Dame : environ 4 km à vol d'oiseau.
    const eiffel = encoderCellule(48.8584, 2.2945, 6);
    const notreDame = encoderCellule(48.8530, 2.3499, 6);
    const d = distanceCellulesM(eiffel, notreDame);
    expect(d).toBeGreaterThan(3_000);
    expect(d).toBeLessThan(5_000);
  });

  it('définit « même zone » comme l\'identité de cellule', () => {
    // Binaire, sans gradient : c'est ce qui empêche de trianguler quelqu'un (§11.8).
    expect(memeZone(cell('u09tun'), cell('u09tun'))).toBe(true);
    expect(memeZone(cell('u09tun'), cell('u09tum'))).toBe(false);
  });

  it('refuse une cellule invalide plutôt que de renvoyer un résultat faux', () => {
    expect(() => decoderCellule(cell('u09ta!'))).toThrow(/invalide/);
  });
});
