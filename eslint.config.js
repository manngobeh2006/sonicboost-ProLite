const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  {
    ignores: [
      'dist/*',
      'node_modules/*',
      'rootStore.example.ts',
      'nativewind-env.d.ts',
      'backend/**/*',  // Ignore backend directory
      'eslint.config.js',  // Ignore this file itself
    ],
  },
  ...compat.extends('expo'),
  {
    rules: {
      'import/first': 'off',
    },
  },
];
