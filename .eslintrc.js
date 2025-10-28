module.exports = {
  env: {
    node: true,
    es2022: true
  },
  extends: ['standard'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-console': 'off', // Allow console.log for logging
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error'
  },
  ignorePatterns: ['node_modules/', 'logs/', 'old copy/', '*.log']
}
