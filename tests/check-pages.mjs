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
  if (/^\/(guides|tools|plants)\/.+/.test(u) && !ads) p('content page without ads flag');
  // AdSense loader: statically in the head of every indexable page except imprint, privacy and contact, once, after the consent default
  const loaders = (h.match(/<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-7811071715414905" crossorigin="anonymous"><\/script>/g) || []).length;
  const noLoader = /^\/(imprint|privacy|contact)\/$/.test(u);
  if (noLoader && loaders) p('AdSense loader on a legal/contact page');
  if (!noLoader && loaders !== 1) p(`AdSense loader ${loaders}× instead of once`);
  if (loaders && (h.indexOf('adsbygoogle.js') < h.indexOf("gtag('consent','default'") || h.indexOf('adsbygoogle.js') > h.indexOf('</head>'))) p('AdSense loader not in head after the consent default');
  // pages without Google code are marked for the interim statistics window; "Privacy settings" in every footer
  if (noLoader !== h.includes('data-google="off"')) p('data-google="off" must be set exactly on pages without the AdSense loader');
  if (!/<footer[\s\S]*data-privacy-settings>Privacy settings<\/button>/.test(h)) p('footer without Privacy settings');
  for (const m of h.matchAll(/href="(\/[^"]*)"/g)) if (!exists(m[1])) p('broken link ' + m[1]);
  const main = h.slice(h.indexOf('<main'), h.indexOf('</main>')).replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<(form|section class="tool")[\s\S]*?<\/(form|section)>/g, ' ');
  const words = main.replace(/<[^>]+>/g, ' ').split(/\s+/).filter((w) => /[a-z]/i.test(w)).length;
  if (/^\/(guides|tools|plants)\/.+/.test(u) && words < 900) p(`only ${words} words`);
  if (/^\/(tools|plants)\/$/.test(u) && words < 700) p(`index page only ${words} words`);
  if (/https?:\/\/(?!balconybloomguide\.com)[^"]*"/.test(main) && /href="https?:\/\/(?!www\.rhs\.org\.uk|gml\.noaa\.gov|www\.almanac\.com|planthardiness\.ars\.usda\.gov|extension\.umn\.edu|extension\.psu\.edu|www\.aspca\.org|www\.ris\.bka\.gv\.at|docs\.github\.com|adssettings\.google\.com|www\.aboutads\.info|www\.youronlinechoices\.eu|policies\.google\.com|myaccount\.google\.com|www\.dsb\.gv\.at|www\.missouribotanicalgarden\.org|hgic\.clemson\.edu|extension\.illinois\.edu|hort\.extension\.wisc\.edu)/.test(main)) p('external link outside the approved list');
}
for (const f of ['ads.txt', 'robots.txt', 'CNAME', '404.html']) if (!fs.existsSync(path.join(DOCS, f))) problems.push('missing ' + f);
const p404 = fs.readFileSync(path.join(DOCS, '404.html'), 'utf8');
if (!p404.includes('noindex')) problems.push('404 must be noindex');
if (p404.includes('adsbygoogle.js')) problems.push('AdSense loader on the 404 page');
if (!p404.includes('data-google="off"') || !p404.includes('data-privacy-settings')) problems.push('404 needs data-google="off" and Privacy settings');
if (fs.readFileSync(path.join(DOCS, 'CNAME'), 'utf8') !== 'balconybloomguide.com') problems.push('CNAME must be exactly balconybloomguide.com without newline');
if (fs.readFileSync(path.join(DOCS, 'ads.txt'), 'utf8') !== 'google.com, pub-7811071715414905, DIRECT, f08c47fec0942fa0\n') problems.push('ads.txt changed');
// lastmod changes only for pages whose content changed: the guides, tools, imprint and contact page keep the
// October 31 rebuild date; plant profiles, overviews, home and About carry November 4, the privacy policy November 5. The visible date must match.
const CHANGED = /^\/(plants\/.*|guides\/|guides\/(windy-balcony-plants|south-facing-balcony-plants|overwintering-balcony-plants)\/|tools\/|about\/)?$/;
for (const m of fs.readFileSync(path.join(DOCS, 'sitemap.xml'), 'utf8').matchAll(/<loc>https:\/\/balconybloomguide\.com([^<]*)<\/loc><lastmod>([^<]*)<\/lastmod>/g)) {
  const want = m[1] === '/privacy/' ? '2026-11-05' : CHANGED.test(m[1]) ? '2026-11-04' : '2026-10-31';
  if (m[2] !== want) problems.push(`sitemap lastmod ${m[1]} ${m[2]} instead of ${want}`);
  const h = fs.readFileSync(path.join(DOCS, m[1], 'index.html'), 'utf8');
  const shown = { '2026-11-05': 'November 5, 2026', '2026-11-04': 'November 4, 2026', '2026-10-31': 'October 31, 2026' }[want];
  const mod = (h.match(/"dateModified":"([^"]*)"/) || [])[1];
  if (mod && mod !== want) problems.push(`${m[1]}: dateModified ${mod} instead of ${want}`);
  const vis = (h.match(/<p class="reviewed">[^<]*?(\w+ \d+, 2026)/) || [])[1];
  if (vis && vis !== shown) problems.push(`${m[1]}: visible date ${vis} instead of ${shown}`);
}
console.log(problems.length ? problems.join('\n') : `${sitemap.length} sitemap pages OK`);
process.exit(problems.length ? 1 : 0);
