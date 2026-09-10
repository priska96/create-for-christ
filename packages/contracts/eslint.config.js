import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  prettier,
  {
    languageOptions: {
      parserOptions: {
        project: true, // or path like ['./tsconfig.json']
        tsconfigRootDir: import.meta.dirname, //  Ensures the parser uses this file's folder as root
      },
    },
  }
);
