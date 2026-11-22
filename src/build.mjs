// Balcony Bloom Guide – static site build. `node src/build.mjs` regenerates docs/ (except assets/).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { FORMS } from './forms.mjs';
import { STATIC_PAGES, HOME } from './pages.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// the same code the browser runs: computed tables on the pages cannot drift from the tools
const require = createRequire(import.meta.url);
const BBSun = require('../docs/assets/js/sun.js');
const BBCalc = require('../docs/assets/js/calc.js');
const BBPlan = require('../docs/assets/js/plan.js');
const BBData = require('../docs/assets/js/data.js');
const DOCS = path.join(ROOT, 'docs');
const SITE = 'https://balconybloomguide.com';
const NAME = 'Balcony Bloom Guide';
const CLIENT = 'ca-pub-7811071715414905';
const GA = 'G-T00HRG2YVF';
// Review dates: pages whose content did not change since the October 31 rebuild keep that date
// (the 17 guides, the four tools, imprint, contact); pages that are new or changed carry November 4.
const REVIEWED = 'October 31, 2026';
const REVIEWED_ISO = '2026-10-31';
const UPDATED = 'November 4, 2026';
const UPDATED_ISO = '2026-11-04';
const PUBLISHED_ISO = '2026-10-31';
// November 18 ("Eigenwert" rebuild): tools extended, frost planner and plant reference added, every guide got a
// computed table or a preset tool link, home/About/privacy changed. Plant profiles, imprint and contact are unchanged.
const EW = 'November 18, 2026';
const EW_ISO = '2026-11-18';
const V = '20261118b';
// Profiles whose overwintering zones now come from data.js (wording changed on November 18).
const PLANTS_CHANGED = ['lavender', 'rosemary'];
// Guides corrected on November 4: rosemary hardiness aligned with the plant profile.
// (On November 18 every guide changed, see EW below.)
// Pages that never load the AdSense script (legal and contact pages, 404).
const NO_LOADER = ['/imprint/', '/privacy/', '/contact/'];
// …and there no Google code at all: no ads, no analytics; “Privacy settings” opens the interim statistics window.
const googleOff = (pg) => !!pg.noindex || NO_LOADER.includes(pg.path);

export const GROUPS = [
  { key: 'sun', name: 'Sun & orientation', slugs: ['east-facing-balcony-plants', 'west-facing-balcony-plants', 'north-facing-balcony-plants', 'south-facing-balcony-plants'] },
  { key: 'load', name: 'Weight, wind & railings', slugs: ['balcony-weight-limit-planters', 'windy-balcony-plants', 'railing-planters', 'lightweight-potting-mix'] },
  { key: 'grow', name: 'What to grow', slugs: ['balcony-herb-garden-part-shade', 'balcony-tomatoes', 'strawberries-hanging-baskets-rail-boxes', 'balcony-privacy-plants'] },
  { key: 'care', name: 'Care & seasons', slugs: ['watering-balcony-plants-summer', 'self-watering-containers-holiday', 'overwintering-balcony-plants', 'balcony-garden-renters'] }
];
export const TOOLS = ['sun-hours', 'pot-weight', 'wind-check', 'watering-planner', 'frost-dates'];
export const PLANTS = [
  ['geranium-pelargonium', 'Geranium (Pelargonium)'], ['lavender', 'Lavender'], ['petunia', 'Petunia'], ['rosemary', 'Rosemary'],
  ['strawberry', 'Strawberry'], ['cherry-tomato', 'Cherry tomato'], ['basil', 'Basil'], ['fuchsia', 'Fuchsia'],
  ['hydrangea', 'Hydrangea (in a pot)'], ['ornamental-grasses', 'Ornamental grasses']
];
const TOOL_SHORT = { 'sun-hours': 'Sun & Shade Simulator', 'pot-weight': 'Pot Weight Planner', 'wind-check': 'Wind Exposure Check', 'watering-planner': 'Watering & Holiday Planner', 'frost-dates': 'Frost Date & Sowing Planner' };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = (h) => h.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');

// Zone figures for overwintered plants are written once, in data.js. Texts use {{pot:slug:key}} with the keys
// lo/hi (zones in the ground), out (pot stays outside from this zone), plo/phi (band with shelter), in (this zone and colder: indoors).
const PER = Object.fromEntries(BBData.PERENNIALS.map((r) => [r[3], { lo: r[1], hi: r[2], out: r[5], plo: r[6], phi: Math.min(13, r[5] - 1), in: r[6] - 1 }]));
const potTokens = (raw, file) => raw.replace(/\{\{pot:([a-z-]+):([a-z]+)\}\}/g, (m, slug, key) => {
  if (!PER[slug] || PER[slug][key] == null || PER[slug][key] > 13) throw new Error(`unknown zone token ${m} in ${file}`);
  return String(PER[slug][key]);
});
const potBand = (slug) => { const p = PER[slug]; return `Outdoors from zone ${p.out}; sheltered and wrapped in ${p.plo === p.phi ? 'zone ' + p.plo : `zones ${p.plo}–${p.phi}`}`; };
// These sources must take their overwintering zones from the data file, not from hand-typed numbers.
const ZONE_SOURCES = { 'plants/lavender.html': 'lavender', 'plants/rosemary.html': 'rosemary', 'guides/overwintering-balcony-plants.html': 'rosemary' };
function readFragment(file) {
  const rel = path.relative(path.join(ROOT, 'src'), file).split(path.sep).join('/');
  let raw = fs.readFileSync(file, 'utf8');
  if (ZONE_SOURCES[rel] && !raw.includes(`{{pot:${ZONE_SOURCES[rel]}:out}}`)) throw new Error(`${rel} must print its overwintering zones from data.js ({{pot:${ZONE_SOURCES[rel]}:out}})`);
  raw = potTokens(raw, rel);
  const m = raw.match(/^<!--meta\s*([\s\S]*?)-->\s*/);
  if (!m) throw new Error('no meta block in ' + file);
  return { meta: JSON.parse(m[1]), body: raw.slice(m[0].length).trim() };
}

// Google cuts titles at ~60–65 characters: drop the site name if the title gets too long
const kurzTitel = (t) => (t.length > 65 ? t.replace(/\s[–|-]\s(Balcony Bloom Guide)$/, '') : t);
const ICON = `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#1A1A1A"/><circle cx="27" cy="13" r="6" fill="#E2A022"/><path d="M8 31h24" stroke="#F7F6F2" stroke-width="2"/><path d="M11 31v-4h18v4" fill="#46588F"/><path d="M15 27c0-5 2-8 5-10M20 27c0-4 3-6 6-7M17 21c-2-1-4-1-6 0 2 2 4 2 6 0z" stroke="#9CC3A8" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>`;

function nav(current) {
  const items = [['/', 'Home'], ['/tools/sun-hours/', 'Sun simulator'], ['/tools/pot-weight/', 'Pot weight'], ['/tools/wind-check/', 'Wind check'], ['/tools/watering-planner/', 'Watering'], ['/tools/frost-dates/', 'Frost dates'], ['/plants/', 'Plants'], ['/guides/', 'Guides'], ['/about/', 'About']];
  return `<nav class="main" aria-label="Main"><div class="wrap"><ul>${items.map(([h, t]) => `<li><a href="${h}"${h === current ? ' aria-current="page"' : ''}>${t}</a></li>`).join('')}</ul></div></nav>`;
}

function footer() {
  const g = (s) => `<li><a href="/guides/${s}/">${esc(TITLES[s])}</a></li>`;
  return `<footer class="foot"><div class="wrap"><div class="cols">
<div><h2>${NAME}</h2><p>Balcony gardening that starts from your balcony: its direction, the slab above, the wind and the weight it carries.</p><p>Information for planning only – not structural, legal or safety advice.</p></div>
<div><h2>Tools</h2><ul>${TOOLS.map((t) => `<li><a href="/tools/${t}/">${TOOL_SHORT[t]}</a></li>`).join('')}</ul></div>
<div><h2>Plant profiles</h2><ul>${PLANTS.slice(0, 5).map(([s, n]) => `<li><a href="/plants/${s}/">${esc(n)}</a></li>`).join('')}<li><a href="/plants/">All plant profiles</a></li><li><a href="/plants/reference/">Crop &amp; plant reference</a></li></ul></div>
<div><h2>Popular guides</h2><ul>${['east-facing-balcony-plants', 'balcony-weight-limit-planters', 'balcony-tomatoes', 'watering-balcony-plants-summer'].map(g).join('')}</ul></div>
<div><h2>Site</h2><ul><li><a href="/about/">About &amp; method</a></li><li><a href="/contact/">Contact</a></li><li><a href="/imprint/">Imprint</a></li><li><a href="/privacy/">Privacy policy</a></li><li><button type="button" class="linklike" data-privacy-settings>Privacy settings</button></li></ul></div>
</div><p class="small" style="color:inherit;opacity:.8;margin-top:18px">© 2026 AdStern, Vienna · Fonts: Young Serif and Atkinson Hyperlegible (SIL Open Font License)</p></div></footer>`;
}

