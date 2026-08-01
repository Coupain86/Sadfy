# Où on en est

> Document écrit pour être lu sans être développeur. Mis à jour à chaque session.
>
> Dernière mise à jour : **toute la logique est écrite et testée**, et les premiers
> écrans existent. Il reste les écrans de jeu, la session quotidienne, l'endgame et la
> mise en ligne.

---

## En une phrase

**Sadfy fonctionne entièrement sous le capot.** Une rencontre peut se déclencher, une
partie se jouer, une session quotidienne se comptabiliser, un palier se franchir, un
endgame se dérouler jusqu'au mot de passe, un signalement se traiter. **241 tests**
vérifient tout ça en continu.

L'application a maintenant un visage : le langage visuel est posé, l'onboarding, la
liste des duos et la recherche existent. Il reste les écrans de jeu, la session
quotidienne et l'endgame — puis la mise en ligne, et tu pourras enfin toucher.

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

### Le contenu, et son garde-fou

**75 questions écrites** et une cinquantaine de répliques pour la machine. C'est un début
de production, pas la cible : il en faut **1 000 à 2 000** pour ouvrir sans que les gens
tournent en rond.

Ce qui est en place, et qui vaut plus que le volume, c'est le **vérificateur
automatique**. Il refuse toute question qui :

- **permettrait d'identifier quelqu'un** — métier, quartier, école, prénom, revenus. Le
  test est simple : *est-ce que la réponse rétrécit la liste des gens que ça pourrait
  être ?* Si oui, la question est mauvaise. Si une question laisse deviner le lycée de
  quelqu'un au troisième jour, l'anonymat a fui **avant même** le mot de passe censé le
  protéger ;
- **franchirait le cloisonnement mineurs/majeurs** — y compris dans le fonds universel,
  et c'est le piège : « universel » veut dire lu aussi par un joueur de 13 ans ;
- **n'aurait pas quatre choix défendables** — une question dont un choix est
  manifestement le bon transformerait le Blind Match en examen.

Et il vérifie la voix de la machine : jamais de vanne qui désigne l'un des deux, jamais
de faible score formulé comme un verdict.

Il ne juge pas si une question est **drôle**. Ça, ce sera ton travail — et c'est le seul
jugement qui compte vraiment.

### L'application — ses deux briques les plus risquées

J'ai commencé par ce qui porte le risque réel, pas par ce qui se voit.

**Le stockage local.** C'est l'endroit le plus dangereux du projet : sans compte, ton
carnet vit sur ton téléphone, et il n'existe aucun « mot de passe oublié » pour le
récupérer. Trois protections sont en place :

- on **sauvegarde l'ancien avant d'écrire le nouveau**, pour qu'une écriture interrompue
  — batterie vide, application fermée par le système — laisse quand même un état
  cohérent ;
- on **relit ce qu'on vient d'écrire**. Sur un téléphone, une écriture peut échouer sans
  rien dire quand le disque est plein ; sans cette vérification, on ne s'en apercevrait
  qu'au démarrage suivant, données perdues ;
- on **refuse de démarrer plutôt que de corrompre**. Si les données sont plus récentes que
  l'application — cas typique d'un retour en arrière —, rien n'est réécrit. Un écran
  d'erreur vaut infiniment mieux qu'un carnet à moitié converti.

**La connexion.** Le réseau mobile y est traité comme le quotidien, pas comme une panne.
Les actions faites pendant une coupure sont mises de côté et rejouées au retour — sans
ça, quelque chose fait juste avant d'entrer dans un tunnel disparaîtrait en silence et tu
croirais l'application cassée. Les tentatives de reconnexion s'espacent, parce que
marteler le serveur depuis un tunnel ne reconnecte personne et vide la batterie.

Et si le serveur refuse la version de ton application, elle **arrête de réessayer** et
affiche « mets à jour pour continuer ». Sans ce cas, tu verrais une reconnexion
perpétuelle sans jamais comprendre pourquoi.

### Le visage de l'application

Une contrainte gouverne toute l'interface : **il n'y a aucune photo, aucun média, aucun
profil à regarder.** L'écran ne peut donc pas s'appuyer sur des images pour exister —
c'est la typographie, l'espace et la couleur qui doivent porter l'émotion.

**Sombre par défaut** : Sadfy se joue le soir, dans un métro, sous un lampadaire, et un
fond blanc à 22 h agresse. **Beaucoup d'espace, peu d'éléments** : un écran pose une
question à la fois. La densité serait un contresens pour un produit qui vend l'attention
portée à une seule personne.

La voix de la machine a son propre traitement, visuellement distinct de tout le reste :
les deux sources doivent être discernables d'un coup d'œil, sinon une vanne pourrait
passer pour une pique du partenaire.

**Ce qui existe déjà** :

- **L'onboarding**, en trois écrans. On ne demande que ce qui a une raison, et la raison
  est dite. On demande l'**année** de naissance, pas le jour : l'âge à l'année près
  suffit au cloisonnement, donc c'est une donnée de moins à détenir.
- **L'écran d'erreur de stockage**, volontairement un cul-de-sac. Pas de bouton
  « recommencer à zéro » : ce serait offrir un geste qui détruit définitivement une
  relation à 900 points.
- **La liste des duos**, qui n'affiche jamais « X n'a pas joué depuis 4 jours » — c'est
  factuel et ça se lit comme un abandon. On affiche « en pause » et le bouton pour
  relancer. Et jamais le total de points comme un score : ce qui est montré, c'est ce qui
  va se débloquer.
- **La recherche**, avec son rayon qui s'élargit visiblement, sa demande de position
  précédée de son explication, et son écran « personne pour l'instant » qui propose la
  trace plutôt que de laisser dans le vide.

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

1. **Les écrans restants** — les interfaces des cinq jeux, la session quotidienne avec
   sa révélation, et l'endgame. L'onboarding, la liste des duos et la recherche sont
   faits. **C'est le plus gros morceau restant.**
2. **La mise en ligne** — le serveur, puis la version web sur une adresse ouvrable
   depuis ton téléphone.
3. **Le reste du contenu** — la structure et les règles sont posées, il faut monter de
   75 à ~1 500 questions. C'est du travail continu, pas un préalable.

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
