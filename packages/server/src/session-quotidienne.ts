/**
 * La session quotidienne — le vrai cœur du produit.
 *
 * Sadfy n'est pas une application de jeu avec une couche relationnelle : c'est un
 * **rituel quotidien de découverte de l'autre**, dont le jeu est le prétexte. La
 * récompense, c'est d'apprendre quelque chose sur l'autre.
 *
 * Une session vaut 100 points : **40 pour les questions, asynchrones ; 60 pour le jeu,
 * synchrone** (§11.2). Cette répartition est le choix qui décide si l'application
 * fonctionne pour des gens occupés : coordonner cinq minutes par jour avec un inconnu
 * est difficile, et beaucoup de relations mourraient d'un simple problème d'agenda. Un
 * duo qui n'arrive jamais à se synchroniser progresse quand même à 40 points par jour —
 * l'endgame en 25 jours au lieu de 10. Plus lent, mais la relation ne meurt pas.
 *
 * C'est exactement le principe P1 : rien n'est obligatoire, tout est récompensé.
 */

import {
  RYTHME,
  bornerPointsJournee,
  graineSession,
  jourSadfy,
  niveauRevelation,
  palierPour,
  pointsSession,
  sessionCompte,
  type DuoId,
  type NiveauRevelation,
  type Palier,
  type Question,
  type TrancheAge,
  type UserId,
  type Vivier,
} from '@sadfy/shared';

// ---------------------------------------------------------------------------
// Tirage des questions
// ---------------------------------------------------------------------------

export interface CritereTirage {
  readonly duoId: DuoId;
  readonly jour: number;
  readonly vivier: Vivier;
  readonly trancheA: TrancheAge;
  readonly trancheB: TrancheAge;
  /** Questions déjà posées à ce duo : on ne repose jamais la même. */
  readonly dejaPosees: ReadonlySet<string>;
}

/**
 * Une question est-elle recevable pour ce duo ?
 *
 * Deux filtres, dont un non négociable :
 *
 * - **le cloisonnement mineurs/majeurs**, qui suit exactement celui des viviers
 *   d'appariement. Une question sur l'alcool, la sexualité ou la vie professionnelle
 *   n'a rien à faire devant un joueur de 14 ans (§11.5 bis) ;
 * - **la tranche d'âge** : une question marquée n'est tirée que si elle s'adresse aux
 *   deux. Le fonds universel, lui, passe toujours — c'est lui qui fait la majorité du
 *   travail et qui évite d'avoir à écrire six banques séparées.
 */
export function questionRecevable(question: Question, critere: CritereTirage): boolean {
  if (critere.dejaPosees.has(question.id)) return false;

  if (question.vivier !== 'les_deux' && question.vivier !== critere.vivier) return false;

  // Fonds universel : aucune tranche déclarée, donc valable pour tout le monde.
  if (question.tranches.length === 0) return true;

  return (
    question.tranches.includes(critere.trancheA) &&
    question.tranches.includes(critere.trancheB)
  );
}

/**
 * Tire les questions du jour.
 *
 * **Déterministe à partir du duo et du jour, et de rien d'autre.** Les questions étant
 * asynchrones, les deux joueurs les tirent chacun de leur côté, potentiellement à des
 * heures très différentes — le tirage ne peut donc dépendre d'aucun état local, sinon
 * ils ne recevraient pas la même chose.
 */
export function tirerQuestions(
  banque: readonly Question[],
  critere: CritereTirage,
): readonly Question[] {
  const eligibles = banque.filter((q) => questionRecevable(q, critere));
  if (eligibles.length === 0) return [];

  const graine = graineSession(critere.duoId, critere.jour);
  const combien = Math.min(
    eligibles.length,
    RYTHME.QUESTIONS_PAR_SESSION_MIN + (Math.abs(graine) % 3),
  );

  // Mélange déterministe : les deux appareils obtiennent la même liste, dans le même
  // ordre, sans avoir échangé un seul octet.
  const melange = [...eligibles];
  let etat = graine | 0;
  for (let i = melange.length - 1; i > 0; i -= 1) {
    etat = (Math.imul(etat, 1664525) + 1013904223) | 0;
    const j = Math.abs(etat) % (i + 1);
    const tampon = melange[i]!;
    melange[i] = melange[j]!;
    melange[j] = tampon;
  }

  return melange.slice(0, combien);
}

// ---------------------------------------------------------------------------
// Révélation
// ---------------------------------------------------------------------------

export interface ReponsesDuo {
  readonly questions: readonly string[];
  readonly parJoueur: Readonly<Record<string, Readonly<Record<string, number>>>>;
}

