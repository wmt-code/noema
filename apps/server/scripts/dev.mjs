import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'

if (existsSync('../../.env')) process.loadEnvFile('../../.env')

const require = createRequire(import.meta.url)
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc')], {
  stdio: 'inherit'
})
await import('../dist/main.js')
