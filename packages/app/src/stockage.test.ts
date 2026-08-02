import { beforeEach, describe, expect, it } from 'vitest';

import { VERSION_STOCKAGE_LOCAL, type DuoId, type UserId } from '@sadfy/shared';

import {
  CLE_DONNEES,
  CLE_SAUVEGARDE,
  DONNEES_VIERGES,
  ErreurStockage,
  MagasinLocal,
  charger,
  duoDe,
  enregistrer,
  majDuo,
  oublierDuo,
  type DonneesLocales,
  type DuoLocal,
  type Support,
} from './stockage.js';

/** Support en mémoire, avec la possibilité de simuler des pannes réelles. */
class SupportTest implements Support {
  readonly donnees = new Map<string, string>();
  ecritureSilencieusementIgnoree = false;

  async lire(cle: string): Promise<string | null> {
    return this.donnees.get(cle) ?? null;
  }

  async ecrire(cle: string, valeur: string): Promise<void> {
    // Sur mobile, une écriture peut échouer sans lever quand le disque est plein.
    if (this.ecritureSilencieusementIgnoree && cle === CLE_DONNEES) return;
    this.donnees.set(cle, valeur);
  }

  async supprimer(cle: string): Promise<void> {
    this.donnees.delete(cle);
  }
}

const DUO = 'duo-1' as DuoId;

function duo(over: Partial<DuoLocal> = {}): DuoLocal {
  return {
    duoId: DUO,
    partenaire: 'bob' as UserId,
    points: 300,
    etat: 'active',
    rencontreLe: 1_700_000_000_000,
    cellulePremiereRencontre: 'u09tun',
    offsetMinutes: 120,
    carnet: [{ jour: 1, questionId: 'u-001', maReponse: 2, saReponse: 2 }],
    ...over,
  };
}

let support: SupportTest;

beforeEach(() => {
  support = new SupportTest();
});

// ---------------------------------------------------------------------------

describe('chargement', () => {
  it('renvoie des données vierges au premier lancement', async () => {
    expect(await charger(support)).toEqual(DONNEES_VIERGES);
  });

  it('relit ce qui a été écrit', async () => {
    const donnees: DonneesLocales = { ...DONNEES_VIERGES, duos: [duo()] };
    await enregistrer(support, donnees);
    expect(await charger(support)).toEqual(donnees);
  });

  it('refuse des données venant d\'une version plus récente', async () => {
    // L'utilisateur a été basculé sur une version antérieure. Les écraser détruirait
    // définitivement sa progression : mieux vaut un écran d'erreur (§A7).
    support.donnees.set(
      CLE_DONNEES,
      JSON.stringify({ ...DONNEES_VIERGES, version: VERSION_STOCKAGE_LOCAL + 1 }),
    );
    await expect(charger(support)).rejects.toThrow(/plus récentes/);
  });

  it('se rabat sur la sauvegarde quand les données sont illisibles', async () => {
    const bonnes: DonneesLocales = { ...DONNEES_VIERGES, duos: [duo()] };
    support.donnees.set(CLE_SAUVEGARDE, JSON.stringify(bonnes));
    support.donnees.set(CLE_DONNEES, '{ ceci n est pas du json');

    expect(await charger(support)).toEqual(bonnes);
  });

  it('refuse plutôt que de repartir de zéro quand tout est illisible', async () => {
    // Repartir de zéro effacerait silencieusement une relation à 900 points. Un écran
    // d'erreur laisse au moins la chance de restaurer depuis le serveur.
    support.donnees.set(CLE_DONNEES, 'illisible');
    await expect(charger(support)).rejects.toThrow(ErreurStockage);
  });

  it('traite un fichier sans numéro de version comme corrompu', async () => {
    support.donnees.set(CLE_DONNEES, JSON.stringify({ duos: [] }));
    await expect(charger(support)).rejects.toThrow(ErreurStockage);
  });
});

// ---------------------------------------------------------------------------

