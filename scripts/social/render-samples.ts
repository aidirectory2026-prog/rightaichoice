/**
 * Phase 13 Social — render sample graphics to PNG for eyeball verification.
 *
 * Offline: reads Geist from disk (no server) and writes PNGs to /tmp/social-graphics.
 * Run: npm run social:render-samples
 */

import fs from 'node:fs'
import path from 'node:path'
import { renderGraphic } from '../../lib/social/graphics/render'
import { SAMPLE_DATA, type GraphicSizeName, type GraphicTemplate } from '../../lib/social/graphics/templates'

const OUT = '/tmp/social-graphics'

function loadFont(): ArrayBuffer | null {
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Geist-Regular.ttf'))
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  } catch {
    return null
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const fontData = loadFont()
  console.log(fontData ? '✓ Geist font loaded from disk' : '⚠ font not found — using Satori default')

  // Each template at one representative size, plus stat_card across all 3 sizes.
  const jobs: { template: GraphicTemplate; size: GraphicSizeName }[] = [
    { template: 'stat_card', size: 'landscape' },
    { template: 'tool_spotlight', size: 'square' },
    { template: 'news_roundup', size: 'square' },
    { template: 'comparison', size: 'landscape' },
    { template: 'quote', size: 'portrait' },
    { template: 'stat_card', size: 'square' },
    { template: 'stat_card', size: 'portrait' },
  ]

  for (const { template, size } of jobs) {
    const img = renderGraphic({ template, data: SAMPLE_DATA[template], size, fontData })
    const bytes = Buffer.from(await img.arrayBuffer())
    const file = path.join(OUT, `${template}.${size}.png`)
    fs.writeFileSync(file, bytes)
    console.log(`  ✓ ${file} (${(bytes.length / 1024).toFixed(0)} KB)`)
  }
  console.log(`\nWrote ${jobs.length} PNGs to ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
