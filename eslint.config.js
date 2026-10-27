import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage', 'src-tauri/target', 'src-tauri/gen'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: { globals: globals.browser },
  },
  {
    // Regra de arquitetura: a lógica pura e os dados nunca dependem do Phaser
    files: ['src/logic/**/*.ts', 'src/data/**/*.ts', 'src/utils/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [{ name: 'phaser', message: 'Lógica pura não pode importar o Phaser.' }] },
      ],
    },
  },
);
