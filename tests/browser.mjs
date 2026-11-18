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
      // slot IDs are set; nothing is filled in the test, so no ad box may show its label, rule or margin (the ins itself stays)
      visibleAds: [...document.querySelectorAll('.ad:not([hidden])')].filter((a) => !a.querySelector('ins.adsbygoogle[data-ad-status]') && (((a.querySelector('.ad-label') || {}).offsetHeight > 0) || parseFloat(getComputedStyle(a).marginTop) > 0 || parseFloat(getComputedStyle(a).marginBottom) > 0 || parseFloat(getComputedStyle(a).borderTopWidth) > 0)).length
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
    if (info.visibleAds) probs.push('ad label, rule or margin visible without a delivered ad');
    if (u.startsWith('/tools/') && u !== '/tools/' && u !== '/tools/pot-weight/' && !(info.results && info.results.length > 40)) probs.push('tool shows no result: ' + info.results);
    if (probs.length) { fails++; console.log(`✗ ${width}px ${u}\n   ${probs.join('\n   ')}`); }
    await page.close();
  }
  await ctx.close();
}
// ad boxes: Google never fills anything here – no status: ins visible, no label/margin; "unfilled": ins display:none;
// "filled"/"unfill-optimized": box with its label and margin
for (const width of [390, 1366]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* stub: no ad */' }));
  for (const u of ['/guides/balcony-tomatoes/', '/plants/basil/', '/tools/sun-hours/']) {
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    await page.goto(base + u, { waitUntil: 'load' });
    // AdSense help 10762946: the ins is never hidden or clipped before Google answers; only label, rule and margin wait.
    const r = await page.evaluate(async (fb) => {
      const tick = () => new Promise((ok) => setTimeout(ok, 0));   // MutationObserver reports asynchronously
      const ins = [...document.querySelectorAll('.ad:not([hidden]) ins.adsbygoogle')];
      const state = () => ins.map((i) => {
        const b = i.closest('.ad'), cb = getComputedStyle(b), ci = getComputedStyle(i), ri = i.getBoundingClientRect(), lab = b.querySelector('.ad-label');
        return { slot: b.dataset.slot, display: ci.display, vis: ci.visibility, w: ri.width, insH: ri.height, boxH: b.getBoundingClientRect().height,
          overflow: cb.overflowX + '/' + cb.overflowY, boxVis: cb.visibility, label: !!lab && lab.offsetHeight > 0,
          mt: parseFloat(cb.marginTop), mb: parseFloat(cb.marginBottom), bt: parseFloat(cb.borderTopWidth), cls: b.classList.contains(fb.box) };
      });
      const set = async (v) => { ins.forEach((i) => (v ? i.setAttribute('data-ad-status', v) : i.removeAttribute('data-ad-status'))); await tick(); };
      const out = { n: ins.length, none: state() };
      await set('unfilled'); out.unfilled = state();
      await set('filled'); out.filled = state();
      await set('unfill-optimized'); out.optimized = state();
      // browser without :has(): drop the :has() rules and force the fallback class on <html>
      for (const sh of document.styleSheets) { try { for (let k = sh.cssRules.length - 1; k >= 0; k--) if (sh.cssRules[k].cssText.includes(':has(')) sh.deleteRule(k); } catch (e) {} }
      document.documentElement.classList.add(fb.root);
      await set(null); out.fbNone = state();
      await set('unfilled'); out.fbUnfilled = state();
      await set('unfill-optimized'); out.fbOptimized = state();
      return out;
    }, { root: 'nohas', box: 'ad-live' });
    const kept = (l) => l.every((x) => x.display !== 'none' && x.vis === 'visible' && x.boxVis === 'visible' && x.w > 0 && x.overflow === 'visible/visible' && x.boxH >= x.insH - 0.5);
    const bare = (l) => l.every((x) => !x.label && !x.mt && !x.mb && !x.bt && !x.cls);
    const shown = (l) => l.every((x) => x.label && x.boxH > 0 && x.cls && (x.slot === 'side' || x.mt > 0));
    const gone = (l) => l.every((x) => x.display === 'none' && !x.label && x.boxH === 0);
    if (!r.n) errs.push('no ad box filled in');
    if (!kept(r.none) || !bare(r.none)) errs.push('without status the ins must stay visible and unclipped, label/rule/margin hidden: ' + JSON.stringify(r.none));
    if (!gone(r.unfilled)) errs.push('unfilled: ins must be display:none, no label: ' + JSON.stringify(r.unfilled));
    if (!shown(r.filled)) errs.push('filled: box with label, rule and margin expected: ' + JSON.stringify(r.filled));
    if (!shown(r.optimized)) errs.push('unfill-optimized: box with label, rule and margin expected: ' + JSON.stringify(r.optimized));
    if (!kept(r.fbNone) || !bare(r.fbNone) || !gone(r.fbUnfilled) || !shown(r.fbOptimized)) errs.push('fallback without :has() differs: ' + JSON.stringify([r.fbNone, r.fbUnfilled, r.fbOptimized]));
    if (errs.length) { fails++; console.log(`✗ ad boxes ${width}px ${u}\n   ${errs.join('\n   ')}`); }
    await page.close();
  }
  await ctx.close();
}
console.log('✓ ad boxes: ins never hidden; label and margin only with filled/unfill-optimized; unfilled → display:none');
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
// ---- tools clicked through by script: examples, shared links, hostile values, CSV, filters (added Nov 18, 2026) ----
{
  const fail = (m) => { fails++; console.log('✗ ' + m); };
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  const open = async (u) => {
    const page = await ctx.newPage(); page.errs = [];
    page.on('pageerror', (e) => page.errs.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) page.errs.push(m.text()); });
    page.on('dialog', (d) => d.accept());
    await page.goto(base + u, { waitUntil: 'load' });
    await page.waitForTimeout(350);
    return page;
  };
  const clean = async (page, what) => {
    const x = await page.evaluate(() => ({ x: window.__x, hash: location.hash, bad: document.querySelectorAll('.results img, .results script, .results iframe, .results [onerror], .results [onclick]').length, overflow: document.documentElement.scrollWidth - window.innerWidth }));
    if (page.errs.length) fail(what + ': ' + page.errs.join(' | '));
    if (x.x !== undefined || x.bad) fail(what + ': markup from a link was executed or inserted');
    if (x.overflow > 1) fail(what + ': horizontal overflow ' + x.overflow + 'px');
    return x;
  };
  const csvOf = async (page, sel) => {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click(sel)]);
    return fs.readFileSync(await dl.path(), 'utf8');
  };
  const EVIL = encodeURIComponent('<img src=x onerror="window.__x=1">');

  // Sun & Shade Simulator
  {
    let page = await open(`/tools/sun-hours/#city=${EVIL}&deg=abc&depth=-5&width=1e99&rt=${EVIL}&month=99&unit=zz&lat=${EVIL}&lon=999&od=${EVIL}&oh=1&sky=${EVIL}`);
    const x = await clean(page, 'sun: hostile link');
    if (x.hash) fail('sun: values from the link stay in the address bar');
    if (!/\d\.\d h/.test(await page.textContent('#sun-results'))) fail('sun: no result after a hostile link');
    const chips = await page.$$('#sun-examples .chip');
    if (chips.length !== 3) fail('sun: example buttons missing');
    const seen = new Set();
    for (const c of chips) { await c.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(150); seen.add((await page.textContent('#sun-results .result-grid')).trim()); }
    if (seen.size !== 3) fail('sun: examples do not change the result');
    if (!/Why these hours/.test(await page.textContent('#sun-results'))) fail('sun: no explanation of the result');
    await page.click('#sun-results [data-act="link"]'); await page.waitForTimeout(200);
    const link = await page.evaluate(() => navigator.clipboard.readText());
    const before = await page.evaluate(() => [...document.querySelectorAll('#sun-form input, #sun-form select')].map((e) => e.type === 'checkbox' ? e.checked : e.value).join('|'));
    if (!/\/tools\/sun-hours\/#.*city=London/.test(link)) fail('sun: copied link unexpected: ' + link);
    await page.close();
    page = await open(link.replace(/^https?:\/\/[^/]+/, ''));
    const after = await page.evaluate(() => [...document.querySelectorAll('#sun-form input, #sun-form select')].map((e) => e.type === 'checkbox' ? e.checked : e.value).join('|'));
    if (before !== after) fail('sun: shared link does not restore the form\n   ' + before + '\n   ' + after);
    for (const [k, v] of [['depth', '0'], ['depth', '-3'], ['ceiling', '1'], ['facingDeg', ''], ['rail', 'x']]) { await page.fill(`#sun-form [name="${k}"]`, v).catch(() => page.evaluate(([kk, vv]) => { const e = document.querySelector(`#sun-form [name="${kk}"]`); e.value = vv; e.dispatchEvent(new Event('change', { bubbles: true })); }, [k, v])); await page.waitForTimeout(320); }
    if (!/Please check/.test(await page.textContent('#sun-results'))) fail('sun: nonsense sizes are not rejected');
    await clean(page, 'sun: nonsense input'); await page.close();
  }
  // Pot Weight Planner
  {
    const page = await open(`/tools/pot-weight/#unit=in&p=${EVIL}~round~40~30~35~~~terracotta~potting~1~~0&p=bad&p=${encodeURIComponent('=1+1')}~round~30~~20~~~plastic~potting~2~~&p=x~round~30~~20~~~${EVIL}~potting~1~~&p=y~cube~1~1~1~~~plastic~potting~1~~&bw=10&bd=5&ref=wa60`);
    await clean(page, 'pots: hostile link');
    const t = await page.textContent('#pot-results');
    if (!t.includes('<img src=x onerror="window.__x=1">')) fail('pots: name from the link is not shown as plain text');
    if ((await page.$$('#pot-results tbody tr')).length !== 2) fail('pots: invalid pots from a link were accepted');
    if ((await page.getAttribute('#pot-results .loadmsg', 'data-state')) !== 'share' || !/as a share of the 60 psf figure/.test(t) || /Below half|less than half/i.test(t) || !/permanent load/.test(t)) fail('pots: floor load comparison missing');
    const csv = await csvOf(page, '#pot-csv');
    if (!csv.includes(`"'=1+1"`) || /(^|,|\n)"?[=+@-]/.test(csv.replace(/^﻿/, '').replace(/"'[=+@-]/g, '"x'))) fail('pots: CSV cell starting with = + - @ not defused');
    await page.selectOption('#area-ref', 'custom'); await page.fill('#area-refv', '2'); await page.waitForTimeout(350);
    if ((await page.getAttribute('#pot-results .loadmsg', 'data-state')) !== 'over') fail('pots: load above the figure is not marked');
    for (const v of ['-5', '0', '99999']) { await page.fill('#pot-top', v); await page.click('#pot-form button[type=submit]'); }
    if ((await page.$$('#pot-results tbody tr')).length !== 2 || !(await page.textContent('#pot-msg')).trim()) fail('pots: nonsense sizes were added');
    await page.click('#pot-examples .chip:nth-of-type(2)'); await page.waitForTimeout(100);
    if ((await page.$$('#pot-results tbody tr')).length !== 2 || !/Tomato tub/.test(await page.textContent('#pot-results'))) fail('pots: example list not loaded');
    await page.click('#pot-results details.steps summary');
    if (!/kg\/L = /.test(await page.textContent('#pot-results details.steps'))) fail('pots: calculation steps missing');
    await page.click('#pot-results [data-act="link"]'); await page.waitForTimeout(200);
    const link = await page.evaluate(() => navigator.clipboard.readText());
    const total = (await page.textContent('#pot-results .stat .v')).trim();
    await clean(page, 'pots: after clicking through'); await page.close();
    const p2 = await open(link.replace(/^https?:\/\/[^/]+/, ''));
    if ((await p2.textContent('#pot-results .stat .v')).trim() !== total) fail('pots: shared link gives a different total');
    await p2.close();
  }
  // Wind check and watering planner
  {
    let page = await open(`/tools/wind-check/#floor=${EVIL}&position=${EVIL}&railing=glass`);
    await clean(page, 'wind: hostile link');
    const seen = new Set();
    for (const c of await page.$$('#wind-examples .chip')) { await c.click(); await page.waitForTimeout(100); seen.add((await page.textContent('#wind-results .stat .v')).trim()); }
    if (seen.size !== 3) fail('wind: examples do not give three classes: ' + [...seen]);
    for (const v of ['0', '-3', '1000000', '']) { await page.fill('#w-floor', v); await page.waitForTimeout(320); if (!/Please enter your floor/.test(await page.textContent('#wind-results'))) fail('wind: floor "' + v + '" accepted'); }
    await clean(page, 'wind: nonsense input'); await page.close();
    page = await open(`/tools/watering-planner/#sun=99&wind=${EVIL}&dia=${EVIL}&material=__proto__&weather=constructor&days=5`);
    await clean(page, 'water: hostile link');
    if (!/Reservoir for 5 days/.test(await page.textContent('#water-results'))) fail('water: valid value from a link ignored');
    if ((await page.inputValue('#wa-sun')) === '99') fail('water: out-of-range value from a link accepted');
    for (const c of await page.$$('#water-examples .chip')) { await c.click(); await page.waitForTimeout(100); if (!/Estimated water use per day/.test(await page.textContent('#water-results'))) fail('water: example without result'); }
    await page.click('#water-results details.steps summary');
    if (!/mm\/day/.test(await page.textContent('#water-results details.steps'))) fail('water: calculation steps missing');
    for (const [id, v] of [['#wa-sun', '40'], ['#wa-sun', '-1']]) { await page.fill(id, v); await page.waitForTimeout(320); if (!/between 0 and 16/.test(await page.textContent('#water-results'))) fail('water: sun hours ' + v + ' accepted'); }
    await page.fill('#wa-sun', '6'); await page.fill('#wa-dia', '0'); await page.waitForTimeout(320);
    if (!/diameter and height/.test(await page.textContent('#water-results'))) fail('water: zero diameter accepted');
    await clean(page, 'water: nonsense input'); await page.close();
  }
  // Frost Date & Sowing Planner: every station, own dates, CSV, link
  {
    const page = await open(`/tools/frost-dates/#place=${EVIL}&risk=${EVIL}&lf=13/45&ff=${EVIL}&mix=${EVIL}`);
    await clean(page, 'frost: hostile link');
    const ids = await page.$$eval('#fr-place option', (o) => o.map((x) => x.value));
    if (ids.length !== 54) fail('frost: expected 53 stations and "other place", got ' + ids.length);
    let none = 0;
    for (const id of ids.filter((x) => x !== 'custom')) {
      for (const risk of ['median', 'cautious']) {
        await page.selectOption('#fr-place', id); await page.selectOption('#fr-risk', risk);
        const t = await page.textContent('#frost-results');
        if (/this planner gives none/.test(t)) { if (/Too short|Fits/.test(t)) fail('frost: schedule shown for ' + id); none += risk === 'median' ? 1 : 0; continue; }
        if (!/Tomato/.test(t) || /NaN|undefined|null/.test(t)) fail('frost: broken result for ' + id + ' ' + risk);
      }
    }
    if (none !== 9) fail('frost: expected 9 stations without a schedule (5 without freeze dates, 4 with rare freezes), got ' + none);
    await page.selectOption('#fr-place', 'USW00026451'); await page.selectOption('#fr-risk', 'median');
    const anc = await page.$$eval('#frost-results tbody tr', (r) => r.filter((x) => /^(Tomato|Squash, winter)/.test(x.textContent)).map((x) => x.textContent));
    if (anc.length !== 2 || anc.some((x) => !/55 °F/.test(x) || /Fits:/.test(x))) fail('frost: very tender rows for Anchorage lack the temperature condition: ' + anc);
    if (/Too short: only \d\d? days/.test(await page.textContent('#frost-results'))) fail('frost: nonsense season length');
    await page.selectOption('#fr-place', 'USW00094728'); await page.selectOption('#fr-risk', 'median');
    if (!/Mar 30/.test(await page.textContent('#frost-results .stat .v'))) fail('frost: New York median date is not Mar 30');
    const csv = await csvOf(page, '#frost-csv');
    if (!/"Tomato","Very tender","Feb 23 – Mar 9","Apr 13; not before daytime temperatures stay above 55 °F \(13 °C\)"/.test(csv)) fail('frost: CSV row for tomato unexpected');
    await page.selectOption('#fr-place', 'custom');
    for (const [m, d] of [['2', '31'], ['4', '0'], ['4', '-2'], ['4', '']]) { await page.selectOption('#fr-lfm', m); await page.fill('#fr-lfd', d); await page.waitForTimeout(320); if (!/real calendar dates/.test(await page.textContent('#frost-results'))) fail(`frost: date ${m}/${d} accepted`); }
    await page.selectOption('#fr-lfm', '9'); await page.fill('#fr-lfd', '20'); await page.selectOption('#fr-ffm', '5'); await page.fill('#fr-ffd', '10'); await page.waitForTimeout(320);
    if (!/232/.test(await page.textContent('#frost-results .result-grid'))) fail('frost: Southern Hemisphere dates not counted across New Year');
    await page.fill('#fr-ffd', ''); await page.waitForTimeout(320);
    if (!/Tomato/.test(await page.textContent('#frost-results'))) fail('frost: plan without a fall date missing');
    await page.click('#frost-results [data-act="text"]'); await page.waitForTimeout(200);
    if (!/Sowing plan from frost dates/.test(await page.evaluate(() => navigator.clipboard.readText()))) fail('frost: text copy missing');
    await clean(page, 'frost: clicked through'); await page.close();
  }
  // crop and plant reference
  {
    const page = await open(`/plants/reference/#hours=4&zone=6&q=${EVIL}&season=${EVIL}`);
    await clean(page, 'reference: hostile link');
    if (!/No row matches/.test(await page.textContent('#ref-empty')) || await page.isHidden('#ref-empty') ) fail('reference: empty state not shown for a search without hits');
    await page.fill('#ref-q', ''); await page.waitForTimeout(250);
    const vis = await page.$$eval('#ref-crops tbody tr', (r) => r.filter((x) => !x.hidden).map((x) => x.dataset.season));
    if (!vis.length || vis.some((s) => s !== 'cool')) fail('reference: 4 h of sun should keep only cool-season rows, got ' + vis);
    const w = await page.$$eval('#ref-perennials tbody tr', (r) => r.map((x) => x.dataset.state));
    if (w.join() !== 'protect,protect,in,in,in,in,in') fail('reference: winter check for zone 6 unexpected: ' + w);
    await page.click('#ref-form button[type=reset]'); await page.waitForTimeout(250);
    if ((await page.$$eval('#ref-crops tbody tr', (r) => r.filter((x) => !x.hidden).length)) !== 33) fail('reference: reset does not show all 33 rows');
    await page.selectOption('#ref-size', 'L');
    const csv = await csvOf(page, '#ref-csv');
    if (!/"Tomato"/.test(csv) || /"Radishes"/.test(csv)) fail('reference: CSV does not follow the filter');
    await clean(page, 'reference: clicked through'); await page.close();
  }
  // home: quick sun check and its link into the simulator
  {
    const hp = await open('/#city=x&deg=90');
    if (await hp.evaluate(() => location.hash)) fail('home: #values stay in the address bar');
    await hp.close();
    const page = await open('/');
    const a = (await page.textContent('#quick-results .result-grid')).trim();
    await page.selectOption('#q-facing', '180'); await page.selectOption('#q-city', { label: 'Phoenix, AZ' });
    const b = (await page.textContent('#quick-results .result-grid')).trim();
    if (!/\d\.\d h/.test(a) || a === b) fail('home: quick sun check does not react');
    const href = await page.getAttribute('#quick-results a.btn.sun', 'href');
    await clean(page, 'home'); await page.close();
    const p2 = await open(href);
    if ((await p2.inputValue('#sun-facing')) !== '180' || !/Phoenix/.test(await p2.$eval('#sun-city', (e) => e.selectedOptions[0].textContent))) fail('home: link into the simulator loses the values');
    await p2.close();
  }
  // every preset link on the site opens a tool with a result
  {
    const links = new Set();
    for (const u of urls) for (const m of fs.readFileSync(path.join(DOCS, u, 'index.html'), 'utf8').matchAll(/href="(\/[^"#]*#[^"]*=[^"]*)"/g)) links.add(m[1].replace(/&amp;/g, '&'));
    let n = 0;
    for (const l of links) {
      const page = await open(l); n++;
      const r = await page.evaluate(() => ({ res: (document.querySelector('.results') || {}).innerText || '', rows: document.querySelectorAll('#ref-crops tbody tr:not([hidden])').length, alert: !!document.querySelector('.results [role="alert"]') }));
      if (r.alert || (l.startsWith('/plants/reference/') ? r.rows === 0 : r.res.length < 40) || (l.startsWith('/tools/pot-weight/') && /No pots yet/.test(r.res))) fail('preset link without result: ' + l);
      await clean(page, 'preset link ' + l); await page.close();
    }
    console.log(`✓ ${n} preset links open a tool with a result`);
  }
  await ctx.close();
  console.log('✓ tools clicked through: examples, shared links, hostile values, CSV, filters');
}
await browser.close(); srv.close();
console.log(fails ? `${fails} problem(s)` : `all ${urls.length} pages OK at 390 and 1366 px`);
process.exit(fails ? 1 : 0);
