const js = require('@eslint/js');
const globals = require('globals');
const prettier = require('eslint-config-prettier');

// Only lints repo-root tooling scripts; each workspace owns its own eslint.config.js.
module.exports = [
  { ignores: ['apps/**', 'packages/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { sourceType: 'module', globals: { ...globals.node } },
  },
  prettier,
];
