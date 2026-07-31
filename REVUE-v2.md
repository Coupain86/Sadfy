# Revue critique de SPEC-v2

> Relecture systématique du workflow à la recherche de blocages, boucles sans fin,
> contradictions et trous fonctionnels. Chaque point comporte une recommandation, mais
> aucune n'a été intégrée à `SPEC-v2.md` — ce sont des décisions produit.

**20 points identifiés : 5 blocages ou boucles, 3 contradictions, 8 trous fonctionnels,
4 points mineurs.**

---

## A. Blocages et boucles sans fin

### A1 — Le plafond de relations n'a aucune porte de sortie douce ⚠️ *bloquant*

§12.1 fixe un plafond de 3 à 4 relations actives et précise qu'« il faut clore une
relation pour en ouvrir une nouvelle ». Or **aucune action « clore » n'existe** dans la
spec, en dehors du Kill Switch, qui est définitif et brutal.

Scénario de blocage complet : quatre relations actives, les quatre partenaires cessent de
jouer. L'utilisateur ne peut rencontrer personne pendant **deux semaines**, jusqu'à la
mise en sommeil automatique (§12.5). Il n'a aucun moyen d'agir. C'est le pire scénario
possible pour un nouvel utilisateur qui vient de démarrer quatre relations d'un coup.

**Recommandation** — ajouter une action **« mettre en pause »** manuelle, disponible à
tout moment, qui libère immédiatement le créneau sans rien supprimer et sans notifier
l'autre. La relation rejoint la section « en pause » et peut être réactivée.

### A2 — L'endgame peut être relancé indéfiniment ⚠️ *boucle*

§13.1 : « la Décision reste déclenchable par l'un ou l'autre à tout moment ».
§13.4 : deux tours, puis si ça n'aboutit pas, on continue à jouer.

Rien n'empêche donc de relancer immédiatement la Décision après un échec, puis encore, et
encore. **On obtient une machine à pression** : celui qui veut se rencontrer peut
reposer la question tous les jours à celui qui ne veut pas.

**Recommandation** — délai de latence après une Décision non aboutie : la relancer n'est
possible qu'après **7 jours**. Et si trois Décisions échouent, ne plus la proposer
automatiquement du tout.

### A3 — Une relation arrêtée bloque un créneau chez celui qui n'a rien décidé ⚠️ *bloquant*

§13.3 : seul celui qui a arrêté peut rouvrir. Bonne règle — sinon un refus devient une
négociation.

Mais la conséquence n'est pas traitée : **B, qui n'a rien décidé, se retrouve avec une
relation morte occupant un de ses trois ou quatre créneaux**, potentiellement pour
toujours, puisque A peut ne jamais rouvrir. B est puni de la décision de A.

**Recommandation** — un arrêt libère **immédiatement le créneau des deux côtés**. La
relation existe toujours (le carnet est conservé, A peut rouvrir), mais elle ne compte
plus dans le plafond de personne.

### A4 — Le ping n'a aucune décroissance ⚠️ *pression*

§12.4 : un ping par partenaire et par jour, refus silencieux. Sur deux semaines, cela
autorise **quatorze relances sans jamais une seule réponse**.

La coupure douce existe (§12.2), mais elle exige une action délibérée de la personne
sollicitée. Beaucoup ne l'utiliseront pas — c'est précisément le profil de ceux qu'il
faut protéger.

**Recommandation** — décroissance automatique : après **3 pings sans réponse**, les pings
sont désactivés dans ce sens jusqu'à ce que le destinataire initie lui-même quelque chose.
Silencieux pour l'émetteur, qui ne doit pas apprendre qu'il a été coupé.

### A5 — Ramasser une trace au plafond : comportement non défini

§8.3 : ramasser une trace crée l'appariement. §12.1 : plafond de 3-4 relations.
Que se passe-t-il si l'on est au plafond ? Non traité.

**Recommandation** — ne pas proposer les traces à quelqu'un qui est au plafond. Ne jamais
laisser ramasser puis refuser : l'auteur de la trace la croirait consommée.

---

## B. Contradictions internes

### B1 — Palier 1 : convergence seule *ou* liste des points communs ? ⚠️ *contradiction*

- §11.4 : au palier 1, « on sait seulement s'il y a eu convergence, **pas sur quoi** ».
- §11.5 : la révélation est une liste — « vous préférez tous les deux la montagne ».

Les deux ne peuvent pas être vrais en même temps.

**Recommandation** — trancher explicitement :
- **Palier 1** : le **nombre** seul. « 3 réponses sur 5 identiques. » Frustrant dans le
  bon sens, c'est ce qui donne envie de revenir.