function ldjson(obj) { return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`; }

function faqFrom(body) {
  const i = body.indexOf('<h2 id="faq">');
  if (i < 0) return null;
  const end = body.indexOf('<h2', i + 5);
  const part = body.slice(i, end < 0 ? undefined : end);
  const qs = [...part.matchAll(/<h3>([\s\S]*?)<\/h3>\s*([\s\S]*?)(?=<h3>|$)/g)];
  if (!qs.length) return null;
  return { '@type': 'FAQPage', mainEntity: qs.map((q) => ({ '@type': 'Question', name: strip(q[1]).trim().replace(/\s+/g, ' '), acceptedAnswer: { '@type': 'Answer', text: strip(q[2]).trim().replace(/\s+/g, ' ') } })) };
}

const AD = (slot) => `<div class="ad" data-slot="${slot}" hidden><span class="ad-label">Advertisement</span></div>`;

function layout(pg) {
  const url = SITE + pg.path;
  const graph = [{ '@type': 'BreadcrumbList', itemListElement: pg.crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c[0], item: SITE + c[1] })) }];
  if (pg.schema) graph.push(...[].concat(pg.schema));
  const head = `<!doctype html>
<html lang="en" data-ads="${pg.ads ? 'yes' : 'no'}"${googleOff(pg) ? ' data-google="off"' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(kurzTitel(pg.title))}</title>
<meta name="description" content="${esc(pg.description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="${pg.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}">
<meta name="google-adsense-account" content="${CLIENT}">
<meta property="og:type" content="${pg.kind === 'guide' ? 'article' : 'website'}">
<meta property="og:title" content="${esc(pg.title)}">
<meta property="og:description" content="${esc(pg.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/assets/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:site_name" content="${NAME}">
<meta property="og:locale" content="en_US">
<meta name="theme-color" content="#F7F6F2">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/atkinson-hyperlegible-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/young-serif-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/bloom.css?v=${V}">
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});gtag('set','ads_data_redaction',true);gtag('set','url_passthrough',false);window['ga-disable-${GA}']=true;</script>
${!googleOff(pg) ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}" crossorigin="anonymous"></script>\n` : ''}${ldjson({ '@context': 'https://schema.org', '@graph': graph })}
<script src="/assets/js/consent.js?v=${V}" defer></script>
${(pg.scripts || []).map((s) => `<script src="/assets/js/${s}?v=${V}" defer></script>`).join('\n')}${pg.scripts && pg.scripts.length ? '\n' : ''}<script src="/assets/js/bloom.js?v=${V}" defer></script>
</head>`;
  const crumbs = pg.path === '/' ? '' : `<p class="crumbs"><a href="/">Home</a>${pg.crumbs.slice(1).map((c, i, a) => i === a.length - 1 ? ` › <span aria-current="page">${esc(c[0])}</span>` : ` › <a href="${c[1]}">${esc(c[0])}</a>`).join('')}</p>`;
  return `${head}
