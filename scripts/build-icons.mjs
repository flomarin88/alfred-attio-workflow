#!/usr/bin/env node
// @ts-check

/**
 * Build Lucide PNG icons for the Alfred row icon registry.
 *
 * For each named icon, emits 4 variants:
 *   - <name>.png         (light theme,  64×64)
 *   - <name>@2x.png      (light theme,  128×128)
 *   - <name>@dark.png    (dark theme,   64×64)
 *   - <name>@2x@dark.png (dark theme,   128×128)
 *
 * Alfred row icons display at ~32 logical px (so 64px @2x retina). Rendering
 * larger than the displayed size keeps the icon crisp; smaller sizes pixelate.
 *
 * Lucide is fetched from Iconify's CDN (mirrors the official Lucide set, ISC
 * licensed). @resvg/resvg-js rasterizes the SVG → PNG with no native deps.
 *
 * Story 1.1: this script populates `assets/icons/` so that Alfred can pick
 * the right asset at runtime based on system appearance.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.resolve(__dirname, '..', 'assets', 'icons')

/** Mapping from workflow icon names → Lucide icon names. See DESIGN.md UX-DR2. */
const ICONS = {
  person: 'user',
  company: 'building-2',
  deal: 'handshake',
  task: 'list-checks',
  info: 'info',
  sync: 'loader-circle',
  error: 'circle-x',
  warning: 'triangle-alert',
  success: 'circle-check',
}

const INK_LIGHT = '#1c1d1f'
const INK_DARK = '#f5f5f7'

/** Fetch a Lucide SVG via Iconify with the chosen ink color baked into stroke. */
async function fetchSvg(lucideName, color) {
  const url = `https://api.iconify.design/lucide/${lucideName}.svg?color=${encodeURIComponent(color)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Iconify fetch failed for ${lucideName} (${res.status})`)
  const text = await res.text()
  if (!text.includes('<svg')) throw new Error(`Iconify returned non-SVG for ${lucideName}: ${text.slice(0, 120)}`)
  return text
}

function rasterize(svg, sizePx) {
  // Lucide icons are 24×24 viewBox at stroke-width 2. We render up to
  // Alfred's display register (~64-128px). Rendering at native resolution
  // and letting Alfred downscale keeps strokes crisp on Retina.
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: sizePx },
    background: 'rgba(0,0,0,0)',
  })
  return resvg.render().asPng()
}

async function buildOne(name, lucideName) {
  const svgLight = await fetchSvg(lucideName, INK_LIGHT)
  const svgDark = await fetchSvg(lucideName, INK_DARK)

  const targets = [
    [`${name}.png`, svgLight, 64],
    [`${name}@2x.png`, svgLight, 128],
    [`${name}@dark.png`, svgDark, 64],
    [`${name}@2x@dark.png`, svgDark, 128],
  ]

  for (const [filename, svg, size] of targets) {
    const png = rasterize(svg, size)
    await writeFile(path.join(OUTPUT_DIR, filename), png)
  }
  console.log(`✓ ${name} (4 variants)`)
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })
  const entries = Object.entries(ICONS)
  console.log(`Building ${entries.length} icons × 4 variants = ${entries.length * 4} PNGs`)
  for (const [name, lucideName] of entries) {
    await buildOne(name, lucideName)
  }
  console.log(`Done. ${entries.length * 4} files in ${path.relative(process.cwd(), OUTPUT_DIR)}/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
