# SADFY — Cahier des charges fonctionnel v2

> Version 2, issue de la revue étape par étape du workflow.
> Remplace la v1 (`Specs`). Les écarts avec la v1 sont signalés par le repère **⟲ v1**.

---

## Sommaire

1. [Vision produit](#1-vision-produit)
2. [Principes de conception](#2-principes-de-conception)
3. [Architecture et confidentialité](#3-architecture-et-confidentialité)
4. [Plateformes](#4-plateformes)
5. [Étape 1 — Premier lancement](#5-étape-1--premier-lancement)
6. [Étape 2 — Écran d'accueil](#6-étape-2--écran-daccueil)
7. [Étape 3 — La recherche](#7-étape-3--la-recherche)
8. [Étape 4 — La trace](#8-étape-4--la-trace)
9. [Étape 5 — Avant la partie](#9-étape-5--avant-la-partie)
10. [Étape 6 — La partie](#10-étape-6--la-partie)
11. [Étape 7 — La session quotidienne et l'économie de points](#11-étape-7--la-session-quotidienne-et-léconomie-de-points)
12. [Étape 8 — La vie du duo entre les sessions](#12-étape-8--la-vie-du-duo-entre-les-sessions)
13. [Étape 9 — L'endgame](#13-étape-9--lendgame)
14. [Étape 10 — Sécurité et modération](#14-étape-10--sécurité-et-modération)
15. [Le catalogue de jeux](#15-le-catalogue-de-jeux)
16. [La voix de la machine](#16-la-voix-de-la-machine)
17. [Données conservées](#17-données-conservées)
18. [Points restés ouverts](#18-points-restés-ouverts)

---

## 1. Vision produit

Sadfy est un **rituel quotidien de découverte de l'autre**, déclenché par une rencontre
fortuite géolocalisée, et conçu pour aboutir en une dizaine de jours à une rencontre
réelle — ou à rien du tout, si les deux personnes ne le souhaitent pas.

Le jeu coopératif n'est pas la finalité : c'est le prétexte et le liant. **La récompense,
c'est d'apprendre quelque chose sur l'autre.**

Positionnement : rencontre amoureuse, mais sans en faire l'objet explicite du produit.
Aucune photo, aucun texte libre entre joueurs, aucun profil à parcourir, aucun jugement
sur une apparence. On découvre quelqu'un par la façon dont il joue et par ce qu'il répond.

**⟲ v1** — la v1 décrivait un écosystème de mini-jeux à rejouabilité infinie, avec une
progression sur 1000 points sans échelle de temps. La v2 fixe l'unité de mesure :
un **arc de ~10 jours**, une **session par jour**, et la révélation progressive comme
moteur principal.

---

## 2. Principes de conception

Ces sept principes ont émergé des arbitrages successifs. Ils priment sur toute
fonctionnalité : en cas de conflit, c'est la fonctionnalité qui cède.

| # | Principe | Conséquence |
|---|---|---|
| P1 | **Rien n'est obligatoire, tout est récompensé** | Géographie, synchronisation, rythme quotidien : jamais des murs, toujours des incitations |
| P2 | **Zéro donnée personnelle**, pas zéro serveur | Le serveur existe, il ne sait rien |
| P3 | **Jamais de texte libre entre joueurs** | Le seul texte libre autorisé va vers l'exploitant, et uniquement pour les mineurs |
| P4 | **Aucun média échangé** | Ni photo, ni son, ni vidéo. Il n'y a rien à modérer entre joueurs |
| P5 | **Un refus ne se révèle jamais** — sauf à l'endgame, où la transparence l'emporte | Pas d'accusé de réception, pas de « vu », pas de « refusé » |
| P6 | **La progression appartient au duo**, jamais à l'individu | Aucun profil global, aucun niveau, rien à collectionner |
| P7 | **La proximité est récompensée, jamais requise** | Sauf au tout premier contact |

---

## 3. Architecture et confidentialité

### 3.1 Rôle du serveur

Le serveur assure quatre fonctions, et rien d'autre :

1. **Aiguillage** — désigner un candidat proche pour une recherche en cours.
2. **Relais temps réel** — faire transiter les coups de jeu entre deux appareils.
3. **Base minimale persistante** — hash de couples, compteur de points, blocages,
   indicateur de fiabilité, signalements.
4. **Notifications push.**

**⟲ v1** — la v1 exigeait un stockage « exclusivement local » et un serveur sans aucune
persistance. Intenable : la progression cumulée entre deux personnes, le blocage
réciproque et la survie au changement de téléphone l'exigent. La promesse est
reformulée : **zéro donnée personnelle**, pas zéro serveur.

### 3.2 Identité

- Une **paire de clés cryptographique** générée sur l'appareil au premier lancement.
- Aucun email, aucun téléphone, aucun mot de passe, aucun identifiant social.
- **Attestation d'appareil** (App Attest sur iOS, Play Integrity sur Android) : ne
  collecte aucune donnée personnelle, rend coûteux le contournement d'un blocage.

### 3.3 Géolocalisation sans divulgation

Le téléphone ne transmet **jamais** de position.

Le monde est découpé en **cellules d'environ 1 km**. Pour la détection de présence entre
partenaires, l'appareil transmet une **empreinte** calculée à partir de la cellule et
d'un secret partagé propre au duo. Le serveur ne peut que constater l'égalité de deux
empreintes : il n'apprend ni où c'est, ni ce que ça vaut.

Pour la recherche de nouveaux partenaires, un identifiant de cellule grossier est utilisé
en mémoire vive, jamais écrit.

> Chaque appareil transmet également les empreintes des 8 cellules voisines, afin que
> deux personnes séparées de 10 m mais de part et d'autre d'une frontière de cellule
> se détectent quand même.

### 3.4 Coût

Un serveur unique à quelques euros par mois couvre plusieurs milliers de joueurs
simultanés. À proscrire absolument, car ils inversent l'économie du produit :

- les services managés temps réel facturés à la connexion ou au message ;
- tout appel à un modèle d'IA **pendant** une partie (le contenu se génère en amont,
  par lots, et s'embarque avec l'application).

---

## 4. Plateformes

| Plateforme | Statut | Limite |
|---|---|---|
| iOS natif | Complet | — |
| Android natif | Complet | — |
| PWA (navigateur mobile) | **Version d'essai** | Pas de géolocalisation en arrière-plan, donc **aucune notification de présence ni de sollicitation app fermée**. **Pas d'endgame** : ni rencontre réelle, ni échange de réseaux |

L'exclusion de l'endgame sur PWA n'est pas une limite technique mais une décision de
sécurité : l'attestation d'appareil (§3.2) n'existe pas sur le web, donc quelqu'un
d'exclu pourrait revenir par le navigateur. Sans porte de sortie, la PWA cesse d'être
une faille.

**⟲ v1** — la v1 promettait une parité totale entre web et natif. Impossible : aucun
navigateur mobile ne permet la géolocalisation en arrière-plan. Le web devient
volontairement moins complet, ce qui donne au passage une raison naturelle d'installer
l'application.

---

## 5. Étape 1 — Premier lancement

### 5.1 Ce qui se passe sans intervention de l'utilisateur

- Génération de la paire de clés et de l'identité locale.
- Génération d'un **avatar aléatoire** (non choisi, donc non signifiant).

### 5.2 Ce qui est demandé — et uniquement cela

| Donnée | Stockage | Ce qui circule |
|---|---|---|
| Date de naissance **complète** — jour, mois, année | **Locale uniquement** | Un bit majeur/mineur pendant la recherche ; une tranche d'âge au palier 2 |
| Genre | Local | Utilisé comme critère d'appariement en mémoire vive, jamais stocké côté serveur |
| Filtre de genre *(facultatif)* | Local | « hommes » / « femmes » / **« peu importe » par défaut** |
| Filtre d'écart d'âge | Local | Défaut ~15 ans, réglable — **sauf dans le vivier mineur, où il est de 2 ans et non réglable** (§5.4) |

**La date est demandée en entier, et pas seulement l'année.** ⟲ *Corrigé : on avait
d'abord retenu l'année seule, pour ne détenir qu'une donnée approximative. C'était le
mauvais arbitrage, et c'est la règle la plus sensible du produit qui en souffrait — avec
l'année seule, quelqu'un né en décembre est compté un an trop vieux pendant onze mois,
et à 17 ans ça le fait basculer dans le vivier majeur avant son anniversaire (§5.4). La
précision ne coûte rien ici : **la date ne quitte pas l'appareil**, et ce qui circule
reste une tranche et un bit.*

Elle se choisit en trois gestes — l'année, puis le mois, puis le jour dans le calendrier
réel de ce mois-là. Un jour qui donnerait moins de 13 ans reste visible mais inerte : le
masquer sans explication ferait croire à une panne.

Le genre doit être déclaré par tout le monde : le filtre de genre en dépend, ainsi que la
règle de priorité de l'endgame (§13.4). Prévoir les cas non déclaré et non binaire.

**Aucune autre saisie au premier lancement.** Pseudo, passions et pseudos de réseaux
sociaux sont demandés plus tard, au moment où ils deviennent utiles (§11.4, §13.6).

### 5.3 Géolocalisation

Demandée dès le premier lancement — sans elle, il n'y a pas de produit. Mais toujours
précédée d'un **écran d'explication** avant la fenêtre système :

> « Sadfy cherche des joueurs autour de toi. Ta position n'est jamais enregistrée,
> jamais partagée. »

En cas de refus, l'utilisateur bascule sur le mode solo (§5.5) et peut accepter plus tard.

### 5.4 Mineurs — âge minimum et cloisonnement strict

**Âge minimum : 13 ans**, alignement sur Instagram, Snapchat et Facebook.

> **Conséquence à traiter** : en France, la loi de 2023 sur la majorité numérique impose
> un **consentement parental pour les moins de 15 ans**. S'aligner sur les autres réseaux,
> c'est aussi hériter de leur charge de conformité — et c'est le point sur lequel ils se
> font régulièrement sanctionner. Trois voies possibles : ne pas vérifier comme eux et
> assumer le risque, ouvrir à 15 ans pour l'éviter entièrement, ou passer par un
> prestataire de vérification. Voir O2 (§18).

Règles de cloisonnement :

- Deux viviers d'appariement **totalement étanches**. Un mineur ne joue jamais avec un
  majeur, ne voit jamais sa trace, ne peut jamais être appairé avec lui.
- **À l'intérieur du vivier mineur, l'écart d'âge maximal est de 2 ans, non réglable.**
  Avec une plage de 13 à 17 ans, un écart par défaut de 15 ans autoriserait un
  appariement 13/17 — considérable à cet âge. Deux ans limite le jeu à des personnes du
  même âge scolaire, ce qui est aussi le plus naturel.
- Le vivier mineur n'a **ni rencontre organisée, ni échange de réseaux sociaux** (§13.7).
- **Passage à 18 ans** : les relations nouées mineur survivent, mais perdent l'accès à
  l'endgame adulte. Les nouveaux appariements suivent le vivier majeur.
- L'âge est **auto-déclaré** : c'est le point faible connu et assumé du dispositif
  (§18).

### 5.5 Mode solo de découverte

Un mini-jeu jouable seul, contre l'application. Trois fonctions : apprendre les
mécaniques sans gâcher une vraie rencontre, occuper les moments où personne n'est
disponible, et servir de filet en cas de refus de la géolocalisation.

**Le mode solo ne rapporte aucun point** : le compteur mesure du temps passé à deux.

---

## 6. Étape 2 — Écran d'accueil

### 6.1 La question posée

**⟲ v1** — la v1 demandait le mode de déplacement (Fixe / Balade / Transit) pour adapter
les règles GPS en cours de partie. Ces règles ayant disparu (§7.6), la question change
de nature : le téléphone sait deviner le déplacement, il ne sait pas deviner l'envie.

> **« Tu es dispo comment, là ? »**
>
> - **Posé** — j'ai du temps, jeux longs possibles
> - **En mouvement** — j'ai dix minutes, jeux courts
> - **Dispo pour de vrai** — je suis ouvert à rencontrer quelqu'un aujourd'hui

Le dernier choix est mémorisé et modifiable en un tap. Une pré-sélection via les
capteurs de mouvement est possible.

**Fonction du mode « dispo pour de vrai ».** Depuis que les rendez-vous se planifient par
grille de créneaux (§13.5), ce mode n'a plus de rôle dans l'endgame. Il en reçoit deux
autres :

- **priorité d'appariement** entre deux personnes qui l'ont toutes les deux choisi ;
- **autorisation d'un créneau le jour même** dans la grille de rendez-vous, qui n'est
  proposé que si les deux sont dans ce mode.

Pas de mode invisible : l'anonymat rend la visibilité sans conséquence, et la coupure
par partenaire (§14.5) couvre le besoin réel.

### 6.2 À partir du deuxième jour

L'écran d'accueil devient **la liste des duos** (§12.3).

---

## 7. Étape 3 — La recherche

### 7.1 Rayon élastique

- Départ à **1 km**. Si personne : élargissement par paliers (2, 5, 10, 20 km) sur
  30 à 60 secondes.
- **Plafond à 20–30 km.** Au-delà, l'histoire « on aurait pu se croiser » ne tient plus.
  Mieux vaut afficher « personne pour l'instant ».
- L'élargissement est **visible** — un scan qui s'ouvre en cercles, avec la distance qui
  monte. L'attente devient une montée de tension, et l'utilisateur comprend qu'une
  personne trouvée tard était loin.
- **Le rayon se resserre tout seul avec la densité** : quand il y a du monde, la
  recherche n'atteint jamais le deuxième palier. Aucun réglage à modifier plus tard.

### 7.2 La recherche est asymétrique

Exiger que deux personnes appuient sur le bouton à la même seconde ne fonctionnerait
jamais. **L'un déclenche, l'autre est simplement disponible.**

Être disponible, c'est avoir ouvert l'application en mode dispo — ou, sur mobile natif,
avoir simplement l'application installée : une sollicitation peut arriver **application
fermée**. C'est de très loin le premier levier de densité au démarrage.

> Plafond : **2 à 3 sollicitations par jour maximum**, jamais la nuit.

### 7.3 Un seul candidat, choisi par le système

Le serveur désigne **un candidat**, le plus proche. **Jamais de liste à parcourir** : une
liste, c'est un catalogue, et on est revenu au balayage de profils que le produit refuse.

### 7.4 On accepte un jeu, pas une personne

Au premier contact, il n'y a rien à savoir de l'autre — seul un avatar aléatoire est
affiché. La proposition porte donc sur le jeu :

> « Quelqu'un à moins d'1 km propose une partie de Portrait Robot. On y va ? »

Double confirmation : l'initiateur confirme, le destinataire accepte.

**Décliner relance le jeu, jamais la personne.** Si l'initiateur ne confirme pas, un
autre jeu lui est proposé avec le même candidat. Pour changer de personne, il faut
annuler la recherche et la relancer, ce qui repart d'un scan complet.

> Sans cette règle, décliner ferait défiler les candidats un par un : on aurait
> reconstitué le balayage de profils que tout le produit refuse, simplement présenté
> autrement. La friction est volontaire.

### 7.5 Délais

| Situation | Délai |
|---|---|
| Temps d'arriver (téléphone en poche → proposition ouverte) | ~1 minute |
| Temps de décider (une fois la proposition sous les yeux) | ~20 secondes |
| Durée de vie d'une demande | ~2 minutes, annulable |
| Retour de l'initiateur après acceptation | 30 secondes |

Le second chronomètre ne démarre **qu'à l'ouverture réelle** de la proposition : personne
n'est pénalisé par sa poche.

L'initiateur peut ranger son téléphone : il est notifié si quelqu'un accepte. S'il ne
revient pas dans les 30 secondes, celui qui avait accepté voit **« la personne n'était
plus disponible »** — un constat neutre, jamais un refus.

### 7.6 Le gel de la distance

**La distance est une condition d'entrée, pas une condition de maintien.** Vérifiée une
seule fois au lancement de la partie, plus jamais ensuite.

**⟲ v1** — la v1 conditionnait le maintien du lien aux règles GPS du mode de mobilité.
Supprimé : la règle s'applique désormais à tout le monde, uniformément.

### 7.7 Priorités et concurrence

- **Premier arrivé, premier servi.**
- Pendant qu'une demande est en attente, les autres inconnus sont **bloqués
  silencieusement** — aucun message « occupé », ils continuent simplement à chercher.
- **Un partenaire connu passe quand même** : sa demande est notifiée même si un inconnu
  a demandé avant.
- **Exception — pendant une partie en cours**, la demande d'un connu est **mise de côté
  et présentée à la fin**. Interrompre une partie coopérative laisserait le coéquipier
  du moment complètement planté.

### 7.8 Écran d'attente

Le scan qui s'élargit. Au bout d'une quarantaine de secondes sans résultat : proposition
de laisser une trace (§8) ou de jouer en solo. **Jamais un cul-de-sac.**

---

## 8. Étape 4 — La trace

Le rayon élargit dans l'**espace**, la trace élargit dans le **temps**. Ensemble, ils
couvrent les deux dimensions du vide.

### 8.1 Nature

Une **invitation simple** : « quelqu'un est passé par ici et aimerait jouer ». Le
ramasseur accepte, l'auteur est notifié, ils jouent en direct quand les deux sont
disponibles.

> Le défi jouable en différé (l'auteur laisse une vraie partie à résoudre) est écarté
> de la v1 et gardé en évolution possible.

### 8.2 Règles de dépôt et de ramassage

| Règle | Valeur |
|---|---|
| Ancrage | Une **zone** (~1 km), jamais un point |
| Horodatage | « récemment », jamais une heure précise |
| Expiration | Quelques heures |
| Traces actives par personne | **Une seule** |
| Répétition | **Pas deux traces dans la même zone à quelques jours d'intervalle** (sinon la répétition dessine une habitude) |
| Condition de ramassage | Être **dans la même zone** que la trace |
| Filtres | Cloisonnement mineur/majeur **et** filtres de genre et d'âge appliqués |
| Plafond atteint | **Aucune trace n'est proposée** à quelqu'un déjà au plafond de relations (§12.1) — jamais laisser ramasser puis refuser, l'auteur la croirait consommée |

### 8.3 Effet

**Ramasser une trace crée l'appariement.** Le duo existe donc avant leur première partie
en direct : leur première rencontre réelle est déjà des retrouvailles.

---

## 9. Étape 5 — Avant la partie

### 9.1 L'épreuve de convergence

Le choix du jeu devient **le premier jeu**. En cinq secondes, tout le principe de Sadfy
est enseigné sans une ligne d'explication.

**Les deux répondent en aveugle, révélés simultanément.** Sinon le second s'aligne sur
le premier et le test ne teste rien.

**Forme A — « qui choisit ? »** (jeux hors quiz)

- Réponses possibles : « moi » / « l'autre ».
- **Accord** (l'un dit « moi », l'autre dit « l'autre ») → le désigné choisit parmi
  **jusqu'à 5 jeux**, pris dans ce que le palier du duo a débloqué (§15.2). Au palier 1
  il n'y en a que deux : le choix se fait entre deux, et c'est très bien.
- **Désaccord** → le système tranche, avec une vanne. Deux échecs distincts, deux vannes
  distinctes :
  - deux « moi » → *« Deux capitaines, zéro équipage. Je tranche, et vous vous taisez. »*
  - deux « l'autre » → *« Vous êtes adorables tous les deux. Beaucoup trop. Je choisis,
    sinon on y est encore demain. »*

**Forme B — « quel thème ? »** (jeux de quiz)

- Chacun choisit un thème dans une liste.
- **Accord** → thème unique, l'application le souligne.
- **Désaccord** → **les deux thèmes sont mélangés**. Personne n'a perdu, les deux choix
  ont servi. *« Cuisine contre Cinéma. Je ne choisis pas, vous aurez les deux. »*

> Le mélange plutôt que l'arbitrage n'est pas une commodité : avec 4 thèmes, l'accord ne
> survient qu'une fois sur trois ou quatre, et la vanne d'échec deviendrait la routine.

**Règles communes**

- **Une seule épreuve de convergence par session.** La forme s'adapte au jeu.
- 5 secondes de réflexion, sinon le système tranche.
- ~20 formulations par situation, sinon la blague s'use en trois jours.
- Épreuve **sautée en mode « en mouvement »**.

### 9.2 Choix du jeu par défaut

Le système propose, en tenant compte du **palier du duo** et de la **disponibilité la
plus courte des deux**. L'initiateur peut relancer une fois avant d'envoyer.

### 9.3 Structure d'une partie

| Type de jeu | Structure |
|---|---|
| Asymétrique | **Deux manches, rôles inversés** |
| Symétrique | Manche unique |

### 9.4 Roue d'expressions

**⟲ v1** — l'écran de configuration de la roue avant chaque partie est **supprimé**. La
roue contient tous les packs débloqués et se réorganise seule selon l'usage. Tout réglage
manuel vit dans les réglages, pas dans le parcours de jeu.

### 9.5 Briefing

Obligatoire, **trois lignes maximum**, avant chaque partie :

> « Tu es le Témoin. Tu vois un visage, ton partenaire doit le reconstituer sans le voir.
> Tu ne peux répondre que par oui, non, plus grand, différent. »

Chaque joueur doit comprendre **son rôle** *et* **le fait que l'autre voit autre chose**.
Sans ça, les vingt premières secondes sont de la confusion, et beaucoup abandonnent en
croyant l'application cassée.

À la première découverte d'un jeu : explication illustrée plus longue, sautable ensuite.
La connaissance des règles est **globale**, pas par duo (§11.6).

### 9.6 Durée annoncée

« Environ 3 minutes », affiché avant d'accepter. Cible : 2 à 4 minutes par manche,
5 à 8 minutes pour la partie complète.

---

## 10. Étape 6 — La partie

### 10.1 Chronomètre

Généreux, et **jamais culpabilisant**. Aucun « trop lent », aucun décompte rouge. Le temps
est une tension partagée contre le jeu, jamais un jugement sur l'un des deux.

### 10.2 Communication en cours de jeu

Une barre basse de **3 à 4 messages contextuels** — ceux qui ont du sens à ce moment
précis — plus l'accès à la roue complète d'un geste.

### 10.3 Le pouce baissé

**⟲ v1** — le 👎 reste, mais devient **silencieux** : il masque le message et alimente la
modération. **Il ne produit aucun chiffre visible.**

La jauge d'affinité ne se calcule plus sur les pouces mais sur le **positif** :
convergences de réponses, thèmes choisis en commun, manches réussies, nombre de sessions.

> Motif : sur des messages prédéfinis et bienveillants, le pouce baissé n'a de sens que
> pour le pack Taquin ; et transformer ces pouces en pourcentage revient à afficher un
> **score de rejet**.

### 10.4 Barème

**Perdre ensemble rapporte des points.** Points pour avoir joué, bonus pour avoir réussi,
**jamais zéro**. Le compteur mesure le temps passé ensemble, pas la performance.

### 10.5 Inactivité

Rappel discret après ~15 secondes, fin propre de la partie après ~2 minutes. Celui qui
est resté conserve ses points.

### 10.6 Coupure réseau ≠ abandon

| Cas | Comportement |
|---|---|
| **Réseau perdu** | Partie en pause, « connexion perdue, on l'attend », reprise à l'identique si retour sous 2 minutes |
| **Abandon volontaire** | Fin de partie, celui qui reste conserve ses points |

Distinction indispensable : les confondre punirait les joueurs en transport, qui sont le
cas d'usage central.

### 10.7 Message de sortie

Proposé — jamais obligatoire — à celui qui quitte :

- « Problème de connexion, désolé »
- « Je dois y aller »
- « Ce jeu ne me plaît pas » *(indique au système de ne plus proposer ce jeu à ce duo)*
- « On reprend plus tard ? »

Si rien n'est envoyé, l'autre voit **« la partie s'est arrêtée »** — jamais « il est
parti », jamais « il a abandonné ».

> **Partir en le disant ne compte pas comme un abandon.** L'indicateur de fiabilité
> (§14.6) ne compte que les départs **silencieux et répétés**. Le système récompense
> ainsi la politesse sans jamais le dire.

### 10.8 Reprise

| Délai depuis l'interruption | Proposition |
|---|---|
| < 2 heures | **« Reprendre »** — état intact |
| > 2 heures | **« Rejouer »** — partie neuve. Les points acquis restent acquis |

---

## 11. Étape 7 — La session quotidienne et l'économie de points

### 11.1 Structure d'une session

```
1. Les questions      3 à 5 QCM sur soi          ~30 s    asynchrone    40 points
2. Le jeu             une partie coopérative     ~5 min   synchrone     60 points
3. La révélation      ce qu'on a en commun       ~30 s
```

**Les questions d'abord**, pour deux raisons : la révélation est ce pour quoi on revient,
donc la session doit s'y terminer ; et si le jeu casse en cours de route, les questions
sont déjà répondues, donc la session n'est pas perdue.

### 11.2 Asynchrone / synchrone — le point qui décide si l'application marche

Coordonner cinq minutes par jour avec un inconnu est difficile. Beaucoup de relations
mourraient d'un simple problème d'agenda.

- **Les questions sont asynchrones.** Chacun répond quand il veut, la révélation arrive
  quand les deux ont répondu. Aucune coordination nécessaire.
- **Le jeu reste synchrone.**

Un duo qui n'arrive jamais à se synchroniser progresse quand même à 40 points par jour :
l'endgame en ~25 jours au lieu de 10. **La relation ne meurt pas d'un emploi du temps.**
Application directe de P1.

### 11.3 Rythme

- **Une seule session par jour fait progresser le compteur.**
- **Mais on peut rejouer autant qu'on veut** : on ne limite pas le jeu, on limite la
  progression. Bloquer les gens au moment où ils ont le plus envie tuerait l'élan du
  premier jour.
- **La limite est par duo, pas globale** : rien n'empêche de jouer avec plusieurs
  personnes le même jour. La limite quotidienne pousse à rencontrer plus de monde,
  la progression récompense la profondeur.
- **Aucune pénalité d'absence.** Le compteur ne redescend jamais.
- Points variables de **80 à 120** selon la session, pour éviter le simple compteur.

**Définition de la journée : de 4 h à 4 h.** Une session tardive est rattachée à la
journée précédente — ce qui correspond aussi au ressenti de l'utilisateur. Sans cette
règle, un duo pourrait enchaîner deux sessions en vingt minutes en encadrant minuit, et
gagner deux jours de progression en une soirée.

**Un jeu non joué dans la journée est simplement perdu**, sans report ni pénalité. Les
60 points du jeu sont attachés à la journée : si le duo répond aux questions lundi et ne
parvient à jouer que mercredi, le jeu du mercredi rapporte les points du mercredi, et
celui de lundi n'existe plus. Toute autre règle créerait une comptabilité de dettes que
personne ne comprendrait.

### 11.4 Paliers

| Jours | Points | Palier | Ce qui se débloque |
|---|---|---|---|
| 1–2 | 0–200 | **Le Fantôme** | Rien. On joue à l'aveugle. On ne voit que **le nombre** de convergences — « 3 réponses sur 5 identiques » — jamais lesquelles |
| 3–6 | 200–600 | **Le Partenaire** | Pseudo, tranche d'âge, réponses de l'autre visibles, nouveaux packs de messages |
| 7–9 | 600–1000 | **L'Équipe** | Passions (3 emojis), taux d'affinité, **possibilité de choisir la question qu'on pose** |
| 10 | 1000 | **La Décision** | §13 |

**⟲ v1** — seuils redistribués (100/400/999 → 200/600/1000) pour épouser l'arc de dix
jours. L'appareil photo éphémère, récompense du palier 3 en v1, est **supprimé** (§14.4).

Le pseudo et les passions ne sont **pas demandés au premier lancement** : l'application
les réclame à l'approche du palier concerné — « ton partenaire va bientôt voir ton
pseudo, tu veux en choisir un ? ». Un pseudo généré sert de repli si rien n'est saisi.

### 11.5 La révélation

**Cadrage : « ce que vous avez en commun », jamais un pourcentage.**

Un « 34 % de compatibilité » se lit comme un verdict, et un chiffre bas au troisième jour
fait arrêter des gens alors qu'il ne veut rien dire. Mêmes données, cadrage inverse :
une **collection qui s'accumule**.

> « Vous préférez tous les deux la montagne. »
> « Vous détestez tous les deux les appels téléphoniques. »

**Ce qui est révélé, par palier :**

| Palier | Révélation |
|---|---|
| 1 | Le **nombre** seul : « 3 réponses sur 5 identiques ». Frustrant dans le bon sens — c'est ce qui donne envie de revenir |
| 2 et + | La **liste détaillée**, qui s'accumule dans le carnet |
| 3 | Le pourcentage global, quand il repose enfin sur assez de réponses |

**Les « j'aime »** : 1 à 2 maximum par session. Si on peut tout aimer, plus rien ne veut
rien dire — avec un seul à placer, le choix devient un message.

**Contrainte absolue sur la banque de questions** : goûts, habitudes, dilemmes, opinions.
**Jamais** le métier, le quartier, l'école, le prénom, l'employeur. Sinon l'anonymat fuit
par la porte qu'on vient d'ouvrir, et il fuit avant le mot de passe censé le protéger.

### 11.5 bis — Structure de la banque de questions

Un frigo vide à 20 ans et un frigo vide à 60 ans ne racontent pas la même chose. Les
questions doivent donc être segmentées — mais **pas en banques séparées**, qui
multiplieraient le travail de production et laisseraient un duo de 25 et 40 ans sans
fonds commun.

**Une banque universelle, plus des extensions étiquetées par tranche d'âge.** La majorité
des questions fonctionnent à tout âge : dilemmes absurdes, goûts, habitudes. On leur
ajoute des questions marquées par tranche.

**Règle de tirage** : la session pioche dans **l'intersection des tranches des deux
joueurs**, plus le fonds commun. Un duo 25/40 reçoit surtout de l'universel ; un duo
22/24 reçoit en plus tout ce qui est propre à leur âge. Le volume de production reste
maîtrisé et personne ne se retrouve à court.

**Tranches** : 13-15, 16-17, 18-25, 26-39, 40-55, 56 et plus.

**Cloisonnement mineurs/majeurs** : les tranches 13-15 et 16-17 constituent une banque
hermétiquement séparée. Une question sur l'alcool, la sexualité, la vie professionnelle
ou la colocation n'a rien à faire devant un joueur de 14 ans. Le cloisonnement du contenu
suit exactement celui des viviers d'appariement (§5.4).

### 11.6 La progression appartient au duo

Il n'existe **aucun profil global**, aucun niveau affiché, rien à collectionner en dehors
des relations. Avec chaque nouvelle personne, tout recommence : avatar anonyme, quatre
messages, deux jeux.

Deux exceptions, purement techniques :

- **la connaissance des règles d'un jeu** (on ne remontre pas dix fois le même tutoriel) ;
- **l'indicateur de fiabilité** (§14.6), interne et invisible.

### 11.7 L'écart d'âge

Révélé **dès le premier écran**, par exception au principe de non-révélation — la
sécurité prime.

- **Écart et sens** : « cette personne a environ 20 ans de plus que toi ». Cacher le sens
  protégerait la vie privée du plus âgé au détriment de la sécurité du plus jeune.
- **Par tranches** : « moins de 5 ans », « 5 à 10 ans », « plus de 20 ans ».
- L'âge réel, par tranche, arrive au **palier 2**. L'âge exact n'est **jamais** révélé.
- Un **filtre d'écart d'âge** (défaut ~15 ans, réglable) évite le cas 20/60 sans que
  personne n'ait eu à y penser.

> Les deux dates de naissance restent sur les téléphones : l'écart se calcule entre les
> deux appareils une fois le duo formé.

### 11.8 Bonus de retrouvailles

| Condition | Effet |
|---|---|
| Session jouée **dans la même zone** (~1 km) | **150 points** au lieu de 100 → l'arc passe de 10 à 7 jours |
| — | Accès aux **jeux de co-présence** |

La zone de retrouvailles est **fixe à ~1 km**, indépendamment du rayon de recherche qui,
lui, est élastique. Motif : à 300 m on est à portée de vue, et deux personnes qui se
cherchent finissent par se repérer — ce qui détruirait l'anonymat que le mot de passe
absurde est censé protéger.

**Jamais de distance précise ni de direction affichée.** « Vous êtes dans la même zone »,
binaire, sans gradient. C'est cela qui empêche de se tomber dessus, bien plus que la
valeur du rayon.

---

## 12. Étape 8 — La vie du duo entre les sessions

### 12.1 Plafond de relations actives

**3 à 4 relations actives maximum.** Assez pour ne jamais être bloqué par quelqu'un qui
ne répond pas, assez peu pour que chacune compte.

> Message produit : Sadfy n'est pas une application où l'on collectionne.

**Libérer un créneau — trois voies, dont une manuelle indispensable :**

| Voie | Effet |
|---|---|
| **« Mettre en pause »**, action manuelle disponible à tout moment | Libère **immédiatement** le créneau. Rien n'est supprimé, l'autre n'est pas notifié, la relation est réactivable |
| Mise en sommeil automatique après 2 semaines (§12.5) | Idem, sans action |
| Arrêt de l'endgame (§13.3) | Libère le créneau **des deux côtés** |

L'action manuelle n'est pas un confort. Sans elle, quelqu'un dont les quatre partenaires
cessent de jouer se retrouve incapable de rencontrer qui que ce soit **pendant deux
semaines**, sans aucun recours — le pire scénario possible pour un nouvel utilisateur qui
vient de démarrer quatre relations d'un coup.

### 12.2 Notification de présence

Le mécanisme qui rend le bonus de retrouvailles réellement atteignable, au lieu de le
suspendre au hasard pur.

| Garde-fou | Règle |
|---|---|
| **Symétrie** | Si A est prévenu que B est là, **B est prévenu que A est là**. Toujours. Sans quoi on peut observer quelqu'un à son insu |
| Fréquence | **Une notification par partenaire et par jour maximum** |
| Historique | **Aucun.** Jamais « X était là hier ». L'information vit quelques secondes |
| Coupure douce | « Ne plus me signaler cette personne », **silencieuse et réversible** |
| Support | **Les deux joueurs doivent être sur application native.** Dans un duo natif ↔ PWA, la symétrie est structurellement impossible : la fonctionnalité ne se déclenche alors pour personne, et l'interface doit le dire pour que ça ne passe pas pour un défaut |

### 12.3 Écran d'accueil — la liste des duos

Pour chaque duo : où on en est, ce qui est en attente, ce qui se débloque bientôt.
« À toi de répondre », « on attend X », « votre session d'aujourd'hui est prête ».

**Ne jamais afficher « X n'a pas joué depuis 4 jours ».** C'est factuel mais ça se lit
comme un abandon. Afficher « en pause », avec le bouton de ping.

### 12.4 Le ping

Message prédéfini, **un par partenaire et par jour**, **refus silencieux** : celui qui ne
répond pas ne génère aucun accusé, aucun « vu », aucune notification de refus.

**Décroissance automatique : après 3 pings sans réponse**, les pings sont désactivés dans
ce sens jusqu'à ce que le destinataire initie lui-même quelque chose. La coupure est
silencieuse — l'émetteur n'apprend pas qu'il a été coupé.

> Sans cette règle, un ping par jour autorise quatorze relances en deux semaines sans une
> seule réponse. La coupure douce existe, mais elle exige une action délibérée de la
> personne sollicitée — or c'est précisément le profil qu'il faut protéger passivement.

### 12.5 Mise en sommeil

Après **deux semaines** sans activité, la relation passe en « en pause » : elle ne compte
plus dans le plafond, **rien n'est supprimé**. Si les deux se recroisent six mois plus
tard, tout est là. Seul le Kill Switch (§14.5) supprime définitivement.

### 12.6 Le carnet du duo

Ce que le duo fabrique en jouant : les points communs accumulés, les réponses, les
victoires, les lieux, les vannes de la machine. Personne d'autre ne l'a, personne d'autre
ne peut le voir.

C'est le levier de rétention le plus puissant du produit : **une valeur accumulée qui
n'existe qu'à l'intérieur de la relation.** Et c'est ce qui donne son poids au dixième
jour — on ne décide pas de rencontrer un inconnu, on décide de rencontrer quelqu'un avec
qui on a construit quelque chose de visible.

---

## 13. Étape 9 — L'endgame

### 13.1 Déclenchement

Disponible à **1000 points**. **Ne bloque rien** : le jeu continue normalement, et la
Décision reste déclenchable par l'un ou l'autre.

**Délai de latence** : une Décision qui n'aboutit pas ne peut être relancée qu'après
**7 jours**. Au bout de **3 tentatives infructueuses**, elle cesse d'être proposée
automatiquement.

> Sans ce verrou, celui qui veut se rencontrer pourrait reposer la question tous les
> jours à celui qui ne veut pas : on aurait construit une machine à pression.

### 13.2 Tour 1 — le choix en aveugle

Quatre réponses possibles :

1. **Se rencontrer en vrai**
2. **Échanger les réseaux sociaux**
3. **« Je préfère qu'on en reste là »**
4. **« Continuer à jouer un peu »**

**Les préférences divergentes sont révélées.**

**⟲ v1 et révision de la v2** — une position intermédiaire consistait à ne jamais rien
révéler et à laisser l'autre indéfiniment « en attente ». Écartée : c'est du ghosting
organisé par le produit, et une attente sans fin est plus douloureuse qu'un refus clair,
parce qu'on ne peut pas tourner la page d'une phrase qui ne vient jamais.

**La règle absolue** : ni le lieu, ni le pseudo de réseau social ne sont communiqués tant
que **les deux** n'ont pas accepté la même chose. Et **aucun repli automatique** : un
rendez-vous qui échoue ne se transforme jamais en échange de réseaux. Les deux options
sont à égalité, jamais l'une le lot de consolation de l'autre.

### 13.3 Le refus — « je préfère qu'on en reste là »

| Règle | Détail |
|---|---|
| Formulation | « Je préfère qu'on en reste là » désigne la situation, pas la personne |
| Motif | Choisi dans une liste courte : « je ne me sens pas prêt », « je préfère qu'on en reste au jeu », « ce n'est pas le bon moment » |
| Réversibilité | **Celui qui a arrêté peut rouvrir**, des jours plus tard |
| **Asymétrie** | **Seul celui qui a arrêté peut rouvrir.** Le ping est désactivé dans l'autre sens |
| Conservation | Le carnet reste, la relation passe en pause |
| **Plafond** | L'arrêt **libère le créneau des deux côtés**, immédiatement |

Si l'autre pouvait relancer, on transformerait un refus en négociation, donc en pression.

La libération du créneau des deux côtés est tout aussi importante : sans elle, celui qui
n'a rien décidé se retrouverait avec une relation morte immobilisant un de ses trois ou
quatre créneaux, potentiellement pour toujours puisque l'autre peut ne jamais rouvrir. Il
serait puni d'une décision qui n'est pas la sienne.

### 13.4 Tour 2 — le droit de changer d'avis, et le double retournement

En cas de divergence, le même choix est reproposé.

**Si les deux ont changé** — donc s'ils sont encore décalés, mais dans l'autre sens —
c'est que chacun a cédé pour faire plaisir à l'autre. C'est *Le Cadeau des rois mages*
d'O. Henry, et c'est le meilleur signal de bonne foi mutuelle que l'application puisse
observer. Il doit être mis en scène comme tel.

**Déblocage** : l'un choisit **à découvert**, l'autre décide de suivre ou non.

> **Priorité pour choisir en premier : la femme** dans un duo homme-femme,
> **tirage au sort** dans tous les autres cas (même sexe, non déclaré, non binaire).
>
> Cette règle doit être **annoncée dans l'application**, pas cachée. Le public le plus
> difficile à convaincre sur une application de rencontre, ce sont les femmes ; annoncer
> que c'est elle qui fixe les modalités s'adresse exactement à cette inquiétude.

### 13.5 Le rendez-vous réel

**Le lieu — le point mystère.**

**⟲ v1** — la v1 demandait à chacun de taper le nom d'un lieu public et validait si
c'était identique. Impossible : « café de la gare », « Café de la Gare », « le café gare »
ne correspondront jamais.

À la place, **l'application tire un point que ni l'un ni l'autre ne connaît**, dans la
zone où ils se sont rencontrés. Le jour venu, chacun ouvre Sadfy et suit le point jusqu'à
la destination.

Ce que ça résout, au-delà du problème technique :

- **Personne ne choisit le lieu**, donc personne n'en est responsable, et personne ne se
  demande si l'autre l'a suggéré pour une raison. Toute l'asymétrie de la proposition
  disparaît.
- **Les dernières minutes avant la rencontre deviennent un dernier jeu coopératif** : ils
  marchent l'un vers l'autre sans le savoir. C'est la promesse du produit tenue jusqu'au
  bout.
- Le point étant tiré dans la **zone de leur première rencontre**, c'est à la fois une
  surprise et l'endroit qui veut dire quelque chose.

**Trois garde-fous — l'application devient responsable du lieu :**

| Garde-fou | Règle |
|---|---|
| **Lieu sûr** | Tirage dans une **liste filtrée de lieux publics fréquentés** : place, entrée de parc, café, halle. **Jamais** une impasse, un lieu isolé, un parc à la nuit tombée. Le filtrage par catégorie de lieu est un choix explicite, jamais un tirage au hasard sur une carte |
| **On suit le point, jamais la personne** | La position de l'autre n'est **jamais** affichée, à aucun moment. Seule la destination l'est |
| **Destination visible dès l'accord** | La surprise porte sur *où ce sera*, pas sur la capacité à le trouver. Chacun doit pouvoir juger que c'est atteignable et que ça lui convient avant de dire oui — quelqu'un sans voiture, à mobilité réduite, ou qui ne connaît pas le quartier doit pouvoir refuser sans gêne |

Si le point ne convient pas à l'un des deux, un autre est tiré. Aucune saisie de texte à
aucun moment.

**L'heure — une grille de disponibilités.**

Caler un rendez-vous sans texte libre est pénible, et cette friction pousserait les gens
vers Instagram uniquement pour pouvoir s'organiser — ce qui tuerait la fonctionnalité la
plus différenciante du produit.

Solution sans un seul mot : **chacun tape sur les créneaux qui lui conviennent, et
l'application calcule l'intersection.** Celle qui ouvre est désignée par la règle de
§13.4. Réglé en deux échanges.

Un créneau **le jour même** n'est proposé que si les deux sont en mode « dispo pour de
vrai » (§6.1).

Plus deux boutons : **« je suis arrivé »** et **« je ne peux plus venir »**.

**Le billet de rencontre.** Un mot de passe absurde à usage unique :

> « Rendez-vous jeudi 18 h. Suis le point.
> Le mot de passe pour vous reconnaître : **Pingouin Majestueux**. »

### 13.5 bis — Quand la rencontre n'a pas lieu

**Un lapin n'est pas toujours volontaire**, et traiter tout le monde comme coupable serait
injuste. Le traitement reprend exactement le mécanisme du message de sortie de partie
(§10.7), qui fonctionne déjà bien.

**Celui qui est venu** signale que l'autre n'est pas là, et choisit :

- **reproposer un rendez-vous**, ou
- **en rester là**.

**Celui qui n'est pas venu** peut s'expliquer avec une réponse prédéfinie — « j'ai
oublié », « j'ai eu un empêchement » — et reproposer un créneau à son tour.

| Règle | Détail |
|---|---|
| Indicateur de fiabilité | **Un lapin expliqué ne compte pas. Un lapin silencieux compte.** Le système récompense la politesse sans jamais le dire |
| Plafond | **Deux lapins et l'option rencontre se ferme** pour ce duo. Sans plafond, on peut faire attendre quelqu'un indéfiniment |
| Retour du lendemain | Il se déclenche **même quand la rencontre n'a pas eu lieu** (§14.1) — c'est précisément là qu'il est le plus utile |

### 13.6 Le pont réseaux sociaux

- Les pseudos ne sont **demandés qu'au moment où le pont est choisi par les deux**. Rien
  n'est saisi avant d'être utile.
- **Révélation simultanée**, toujours. Personne ne donne son Instagram en espérant
  recevoir celui de l'autre.
- **Retour possible à tout moment** : même après avoir accepté un lieu et une heure, l'un
  peut proposer de basculer sur les réseaux. L'autre est notifié et décide.

### 13.7 L'endgame des mineurs

Ni rencontre organisée, ni échange de réseaux. À la place :

- **Un code secret partagé** — une phrase absurde que les deux possèdent, **sans aucune
  indication de lieu ni d'horaire**.
- **Statut de compagnon** : tous les jeux, tous les packs, sans limite, plus le carnet
  complet.

> La frontière est essentielle : **pour les adultes, l'application organise une rencontre ;
> pour les mineurs, elle donne seulement un moyen de se reconnaître.** Le code ne sert que
> s'ils sont déjà dans le même endroit de leur vie normale — même école, même quartier,
> même club. L'application ne les rapproche pas d'un mètre.

Ce fonctionnement doit être **annoncé dès le début** : pas de fausse promesse, pas de
déception au dixième jour.

### 13.8 Après 1000 points — « continuer à jouer »

**Avant 1000 points, c'est l'application qui pose les questions. Après, ce sont eux.**

L'application s'efface et ne fournit plus qu'une bibliothèque dans laquelle chacun pioche
ce qu'il veut demander à l'autre. Dernière étape logique de la progression d'intimité :
du questionnaire imposé à la conversation choisie. Et le contenu est produit par les
joueurs, pas par le studio.

**Les points continuent d'être comptés, mais il n'existe plus de palier.** Le carnet
(§12.6) devient le seul objet de progression.

---

## 14. Étape 10 — Sécurité et modération

### 14.1 Le retour du lendemain

Le lendemain d'une rencontre physique, une question à chacun : **« Ça s'est bien passé ? »**

Elle se déclenche **même si la rencontre n'a pas eu lieu** (§13.5 bis).

Quatre réponses, **sans champ libre** :

1. Ça s'est bien passé
2. Ça s'est mal passé
3. **Il s'est passé quelque chose de grave**
4. Bloque-le, je ne veux plus aucun contact

**⟲ v2** — un champ libre transmis à l'exploitant a été envisagé puis écarté pour les
adultes : une équipe sans service de modération permanent est plus responsable en ne
collectant pas ce qu'elle ne peut pas traiter. Un signalement grave laissé trois semaines
sans réponse est pire que pas de signalement.

Le dispositif fonctionne quand même : **on n'a pas besoin de savoir ce qui s'est passé
pour agir sur une répétition.** Trois « ça s'est mal passé » venant de trois personnes
différentes sur le même identifiant sont exploitables sans lire une ligne.

**Écran de ressources** — si la réponse 3 ou 4 est choisie, l'application affiche les
numéros utiles (police, aide aux victimes, violences faites aux femmes). Zéro donnée
collectée, zéro obligation créée. On ne peut pas aider soi-même, on peut indiquer qui le
peut.

### 14.2 Le canal mineurs

Les mineurs n'ayant pas de rencontre organisée, le questionnaire du lendemain ne se
déclencherait jamais. Il leur faut :

- un **bouton de signalement accessible en permanence** ;
- avec **champ libre** et **email facultatif** ;
- traité par l'exploitant.

C'est le chemin par lequel arriveront les informations les plus graves, émanant des
personnes les plus protégées par la loi. Une **procédure écrite** est obligatoire :
qu'est-ce qui déclenche un blocage immédiat, qu'est-ce qui déclenche un signalement aux
autorités, qu'est-ce qu'on conserve et combien de temps.

### 14.3 Signalement en cours de jeu

Un bouton discret, **accessible à tout moment**, y compris en pleine partie. Il met fin à
la partie et bloque immédiatement.

### 14.4 Aucun média

**⟲ v1** — l'appareil photo éphémère du palier 3 est **supprimé**.

Conséquence, et elle est structurante : combiné à l'absence de texte libre entre joueurs,
**il n'y a rien à modérer**. Aucun média, aucun texte, donc aucun contenu non sollicité
possible, aucun contenu illégal possible, aucune infrastructure de modération d'images à
financer. Avec des mineurs dans l'application, c'était le plus gros risque du produit.

> Note : la « protection contre les captures d'écran » annoncée en v1 n'existe pas
> techniquement. Android dispose de `FLAG_SECURE`, iOS ne sait que détecter après coup, et
> un second téléphone qui photographie l'écran contourne tout. Ne jamais promettre ce
> qu'on ne peut pas tenir.

### 14.5 Blocages

| Mécanisme | Portée | Réversible |
|---|---|---|
| **Coupure douce** — « ne plus me signaler cette personne » | Notifications de présence et pings | Oui, silencieuse |
| **Kill Switch** — « ne plus jamais croiser » | **Blocage réciproque côté serveur**, définitif | Non |

**⟲ v1** — la v1 réalisait le Kill Switch en supprimant l'UUID du fichier local. Cela rend
l'autre invisible pour soi, mais **on reste visible pour lui**. Le blocage doit être
réciproque et côté serveur — c'est la seule fonctionnalité qui exige vraiment que le
serveur retienne quelque chose : un couple d'identifiants anonymes.

Le cran doux est indispensable : sans lui, personne n'utilise le bouton rouge, et donc
personne ne se protège.

**Le Kill Switch est accessible dès la première seconde, à tout palier.** La v1 le rangeait
dans l'endgame ; il doit être disponible immédiatement, y compris pendant la toute
première partie.

Motif : **rien n'empêche d'être appairé avec quelqu'un qu'on connaît déjà** — un collègue,
un voisin, un frère ou une sœur, un ex. Au palier 2, le pseudo révélé peut suffire à se
reconnaître. C'est structurellement impossible à empêcher sans identité, et le Kill Switch
immédiat est la seule issue.

> Ce n'est pas toujours un problème : deux collègues qui se découvrent sur Sadfy, c'est
> aussi une très bonne histoire.

**Limite à énoncer honnêtement** : le blocage est réciproque côté serveur, mais le carnet
est stocké sur les deux appareils. Celui qui a été bloqué conserve donc le sien. C'est
acceptable — il ne contient rien d'identifiant — mais il ne faut pas laisser croire à un
effacement total.

### 14.6 Indicateur de fiabilité

**Strictement interne. Jamais affiché, jamais transmis, aucun score visible à quiconque.**

Alimenté par les abandons **silencieux et répétés** et par les signalements. Sert
uniquement à dépriorriser dans l'appariement, puis à exclure.

| Situation | Effet |
|---|---|
| Un signalement | Protège **immédiatement** celui qui signale — blocage réciproque, aucune enquête nécessaire |
| Exclusion de toute l'application | Exige un fait grave, ou une répétition |

Sans l'attestation d'appareil (§3.2), une exclusion ne vaut rien : il suffit de
réinstaller. C'est le mécanisme qui donne du poids à tout ce qui précède.

---

## 15. Le catalogue de jeux

### 15.1 Principe de dimensionnement

**⟲ v1** — la v1 visait une rejouabilité infinie et un catalogue très large. La v2
retient un objectif différent : **une dizaine de mécaniques profondes, pas cent jeux
superficiels.**

Motif : chaque jeu asymétrique est un mini-produit (deux interfaces, des règles, du
contenu, un équilibrage, un tutoriel). Cent jeux représentent un à deux ans de travail
pendant lesquels aucun n'est bon. Et la variété perçue vient du **contenu par mécanique**,
pas du nombre de mécaniques : le Portrait Robot est un jeu, mais avec vingt éléments de
visage combinables il est différent à chaque partie.

Vérification par le format : un arc de dix jours représente une dizaine de sessions. Avec
cinq à dix mécaniques bien alimentées, la répétition ne se voit pas.

### 15.2 Catalogue

| Mécanique | **Palier** | Rôles | Réseau | Statut |
|---|---|---|---|---|
| **Blind Match** (quiz de complicité) | **1** | Symétrique | Tour par tour | **v1** — cœur du palier 1 |
| **La Scie** | **1** | Symétrique | Tour par tour | **v1** — très simple |
| **Portrait Robot** | **2** | Asymétrique | Tour par tour | **v1** — le meilleur du lot |
| **Démineur coopératif** | **2** | Asymétrique | Tour par tour | **v1** — meilleur rapport effort/effet |
| **Convergence** (même mot) | **3** | Symétrique | Tour par tour | **v1** — littéralement la métaphore du produit |
| Labyrinthe aveugle | 2 | Asymétrique | Tour par tour | v2 |
| Différences croisées | 2 | Asymétrique | Tour par tour | v2 |
| Désamorçage | 3 | Asymétrique | Temps réel tolérant | v2 |
| Jeux de co-présence | 3 | — | — | Débloqués par le bonus de retrouvailles (§11.8) |
| Recette / tapis roulant | — | Asymétrique | **Temps réel strict** | À risque |
| Tri haute sécurité | — | Symétrique | **Temps réel strict** | À risque |
| Trivia asymétrique | — | Asymétrique | Tour par tour | **Mécanique non validée** (§18) |

**Logique de la répartition** — elle épouse la courbe d'apprentissage du duo :

- **Palier 1 (jours 1-2)** — deux jeux **symétriques** : on apprend l'application avant
  d'apprendre l'asymétrie. Le Blind Match produit en plus de l'information personnelle,
  ce qui est exactement le sujet des premiers jours.
- **Palier 2 (jours 3-6)** — **l'asymétrie arrive**. Quatre jeux disponibles, de quoi
  couvrir quatre sessions sans répétition.
- **Palier 3 (jours 7-9)** — la subtilité. **Convergence est délibérément placé tard** :
  aboutir au même mot demande de savoir comment l'autre pense, donc c'est un excellent
  jeu de fin de parcours et un mauvais jeu de premier jour.

**Règle de conception** : les jeux **tour par tour** survivent aux coupures réseau, les
jeux en **temps réel strict** meurent dans le métro — qui est le cas d'usage central. Le
« à la milliseconde près » de la v1 est irréalisable sur réseau mobile (80–150 ms de
latence variable) ; toute contrainte temporelle doit passer par une horloge serveur et
des fenêtres de tolérance de l'ordre de ±300 ms.

### 15.3 Cinquième catégorie — « à deux contre la machine »

**⟲ v1** — nouvelle catégorie, absente de la v1.

Un ennemi commun crée du lien plus vite qu'une tâche commune. Avantages : la difficulté
est produite par la machine (donc contenu infini et gratuit), c'est du tour par tour par
nature, et la difficulté se règle en continu.

**Règle absolue de la catégorie : la difficulté doit venir de l'information partagée,
jamais de la compétence individuelle.**

Motif : un jeu de compétence pure (échecs, dames) crée une hiérarchie entre deux
inconnus — le fort porte et s'agace, le faible se sent bête. C'est l'inverse exact de ce
que le produit cherche, puisque tout repose sur le fait qu'il n'y a **rien à juger** chez
l'autre.

Formes retenues :

- **Le démineur coopératif** (déjà au catalogue) — déduction pure, aucune compétence
  préalable, génération procédurale.
- **Un jeu de cartes coopératif à information cachée** — chacun voit le jeu de l'autre
  mais pas le sien, indices tirés d'une liste fermée. Variante originale à concevoir : les
  mécaniques ne se protègent pas, le nom et l'habillage oui.
- **Les échecs en « pièce / case »** sur des problèmes courts — l'un annonce la pièce,
  l'autre décide de la case. Le joueur faible tient le rôle qui désigne, le fort ne peut
  rien faire sans lui. L'écart de niveau cesse d'écraser la partie.

**Écarté : le solitaire à tour de rôle.** C'est un jeu solitaire — jouer chacun son tour
n'y crée quasiment aucune interaction, rien à deviner, rien à se dire, et une bonne part
du résultat dépend du tirage. Aucun des deux n'a jamais besoin de l'autre.

---

## 16. La voix de la machine

La même voix apparaît à quatre endroits : la vanne de l'épreuve de convergence, le
commentaire sur les thèmes divergents, l'adversaire des jeux à deux contre la machine, et
le commentaire sur ce qu'ils ont en commun.

**C'est un personnage**, et c'est probablement ce dont les gens se souviendront avant
même les jeux. Coût : de l'écriture, rien d'autre.

**Deux règles de rédaction, jamais négociables :**

1. **La vanne vise toujours le duo, jamais l'un des deux.** « Il va falloir vous
   battre » — un « vous ». « L'un de vous deux est vraiment difficile » — poison : dès
   qu'une blague désigne quelqu'un, elle crée une gêne dont la relation ne se remet pas.
2. **Un faible score est un défi, jamais un diagnostic.** « Vous n'avez rien en commun »
   ferme la porte. « Trois réponses sur cinq à l'opposé — franchement, ça promet des
   débats » ouvre.

Volume : une **vingtaine de variantes par situation**, sinon la répétition tue l'effet en
trois jours.

---

## 17. Données conservées

| Catégorie | Conservation | Localisation |
|---|---|---|
| Date de naissance, genre | Permanente | **Appareil uniquement** |
| Position brute | **Jamais** | — |
| Empreintes de cellules | Quelques secondes, en mémoire | Serveur, non écrit |
| Déroulé d'une partie | **Rien après la fin** | — |
| Couple + points + carnet | Tant que la relation existe | Appareils + serveur (hash) |
| Blocages | **Permanente** — sinon ils ne servent à rien | Serveur |
| Indicateur de fiabilité | Permanente | Serveur |
| Signalements | Durée définie à fixer | Serveur |
| Email de signalement (mineurs, facultatif) | Le temps du traitement | Serveur |

**Formulation honnête de la promesse** : *« Sadfy ne conserve aucune donnée personnelle,
à l'exception des signalements que vous nous envoyez volontairement. »*

Une politique de confidentialité, une base légale et une durée de conservation par
catégorie sont exigées par Apple, Google et le RGPD — la géolocalisation reste une donnée
personnelle même sans compte.

---

## 18. Points restés ouverts

| # | Sujet | Nature |
|---|---|---|
| O1 | **La zone pilote** | La plus importante. Sans concentration géographique, personne ne croise personne et le concept semblera échouer alors que seule la distribution aura échoué. Candidats : un campus, un quartier, un événement, une ligne de transport. Indicateur à suivre : *quand quelqu'un ouvre Sadfy, quelle probabilité de trouver un partenaire ?* En dessous de ~30 %, l'application est perçue comme morte |
| O2 | **Consentement parental des moins de 15 ans** | L'âge minimum est fixé à 13 ans (§5.4). Reste la conformité française : ne pas vérifier comme le font les autres réseaux et assumer le risque, ouvrir à 15 ans pour l'éviter, ou passer par un prestataire de vérification |
| O3 | **Le Trivia asymétrique** | Seul jeu dont la jouabilité n'est pas établie : faire deviner « Quelle est la capitale du Canada ? » avec quatre phrases prédéfinies est probablement impossible. Le catalogue tient debout sans lui |
| O4 | **La banque de questions communautaire** | Laisser les joueurs écrire les questions règlerait l'épuisement du contenu de façon structurelle, avec une boucle de récompense comparable à celle d'Instagram (portée, chiffres, retour) sans identité ni photo. Seule idée qui impose une chaîne de modération, donc qui change le périmètre du lancement |
| O5 | **Modèle économique** | Jamais abordé. Sans publicité, sans données à revendre et sans abonnement évident |
| O6 | **Production du contenu** | Volumétrie et méthode : questions du fonds universel, extensions par tranche d'âge (§11.5 bis), thèmes, variantes de la voix de la machine |
| O8 | **Source des lieux de rendez-vous** | Le point mystère (§13.5) suppose une base de lieux publics filtrée par catégorie et par fréquentation. OpenStreetMap fournit la matière, le filtrage reste à définir — c'est la brique dont dépend la sécurité du moment le plus sensible du parcours |
| O7 | **Identité de marque** | Nom, ton, direction artistique |
