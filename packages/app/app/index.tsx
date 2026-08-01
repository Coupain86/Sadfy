/**
 * L'aiguillage d'entrée.
 *
 * Au premier lancement on va à l'accueil de bienvenue ; ensuite, directement à la liste
 * des duos — qui devient l'écran principal de l'application dès le deuxième jour
 * (§6.2).
 */

import { Redirect } from 'expo-router';

import { useMagasin } from '../src/etat.js';

export default function Entree() {
  const { premierLancement } = useMagasin();
  return <Redirect href={premierLancement ? '/bienvenue' : '/duos'} />;
}
