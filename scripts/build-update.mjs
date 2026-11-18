import { ZipArchive } from 'archiver'
import { execSync } from 'node:child_process'
import { createWriteStream, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const updatesDir = path.join(dist, 'updates')

let version
try {
  version = execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim()
} catch {
  version = `dev-${Date.now()}`
}

mkdirSync(updatesDir, { recursive: true })
const zipName = `${version}.zip`
const zipPath = path.join(updatesDir, zipName)
const output = createWriteStream(zipPath)
const archive = new ZipArchive({ zlib: { level: 9 } })

archive.on('error', (err) => { throw err })
archive.pipe(output)

for (const name of readdirSync(dist)) {
  if (name === 'updates' || name === 'app-update.json') continue
  const full = path.join(dist, name)
  if (statSync(full).isDirectory()) archive.directory(full, name)
  else archive.file(full, { name })
}

await archive.finalize()

const manifest = {
  version,
  url: `updates/${zipName}`,
  createdAt: new Date().toISOString(),
}
writeFileSync(path.join(dist, 'app-update.json'), JSON.stringify(manifest, null, 2))

console.log(`OTA bundle ${version} -> ${path.relative(root, zipPath)}`)