<body${pg.kind === 'tool' ? ' class="tool-page"' : ''}>
<a class="skip" href="#main">Skip to content</a>
<header class="mast"><div class="wrap"><a class="brand" href="/">${ICON}<b>${NAME}</b></a><p class="tag">The balcony almanac · sun, weight, wind and water for the balcony you actually have</p></div><hr class="rule2">${nav(pg.navCurrent || pg.path)}</header>
<main id="main"><div class="wrap">${crumbs}
${pg.html}
</div></main>
${footer()}
</body>
</html>
`;
}

function write(rel, html) {
  const file = path.join(DOCS, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

function relatedCards(list) {
  return `<h2 id="related">Keep planning</h2><div class="cards">${list.map((r) => {
    const isTool = r.startsWith('tools/'), isPlant = r.startsWith('plants/');
    const slug = isTool ? r.slice(6) : isPlant ? r.slice(7) : r;
    const href = isTool ? `/tools/${slug}/` : isPlant ? `/plants/${slug}/` : `/guides/${slug}/`;
    const meta = isTool ? TOOLMETA[slug] : isPlant ? (slug === 'reference' ? REFMETA : PLANTMETA[slug]) : GUIDEMETA[slug];
    if (!meta) throw new Error('unknown related ' + r);
    return `<a class="card" href="${href}"><span class="k">${isTool ? 'Tool' : esc(meta.kicker)}</span><h3>${esc(meta.h1)}</h3><p>${esc(meta.description)}</p></a>`;
  }).join('')}</div>`;
}

function enhance(body) {
  return body
    .replace(/<!--ad-->/g, AD('inline'))
    .replace(/<table class="data( wide)?">([\s\S]*?)<\/table>/g, '<div class="tablewrap"><table class="data$1">$2</table></div>');
}

function afterFirstSection(body, insert) {
  const first = body.indexOf('<h2');
  const second = first < 0 ? -1 : body.indexOf('<h2', first + 3);
  return second < 0 ? body + insert : body.slice(0, second) + insert + '\n' + body.slice(second);
}

function firstParaSplit(body) {
  const m = body.match(/^\s*<p class="lede">[\s\S]*?<\/p>/);
  return m ? [m[0], body.slice(m[0].length)] : ['', body];
}

// ---------- computed content (same code as the tools) ----------
const REFMETA = { kicker: 'Reference', h1: 'Balcony crop and plant reference', title: 'Container Crop Reference: Pot Size, Light, Frost Class, Weight',
  description: 'Filterable tables for 33 container crops and 7 overwintered plants: frost class, planting rule, pot size, sun hours, wet weight and winter check by USDA zone.' };
const hash = (o) => esc(BBPlan.encodeState(o));
const STD = { unit: 'ft', depth: 5, width: 10, ceiling: 8.5, walls: { left: true, right: true }, railing: { height: 3.5, type: 'open' }, opposite: null };
const stdLink = (o) => `/tools/sun-hours/#${hash({ unit: 'ft', depth: 5, width: 10, ceiling: 8.5, wl: 1, wr: 1, rail: 3.5, rt: 'open', opp: 0, ...o })}`;
const FACE_NAME = { 0: 'north', 90: 'east', 180: 'south', 270: 'west' };
function orientationTable(facing) {
  const lats = [[30, 'about Houston or Cairo'], [40, 'about Philadelphia or Madrid'], [50, 'about Vancouver or Prague']];
  const months = [[3, 'Mar'], [6, 'Jun'], [9, 'Sep'], [12, 'Dec']];
  const rows = lats.map(([lat, where]) => {
    const y = BBSun.year(lat, 0, { ...STD, facing });
    return `<tr><td>${lat}° N<br><span class="small">${where}</span></td>${months.map(([m]) => `<td>${y.railing[m - 1].toFixed(1)}</td><td>${y.middle[m - 1].toFixed(1)}</td><td>${y.back[m - 1].toFixed(1)}</td>`).join('')}<td><a href="${stdLink({ lat, lon: 0, deg: facing, month: 6 })}">Open</a></td></tr>`;
  }).join('\n');
  return `<h2 id="computed-hours">Computed for this page: ${FACE_NAME[facing] === 'east' ? 'an' : 'a'} ${FACE_NAME[facing]}-facing balcony at three latitudes</h2>
<p>These hours were calculated for this page with the same code as the <a href="/tools/sun-hours/">Sun &amp; Shade Simulator</a>, for one stated balcony: 5 ft (1.5 m) deep, 10 ft (3 m) wide, the slab of the balcony above at 8.5 ft (2.6 m), walls on both sides, an open railing 3.5 ft (1.07 m) high and nothing opposite. Each cell is direct sun in hours on the 15th of the month, clear sky. In the Southern Hemisphere read the table for a balcony facing the opposite way with the months shifted by six.</p>
<table class="data"><caption>Direct sun hours: railing / middle / back wall</caption>
<thead><tr><th rowspan="2">Latitude</th>${months.map(([, n]) => `<th colspan="3">${n} 15</th>`).join('')}<th rowspan="2">Simulator</th></tr>
<tr>${months.map(() => '<th>Rail</th><th>Mid</th><th>Back</th>').join('')}</tr></thead>
<tbody>
${rows}
</tbody></table>
<p>Your balcony will differ: a deeper balcony, a lower slab, a solid railing or a building opposite all cut hours, and open sky above adds them. "Open" loads the row into the simulator, where you change the sizes to yours.</p>`;
}
const potLink = (pots, extra = {}) => `/tools/pot-weight/#${hash({ unit: 'in', p: pots.map((p) => p.join('~')), ...extra })}`;
const waterLink = (o) => `/tools/watering-planner/#${hash(o)}`;
const tryBox = (text, links) => `<aside class="trybox"><p><b>Try it with your values.</b> ${text}</p><p>${links.map(([h, t]) => `<a href="${h}">${t}</a>`).join(' · ')}</p></aside>`;
const TRY = {
  'east-facing-balcony-plants': tryBox('The hours on this page depend on your latitude, the slab above and the railing.', [[stdLink({ city: 'New York, NY', deg: 90, month: 6 }), 'Open the simulator with an east-facing balcony in New York'], ['/plants/reference/#hours=4', 'Crops whose light figure starts at 4 h or less']]),
  'west-facing-balcony-plants': tryBox('Afternoon hours depend on your latitude, the slab above and what stands opposite.', [[stdLink({ city: 'Chicago, IL', deg: 270, month: 7 }), 'Open the simulator with a west-facing balcony in Chicago'], [waterLink({ unit: 'in', dia: 14, height: 12, material: 'plastic', canopy: 'bushy', sun: 6, wind: 'exposed', weather: 'hot', days: 0 }), 'Watering estimate for a 14 in pot in afternoon sun and wind']]),
  'north-facing-balcony-plants': tryBox('Whether a north balcony gets any direct sun in summer depends on latitude and on the slab above.', [[stdLink({ city: 'London, UK', deg: 0, month: 6 }), 'Open the simulator with a north-facing balcony in London'], ['/plants/reference/#hours=3', 'Crops whose light figure starts at 3 h']]),
  'south-facing-balcony-plants': tryBox('On a south balcony the slab above decides how far the summer sun reaches in.', [[stdLink({ city: 'Phoenix, AZ', deg: 180, month: 6 }), 'Open the simulator with a south-facing balcony in Phoenix'], [waterLink({ unit: 'in', dia: 16, height: 14, material: 'terracotta', canopy: 'bushy', sun: 9, wind: 'moderate', weather: 'heat', days: 0 }), 'Watering estimate for a 16 in terracotta pot in a heatwave']]),
  'balcony-weight-limit-planters': tryBox('The planner adds up your own pots and, if you enter the floor size and a load figure, shows how much of it the pots alone use.', [[potLink([['Tomato tub', 'round', 45.7, 38.1, 40.6, '', '', 'glazed', 'potting', 1, 9, 3], ['Herb pot', 'round', 30.5, 22.9, 25.4, '', '', 'plastic', 'potting', 3, 1, 0], ['Rail box', 'trough', 61, '', 17.8, 20.3, '', 'plastic', 'potting', 2, 1, 0]], { bw: 10, bd: 5, ref: 'wa60' }), 'Open a list like the worked example below on a 10 × 5 ft floor'], ['/tools/pot-weight/', 'Start with an empty list']]),
  'windy-balcony-plants': tryBox('The six questions behind the wind class take a minute.', [[`/tools/wind-check/#${hash({ floor: 12, position: 'corner', surroundings: 'open', recess: 'projecting', railing: 'glass', prevailing: 'yes' })}`, 'Open the check with a 12th-floor corner balcony'], ['/tools/wind-check/', 'Answer for your own balcony']]),
  'railing-planters': tryBox('What a filled box weighs depends on its real inside size and the mix.', [[potLink([['Rail box 24 in', 'trough', 61, '', 17.8, 20.3, '', 'plastic', 'potting', 2, '', 0.5], ['Rail box 32 in', 'trough', 81.3, '', 17.8, 20.3, '', 'plastic', 'lightweight', 1, '', 0.5]]), 'Open the planner with two 24 in boxes and one 32 in box'], [stdLink({ city: 'New York, NY', deg: 90, month: 6 }), 'Sun hours at the railing']]),
  'lightweight-potting-mix': tryBox('The same pot, once with standard and once with lightweight mix, side by side in one list.', [[potLink([['16 in pot, standard mix', 'round', 40.6, 30.5, 35.6, '', '', 'plastic', 'potting', 1, '', 0], ['16 in pot, lightweight mix', 'round', 40.6, 30.5, 35.6, '', '', 'plastic', 'lightweight', 1, '', 0], ['16 in pot, garden soil', 'round', 40.6, 30.5, 35.6, '', '', 'plastic', 'soil', 1, '', 0]]), 'Open the comparison in the Pot Weight Planner']]),
  'balcony-herb-garden-part-shade': tryBox('Find out which of your spots reaches the hours a herb needs, then check the container size.', [[stdLink({ city: 'Boston, MA', deg: 90, month: 6 }), 'Open the simulator with an east-facing balcony in Boston'], ['/plants/reference/#size=S', 'Crops and herbs for small containers (1–3 gal)']]),
  'balcony-tomatoes': tryBox('Three numbers decide a balcony tomato: sun hours at the pot, the date it can go out and the weight of the tub.', [[stdLink({ city: 'Chicago, IL', deg: 180, month: 6 }), 'Sun hours for a south-facing balcony in Chicago'], [`/tools/frost-dates/#${hash({ place: 'USW00094846', risk: 'cautious' })}`, 'Tomato dates from Chicago’s freeze record'], [potLink([['Tomato tub 10 gal', 'round', 45.7, 38.1, 40.6, '', '', 'plastic', 'potting', 1, '', 3]]), 'Weight of a 10 gal tub']]),
  'strawberries-hanging-baskets-rail-boxes': tryBox('Strawberries need the sunniest spot and a container that does not dry out by noon.', [[stdLink({ city: 'Seattle, WA', deg: 225, month: 6 }), 'Sun hours for a southwest-facing balcony in Seattle'], [waterLink({ unit: 'in', dia: 12, height: 8, material: 'plastic', canopy: 'bushy', sun: 7, wind: 'moderate', weather: 'hot', days: 0 }), 'Watering estimate for a 12 in hanging basket']]),
  'balcony-privacy-plants': tryBox('A planted screen is the heaviest thing most balconies carry. Add it up before you buy.', [[potLink([['Trough for a screen', 'trough', 100, '', 40, 40, '', 'wood', 'potting', 2, '', 8]], { bw: 10, bd: 5 }), 'Open the planner with two 40 in wooden troughs on a 10 × 5 ft floor'], [`/tools/wind-check/#${hash({ floor: 8, position: 'end', surroundings: 'mixed', recess: 'projecting', railing: 'open', prevailing: 'unknown' })}`, 'Wind class for an 8th-floor balcony']]),
  'watering-balcony-plants-summer': tryBox('The starting intervals on this page come from the planner. Yours depend on pot, sun and wind.', [[waterLink({ unit: 'in', dia: 12, height: 11, material: 'terracotta', canopy: 'bushy', sun: 8, wind: 'exposed', weather: 'hot', days: 0 }), 'Open the planner with a 12 in terracotta pot, 8 h sun, exposed'], ['/tools/watering-planner/', 'Enter your own pot']]),
  'self-watering-containers-holiday': tryBox('How big a reservoir has to be depends on the pot, the weather and the days away.', [[waterLink({ unit: 'in', dia: 14, height: 12, material: 'plastic', canopy: 'large', sun: 7, wind: 'moderate', weather: 'hot', days: 10 }), 'Open the planner with a 14 in pot and 10 days away'], ['/tools/watering-planner/', 'Enter your own pot and trip']]),
  'overwintering-balcony-plants': tryBox('Two lookups replace most guessing: your freeze dates and the two-zone margin for pots.', [[`/tools/frost-dates/#${hash({ place: 'USW00014922', risk: 'cautious' })}`, 'First fall freeze in Minneapolis, cautious date'], ['/plants/reference/#zone=6', 'Winter check for pots in USDA zone 6']]),
  'balcony-garden-renters': tryBox('A pot list with weights is the document a landlord or building manager can actually check.', [[potLink([['Tomato tub', 'round', 45.7, 38.1, 40.6, '', '', 'plastic', 'potting', 1, '', 3], ['Herb pot', 'round', 30.5, 22.9, 25.4, '', '', 'plastic', 'potting', 3, '', 0]], { bw: 10, bd: 5 }), 'Open an example list, then print the data sheet or download the CSV']])
};
const COMPUTED = { 'east-facing-balcony-plants': orientationTable(90), 'west-facing-balcony-plants': orientationTable(270), 'north-facing-balcony-plants': orientationTable(0), 'south-facing-balcony-plants': orientationTable(180) };
function beforeNthH2(body, n, insert) {
  let i = -1;
  for (let k = 0; k < n; k++) { i = body.indexOf('<h2', i + 1); if (i < 0) throw new Error('not enough sections'); }
  return body.slice(0, i) + insert + '\n\n' + body.slice(i);
}

