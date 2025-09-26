// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node
      },
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    rules: {
      'no-unused-vars': 'warn',
      'semi': ['warn', 'always'],
      'quotes': ['warn', 'single']
    },
    ignores: [
      'node_modules/**',
      'public/**',
      '*.min.js'
    ]
  }
];