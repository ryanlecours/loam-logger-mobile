import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config([
  {
    ignores: [
      '**/dist/**',
      'dist/',
      'node_modules/',
      '.expo/',
      '.expo-shared/',
      'web-build/',
      'coverage/',
      '*.log',
      '.env',
      '.env.*',
      'src/graphql/generated.ts',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    plugins: {
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
        __DEV__: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    rules: {
      // Allow default exports in Expo Router files
      'import/no-default-export': 'off',
    },
  },
  {
    // Design-system enforcement. DESIGN.md sets 0.5rem as the system's minimum
    // radius ("corners are never sharp"), and nothing in the tree may go under
    // it. `radius.full` (999) is the pill and is unaffected.
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    ignores: ['src/constants/theme.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Property[key.name='borderRadius'] > Literal[value>0][value<8]",
          message:
            'Radius below 8 breaks the DESIGN.md minimum. Use radius.sm/md/lg/xl, or radius.full for pills, bars, dots and circles.',
        },
        {
          // The platform's default placeholder grey is near-invisible on our
          // dark inputs, which is how the ride forms shipped unreadable hints.
          selector:
            "JSXOpeningElement[name.name='TextInput']:has(JSXAttribute[name.name='placeholder']):not(:has(JSXAttribute[name.name='placeholderTextColor']))",
          message:
            'A TextInput with a placeholder needs placeholderTextColor={colors.textMuted}; the platform default is unreadable on dark inputs.',
        },
      ],
    },
  },
  {
    // Files that have adopted the type scale. Raw font sizes are an error here
    // so the adopted surface cannot drift back. Add files to this list as they
    // migrate; the goal is for it to grow to cover app/ and src/.
    files: [
      'src/components/common/ErrorState.tsx',
      'src/components/dashboard/BikeTriageGroup.tsx',
      'src/components/dashboard/EmptyBikeState.tsx',
      'src/components/dashboard/RecentRidesList.tsx',
      'src/components/dashboard/RideStatsCard.tsx',
      'src/components/gear/ComponentHealthBadge.tsx',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Property[key.name='borderRadius'] > Literal[value>0][value<8]",
          message:
            'Radius below 8 breaks the DESIGN.md minimum. Use radius.sm/md/lg/xl, or radius.full for pills, bars, dots and circles.',
        },
        {
          // The platform's default placeholder grey is near-invisible on our
          // dark inputs, which is how the ride forms shipped unreadable hints.
          selector:
            "JSXOpeningElement[name.name='TextInput']:has(JSXAttribute[name.name='placeholder']):not(:has(JSXAttribute[name.name='placeholderTextColor']))",
          message:
            'A TextInput with a placeholder needs placeholderTextColor={colors.textMuted}; the platform default is unreadable on dark inputs.',
        },
        {
          selector: "Property[key.name='fontSize'] > Literal",
          message: 'Use the `type` scale from constants/theme, not a raw font size.',
        },
        {
          selector: "Property[key.name='fontWeight'] > Literal",
          message: 'Use the `type` scale from constants/theme, not a raw font weight.',
        },
      ],
    },
  },
]);