// ---------- load content ----------
const GUIDEMETA = {}, TOOLMETA = {}, PLANTMETA = {}, TITLES = {};
const guideBodies = {}, toolBodies = {}, plantBodies = {};
for (const g of GROUPS) for (const s of g.slugs) {
  const f = readFragment(path.join(ROOT, 'src/guides', s + '.html'));
  GUIDEMETA[s] = { ...f.meta, group: g.name };
  TITLES[s] = f.meta.h1; guideBodies[s] = f.body;
}
for (const [p] of PLANTS) {
  const f = readFragment(path.join(ROOT, 'src/plants', p + '.html'));
  PLANTMETA[p] = f.meta; plantBodies[p] = f.body;
}
for (const t of TOOLS) {
  const f = readFragment(path.join(ROOT, 'src/tools', t + '.html'));
  TOOLMETA[t] = f.meta; toolBodies[t] = f.body;
}

// ---------- clean generated output (keep assets) ----------
for (const entry of fs.readdirSync(DOCS)) if (entry !== 'assets') fs.rmSync(path.join(DOCS, entry), { recursive: true, force: true });

const pages = [];

// guides
for (const g of GROUPS) for (const s of g.slugs) {
  const m = GUIDEMETA[s];
  if (!TRY[s]) throw new Error('guide without a preset tool link: ' + s);
  const [lede, rest] = firstParaSplit(enhance(COMPUTED[s] ? beforeNthH2(guideBodies[s], 3, COMPUTED[s]) : guideBodies[s]));
  const observed = ["north", "east", "south", "west"].some(side => s === side + "-facing-balcony-plants");
  const faq = faqFrom(guideBodies[s]);
  const html = `<div class="layout with-side"><article>
<span class="kicker">${esc(m.kicker)}</span>
<h1>${esc(m.h1)}</h1>
${lede}
${TRY[s]}
<div id="profile" class="profilebox" hidden></div>
${AD('top')}
${rest}
${relatedCards(m.related)}
<p class="reviewed">Last updated: ${observed ? 'November 22, 2026' : EW}. Found an error? <a href="/contact/">Tell us</a>.</p>
</article><aside class="side" aria-label="Advertisement">${AD('side')}</aside></div>`;
  pages.push({ path: `/guides/${s}/`, kind: 'guide', ads: true, modified: observed ? '2026-11-22' : EW_ISO, title: m.title, description: m.description, html, navCurrent: '/guides/',
    crumbs: [['Home', '/'], ['Guides', '/guides/'], [m.h1, `/guides/${s}/`]],
    schema: [{ '@type': 'Article', headline: m.h1, description: m.description, datePublished: PUBLISHED_ISO, dateModified: observed ? '2026-11-22' : EW_ISO, inLanguage: 'en', mainEntityOfPage: `${SITE}/guides/${s}/`, publisher: { '@type': 'Organization', name: 'AdStern – Agentur für digitales Marketing', url: SITE + '/about/' } }, faq].filter(Boolean) });
}

// plant profiles
for (const [s, short] of PLANTS) {
  const m = PLANTMETA[s];
  const [lede, rest] = firstParaSplit(enhance(plantBodies[s]));
  const faq = faqFrom(plantBodies[s]);
  const html = `<div class="layout with-side"><article>
<span class="kicker">${esc(m.kicker)}</span>
<h1>${esc(m.h1)}</h1>
${lede}
<div id="profile" class="profilebox" hidden></div>
${AD('top')}
${rest}
${relatedCards(m.related)}
<p class="reviewed">${PLANTS_CHANGED.includes(s) ? `Last updated: ${EW} (published ${UPDATED})` : `Published: ${UPDATED}`}. Found an error? <a href="/contact/">Tell us</a>.</p>
</article><aside class="side" aria-label="Advertisement">${AD('side')}</aside></div>`;
  pages.push({ path: `/plants/${s}/`, kind: 'guide', ads: true, modified: PLANTS_CHANGED.includes(s) ? EW_ISO : UPDATED_ISO, title: m.title, description: m.description, html, navCurrent: '/plants/',
    crumbs: [['Home', '/'], ['Plant profiles', '/plants/'], [short, `/plants/${s}/`]],
    schema: [{ '@type': 'Article', headline: m.h1, description: m.description, datePublished: UPDATED_ISO, dateModified: PLANTS_CHANGED.includes(s) ? EW_ISO : UPDATED_ISO, inLanguage: 'en', mainEntityOfPage: `${SITE}/plants/${s}/`, publisher: { '@type': 'Organization', name: 'AdStern – Agentur für digitales Marketing', url: SITE + '/about/' } }, faq].filter(Boolean) });
}

