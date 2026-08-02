import { describe, expect, it } from 'vitest';

import { PARTIE, type UserId } from '@sadfy/shared';

import { PartiesVives } from './parties-vives.js';

const A = 'a' as UserId;
const B = 'b' as UserId;
const T0 = Date.parse('2026-07-31T18:00:00Z');

describe('registre des parties vives', () => {
  it('démarre une partie et brieffe les deux joueurs', () => {
    const vives = new PartiesVives();
    const evenements = vives.demarrer('p1', [A, B], 'la_scie', 1, T0, false);

    expect(evenements.filter((e) => e.type === 'briefing')).toHaveLength(2);
    expect(vives.nombre).toBe(1);
  });

  it("n'autorise qu'une partie à la fois par joueur", () => {
    const vives = new PartiesVives();
    vives.demarrer('p1', [A, B], 'la_scie', 1, T0, false);
    expect(vives.partieDe(A)).toBe('p1');
  });

  it('ne confond pas une coupure réseau avec un abandon', () => {
    // Le métro est le cas d'usage central : la partie doit attendre, pas mourir.
    const vives = new PartiesVives();
    vives.demarrer('p1', [A, B], 'la_scie', 1, T0, false);

    const coupure = vives.deconnecter(A, T0 + 1_000);
    expect(coupure.some((e) => e.type === 'partenaire_deconnecte')).toBe(true);
    expect(vives.nombre).toBe(1);

    const retour = vives.reconnecter(A, T0 + 2_000);
    expect(retour.some((e) => e.type === 'partenaire_reconnecte')).toBe(true);
  });

  it('libère la partie quand elle se termine', () => {
    const vives = new PartiesVives();
    vives.demarrer('p1', [A, B], 'la_scie', 1, T0, false);
    vives.quitter(A, 'dois_y_aller', T0 + 1_000);

    expect(vives.nombre).toBe(0);
    expect(vives.partieDe(A)).toBeUndefined();
  });

  it('nettoie une partie oubliée plutôt que de fuir en mémoire', () => {
    const vives = new PartiesVives();
    vives.demarrer('p1', [A, B], 'la_scie', 1, T0, false);
    vives.tick(T0 + 7 * PARTIE.REPRISE_POSSIBLE_MS);
    expect(vives.nombre).toBe(0);
  });

  it('ignore une action venant de quelqu\'un qui ne joue pas', () => {
    const vives = new PartiesVives();
    expect(vives.agir(A, { type: 'tirer' }, T0)).toHaveLength(0);
  });
});
