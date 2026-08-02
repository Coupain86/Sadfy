import { describe, expect, it } from 'vitest';

import { MESSAGES_INTERDITS, type MessageServeur, type UserId } from '@sadfy/shared';

import type { EvenementPartie } from './moteur.js';
import type { Evenement as EvenementSalle } from './salle.js';
import { traduirePartie, traduireSalle } from './traduction.js';

const A = 'a' as UserId;

/**
 * Ce fichier existe à cause d'un bug silencieux : la salle émettait
 * `proposition_initiateur`, le protocole attendait `proposition`, et rien ne le
 * signalait. L'application n'aurait jamais affiché une seule proposition — sans erreur,
 * sans avertissement, sans plantage.
 */

const TOUS_SALLE: EvenementSalle[] = [
  { type: 'scan', pour: A, rayonM: 1_000, ecouleMs: 0 },
  { type: 'proposition_initiateur', pour: A, propositionId: 'p', avatar: '◕', jeu: 'la_scie', expireLe: 1 },
  { type: 'proposition_cible', pour: A, propositionId: 'p', avatar: '◕', jeu: 'la_scie', expireLe: 1 },
  { type: 'recherche_continue', pour: A },
  { type: 'plus_disponible', pour: A },
  { type: 'personne_trouvee', pour: A },
  { type: 'apparies', a: A, b: 'b' as UserId, jeu: 'la_scie', memeCellule: false },
];

const TOUS_PARTIE: EvenementPartie[] = [
  { type: 'briefing', pour: A, jeu: 'la_scie', role: 'scieur', texte: 'Tire chacun ton tour.' },
  { type: 'vue', pour: A, vue: {}, finMancheLe: 1 },
  { type: 'rappel_inactivite', pour: A },
  { type: 'partenaire_deconnecte', pour: A, reprendAvantLe: 1 },
  { type: 'partenaire_reconnecte', pour: A },
  { type: 'manche_terminee', pour: A, reussie: true },
  { type: 'partie_terminee', pour: A, reussie: true },
];

describe('traduction des événements en messages', () => {
  it('traduit chaque événement de la salle, ou le retient volontairement', () => {
    for (const evenement of TOUS_SALLE) {
      const traduit = traduireSalle(evenement);
      // `apparies` est le seul qui ne sort jamais : il déclenche le démarrage côté
      // serveur et n'apprendrait rien d'utile au client.
      if (evenement.type === 'apparies') expect(traduit).toBeNull();
      else expect(traduit, `« ${evenement.type} » n'a pas de traduction`).not.toBeNull();
    }
  });

  it('traduit chaque événement de partie', () => {
    for (const evenement of TOUS_PARTIE) {
      expect(
        traduirePartie(evenement),
        `« ${evenement.type} » n'a pas de traduction`,
      ).not.toBeNull();
    }
  });

  it('annonce le jeu réellement joué, pas un jeu écrit en dur', () => {
    // Quand le jeu était un paramètre de `traduirePartie`, aucun appelant ne le
    // connaissait : tous passaient `'la_scie'`. Une partie de Portrait Robot
    // s'annonçait donc « La Scie », et le briefing affiché ne décrivait pas le jeu
    // qu'on allait jouer.
    const traduit = traduirePartie({
      type: 'briefing',
      pour: A,
      jeu: 'portrait_robot',
      role: 'temoin',
      texte: 'Tu as le visage sous les yeux.',
    });
    expect(traduit?.message.type === 'partie_demarre' && traduit.message.jeu).toBe(
      'portrait_robot',
    );
  });

  it('donne bien « proposition » — le bug qui a motivé ce fichier', () => {
    const traduit = traduireSalle(TOUS_SALLE[1]!);
    expect(traduit?.message.type).toBe('proposition');
  });

  it('présente les deux faces d\'une proposition de façon identique', () => {
    // Le destinataire n'a pas à savoir s'il est l'initiateur ou la cible : le lui dire
    // laisserait deviner qui a cherché qui.
    const initiateur = traduireSalle(TOUS_SALLE[1]!)?.message;
    const cible = traduireSalle(TOUS_SALLE[2]!)?.message;
    expect(initiateur).toEqual(cible);
  });

  it('ne produit jamais un message absent du protocole', () => {
    const types = new Set<string>();
    for (const e of TOUS_SALLE) {
      const t = traduireSalle(e);
      if (t) types.add(t.message.type);
    }
    for (const e of TOUS_PARTIE) {
      const t = traduirePartie(e);
      if (t) types.add(t.message.type);
    }

    // Si un type produit ici n'existe pas dans MessageServeur, le compilateur aurait
    // déjà refusé — ce test verrouille surtout l'absence de type interdit.
    for (const type of types) {
      expect(MESSAGES_INTERDITS as readonly string[]).not.toContain(type);
    }
  });

  it('ne laisse pas fuiter le caractère silencieux d\'un départ', () => {
    const traduit = traduirePartie({ type: 'partie_terminee', pour: A, reussie: false });
    expect(JSON.stringify(traduit)).not.toMatch(/silencieux|abandon/i);
  });

  it('exclut les types de MessageServeur qui ne devraient jamais être produits ici', () => {
    // Garde-fou de forme : on vérifie qu'on n'a pas oublié de brancher un message.
    const attendus: MessageServeur['type'][] = ['scan', 'proposition', 'vue_jeu'];
    for (const attendu of attendus) {
      const produit =
        TOUS_SALLE.some((e) => traduireSalle(e)?.message.type === attendu) ||
        TOUS_PARTIE.some((e) => traduirePartie(e)?.message.type === attendu);
      expect(produit, `« ${attendu} » n'est produit par aucune traduction`).toBe(true);
    }
  });
});
