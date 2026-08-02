/**
 * Le Blind Match — cœur du palier 1.
 *
 * Les deux reçoivent la même question. **Les choix sont révélés simultanément** : tant
 * que l'autre n'a pas répondu, rien de sa réponse n'apparaît. Sinon le second
 * s'alignerait, et le jeu ne mesurerait plus rien (§15.2).
 *
 * Aucune bonne réponse, donc aucun échec possible : deux personnes très différentes ne
 * doivent pas terminer leur première partie sur un constat de défaite.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Bouton, Carte, Ecran, Espace, Txt, VoixMachine } from '../src/composants.js';
import { couleurs, espace, rayons } from '../src/theme.js';

const QUESTIONS = [
  { texte: 'La pire invention de l\'humanité', choix: ['le réveil matin', 'le message vocal de 3 min', 'la coriandre', 'les cintres qui s\'emmêlent'] },
  { texte: 'Dans l\'avion, tu es…', choix: ['l\'accapareur d\'accoudoir', 'celui qui dort bouche ouverte', 'celui qui va 4 fois aux toilettes', 'celui qui applaudit'] },
  { texte: 'Le meilleur bruit du monde', choix: ['la pluie sur une vitre', 'un paquet de chips', 'le silence total', 'quelqu\'un qui rit vraiment'] },
];

export default function BlindMatch() {
  const [tour, setTour] = useState(0);
  const [mien, setMien] = useState<number | null>(null);
  const [revele, setRevele] = useState<number | null>(null);
  const [communs, setCommuns] = useState(0);

  const question = QUESTIONS[tour];

  function repondre(choix: number) {
    setMien(choix);
    // Le partenaire répond — simulé tant que le relais n'est pas branché.
    setTimeout(() => {
      const sien = (choix + tour) % 4;
      setRevele(sien);
      if (sien === choix) setCommuns((c) => c + 1);
    }, 900);
  }

  function suivant() {
    setMien(null);
    setRevele(null);
    setTour((t) => t + 1);
  }

  if (!question) {
    return (
      <Ecran>
        <Espace taille="xxl" />
        <Txt variante="heros">{communs} sur {QUESTIONS.length}</Txt>
        <Espace taille="m" />
        <Txt ton="adouci">réponses identiques.</Txt>
        <Espace taille="l" />
        <VoixMachine>
          {communs === 0
            ? 'Rien en commun aujourd\'hui. Franchement, ça promet des débats.'
            : communs === QUESTIONS.length
              ? 'Tout pareil. Vous trichez ?'
              : 'Un peu d\'accord, un peu pas. La zone la plus intéressante.'}
        </VoixMachine>
        <View style={styles.bas}>
          <Bouton titre="Continuer" onPress={() => router.replace('/duos')} />
        </View>
      </Ecran>
    );
  }

  return (
    <Ecran>
      <Espace taille="m" />
      <Txt variante="minuscule" ton="eteint">
        Blind Match · {tour + 1} sur {QUESTIONS.length}
      </Txt>
      <Espace taille="l" />
      <Txt variante="titre">{question.texte}</Txt>
      <Espace taille="l" />

      <View style={{ gap: espace.s }}>
        {question.choix.map((choix, i) => (
          <Pressable
            key={choix}
            onPress={() => mien === null && repondre(i)}
            style={[
              styles.choix,
              mien === i && styles.mien,
              // La réponse de l'autre n'apparaît qu'une fois la mienne verrouillée.
              revele === i && styles.sien,
            ]}
          >
            <Txt ton={mien === i || revele === i ? 'normal' : 'adouci'}>{choix}</Txt>
            {revele !== null && (mien === i || revele === i) && (
              <Txt variante="minuscule" ton="eteint">
                {mien === i && revele === i ? 'vous deux' : mien === i ? 'toi' : 'lui'}
              </Txt>
            )}
          </Pressable>
        ))}
      </View>

      <View style={styles.bas}>
        {mien === null ? (
          <Txt variante="minuscule" ton="eteint" centre>
            Il n'y a pas de bonne réponse. Seulement la tienne.
          </Txt>
        ) : revele === null ? (
          <Txt ton="eteint" centre>On attend sa réponse…</Txt>
        ) : (
          <>
            <Carte>
              <Txt centre>
                {mien === revele ? 'Vous avez répondu pareil.' : 'Pas la même chose.'}
              </Txt>
            </Carte>
            <Espace taille="m" />
            <Bouton titre="Suivante" onPress={suivant} />
          </>
        )}
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  bas: { marginTop: 'auto', paddingBottom: espace.l },
  choix: {
    paddingVertical: espace.m,
    paddingHorizontal: espace.m,
    borderRadius: rayons.m,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.fondEleve,
  },
  mien: { borderColor: couleurs.accent },
  sien: { backgroundColor: couleurs.bordureAccent },
});
