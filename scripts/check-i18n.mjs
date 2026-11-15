// Finds t('...') keys that have no Ukrainian text, and JSX text that is not wrapped in t().
// Run: npm run check:i18n
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../src/', import.meta.url))
const i18n = readFileSync(join(root, 'lib/i18n.js'), 'utf8')
const ukBlock = i18n.slice(i18n.indexOf('const UK = {'))
const files = []
const walk = (dir) => readdirSync(dir).forEach((f) => {
  const p = join(dir, f)
  if (statSync(p).isDirectory()) walk(p)
  else if (/\.(jsx?|mjs)$/.test(f) && !p.endsWith('i18n.js')) files.push(p)
})
walk(root)

const unquote = (q, s) => (q === "'" ? s.replace(/\\'/g, "'") : s)
const hasKey = (k) => ukBlock.includes(`'${k.replace(/'/g, "\\'")}':`) || ukBlock.includes(`"${k}":`) ||
  new RegExp(`\\n\\s+${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:`).test(ukBlock)
let problems = 0
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  for (const m of src.matchAll(/\bt\((['"`])((?:\\.|(?!\1).)*)\1/g)) {
    const key = unquote(m[1], m[2])
    if (!hasKey(key)) { console.log(`missing uk: ${f.replace(root, '')}: ${key}`); problems++ }
  }
  if (f.endsWith('.jsx')) {
    for (const m of src.matchAll(/>\s*([A-Za-z][^<>{}]*[A-Za-z.?!…])\s*</g)) {
      if (/\breturn\b|\bif \(|\?$/.test(m[1])) continue
      console.log(`not wrapped: ${f.replace(root, '')}: ${m[1].trim()}`); problems++
    }
    for (const m of src.matchAll(/\b(placeholder|aria-label|title|alt|label|text|note|hint|submitText)=(["'])([A-Za-z][^"']*)\2/g)) {
      if (m[3].includes('@')) continue
      console.log(`not wrapped attr: ${f.replace(root, '')}: ${m[1]}="${m[3]}"`); problems++
    }
  }
}
console.log(problems ? `${problems} problems` : 'i18n ok')
process.exit(problems ? 1 : 0)
