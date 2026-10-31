// Static checks on the built site: meta data, headings, internal links, ads only where allowed, enough own text.
import fs from 'node:fs';
import path from 'node:path';
const DOCS = path.resolve('docs');
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'assets') walk(p); } else if (e.name.endsWith('.html')) files.push(p); } })(DOCS);
const sitemap = [...fs.readFileSync(path.join(DOCS, 'sitemap.xml'), 'utf8').matchAll(/<loc>https:\/\/balconybloomguide\.com([^<]*)<\/loc>/g)].map((m) => m[1]);
const exists = (u) => { const p = u.split('#')[0].split('?')[0]; const f = path.join(DOCS, p.endsWith('/') ? p + 'index.html' : p); return fs.existsSync(f); };
let problems = [];
const titles = new Map(), descs = new Map();
for (const u of sitemap) {
  const f = path.join(DOCS, u, 'index.html');
  const h = fs.readFileSync(f, 'utf8');
  const t = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const d = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const p = (m) => problems.push(`${u}: ${m}`);
  if (t.length < 25 || t.length > 70) p(`title length ${t.length}`);
  if (d.length < 110 || d.length > 165) p(`description length ${d.length}`);
  if (titles.has(t)) p('duplicate title'); titles.set(t, u);
  if (descs.has(d)) p('duplicate description'); descs.set(d, u);
  if ((h.match(/<h1[ >]/g) || []).length !== 1) p('needs exactly one h1');
  if (!h.includes(`<link rel="canonical" href="https://balconybloomguide.com${u}">`)) p('canonical');
  if (!h.includes('name="google-adsense-account"')) p('adsense meta tag missing');
  const ads = h.includes('data-ads="yes"');
  const legal = /^\/(about|imprint|privacy|contact)\/$/.test(u);
  if (legal && ads) p('ads on a legal page');
  if ((u.startsWith('/guides/') || u.startsWith('/tools/')) && u.length > 8 && !/^\/(guides|tools)\/$/.test(u) && !ads) p('content page without ads flag');
  for (const m of h.matchAll(/href="(\/[^"]*)"/g)) if (!exists(m[1])) p('broken link ' + m[1]);
  const main = h.slice(h.indexOf('<main'), h.indexOf('</main>')).replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<(form|section class="tool")[\s\S]*?<\/(form|section)>/g, ' ');
  const words = main.replace(/<[^>]+>/g, ' ').split(/\s+/).filter((w) => /[a-z]/i.test(w)).length;
  if (/^\/(guides|tools)\/.+/.test(u) && words < 900) p(`only ${words} words`);
  if (/https?:\/\/(?!balconybloomguide\.com)[^"]*"/.test(main) && /href="https?:\/\/(?!www\.rhs\.org\.uk|gml\.noaa\.gov|www\.almanac\.com|planthardiness\.ars\.usda\.gov|extension\.umn\.edu|extension\.psu\.edu|www\.aspca\.org|www\.ris\.bka\.gv\.at|docs\.github\.com|adssettings\.google\.com|www\.aboutads\.info|www\.youronlinechoices\.eu|policies\.google\.com|myaccount\.google\.com|www\.dsb\.gv\.at|www\.rhs\.org\.uk)/.test(main)) p('external link outside the approved list');
}
for (const f of ['ads.txt', 'robots.txt', 'CNAME', '404.html']) if (!fs.existsSync(path.join(DOCS, f))) problems.push('missing ' + f);
if (!fs.readFileSync(path.join(DOCS, '404.html'), 'utf8').includes('noindex')) problems.push('404 must be noindex');
console.log(problems.length ? problems.join('\n') : `${sitemap.length} sitemap pages OK`);
process.exit(problems.length ? 1 : 0);
