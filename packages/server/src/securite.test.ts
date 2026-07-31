import { describe, expect, it } from 'vitest';

import { SECURITE, TRACES, encoderCellule, type CelluleId, type UserId } from '@sadfy/shared';

import {
  consequences,
  degraderPourAbandonSilencieux,
  depriorise,
  killSwitchDisponible,
  retourDuLendemainDu,
  signalementMineurRecevable,
  LONGUEUR_MAX_SIGNALEMENT,
} from './securite.js';
import { creerTrace, peutDeposer, peutRamasser, vueDeTrace } from './traces.js';

const A = 'a' as UserId;
const B = 'b' as UserId;
const T0 = Date.parse('2026-07-31T18:00:00Z');
const ZONE = encoderCellule(48.8584, 2.2945);
const AUTRE_ZONE = encoderCellule(43.2965, 5.3698);

const vierge = { malPasseDistincts: 0, graves: 0 };

// ---------------------------------------------------------------------------

describe('signalements', () => {
  it('protège immédiatement celui qui signale, sans aucune enquête', () => {
    // C'est gratuit et sans risque : il n'y a aucune raison d'attendre (§14.6).
    expect(consequences('mal_passe', vierge).bloquerReciproquement).toBe(true);
    expect(consequences('bloquer', vierge).bloquerReciproquement).toBe(true);
    expect(consequences('bien_passe', vierge).bloquerReciproquement).toBe(false);
  });

  it("n'exclut pas quelqu'un sur un seul « mal passé »", () => {
    // Sinon un refus mal vécu deviendrait une arme.
    expect(consequences('mal_passe', vierge).exclureDeLAppariement).toBe(false);
  });

  it('exclut après trois « mal passé » de personnes distinctes', () => {
    // On n'a pas besoin de savoir ce qui s'est passé pour agir sur une répétition :
    // c'est ce qui permet de se passer de champ libre côté adultes (§14.1).
    const historique = { malPasseDistincts: SECURITE.SIGNALEMENTS_AVANT_EXCLUSION - 1, graves: 0 };
    expect(consequences('mal_passe', historique).exclureDeLAppariement).toBe(true);
  });

  it('exclut sur un seul signalement grave', () => {
    expect(consequences('quelque_chose_de_grave', vierge).exclureDeLAppariement).toBe(true);
  });

  it('affiche les ressources quand c\'est grave, et seulement alors', () => {
    // On ne peut pas aider soi-même, on peut indiquer qui le peut. Zéro donnée
    // collectée, zéro obligation créée (§14.1).
    expect(consequences('quelque_chose_de_grave', vierge).afficherRessources).toBe(true);
    expect(consequences('mal_passe', vierge).afficherRessources).toBe(false);
  });

  it('demande le lendemain même si la rencontre n\'a pas eu lieu', () => {
    // C'est précisément là qu'il est le plus utile : quelqu'un qui a attendu dans un
    // café et n'a vu personne est exactement la personne à interroger (§13.5 bis).
    expect(retourDuLendemainDu(T0, false)).toBe(retourDuLendemainDu(T0, true));
  });
});

describe('indicateur de fiabilité', () => {
  const neuf = { score: 1, abandonsSilencieux: 0, exclu: false };

  it('se dégrade sur un abandon silencieux', () => {
    const apres = degraderPourAbandonSilencieux(neuf);
    expect(apres.score).toBeLessThan(neuf.score);
    expect(apres.abandonsSilencieux).toBe(1);
  });

  it('dépriorise après trois abandons silencieux', () => {
    let etat = neuf;
    for (let i = 0; i < SECURITE.ABANDONS_SILENCIEUX_AVANT_DEPRIORISATION; i += 1) {
      etat = degraderPourAbandonSilencieux(etat);
    }
    expect(depriorise(etat)).toBe(true);
  });

  it('laisse tranquille quelqu\'un qui explique ses départs', () => {
    // Le système récompense la politesse sans jamais le dire (§10.7).
    expect(depriorise(neuf)).toBe(false);
  });
});

