// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.expo/**', '**/web-build/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Le domaine est en français ; les identifiants aussi. Rien à signaler.
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Interdit les nombres magiques hors du fichier de constantes : toute valeur
      // issue de la spec doit vivre dans packages/shared/src/constants.ts.
      'no-restricted-syntax': 'off',
    },
  },
);
