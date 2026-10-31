// Browser check: every sitemap page at 390 and 1366 px – console errors, horizontal overflow, tool results.
// Usage: node tests/browser.mjs  (serves docs/ on a local port)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const DOCS = path.resolve('docs');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(DOCS, p);
  if (!f.startsWith(DOCS) || !fs.existsSync(f)) { s.writeHead(404); s.end(fs.readFileSync(path.join(DOCS, '404.html'))); return; }
  s.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f));
}).listen(0);
const base = `http://127.0.0.1:${srv.address().port}`;
const urls = [...fs.readFileSync('docs/sitemap.xml', 'utf8').matchAll(/<loc>https:\/\/balconybloomguide\.com([^<]*)<\/loc>/g)].map((m) => m[1]);
const browser = await chromium.launch();
let fails = 0;
for (const width of [390, 1366]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());   // no external requests in tests
  for (const u of urls) {
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
    await page.goto(base + u, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    const info = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      results: (document.querySelector('.results') || {}).innerText || null,
      visibleAds: [...document.querySelectorAll('.ad')].filter((a) => !a.hidden).length
    }));
    const probs = [...errs];
    if (info.overflow > 1) probs.push('horizontal overflow ' + info.overflow + 'px');
    if (info.visibleAds) probs.push('ad box visible without slot id');
    if (u.startsWith('/tools/') && u !== '/tools/' && u !== '/tools/pot-weight/' && !(info.results && info.results.length > 40)) probs.push('tool shows no result: ' + info.results);
    if (probs.length) { fails++; console.log(`✗ ${width}px ${u}\n   ${probs.join('\n   ')}`); }
    await page.close();
  }
  await ctx.close();
}
// pot planner: add a pot and check the total
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  const page = await ctx.newPage();
  await page.goto(base + '/tools/pot-weight/');
  await page.click('#pot-form button[type=submit]');
  const t = await page.textContent('#pot-results');
  if (!/Total wet weight\s*\d+ lb/.test(t)) { fails++; console.log('✗ pot planner did not add the example pot: ' + t.slice(0, 200)); }
  else console.log('✓ pot planner example: ' + t.match(/Total wet weight\s*(\d+ lb)/)[1]);
  await page.goto(base + '/tools/sun-hours/');
  await page.click('#sun-results #sun-save');
  await page.goto(base + '/guides/east-facing-balcony-plants/');
  const prof = await page.textContent('#profile');
  if (!/Your saved balcony/.test(prof || '')) { fails++; console.log('✗ saved profile not shown on guide page'); } else console.log('✓ profile box: ' + prof.trim().slice(0, 120));
  await ctx.close();
}
await browser.close(); srv.close();
console.log(fails ? `${fails} problem(s)` : `all ${urls.length} pages OK at 390 and 1366 px`);
process.exit(fails ? 1 : 0);
