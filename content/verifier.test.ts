import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Vérification du contenu.
 *
 * Ce fichier ne juge pas si une question est drôle — ça, c'est le travail d'Amin. Il
 * refuse en revanche tout ce qui enfreint une règle qui a une conséquence réelle :
 * l'anonymat, le cloisonnement mineurs/majeurs, ou le format dont dépend l'interface.
 */

const RACINE = new URL('.', import.meta.url).pathname;

interface Fichier {
  readonly version: number;
  readonly vivier: 'mineur' | 'majeur' | 'les_deux';
  readonly tranches: readonly string[];
  readonly questions: readonly {
    readonly id: string;
    readonly theme: string;
    readonly texte: string;
    readonly choix: readonly string[];
  }[];
}

function chargerQuestions(): { fichier: string; contenu: Fichier }[] {
  // Récursif : les extensions par tranche vivent dans un sous-dossier, et une
  // extension mal étiquetée passerait au travers d'une lecture à plat.
  const trouves: { fichier: string; contenu: Fichier }[] = [];

  const parcourir = (dossier: string, prefixe: string) => {
    for (const entree of readdirSync(dossier, { withFileTypes: true })) {
      const chemin = join(dossier, entree.name);
      if (entree.isDirectory()) parcourir(chemin, `${prefixe}${entree.name}/`);
      else if (entree.name.endsWith('.json')) {
        trouves.push({
          fichier: `${prefixe}${entree.name}`,
          contenu: JSON.parse(readFileSync(chemin, 'utf8')) as Fichier,
        });
      }
    }
  };

  parcourir(join(RACINE, 'questions'), '');
  return trouves;
}

const fichiers = chargerQuestions();
const toutes = fichiers.flatMap((f) =>
  f.contenu.questions.map((q) => ({ ...q, fichier: f.fichier, vivier: f.contenu.vivier })),
);

// ---------------------------------------------------------------------------