export interface Revelation {
  readonly niveau: NiveauRevelation;
  readonly convergences: number;
  readonly total: number;
  /** Vide au palier 1 : on ne révèle que le nombre, jamais lesquelles (§11.5). */
  readonly details: readonly {
    readonly questionId: string;
    readonly moi: number;
    readonly lui: number;
    readonly identique: boolean;
  }[];
  /** Uniquement à partir du palier 3, quand il repose sur assez de réponses. */
  readonly pourcentage?: number;
}

/**
 * Ce que voit `pour` à la fin de la session.
 *
 * Au palier 1, **seulement le nombre** : « 3 réponses sur 5 identiques ». Frustrant
 * dans le bon sens — c'est précisément ce qui donne envie de revenir demain.
 *
 * Le pourcentage global n'apparaît qu'au palier 3. Un « 34 % de compatibilité » affiché
 * au troisième jour se lit comme un verdict, et fait arrêter des gens alors qu'il ne
 * veut rien dire sur trois questions. Mêmes données, cadrage inverse : une collection
 * de points communs qui s'accumule (§11.5).
 */
export function calculerRevelation(
  reponses: ReponsesDuo,
  pour: UserId,
  autre: UserId,
  points: number,
  historiqueConvergences?: { readonly communes: number; readonly total: number },
): Revelation {
  const palier = palierPour(points);
  const niveau = niveauRevelation(palier);

  const miennes = reponses.parJoueur[pour] ?? {};
  const siennes = reponses.parJoueur[autre] ?? {};

  const resolues = reponses.questions.filter(
    (q) => miennes[q] !== undefined && siennes[q] !== undefined,
  );

  const details = resolues.map((questionId) => ({
    questionId,
    moi: miennes[questionId]!,
    lui: siennes[questionId]!,
    identique: miennes[questionId] === siennes[questionId],
  }));

  const convergences = details.filter((d) => d.identique).length;

  const revelation: Revelation = {
    niveau,
    convergences,
    total: resolues.length,
    details: niveau === 'nombre_seul' ? [] : details,
  };

  if (niveau === 'liste_et_pourcentage' && historiqueConvergences) {
    const { communes, total } = historiqueConvergences;
    if (total > 0) {
      return { ...revelation, pourcentage: Math.round((communes / total) * 100) };
    }
  }

  return revelation;
}

// ---------------------------------------------------------------------------
// « J'aime »
// ---------------------------------------------------------------------------

/**
 * Un ou deux par session, pas plus.
 *
 * Si on peut tout aimer, plus rien ne veut rien dire. Avec un seul à placer, le choix
 * devient un message en soi — et savoir **quelle** réponse a plu à l'autre en dit
 * souvent plus que la réponse elle-même (§11.5).
 */
export function jaimeAutorise(dejaPoses: number): boolean {
  return dejaPoses < RYTHME.JAIME_PAR_SESSION;
}

// ---------------------------------------------------------------------------
// Comptabilisation
// ---------------------------------------------------------------------------

export interface BilanSession {
  readonly points: number;
  /** `false` si le duo a déjà eu sa session comptabilisée aujourd'hui (§11.3). */
  readonly compte: boolean;
  readonly nouveauPalier?: Palier;
}

/**
 * Clôt la session et calcule les points.
 *
 * **On ne limite pas le jeu, on limite la progression.** Un duo peut rejouer autant
 * qu'il veut ; seule la première session de la journée fait avancer le compteur.
 * Bloquer les gens au moment où ils ont le plus envie tuerait l'élan du premier jour,
 * qui est le plus fragile.
 */
export function cloturerSession(params: {
  readonly pointsActuels: number;
  readonly derniereSessionJour: number | undefined;
  readonly instant: number;
  readonly offsetMinutes: number;
  readonly questionsCompletes: boolean;
  readonly jeuJoue: boolean;
  readonly jeuReussi: boolean;
  readonly memeZone: boolean;
}): BilanSession {
  const jour = jourSadfy(params.instant, params.offsetMinutes);
  const compte = sessionCompte(params.derniereSessionJour, jour);

  if (!compte) return { points: 0, compte: false };

  const bruts = pointsSession({
    questionsCompletes: params.questionsCompletes,
    jeuJoue: params.jeuJoue,
    jeuReussi: params.jeuReussi,
    memeZone: params.memeZone,
  });
  const points = bornerPointsJournee(bruts, params.memeZone);

  const avant = palierPour(params.pointsActuels);
  const apres = palierPour(params.pointsActuels + points);

  return {
    points,
    compte: true,
    ...(avant !== apres ? { nouveauPalier: apres } : {}),
  };
}
