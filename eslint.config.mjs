import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores([
    '**/dist/**',
    '**/out/**',
    '**/release/**',
    '**/coverage/**',
    'apps/server/src/generated/**',
    '.pnpm-store/**',
    '.worktrees/**',
    '.claude/**'
  ]),
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    extends: [js.configs.recommended]
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended]
  },
  {
    files: [
      '**/*.{js,mjs,cjs}',
      'prisma.config.ts',
      'apps/server/**/*.ts',
      'apps/desktop/*.ts',
      'apps/desktop/src/main/**/*.ts'
    ],
    languageOptions: { globals: globals.node }
  },
  {
    files: ['apps/desktop/src/renderer/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser }
  },
  {
    files: ['apps/desktop/scripts/*.mjs'],
    languageOptions: { globals: globals.browser }
  },
  prettier
])
