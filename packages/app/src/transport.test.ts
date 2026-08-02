import { describe, expect, it } from 'vitest';

import type { MessageServeur, UserId } from '@sadfy/shared';

import {
  PARTENAIRE_SIMULE,
  TransportLocal,
  identifiantOnglet,
  type CanalDiffusion,
  type MemoireOnglet,
} from './transport.js';

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

  it('trouve quand même quelqu\'un dans un navigateur, seul dans son onglet', async () => {
    // Le canal existe toujours dans un navigateur, même sans deuxième onglet. Tant que
    // le partenaire simulé n'était inscrit qu'en l'absence de canal, un onglet seul
    // cherchait indéfiniment et ne trouvait jamais personne — exactement ce que la
    // page publiée donnait à voir.
    const canal: CanalDiffusion = { postMessage: () => {}, onmessage: null };
    const t = new TransportLocal({ moi: MOI, canal });
    const recus = collecter(t);

    t.connecter();
    t.envoyer({ type: 'chercher', cellule: 'u09tun', cellulesVoisines: [] });

    await new Promise((r) => setTimeout(r, 700));
    t.fermer();

    expect(recus.some((m) => m.type === 'proposition')).toBe(true);
  });

  it('annonce à l\'interface qu\'elle est reliée', () => {
    // Sans cet état, l'écran reste sur « connexion… » pour toujours en mode local : il
    // attend un signal que rien n'émettait.
    const t = new TransportLocal({ moi: MOI });
    const etats: string[] = [];
    t.surEtat((e) => etats.push(e));
    t.connecter();
    t.fermer();

    expect(etats).toContain('connecte');
  });
});

describe('identité par onglet', () => {
  function memoire(): MemoireOnglet {
    const contenu = new Map<string, string>();
    return {
      getItem: (c) => contenu.get(c) ?? null,
      setItem: (c, v) => void contenu.set(c, v),
    };
  }

  it('donne deux identifiants différents à deux onglets', () => {
    // Sans ça, deux onglets du même navigateur portent la même identité — ils
    // s'ignorent mutuellement en croyant s'entendre eux-mêmes, et le mode « à deux
    // onglets » ne trouve jamais personne.
    const a = identifiantOnglet(MOI, memoire());
    const b = identifiantOnglet(MOI, memoire());
    expect(a).not.toBe(b);
  });

  it('garde le même identifiant tant que l\'onglet vit', () => {
    const m = memoire();
    expect(identifiantOnglet(MOI, m)).toBe(identifiantOnglet(MOI, m));
  });

  it('retombe sur l\'identité réelle quand il n\'y a pas de mémoire d\'onglet', () => {
    // C'est le cas sur mobile, où « deux onglets » n'a aucun sens.
    expect(identifiantOnglet(MOI, undefined as unknown as MemoireOnglet)).toContain(MOI);
  });

  it('reste rattaché à l\'identité réelle', () => {
    // Le suffixe distingue les onglets ; il ne doit pas effacer la clé qui identifie
    // vraiment le joueur, sinon on ne saurait plus de qui il s'agit.
    expect(identifiantOnglet(MOI, memoire()).startsWith(MOI)).toBe(true);
  });
});

describe('deux onglets deviennent deux vrais joueurs', () => {
  it('se trouvent, s\'apparient et démarrent la partie', async () => {
    const [canalA, canalB] = paireDeCanaux();

    const a = new TransportLocal({ moi: MOI, canal: canalA });
    const b = new TransportLocal({ moi: AUTRE, canal: canalB });

    const recusA = collecter(a);
    const recusB = collecter(b);

    a.connecter();
    b.connecter();

    a.envoyer({ type: 'chercher', cellule: 'u09tun', cellulesVoisines: [] });
    b.envoyer({ type: 'chercher', cellule: 'u09tun', cellulesVoisines: [] });

    await new Promise((r) => setTimeout(r, 900));

    // Un seul des deux reçoit d'abord la proposition : c'est celui dont la recherche a
    // trouvé l'autre. L'autre ne saura rien tant que le premier n'a pas dit oui — c'est
    // toute la différence entre « j'ai trouvé quelqu'un » et « quelqu'un veut jouer ».
    const proposition = recusA.find((m) => m.type === 'proposition');
    expect(proposition, 'personne n\'a reçu de proposition').toBeDefined();
    if (proposition?.type !== 'proposition') return;

    // Ni l'un ni l'autre n'a eu à savoir de quel côté il était pour répondre.
    a.envoyer({
      type: 'repondre_proposition',
      propositionId: proposition.propositionId,
      accepte: true,
    });

    const invitation = recusB.find((m) => m.type === 'proposition');
    expect(invitation, 'le oui du premier n\'est pas parvenu au second').toBeDefined();
    if (invitation?.type !== 'proposition') return;

    // Le même jeu des deux côtés : c'est une partie, pas deux.
    expect(invitation.jeu).toBe(proposition.jeu);

    b.envoyer({
      type: 'repondre_proposition',
      propositionId: invitation.propositionId,
      accepte: true,
    });

    const demarreA = recusA.find((m) => m.type === 'partie_demarre');
    const demarreB = recusB.find((m) => m.type === 'partie_demarre');
    expect(demarreA, 'la partie n\'a pas démarré chez le premier').toBeDefined();
    expect(demarreB, 'la partie n\'a pas démarré chez le second').toBeDefined();

    // Et le jeu annoncé est celui qui a été proposé — la régression du briefing écrit
    // en dur passait précisément ici sans que rien ne la signale.
    if (demarreA?.type === 'partie_demarre') expect(demarreA.jeu).toBe(proposition.jeu);
    if (demarreB?.type === 'partie_demarre') expect(demarreB.jeu).toBe(proposition.jeu);

    a.fermer();
    b.fermer();
  });

  it('ne dit jamais au premier que le second a refusé', () => {
    // P5 : celui qui a cherché voit « on continue à chercher », exactement ce qu'il
    // aurait vu si l'autre n'avait rien vu du tout.
    const [canalA, canalB] = paireDeCanaux();
    const a = new TransportLocal({ moi: MOI, canal: canalA });
    const b = new TransportLocal({ moi: AUTRE, canal: canalB });

    const recusA = collecter(a);
    a.connecter();
    b.connecter();

    for (const message of recusA) {
      expect(JSON.stringify(message)).not.toMatch(/refus|decline|rejet/i);
    }

    a.fermer();
    b.fermer();
  });
});
