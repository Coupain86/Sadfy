import { describe, expect, it } from 'vitest';

import {
  alea,
  duoIdDe,
  empreintePresence,
  genererIdentite,
  periodePresence,
  secretDuo,
  signerDefi,
  userIdDe,
  verifierDefi,
} from './crypto.js';
import { encoderCellule } from './geohash.js';
import type { UserId } from './types.js';

describe('identité', () => {
  it('génère une identité sans rien déclarer', () => {
    const identite = genererIdentite();
    expect(identite.clePriveeHex).toHaveLength(64);
    expect(identite.clePubliqueHex).toHaveLength(64);
    expect(identite.userId).toHaveLength(32);
  });

  it('dérive toujours le même identifiant depuis une clé publique', () => {
    const { clePubliqueHex, userId } = genererIdentite();
    expect(userIdDe(clePubliqueHex)).toBe(userId);
  });

  it('prouve son identité en signant un défi', () => {
    const { clePriveeHex, clePubliqueHex } = genererIdentite();
    const defi = alea();
    expect(verifierDefi(defi, signerDefi(defi, clePriveeHex), clePubliqueHex)).toBe(true);
  });

  it("refuse la signature d'un autre défi", () => {
    // Sinon une signature interceptée serait rejouable indéfiniment.
    const { clePriveeHex, clePubliqueHex } = genererIdentite();
    const signature = signerDefi('defi-a', clePriveeHex);
    expect(verifierDefi('defi-b', signature, clePubliqueHex)).toBe(false);
  });

  it("refuse la signature de quelqu'un d'autre", () => {
    const moi = genererIdentite();
    const autre = genererIdentite();
    const defi = alea();
    expect(verifierDefi(defi, signerDefi(defi, autre.clePriveeHex), moi.clePubliqueHex)).toBe(
      false,
    );
  });

  it('échoue proprement sur une entrée malformée plutôt que de lever', () => {
    expect(verifierDefi('defi', 'pas-de-l-hexa', 'non-plus')).toBe(false);
  });
});

describe('duo', () => {
  it("donne le même identifiant quel que soit l'ordre des deux joueurs", () => {
    // Sans tri, A et B calculeraient deux identifiants différents pour la même
    // relation, et plus rien ne se retrouverait.
    const a = 'aaaa' as UserId;
    const b = 'bbbb' as UserId;
    expect(duoIdDe(a, b)).toBe(duoIdDe(b, a));
  });

  it('distingue deux duos différents', () => {
    const a = 'aaaa' as UserId;
    const b = 'bbbb' as UserId;
    const c = 'cccc' as UserId;
    expect(duoIdDe(a, b)).not.toBe(duoIdDe(a, c));
  });
});

describe('présence', () => {
  it('permet aux deux appareils de dériver le même secret, sans le transmettre', () => {
    const alice = genererIdentite();
    const bob = genererIdentite();

    const cote1 = secretDuo(alice.clePriveeHex, bob.clePubliqueHex);
    const cote2 = secretDuo(bob.clePriveeHex, alice.clePubliqueHex);

    expect(Buffer.from(cote1).equals(Buffer.from(cote2))).toBe(true);
  });

  it("produit la même empreinte pour deux partenaires dans la même cellule", () => {
    const alice = genererIdentite();
    const bob = genererIdentite();
    const cellule = encoderCellule(48.8584, 2.2945);
    const periode = periodePresence(Date.parse('2026-07-31T18:00:00Z'));

    const sa = secretDuo(alice.clePriveeHex, bob.clePubliqueHex);
    const sb = secretDuo(bob.clePriveeHex, alice.clePubliqueHex);

    expect(empreintePresence(cellule, sa, periode)).toBe(
      empreintePresence(cellule, sb, periode),
    );
  });

  it('ne divulgue rien au serveur : deux duos au même endroit ne se ressemblent pas', () => {
    // C'est la propriété qui rend la fonctionnalité acceptable. Le serveur voit des
    // jetons opaques, jamais un lieu.
    const cellule = encoderCellule(48.8584, 2.2945);
    const periode = periodePresence(Date.now());

    const duo1 = secretDuo(genererIdentite().clePriveeHex, genererIdentite().clePubliqueHex);
    const duo2 = secretDuo(genererIdentite().clePriveeHex, genererIdentite().clePubliqueHex);

    expect(empreintePresence(cellule, duo1, periode)).not.toBe(
      empreintePresence(cellule, duo2, periode),
    );
  });

  it('fait tourner les empreintes dans le temps', () => {
    // Sans rotation, un même lieu produirait éternellement le même jeton, et le
    // serveur reconnaîtrait un endroit récurrent sans savoir lequel — assez pour
    // dessiner des habitudes.
    const secret = secretDuo(genererIdentite().clePriveeHex, genererIdentite().clePubliqueHex);
    const cellule = encoderCellule(48.8584, 2.2945);

    expect(empreintePresence(cellule, secret, 100)).not.toBe(
      empreintePresence(cellule, secret, 101),
    );
  });

  it('distingue deux cellules voisines', () => {
    const secret = secretDuo(genererIdentite().clePriveeHex, genererIdentite().clePubliqueHex);
    const periode = periodePresence(Date.now());

    expect(empreintePresence(encoderCellule(48.8584, 2.2945), secret, periode)).not.toBe(
      empreintePresence(encoderCellule(48.8700, 2.2945), secret, periode),
    );
  });

  it('change de période toutes les heures', () => {
    const base = Date.parse('2026-07-31T18:00:00Z');
    expect(periodePresence(base)).toBe(periodePresence(base + 59 * 60_000));
    expect(periodePresence(base + 61 * 60_000)).toBe(periodePresence(base) + 1);
  });
});
