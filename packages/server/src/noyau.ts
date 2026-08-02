/**
 * Le noyau portable du serveur.
 *
 * Ces modules ne touchent ni au réseau, ni à la base, ni à l'horloge : ils sont
 * exécutables **n'importe où**, y compris dans un navigateur.
 *
 * Ce n'était pas prévu au départ, c'est une conséquence heureuse de la règle A10 (les
 * modules de règles sont des fonctions pures, le temps est injecté). Et ça débloque
 * quelque chose de précieux : **on peut faire tourner un vrai serveur Sadfy dans
 * l'application elle-même**, donc tester le produit sans en héberger un.
 *
 * Ce qui est testé ainsi n'est pas une maquette : c'est exactement le code qui tournera
 * en production.
 */

export { SalleAppariement, type Evenement, type Inscrit } from './salle.js';
export { Partie, type EvenementPartie, type MoteurJeu, type ResumePartie } from './moteur.js';
export { PartiesVives } from './parties-vives.js';
export { traduirePartie, traduireSalle, type MessageAdresse } from './traduction.js';
export { CATALOGUE, moteurDe } from './jeux/index.js';
export {
  cleReplique,
  formePour,
  jeuParDefaut,
  jeuxAProposer,
  resoudreQuiChoisit,
  resoudreTheme,
} from './convergence.js';
export { calculerRevelation, cloturerSession, tirerQuestions } from './session-quotidienne.js';
export { peutOuvrir, quiOuvreLaDecision, resoudreTour } from './endgame.js';
export { consequences } from './securite.js';
export { creerTrace, peutDeposer, peutRamasser } from './traces.js';
