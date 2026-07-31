# Architecture technique

Les choix retenus et **pourquoi**. Un choix sans sa raison se fait défaire six mois plus
tard par quelqu'un qui ne la connaissait pas.

---

## A1 — Une seule base de code pour les trois plateformes

**Choix** : Expo (React Native) pour iOS et Android, `react-native-web` pour la version web.

**Pourquoi** : la demande est « iOS, Android et web, complets ». Trois applications natives
séparées seraient trois fois le travail, pour un produit dont la valeur n'est pas dans le
rendu natif. Expo apporte en plus les trois briques dont Sadfy a besoin et qui sont
pénibles à construire à la main : la compilation dans le nuage (donc **aucun Mac requis**),
les notifications push unifiées APNs + FCM, et surtout les **mises à jour à la volée**
(voir A6).

**Ce qu'on accepte** : une dépendance forte à l'écosystème Expo, et des performances de
rendu un cran en dessous du natif pur — sans conséquence ici, aucun jeu de Sadfy n'est
gourmand.

---

## A2 — TypeScript partout, noyau de règles partagé

**Choix** : TypeScript strict côté application et côté serveur, avec les règles du jeu
dans `packages/shared`, importé par les deux.

**Pourquoi** : le calcul des points, les paliers, les règles d'âge et d'appariement sont
écrits **une seule fois**. Il devient impossible que le serveur et l'application ne soient
pas d'accord sur ce que vaut une partie — le genre de désaccord qui produit des bugs
invisibles et impossibles à reproduire.

Le mode strict est poussé au maximum (`noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`) : le coût est de quelques minutes à l'écriture, le gain est
la classe entière de bugs qui n'atteint jamais un téléphone.

---

## A3 — Le serveur fait autorité sur les parties

**Choix** : l'état d'une partie vit sur le serveur. Le client envoie des **intentions**, le
serveur valide et renvoie à chaque joueur **uniquement sa vue**.

**Pourquoi** : ce n'est pas d'abord de l'anti-triche, c'est ce qui **rend les jeux
asymétriques possibles**. Dans le Portrait Robot, le Témoin ne doit jamais recevoir
l'interface de construction, et l'Inspecteur ne doit jamais recevoir le visage. Si le
serveur envoyait le même état aux deux, l'asymétrie ne tiendrait qu'à la bonne volonté du
client — c'est-à-dire à rien.

Effet secondaire précieux : le serveur porte l'horloge de référence, ce qui rend les
contraintes temporelles fiables malgré la latence mobile.

---

## A4 — HTTP pour le froid, WebSocket pour le vif

**Choix** : REST pour ce qui est sans état (identité, duos, contenu, signalements),
WebSocket pour la session vive (recherche, partie, présence).

**Pourquoi** : le découpage conventionnel, et le plus facile à déboguer. Tout faire passer
par le WebSocket aurait réduit le nombre de briques, mais rendu opaque tout ce qui n'est
pas temps réel.

---

## A5 — Géolocalisation sans divulgation

**Choix** : aucune position brute ne quitte jamais l'appareil.

- **Recherche** : le téléphone envoie un identifiant de cellule geohash de 6 caractères
  (≈ 1,2 km × 0,6 km, l'approximation la plus proche de la zone d'1 km de la spec), gardé
  en mémoire vive et jamais écrit.
- **Présence entre partenaires** : le téléphone envoie `HMAC(cellule, secret du duo)`. Le
  serveur ne peut que constater l'égalité de deux empreintes — il n'apprend ni où c'est,
  ni ce que ça vaut. C'est la technique éprouvée par les systèmes de détection de contacts.
- Chaque appareil transmet aussi les 8 cellules voisines, sans quoi deux personnes
  distantes de 10 m mais de part et d'autre d'une frontière ne se détecteraient pas.

**Pourquoi** : c'est ce qui permet de tenir le principe P2 tout en offrant une
fonctionnalité — « ton partenaire est dans ta zone » — qui aurait normalement exigé une
carte vivante de qui est où.

---

## A6 — Trois axes de version, deux canaux de mise à jour

**Choix** : versionner séparément l'**application**, le **protocole** et le **contenu**.

| Changement | Canal | Délai pour l'utilisateur |
|---|---|---|
| Bug, question, texte, équilibrage d'un jeu — ~95 % des cas | Mise à jour à la volée (EAS Update) | **Immédiat**, sans validation d'Apple |
| Permission système, bibliothèque native, icône | Soumission aux stores | 1-3 jours |

**Pourquoi** : sans cela, corriger une faute de frappe demanderait trois jours d'attente et
une soumission. Avec, le produit devient pilotable au jour le jour.

Le **protocole** est versionné à part parce que c'est le vrai risque : quelqu'un qui n'a pas
mis à jour depuis trois semaines doit pouvoir jouer avec quelqu'un qui vient d'installer.
Le serveur annonce une version minimale ; en dessous, l'utilisateur voit un écran « mets à
jour pour continuer » plutôt qu'un plantage. On ne remonte ce minimum que lorsqu'une
ancienne version est réellement incapable de fonctionner — chaque incrément met dehors
tous ceux qui n'ont pas encore mis à jour.

**Trois couches de sécurité** sur chaque mise à jour :
1. les tests automatiques bloquent la publication ;
2. déploiement progressif — 10 % des utilisateurs d'abord ;
3. retour arrière en une minute, sans validation de personne.

---

## A7 — Le danger des données locales

Le carnet d'un duo et sa progression vivent sur le téléphone. **Une migration ratée détruit
définitivement une relation à 900 points**, sans aucun recours : c'est le prix de
l'architecture sans compte.

Deux protections, toutes deux obligatoires :

- chaque migration est testée sur des données réelles avant publication, et `migrerStockage`
  **refuse de démarrer** plutôt que d'écraser des données qu'il ne sait pas lire ;
- l'essentiel — duos et points — est dupliqué côté serveur, donc une catastrophe locale
  reste réparable. Le carnet détaillé, lui, ne l'est pas : c'est assumé.

---

## A8 — Ce qui reste à décider

| Sujet | Statut |
|---|---|
| Hébergement du serveur (Fly.io ou serveur loué) | À trancher au moment du déploiement |
| Base de lieux publics pour le point mystère (§13.5) | OpenStreetMap ; filtrage à définir. Porte la sécurité du moment le plus sensible |
| Attestation d'appareil (App Attest / Play Integrity) | Nécessaire pour que les exclusions tiennent. Absente sur web, d'où l'exclusion de l'endgame en PWA |
