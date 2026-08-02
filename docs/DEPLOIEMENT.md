# Déploiement

Ce document décrit ce qu'il faut faire pour mettre Sadfy en ligne, et **ce que ça coûte**.

---

## Ce qui se déploie, et où

| Élément | Où | Compte requis |
|---|---|---|
| **Le serveur** | Fly.io (ou n'importe quel hébergeur Docker) | Fly.io + carte bancaire |
| **La version web** | Fichiers statiques : Netlify, Vercel, Cloudflare Pages | Un compte gratuit suffit |
| **iOS / Android** | EAS Build → App Store / Play Store | Apple (99 $/an) + Google (25 $ une fois) |

**La version web arrive en premier, et ne demande aucun compte développeur.** C'est
elle qui donnera à Amin une adresse à ouvrir depuis son téléphone.

---

## Le serveur

```bash
fly launch --no-deploy      # une seule fois
fly postgres create         # base managée, la plus petite suffit
fly postgres attach <nom>   # renseigne DATABASE_URL automatiquement
fly deploy
```

Le schéma s'applique tout seul au démarrage : `migrer()` est appelée avant l'écoute.

**Dimensionnement.** Une machine à 512 Mo tient plusieurs milliers de joueurs
simultanés. Le calcul est dans `ARCHITECTURE.md` — l'essentiel : un coup de jeu pèse
une centaine d'octets, et le serveur ne stocke presque rien.

**`auto_stop_machines` est à `false`, et ce n'est pas une négligence.** Une machine
endormie couperait les WebSocket des parties en cours. Le métro fournit déjà bien assez
de coupures ; en ajouter par économie serait absurde.

---

## La version web

```bash
npm run build:web --workspace @sadfy/app
```

Produit des fichiers statiques dans `packages/app/dist`. À déposer chez n'importe quel
hébergeur. Une variable à renseigner : `EXPO_PUBLIC_SADFY_WS`, l'adresse du serveur.

**Rappel de ce que la version web ne peut pas faire** (§4) : pas de géolocalisation en
arrière-plan, donc pas de notification de présence ni de sollicitation application
fermée ; et pas d'endgame, parce que l'attestation d'appareil n'existe pas sur le web et
qu'un utilisateur exclu pourrait sinon revenir par le navigateur.

Ce n'est pas à cacher : l'interface le dit.

---

## iOS et Android

À faire une fois les comptes créés.

```bash
npx eas build --platform all      # compilation dans le nuage, aucun Mac requis
npx eas submit --platform all     # soumission aux stores
```

**Le délai de vérification d'identité des comptes développeurs est le goulot
d'étranglement classique** : de quelques jours à quelques semaines. À lancer bien avant
d'en avoir besoin.

---

## Les mises à jour, une fois en ligne

| Changement | Commande | Délai utilisateur |
|---|---|---|
| Bug, question, texte — ~95 % des cas | `eas update --branch production` | **Immédiat** |
| Permission, bibliothèque native, icône | `eas build` + `eas submit` | 1-3 jours |

**Déploiement progressif** — jamais tout le monde d'un coup :

```bash
eas update --branch production --rollout-percentage 10
eas update:republish --branch production --rollout-percentage 100   # si tout va bien
```

**Retour arrière**, en une minute et sans validation de personne :

```bash
eas update:rollback --branch production
```

---

## Avant la première ouverture au public

À traiter, dans cet ordre de priorité :

1. **Politique de confidentialité et CGU.** Exigées par les deux stores. Le tableau de
   `ARCHITECTURE.md` (« ce que le serveur ne saura jamais ») donne la matière.
2. **Procédure de traitement des signalements**, écrite au calme et pas un dimanche
   soir : ce qui déclenche un blocage immédiat, ce qui déclenche un signalement aux
   autorités, ce qu'on conserve et combien de temps.
3. **Attestation d'appareil** (App Attest / Play Integrity). Sans elle, une exclusion ne
   vaut rien : il suffit de réinstaller.
4. **Consentement parental des moins de 15 ans** — le point ouvert O2.
5. **Base de lieux publics** pour le point mystère. C'est la brique dont dépend la
   sécurité du moment le plus sensible du parcours : le filtrage par catégorie et par
   fréquentation doit être un choix explicite, jamais un tirage au hasard sur une carte.

---

## Sauvegardes

Ce qui doit être sauvegardé se réduit à peu de chose, mais ce peu est irremplaçable :
**les duos et leurs points**. C'est la seule copie qui permette à quelqu'un de retrouver
une relation à 900 points après un changement de téléphone.

```bash
fly postgres backup list
```

Le carnet détaillé, lui, ne vit que sur les appareils et n'est pas récupérable. C'est
assumé — mais il faut le savoir avant qu'on le demande, pas après.