// tools
const TOOL_SCRIPTS = { 'sun-hours': ['sun.js', 'data.js', 'plan.js', 'tools.js'], 'pot-weight': ['calc.js', 'data.js', 'plan.js', 'tools.js'], 'wind-check': ['calc.js', 'plan.js', 'tools.js'], 'watering-planner': ['calc.js', 'sun.js', 'plan.js', 'tools.js'], 'frost-dates': ['data.js', 'plan.js', 'tools.js'] };
const md = (s) => (s ? BBPlan.label(BBPlan.doy(s)) : '–');
const stationTable = `<table class="data wide"><caption>Dates of the last 32 °F (0 °C) reading in spring and the first in fall, NOAA U.S. Climate Normals 1991–2020 (retrieved November 18, 2026)</caption>
<thead><tr><th rowspan="2">City</th><th rowspan="2">NOAA station</th><th colspan="3">Last spring freeze</th><th colspan="3">First fall freeze</th><th rowspan="2">Days between the medians</th><th rowspan="2">Years with a freeze</th></tr>
<tr><th>9 in 10 years later than</th><th>Median</th><th>1 in 10 years later than</th><th>1 in 10 years earlier than</th><th>Median</th><th>9 in 10 years earlier than</th></tr></thead>
<tbody>
${BBData.STATIONS.map((s) => `<tr><td>${esc(s[0])}</td><td>${esc(s[2])}<br><span class="small">${s[1]}</span></td><td>${md(s[5])}</td><td>${md(s[6])}</td><td>${md(s[7])}</td><td>${md(s[8])}</td><td>${md(s[9])}</td><td>${md(s[10])}</td><td>${s[6] ? BBPlan.daysBetween(BBPlan.doy(s[6]), BBPlan.doy(s[9])) : '–'}</td><td>${s[11].toFixed(s[11] === 100 || s[11] === 0 ? 0 : 1)} %</td></tr>`).join('\n')}
</tbody></table>
<p class="small">"–" means NOAA gives no date because 32 °F did not occur. "Days between the medians" is this site's subtraction of the two median dates, not NOAA's growing-season-length variable.</p>`;
const frostExample = (() => {
  const s = BBData.STATIONS.find((x) => x[0] === 'New York, NY'), tom = BBData.CROPS.find((c) => c[0] === 'tomato'), let_ = BBData.CROPS.find((c) => c[0] === 'lettuce');
  const a = BBPlan.schedule(tom, BBPlan.doy(s[6]), BBPlan.doy(s[9]), BBData.CLASSES), b = BBPlan.schedule(tom, BBPlan.doy(s[7]), BBPlan.doy(s[8]), BBData.CLASSES), l = BBPlan.schedule(let_, BBPlan.doy(s[6]), BBPlan.doy(s[9]), BBData.CLASSES);
  const w = BBPlan.containerWeight(BBData.CONTAINERS.L.gal, 0.75);
  return `<p><b>Worked example.</b> New York, Central Park station: the median last spring freeze is ${md(s[6])}, the cautious date ${md(s[7])}. Tomatoes are very tender, so the rule adds two weeks: planting out from ${a.outText} with the median, from ${b.outText} with the cautious date. A tomato transplant is 5–7 weeks old, so sowing indoors falls on ${a.sowText} or ${b.sowText}. From the cautious planting date to the cautious first fall freeze (${md(s[8])}) there are ${b.seasonDays} days against 65 typical days to harvest: the season fits. Leaf lettuce is hardy and can be sown outdoors from ${l.outText}. The tomato needs the large container group, 8–10 gallons (${w.litres[0].toFixed(0)}–${w.litres[1].toFixed(0)} L), which holds ${w.lb[0].toFixed(0)}–${w.lb[1].toFixed(0)} lb (${w.kg[0].toFixed(0)}–${w.kg[1].toFixed(0)} kg) of wet standard mix.</p>`;
})();
for (const t of TOOLS) {
  const m = TOOLMETA[t];
  if (t === 'frost-dates') toolBodies[t] = toolBodies[t].replace('<!--stations-->', () => stationTable).replace('<!--frost-example-->', () => frostExample);
  if (/<!--(stations|frost-example)-->/.test(toolBodies[t])) throw new Error('placeholder left in ' + t);
  const [lede, rest] = firstParaSplit(enhance(toolBodies[t]));
  const faq = faqFrom(toolBodies[t]);
  const html = `<article>
<span class="kicker">${esc(m.kicker)}</span>
<h1>${esc(m.h1)}</h1>
<div class="prose">${lede}</div>
${FORMS[t]}
<div class="prose">${afterFirstSection(rest, AD('top'))}
${relatedCards(m.related)}
<p class="reviewed">Last updated: ${t === 'sun-hours' ? 'November 22, 2026' : EW}. Your inputs are stored only in this browser.</p></div>
</article>`;
  pages.push({ path: `/tools/${t}/`, kind: 'tool', ads: true, modified: t === 'sun-hours' ? '2026-11-22' : EW_ISO, title: m.title, description: m.description, html, scripts: TOOL_SCRIPTS[t],
    crumbs: [['Home', '/'], ['Tools', '/tools/'], [TOOL_SHORT[t], `/tools/${t}/`]],
    schema: [{ '@type': 'WebApplication', name: m.h1, url: `${SITE}/tools/${t}/`, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any (web browser)', inLanguage: 'en', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }, faq].filter(Boolean) });
}

// guide + tool index pages
const plantCard = ([s]) => `<a class="card" href="/plants/${s}/"><span class="k">${esc(PLANTMETA[s].kicker)}</span><h3>${esc(PLANTMETA[s].h1)}</h3><p>${esc(PLANTMETA[s].description)}</p></a>`;
const guideCard = (s) => `<a class="card" href="/guides/${s}/"><span class="k">${esc(GUIDEMETA[s].kicker)}</span><h3>${esc(GUIDEMETA[s].h1)}</h3><p>${esc(GUIDEMETA[s].description)}</p></a>`;
const toolCard = (t) => `<a class="card" href="/tools/${t}/"><span class="k">Tool</span><h3>${esc(TOOLMETA[t].h1)}</h3><p>${esc(TOOLMETA[t].description)}</p></a>`;
pages.push({ path: '/guides/', kind: 'index', ads: false, modified: EW_ISO, title: 'Balcony gardening guides by sun, weight, wind and season', description: 'All Balcony Bloom Guide articles: plants by balcony direction, weight and wind, herbs, tomatoes and strawberries in containers, watering, winter care and renting.',
  crumbs: [['Home', '/'], ['Guides', '/guides/']],
  html: `<article style="max-width:none"><span class="kicker">All guides</span><h1>Balcony guides</h1><p class="lede" style="max-width:70ch">Sixteen guides, each written for a specific balcony question. Where a number depends on your balcony – sun hours, pot weight, wind, water, frost dates – the guide opens the tool that calculates it with a stated example already filled in. The former month-by-month calendar was replaced by the <a href="/tools/frost-dates/">Frost Date &amp; Sowing Planner</a>, which counts from your own frost dates.</p>
${GROUPS.map((g) => `<h2 id="${g.key}">${g.name}</h2><div class="cards">${g.slugs.map(guideCard).join('')}</div>`).join('\n')}
<h2 id="plants">Plant profiles</h2><div class="cards">${PLANTS.map(plantCard).join('')}<a class="card" href="/plants/reference/"><span class="k">${REFMETA.kicker}</span><h3>${esc(REFMETA.h1)}</h3><p>${esc(REFMETA.description)}</p></a></div>
<h2 id="tools">Tools</h2><div class="cards">${TOOLS.map(toolCard).join('')}</div></article>` });
pages.push({ path: '/tools/', kind: 'index', ads: false, modified: EW_ISO, title: 'Free balcony garden tools: sun, pot weight, wind, water, frost', description: 'Five free calculators for balcony gardeners: direct sun hours for railing and back wall, wet pot weight and floor load, wind exposure, watering and frost dates.',
  crumbs: [['Home', '/'], ['Tools', '/tools/']],
  html: `<article style="max-width:none"><span class="kicker">Tools</span><h1>Balcony tools</h1><p class="lede" style="max-width:70ch">Five calculators that work in your browser, without an account. Each shows how it arrived at its result, offers examples to start from, and can hand you a link, a text copy, a printout or a CSV file. They share one saved balcony profile, so the sun hours you calculate once show up on the guide pages and in the watering planner.</p><div class="cards">${TOOLS.map(toolCard).join('')}</div><div style="max-width:70ch"><h2 id="order">In which order to use them</h2><p>Start with the sun: the simulator tells you which spot on your balcony counts as full sun, part sun or shade in each month, and that decides what you can grow where. Then plan the pots: once you know which plants go where, the pot weight planner adds up what the filled containers weigh, so you can keep heavy pots near the wall and hand a data sheet to your building manager if you plan something big.</p><p>The wind check matters most above the third or fourth floor and on corners; its result also feeds the watering planner, because wind dries pots faster. The watering planner comes last, when you know the pots, their sun and the wind, and it is the one to open again before a trip. The frost planner stands apart: open it in late winter to find the sowing dates, and again in fall to see how long tender plants can stay out.</p><p>All five are estimates built on stated assumptions. Below is what each one calculates, where its limits are and a worked example; each tool page explains the method in full under the calculator.</p>
<h2 id="sun-hours">Sun &amp; Shade Simulator</h2>
<p><b>How it calculates.</b> For the 15th of every month the simulator computes the sun's height and compass bearing every two minutes with the NOAA solar position equations, ignoring sun lower than 2° above the horizon. It treats the balcony as a box and follows a straight line from three spots – the railing top, the middle of the floor at pot height and a point 1 ft (30 cm) out from the back wall – towards the sun. A spot counts as sunny when that line is not blocked by the facade, a side wall, the slab above, a solid railing or the building opposite. The sunny steps add up to hours of direct sun per day.</p>
<p><b>Limits.</b> It is clear-sky geometry: clouds, trees, awnings, plants on the railing and light reflected from white walls are not included, and the building opposite is modelled as one long wall.</p>
<p><b>Example.</b> An east-facing balcony in New York, 5 ft deep with an 8.5 ft ceiling, side walls and an open railing: on June 15 the railing gets 6.9 hours, the back wall 5.3 hours; in December the railing gets 4.0 and the back wall 1.6 hours. With a solid railing the middle of the floor drops to 2.0 hours in June.</p>
<h2 id="pot-weight">Pot Weight Planner</h2>
<p><b>How it calculates.</b> It works out the volume of each pot from its top and bottom size and its height (round, square or trough), leaves 1 in (2.5 cm) of headspace, and multiplies the mix volume by a wet weight per litre after watering and draining: about 0.6 kg for a lightweight peat or coir mix, 0.75 kg for standard potting mix and up to 1.65 kg for garden soil. The empty pot is estimated from its wall area, a typical wall thickness and the density of the material, unless you enter its weight.</p>
<p><b>Limits.</b> Real mixes vary by about a fifth either way, and a saturated pot right after rain is heavier than a drained one. The planner adds weights; it cannot tell you what your balcony may carry – only the building owner or a structural engineer can.</p>
<p><b>Example.</b> A round terracotta pot 16 in across, 12 in at the base and 14 in tall holds 32.4 L (8.6 gal) of mix. In standard potting mix that is 54 lb (24.3 kg) wet; with the estimated 23 lb pot, the total is 76 lb (34.5 kg). The same pot in plastic comes to 57 lb.</p>
<h2 id="wind-check">Wind Exposure Check</h2>
<p><b>How it calculates.</b> Six answers – floor level, position on the building, surroundings, recess and side walls, railing type and whether the balcony faces the prevailing wind – each give 0 to 4 points (a loggia gives −1). The total sorts the balcony into Sheltered (up to 2), Moderate (up to 4), Exposed (up to 6.5) or Very exposed. The class also sets a wind factor for the watering planner: 1.0, 1.15, 1.3 or 1.5.</p>
<p><b>Limits.</b> It is a transparent rule of thumb, not a measurement or a wind-load calculation. Local effects such as a gap between two towers can make a balcony windier than its score.</p>
<p><b>Example.</b> A 7th-floor balcony near the end of the building, mixed surroundings, partly enclosed, glass railing, prevailing wind unknown: 2 + 1 + 1 + 0 + 0 + 0.5 = 4.5 points, Exposed.</p>
<h2 id="watering-planner">Watering &amp; Holiday Planner</h2>
<p><b>How it calculates.</b> It starts from a reference evaporation rate for the weather you pick (2 mm a day on cool days up to 8 mm in a heatwave), scales it by your sun hours (0.4 plus 0.06 per hour), the wind factor and the pot material, and applies it to the top area of the pot times a canopy factor for small, bushy or large plants. One millimetre over one square metre is one litre. The usable buffer is one tenth of the mix volume; buffer divided by daily use gives the days between checks, and for a trip it adds 20 % to the water needed and subtracts the buffer.</p>
<p><b>Limits.</b> It does not know your plant's actual thirst, mulch, saucers or rain. Use the result as a starting rhythm and check the mix with a finger or by lifting the pot.</p>
<p><b>Example.</b> A 12 in (30 cm) plastic pot with a bushy plant, 6 hours of sun on warm days and a Moderate wind class uses about 0.38 L a day; its buffer of about 1.25 L lasts a little over 3 days, so the advice is "check every 2–3 days". For a week away it needs a reservoir of about 2 L.</p>
<h2 id="frost-dates">Frost Date &amp; Sowing Planner</h2>
<p><b>How it calculates.</b> It takes the last spring and first fall freeze dates of one of 53 U.S. stations from NOAA's 1991–2020 climate normals, or the dates you enter, and adds the offsets a Colorado State University Extension guide gives for four frost classes of vegetables: hardy crops 2–4 weeks before the last frost, semi-hardy 0–2 weeks before, tender crops around it and very tender crops two weeks after. Indoor sowing dates are the planting date minus the age of a transplant.</p>
<p><b>Limits.</b> The dates are the earliest by frost alone; soil temperature and settled weather decide, and a station at an airport is not your balcony. Places without freezes get no schedule.</p>
${frostExample.replace('<b>Worked example.</b>', '<b>Example.</b>')}</div></article>` });

// plant profiles hub
pages.push({ path: '/plants/', kind: 'index', ads: false, modified: EW_ISO, title: 'Balcony plant profiles: sun hours, pot weight, wind and winter', description: 'Ten balcony plant profiles, from geraniums and lavender to cherry tomatoes and hydrangeas: sun hours, pot size and wet weight, wind, water and winter.',
  crumbs: [['Home', '/'], ['Plant profiles', '/plants/']],
  html: `<article style="max-width:none"><span class="kicker">Plant profiles</span><h1>Balcony plant profiles</h1><p class="lede" style="max-width:70ch">Ten plants that people most often grow on balconies, each described for a container several floors up rather than for a garden bed: how many hours of direct sun it needs, how big and how heavy its pot gets when the mix is wet, how it copes with wind and heat, how to water and feed it and what to do with it in winter in your USDA zone.</p>
<div class="cards">${PLANTS.map(plantCard).join('')}</div>
<h2 id="compare">The ten plants side by side</h2><div class="tablewrap"><table class="data"><caption>Short version of each profile; details, sources and exceptions are on the plant pages</caption><thead><tr><th>Plant</th><th>Direct sun</th><th>Typical pot</th><th>Wind</th><th>Winter outside zones 10–11</th></tr></thead><tbody>
<tr><td><a href="/plants/geranium-pelargonium/">Geranium</a></td><td>6 h+</td><td>8–10 in or railing box</td><td>Good</td><td>Indoors, cuttings or bare-root</td></tr>
<tr><td><a href="/plants/lavender/">Lavender</a></td><td>6–8 h+</td><td>12–14 in, porous</td><td>Good</td><td>${potBand('lavender')}</td></tr>
<tr><td><a href="/plants/petunia/">Petunia</a></td><td>6 h+</td><td>10–12 in, basket, box</td><td>Moderate</td><td>Grown as an annual</td></tr>
<tr><td><a href="/plants/rosemary/">Rosemary</a></td><td>6–8 h+</td><td>12–16 in</td><td>Good</td><td>${potBand('rosemary')}; colder: cool and bright indoors</td></tr>
<tr><td><a href="/plants/strawberry/">Strawberry</a></td><td>6–8 h</td><td>8 in per plant, rail box</td><td>Good</td><td>Pots grouped and wrapped, or replant</td></tr>
<tr><td><a href="/plants/cherry-tomato/">Cherry tomato</a></td><td>6–8 h</td><td>2–10 gal by type</td><td>Moderate, staked</td><td>Annual</td></tr>
<tr><td><a href="/plants/basil/">Basil</a></td><td>6–8 h</td><td>8 in+</td><td>Poor</td><td>Annual</td></tr>
<tr><td><a href="/plants/fuchsia/">Fuchsia</a></td><td>0–4 h morning</td><td>12–14 in basket</td><td>Poor to moderate</td><td>Cool, frost-free, 45–50 °F</td></tr>
<tr><td><a href="/plants/hydrangea/">Hydrangea</a></td><td>3–5 h morning (bigleaf)</td><td>16–18 in+</td><td>Poor</td><td>Depends on type; buds need protection</td></tr>
<tr><td><a href="/plants/ornamental-grasses/">Grasses</a></td><td>6 h+ (shade types less)</td><td>10–18 in by size</td><td>Very good</td><td>Choose a grass two zones hardier</td></tr>
</tbody></table></div>
<div style="max-width:70ch"><h2 id="how-to-use">How to use the profiles</h2><p>Start with the light. Each profile gives the direct sun hours the plant needs; the <a href="/tools/sun-hours/">Sun &amp; Shade Simulator</a> tells you which spot on your balcony – railing, middle or back wall – reaches them in which month. Sun lovers such as lavender, rosemary, petunias and tomatoes almost always belong at the railing; fuchsias and bigleaf hydrangeas prefer the shadier back or an east- or north-facing balcony.</p>
<p>Then check the weight. The profiles state the wet weight of typical pot sizes as calculated by the <a href="/tools/pot-weight/">Pot Weight Planner</a> for standard potting mix, because a single large tomato or hydrangea pot can weigh more than a person can lift. Wind and watering follow: the <a href="/tools/wind-check/">Wind Exposure Check</a> sorts your balcony into one of four classes that the profiles refer to, and the <a href="/tools/watering-planner/">Watering &amp; Holiday Planner</a> estimates how often each pot needs water.</p>
<p>Winter advice is given by USDA hardiness zone. A plant in a pot is more exposed than the same plant in the ground, so the profiles follow the extension advice to plan for about two zones colder. Every profile lists its sources – university extension services and the Missouri Botanical Garden – at the end.</p>
<h2 id="reference">Beyond the ten profiles</h2><p>The <a href="/plants/reference/">crop and plant reference</a> lists 33 container crops with the frost class, planting rule, pot size and light figure that university extension services publish for them, plus the wet weight of the smallest suitable container. Set your USDA zone there and the winter table tells you for each overwintered plant whether the two-zone margin holds on your balcony.</p></div></article>` });

// crop and plant reference (static tables from data.js; the filter only hides rows)
{
  const D = BBData, P = BBPlan;
  const w = (k, wet) => { const x = P.containerWeight(D.CONTAINERS[k].gal, wet); return `${x.lb[0].toFixed(0)}–${x.lb[1].toFixed(0)} lb (${x.kg[0].toFixed(0)}–${x.kg[1].toFixed(0)} kg)`; };
  const cropRows = D.CROPS.map((c) => {
    const cls = c[2] ? D.CLASSES[c[2]] : null, season = cls ? cls.season : 'none', light = D.LIGHT_NAMED[c[0]] ? D.LIGHT[D.LIGHT_NAMED[c[0]]] : null;
    const cont = c[6].length ? c[6].map((k) => `${D.CONTAINERS[k].name}: ${D.CONTAINERS[k].gal[0]}–${D.CONTAINERS[k].gal[1]} gal, ${D.CONTAINERS[k].depth[0]}–${D.CONTAINERS[k].depth[1]} in deep`).join('<br>or ') : 'no size group named';
    const wt = c[6].length ? c[6].map((k) => w(k, 0.75)).join('<br>or ') : '–';
    return `<tr data-season="${season}" data-size="${c[6].join(' ')}" data-min="${light ? light[0] : ''}"><th scope="row">${esc(c[1])}</th><td>${cls ? cls.name + ' (' + cls.season + '-season)' : 'not in the source'}</td><td>${cls ? esc(cls.rule) : '–'}</td><td>${c[5] ? c[5][0] + '–' + c[5][1] + ' weeks' : (cls ? 'none given' : '–')}</td><td>${c[3] == null ? '–' : c[3] + (c[4] ? ' (from transplanting)' : '')}</td><td>${light ? light[0] + '–' + light[1] + ' h' : 'not given'}</td><td>${cont}</td><td>${wt}</td><td>${esc(c[7]) || ''}</td></tr>`;
  }).join('\n');
  const perRows = D.PERENNIALS.map((r, i) => `<tr data-i="${i}"><th scope="row"><a href="/plants/${r[3]}/">${esc(r[0])}</a></th><td>${r[1]}–${r[2]}</td><td>${r[5] > 13 ? 'never without shelter' : `zone ${r[5]} and warmer`}</td><td>${r[5] > 13 ? `zone ${r[6]} and warmer` : r[5] - 1 === r[6] ? `zone ${r[6]}` : `zones ${r[6]}–${r[5] - 1}`}</td><td data-winter>Choose your zone above</td><td>${esc(r[4])}</td></tr>`).join('\n');
  const contRows = ['L', 'M', 'S'].map((k) => { const c = D.CONTAINERS[k], x = P.containerWeight(c.gal, 0.75); return `<tr><th scope="row">${c.name}</th><td>${c.gal[0]}–${c.gal[1]} gal (${x.litres[0].toFixed(0)}–${x.litres[1].toFixed(0)} L)</td><td>${c.depth[0]}–${c.depth[1]} in (${(c.depth[0] * 2.54).toFixed(0)}–${(c.depth[1] * 2.54).toFixed(0)} cm)</td><td>${w(k, 0.6)}</td><td>${w(k, 0.75)}</td></tr>`; }).join('\n');
  const zoneRows = Array.from({ length: 13 }, (_, i) => { const lo = -60 + i * 10, c = (f) => ((f - 32) * 5 / 9).toFixed(1); return `<tr><th scope="row">${i + 1}</th><td>${lo} to ${lo + 10} °F</td><td>${c(lo)} to ${c(lo + 10)} °C</td><td>${i + 1}a: ${lo} to ${lo + 5} °F · ${i + 1}b: ${lo + 5} to ${lo + 10} °F</td></tr>`; }).join('\n');
  // cross-check of the weight model against the one figure UMD states
  const big = BBCalc.potWeight({ shape: 'round', top: 50.8, bottom: 40.6, height: 45.7, material: 'plastic', mix: 'potting' });
  const html = `<article style="max-width:none"><span class="kicker">${REFMETA.kicker}</span><h1>${esc(REFMETA.h1)}</h1>
<div style="max-width:74ch"><p class="lede">Which crop needs which pot, how much sun, and when can it go out? This page puts the figures two university extension services publish into one table, adds what the smallest suitable container weighs when wet, and checks overwintered plants against your USDA zone. Every column names its source; where a source is silent, the cell says so.</p></div>
${FORMS.reference}
<h2 id="crops">Container crops: frost class, planting rule, pot size, light and weight</h2>
<div class="tablewrap"><table class="data wide" id="ref-crops"><caption>33 crops. Frost class, planting rule, transplant age and days to harvest: Colorado State University Extension. Light and container: University of Maryland Extension. Wet weight: this site's arithmetic at 0.75 kg per litre of standard potting mix, without pot and plant.</caption>
<thead><tr><th>Crop</th><th>Frost class</th><th>Plant or sow outdoors</th><th>Age of transplant</th><th>Typical days to harvest</th><th>Direct sun per day</th><th>Smallest container</th><th>Wet mix in it</th><th>Note</th></tr></thead>
<tbody>
${cropRows}
</tbody></table></div>
<div style="max-width:74ch">
<p><b>How to read it.</b> The frost class says how the crop relates to the last spring frost; the <a href="/tools/frost-dates/">Frost Date &amp; Sowing Planner</a> turns the rule into calendar dates for your city. The light column carries the two figures University of Maryland Extension gives for container vegetables: 6–8 hours of direct sun for warm-season crops, naming tomato, pepper, eggplant and squash, and 3–5 hours for cool-season crops, naming lettuce, spinach and Asian greens. Only the crops Maryland names have a figure in the table; for every other row the cell says "not given" rather than assuming that, say, potatoes or broccoli manage on the hours of a lettuce. Enter the hours the <a href="/tools/sun-hours/">Sun &amp; Shade Simulator</a> gives for your spot and the table keeps the rows whose figure starts at or below them; rows without a figure are hidden while that filter is set.</p>
<p>Herbs and strawberries have a container size in the Maryland list but no frost class in the Colorado guide, so those cells stay empty rather than being filled from memory. The ten <a href="/plants/">plant profiles</a> cover basil, rosemary, lavender and strawberries in detail.</p>
</div>
<h2 id="containers">The three container groups and what they weigh</h2>
<div class="tablewrap"><table class="data"><caption>Container groups of University of Maryland Extension with the wet weight of the growing media alone (this site's arithmetic)</caption>
<thead><tr><th>Group</th><th>Growing media</th><th>Depth</th><th>Wet, lightweight mix (0.6 kg/L)</th><th>Wet, standard mix (0.75 kg/L)</th></tr></thead>
<tbody>
${contRows}
</tbody></table></div>
<div style="max-width:74ch">
<p>Maryland lists three sizes outside the groups: potatoes need 30 gallons of potting mix, dwarf fruit trees 25–30 gallons and shrubs 25 gallons; strawberries need a depth of 8 inches. Thirty gallons of wet standard mix weigh about ${(30 * P.GAL * 0.75 * P.LB).toFixed(0)} lb (${(30 * P.GAL * 0.75).toFixed(0)} kg) before the container – a load to clear with the building first.</p>
<p><b>Cross-check.</b> The same Maryland pages state that a 20-inch container filled with moist growing medium and plants "can weigh 100 lbs". The <a href="/tools/pot-weight/">Pot Weight Planner</a> gives ${(big.eachKg * P.LB).toFixed(0)} lb (${big.eachKg.toFixed(0)} kg) for a round plastic pot 20 in across the top, 16 in at the base and 18 in tall in standard mix, without the plant (${big.soilL.toFixed(0)} L of mix). The two figures agree in size; the planner's is higher because this pot is deep, and it shows why the weight has to be worked out per pot rather than guessed.</p>
</div>
<h2 id="winter">Plants kept over winter: does the two-zone margin hold?</h2>
<div class="tablewrap"><table class="data" id="ref-perennials"><caption>USDA zones for the plant in the ground as cited on the profile page, and the zones in which the pot can stay outside – never less cautious than Penn State Extension's "go two zones colder"</caption>
<thead><tr><th>Plant</th><th>Zones in the ground</th><th>In a pot, outside without extra care</th><th>In a pot, with shelter and wrapping</th><th>On your balcony</th><th>Note</th></tr></thead>
<tbody>
${perRows}
</tbody></table></div>
<div style="max-width:74ch">
<p>The rule behind the table: the USDA zone of a plant describes it growing in the ground. Penn State Extension points out that the roots of a container plant above ground can be as cold as the winter air and advises choosing plants rated two zones colder than your own, in larger pots and with some protection. No row here is less cautious than that: a pot is listed as staying outside only where the zone is at least two above the plant's coldest zone. Where the sources of a profile are more cautious still, the table follows them – English lavender is rated to zone 5, yet a pot stays out unprotected only from zone 8, because wet, cold roots kill it; a bigleaf hydrangea is never left without shelter, because its flower buds are less hardy than the plant. The middle column is the band in which the profile describes shelter against the wall and a wrapped pot; see <a href="/guides/overwintering-balcony-plants/">overwintering balcony plants</a>.</p>
<p>These zone bands are stored once, in the site's data file. The profiles of lavender and rosemary, the overwintering guide, the plant overview and this table all print them from there, and the build fails if a page is missing them.</p>
<p>The ground zones were taken from this site's plant profiles, where each is traced to its source (mostly the Missouri Botanical Garden Plant Finder). They were checked when the profiles were published on November 4, 2026; the Plant Finder could not be reached again from our build environment on November 18, so that check was not repeated.</p>
</div>
<h2 id="zones">USDA hardiness zones in degrees</h2>
<div class="tablewrap"><table class="data"><caption>Zone bands by average annual extreme minimum temperature (USDA Plant Hardiness Zone Map 2023, based on 1991–2020)</caption>
<thead><tr><th>Zone</th><th>°F</th><th>°C</th><th>Half zones</th></tr></thead>
<tbody>
${zoneRows}
</tbody></table></div>
<div style="max-width:74ch">
<p>A zone says how cold the coldest night of an average year gets, nothing about summer heat, frost dates or light. The U.S. map is searchable by ZIP code at <a href="https://planthardiness.ars.usda.gov/" rel="noopener">planthardiness.ars.usda.gov</a>; Canada publishes its own map. Outside North America, find the average of the lowest temperature of each winter for your place and read the zone from the table.</p>
<h2 id="method">How this page was compiled</h2>
<p>The crop figures were copied by hand from the two extension publications on November 18, 2026 into one data file, which both this page and the frost planner read; an automated test checks that every crop row has a valid class and container group and that the weights on the page equal volume times wet weight. Nothing in the tables comes from our own growing trials – we have none. Where the sources give a range, the table keeps the range.</p>
<p>What is missing: variety differences (a dwarf tomato and a tall one share a row), flowers, and crops that neither source lists. Days to harvest are Colorado figures for open ground. If you find an error, <a href="/contact/">tell us</a> which row and which source.</p>
<h2 id="sources">Sources</h2>
<ul>
<li>Colorado State University Extension, GardenNotes #720, <a href="https://extension.colostate.edu/resource/vegetable-planting-guide/" rel="noopener">Vegetable Planting Guide</a> (reviewed September 2024). Read in full on November 18, 2026.</li>
<li>University of Maryland Extension, <a href="https://extension.umd.edu/resource/types-containers-growing-vegetables" rel="noopener">Types of Containers for Growing Vegetables</a> (updated February 20, 2023) and <a href="https://extension.umd.edu/resource/growing-vegetables-containers" rel="noopener">Growing Vegetables in Containers</a> (updated March 23, 2026). Read in full on November 18, 2026.</li>
<li>Penn State Extension, <a href="https://extension.psu.edu/overwintering-plants-in-containers" rel="noopener">Overwintering Plants in Containers</a>. Read on November 18, 2026.</li>
<li>USDA Agricultural Research Service, <a href="https://planthardiness.ars.usda.gov/" rel="noopener">USDA Plant Hardiness Zone Map, 2023</a>; background on the 1991–2020 basis and zones 12 and 13 from its <a href="https://planthardiness.ars.usda.gov/pages/map-creation" rel="noopener">map creation page</a>. Read on November 18, 2026.</li>
</ul>
${relatedCards(['tools/frost-dates', 'tools/sun-hours', 'tools/pot-weight'])}
<p class="reviewed">Published: ${EW}. Found an error? <a href="/contact/">Tell us</a>.</p></div></article>`;
  pages.push({ path: '/plants/reference/', kind: 'tool', ads: true, modified: EW_ISO, title: REFMETA.title, description: REFMETA.description, html, navCurrent: '/plants/', scripts: ['data.js', 'plan.js', 'tools.js'],
    crumbs: [['Home', '/'], ['Plant profiles', '/plants/'], ['Reference', '/plants/reference/']],
    schema: [{ '@type': 'Dataset', name: REFMETA.h1, description: REFMETA.description, url: `${SITE}/plants/reference/`, inLanguage: 'en', dateModified: EW_ISO, creator: { '@type': 'Organization', name: 'AdStern – Agentur für digitales Marketing', url: SITE + '/about/' }, isBasedOn: ['https://extension.colostate.edu/resource/vegetable-planting-guide/', 'https://extension.umd.edu/resource/types-containers-growing-vegetables'] }] });
}


// home, about, legal
const home = HOME({ GROUPS, GUIDEMETA, TOOLMETA, TOOLS, esc, QUICK: FORMS.quick });
home.html = home.html.replace('<section style="max-width:74ch"><h2 id="why">', `<h2 id="plants">Plant profiles</h2><div class="cards">${PLANTS.slice(0, 6).map(plantCard).join('')}</div>\n<p><a href="/plants/">All ten plant profiles →</a> · <a href="/plants/reference/">Crop and plant reference: 33 container crops →</a></p>\n<section style="max-width:74ch"><h2 id="why">`);
if (!home.html.includes('id="plants"')) throw new Error('home: plant block not placed');
pages.push({ ...home, path: '/', kind: 'home', ads: false, modified: EW_ISO, scripts: ['sun.js', 'plan.js', 'tools.js'], crumbs: [['Home', '/']],
  schema: [{ '@type': 'WebSite', name: NAME, url: SITE + '/', inLanguage: 'en' }] });
for (const p of STATIC_PAGES) pages.push({ ...p, kind: 'static', ads: false });

for (const p of pages) write(path.join(p.path, 'index.html'), layout(p));

// 404
write('404.html', layout({ path: '/404.html', kind: 'static', ads: false, noindex: true, title: 'Page not found – ' + NAME, description: 'This page does not exist.', crumbs: [['Home', '/'], ['Not found', '/404.html']],
  html: `<article><h1>This page does not exist</h1><p class="lede">The address may have changed when the site was rebuilt in October 2026.</p><p>Try the <a href="/tools/sun-hours/">Sun &amp; Shade Simulator</a>, the <a href="/guides/">list of all guides</a> or the <a href="/">home page</a>.</p></article>` }).replace(/<link rel="canonical"[^>]*>\n/, ''));

// old addresses → new (static hosting: noindex page with refresh + canonical)
const REDIRECTS = { 'about.html': '/about/', 'imprint.html': '/imprint/', 'privacy.html': '/privacy/', 'advertise.html': '/contact/', 'contact.html': '/contact/',
  // old tool pages still in Google's index (Nov 2026) → the tools that replaced them
  'pot-planner.html': '/tools/pot-weight/', 'sun-diary.html': '/tools/sun-hours/',
  // November 18, 2026: the month-by-month calendar guide was replaced by the frost planner
  'guides/balcony-calendar/index.html': '/tools/frost-dates/' };
for (const [from, to] of Object.entries(REDIRECTS)) {
  if (!to) continue;
  write(from, `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Moved – ${NAME}</title><meta name="robots" content="noindex, follow"><link rel="canonical" href="${SITE}${to}"><meta http-equiv="refresh" content="0; url=${to}"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:system-ui,sans-serif;background:#EDF1E8;color:#1F3328;margin:0;padding:3rem 16px}a{color:#2F5D45}</style></head>
<body><p>This page has moved: <a href="${to}">${SITE}${to}</a></p></body></html>
`);
}

// sitemap, robots, ads.txt, CNAME, favicon
const indexable = pages.filter((p) => !p.noindex);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((p) => `  <url><loc>${SITE}${p.path}</loc><lastmod>${p.modified || REVIEWED_ISO}</lastmod></url>`).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
write('ads.txt', `google.com, pub-7811071715414905, DIRECT, f08c47fec0942fa0\n`);
write('CNAME', 'balconybloomguide.com'); // no trailing newline: identical to the CNAME on main
write('.nojekyll', '');
write('favicon.svg', ICON.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace(' aria-hidden="true"', '') + '\n');

// report
const report = pages.map((p) => ({ path: p.path, words: strip(p.html).split(/\s+/).filter(Boolean).length }));
fs.writeFileSync(path.join(ROOT, 'build-report.json'), JSON.stringify({ pages: pages.length, report }, null, 1));
console.log(`built ${pages.length} pages + 404 + redirects`);
