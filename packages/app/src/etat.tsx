/**
 * L'état de l'application.
 *
 * Un seul magasin, volontairement : Sadfy n'a que quelques objets à retenir — une
 * identité, un profil, une liste de duos, une connexion. Un gestionnaire d'état
 * sophistiqué serait ici plus de code que de valeur.
 *
 * Deux règles de conception dans ce fichier :
 *
 * - **Tout passe par le stockage.** Aucun état durable ne vit uniquement en mémoire :
 *   l'application peut être tuée par le système à tout moment, et perdre la progression
 *   d'un duo n'est pas récupérable (§A7).
 * - **La date de naissance ne sort jamais d'ici.** Ce qui circule est calculé à partir
 *   d'elle — une tranche, un bit majeur/mineur — jamais elle-même (§5.2).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  ageA,
  estEligible,
  genererIdentite,
  trancheDe,
  vivierDe,
  type ProfilLocal,
  type TrancheAge,
  type Vivier,
} from '@sadfy/shared';

import {
  DONNEES_VIERGES,
  charger,
  enregistrer,
  type DonneesLocales,
  type Support,
} from './stockage.js';

export type EtatChargement = 'chargement' | 'pret' | 'erreur';

export interface Magasin {
  readonly etat: EtatChargement;
  readonly erreur: string | null;
  readonly donnees: DonneesLocales;
  /** `true` tant que l'onboarding n'a pas été fait. */
  readonly premierLancement: boolean;

  creerIdentite(): Promise<void>;
  enregistrerProfil(profil: ProfilLocal): Promise<void>;
  majDonnees(transformation: (d: DonneesLocales) => DonneesLocales): Promise<void>;

  /** Calculés localement, jamais stockés : ils changent tout seuls le jour de
   *  l'anniversaire, et ne doivent pas se figer. */
  readonly age: number | null;
  readonly tranche: TrancheAge | null;
  readonly vivier: Vivier | null;
}

const Contexte = createContext<Magasin | null>(null);

export function FournisseurEtat({
  support,
  children,
  maintenant = () => Date.now(),
}: {
  support: Support;
  children: ReactNode;
  maintenant?: () => number;
}) {
  const [etat, setEtat] = useState<EtatChargement>('chargement');
  const [erreur, setErreur] = useState<string | null>(null);
  const [donnees, setDonnees] = useState<DonneesLocales>(DONNEES_VIERGES);

  useEffect(() => {
    let annule = false;
    void (async () => {
      try {
        const chargees = await charger(support);
        if (annule) return;
        setDonnees(chargees);
        setEtat('pret');
      } catch (e) {
        if (annule) return;
        // On n'écrase jamais après une erreur de chargement : les données sont
        // peut-être récupérables, et le serveur détient encore duos et points.
        setErreur(e instanceof Error ? e.message : 'Erreur de chargement');
        setEtat('erreur');
      }
    })();
    return () => {
      annule = true;
    };
  }, [support]);

  const majDonnees = useCallback(
    async (transformation: (d: DonneesLocales) => DonneesLocales) => {
      const suivantes = transformation(donnees);
      await enregistrer(support, suivantes);
      setDonnees(suivantes);
    },
    [donnees, support],
  );

  const creerIdentite = useCallback(async () => {
    if (donnees.identite) return;
    // Générée sur l'appareil, sans contacter personne, sans rien déclarer.
    const identite = genererIdentite();
    await majDonnees((d) => ({ ...d, identite }));
  }, [donnees.identite, majDonnees]);

  const enregistrerProfil = useCallback(
    async (profil: ProfilLocal) => {
      await majDonnees((d) => ({ ...d, profil }));
    },
    [majDonnees],
  );

  const derives = useMemo(() => {
    const naissance = donnees.profil?.dateNaissance;
    if (!naissance) return { age: null, tranche: null, vivier: null };
    const age = ageA(naissance, maintenant());
    return {
      age,
      tranche: trancheDe(age),
      vivier: estEligible(age) ? vivierDe(age) : null,
    };
  }, [donnees.profil?.dateNaissance, maintenant]);

  const magasin: Magasin = useMemo(
    () => ({
      etat,
      erreur,
      donnees,
      premierLancement: donnees.identite === null || donnees.profil === null,
      creerIdentite,
      enregistrerProfil,
      majDonnees,
      ...derives,
    }),
    [etat, erreur, donnees, creerIdentite, enregistrerProfil, majDonnees, derives],
  );

  return <Contexte.Provider value={magasin}>{children}</Contexte.Provider>;
}

export function useMagasin(): Magasin {
  const magasin = useContext(Contexte);
  if (!magasin) throw new Error('useMagasin doit être utilisé dans un FournisseurEtat');
  return magasin;
}