- **À partir du palier 2** : la liste détaillée, qui s'accumule dans le carnet.

### B2 — « 5 jeux au choix » alors que le palier 1 n'en débloque presque aucun ⚠️ *contradiction*

§9.1 : le gagnant de l'épreuve de convergence choisit **parmi 5 jeux**.
§11.4 : au palier 1, très peu de choses sont débloquées.

Aux jours 1 et 2 — les deux jours les plus déterminants pour la rétention — il est
probable qu'il n'y ait pas cinq jeux à proposer.

**Aggravation** : la spec v2 ne définit **nulle part** quel jeu appartient à quel palier.
Le tableau §15.2 liste les mécaniques et leur statut v1/v2, mais pas leur déblocage.

**Recommandation** — deux choses : rendre le nombre de propositions adaptatif (« parmi ce
qui est débloqué »), et **ajouter une colonne « palier » au catalogue §15.2**. Sans elle,
l'épreuve de convergence, le choix par le système et la progression ne sont pas
implémentables.

### B3 — Notification de présence symétrique vs PWA sans arrière-plan

§12.2 impose la symétrie absolue. §4 indique que la PWA n'a pas de géolocalisation en
arrière-plan. Dans un duo natif ↔ PWA, la symétrie est structurellement impossible.

**Recommandation** — l'énoncer : la notification de présence exige que **les deux** soient
sur application native. Sinon elle ne se déclenche pour personne. Et le dire dans
l'interface, sans quoi l'utilisateur natif croira la fonctionnalité cassée.

---

## C. Trous fonctionnels

### C1 — « Dispo pour de vrai » est devenu orphelin

§6.1 définit trois modes de disponibilité. Le troisième existait pour autoriser une
rencontre immédiate en fin de partie. Mais §13.5 planifie désormais les rendez-vous par
grille de créneaux, à plusieurs jours. **Il n'y a plus de rencontre immédiate nulle part,
donc ce mode ne sert plus à rien.**

**Recommandation** — soit le supprimer et n'en garder que deux, soit lui donner une
fonction réelle : prioriser l'appariement entre deux personnes qui l'ont choisi, et
autoriser une proposition de créneau **le jour même**.

### C2 — La frontière de journée n'est pas définie ⚠️ *exploitable*

§11.3 : une seule session par jour fait progresser. Mais « par jour » n'est pas défini,
et les questions sont asynchrones.

Si A répond à 23h50 et B à 00h10, la session appartient à quelle journée ? Et un duo peut
enchaîner deux sessions en vingt minutes en encadrant minuit — soit deux jours de
progression en une soirée.

**Recommandation** — journée glissante de **4 h à 4 h**, comme la plupart des applications
à rituel quotidien. Une session tardive est rattachée à la journée précédente, ce qui est
aussi ce que ressent l'utilisateur.

### C3 — Questions un jour, jeu un autre : rattachement non défini

Les questions rapportent 40 points en asynchrone, le jeu 60 en synchrone. Si le duo répond
aux questions lundi mais ne parvient à jouer que mercredi, les 60 points se rattachent à
quelle session ? Et les 60 points du lundi sont-ils perdus ou reportés ?

**Recommandation** — les 60 points sont attachés à la **journée** : un jeu non joué est
simplement perdu, sans aucune pénalité ni report. C'est cohérent avec « aucune pénalité
d'absence » et ça évite une comptabilité de dettes que personne ne comprendrait.

### C4 — La banque de questions n'est pas cloisonnée par âge ⚠️ *sécurité*

Le cloisonnement mineurs/majeurs est strict pour l'appariement (§5.4), mais **§11.5 ne
prévoit qu'une seule banque de questions**. Une question sur l'alcool, la sexualité, la
vie professionnelle ou la colocation n'a rien à faire devant un joueur de 14 ans.

**Recommandation** — deux banques distinctes, cloisonnées exactement comme les viviers
d'appariement. À intégrer au point ouvert O6.

### C5 — Le filtre d'écart d'âge est inadapté au vivier mineur ⚠️ *sécurité*

§11.7 fixe un écart par défaut d'environ 15 ans. Appliqué au vivier mineur, cela autorise
par exemple un appariement 13 / 17 ans — un écart considérable à cet âge, et exactement le
type de configuration qu'on cherche à éviter.

**Recommandation** — à l'intérieur du vivier mineur, écart maximal **de 2 à 3 ans, non
réglable**. Ce point dépend du point ouvert O2 (âge minimum), qui devient prioritaire.

