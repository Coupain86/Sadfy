import { describe, expect, it } from 'vitest';

import { jeuxDisponibles, type UserId } from '@sadfy/shared';

import {
  cleReplique,
  epreuveSautee,
  formePour,
  jeuParDefaut,
  jeuxAProposer,
  resoudreQuiChoisit,
  resoudreTheme,
} from './convergence.js';

const A = 'a' as UserId;
const B = 'b' as UserId;

describe('épreuve de convergence', () => {
  it('ne pose jamais les deux questions dans la même session', () => {
    // Enchaîner « qui choisit ? » puis « quel thème ? » ferait quinze secondes de
    // préambule, et la vanne s'userait en vingt secondes (§9.1).
    expect(formePour('blind_match')).toBe('quel_theme');
    expect(formePour('portrait_robot')).toBe('qui_choisit');
    expect(formePour('la_scie')).toBe('qui_choisit');
  });

  it('est sautée dès que l\'un des deux est pressé', () => {
    expect(epreuveSautee('en_mouvement', 'pose')).toBe(true);
    expect(epreuveSautee('pose', 'en_mouvement')).toBe(true);
    expect(epreuveSautee('pose', 'pose')).toBe(false);
  });

  it('désigne le bon joueur quand les deux se sont accordés', () => {
    expect(resoudreQuiChoisit(A, 'moi', B, 'l_autre')).toEqual({ type: 'accord', designe: A });
    expect(resoudreQuiChoisit(A, 'l_autre', B, 'moi')).toEqual({ type: 'accord', designe: B });
  });

  it('distingue les deux façons de rater', () => {
    // Deux chefs et deux polis ne méritent pas la même vanne : c'est déjà un
    // révélateur sur les deux personnes, obtenu gratuitement.
    expect(resoudreQuiChoisit(A, 'moi', B, 'moi').type).toBe('desaccord_deux_moi');
    expect(resoudreQuiChoisit(A, 'l_autre', B, 'l_autre').type).toBe('desaccord_deux_autres');
    expect(cleReplique(resoudreQuiChoisit(A, 'moi', B, 'moi'))).not.toBe(
      cleReplique(resoudreQuiChoisit(A, 'l_autre', B, 'l_autre')),
    );
  });

  it('mélange les thèmes au lieu de trancher', () => {
    // Avec quatre thèmes, l'accord tombe à une fois sur trois ou quatre : arbitrer
    // ferait de la vanne d'échec la routine. En mélangeant, personne n'a perdu.
    const melange = resoudreTheme('cuisine', 'cinema');
    expect(melange.type).toBe('themes_melanges');
    if (melange.type === 'themes_melanges') {
      expect(melange.themes).toEqual(['cuisine', 'cinema']);
    }
  });

  it('souligne l\'accord quand les thèmes coïncident', () => {
    const accord = resoudreTheme('musique', 'musique');
    expect(accord.type).toBe('themes_identiques');
  });

  it('ne propose jamais plus de jeux qu\'il n\'y en a de débloqués', () => {
    // Correction du point B2 de la revue : « 5 jeux au choix » était impossible à
    // tenir au palier 1.
    expect(jeuxAProposer('fantome')).toEqual(jeuxDisponibles('fantome'));
    expect(jeuxAProposer('fantome').length).toBe(2);
    expect(jeuxAProposer('decision').length).toBeLessThanOrEqual(5);
  });

  it('choisit toujours un jeu réellement disponible quand il tranche', () => {
    for (let graine = 0; graine < 50; graine += 1) {
      const jeu = jeuParDefaut('fantome', graine);
      expect(jeuxDisponibles('fantome')).toContain(jeu);
    }
  });

  it('tranche de façon déterministe, pour que les deux appareils soient d\'accord', () => {
    expect(jeuParDefaut('partenaire', 12345)).toBe(jeuParDefaut('partenaire', 12345));
  });
});
