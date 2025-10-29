module.exports = {
  env: {
    node: true,
    es2022: true
  },
  extends: ['standard'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'no-console': 'off', // Allow console.log for logging
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',
    'semi': ['error', 'always'], // Require semicolons
    'comma-dangle': ['error', 'always-multiline'], // Require trailing commas
    'space-before-function-paren': ['error', 'never'], // No space before function parens
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn'
  },
  ignorePatterns: ['node_modules/', 'logs/', 'old copy/', '*.log', 'dist/']
}
