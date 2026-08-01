import { beforeEach, describe, expect, it } from 'vitest';

import { VERSION_PROTOCOLE, genererIdentite, verifierDefi } from '@sadfy/shared';

import { Connexion, type EtatConnexion, type WebSocketLike } from './connexion.js';

class WebSocketFactice implements WebSocketLike {
  static derniere: WebSocketFactice | null = null;

  readonly envoyes: string[] = [];
  readonly url: string;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    WebSocketFactice.derniere = this;
  }

  send(donnees: string): void {
    this.envoyes.push(donnees);
  }

  close(): void {
    this.onclose?.();
  }

  /** Simule un message venant du serveur. */
  recevoir(message: unknown): void {
    this.onmessage?.({ data: JSON.stringify(message) });
  }

  messagesEnvoyes(): unknown[] {
    return this.envoyes.map((e) => JSON.parse(e) as unknown);
  }
}

const identite = genererIdentite();

function nouvelleConnexion() {
  return new Connexion({
    url: 'ws://test',
    clePriveeHex: identite.clePriveeHex,
    clePubliqueHex: identite.clePubliqueHex,
    fabriquer: (url) => new WebSocketFactice(url),
  });
}

beforeEach(() => {
  WebSocketFactice.derniere = null;
});

// ---------------------------------------------------------------------------

describe('authentification', () => {
  it('annonce sa version de protocole dans l\'URL', () => {
    const connexion = nouvelleConnexion();
    connexion.connecter();
    expect(WebSocketFactice.derniere?.url).toContain(`v=${VERSION_PROTOCOLE}`);
  });

  it('signe le défi avec sa clé privée', () => {
    const connexion = nouvelleConnexion();
    connexion.connecter();
    const ws = WebSocketFactice.derniere!;

    ws.onopen?.();
    ws.recevoir({ type: 'defi', nonce: 'defi-unique-123' });

    const bonjour = ws.messagesEnvoyes()[0] as {
      type: string;
      clePublique: string;
      signature: string;
    };

    expect(bonjour.type).toBe('bonjour');
    // C'est bien une preuve, pas un mot de passe : le serveur peut la vérifier sans
    // jamais avoir connu quoi que ce soit de secret.
    expect(verifierDefi('defi-unique-123', bonjour.signature, bonjour.clePublique)).toBe(true);
  });

  it("ne signe jamais un autre défi que celui reçu", () => {
    // Sinon une signature interceptée serait rejouable indéfiniment.
    const connexion = nouvelleConnexion();
    connexion.connecter();
    const ws = WebSocketFactice.derniere!;
    ws.onopen?.();
    ws.recevoir({ type: 'defi', nonce: 'defi-a' });

    const { signature, clePublique } = ws.messagesEnvoyes()[0] as {
      signature: string;
      clePublique: string;
    };
    expect(verifierDefi('defi-b', signature, clePublique)).toBe(false);
  });

  it('passe à « connecté » sur la bienvenue', () => {
    const connexion = nouvelleConnexion();
    const etats: EtatConnexion[] = [];
    connexion.surEtat((e) => etats.push(e));

    connexion.connecter();
    const ws = WebSocketFactice.derniere!;
    ws.onopen?.();
    ws.recevoir({ type: 'defi', nonce: 'x' });
    ws.recevoir({ type: 'bienvenue', userId: 'moi', versionContenu: 1 });

    expect(connexion.etat).toBe('connecte');
    expect(etats).toContain('authentification');
  });
});

