// Renders preview images of both models with headless Chromium (docs/img/*.png).
// three.js is served from node_modules, so no network is needed.
// Usage: node scripts/render.mjs   (requires the `playwright` package)
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = join(root, url === '/' ? 'index.html' : url);
  try {
    let body = await readFile(file);
    if (url === '/' || url === '/index.html') body = `<!doctype html><meta charset="utf-8">${body}`;
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
page.on('pageerror', (e) => console.error('pageerror:', e.message));
await page.route('https://cdn.jsdelivr.net/npm/three@0.170.0/**', async (route) => {
  const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.170.0/', '');
  route.fulfill({ body: await readFile(join(root, 'node_modules/three', rel)), contentType: 'text/javascript' });
});
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.goto(`http://localhost:${port}/`);
await page.waitForFunction(() => window.__viewer);
await mkdir(join(root, 'docs/img'), { recursive: true });

const shots = process.argv[2] === 'quick'
  ? [['kart', 'iso'], ['chair', 'iso']]
  : [['kart', 'iso'], ['kart', 'side'], ['kart', 'top'], ['kart', 'front'], ['chair', 'iso'], ['chair', 'side'], ['chair', 'front'], ['chair', 'rear']];
for (const [model, view] of shots) {
  await page.evaluate(([m, v]) => { window.__viewer.select(m); window.__viewer.fit(v); }, [model, view]);
  await page.waitForTimeout(700);
  await page.locator('#stage canvas').screenshot({ path: join(root, `docs/img/${model}-${view}.png`) });
  console.log(`docs/img/${model}-${view}.png`);
}
// x-ray / no-rider variants
await page.evaluate(() => { window.__viewer.select('kart'); document.getElementById('xray').click(); window.__viewer.fit('iso'); });
await page.waitForTimeout(700);
await page.locator('#stage canvas').screenshot({ path: join(root, 'docs/img/kart-xray.png') });
console.log('docs/img/kart-xray.png');
await page.evaluate(() => {
  window.__viewer.select('chair');
  for (const id of ['rider', 'guards']) window.__viewer.models.chair.parts.find((p) => p.name === id).visible = false;
  window.__viewer.fit('iso');
});
await page.waitForTimeout(700);
await page.locator('#stage canvas').screenshot({ path: join(root, 'docs/img/chair-bare.png') });
console.log('docs/img/chair-bare.png');
await browser.close();
server.close();
