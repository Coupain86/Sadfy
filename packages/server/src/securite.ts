/**
 * Sécurité — signalements, blocages, indicateur de fiabilité.
 *
 * Sadfy n'a ni compte, ni nom, ni photo, ni historique : **aucun des outils habituels
 * pour écarter un mauvais profil**. Ce module est donc tout ce dont dispose le produit,
 * et il repose sur une idée simple : on n'a pas besoin de savoir *ce qui* s'est passé
 * pour agir sur une **répétition** (§14.1).
 *
 * Trois « ça s'est mal passé » venant de trois personnes différentes sur le même
 * identifiant sont exploitables sans lire une ligne. C'est ce qui permet de se passer
 * de champ libre côté adultes — une équipe sans service de modération permanent est
 * plus responsable en ne collectant pas ce qu'elle ne peut pas traiter.
 */

import { SECURITE, type RetourRencontre, type UserId } from '@sadfy/shared';

// ---------------------------------------------------------------------------
// Le retour du lendemain
// ---------------------------------------------------------------------------

export interface Signalement {
  readonly par: UserId;
  readonly vise: UserId;
  readonly retour: RetourRencontre;
}

export interface ConsequencesSignalement {
  /** Toujours vrai dès qu'un retour est négatif : gratuit, immédiat, sans enquête. */
  readonly bloquerReciproquement: boolean;
  /** Écran de numéros utiles — police, aide aux victimes, violences faites aux femmes. */
  readonly afficherRessources: boolean;
  readonly exclureDeLAppariement: boolean;
}

/**
 * Ce qu'un retour déclenche.
 *
 * **Un signalement protège immédiatement celui qui signale** — blocage réciproque,
 * aucune enquête nécessaire. C'est gratuit et sans risque, donc il n'y a aucune raison
 * d'attendre.
 *
 * **Exclure quelqu'un de toute l'application** demande davantage : soit un fait grave,
 * soit une répétition. Sinon un refus mal vécu deviendrait une arme.
 */
export function consequences(
  retour: RetourRencontre,
  historique: { readonly malPasseDistincts: number; readonly graves: number },
): ConsequencesSignalement {
  const negatif = retour !== 'bien_passe';
  const grave = retour === 'quelque_chose_de_grave';

  const malPasse = historique.malPasseDistincts + (retour === 'mal_passe' ? 1 : 0);
  const graves = historique.graves + (grave ? 1 : 0);

  return {
    bloquerReciproquement: negatif,
    // On ne peut pas aider soi-même, on peut indiquer qui le peut. Zéro donnée
    // collectée, zéro obligation créée — et ça protège aussi l'exploitant : il a
    // orienté (§14.1).
    afficherRessources: grave,
    exclureDeLAppariement:
      graves >= SECURITE.SIGNALEMENTS_GRAVES_AVANT_EXCLUSION ||
      malPasse >= SECURITE.SIGNALEMENTS_AVANT_EXCLUSION,
  };
}

/**
 * Le retour du lendemain se déclenche **même quand la rencontre n'a pas eu lieu**.
 *
 * C'est précisément là qu'il est le plus utile : quelqu'un qui a attendu dans un café
 * avec un mot de passe absurde et qui n'a vu personne est exactement la personne à qui
 * il faut demander comment ça s'est passé (§13.5 bis).
 */
export function retourDuLendemainDu(
  rendezVousLe: number,
  rencontreEuLieu: boolean,
): number {
  void rencontreEuLieu;
  return rendezVousLe + 24 * 3_600_000;
}

// ---------------------------------------------------------------------------
// Indicateur de fiabilité
// ---------------------------------------------------------------------------

export interface Fiabilite {
  readonly score: number;
  readonly abandonsSilencieux: number;
  readonly exclu: boolean;
}

/**
 * **Strictement interne. Jamais affiché, jamais transmis, aucun score visible à
 * quiconque** (§14.6).
 *
 * Il ne sert qu'à dépriorriser dans l'appariement, puis à exclure. Un utilisateur ne
 * doit jamais pouvoir découvrir sa note, ni celle d'un autre : une note visible
 * deviendrait un jugement, et Sadfy repose entièrement sur le fait qu'il n'y a rien à
 * juger chez l'autre.
 */
export function degraderPourAbandonSilencieux(fiabilite: Fiabilite): Fiabilite {
  const abandons = fiabilite.abandonsSilencieux + 1;
  return {
    ...fiabilite,
    abandonsSilencieux: abandons,
    score: Math.max(0, fiabilite.score - 0.1),
  };
}

/**
 * Un départ **expliqué** ne dégrade rien.
 *
 * Le système récompense ainsi la politesse sans jamais le dire — et les gens utilisent
 * le message de sortie parce que c'est la voie naturelle, pas parce qu'on les y force
 * (§10.7).
 */
export function departExpliqueNeCompteJamais(): boolean {
  return true;
}

export function depriorise(fiabilite: Fiabilite): boolean {
  return (
    fiabilite.abandonsSilencieux >= SECURITE.ABANDONS_SILENCIEUX_AVANT_DEPRIORISATION ||
    fiabilite.score < 0.7
  );
}

// ---------------------------------------------------------------------------
// Le canal mineurs
// ---------------------------------------------------------------------------

export interface SignalementMineur {
  readonly par: UserId;
  readonly texte: string;
  readonly email?: string;
}

/**
 * Le canal mineurs est le **seul endroit de toute l'application où du texte libre est
 * accepté**, et le seul où Sadfy détient une donnée personnelle. C'est assumé et
 * annoncé (§14.2).
 *
 * Il est **accessible en permanence**, pas déclenché par un questionnaire du lendemain :
 * les mineurs n'ayant pas de rencontre organisée, ce questionnaire ne partirait jamais.
 * C'était une lacune de la spec, relevée à la relecture.
 */
export function canalMineurAccessibleEnPermanence(): boolean {
  return true;
}

/** Longueur maximale, pour éviter qu'un formulaire ne serve à autre chose. */
export const LONGUEUR_MAX_SIGNALEMENT = 4_000;

export function signalementMineurRecevable(s: SignalementMineur): boolean {
  if (s.texte.trim().length === 0) return false;
  if (s.texte.length > LONGUEUR_MAX_SIGNALEMENT) return false;
  if (s.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Kill Switch
// ---------------------------------------------------------------------------

/**
 * Le Kill Switch est accessible **dès la première seconde, à tout palier**.
 *
 * La v1 le rangeait dans l'endgame. Or rien n'empêche d'être appairé avec quelqu'un
 * qu'on connaît déjà — un collègue, un voisin, un frère ou une sœur, un ex — et au
 * palier 2 le pseudo révélé peut suffire à se reconnaître. C'est structurellement
 * impossible à empêcher sans identité, et le Kill Switch immédiat est la seule issue
 * (§14.5).
 */
export function killSwitchDisponible(): boolean {
  return true;
}

/**
 * Le blocage est **réciproque et côté serveur**.
 *
 * Un blocage purement local rendrait l'autre invisible pour soi, mais on resterait
 * visible pour lui — la v1 avait ce défaut. C'est la seule fonctionnalité qui exige
 * vraiment que le serveur retienne quelque chose : un couple d'identifiants anonymes.
 *
 * Limite à énoncer honnêtement : le carnet est stocké sur les deux appareils, donc
 * celui qui a été bloqué conserve le sien. Acceptable — il ne contient rien
 * d'identifiant — mais il ne faut pas laisser croire à un effacement total.
 */
export const BLOCAGE_RECIPROQUE_COTE_SERVEUR = true;
export const CARNET_DE_L_AUTRE_NON_EFFACABLE = true;
