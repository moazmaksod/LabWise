// Minimal ESLint flat config (eslint.config.cjs)
// This mirrors the project's .eslintrc.json settings without using FlatCompat.
// Compose recommended configs from installed packages so behavior matches legacy .eslintrc.json
const nextConfig = require('eslint-config-next');
const nextPlugin = require('@next/eslint-plugin-next');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const reactPlugin = require('eslint-plugin-react');
// Some packages expose 'configs' object with named presets; pull recommended variants
const tsRecommended = (tsPlugin.configs && (tsPlugin.configs['flat/recommended'] || tsPlugin.configs.recommended)) || {};
const reactRecommended = (reactPlugin.configs && (reactPlugin.configs.flat || reactPlugin.configs.recommended)) || {};

// eslint-config-next exports an array of config entries (see its dist/index.js). The main entry is named 'next'.
// We'll reuse its 'next' config object (index 0) which already bundles react/react-hooks and @next/next rules.
const nextMain = Array.isArray(nextConfig) ? nextConfig[0] : nextConfig;

module.exports = [
    // use the next config as the base (it contains recommended react hooks and next rules)
    nextMain,
    // add TypeScript recommended rules for TS files
    {
        files: ['**/*.{ts,tsx}'],
        plugins: {
            '@typescript-eslint': tsPlugin,
        },
        languageOptions: {
            parser: tsPlugin.parser,
            parserOptions: tsRecommended.parserOptions || {},
        },
        rules: tsRecommended.rules || {},
    },
    // ensure react plugin recommended rules (for non-TS files) — merged in by nextMain but keep explicit safety
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        plugins: {
            react: reactPlugin,
            'react-hooks': require('eslint-plugin-react-hooks'),
        },
        rules: reactRecommended.rules || {},
        settings: nextMain.settings || { react: { version: 'detect' } },
    },
    // global ignores
    {
        ignores: ['node_modules/**', '.next/**', '.vercel/**'],
    },
];
