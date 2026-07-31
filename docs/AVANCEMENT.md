# Où on en est

> Document écrit pour être lu sans être développeur. Mis à jour à chaque session.
>
> Dernière mise à jour : **toute la logique du produit est écrite et testée.**
> Il reste les écrans, le contenu, et la mise en ligne.

---

## En une phrase

**Sadfy fonctionne entièrement sous le capot.** Une rencontre peut se déclencher, une
partie se jouer, une session quotidienne se comptabiliser, un palier se franchir, un
endgame se dérouler jusqu'au mot de passe, un signalement se traiter. **203 tests**
vérifient tout ça en continu.

Ce qui manque : **les écrans**. Aucune interface n'existe encore — c'est la prochaine
étape, et la première où tu auras quelque chose à regarder et à toucher.

---

## Ce qui est fait

### Le squelette

Un dépôt en trois parties : les **règles** (partagées), le **serveur**, l'**application**
(qui produira iOS, Android et web depuis le même code).

Une vérification automatique tourne à chaque modification : types, qualité du code,
tests. **Rien ne peut être publié si un test échoue** — première des trois protections
sur les mises à jour, les deux autres étant le déploiement progressif et le retour
arrière en une minute.

### Les règles du jeu

Écrites une seule fois, importées à l'identique par l'application et le serveur : il
leur est donc **impossible de ne pas être d'accord** sur ce que vaut une partie.

Points et paliers, révélation progressive, âge (13 ans minimum, viviers étanches, écart
de 2 ans entre mineurs), écart présenté avec son sens sans jamais l'âge exact, filtres
d'appariement, rayon élastique, journée de 4 h à 4 h, gestion des versions.

### La confidentialité géographique

**Ta position ne quitte jamais ton téléphone.** Le monde est découpé en cellules
d'environ 1 km ; ton téléphone n'envoie que le numéro de cellule, plus les 8 voisines —
sans elles, deux personnes séparées de dix mètres mais de part et d'autre d'une
frontière ne se verraient jamais.

**Et pour te prévenir qu'un partenaire est dans ta zone, le serveur n'a pas besoin de
savoir où c'est.** Les deux téléphones fabriquent chacun de leur côté un secret que le
serveur ne peut pas calculer, et transforment leur cellule en un jeton illisible. Le
serveur compare deux jetons : identiques, vous êtes au même endroit. Il ne sait pas où.
Les jetons changent toutes les heures — sinon un même lieu produirait éternellement le
même code, et le serveur finirait par reconnaître un endroit récurrent sans savoir
lequel, ce qui suffit à deviner des habitudes.

### Le moteur de rencontre

Un seul candidat proposé à la fois, jamais de liste. Décliner change le jeu, jamais la
personne. Aucun refus jamais annoncé. Le rayon s'élargit visiblement puis **renonce**
plutôt que d'aller chercher quelqu'un à 800 km.

### Les cinq jeux

| Jeu | Palier | Ce qu'il apporte |
|---|---|---|
| **Blind Match** | 1 | Le seul qui produit de l'information personnelle en jouant |
| **La Scie** | 1 | La coordination pure, aucune compétence requise |
| **Portrait Robot** | 2 | L'asymétrie, 7 776 visages possibles |
| **Démineur coopératif** | 2 | Chacun voit la moitié des indices, jamais les mêmes |
| **Convergence** | 3 | Aboutir au même mot — la métaphore du produit |

La répartition épouse la courbe d'apprentissage : deux jeux symétriques d'abord, on
apprend l'application avant d'apprendre l'asymétrie. Convergence est **délibérément
tardif** — aboutir au même mot demande de savoir comment l'autre pense.

Le point important n'est pas les jeux, c'est **comment** ils fonctionnent : dans le
Portrait Robot, le visage recherché n'est pas *caché* dans l'interface de l'Inspecteur,
il **n'est jamais envoyé à son téléphone**. Un test générique vérifie qu'aucun jeu du
catalogue ne laisse fuiter sa solution.

### La boucle quotidienne

Une session vaut 100 points : **40 pour les questions, asynchrones ; 60 pour le jeu,
synchrone**. C'est le choix qui décide si l'application marche pour des gens occupés —
un duo qui n'arrive jamais à se synchroniser progresse quand même à 40 points par jour,
soit l'endgame en 25 jours au lieu de 10. Plus lent, mais **la relation ne meurt pas
d'un problème d'agenda**.

