# Où on en est

> Document écrit pour être lu sans être développeur. Mis à jour à chaque session.
>
> Dernière mise à jour : socle, règles, confidentialité géographique, appariement,
> et le premier jeu.

---

## En une phrase

Les fondations sont posées, **toutes les règles de Sadfy sont du code testé**, le moteur
qui met deux inconnus en relation fonctionne, et **le premier jeu se joue** — le Portrait
Robot. Il n'y a pas encore d'écran à regarder, mais la partie tourne vraiment sous le
capot. **92 tests** passent.

---

## Ce qui est fait

### Le squelette du projet

Un dépôt organisé en trois parties : les **règles** (partagées), le **serveur**, et
l'**application** (qui produira les versions iOS, Android et web à partir du même code).

Une vérification automatique tourne à chaque modification : elle contrôle les types, la
qualité du code et lance les tests. **Rien ne peut être publié si un test échoue** — c'est
la première des trois protections sur les mises à jour.

### Les règles du jeu, en code

Tout ce qui décide de quelque chose dans Sadfy est écrit, et vérifié par **33 tests
automatiques** :

- les points d'une session, le multiplicateur quand on se retrouve dans la même zone,
  et le fait que **perdre rapporte quand même des points** ;
- les paliers et ce qui se débloque à chacun ;
- **ce qui est révélé et quand** — au palier 1, seulement le nombre de réponses communes,
  jamais lesquelles ;
- **les règles d'âge** : minimum 13 ans, deux viviers étanches, et l'écart de 2 ans maximum
  entre mineurs ;
- **l'écart d'âge présenté avec son sens** (« cette personne a environ 20 ans de plus que
  toi »), jamais l'âge exact ;
- les règles d'appariement : filtres de genre dans les deux sens, blocages, plafond de
  relations ;
- le rayon de recherche qui s'élargit tout seul ;
- la journée qui court de 4 h à 4 h ;
- la gestion des versions et des mises à jour.

### Deux points de la revue déjà réglés dans le code

**Le catalogue de jeux par palier** (point B2) : la spec proposait « 5 jeux au choix » alors
que le palier 1 n'en débloquait presque aucun. Les jeux sont maintenant répartis, avec deux
jeux disponibles dès le premier jour, et un test vérifie qu'on ne peut jamais se retrouver
sans rien à proposer.

**L'exploit de minuit** (point C2) : sans la journée qui bascule à 4 h, un duo aurait pu
jouer à 23 h 50 puis à 00 h 10 et gagner deux jours de progression en vingt minutes. Un test
vérifie que ces deux sessions comptent bien pour la même journée.

### La confidentialité géographique

C'est la partie dont je suis le plus content, parce qu'elle tient une promesse qui avait
l'air impossible.

**Ta position ne quitte jamais ton téléphone.** Le monde est découpé en cellules d'environ
1 km ; ton téléphone calcule dans laquelle il se trouve et n'envoie que ce numéro de
cellule. Il envoie aussi les 8 cellules voisines — sans ça, deux personnes séparées de dix
mètres mais de part et d'autre d'une frontière ne se verraient jamais.

**Et pour prévenir qu'un partenaire est dans ta zone, le serveur n'a même pas besoin de
savoir où c'est.** Les deux téléphones fabriquent chacun de leur côté un secret que le
serveur ne peut pas calculer, et s'en servent pour transformer leur cellule en un jeton
illisible. Le serveur compare deux jetons : s'ils sont identiques, les deux personnes sont
au même endroit. Il ne sait pas où, il ne sait pas ce que ça vaut. Les jetons changent
toutes les heures, sinon un même lieu produirait éternellement le même code et le serveur
finirait par reconnaître un endroit récurrent — assez pour deviner des habitudes.

### Le moteur de rencontre

Le mécanisme qui met deux inconnus en relation est écrit et couvert par 17 tests. Il
applique les règles qu'on avait décidées :

- **un seul candidat proposé à la fois, jamais de liste** — une liste serait un catalogue,
  et on serait revenu au balayage de profils ;
- **décliner change le jeu, jamais la personne** — sinon décliner ferait défiler les
  candidats un par un, ce qui revient au même ;
