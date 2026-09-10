const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = [
  { ignores: ['dist/**', '.expo/**', 'android/**', 'ios/**'] },
  ...expoConfig,
  prettier,
];
