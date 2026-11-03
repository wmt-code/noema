import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc')], { stdio: 'inherit' });
await import('../dist/main.js');
