import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'docs', 'screenshots')
await mkdir(outDir, { recursive: true })

const url = process.argv[2] || 'http://localhost:5173'
const shots = {
  empty: path.join(outDir, 'card-empty.png'),
  entry: path.join(outDir, 'card-entry.png'),
  settings: path.join(outDir, 'card-settings.png'),
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({
  viewport: { width: 400, height: 620 },
  deviceScaleFactor: 2,
})
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
await page.screenshot({ path: shots.empty, transparent: true })

await page.locator('textarea').fill('完成了随心记初版骨架')
await page.locator('.add-btn').click()
await page.waitForTimeout(350)
await page.screenshot({ path: shots.entry, transparent: true })

await page.locator('button[aria-label="设置"]').click()
await page.waitForTimeout(280)
await page.screenshot({ path: shots.settings, transparent: true })

console.log('screenshots →', outDir)
await browser.close()
