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
    page.on('response', (res) => { if (res.status() === 404 && res.url().startsWith(base)) errs.push('local 404: ' + res.url().slice(base.length)); });
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
    await page.goto(base + u, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    const info = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      results: (document.querySelector('.results') || {}).innerText || null,
      // slot IDs are set; nothing is filled in the test, so no ad box (label included) may take any room
      visibleAds: [...document.querySelectorAll('.ad')].filter((a) => a.offsetHeight > 0 && !a.querySelector('ins.adsbygoogle[data-ad-status="filled"]')).length
    }));
    // all ad boxes forced visible (as if every slot ID were filled): at least 150 px to any button, input, select, textarea or summary
    const near = await page.evaluate(() => {
      const ads = [...document.querySelectorAll('.ad')];
      const was = new Map(ads.map((a) => [a, a.hidden]));
      const added = [];
      for (const a of ads) {
        a.hidden = false; a.style.minHeight = '250px';
        let ins = a.querySelector('ins.adsbygoogle');
        if (!ins) { ins = document.createElement('ins'); ins.className = 'adsbygoogle'; a.appendChild(ins); added.push(ins); }
        ins.setAttribute('data-ad-status', 'filled');   // as if Google had delivered an ad
      }
      const ctl = [...document.querySelectorAll('button, input, select, textarea, summary')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; });
      const out = [];
      for (const a of ads) {
        const r = a.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        for (const c of ctl) {
          const q = c.getBoundingClientRect();
          const d = Math.hypot(Math.max(0, q.left - r.right, r.left - q.right), Math.max(0, q.top - r.bottom, r.top - q.bottom));
          if (d < 150) out.push(`${a.dataset.slot} ad ${Math.round(d)} px from ${c.tagName.toLowerCase()}${c.id ? '#' + c.id : ''} "${(c.textContent || c.name || '').trim().slice(0, 30)}"`);
        }
      }
      for (const a of ads) { a.hidden = was.get(a); a.style.minHeight = ''; a.querySelector('ins.adsbygoogle')?.removeAttribute('data-ad-status'); }
      added.forEach((i) => i.remove());
      return out;
    });
    const probs = [...errs, ...near];
    if (info.overflow > 1) probs.push('horizontal overflow ' + info.overflow + 'px');
    if (info.visibleAds) probs.push('empty ad box visible (no ad delivered)');
    if (u.startsWith('/tools/') && u !== '/tools/' && u !== '/tools/pot-weight/' && !(info.results && info.results.length > 40)) probs.push('tool shows no result: ' + info.results);
    if (probs.length) { fails++; console.log(`✗ ${width}px ${u}\n   ${probs.join('\n   ')}`); }
    await page.close();
  }
  await ctx.close();
}
// ad boxes: Google never fills anything here – "unfilled" stays collapsed, "filled" shows the box with its label
for (const width of [390, 1366]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* stub: no ad */' }));
  for (const u of ['/guides/balcony-tomatoes/', '/plants/basil/', '/tools/sun-hours/']) {
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    await page.goto(base + u, { waitUntil: 'load' });
    const r = await page.evaluate(async () => {
      const tick = () => new Promise((ok) => setTimeout(ok, 0));   // MutationObserver reports asynchronously
      const shown = () => [...document.querySelectorAll('.ad')].filter((a) => a.offsetHeight > 0 || parseFloat(getComputedStyle(a).marginTop) > 0).length;
      const ins = [...document.querySelectorAll('.ad:not([hidden]) ins.adsbygoogle')];
      const none = shown();
      ins.forEach((i) => i.setAttribute('data-ad-status', 'unfilled')); await tick();
      const unfilled = shown();
      ins.forEach((i) => i.setAttribute('data-ad-status', 'filled')); await tick();
      const boxes = ins.map((i) => i.parentElement);
      return { ins: ins.length, none, unfilled, filled: shown(),
        label: boxes.every((b) => b.querySelector('.ad-label').offsetHeight > 0),
        cls: boxes.every((b) => b.classList.contains('ad-live')) };
    });
    if (!r.ins) errs.push('no ad box filled in');
    if (r.none || r.unfilled) errs.push(`empty ad box visible (${r.none} without status, ${r.unfilled} unfilled)`);
    if (r.filled !== r.ins || !r.label || !r.cls) errs.push(`filled ad box not shown (${r.filled}/${r.ins}, label ${r.label}, class ${r.cls})`);
    if (errs.length) { fails++; console.log(`✗ ad boxes ${width}px ${u}\n   ${errs.join('\n   ')}`); }
    await page.close();
  }
  await ctx.close();
}
console.log('✓ ad boxes: nothing visible without a delivered ad; filled boxes show with label');
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
