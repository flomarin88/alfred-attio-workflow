#!/usr/bin/env node

/**
 * Bundles every `src/main/*.ts` keyword script into `esbuild/<name>.js`
 * (CommonJS, Node 22 target). The bundles are what Alfred executes via
 * `esbuild/assets/run-node.sh esbuild/<name>.js "$1"`.
 *
 * esbuild reads `tsconfig.json` directly to resolve `@common/*` path
 * aliases and inline every workspace import — the produced files have
 * no external `node_modules` dependency at run time, so the workflow
 * package is self-contained inside the user's `~/Library/.../Alfred…/`
 * directory.
 */
import { build } from 'esbuild'
import { mkdir, readdir } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..')
const MAIN_DIR = join(ROOT, 'src', 'main')
const OUT_DIR = join(ROOT, 'esbuild')
const TSCONFIG = join(ROOT, 'tsconfig.json')

const entries = (await readdir(MAIN_DIR)).filter((file) => file.endsWith('.ts')).map((file) => join(MAIN_DIR, file))

if (entries.length === 0) {
  console.error('No keyword scripts found under src/main/*.ts')
  process.exit(1)
}

await mkdir(OUT_DIR, { recursive: true })

const start = Date.now()
await Promise.all(
  entries.map((entryPoint) =>
    build({
      entryPoints: [entryPoint],
      bundle: true,
      platform: 'node',
      target: 'node22',
      format: 'cjs',
      outfile: join(OUT_DIR, basename(entryPoint).replace(/\.ts$/, '.js')),
      tsconfig: TSCONFIG,
      logLevel: 'warning',
      minify: false,
      sourcemap: 'inline',
    }),
  ),
)

const took = Date.now() - start
const names = entries.map((entry) => basename(entry, '.ts')).join(', ')
console.log(`bundled ${entries.length} keyword script(s) [${names}] in ${took}ms → ${OUT_DIR}`)
