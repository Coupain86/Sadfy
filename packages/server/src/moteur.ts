/**
 * Le moteur de parties.
 *
 * C'est ici que se joue la propriété centrale de toute la conception : **le serveur
 * fait autorité sur l'état, et n'envoie à chaque joueur que SA vue.**
 *
 * Ce n'est pas d'abord de l'anti-triche, c'est ce qui **rend les jeux asymétriques
 * possibles**. Dans le Portrait Robot, l'Inspecteur ne doit jamais recevoir le visage
 * recherché. Si le serveur envoyait le même état aux deux et laissait chaque interface
 * masquer ce qui ne la concerne pas, l'asymétrie ne tiendrait qu'à la bonne volonté du
 * client — c'est-à-dire à rien.
 *
 * Le moteur porte aussi trois règles de la spec qui n'ont l'air de rien et qui décident
 * de l'expérience :
 * - **perdre rapporte des points** (§10.4) ;
 * - **une coupure réseau n'est pas un abandon** (§10.6) — confondre les deux punirait
 *   les joueurs en transport, qui sont le cas d'usage central ;
 * - **partir en le disant ne compte pas comme un abandon** (§10.7).
 */

import { PARTIE, type JeuId, type MotifSortiePartie, type UserId } from '@sadfy/shared';

// ---------------------------------------------------------------------------
// Ce qu'un jeu doit fournir
// ---------------------------------------------------------------------------

export interface ResultatAction {
  /** `false` si l'action est invalide : elle est ignorée, jamais appliquée. */
  readonly acceptee: boolean;
  /** Message court destiné au joueur, choisi dans un catalogue — jamais du texte libre. */
  readonly retour?: string;
}

export interface MoteurJeu<Etat, Action> {
  readonly id: JeuId;
  /** Deux manches à rôles inversés pour un jeu asymétrique, une seule sinon (§9.3). */
  readonly asymetrique: boolean;
  readonly roles: readonly [string, string];
  readonly dureeMancheMs: number;
  /** Trois lignes par rôle, affichées avant chaque partie (§9.5). */
  readonly briefings: Readonly<Record<string, string>>;

  creer(graine: number, joueurs: readonly [UserId, UserId]): Etat;

  /**
   * **La projection.** Tout passe par ici : rien n'atteint un joueur qui n'a pas été
   * explicitement mis dans sa vue. Un oubli dans `vue` est un bug fonctionnel, pas
   * seulement une fuite.
   */
  vue(etat: Etat, pour: UserId): unknown;

  roleDe(etat: Etat, joueur: UserId): string;

  appliquer(etat: Etat, joueur: UserId, action: Action, maintenant: number): ResultatAction;

  terminee(etat: Etat): boolean;
  reussie(etat: Etat): boolean;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export type EtatPartie =
  | 'briefing'
  | 'en_cours'
  /** Réseau perdu : la partie attend, elle n'est pas perdue (§10.6). */
  | 'en_pause_reseau'
  | 'terminee';

export type EvenementPartie =
  /**
   * Le briefing porte **son** jeu.
   *
   * Il l'a payé cher : la couche réseau devait passer le jeu à la traduction, et
   * personne ne le connaissait à cet endroit — les deux appelants avaient donc écrit
   * `'la_scie'` en dur. Toutes les parties s'annonçaient sous le nom d'un jeu qu'elles
   * n'étaient pas. Le seul endroit qui sait quel jeu se joue, c'est la partie
   * elle-même ; c'est donc elle qui le dit.
   */
  | {
      readonly type: 'briefing';
      readonly pour: UserId;
      readonly jeu: JeuId;
      readonly role: string;
      readonly texte: string;
    }
  | { readonly type: 'vue'; readonly pour: UserId; readonly vue: unknown; readonly finMancheLe: number }
  | { readonly type: 'rappel_inactivite'; readonly pour: UserId }
  | {
      readonly type: 'partenaire_deconnecte';
      readonly pour: UserId;
      readonly reprendAvantLe: number;
    }
  | { readonly type: 'partenaire_reconnecte'; readonly pour: UserId }
  | { readonly type: 'manche_terminee'; readonly pour: UserId; readonly reussie: boolean }
  | {
      readonly type: 'partie_terminee';
      readonly pour: UserId;
      readonly reussie: boolean;
      /**
       * Le motif choisi par celui qui est parti, s'il en a choisi un.
       *
       * Rien d'autre ne sort. En particulier, le fait qu'un départ ait été
       * **silencieux** ne quitte jamais le serveur : celui qui reste apprendrait
       * sinon que l'autre s'est éclipsé sans un mot, ce qui est exactement le
       * reproche qu'on refuse de lui adresser (§10.7). L'information vit dans
       * `ResumePartie`, pour l'indicateur de fiabilité et pour lui seul.
       */
      readonly motifPartenaire?: MotifSortiePartie;
    };

export interface ResumePartie {
  readonly reussie: boolean;
  readonly manchesReussies: number;
  readonly manchesJouees: number;
  /** Sert à l'indicateur de fiabilité : seuls les départs **silencieux** comptent. */
  readonly abandonSilencieuxPar?: UserId;
}

export class Partie<Etat, Action> {
  readonly #moteur: MoteurJeu<Etat, Action>;
  readonly #joueurs: readonly [UserId, UserId];
  readonly #graine: number;

