/** Configuration, lue une fois au démarrage. Rien de secret n'est écrit en dur. */

function requis(nom: string, defaut?: string): string {
  const valeur = process.env[nom] ?? defaut;
  if (valeur === undefined) {
    throw new Error(`Variable d'environnement manquante : ${nom}`);
  }
  return valeur;
}

export const config = {
  port: Number(requis('PORT', '3000')),
  urlBase: requis('DATABASE_URL', 'postgres://sadfy:sadfy@localhost:5432/sadfy'),
  /**
   * Mode test : accélère le temps pour parcourir un arc de dix jours en une session,
   * et autorise deux joueurs sur la même machine. Jamais actif en production — sans
   * ce garde-fou, n'importe qui pourrait sauter les paliers.
   */
  modeTest: process.env['SADFY_MODE_TEST'] === '1',
  environnement: requis('NODE_ENV', 'development'),
} as const;

export const enProduction = config.environnement === 'production';

if (enProduction && config.modeTest) {
  throw new Error('Le mode test ne peut pas être activé en production.');
}