### C6 — Le lapin au rendez-vous n'est pas géré ⚠️ *le moment le plus sensible du produit*

§13.5 prévoit « je suis arrivé » et « je ne peux plus venir ». Mais rien ne traite le cas
où **personne n'appuie sur rien** : quelqu'un attend dans un café avec un mot de passe
absurde, et l'autre ne vient jamais. C'est le pire moment possible du parcours, et il n'a
aucun traitement.

**Recommandation** — trente minutes après l'heure convenue, si un seul « je suis arrivé »
a été enregistré : prévenir celui qui est venu, proposer de reprogrammer ou de basculer
sur les réseaux, et **compter l'absence dans l'indicateur de fiabilité**. Et faire partir
le retour du lendemain (§14.1) **même quand la rencontre n'a pas eu lieu** — c'est
précisément là qu'il est le plus utile.

### C7 — La PWA est un canal d'évasion de bannissement ⚠️ *sécurité*

§3.2 fait reposer l'efficacité des exclusions sur l'attestation d'appareil. Or App Attest
et Play Integrity **n'existent pas sur le web**. Quelqu'un d'exclu ouvre la PWA et
recommence.

**Recommandation** — restreindre la PWA : pas d'endgame, pas de rencontre réelle, pas
d'échange de réseaux. Elle reste une version d'essai — ce qui est déjà son statut — mais
sans porte de sortie, elle cesse d'être une faille.

### C8 — Refuser le candidat proposé : re-tirage ou non ? ⚠️ *risque de dénaturer le produit*

§7.3 et §7.4 : le serveur désigne **un** candidat, jamais de liste, et l'initiateur
confirme. Mais que se passe-t-il **s'il ne confirme pas** ?

Si un refus déclenche la proposition d'un autre candidat, puis d'un autre, **on a
reconstitué le balayage de profils** que tout le produit refuse — simplement présenté un
par un.

**Recommandation** — l'énoncer sans ambiguïté : décliner **relance le jeu proposé, jamais
la personne**. Pour changer de personne, il faut annuler la recherche et la relancer, ce
qui repart d'un scan complet. La friction est volontaire.

---

## D. Points mineurs

### D1 — Le Kill Switch ne peut pas effacer le carnet de l'autre

Le blocage est réciproque côté serveur, mais le carnet est local. Celui qui a été bloqué
conserve donc le sien. Acceptable — il ne contient rien d'identifiant — mais à énoncer
plutôt qu'à laisser croire à un effacement total.

**À vérifier également** : la spec ne dit jamais **à partir de quand** le Kill Switch est
accessible. En v1 il était rangé dans l'endgame. Il doit être disponible **dès la première
seconde**, à tout palier.

### D2 — Les points après 1000

§13.8 décrit le mode « continuer à jouer » mais ne dit pas si le compteur continue de
monter, ni vers quoi. **Recommandation** : les points continuent d'être comptés, sans
nouveau palier ; le carnet devient le seul objet de progression.

### D3 — Le mode solo n'est pas spécifié

§5.5 lui donne trois fonctions mais ne définit ni son contenu, ni s'il rapporte des
points. **Recommandation** : aucun point — ce n'est pas un duo, et le compteur mesure du
temps passé à deux.

### D4 — Être appairé avec quelqu'un qu'on connaît déjà

Rien n'empêche d'être appairé avec un collègue, un voisin, un frère ou une sœur, un ex.
Au palier 2, le pseudo révélé peut suffire à se reconnaître. **C'est structurellement
impossible à empêcher sans identité** — mais il faut en tirer une conséquence : le Kill
Switch doit être accessible immédiatement (cf. D1), parce que c'est la seule issue.

À noter que ce n'est pas toujours un problème : deux collègues qui se découvrent sur
Sadfy, c'est aussi une très bonne histoire.

---

## Synthèse — ce que je corrigerais en priorité

| Priorité | Points | Motif |
|---|---|---|
| **1 — avant tout développement** | A1, A3, B2 | Blocages durs et impossibilité d'implémenter la progression sans le mapping jeu → palier |
| **2 — sécurité** | C4, C5, C6, C7 | Touchent les mineurs ou le moment de la rencontre réelle |
| **3 — intégrité du produit** | A2, A4, C8 | Empêchent le produit de devenir une machine à pression ou un balayage de profils |
| **4 — cohérence** | B1, B3, C1, C2, C3 | Contradictions et règles manquantes, sans gravité mais à trancher |
| **5 — à énoncer** | D1 à D4 | Rien à construire, seulement à écrire |
