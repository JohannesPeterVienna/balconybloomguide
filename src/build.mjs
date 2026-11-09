// Balcony Bloom Guide – static site build. `node src/build.mjs` regenerates docs/ (except assets/).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FORMS } from './forms.mjs';
import { STATIC_PAGES, HOME } from './pages.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
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
const V = '20261105c';
// Guides corrected on November 4 (rosemary hardiness aligned with the plant profile).
const GUIDES_CHANGED = ['windy-balcony-plants', 'south-facing-balcony-plants', 'overwintering-balcony-plants'];
// Pages that never load the AdSense script (legal and contact pages, 404).
const NO_LOADER = ['/imprint/', '/privacy/', '/contact/'];
// …and there no Google code at all: no ads, no analytics; “Privacy settings” opens the interim statistics window.
const googleOff = (pg) => !!pg.noindex || NO_LOADER.includes(pg.path);

export const GROUPS = [
  { key: 'sun', name: 'Sun & orientation', slugs: ['east-facing-balcony-plants', 'west-facing-balcony-plants', 'north-facing-balcony-plants', 'south-facing-balcony-plants'] },
  { key: 'load', name: 'Weight, wind & railings', slugs: ['balcony-weight-limit-planters', 'windy-balcony-plants', 'railing-planters', 'lightweight-potting-mix'] },
  { key: 'grow', name: 'What to grow', slugs: ['balcony-herb-garden-part-shade', 'balcony-tomatoes', 'strawberries-hanging-baskets-rail-boxes', 'balcony-privacy-plants'] },
  { key: 'care', name: 'Care & seasons', slugs: ['watering-balcony-plants-summer', 'self-watering-containers-holiday', 'overwintering-balcony-plants', 'balcony-calendar', 'balcony-garden-renters'] }
];
export const TOOLS = ['sun-hours', 'pot-weight', 'wind-check', 'watering-planner'];
export const PLANTS = [
  ['geranium-pelargonium', 'Geranium (Pelargonium)'], ['lavender', 'Lavender'], ['petunia', 'Petunia'], ['rosemary', 'Rosemary'],
  ['strawberry', 'Strawberry'], ['cherry-tomato', 'Cherry tomato'], ['basil', 'Basil'], ['fuchsia', 'Fuchsia'],
  ['hydrangea', 'Hydrangea (in a pot)'], ['ornamental-grasses', 'Ornamental grasses']
];
const TOOL_SHORT = { 'sun-hours': 'Sun & Shade Simulator', 'pot-weight': 'Pot Weight Planner', 'wind-check': 'Wind Exposure Check', 'watering-planner': 'Watering & Holiday Planner' };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = (h) => h.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');

function readFragment(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^<!--meta\s*([\s\S]*?)-->\s*/);
  if (!m) throw new Error('no meta block in ' + file);
  return { meta: JSON.parse(m[1]), body: raw.slice(m[0].length).trim() };
}

// Google cuts titles at ~60–65 characters: drop the site name if the title gets too long
const kurzTitel = (t) => (t.length > 65 ? t.replace(/\s[–|-]\s(Balcony Bloom Guide)$/, '') : t);
const ICON = `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#1A1A1A"/><circle cx="27" cy="13" r="6" fill="#E2A022"/><path d="M8 31h24" stroke="#F7F6F2" stroke-width="2"/><path d="M11 31v-4h18v4" fill="#46588F"/><path d="M15 27c0-5 2-8 5-10M20 27c0-4 3-6 6-7M17 21c-2-1-4-1-6 0 2 2 4 2 6 0z" stroke="#9CC3A8" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>`;

function nav(current) {
  const items = [['/', 'Home'], ['/tools/sun-hours/', 'Sun simulator'], ['/tools/pot-weight/', 'Pot weight'], ['/tools/wind-check/', 'Wind check'], ['/tools/watering-planner/', 'Watering'], ['/plants/', 'Plants'], ['/guides/', 'Guides'], ['/about/', 'About']];
  return `<nav class="main" aria-label="Main"><div class="wrap"><ul>${items.map(([h, t]) => `<li><a href="${h}"${h === current ? ' aria-current="page"' : ''}>${t}</a></li>`).join('')}</ul></div></nav>`;
}

