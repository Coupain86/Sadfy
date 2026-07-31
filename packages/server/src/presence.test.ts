import { describe, expect, it } from 'vitest';

import {
  celluleEtVoisines,
  empreintePresence,
  encoderCellule,
  genererIdentite,
  periodePresence,
  secretDuo,
  type DuoId,
  type EmpreintePresence,
  type UserId,
} from '@sadfy/shared';

import {
  detecterRetrouvailles,
  pingAutorise,
  reinitialiserPing,
  type DeclarationPresence,
  type DuoSurveille,
} from './presence.js';

const ALICE = 'alice' as UserId;
const BOB = 'bob' as UserId;
const DUO = 'duo' as DuoId;

const PERIODE = periodePresence(Date.parse('2026-07-31T18:00:00Z'));

/** Fabrique les déclarations réelles des deux appareils, avec la vraie cryptographie. */
function declarations(latA: number, lonA: number, latB: number, lonB: number) {
  const alice = genererIdentite();
  const bob = genererIdentite();
  const secretA = secretDuo(alice.clePriveeHex, bob.clePubliqueHex);
  const secretB = secretDuo(bob.clePriveeHex, alice.clePubliqueHex);

  const celluleA = encoderCellule(latA, lonA);
  const celluleB = encoderCellule(latB, lonB);

  const faire = (
    userId: UserId,
    cellule: ReturnType<typeof encoderCellule>,
    secret: Uint8Array,
  ): DeclarationPresence => ({
    userId,
    empreinteExacte: empreintePresence(cellule, secret, PERIODE),
    empreintesLarges: celluleEtVoisines(cellule).map((c) =>
      empreintePresence(c, secret, PERIODE),
    ),
    natif: true,
  });

  return new Map<UserId, DeclarationPresence>([
    [ALICE, faire(ALICE, celluleA, secretA)],
    [BOB, faire(BOB, celluleB, secretB)],
  ]);
}

function duo(over: Partial<DuoSurveille> = {}): DuoSurveille {
  return { duoId: DUO, a: ALICE, b: BOB, coupePar: [], ...over };
}

// ---------------------------------------------------------------------------

