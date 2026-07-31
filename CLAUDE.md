# Sadfy — instructions de travail

## Ce qu'est ce dépôt

Sadfy est un **rituel quotidien de découverte de l'autre**, déclenché par une rencontre
fortuite géolocalisée, conçu pour aboutir en une dizaine de jours à une rencontre réelle.
Le jeu coopératif n'est pas la finalité : c'est le prétexte et le liant.

**La spec fait autorité : `docs/SPEC-v2.md`.** Elle a été construite étape par étape avec
Amin, qui n'est pas développeur. Chaque règle y porte un numéro de section. Le code cite
ces numéros. Si le code et la spec divergent, c'est un bug — de l'un ou de l'autre, et il
faut trancher avec Amin avant d'écrire.

`docs/REVUE-v2.md` conserve la revue critique qui a produit 20 corrections. Elle ne décrit
plus l'état de la spec, elle explique **pourquoi** certaines règles ont l'air tordues.

## La mémoire du projet, c'est ce dépôt

Je n'ai pas de mémoire entre les sessions. Tout ce qui compte est écrit ici :

| Fichier | Rôle |
|---|---|
| `docs/SPEC-v2.md` | La référence fonctionnelle |
| `docs/ARCHITECTURE.md` | Les choix techniques et leurs raisons |
| `docs/AVANCEMENT.md` | Où on en est, lisible par Amin sans être développeur |
| `CLAUDE.md` | Ce fichier |

**Tenir `docs/AVANCEMENT.md` à jour à chaque session est une obligation, pas une option.**
C'est ce qu'Amin lit pour savoir où on en est sans avoir à demander.

## Les sept principes, qui priment sur toute fonctionnalité

En cas de conflit, c'est la fonctionnalité qui cède, jamais le principe.

1. **Rien n'est obligatoire, tout est récompensé** — géographie, synchronisation, rythme
   quotidien : jamais des murs, toujours des incitations.
2. **Zéro donnée personnelle**, pas zéro serveur. Le serveur existe, il ne sait rien.
3. **Jamais de texte libre entre joueurs.** Le seul texte libre autorisé va vers
   l'exploitant, et uniquement depuis le canal mineurs.
4. **Aucun média échangé.** Ni photo, ni son, ni vidéo. Il n'y a rien à modérer.
5. **Un refus ne se révèle jamais** — sauf à l'endgame, où la transparence l'emporte.
6. **La progression appartient au duo**, jamais à l'individu.
7. **La proximité est récompensée, jamais requise** — sauf au tout premier contact.

Un test automatique (`protocol.ts` / `MESSAGES_INTERDITS`) protège les principes 3, 4 et 5
contre une addition distraite. Ne pas le contourner.

## Conventions

- **Aucun nombre magique.** Toute valeur venant de la spec vit dans
  `packages/shared/src/constants.ts`, avec la référence de sa section.
- **Le noyau de règles est partagé.** Points, paliers, âge, appariement : écrits une fois
  dans `@sadfy/shared`, importés par l'application *et* le serveur. Il leur est donc
  impossible de ne pas être d'accord.
- **Le serveur fait autorité sur les parties** et n'envoie à chaque joueur que *sa* vue.
  Ce n'est pas de l'anti-triche : c'est ce qui rend les jeux asymétriques possibles.
- **Français** pour le code métier, les commentaires et les commits. Le domaine est en
  français, le traduire ne ferait qu'ajouter une couche de traduction mentale.
- Les commentaires expliquent **pourquoi**, pas quoi. La plupart des règles de Sadfy ont
  l'air arbitraires sans leur raison — c'est cette raison qu'il faut écrire.

## Commandes

```bash
npm install
npm run build --workspace @sadfy/shared   # requis avant de typer le serveur
npm run check                             # types + lint + tests
npm test --workspace @sadfy/shared
```

## Ce qui demande une décision d'Amin

Ne jamais trancher seul : l'âge, la sécurité, ce qui est révélé et quand, tout ce qui
touche à la rencontre réelle, et toute règle qui ferait de Sadfy une application où l'on
balaye des profils. En cas de doute, demander — il répond vite et précisément.