- **aucun refus n'est jamais annoncé** — tu vois « on continue à chercher », sans jamais
  savoir si l'autre a dit non ou n'a simplement rien vu ;
- le rayon s'élargit visiblement puis **renonce** plutôt que d'aller chercher quelqu'un à
  800 km, ce qui ne raconterait plus rien.

**Un test a trouvé un vrai problème**, que je n'avais pas vu : si deux personnes appuient
sur « chercher » à la même seconde, elles peuvent s'apparier — c'est souhaitable, et même
nécessaire quand il y a peu de monde — mais l'une des deux recherches restait active et
continuait à proposer des gens à quelqu'un déjà en partie. Corrigé.

### Le premier jeu, et la mécanique qui rend l'asymétrie possible

**Le Portrait Robot se joue.** Je l'ai construit en premier parce que c'est le plus
représentatif : s'il tient, l'architecture tient pour tous les autres jeux asymétriques.

Le point important n'est pas le jeu lui-même, c'est **comment** il fonctionne. Le visage
recherché n'est pas « caché » dans l'interface de l'Inspecteur : il **n'est jamais envoyé
à son téléphone**. Le serveur calcule deux vues différentes et n'expédie à chacun que la
sienne. C'est la seule façon de garantir l'asymétrie — si on envoyait tout aux deux en
demandant à chaque écran de masquer ce qui ne le concerne pas, il suffirait d'un téléphone
modifié pour voir la réponse.

Sur la variété : cinq emplacements à six options font **7 776 visages différents**. Un
seul jeu, mais jamais deux parties identiques. C'est ce que je te disais quand on parlait
des cent jeux — la variété vient du contenu, pas du nombre de mécaniques.

**Le métro est traité comme un cas normal, pas comme un incident.** Une coupure réseau met
la partie en pause et elle reprend exactement où elle en était ; ce n'est jamais confondu
avec un abandon. Et un départ expliqué ne compte pas contre toi, alors qu'un départ
silencieux oui — sans que ce soit jamais dit à personne.

**Un test a trouvé une fuite que je n'avais pas vue.** Le fait qu'un départ ait été
silencieux était envoyé au joueur resté. Il n'y avait aucun mot désagréable dans le
message, mais l'information était là, et l'interface aurait pu la reformuler : « ton
partenaire est parti sans rien dire ». C'est exactement le reproche qu'on a décidé de ne
jamais adresser. L'information ne quitte plus le serveur.

### Un garde-fou permanent

Un test automatique vérifie que le protocole n'expose **jamais** de message qui violerait
les principes : annoncer un refus, ouvrir un canal de texte libre entre joueurs, transporter
une photo, ou divulguer la position d'un partenaire. Si quelqu'un — moi compris — ajoute
distraitement une de ces choses dans six mois, la vérification automatique refusera.

---

## Ce qui vient ensuite

1. **Finir le serveur** — la base de données et la connexion des téléphones.
2. **La coquille de l'application** — les écrans, sur les trois plateformes.
3. **La boucle quotidienne** — questions, révélation, paliers.
4. **Les quatre jeux restants** — le Portrait Robot est fait.
5. **Les traces et la présence.**
6. **L'endgame** et le point mystère.
7. **La sécurité** — signalement, blocages.
8. **Le contenu** — les 1 000 à 2 000 questions.
9. **La mise en ligne d'une version testable.**

---

## Ce que j'attendrai de toi, et quand

Rien pour l'instant. Mais deux choses sont à lancer tôt, parce qu'elles prennent du temps
sans dépendre de moi :

**Le compte développeur Apple** (99 $/an) et **le compte Google Play** (25 $ une fois). La
vérification d'identité prend de quelques jours à quelques semaines, et c'est souvent le
premier goulot d'étranglement d'un projet. Rien ne presse tant qu'on n'a pas quelque chose à
soumettre, mais autant ne pas découvrir le délai le jour où on est prêt.

**La version web arrivera en premier** et ne demande aucun compte : ce sera une adresse à
ouvrir depuis ton téléphone. C'est comme ça que tu testeras, sans rien installer.