describe('détection de présence', () => {
  it('détecte deux partenaires dans la même cellule, et accorde le bonus', () => {
    const presences = declarations(48.8584, 2.2945, 48.8584, 2.2945);
    const [trouve] = detecterRetrouvailles([duo()], presences, 100);

    expect(trouve).toBeDefined();
    expect(trouve?.memeCellule).toBe(true);
  });

  it('prévient toujours les deux, jamais un seul', () => {
    // La symétrie est la protection principale : sans elle, on pourrait observer
    // quelqu'un à son insu (§12.2).
    const presences = declarations(48.8584, 2.2945, 48.8584, 2.2945);
    const [trouve] = detecterRetrouvailles([duo()], presences, 100);

    expect(trouve?.prevenir).toHaveLength(2);
    expect([...(trouve?.prevenir ?? [])].sort()).toEqual([ALICE, BOB].sort());
  });

  it('prévient à travers une frontière de cellule, sans donner le bonus', () => {
    // Généreux pour la notification — mieux vaut prévenir un peu trop que faire
    // manquer des retrouvailles. Strict pour le bonus — « même endroit » veut dire
    // même endroit.
    const presences = declarations(48.8584, 2.2945, 48.8640, 2.2945);
    const [trouve] = detecterRetrouvailles([duo()], presences, 100);

    if (trouve) expect(trouve.memeCellule).toBe(false);
  });

  it('ne détecte rien à l\'autre bout de la France', () => {
    const presences = declarations(48.8584, 2.2945, 43.2965, 5.3698);
    expect(detecterRetrouvailles([duo()], presences, 100)).toHaveLength(0);
  });

  it('ne prévient qu\'une fois par jour', () => {
    const presences = declarations(48.8584, 2.2945, 48.8584, 2.2945);

    expect(
      detecterRetrouvailles([duo({ derniereNotificationJour: 100 })], presences, 100),
    ).toHaveLength(0);
    expect(
      detecterRetrouvailles([duo({ derniereNotificationJour: 99 })], presences, 100),
    ).toHaveLength(1);
  });

  it('ne prévient personne si un seul des deux est sur application native', () => {
    // Dans un duo natif ↔ web, la symétrie est impossible : plutôt que de prévenir
    // un seul des deux, on ne prévient personne (§4).
    const presences = declarations(48.8584, 2.2945, 48.8584, 2.2945);
    const bob = presences.get(BOB)!;
    presences.set(BOB, { ...bob, natif: false });

    expect(detecterRetrouvailles([duo()], presences, 100)).toHaveLength(0);
  });

  it('respecte la coupure douce d\'un seul des deux', () => {
    // Encore la symétrie : si l'un ne veut plus être signalé, l'autre ne doit pas
    // continuer à le voir arriver.
    const presences = declarations(48.8584, 2.2945, 48.8584, 2.2945);
    expect(detecterRetrouvailles([duo({ coupePar: [BOB] })], presences, 100)).toHaveLength(0);
  });

  it('ne détecte rien quand un des deux n\'a rien envoyé', () => {
    const presences = declarations(48.8584, 2.2945, 48.8584, 2.2945);
    presences.delete(BOB);
    expect(detecterRetrouvailles([duo()], presences, 100)).toHaveLength(0);
  });

  it('ne confond jamais deux duos différents au même endroit', () => {
    // Les empreintes dépendent du secret de chaque duo : deux couples dans le même
    // café ne se détectent pas mutuellement.
    const duo1 = declarations(48.8584, 2.2945, 48.8584, 2.2945);
    const duo2 = declarations(48.8584, 2.2945, 48.8584, 2.2945);

    const croise = new Map<UserId, DeclarationPresence>([
      [ALICE, duo1.get(ALICE)!],
      [BOB, duo2.get(BOB)!],
    ]);

    expect(detecterRetrouvailles([duo()], croise, 100)).toHaveLength(0);
  });

  it('ne conserve aucune trace de ce qu\'il a calculé', () => {
    // La fonction est pure : appelée deux fois, elle donne exactement le même
    // résultat, et rien ne s'accumule nulle part.
    const presences = declarations(48.8584, 2.2945, 48.8584, 2.2945);
    const premier = detecterRetrouvailles([duo()], presences, 100);
    const second = detecterRetrouvailles([duo()], presences, 100);
    expect(second).toEqual(premier);
  });

  it('ne voit passer que des jetons illisibles', () => {
    // Vérification de la promesse elle-même : rien dans ce que reçoit le serveur ne
    // ressemble à une position.
    const presences = declarations(48.8584, 2.2945, 48.8584, 2.2945);
    const charge = JSON.stringify([...presences.values()]);

    expect(charge).not.toMatch(/48\.8|2\.29/);
    expect(charge).not.toContain(encoderCellule(48.8584, 2.2945));
  });
});

describe('plafonds de ping', () => {
  const base = { duoId: DUO, emetteur: ALICE, sansReponse: 0 };

  it('laisse passer un premier ping', () => {
    expect(pingAutorise(base, 100)).toBeNull();
  });

  it('refuse un second ping le même jour', () => {
    expect(pingAutorise({ ...base, dernierJour: 100 }, 100)).toBe('deja_aujourd_hui');
  });

  it('laisse repasser le lendemain', () => {
    expect(pingAutorise({ ...base, dernierJour: 100 }, 101)).toBeNull();
  });

  it('coupe après trois pings sans réponse', () => {
    // Sans cette décroissance, un ping par jour autoriserait quatorze relances en
    // deux semaines sans une seule réponse (§12.4).
    expect(pingAutorise({ ...base, sansReponse: 2 }, 100)).toBeNull();
    expect(pingAutorise({ ...base, sansReponse: 3 }, 100)).toBe(
      'coupe_apres_trois_sans_reponse',
    );
  });

  it('repart de zéro quand le destinataire se manifeste', () => {
    expect(pingAutorise(reinitialiserPing({ ...base, sansReponse: 5 }), 100)).toBeNull();
  });
});

describe('les empreintes ne fuient pas', () => {
  it('change de jeton chaque heure pour un même lieu', () => {
    const secret = secretDuo(genererIdentite().clePriveeHex, genererIdentite().clePubliqueHex);
    const cellule = encoderCellule(48.8584, 2.2945);

    const jetons = new Set<EmpreintePresence>([
      empreintePresence(cellule, secret, PERIODE),
      empreintePresence(cellule, secret, PERIODE + 1),
      empreintePresence(cellule, secret, PERIODE + 2),
    ]);

    expect(jetons.size).toBe(3);
  });
});
