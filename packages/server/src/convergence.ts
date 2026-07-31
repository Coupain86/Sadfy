/**
 * L'épreuve de convergence — le choix du jeu devient le premier jeu.
 *
 * En cinq secondes, tout le principe de Sadfy est enseigné sans une ligne
 * d'explication : deux personnes répondent en aveugle, et l'application leur dit
 * immédiatement si elles sont accordées.
 *
 * **Les deux répondent en aveugle, révélés simultanément.** Sinon le second s'aligne
 * sur le premier et le test ne teste rien.
 *
 * Deux formes, jamais les deux dans la même session (§9.1) — enchaîner « qui choisit ? »
 * puis « quel thème ? » ferait quinze secondes de préambule avant le vrai jeu, et la
 * vanne, excellente une fois, s'userait en vingt secondes.
 */

import {
  RECHERCHE,
  jeuxDisponibles,
  type FormeConvergence,
  type JeuId,
  type Palier,
  type ResultatConvergence,
  type UserId,
} from '@sadfy/shared';

/** Forme retenue pour une session : elle s'adapte au jeu, elle ne se répète jamais. */
export function formePour(jeu: JeuId): FormeConvergence {
  // Un jeu de quiz fait porter la convergence sur le thème ; tous les autres sur
  // « qui choisit ».
  return jeu === 'blind_match' ? 'quel_theme' : 'qui_choisit';
}

/**
 * L'épreuve est sautée en mode « en mouvement » : quelqu'un qui a annoncé dix minutes
 * n'a pas à en dépenser une en préambule (§9.1).
 */
export function epreuveSautee(
  disponibiliteA: string,
  disponibiliteB: string,
): boolean {
  return disponibiliteA === 'en_mouvement' || disponibiliteB === 'en_mouvement';
}

// ---------------------------------------------------------------------------
// Forme A — qui choisit ?
// ---------------------------------------------------------------------------

/**
 * L'accord se produit quand les deux ont désigné **la même personne** : l'un dit
 * « moi », l'autre dit « l'autre ».
 *
 * Les deux échecs ne se ressemblent pas et méritent deux vannes distinctes — deux
 * chefs, ou deux polis. C'est déjà un révélateur sur les deux personnes, obtenu
 * gratuitement, avant même que la partie commence.
 */
export function resoudreQuiChoisit(
  a: UserId,
  choixA: 'moi' | 'l_autre',
  b: UserId,
  choixB: 'moi' | 'l_autre',
): ResultatConvergence {
  if (choixA === 'moi' && choixB === 'l_autre') return { type: 'accord', designe: a };
  if (choixA === 'l_autre' && choixB === 'moi') return { type: 'accord', designe: b };
  if (choixA === 'moi' && choixB === 'moi') return { type: 'desaccord_deux_moi' };
  return { type: 'desaccord_deux_autres' };
}

// ---------------------------------------------------------------------------
// Forme B — quel thème ?
// ---------------------------------------------------------------------------

/**
 * En cas de désaccord, **les deux thèmes sont mélangés** plutôt qu'arbitrés.
 *
 * Ce n'est pas une commodité, c'est de l'arithmétique. Pour « qui choisit », il y a
 * deux réponses possibles et l'accord survient environ une fois sur deux : l'échec
 * reste l'exception, donc la vanne garde son effet de surprise. Pour un thème choisi
 * parmi quatre, l'accord tombe à une fois sur trois ou quatre — la machine trancherait
 * la plupart du temps, et ce qui devait être un moment de complicité deviendrait la
 * routine. En mélangeant, personne n'a perdu, les deux choix ont servi, et les quiz
 * sont plus variés.
 */
export function resoudreTheme(themeA: string, themeB: string): ResultatConvergence {
  if (themeA === themeB) return { type: 'themes_identiques', theme: themeA };
  return { type: 'themes_melanges', themes: [themeA, themeB] };
}

// ---------------------------------------------------------------------------
// Ce qui suit l'épreuve
// ---------------------------------------------------------------------------

/**
 * Jeux proposés au gagnant.
 *
 * **Jamais un nombre fixe.** La spec disait « 5 jeux au choix » alors que le palier 1
 * n'en débloque que deux — c'était le point B2 de la revue. Le catalogue s'adapte donc
 * à ce qui est réellement disponible, et au palier 1 le choix se fait entre deux, ce
 * qui est très bien.
 */
export function jeuxAProposer(palier: Palier): readonly JeuId[] {
  return jeuxDisponibles(palier).slice(0, RECHERCHE.JEUX_PROPOSES_MAX);
}

/**
 * Le système tranche, quand l'épreuve a échoué ou qu'elle a été sautée.
 *
 * Déterministe à partir de la graine : les deux appareils doivent aboutir au même jeu
 * sans avoir à se synchroniser.
 */
export function jeuParDefaut(palier: Palier, graine: number): JeuId {
  const catalogue = jeuxDisponibles(palier);
  return catalogue[Math.abs(graine) % catalogue.length] ?? 'blind_match';
}

/**
 * Clé de la réplique à afficher. Le texte lui-même vit dans `content/` et se met à jour
 * sans passer par les stores (§A6).
 *
 * Deux règles de rédaction jamais négociables pour ces répliques (§16) :
 * la vanne vise **toujours le duo, jamais l'un des deux** — dès qu'une blague désigne
 * quelqu'un, elle crée une gêne dont la relation ne se remet pas ; et un faible score
 * est **un défi, jamais un diagnostic**.
 */
export function cleReplique(resultat: ResultatConvergence): string {
  switch (resultat.type) {
    case 'accord':
      return 'convergence.accord';
    case 'desaccord_deux_moi':
      return 'convergence.deux_chefs';
    case 'desaccord_deux_autres':
      return 'convergence.deux_polis';
    case 'themes_identiques':
      return 'convergence.themes_identiques';
    case 'themes_melanges':
      return 'convergence.themes_melanges';
  }
}