describe('format des questions', () => {
  it('impose exactement quatre choix', () => {
    // Ni deux, ni trois, ni cinq : l'interface et le calcul de convergence en dépendent.
    for (const q of toutes) {
      expect(q.choix, `${q.fichier} / ${q.id}`).toHaveLength(4);
    }
  });

  it('refuse les choix vides ou dupliqués', () => {
    for (const q of toutes) {
      for (const choix of q.choix) {
        expect(choix.trim().length, `${q.fichier} / ${q.id}`).toBeGreaterThan(0);
      }
      expect(new Set(q.choix).size, `${q.fichier} / ${q.id}`).toBe(4);
    }
  });

  it('donne un identifiant unique à chaque question', () => {
    // Un doublon d'identifiant ferait réapparaître une question déjà posée au duo.
    const ids = toutes.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('donne un thème à chaque question', () => {
    // Le thème sert à l'épreuve de convergence sur les quiz (§9.1).
    for (const q of toutes) {
      expect(q.theme, `${q.fichier} / ${q.id}`).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------

describe("aucune question ne permet d'identifier quelqu'un", () => {
  /**
   * La révélation progressive culmine au mot de passe absurde du rendez-vous. Si une
   * question laisse deviner le lycée ou le métier de quelqu'un au troisième jour,
   * **l'anonymat a fui avant même le dispositif censé le protéger** (§11.5).
   */
  const INTERDITS = [
    /\bton (?:métier|travail|boulot|emploi|employeur|entreprise)\b/i,
    /\bton (?:quartier|arrondissement|immeuble|adresse|code postal)\b/i,
    /\bta (?:ville|rue|classe|école|fac|université)\b/i,
    // « boîte » au sens d'employeur — mais pas la boîte de réception, ni celle aux
    // lettres, ni celle à outils. Un motif trop large finirait par refuser des dizaines
    // de bonnes questions sans que personne ne comprenne pourquoi.
    /\b(?:ta|ton) boîte(?! de réception| aux lettres| à outils| de nuit)\b/i,
    /\bton (?:lycée|collège|prénom|nom de famille|salaire)\b/i,
    /\btu habites où\b/i,
    /\boù (?:habites|travailles|étudies)-tu\b/i,
    /\bcombien (?:tu gagnes|gagnes-tu)\b/i,
  ];

  it('ne demande jamais le métier, le lieu, l\'école, le prénom ni les revenus', () => {
    for (const q of toutes) {
      const texte = `${q.texte} ${q.choix.join(' ')}`;
      for (const interdit of INTERDITS) {
        expect(
          texte,
          `${q.fichier} / ${q.id} — cette question rétrécit la liste des gens que ça pourrait être`,
        ).not.toMatch(interdit);
      }
    }
  });
});

// ---------------------------------------------------------------------------

describe('cloisonnement mineurs / majeurs', () => {
  /**
   * Un fichier mal étiqueté est un bug de sécurité, pas une coquille. Le cloisonnement
   * du contenu suit exactement celui des viviers d'appariement (§5.4).
   */
  // Chaque terme porte ses propres délimiteurs : sans eux, l'alternance ne s'applique
  // qu'aux extrémités du motif et « vivre » se fait attraper par « ivre ».
  const SUJETS_ADULTES = [
    /\b(?:alcool|bière|bières|vin|vins|apéro|cocktail|cocktails|ivre|ivresse)\b/i,
    /\b(?:sexe|sexuel|sexuelle|préservatif|préservatifs)\b/i,
    /\b(?:impôts|salaire|salaires|loyer|loyers|crédit|banquier|découvert)\b/i,
    /\b(?:colocation|colocataire|colocataires)\b/i,
    /\b(?:cigarette|cigarettes|tabac|fumer|clope|clopes)\b/i,
  ];

  it('ne laisse aucun sujet adulte dans la banque mineurs', () => {
    const mineurs = toutes.filter((q) => q.vivier === 'mineur');
    expect(mineurs.length, 'la banque mineurs ne doit pas être vide').toBeGreaterThan(0);

    for (const q of mineurs) {
      const texte = `${q.texte} ${q.choix.join(' ')}`;
      for (const sujet of SUJETS_ADULTES) {
        expect(texte, `${q.fichier} / ${q.id}`).not.toMatch(sujet);
      }
    }
  });

  it('applique la même règle au fonds universel, qui est vu par les mineurs', () => {
    // C'est le piège : « universel » veut dire lu aussi par un joueur de 13 ans.
    const universelles = toutes.filter((q) => q.vivier === 'les_deux');
    for (const q of universelles) {
      const texte = `${q.texte} ${q.choix.join(' ')}`;
      for (const sujet of SUJETS_ADULTES) {
        expect(texte, `${q.fichier} / ${q.id} — universel signifie lu par des mineurs`).not.toMatch(
          sujet,
        );
      }
    }
  });

  it('garde le fonds universel largement majoritaire', () => {
    // Sinon un duo d'âges différents, qui ne partage aucune tranche, se retrouverait
    // sans questions (§11.5 bis).
    const universelles = toutes.filter((q) => q.vivier === 'les_deux').length;
    expect(universelles / toutes.length).toBeGreaterThan(0.5);
  });
});

// ---------------------------------------------------------------------------

describe('la voix de la machine', () => {
  const voix = JSON.parse(readFileSync(join(RACINE, 'voix-machine.json'), 'utf8')) as Record<
    string,
    string[] | number | string
  >;

  const situations = Object.entries(voix).filter(
    (entree): entree is [string, string[]] => Array.isArray(entree[1]),
  );

  it('couvre toutes les situations attendues par le code', () => {
    // Une clé manquante afficherait une chaîne vide au pire moment.
    const attendues = [
      'convergence.accord',
      'convergence.deux_chefs',
      'convergence.deux_polis',
      'convergence.themes_identiques',
      'convergence.themes_melanges',
    ];
    for (const cle of attendues) {
      expect(voix[cle], `réplique manquante : ${cle}`).toBeDefined();
    }
  });

  it('propose assez de variantes pour ne pas s\'user', () => {
    // Une vingtaine par situation à terme ; en dessous de cinq, la répétition se voit
    // dès le troisième jour (§16).
    for (const [cle, repliques] of situations) {
      expect(repliques.length, `${cle} n'a pas assez de variantes`).toBeGreaterThanOrEqual(4);
      expect(new Set(repliques).size, `${cle} contient des doublons`).toBe(repliques.length);
    }
  });

  it('ne désigne jamais l\'un des deux joueurs', () => {
    // Dès qu'une blague désigne quelqu'un, elle crée une gêne dont la relation ne se
    // remet pas. La vanne vise toujours le duo (§16).
    const DESIGNE_UNE_PERSONNE = [
      /\bl'un de vous deux (?:est|a|n'a)\b/i,
      /\bcelui qui\b.*\bdevrait\b/i,
      /\btu es (?:le|la) (?:seul|seule|pire)\b/i,
    ];

    for (const [cle, repliques] of situations) {
      for (const replique of repliques) {
        for (const motif of DESIGNE_UNE_PERSONNE) {
          expect(replique, `${cle} : « ${replique} »`).not.toMatch(motif);
        }
      }
    }
  });

  it('formule un faible score comme un défi, jamais comme un verdict', () => {
    // « Vous n'avez rien en commun » ferme la porte ; « ça promet des débats » ouvre.
    const VERDICTS = [
      /\bça ne marchera (?:pas|jamais)\b/i,
      /\bvous n'êtes pas faits? l'un pour l'autre\b/i,
      /\bincompatibles?\b/i,
      /\blaissez tomber\b/i,
    ];

    for (const replique of voix['affinite.faible'] as string[]) {
      for (const verdict of VERDICTS) {
        expect(replique, `« ${replique} » se lit comme un verdict`).not.toMatch(verdict);
      }
    }
  });
});

// ---------------------------------------------------------------------------

describe('la banque de mots de Convergence', () => {
  const mots = (
    JSON.parse(readFileSync(join(RACINE, 'mots.json'), 'utf8')) as {
      readonly mots: readonly string[];
    }
  ).mots;

  it('en contient assez pour que personne ne revoie les mêmes', () => {
    // Le moteur tire six mots par tour sur trois tours : une banque étroite ferait
    // revenir les mêmes propositions d'une partie à l'autre, et le jeu perdrait tout
    // son sel dès la deuxième fois.
    expect(mots.length).toBeGreaterThanOrEqual(100);
  });

  it('ne répète aucun mot', () => {
    // Deux fois le même mot dans un tour, et « tomber sur le même » ne veut plus rien
    // dire : on ne saurait pas si les deux joueurs ont choisi la même chose.
    expect(new Set(mots).size).toBe(mots.length);
  });

  it('ne contient que des mots qui ne disent rien de celui qui les choisit', () => {
    // Un mot qui désigne un métier, une région ou une appartenance transformerait
    // Convergence en question d'identité — exactement ce qu'on refuse ailleurs (§5.2).
    const INTERDITS = [
      /\b(?:paris|lyon|marseille|banlieue|province)\b/i,
      /\b(?:médecin|avocat|ouvrier|patron|cadre|chômeur)\b/i,
      /\b(?:église|mosquée|synagogue|prière|dieu)\b/i,
      /\b(?:gauche|droite|vote|élection)\b/i,
    ];

    for (const mot of mots) {
      for (const interdit of INTERDITS) {
        expect(mot, `« ${mot} » rétrécit la liste des gens que ça pourrait être`).not.toMatch(
          interdit,
        );
      }
    }
  });
});

// ---------------------------------------------------------------------------

describe('les éléments du Portrait Robot', () => {
  const visages = JSON.parse(readFileSync(join(RACINE, 'visages.json'), 'utf8')) as {
    readonly emplacements: readonly {
      readonly cle: string;
      readonly libelle: string;
      readonly options: readonly string[];
    }[];
  };

  it('garde cinq emplacements à six options', () => {
    // 5 × 6 = 7 776 visages. C'est de là que vient la variété du jeu : la mécanique,
    // elle, ne change jamais. Réduire la grille reviendrait à faire dire « encore le
    // même » dès la troisième partie.
    expect(visages.emplacements).toHaveLength(5);
    for (const emplacement of visages.emplacements) {
      expect(emplacement.options, emplacement.cle).toHaveLength(6);
      expect(new Set(emplacement.options).size, emplacement.cle).toBe(6);
    }
  });

  it('ne décrit jamais une origine, un âge ou une appartenance', () => {
    // Un portrait robot qui ferait deviner à quoi ressemble vraiment l'autre trahirait
    // l'anonymat que tout le reste du produit protège — et le jeu deviendrait un
    // formulaire d'apparence, ce qu'il ne doit jamais être.
    const INTERDITS = [
      /\b(?:noir|blanc|blanche|asiatique|arabe|africain|métis)\b/i,
      /\b(?:vieux|vieille|jeune|ridé|âgé|adolescent)\b/i,
      /\b(?:voile|kippa|croix|turban)\b/i,
      /\b(?:gros|grosse|maigre|obèse|handicap)\b/i,
    ];

    for (const emplacement of visages.emplacements) {
      for (const option of emplacement.options) {
        for (const interdit of INTERDITS) {
          expect(option, `${emplacement.cle} : « ${option} »`).not.toMatch(interdit);
        }
      }
    }
  });
});
