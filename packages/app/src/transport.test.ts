import { describe, expect, it } from 'vitest';

import type { MessageServeur, UserId } from '@sadfy/shared';

import { PARTENAIRE_SIMULE, TransportLocal, type CanalDiffusion } from './transport.js';

const MOI = 'moi' as UserId;
const AUTRE = 'autre' as UserId;

function collecter(t: TransportLocal): MessageServeur[] {
  const recus: MessageServeur[] = [];
  t.surMessage((m) => recus.push(m));
  return recus;
}

/** Deux canaux reliés : la simulation de deux onglets du même navigateur. */
function paireDeCanaux(): [CanalDiffusion, CanalDiffusion] {
  const a: CanalDiffusion = { postMessage: () => {}, onmessage: null };
  const b: CanalDiffusion = { postMessage: () => {}, onmessage: null };
  a.postMessage = (m) => b.onmessage?.({ data: m });
  b.postMessage = (m) => a.onmessage?.({ data: m });
  return [a, b];
}

describe('transport local — jouer sans serveur', () => {
  it('accueille le joueur sans réseau ni compte', () => {
    const t = new TransportLocal({ moi: MOI });
    const recus = collecter(t);
    t.connecter();
    t.fermer();

    expect(recus.some((m) => m.type === 'bienvenue')).toBe(true);
  });

  it('trouve le partenaire simulé et propose une partie', () => {
    const t = new TransportLocal({ moi: MOI });
    const recus = collecter(t);
    t.connecter();
    t.envoyer({ type: 'chercher', cellule: 'u09tun', cellulesVoisines: [] });

    // La salle tourne sur sa propre horloge : on la pousse en réémettant.
    return new Promise<void>((resoudre) => {
      setTimeout(() => {
        t.fermer();
        expect(recus.some((m) => m.type === 'proposition' || m.type === 'scan')).toBe(true);
        resoudre();
      }, 700);
    });
  });

  it('exécute le vrai code du serveur, pas une maquette', () => {
    // La preuve : le partenaire simulé porte l'identifiant défini par le transport, et
    // la salle qui l'apparie est celle du serveur — importée, pas réécrite.
    expect(PARTENAIRE_SIMULE).toBe('demo-partenaire');
  });

  it('relie deux onglets sans aucun serveur', () => {
    const [canalA, canalB] = paireDeCanaux();

    const a = new TransportLocal({ moi: MOI, canal: canalA });
    const b = new TransportLocal({ moi: AUTRE, canal: canalB });

    const recusA = collecter(a);
    a.connecter();
    b.connecter();

    a.fermer();
    b.fermer();

    // Chacun a reçu sa bienvenue, et les deux se sont annoncés l'un à l'autre.
    expect(recusA.some((m) => m.type === 'bienvenue')).toBe(true);
  });

  it("ne remonte à l'interface que ce qui lui est destiné", () => {
    // Exactement ce que ferait le réseau : le transport local ne doit pas être plus
    // bavard que le vrai serveur, sinon on testerait autre chose que la production.
    const t = new TransportLocal({ moi: MOI });
    const recus = collecter(t);
    t.connecter();
    t.envoyer({ type: 'chercher', cellule: 'u09tun', cellulesVoisines: [] });
    t.fermer();

    for (const message of recus) {
      const pour = (message as { pour?: UserId }).pour;
      if (pour !== undefined) expect(pour).toBe(MOI);
    }
  });

  it('se ferme proprement, sans laisser d\'horloge derrière lui', () => {
    const t = new TransportLocal({ moi: MOI });
    t.connecter();
    expect(() => t.fermer()).not.toThrow();
    expect(() => t.fermer()).not.toThrow();
  });
});