describe('mise à jour requise', () => {
  it('cesse de réessayer quand le serveur refuse la version', () => {
    // Rien ne sert de reconnecter en boucle : c'est l'application qui doit changer.
    // Sans ce cas, l'utilisateur verrait une tentative de reconnexion perpétuelle sans
    // jamais comprendre pourquoi (§A6).
    const connexion = nouvelleConnexion();
    connexion.connecter();
    const ws = WebSocketFactice.derniere!;

    ws.onopen?.();
    ws.recevoir({ type: 'mise_a_jour_requise', minimale: 99 });

    expect(connexion.etat).toBe('mise_a_jour_requise');

    ws.close();
    expect(connexion.etat).toBe('mise_a_jour_requise');

    // Et une reconnexion explicite ne relance rien non plus.
    const avant = WebSocketFactice.derniere;
    connexion.connecter();
    expect(WebSocketFactice.derniere).toBe(avant);
  });
});

describe('survie au réseau mobile', () => {
  it('met en file les messages émis pendant une coupure', () => {
    // Une action faite juste avant d'entrer dans un tunnel ne doit pas disparaître en
    // silence : l'utilisateur croirait l'application cassée.
    const connexion = nouvelleConnexion();
    connexion.connecter();

    connexion.envoyer({ type: 'chercher', cellule: 'u09tun', cellulesVoisines: [] });
    expect(connexion.messagesEnAttente).toBe(1);
  });

  it('rejoue la file dès que la connexion est rétablie', () => {
    const connexion = nouvelleConnexion();
    connexion.connecter();
    connexion.envoyer({ type: 'annuler_recherche' });

    const ws = WebSocketFactice.derniere!;
    ws.onopen?.();
    ws.recevoir({ type: 'defi', nonce: 'x' });
    ws.recevoir({ type: 'bienvenue', userId: 'moi', versionContenu: 1 });

    const types = ws.messagesEnvoyes().map((m) => (m as { type: string }).type);
    expect(types).toContain('annuler_recherche');
    expect(connexion.messagesEnAttente).toBe(0);
  });

  it('espace les tentatives de reconnexion', () => {
    // Marteler le serveur toutes les cent millisecondes depuis un tunnel ne reconnecte
    // personne et vide la batterie.
    const connexion = nouvelleConnexion();
    connexion.connecter();

    const premier = connexion.reculMs();
    WebSocketFactice.derniere!.close();
    const second = connexion.reculMs();
    WebSocketFactice.derniere!.close();

    expect(second).toBeGreaterThan(premier);
    expect(connexion.reculMs()).toBeLessThanOrEqual(30_000);
  });

  it('ne se reconnecte pas après une fermeture volontaire', () => {
    const connexion = nouvelleConnexion();
    connexion.connecter();
    connexion.fermer();
    expect(connexion.etat).toBe('deconnecte');
  });

  it('ignore un message illisible sans tomber', () => {
    const connexion = nouvelleConnexion();
    connexion.connecter();
    const ws = WebSocketFactice.derniere!;
    expect(() => ws.onmessage?.({ data: 'pas du json' })).not.toThrow();
  });
});

describe('diffusion aux écouteurs', () => {
  it('transmet les messages du serveur', () => {
    const connexion = nouvelleConnexion();
    const recus: string[] = [];
    connexion.surMessage((m) => recus.push(m.type));

    connexion.connecter();
    const ws = WebSocketFactice.derniere!;
    ws.onopen?.();
    ws.recevoir({ type: 'defi', nonce: 'x' });
    ws.recevoir({ type: 'bienvenue', userId: 'moi', versionContenu: 1 });
    ws.recevoir({ type: 'scan', rayonM: 1_000, ecouleMs: 100 });

    expect(recus).toContain('scan');
    // Le défi est une mécanique interne : il n'a pas à remonter à l'interface.
    expect(recus).not.toContain('defi');
  });

  it('permet de se désabonner', () => {
    const connexion = nouvelleConnexion();
    const recus: string[] = [];
    const desabonner = connexion.surMessage((m) => recus.push(m.type));
    desabonner();

    connexion.connecter();
    const ws = WebSocketFactice.derniere!;
    ws.onopen?.();
    ws.recevoir({ type: 'bienvenue', userId: 'moi', versionContenu: 1 });

    expect(recus).toHaveLength(0);
  });
});