describe('canal mineurs', () => {
  it('accepte un texte libre — le seul de toute l\'application', () => {
    expect(signalementMineurRecevable({ par: A, texte: 'Il a insisté pour me voir.' })).toBe(
      true,
    );
  });

  it('refuse un signalement vide', () => {
    expect(signalementMineurRecevable({ par: A, texte: '   ' })).toBe(false);
  });

  it('borne la longueur, pour que le formulaire ne serve pas à autre chose', () => {
    expect(
      signalementMineurRecevable({ par: A, texte: 'x'.repeat(LONGUEUR_MAX_SIGNALEMENT + 1) }),
    ).toBe(false);
  });

  it('vérifie l\'email quand il est fourni, et l\'accepte absent', () => {
    expect(signalementMineurRecevable({ par: A, texte: 'ok', email: 'pas-un-email' })).toBe(
      false,
    );
    expect(signalementMineurRecevable({ par: A, texte: 'ok', email: 'a@b.fr' })).toBe(true);
    expect(signalementMineurRecevable({ par: A, texte: 'ok' })).toBe(true);
  });
});

describe('Kill Switch', () => {
  it('est disponible dès la première seconde', () => {
    // Rien n'empêche d'être appairé avec quelqu'un qu'on connaît déjà, et au palier 2
    // le pseudo révélé peut suffire à se reconnaître. C'est la seule issue (§14.5).
    expect(killSwitchDisponible()).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe('traces', () => {
  const trace = creerTrace('t1', A, ZONE, 'majeur', T0);

  it('n\'autorise qu\'une seule trace active', () => {
    expect(
      peutDeposer({
        tracesActives: 1,
        derniereTraceMemeZoneLe: undefined,
        plafondRelationsAtteint: false,
        maintenant: T0,
      }),
    ).toBe('deja_une_trace_active');
  });

  it('refuse deux traces dans la même zone à quelques jours d\'intervalle', () => {
    // Même floue, même expirée, la répétition dessinerait une habitude — le trajet
    // quotidien, le quartier du bureau (§8.2).
    expect(
      peutDeposer({
        tracesActives: 0,
        derniereTraceMemeZoneLe: T0 - TRACES.DELAI_MEME_ZONE_MS / 2,
        plafondRelationsAtteint: false,
        maintenant: T0,
      }),
    ).toBe('meme_zone_trop_recemment');
  });

  it('ne propose rien à quelqu\'un au plafond de relations', () => {
    // Jamais laisser ramasser puis refuser : l'auteur croirait sa trace consommée
    // (point A5 de la revue).
    expect(
      peutRamasser({
        trace,
        ramasseur: B,
        celluleRamasseur: ZONE,
        vivierRamasseur: 'majeur',
        plafondRelationsAtteint: true,
        maintenant: T0 + 1_000,
      }),
    ).toBe('plafond_relations');
  });

  it('exige d\'être dans la même zone', () => {
    expect(
      peutRamasser({
        trace,
        ramasseur: B,
        celluleRamasseur: AUTRE_ZONE as CelluleId,
        vivierRamasseur: 'majeur',
        plafondRelationsAtteint: false,
        maintenant: T0 + 1_000,
      }),
    ).toBe('pas_dans_la_zone');
  });

  it('applique le cloisonnement des viviers', () => {
    // Sinon la trace serait un moyen de le contourner.
    expect(
      peutRamasser({
        trace,
        ramasseur: B,
        celluleRamasseur: ZONE,
        vivierRamasseur: 'mineur',
        plafondRelationsAtteint: false,
        maintenant: T0 + 1_000,
      }),
    ).toBe('vivier_different');
  });

  it('expire au bout de quelques heures', () => {
    expect(
      peutRamasser({
        trace,
        ramasseur: B,
        celluleRamasseur: ZONE,
        vivierRamasseur: 'majeur',
        plafondRelationsAtteint: false,
        maintenant: T0 + TRACES.EXPIRATION_MS + 1,
      }),
    ).toBe('expiree');
  });

  it('accepte un ramassage valide', () => {
    expect(
      peutRamasser({
        trace,
        ramasseur: B,
        celluleRamasseur: ZONE,
        vivierRamasseur: 'majeur',
        plafondRelationsAtteint: false,
        maintenant: T0 + 1_000,
      }),
    ).toBeNull();
  });

  it('n\'affiche jamais d\'heure précise ni de position', () => {
    // « Récemment », pas « à 18 h 07 » — sinon on donne les habitudes de quelqu'un à
    // un inconnu (§8.2).
    const vue = vueDeTrace(trace, 'avatar-1', T0 + 30 * 60_000);
    const charge = JSON.stringify(vue);

    expect(vue.quand).toBe('recemment');
    expect(charge).not.toContain(ZONE);
    expect(charge).not.toMatch(/\d{4,}/);
  });
});