Les questions sont tirées de façon identique sur les deux téléphones sans qu'ils aient
échangé un octet. Le contenu est cloisonné : une question marquée mineurs ne franchit
jamais le vivier majeur.

Un test vérifie l'arc lui-même : **dix jours pour atteindre 1000 points.**

### L'endgame

Les deux tours, la révélation des préférences divergentes, le **double retournement**
(quand les deux ont changé d'avis pour faire plaisir à l'autre), la priorité à la femme
pour ouvrir, la grille de disponibilités, le mot de passe, le lapin traité sans punir.

Le verrou anti-pression est en place : **sept jours entre deux Décisions, trois
tentatives maximum**. Sans lui, celui qui veut se rencontrer pourrait reposer la question
tous les jours à celui qui ne veut pas.

### La sécurité

Le retour du lendemain à quatre réponses, l'écran de ressources sur un signalement
grave, le blocage immédiat de celui qui signale, l'exclusion après trois retours de
personnes distinctes, l'indicateur de fiabilité **jamais affiché à personne**, le canal
mineurs accessible en permanence, le Kill Switch disponible dès la première seconde.

### Les traces

Le rayon élargit dans l'espace, la trace élargit dans le temps. Zone d'1 km jamais un
point, jamais d'heure précise, expiration en quelques heures, et **pas deux traces dans
la même zone à quelques jours d'intervalle** — même floue, la répétition dessinerait une
habitude.

---

## Les quatre problèmes que les tests ont trouvés

C'est la partie que je trouve la plus intéressante, parce qu'aucun des quatre n'était un
plantage : à chaque fois, c'était **un principe qui fuyait**.

**1. Une recherche orpheline.** Si deux personnes appuient sur « chercher » à la même
seconde, elles peuvent s'apparier — c'est souhaitable, et même nécessaire quand il y a
peu de monde. Mais l'une des deux recherches restait active et continuait à proposer des
gens à quelqu'un déjà en partie.

**2. Un reproche déguisé.** Le fait qu'un départ ait été *silencieux* était transmis au
joueur resté. Aucun mot désagréable dans le message, mais l'information était là, et
l'interface aurait pu la reformuler en « ton partenaire est parti sans rien dire ».
C'est exactement le reproche qu'on a décidé de ne jamais adresser.

**3. Une position permanente.** En écrivant la base de données, j'ai vu que le point
mystère de l'endgame m'obligeait à conserver la zone de votre rencontre — une position,
définitivement, pour chaque relation. Avec trois ou quatre duos, on reconstitue le
quartier de quelqu'un. Le tirage se fait maintenant sur les téléphones, à partir d'un
numéro partagé : ils tombent sur le même lieu sans que le serveur ait jamais su lequel.

**4. Un catalogue qui promettait trop.** La spec disait « 5 jeux au choix » alors que le
palier 1 n'en débloque que deux. Le nombre s'adapte maintenant, et un test garantit qu'on
ne peut jamais se retrouver sans rien à proposer.

---

## Le garde-fou permanent

Un test vérifie que le protocole n'expose **jamais** de message qui violerait les
principes : annoncer un refus, ouvrir un canal de texte libre entre joueurs, transporter
une photo, divulguer la position d'un partenaire. Si quelqu'un — moi compris — en ajoute
un distraitement dans six mois, la vérification automatique refusera.

---

## Ce qui reste

1. **Les écrans** — l'application sur les trois plateformes. Le plus gros morceau
   restant, et celui qui te donnera enfin quelque chose à toucher.
2. **Le contenu** — les 1 000 à 2 000 questions, les répliques de la machine.
3. **La mise en ligne** — le serveur, puis la version web sur une adresse ouvrable
   depuis ton téléphone.

---

## Ce que j'attends de toi

**Rien qui bloque aujourd'hui.** Mais deux choses sont à lancer tôt, parce qu'elles
prennent du temps sans dépendre de moi :

**Le compte développeur Apple** (99 $/an) et **le compte Google Play** (25 $ une fois).
La vérification d'identité prend de quelques jours à quelques semaines — c'est le goulot
d'étranglement classique.

**La version web arrivera en premier** et ne demande aucun compte : une adresse à ouvrir
depuis ton téléphone. C'est comme ça que tu testeras, sans rien installer.

Et quand le contenu arrivera, j'aurai besoin de **ton goût** : j'écrirai les mille
questions, mais c'est toi qui diras si elles sont drôles. Une question fade tue une
session.
