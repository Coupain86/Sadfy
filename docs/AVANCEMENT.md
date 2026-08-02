# Où on en est

> Document écrit pour être lu sans être développeur. Mis à jour à chaque session.
>
> Dernière mise à jour : **l'application est complète et raccordée au serveur.**
> Il reste à la mettre en ligne, et à produire le reste du contenu.

---

## En une phrase

**Sadfy fonctionne entièrement sous le capot.** Une rencontre peut se déclencher, une
partie se jouer, une session quotidienne se comptabiliser, un palier se franchir, un
endgame se dérouler jusqu'au mot de passe, un signalement se traiter. **253 tests**
vérifient tout ça en continu.

Tous les écrans existent, de l'onboarding jusqu'au mot de passe du rendez-vous, et
**ils sont branchés sur le serveur** : une proposition acceptée démarre réellement une
partie, les vues arrivent projetées, une coupure met la partie en pause au lieu de la
tuer. Ce qui reste, c'est **la mise en ligne** — et à ce moment-là tu auras une adresse
à ouvrir depuis ton téléphone.

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

**136 questions écrites** et **108 répliques** pour la machine, réparties sur 14
situations. Les extensions par tranche d'âge existent — 13-15, 16-17, 18-25, 26-39,
40-55, 56+ — et le fonds universel reste largement majoritaire, ce qu'un test vérifie :
sinon un duo d'âges différents, qui ne partage aucune tranche, se retrouverait sans
questions.

C'est un début de production, pas la cible : il en faut **1 000 à 2 000** pour ouvrir
sans que les gens tournent en rond.

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
- **La session quotidienne** — questions, attente, révélation. L'ordre compte : la
  session se termine sur la révélation, parce que c'est pour elle qu'on revient demain.
  Et deux phrases y désamorcent ce que le produit pourrait faire ressentir à tort :
  « il n'y a pas de bonne réponse, seulement la tienne » sous les questions, et « sans
  partie, tu avances quand même — un peu plus lentement » quand le partenaire n'est pas
  disponible, pour ne pas donner l'impression d'avoir raté sa journée.
- **Le premier jeu jouable** — La Scie, avec son briefing, sa bûche qui s'entaille et son
  écran de fin. Cet écran de fin dit explicitement que **les points sont acquis même
  quand la partie est perdue** : sans cette phrase, l'échec serait vécu comme une perte
  alors qu'il n'en est pas une.
- **Le Portrait Robot**, premier jeu asymétrique à l'écran — et c'est là que la règle
  fondatrice devient visible : **deux interfaces réellement différentes**, pas une
  interface avec des parties masquées. Le composant de l'Inspecteur ne reçoit même pas
  le visage recherché en paramètre : il ne pourrait pas l'afficher même si on le lui
  demandait. La contrainte est dans le code, pas dans la vigilance de celui qui l'écrit.
- **Les quatre autres jeux** — Blind Match avec sa révélation simultanée, Démineur
  coopératif où chacun voit la moitié de la grille, Convergence et ses tours successifs.
- **L'endgame complet** — l'ouverture, les quatre options, la divergence révélée, le
  double retournement mis en scène, l'arrêt réversible, et le rendez-vous avec son point
  mystère et son mot de passe.

**Tous les écrans du parcours existent maintenant.**

### Le raccordement — la pièce qui manquait

Jusqu'ici, les deux moitiés du produit existaient **sans se parler** : la logique
serveur d'un côté, les écrans de l'autre. Le fil est tiré.

Quand une proposition est acceptée, la partie démarre pour de bon : briefing envoyé aux
deux, vues projetées à chacun, horloge branchée. Et **une déconnexion ne termine pas la
partie** — elle la met en pause, et la reconnexion la reprend exactement où elle en
était. C'était vrai dans le moteur ; c'est maintenant vrai jusque dans la couche réseau,
là où ça compte quand quelqu'un entre dans un tunnel.

La couche de raccordement côté application ne contient **aucune règle**. Elle traduit des
messages en état d'écran, rien de plus. La position est convertie en cellule sur
l'appareil : ce qui part sur le réseau n'est déjà plus une position. Et les vues de jeu
arrivent déjà projetées — l'application n'a rien à masquer, elle n'a simplement pas reçu
ce qui ne la regarde pas.

### La mise en ligne est préparée

`docs/DEPLOIEMENT.md` décrit tout : le serveur, la version web, les stores, les mises à
jour progressives et le retour arrière.

Il liste aussi **ce qui doit être réglé avant toute ouverture au public** — politique de
confidentialité, procédure de traitement des signalements écrite au calme, attestation
d'appareil, consentement parental des moins de 15 ans, base de lieux publics pour le
point mystère.

Et il dit ce qui est sauvegardé et ce qui ne l'est pas : les duos et leurs points sont la
seule copie qui permette de retrouver une relation après un changement de téléphone ; le
carnet détaillé ne vit que sur les appareils. Il vaut mieux le savoir avant qu'on le
demande.

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

1. **La mise en ligne.** Le serveur sur un hébergeur, puis la version web sur une
   adresse ouvrable depuis ton téléphone. La configuration est prête ; il manque les
   comptes, qui ne dépendent que de toi.
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

---

## Ce que les tests ont attrapé, en tout

Six fois depuis le début, un test a arrêté quelque chose qui serait passé. Aucune de ces
six fois n'était un plantage — **à chaque fois, c'était un principe qui fuyait, ou une
promesse qui n'aurait pas été tenue.**

1. **Une recherche orpheline** — deux personnes cherchant en même temps s'appariaient,
   mais une recherche restait active et proposait des gens à quelqu'un déjà en partie.
2. **Un reproche déguisé** — le fait qu'un départ ait été silencieux partait vers le
   joueur resté, qui aurait pu en déduire que l'autre s'est éclipsé sans un mot.
3. **Une position permanente** — le point mystère obligeait à stocker la zone de votre
   rencontre. Avec trois duos, on reconstitue un quartier.
4. **Un catalogue qui promettait trop** — « 5 jeux au choix » alors que le palier 1 n'en
   débloque que deux.
5. **Un filtre trop large** — le vérificateur refusait une question parce que « vivre »
   se termine par « ivre ». Un motif trop large aurait fini par bloquer des dizaines de
   bonnes questions sans que personne ne comprenne pourquoi.
6. **Une réplique qui allait s'user** — trois variantes seulement pour la situation qu'on
   verra le plus souvent : quand un partenaire tarde à répondre.

C'est exactement ce à quoi ils servent. Aucun de ces six problèmes n'aurait fait planter
l'application ; tous auraient abîmé quelque chose qu'on avait décidé ensemble.