describe('écriture', () => {
  it('conserve l\'état précédent en sauvegarde avant d\'écraser', async () => {
    // L'ordre compte : si l'écriture est interrompue — batterie, application tuée —,
    // la sauvegarde contient encore un état cohérent.
    const premier: DonneesLocales = { ...DONNEES_VIERGES, duos: [duo({ points: 100 })] };
    const second: DonneesLocales = { ...DONNEES_VIERGES, duos: [duo({ points: 200 })] };

    await enregistrer(support, premier);
    await enregistrer(support, second);

    const sauvegarde = JSON.parse(support.donnees.get(CLE_SAUVEGARDE)!) as DonneesLocales;
    expect(sauvegarde.duos[0]?.points).toBe(100);
  });

  it('détecte une écriture qui échoue silencieusement', async () => {
    // Disque plein : l'écriture ne lève pas, mais rien n'est écrit. Sans relecture, on
    // ne s'en apercevrait qu'au prochain démarrage, données perdues.
    support.ecritureSilencieusementIgnoree = true;
    await expect(enregistrer(support, DONNEES_VIERGES)).rejects.toThrow(/relecture/);
  });

  it('refuse d\'écrire des données mal versionnées', async () => {
    const mauvaise = { ...DONNEES_VIERGES, version: 999 };
    await expect(enregistrer(support, mauvaise)).rejects.toThrow(/Refus d'écrire/);
  });
});

// ---------------------------------------------------------------------------

describe('opérations sur les duos', () => {
  const donnees: DonneesLocales = { ...DONNEES_VIERGES, duos: [duo()] };

  it('retrouve un duo par son identifiant', () => {
    expect(duoDe(donnees, DUO)?.points).toBe(300);
    expect(duoDe(donnees, 'inconnu' as DuoId)).toBeUndefined();
  });

  it('met à jour un duo sans perdre son carnet', () => {
    // Le carnet est ce que le duo a construit ensemble : c'est précisément ce qui donne
    // son poids au dixième jour, et ce qu'on ne peut pas se permettre d'écraser.
    const apres = majDuo(
      donnees,
      DUO,
      (d) => ({ ...d, points: d.points + 100 }),
      () => duo(),
    );

    expect(duoDe(apres, DUO)?.points).toBe(400);
    expect(duoDe(apres, DUO)?.carnet).toHaveLength(1);
  });

  it('crée le duo quand il n\'existe pas encore', () => {
    const nouveau = 'duo-2' as DuoId;
    const apres = majDuo(
      donnees,
      nouveau,
      (d) => d,
      () => duo({ duoId: nouveau, points: 0 }),
    );

    expect(apres.duos).toHaveLength(2);
    expect(duoDe(apres, nouveau)?.points).toBe(0);
  });

  it('garde la cellule de première rencontre sur l\'appareil', () => {
    // C'est elle qui permet de tirer le point mystère sans que le serveur sache où le
    // duo s'est rencontré (§13.5).
    expect(duoDe(donnees, DUO)?.cellulePremiereRencontre).toBe('u09tun');
  });

  it('oublie un duo sur Kill Switch', () => {
    expect(oublierDuo(donnees, DUO).duos).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------

/**
 * Le magasin — et le bug qui l'a fait naître.
 *
 * L'inscription enchaînait deux mises à jour : créer l'identité, puis enregistrer le
 * profil. Chacune partait de l'état capturé au dernier rendu, donc la seconde écrasait
 * la première. Résultat : **l'identité disparaissait à la fin de l'inscription**, sans
 * la moindre erreur — et au rechargement suivant l'utilisateur repartait de l'écran
 * d'accueil, sans plus rien.
 */
describe('magasin local', () => {
  let support: SupportTest;

  beforeEach(() => {
    support = new SupportTest();
  });

  const IDENTITE = {
    clePriveeHex: 'aa',
    clePubliqueHex: 'bb',
    userId: 'u1' as UserId,
  };

  const PROFIL = {
    dateNaissance: '1996-01-01',
    genre: 'femme',
    filtreGenre: 'peu_importe',
    ecartAgeMax: 15,
  } as DonneesLocales['profil'];

  it("n'efface pas la première écriture avec la seconde", async () => {
    const magasin = new MagasinLocal(support);
    await magasin.charger();

    await magasin.maj((d) => ({ ...d, identite: IDENTITE }));
    await magasin.maj((d) => ({ ...d, profil: PROFIL }));

    expect(magasin.donnees.identite).toEqual(IDENTITE);
    expect(magasin.donnees.profil).toEqual(PROFIL);
  });

  it('survit à deux écritures lancées en même temps', async () => {
    // Le même bug, par l'autre porte : écrire est asynchrone, donc deux mises à jour
    // simultanées pourraient lire toutes les deux l'état d'avant.
    const magasin = new MagasinLocal(support);
    await magasin.charger();

    await Promise.all([
      magasin.maj((d) => ({ ...d, identite: IDENTITE })),
      magasin.maj((d) => ({ ...d, profil: PROFIL })),
    ]);

    expect(magasin.donnees.identite).toEqual(IDENTITE);
    expect(magasin.donnees.profil).toEqual(PROFIL);
  });

  it('relit sur le disque ce qu\'il prétend avoir gardé', async () => {
    const magasin = new MagasinLocal(support);
    await magasin.charger();
    await magasin.maj((d) => ({ ...d, identite: IDENTITE }));
    await magasin.maj((d) => ({ ...d, profil: PROFIL }));

    const relu = await new MagasinLocal(support).charger();
    expect(relu.identite).toEqual(IDENTITE);
    expect(relu.profil).toEqual(PROFIL);
  });

  it("n'avance pas l'état en mémoire quand le disque a refusé", async () => {
    // Afficher une progression que le disque n'a pas gardée serait pire que l'erreur :
    // l'utilisateur croirait son duo sauvegardé.
    const magasin = new MagasinLocal(support);
    await magasin.charger();
    support.ecritureSilencieusementIgnoree = true;

    await expect(magasin.maj((d) => ({ ...d, identite: IDENTITE }))).rejects.toThrow(
      ErreurStockage,
    );
    expect(magasin.donnees.identite).toBeNull();
  });

  it('repart après un échec au lieu de se bloquer', async () => {
    const magasin = new MagasinLocal(support);
    await magasin.charger();

    support.ecritureSilencieusementIgnoree = true;
    await expect(magasin.maj((d) => ({ ...d, identite: IDENTITE }))).rejects.toThrow();

    support.ecritureSilencieusementIgnoree = false;
    await magasin.maj((d) => ({ ...d, identite: IDENTITE }));
    expect(magasin.donnees.identite).toEqual(IDENTITE);
  });
});
