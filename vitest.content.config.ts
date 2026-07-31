import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Le contenu est vérifié depuis la racine : il n'appartient à aucun paquet, il est
    // consommé par l'application comme par le serveur.
    include: ['content/**/*.test.ts'],
  },
});
