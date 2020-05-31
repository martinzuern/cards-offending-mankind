module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    '@vue/standard',
    'plugin:vue/recommended',
    '@vue/typescript',
    '@vue/prettier',
    'prettier/@typescript-eslint',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    parser: '@typescript-eslint/parser',
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    // '@typescript-eslint/no-unused-vars': 'error',

    // TODO remove the following lines and uncomment the one above
    '@typescript-eslint/no-unused-vars': 'warn',
    'vue/no-use-v-if-with-v-for': 'warn',
    'vue/no-parsing-error': 'warn',
    '@typescript-eslint/ban-ts-ignore': 'warn',
  },
  overrides: [
    {
      files: ['**/__tests__/*.{j,t}s?(x)', '**/tests/unit/**/*.spec.{j,t}s?(x)'],
      env: {
        jest: true,
      },
    },
  ],
};
