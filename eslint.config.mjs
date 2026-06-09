// @ts-check

/**
 * Flat config for ESLint 9. Encodes the internal-boundary table from
 * the Architecture document (§Architectural Boundaries) as
 * `no-restricted-imports` overrides per file family.
 *
 * Story 1.1 sets the framework. Per-file boundary enforcement tightens
 * as helpers and modules are introduced in later stories.
 */
import jsonc from 'eslint-plugin-jsonc'
import prettierPlugin from 'eslint-plugin-prettier/recommended'
import unusedImports from 'eslint-plugin-unused-imports'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import js from '@eslint/js'
import vitestPlugin from '@vitest/eslint-plugin'

/** Boundary rules from Architecture §Architectural Boundaries. */
const FORBIDDEN_IN_MAIN_SCRIPTS = [
  {
    name: 'node:fs',
    message:
      'Direct filesystem access is forbidden in main/*.ts. Go through src/common/cache.ts or src/common/quicklook.ts.',
  },
  {
    name: 'node:fs/promises',
    message: 'Direct filesystem access is forbidden in main/*.ts. Go through src/common/cache.ts.',
  },
]

const FORBIDDEN_IN_ENCODERS = [
  {
    name: 'node:fs',
    message: 'Encoders may not touch the filesystem. They only encode values for PATCH.',
  },
  {
    name: 'node:fs/promises',
    message: 'Encoders may not touch the filesystem.',
  },
  {
    name: '@common/cache',
    message: 'Encoders may not read or write the cache.',
  },
  {
    name: '@common/strings',
    message: 'Encoders may not render strings. Use error.kind to surface failures upstream.',
  },
]

const FORBIDDEN_IN_CACHE = [
  {
    name: '@common/attio/client',
    message: 'cache.ts may not call the API client (would create a cycle).',
  },
]

/** Files that may NOT use the global `fetch`. */
const NO_FETCH_OUTSIDE_CLIENT = {
  'no-restricted-globals': [
    'error',
    {
      name: 'fetch',
      message: 'Direct `fetch` is forbidden outside src/common/attio/client.ts. Route HTTP calls through AttioClient.',
    },
  ],
}

export default tseslint.config(
  // Global ignores.
  {
    ignores: [
      '**/node_modules/**',
      'dist/**',
      'esbuild/**',
      '_bmad-output/**',
      '_bmad/**',
      '.claude/**',
      'design-artifacts/**',
      'docs/**',
      '*.alfredworkflow',
      'package-lock.json',
      'package.json',
      '.releaserc',
      '.husky/_/**',
      'commitlint.config.cjs',
      'reset.d.ts',
    ],
  },

  // Base JS recommended (light — TS rules carry the weight).
  js.configs.recommended,

  // TypeScript recommended for *.ts.
  ...tseslint.configs.recommended.map((cfg) => ({
    ...cfg,
    files: ['**/*.ts'],
  })),

  // Project-wide TS rule tweaks.
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', args: 'after-used', argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Boundary: keyword scripts under src/main/.
  {
    files: ['src/main/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { paths: FORBIDDEN_IN_MAIN_SCRIPTS }],
      ...NO_FETCH_OUTSIDE_CLIENT,
    },
  },

  // Boundary: encoders. Severe locality — no fs, no cache, no strings.
  {
    files: ['src/common/attio/encoders/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { paths: FORBIDDEN_IN_ENCODERS }],
      ...NO_FETCH_OUTSIDE_CLIENT,
    },
  },

  // Boundary: cache. No client imports (cycle), no fetch.
  {
    files: ['src/common/cache.ts'],
    rules: {
      'no-restricted-imports': ['error', { paths: FORBIDDEN_IN_CACHE }],
      ...NO_FETCH_OUTSIDE_CLIENT,
    },
  },

  // Boundary: quicklook.ts — strings + tz only (no encoders, no fetch).
  {
    files: ['src/common/quicklook.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@common/attio/client', message: 'quicklook.ts is render-only; pass data in, not the client.' },
            {
              name: '@common/attio/encoders',
              message: 'quicklook.ts does not edit; encoders belong to drilldown/edit flow.',
            },
          ],
        },
      ],
      ...NO_FETCH_OUTSIDE_CLIENT,
    },
  },

  // Default no-fetch elsewhere (except client.ts which is explicitly allowed).
  {
    files: ['src/**/*.ts'],
    ignores: ['src/common/attio/client.ts'],
    rules: NO_FETCH_OUTSIDE_CLIENT,
  },

  // Tests: loosen rules for testing primitives.
  {
    files: ['test/**/*.ts'],
    plugins: { vitest: vitestPlugin },
    rules: {
      ...vitestPlugin.configs.recommended.rules,
      'no-restricted-imports': 'off',
      'no-restricted-globals': 'off',
    },
  },

  // Brownfield exception: the existing src/main/people.ts pre-dates the
  // boundary rules. It will be migrated in Epic 2 (Story 2.1). Until then,
  // disable the boundary rules for it so this story can land.
  {
    files: ['src/main/people.ts'],
    rules: {
      'no-restricted-imports': 'off',
      'no-restricted-globals': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },

  // Node scripts under scripts/ — bring in Node globals.
  {
    files: ['scripts/**/*.{mjs,js,cjs}', 'eslint.config.mjs', 'vitest.config.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-restricted-imports': 'off',
      'no-restricted-globals': 'off',
    },
  },

  // JSON linting — restrict to authored JSON only.
  ...jsonc.configs['flat/recommended-with-jsonc'].map((cfg) => ({
    ...cfg,
    files: ['src/strings/**/*.json', 'tsconfig.json', '.releaserc'],
  })),

  // Prettier last to win conflicts.
  prettierPlugin,
)
