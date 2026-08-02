/**
 * Le raccordement de l'application au serveur.
 *
 * C'est la pièce qui manquait : les écrans existaient, la logique serveur existait, mais
 * le fil entre les deux n'était pas tiré. Ce fichier tire ce fil.
 *
 * Il ne contient **aucune règle**. Le calcul des points, les paliers, les vues de jeu :
 * tout ça est décidé ailleurs — dans `@sadfy/shared` pour ce que les deux partagent,
 * sur le serveur pour ce qui fait autorité. L'application affiche, elle ne tranche pas.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  celluleEtVoisines,
  encoderCellule,
  type JeuId,
  type MessageClient,
  type MessageServeur,
} from '@sadfy/shared';

import { Connexion, type EtatConnexion } from './connexion.js';
import { useMagasin } from './etat.js';

export interface Proposition {
  readonly propositionId: string;
  readonly avatar: string;
  readonly jeu: JeuId;
  readonly expireLe: number;
}

export interface EtatServeur {
  readonly connexion: EtatConnexion;
  /** Rayon courant du scan, en mètres. `null` quand aucune recherche n'est en cours. */
  readonly scanRayonM: number | null;
  readonly proposition: Proposition | null;
  /** Vue de la partie, telle que le serveur l'a projetée POUR CE JOUEUR. */
  readonly vueJeu: unknown;
  readonly briefing: { readonly role: string; readonly texte: string } | null;
  /** Le partenaire a perdu le réseau — la partie attend, elle n'est pas perdue. */
  readonly partenaireAbsentJusqua: number | null;
  readonly personneTrouvee: boolean;

  chercher(lat: number, lon: number): void;
  annulerRecherche(): void;
  confirmer(propositionId: string): void;
  declinerJeu(propositionId: string): void;
  accepter(propositionId: string): void;
  agir(action: unknown): void;
  quitterPartie(motif?: MessageClient extends { type: 'quitter_partie'; motif?: infer M }
    ? M
    : never): void;
}

const Contexte = createContext<EtatServeur | null>(null);

export function FournisseurServeur({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  const { donnees } = useMagasin();
  const identite = donnees.identite;

  const [connexion, setConnexion] = useState<EtatConnexion>('deconnecte');
  const [scanRayonM, setScanRayonM] = useState<number | null>(null);
  const [proposition, setProposition] = useState<Proposition | null>(null);
  const [vueJeu, setVueJeu] = useState<unknown>(null);
  const [briefing, setBriefing] = useState<EtatServeur['briefing']>(null);
  const [partenaireAbsentJusqua, setPartenaireAbsent] = useState<number | null>(null);
  const [personneTrouvee, setPersonneTrouvee] = useState(false);

  const client = useRef<Connexion | null>(null);

  useEffect(() => {
    if (!identite) return;

    const c = new Connexion({
      url,
      clePriveeHex: identite.clePriveeHex,
      clePubliqueHex: identite.clePubliqueHex,
    });
    client.current = c;

    const desabonnerEtat = c.surEtat(setConnexion);
    const desabonnerMessage = c.surMessage((message) => appliquer(message));
    c.connecter();

    return () => {
      desabonnerEtat();
      desabonnerMessage();
      c.fermer();
      client.current = null;
    };

    function appliquer(message: MessageServeur) {
      switch (message.type) {
        case 'scan':
          setScanRayonM(message.rayonM);
          setPersonneTrouvee(false);
          break;

        case 'proposition':
          setProposition({
            propositionId: message.propositionId,
            avatar: message.avatar,
            jeu: message.jeu,
            expireLe: message.expireLe,
          });
          break;

        // Jamais « refusé » : on continue simplement à chercher, sans que personne
        // n'apprenne jamais avoir été refusé (P5).
        case 'recherche_continue':
        case 'plus_disponible':
          setProposition(null);
          break;

        case 'personne_trouvee':
          setScanRayonM(null);
          setPersonneTrouvee(true);
          break;

        case 'partie_demarre':
          setProposition(null);
          setScanRayonM(null);
          setBriefing({ role: message.role ?? '', texte: message.briefing });
          break;

        // La vue arrive déjà projetée : l'application n'a rien à masquer, elle n'a
        // simplement pas reçu ce qui ne la regarde pas (§A9).
        case 'vue_jeu':
          setVueJeu(message.vue);
          break;

        case 'partenaire_deconnecte':
          setPartenaireAbsent(message.reprendAvantLe);
          break;

        case 'partenaire_reconnecte':
          setPartenaireAbsent(null);
          break;

        case 'partie_terminee':
          setVueJeu(null);
          setBriefing(null);
          setPartenaireAbsent(null);
          break;

        default:
          break;
      }
    }
  }, [identite, url]);

  const envoyer = useCallback((message: MessageClient) => {
    client.current?.envoyer(message);
  }, []);

  const valeur: EtatServeur = useMemo(
    () => ({
      connexion,
      scanRayonM,
      proposition,
      vueJeu,
      briefing,
      partenaireAbsentJusqua,
      personneTrouvee,

      chercher(lat, lon) {
        // La position est convertie en cellule **ici**, sur l'appareil. Ce qui part sur
        // le réseau n'est déjà plus une position (§A5).
        const cellule = encoderCellule(lat, lon);
        setPersonneTrouvee(false);
        envoyer({
          type: 'chercher',
          cellule,
          cellulesVoisines: [...celluleEtVoisines(cellule)],
        });
      },
      annulerRecherche() {
        setScanRayonM(null);
        setProposition(null);
        envoyer({ type: 'annuler_recherche' });
      },
      confirmer(propositionId) {
        envoyer({ type: 'confirmer_proposition', propositionId });
      },
      declinerJeu(propositionId) {
        envoyer({ type: 'decliner_jeu', propositionId });
      },
      accepter(propositionId) {
        envoyer({ type: 'accepter_proposition', propositionId });
      },
      agir(action) {
        envoyer({ type: 'action_jeu', action });
      },
      quitterPartie(motif) {
        envoyer(motif ? { type: 'quitter_partie', motif } : { type: 'quitter_partie' });
      },
    }),
    [
      connexion,
      scanRayonM,
      proposition,
      vueJeu,
      briefing,
      partenaireAbsentJusqua,
      personneTrouvee,
      envoyer,
    ],
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useServeur(): EtatServeur {
  const valeur = useContext(Contexte);
  if (!valeur) throw new Error('useServeur doit être utilisé dans un FournisseurServeur');
  return valeur;
}
