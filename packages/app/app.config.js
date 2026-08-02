/**
 * La configuration Expo, complétée à la construction.
 *
 * `app.json` reste la source : tout ce qui ne dépend pas de l'endroit où l'on publie y
 * est écrit une fois. Ce fichier n'ajoute qu'une chose, et elle ne peut pas y être :
 * **le chemin sous lequel le site est servi**.
 *
 * GitHub Pages sert le dépôt sous `/<nom-du-depot>/`, pas à la racine. Une application
 * construite pour la racine y charge un JavaScript qui n'existe pas : page blanche, sans
 * erreur visible. Le chemin vient donc de la construction — vide en développement, celui
 * du dépôt quand la CI publie.
 */

module.exports = ({ config }) => {
  const base = process.env.SADFY_BASE_URL;

  return {
    ...config,
    ...(base
      ? { experiments: { ...config.experiments, baseUrl: base } }
      : {}),
  };
};
