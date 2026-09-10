const globals = require('globals');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = [
  { ignores: ['dist/**', '.expo/**', 'android/**', 'ios/**'] },
  ...expoConfig,
  {
    files: ['eslint.config.js'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
  prettier,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
];
