const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = [
  { ignores: ['dist/**', '.expo/**', 'android/**', 'ios/**'] },
  ...expoConfig,
  prettier,
  {
    languageOptions: {
      parserOptions: {
        project: true, // or path like ['./tsconfig.json']
        tsconfigRootDir: import.meta.dirname, //  Ensures the parser uses this file's folder as root
      },
    },
  },
];