function footer() {
  const g = (s) => `<li><a href="/guides/${s}/">${esc(TITLES[s])}</a></li>`;
  return `<footer class="foot"><div class="wrap"><div class="cols">
<div><h2>${NAME}</h2><p>Balcony gardening that starts from your balcony: its direction, the slab above, the wind and the weight it carries.</p><p>Information for planning only – not structural, legal or safety advice.</p></div>
<div><h2>Tools</h2><ul>${TOOLS.map((t) => `<li><a href="/tools/${t}/">${TOOL_SHORT[t]}</a></li>`).join('')}</ul></div>
<div><h2>Plant profiles</h2><ul>${PLANTS.slice(0, 5).map(([s, n]) => `<li><a href="/plants/${s}/">${esc(n)}</a></li>`).join('')}<li><a href="/plants/">All plant profiles</a></li></ul></div>
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
    const meta = isTool ? TOOLMETA[slug] : isPlant ? PLANTMETA[slug] : GUIDEMETA[slug];
    if (!meta) throw new Error('unknown related ' + r);
    return `<a class="card" href="${href}"><span class="k">${isTool ? 'Tool' : esc(meta.kicker)}</span><h3>${esc(meta.h1)}</h3><p>${esc(meta.description)}</p></a>`;
  }).join('')}</div>`;
}

