import json from '@eslint/json';
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['test/grammars/**'] },
  {
    ...js.configs.recommended,
    files: ['**/*.{mjs,cjs}'],
    languageOptions: { globals: globals.node },
  },
  {
    plugins: { json },
    files: ['**/*.json', '**/*.code-snippets'],
    language: 'json/json',
    rules: {
      'json/no-duplicate-keys': 'error',
    },
  },
];