  #etat: Etat;
  #phase: EtatPartie = 'briefing';
  #manche = 1;
  #manchesReussies = 0;
  #finMancheLe = 0;
  #derniereAction = new Map<UserId, number>();
  #rappelEnvoye = new Set<UserId>();
  #deconnectes = new Map<UserId, number>();
  #resume?: ResumePartie;

  constructor(
    moteur: MoteurJeu<Etat, Action>,
    joueurs: readonly [UserId, UserId],
    graine: number,
  ) {
    this.#moteur = moteur;
    this.#joueurs = joueurs;
    this.#graine = graine;
    this.#etat = moteur.creer(graine, joueurs);
  }

  get phase(): EtatPartie {
    return this.#phase;
  }

  get manche(): number {
    return this.#manche;
  }

  get resume(): ResumePartie | undefined {
    return this.#resume;
  }

  /**
   * Le briefing est obligatoire (§9.5). Sans lui, les vingt premières secondes d'un jeu
   * asymétrique sont de la confusion pure, et beaucoup abandonnent leur première partie
   * en croyant l'application cassée.
   */
  briefer(): readonly EvenementPartie[] {
    return this.#joueurs.map((joueur) => {
      const role = this.#moteur.roleDe(this.#etat, joueur);
      return {
        type: 'briefing' as const,
        pour: joueur,
        jeu: this.#moteur.id,
        role,
        texte: this.#moteur.briefings[role] ?? '',
      };
    });
  }

  demarrer(maintenant: number): readonly EvenementPartie[] {
    this.#phase = 'en_cours';
    this.#finMancheLe = maintenant + this.#moteur.dureeMancheMs;
    for (const joueur of this.#joueurs) this.#derniereAction.set(joueur, maintenant);
    return this.#vuesPourTous();
  }

  agir(joueur: UserId, action: Action, maintenant: number): readonly EvenementPartie[] {
    if (this.#phase !== 'en_cours') return [];
    if (!this.#joueurs.includes(joueur)) return [];

    const resultat = this.#moteur.appliquer(this.#etat, joueur, action, maintenant);
    if (!resultat.acceptee) return [];

    this.#derniereAction.set(joueur, maintenant);
    this.#rappelEnvoye.delete(joueur);

    if (this.#moteur.terminee(this.#etat)) {
      return this.#finirManche(this.#moteur.reussie(this.#etat), maintenant);
    }

    return this.#vuesPourTous();
  }

  /**
   * Le réseau tombe — le métro. La partie se met en pause et attend ; elle n'est pas
   * perdue. Confondre coupure et abandon punirait exactement le cas d'usage central.
   */
  deconnecter(joueur: UserId, maintenant: number): readonly EvenementPartie[] {
    if (this.#phase === 'terminee') return [];
    this.#deconnectes.set(joueur, maintenant);
    this.#phase = 'en_pause_reseau';

    const autre = this.#autre(joueur);
    return [
      {
        type: 'partenaire_deconnecte',
        pour: autre,
        reprendAvantLe: maintenant + PARTIE.RECONNEXION_MS,
      },
    ];
  }

  reconnecter(joueur: UserId, maintenant: number): readonly EvenementPartie[] {
    if (this.#phase !== 'en_pause_reseau') return [];
    this.#deconnectes.delete(joueur);
    if (this.#deconnectes.size > 0) return [];

    this.#phase = 'en_cours';
    this.#derniereAction.set(joueur, maintenant);

    // La partie reprend exactement où elle en était : l'état n'a jamais bougé.
    return [
      { type: 'partenaire_reconnecte', pour: this.#autre(joueur) },
      ...this.#vuesPourTous(),
    ];
  }

  /**
   * Départ volontaire. Le motif est **proposé, jamais obligatoire** — et partir en le
   * disant ne compte pas comme un abandon : le système récompense ainsi la politesse
   * sans jamais le dire (§10.7).
   */
  quitter(
    joueur: UserId,
    motif: MotifSortiePartie | undefined,
    _maintenant: number,
  ): readonly EvenementPartie[] {
    if (this.#phase === 'terminee') return [];

    const silencieux = motif === undefined;
    this.#phase = 'terminee';
    this.#resume = {
      reussie: false,
      manchesReussies: this.#manchesReussies,
      manchesJouees: this.#manche - 1,
      ...(silencieux ? { abandonSilencieuxPar: joueur } : {}),
    };

    // Celui qui reste ne voit jamais « il a abandonné » : un constat, pas un reproche.
    return [
      {
        type: 'partie_terminee',
        pour: this.#autre(joueur),
        reussie: false,
        ...(motif ? { motifPartenaire: motif } : {}),
      },
    ];
  }

  tick(maintenant: number): readonly EvenementPartie[] {
    if (this.#phase === 'terminee') return [];

    if (this.#phase === 'en_pause_reseau') {
      const plusAncienne = Math.min(...this.#deconnectes.values());
      if (maintenant - plusAncienne > PARTIE.RECONNEXION_MS) {
        // La fenêtre est passée : on termine proprement. Celui qui est resté conserve
        // ses points, comme pour tout abandon (§10.6).
        return this.#terminer(false, undefined);
      }
      return [];
    }

    const evenements: EvenementPartie[] = [];

    if (maintenant >= this.#finMancheLe) {
      return this.#finirManche(this.#moteur.reussie(this.#etat), maintenant);
    }

    // Inactivité : rappel discret, puis fin propre. Quelqu'un descend du bus, on lui
    // parle, il décroche — l'autre ne doit pas rester planté devant un écran figé.
    for (const joueur of this.#joueurs) {
      const derniere = this.#derniereAction.get(joueur) ?? maintenant;
      const inactifMs = maintenant - derniere;

      if (inactifMs >= PARTIE.INACTIVITE_FIN_MS) {
        return this.#terminer(false, undefined);
      }
      if (inactifMs >= PARTIE.INACTIVITE_RAPPEL_MS && !this.#rappelEnvoye.has(joueur)) {
        this.#rappelEnvoye.add(joueur);
        evenements.push({ type: 'rappel_inactivite', pour: joueur });
      }
    }

    return evenements;
  }

  #finirManche(reussie: boolean, maintenant: number): readonly EvenementPartie[] {
    if (reussie) this.#manchesReussies += 1;

    const manchesTotal = this.#moteur.asymetrique ? 2 : 1;
    const evenements: EvenementPartie[] = this.#joueurs.map((joueur) => ({
      type: 'manche_terminee' as const,
      pour: joueur,
      reussie,
    }));

    if (this.#manche >= manchesTotal) {
      return [...evenements, ...this.#terminer(this.#manchesReussies > 0, undefined)];
    }

    // Manche suivante, rôles inversés. Sinon l'un aurait joué le rôle actif et l'autre
    // le rôle passif, et c'est frustrant (§9.3).
    this.#manche += 1;
    this.#etat = this.#moteur.creer(this.#graine + this.#manche, [
      this.#joueurs[1],
      this.#joueurs[0],
    ]);
    this.#finMancheLe = maintenant + this.#moteur.dureeMancheMs;
    this.#rappelEnvoye.clear();
    for (const joueur of this.#joueurs) this.#derniereAction.set(joueur, maintenant);

    return [...evenements, ...this.#vuesPourTous()];
  }

  #terminer(
    reussie: boolean,
    motif: MotifSortiePartie | undefined,
  ): readonly EvenementPartie[] {
    this.#phase = 'terminee';
    this.#resume = {
      reussie,
      manchesReussies: this.#manchesReussies,
      manchesJouees: this.#manche,
    };

    return this.#joueurs.map((joueur) => ({
      type: 'partie_terminee' as const,
      pour: joueur,
      reussie,
      ...(motif ? { motifPartenaire: motif } : {}),
    }));
  }

  /** Chaque joueur reçoit une projection distincte. C'est le cœur de l'asymétrie. */
  #vuesPourTous(): readonly EvenementPartie[] {
    return this.#joueurs.map((joueur) => ({
      type: 'vue' as const,
      pour: joueur,
      vue: this.#moteur.vue(this.#etat, joueur),
      finMancheLe: this.#finMancheLe,
    }));
  }

  #autre(joueur: UserId): UserId {
    return this.#joueurs[0] === joueur ? this.#joueurs[1] : this.#joueurs[0];
  }
}