function enhance(body) {
  return body
    .replace(/<!--ad-->/g, AD('inline'))
    .replace(/<table class="data">([\s\S]*?)<\/table>/g, '<div class="tablewrap"><table class="data">$1</table></div>');
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
  const [lede, rest] = firstParaSplit(enhance(guideBodies[s]));
  const faq = faqFrom(guideBodies[s]);
  const html = `<div class="layout with-side"><article>
<span class="kicker">${esc(m.kicker)}</span>
<h1>${esc(m.h1)}</h1>
${lede}
<div id="profile" class="profilebox" hidden></div>
${AD('top')}
${rest}
${relatedCards(m.related)}
<p class="reviewed">Last reviewed: ${GUIDES_CHANGED.includes(s) ? UPDATED : REVIEWED}. Found an error? <a href="/contact/">Tell us</a>.</p>
</article><aside class="side" aria-label="Advertisement">${AD('side')}</aside></div>`;
  pages.push({ path: `/guides/${s}/`, kind: 'guide', ads: true, ...(GUIDES_CHANGED.includes(s) ? { modified: UPDATED_ISO } : {}), title: m.title, description: m.description, html, navCurrent: '/guides/',
    crumbs: [['Home', '/'], ['Guides', '/guides/'], [m.h1, `/guides/${s}/`]],
    schema: [{ '@type': 'Article', headline: m.h1, description: m.description, datePublished: PUBLISHED_ISO, dateModified: GUIDES_CHANGED.includes(s) ? UPDATED_ISO : REVIEWED_ISO, inLanguage: 'en', mainEntityOfPage: `${SITE}/guides/${s}/`, publisher: { '@type': 'Organization', name: 'AdStern – Agentur für digitales Marketing', url: SITE + '/about/' } }, faq].filter(Boolean) });
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
<p class="reviewed">Published: ${UPDATED}. Found an error? <a href="/contact/">Tell us</a>.</p>
</article><aside class="side" aria-label="Advertisement">${AD('side')}</aside></div>`;
  pages.push({ path: `/plants/${s}/`, kind: 'guide', ads: true, modified: UPDATED_ISO, title: m.title, description: m.description, html, navCurrent: '/plants/',
    crumbs: [['Home', '/'], ['Plant profiles', '/plants/'], [short, `/plants/${s}/`]],
    schema: [{ '@type': 'Article', headline: m.h1, description: m.description, datePublished: UPDATED_ISO, dateModified: UPDATED_ISO, inLanguage: 'en', mainEntityOfPage: `${SITE}/plants/${s}/`, publisher: { '@type': 'Organization', name: 'AdStern – Agentur für digitales Marketing', url: SITE + '/about/' } }, faq].filter(Boolean) });
}

// tools
const TOOL_SCRIPTS = { 'sun-hours': ['sun.js', 'tools.js'], 'pot-weight': ['calc.js', 'tools.js'], 'wind-check': ['calc.js', 'tools.js'], 'watering-planner': ['calc.js', 'sun.js', 'tools.js'] };
for (const t of TOOLS) {
  const m = TOOLMETA[t];
  const [lede, rest] = firstParaSplit(enhance(toolBodies[t]));
  const faq = faqFrom(toolBodies[t]);
  const html = `<article>
<span class="kicker">${esc(m.kicker)}</span>
<h1>${esc(m.h1)}</h1>
<div class="prose">${lede}</div>
${FORMS[t]}
<div class="prose">${afterFirstSection(rest, AD('top'))}
${relatedCards(m.related)}
<p class="reviewed">Last reviewed: ${REVIEWED}. Your inputs are stored only in this browser.</p></div>
</article>`;
  pages.push({ path: `/tools/${t}/`, kind: 'tool', ads: true, title: m.title, description: m.description, html, scripts: TOOL_SCRIPTS[t],
    crumbs: [['Home', '/'], ['Tools', '/tools/'], [TOOL_SHORT[t], `/tools/${t}/`]],
    schema: [{ '@type': 'WebApplication', name: m.h1, url: `${SITE}/tools/${t}/`, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any (web browser)', inLanguage: 'en', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }, faq].filter(Boolean) });
}

// guide + tool index pages
const plantCard = ([s]) => `<a class="card" href="/plants/${s}/"><span class="k">${esc(PLANTMETA[s].kicker)}</span><h3>${esc(PLANTMETA[s].h1)}</h3><p>${esc(PLANTMETA[s].description)}</p></a>`;
const guideCard = (s) => `<a class="card" href="/guides/${s}/"><span class="k">${esc(GUIDEMETA[s].kicker)}</span><h3>${esc(GUIDEMETA[s].h1)}</h3><p>${esc(GUIDEMETA[s].description)}</p></a>`;
const toolCard = (t) => `<a class="card" href="/tools/${t}/"><span class="k">Tool</span><h3>${esc(TOOLMETA[t].h1)}</h3><p>${esc(TOOLMETA[t].description)}</p></a>`;
pages.push({ path: '/guides/', kind: 'index', ads: false, modified: UPDATED_ISO, title: 'Balcony gardening guides by sun, weight, wind and season', description: 'All Balcony Bloom Guide articles: plants by balcony direction, weight and wind, herbs, tomatoes and strawberries in containers, watering, winter care and renting.',
  crumbs: [['Home', '/'], ['Guides', '/guides/']],
  html: `<article style="max-width:none"><span class="kicker">All guides</span><h1>Balcony guides</h1><p class="lede" style="max-width:70ch">Seventeen guides, each written for a specific balcony question. Where a number depends on your balcony – sun hours, pot weight, wind, water – the guide links to the tool that calculates it.</p>
${GROUPS.map((g) => `<h2 id="${g.key}">${g.name}</h2><div class="cards">${g.slugs.map(guideCard).join('')}</div>`).join('\n')}
<h2 id="plants">Plant profiles</h2><div class="cards">${PLANTS.map(plantCard).join('')}</div>
<h2 id="tools">Tools</h2><div class="cards">${TOOLS.map(toolCard).join('')}</div></article>` });
pages.push({ path: '/tools/', kind: 'index', ads: false, modified: UPDATED_ISO, title: 'Free balcony garden tools: sun hours, pot weight, wind, watering', description: 'Four free calculators for balcony gardeners: direct sun hours for railing and back wall, wet pot weight, wind exposure and a watering and holiday planner.',
  crumbs: [['Home', '/'], ['Tools', '/tools/']],
  html: `<article style="max-width:none"><span class="kicker">Tools</span><h1>Balcony tools</h1><p class="lede" style="max-width:70ch">Four calculators that work in your browser, without an account. They share one saved balcony profile, so the sun hours you calculate once show up on the guide pages and in the watering planner.</p><div class="cards">${TOOLS.map(toolCard).join('')}</div><div style="max-width:70ch"><h2 id="order">In which order to use them</h2><p>Start with the sun: the simulator tells you which spot on your balcony counts as full sun, part sun or shade in each month, and that decides what you can grow where. Then plan the pots: once you know which plants go where, the pot weight planner adds up what the filled containers weigh, so you can keep heavy pots near the wall and hand a data sheet to your building manager if you plan something big.</p><p>The wind check matters most above the third or fourth floor and on corners; its result also feeds the watering planner, because wind dries pots faster. The watering planner comes last, when you know the pots, their sun and the wind, and it is the one to open again before a trip.</p><p>All four are estimates built on stated assumptions. Below is what each one calculates, where its limits are and a worked example; each tool page explains the method in full under the calculator.</p>
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
<p><b>Example.</b> A 12 in (30 cm) plastic pot with a bushy plant, 6 hours of sun on warm days and a Moderate wind class uses about 0.38 L a day; its buffer of about 1.25 L lasts a little over 3 days, so the advice is "check every 2–3 days". For a week away it needs a reservoir of about 2 L.</p></div></article>` });

// plant profiles hub
pages.push({ path: '/plants/', kind: 'index', ads: false, modified: UPDATED_ISO, title: 'Balcony plant profiles: sun hours, pot weight, wind and winter', description: 'Ten balcony plant profiles, from geraniums and lavender to cherry tomatoes and hydrangeas: sun hours, pot size and wet weight, wind, water and winter.',
  crumbs: [['Home', '/'], ['Plant profiles', '/plants/']],
  html: `<article style="max-width:none"><span class="kicker">Plant profiles</span><h1>Balcony plant profiles</h1><p class="lede" style="max-width:70ch">Ten plants that people most often grow on balconies, each described for a container several floors up rather than for a garden bed: how many hours of direct sun it needs, how big and how heavy its pot gets when the mix is wet, how it copes with wind and heat, how to water and feed it and what to do with it in winter in your USDA zone.</p>
<div class="cards">${PLANTS.map(plantCard).join('')}</div>
<h2 id="compare">The ten plants side by side</h2><div class="tablewrap"><table class="data"><caption>Short version of each profile; details, sources and exceptions are on the plant pages</caption><thead><tr><th>Plant</th><th>Direct sun</th><th>Typical pot</th><th>Wind</th><th>Winter outside zones 10–11</th></tr></thead><tbody>
<tr><td><a href="/plants/geranium-pelargonium/">Geranium</a></td><td>6 h+</td><td>8–10 in or railing box</td><td>Good</td><td>Indoors, cuttings or bare-root</td></tr>
<tr><td><a href="/plants/lavender/">Lavender</a></td><td>6–8 h+</td><td>12–14 in, porous</td><td>Good</td><td>Outdoors from zone 8, sheltered in 6–7</td></tr>
<tr><td><a href="/plants/petunia/">Petunia</a></td><td>6 h+</td><td>10–12 in, basket, box</td><td>Moderate</td><td>Grown as an annual</td></tr>
<tr><td><a href="/plants/rosemary/">Rosemary</a></td><td>6–8 h+</td><td>12–16 in</td><td>Good</td><td>Outdoors from zone 9; zone 8 sheltered and wrapped, in during hard frost; zone 7 and colder cool and bright indoors</td></tr>
<tr><td><a href="/plants/strawberry/">Strawberry</a></td><td>6–8 h</td><td>8 in per plant, rail box</td><td>Good</td><td>Pots grouped and wrapped, or replant</td></tr>
<tr><td><a href="/plants/cherry-tomato/">Cherry tomato</a></td><td>6–8 h</td><td>2–10 gal by type</td><td>Moderate, staked</td><td>Annual</td></tr>
<tr><td><a href="/plants/basil/">Basil</a></td><td>6–8 h</td><td>8 in+</td><td>Poor</td><td>Annual</td></tr>
<tr><td><a href="/plants/fuchsia/">Fuchsia</a></td><td>0–4 h morning</td><td>12–14 in basket</td><td>Poor to moderate</td><td>Cool, frost-free, 45–50 °F</td></tr>
<tr><td><a href="/plants/hydrangea/">Hydrangea</a></td><td>3–5 h morning (bigleaf)</td><td>16–18 in+</td><td>Poor</td><td>Depends on type; buds need protection</td></tr>
<tr><td><a href="/plants/ornamental-grasses/">Grasses</a></td><td>6 h+ (shade types less)</td><td>10–18 in by size</td><td>Very good</td><td>Choose a grass two zones hardier</td></tr>
</tbody></table></div>
<div style="max-width:70ch"><h2 id="how-to-use">How to use the profiles</h2><p>Start with the light. Each profile gives the direct sun hours the plant needs; the <a href="/tools/sun-hours/">Sun &amp; Shade Simulator</a> tells you which spot on your balcony – railing, middle or back wall – reaches them in which month. Sun lovers such as lavender, rosemary, petunias and tomatoes almost always belong at the railing; fuchsias and bigleaf hydrangeas prefer the shadier back or an east- or north-facing balcony.</p>
<p>Then check the weight. The profiles state the wet weight of typical pot sizes as calculated by the <a href="/tools/pot-weight/">Pot Weight Planner</a> for standard potting mix, because a single large tomato or hydrangea pot can weigh more than a person can lift. Wind and watering follow: the <a href="/tools/wind-check/">Wind Exposure Check</a> sorts your balcony into one of four classes that the profiles refer to, and the <a href="/tools/watering-planner/">Watering &amp; Holiday Planner</a> estimates how often each pot needs water.</p>
<p>Winter advice is given by USDA hardiness zone. A plant in a pot is more exposed than the same plant in the ground, so the profiles follow the extension advice to plan for about two zones colder. Every profile lists its sources – university extension services and the Missouri Botanical Garden – at the end.</p></div></article>` });

// home, about, legal
const home = HOME({ GROUPS, GUIDEMETA, TOOLMETA, TOOLS, esc });
home.html = home.html.replace('<section style="max-width:74ch"><h2 id="why">', `<h2 id="plants">Plant profiles</h2><div class="cards">${PLANTS.slice(0, 6).map(plantCard).join('')}</div>\n<p><a href="/plants/">All ten plant profiles →</a></p>\n<section style="max-width:74ch"><h2 id="why">`);
if (!home.html.includes('id="plants"')) throw new Error('home: plant block not placed');
pages.push({ ...home, path: '/', kind: 'home', ads: false, modified: UPDATED_ISO, crumbs: [['Home', '/']],
  schema: [{ '@type': 'WebSite', name: NAME, url: SITE + '/', inLanguage: 'en' }] });
for (const p of STATIC_PAGES) pages.push({ ...p, kind: 'static', ads: false });

for (const p of pages) write(path.join(p.path, 'index.html'), layout(p));

// 404
write('404.html', layout({ path: '/404.html', kind: 'static', ads: false, noindex: true, title: 'Page not found – ' + NAME, description: 'This page does not exist.', crumbs: [['Home', '/'], ['Not found', '/404.html']],
  html: `<article><h1>This page does not exist</h1><p class="lede">The address may have changed when the site was rebuilt in October 2026.</p><p>Try the <a href="/tools/sun-hours/">Sun &amp; Shade Simulator</a>, the <a href="/guides/">list of all guides</a> or the <a href="/">home page</a>.</p></article>` }).replace(/<link rel="canonical"[^>]*>\n/, ''));

// old addresses → new (static hosting: noindex page with refresh + canonical)
const REDIRECTS = { 'about.html': '/about/', 'imprint.html': '/imprint/', 'privacy.html': '/privacy/', 'advertise.html': '/contact/', 'contact.html': '/contact/',
  // old tool pages still in Google's index (Nov 2026) → the tools that replaced them
  'pot-planner.html': '/tools/pot-weight/', 'sun-diary.html': '/tools/sun-hours/' };
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
