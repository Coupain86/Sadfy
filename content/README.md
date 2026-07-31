# Le contenu de Sadfy

Ce dossier contient tout ce qui se lit à l'écran et qui n'est pas de l'interface : les
questions, les répliques de la machine, les libellés des jeux.

**Il se met à jour indépendamment de l'application** (§A6). Corriger une question ou en
ajouter cinquante ne demande aucune soumission aux stores : le contenu part par mise à
jour à la volée et arrive en quelques heures.

---

## Les fichiers

| Fichier | Rôle |
|---|---|
| `questions/universelles.json` | Le fonds commun — fonctionne à tout âge, majeurs et mineurs |
| `questions/majeurs.json` | Réservé au vivier majeur |
| `questions/mineurs.json` | Réservé au vivier mineur |
| `questions/tranches/*.json` | Ciblées par tranche d'âge |
| `voix-machine.json` | Les répliques du personnage |
| `jeux/*.json` | Libellés propres à chaque jeu |

---

## Comment une question est tirée

Rappel de la règle (§11.5 bis), parce qu'elle explique la structure des fichiers :

**Une banque universelle, plus des extensions étiquetées par tranche.** La session pioche
dans **l'intersection des tranches des deux joueurs**, plus le fonds commun.

Concrètement : un duo de 25 et 40 ans ne partage aucune tranche et ne reçoit donc que de
l'universel ; un duo de 22 et 24 ans reçoit en plus tout ce qui est propre aux 18-25.

C'est pour ça qu'il ne faut **pas** fabriquer six banques séparées : le volume de
production exploserait, et un duo d'âges différents se retrouverait sans rien.
L'universel doit rester la grosse majorité du contenu.

---

## Les règles de rédaction, non négociables

### Aucune question ne doit permettre d'identifier quelqu'un

**Interdits absolus** : le métier, l'employeur, le quartier, la ville, l'école, le
prénom, l'origine, l'état civil, les revenus.

Ce n'est pas de la prudence excessive. La révélation progressive est censée culminer au
mot de passe absurde du rendez-vous ; si une question laisse deviner le lycée de
quelqu'un au troisième jour, **l'anonymat a fui avant même le dispositif censé le
protéger**.

En cas de doute, le test est simple : *est-ce que la réponse rétrécit la liste des gens
que ça pourrait être ?* Si oui, la question est mauvaise.

### Le cloisonnement mineurs/majeurs suit celui des viviers

Une question sur l'alcool, la sexualité, la vie professionnelle, la colocation ou les
impôts n'a rien à faire devant un joueur de 14 ans. Un fichier mal étiqueté est un bug de
sécurité, pas une coquille — et un test le refuse.

### Quatre choix, toujours

Ni deux, ni trois, ni cinq. Le format est fixe parce que l'interface et le calcul de
convergence en dépendent.

### Aucun choix ne doit être « la bonne réponse »

Le Blind Match n'a pas de bonne réponse — c'est écrit dans son moteur, qui ne fait jamais
échouer une partie. Une question dont un choix est manifestement le bon transforme le jeu
en examen, et deux personnes différentes finiraient leur première partie sur un constat
de défaite.

Le bon calibrage : **les quatre choix doivent être défendables**, et idéalement drôles.

### La voix de la machine vise le duo, jamais l'un des deux

« Il va falloir vous battre » — un « vous ». « L'un de vous deux est difficile » —
poison : dès qu'une blague désigne quelqu'un, elle crée une gêne dont la relation ne se
remet pas.

Et un faible score est **un défi, jamais un diagnostic**. « Vous n'avez rien en commun »
ferme la porte ; « trois réponses sur cinq à l'opposé, ça promet des débats » ouvre.

### Il en faut beaucoup

Une vingtaine de variantes par situation pour la voix de la machine, sinon la répétition
tue l'effet en trois jours. Et **1 000 à 2 000 questions** pour ouvrir sans que les gens
tournent en rond : un arc consomme une cinquantaine de questions, et un joueur en vit
plusieurs.

---

## Volumétrie

| Poste | Cible pour l'ouverture | État |
|---|---|---|
| Questions universelles | ~1 200 | En cours |
| Questions par tranche | ~100 par tranche | En cours |
| Questions mineurs | ~300 | En cours |
| Voix de la machine | ~20 par situation | En cours |

Le fichier `content/verifier.test.ts` refuse toute question qui enfreint les règles
ci-dessus. Il ne juge pas si une question est drôle — ça, c'est le travail d'Amin.
