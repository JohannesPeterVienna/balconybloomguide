// Home, About, Imprint, Privacy, Contact for balconybloomguide.com (written for this site only).
const RIS = 'https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10007517';
const legal = (kicker, h1, inner, updated = 'October 31, 2026') => `<article><span class="kicker">${kicker}</span><h1>${h1}</h1>${inner}<p class="reviewed">Last updated: ${updated}</p></article>`;

export function HOME({ GROUPS, GUIDEMETA, TOOLMETA, TOOLS, esc }) {
  const card = (s) => `<a class="card" href="/guides/${s}/"><span class="k">${esc(GUIDEMETA[s].kicker)}</span><h3>${esc(GUIDEMETA[s].h1)}</h3><p>${esc(GUIDEMETA[s].description)}</p></a>`;
  const sketch = `<figure><svg viewBox="0 0 640 260" role="img" aria-labelledby="home-fig-t"><title id="home-fig-t">Cross-section of a balcony: the slab above shades the back wall while the railing still gets sun</title>
<rect class="s-paper" x="0" y="0" width="640" height="260"/>
<rect class="s-moss" x="40" y="30" width="26" height="210"/>
<rect class="s-moss" x="66" y="30" width="300" height="16"/>
<rect class="s-moss" x="66" y="224" width="300" height="16"/>
<path class="s-line" d="M352 224v-92h14v92"/>
<polygon class="s-shade" points="66,46 66,224 230,224"/>
<path class="s-sunline" d="M600 30 L366 46"/>
<path class="s-sunline" d="M600 30 L359 132"/>
<path class="s-sunline" d="M600 30 L250 224"/>
<circle class="s-sun" cx="600" cy="30" r="22"/>
<text class="s-text" x="372" y="128">railing</text>
<text class="s-text" x="236" y="214">middle</text>
<text class="s-text" x="80" y="214" style="fill:#fff">back wall</text>
<text class="s-small" x="80" y="66">slab of the balcony above</text>
</svg><figcaption>Same balcony, three spots: a box on the railing, a pot in the middle and one against the back wall can differ by several hours of direct sun a day. The Sun &amp; Shade Simulator calculates all three for every month.</figcaption></figure>`;
  return {
    title: 'Balcony Bloom Guide – sun hours, pot weight and plants that fit',
    description: 'Calculate direct sun for your railing and back wall, the wet weight of your pots and your wind exposure, then pick plants that fit the balcony you have.',
    html: `<section style="max-width:76ch;margin:0 auto;text-align:center;padding-top:10px">
<span class="kicker">The balcony almanac</span>
<h1>How much sun does your railing really get?</h1>
<p class="lede">Plant labels say “full sun” or “part shade”. A balcony has both, a few feet apart: the slab of the balcony above, the side walls and the building across the street decide which spot gets six hours and which gets two. Balcony Bloom Guide calculates it for your balcony – then helps with weight, wind and water.</p>
<p class="row" style="justify-content:center"><a class="btn sun" href="/tools/sun-hours/">Calculate my sun hours</a><a class="btn ghost" href="/guides/">Browse the guides</a></p>
</section>
${sketch}
<section class="band" aria-labelledby="band-h"><h2 id="band-h">Four questions for your balcony</h2><ol class="q">
<li><a href="/tools/sun-hours/">How many hours of direct sun</a> reach the railing, the middle and the back wall – in June and in October?</li>
<li><a href="/tools/pot-weight/">How heavy are my pots</a> when the mix is wet – and what do I hand to the building manager?</li>
<li><a href="/tools/wind-check/">How windy is it up here</a>, and which pots, fixings and plants cope?</li>
<li><a href="/tools/watering-planner/">How often do I water</a> – and how big a reservoir do I need for a week away?</li>
</ol></section>
<section class="vorteile" aria-labelledby="vt"><h2 id="vt">What you get</h2><ul>
<li><b>Sun hours for your spot</b><span>Railing, middle and back wall – calculated from your orientation, floor and the balcony above.</span></li>
<li><b>Weight you can show</b><span>Wet pot weight per square foot, ready for the building manager.</span></li>
<li><b>Wind and watering, planned</b><span>Which pots and plants cope up here, and how much water a week away needs.</span></li>
<li><b>Plants that fit</b><span>Profiles with sun hours, container size and hardiness – not just “full sun”.</span></li>
<li><b>Sources you can check</b><span>Extension services, NOAA and RHS cited on every page.</span></li>
<li><b>Free, no sign-up</b><span>Everything runs in your browser; your balcony profile stays on your device.</span></li>
</ul></section>
${GROUPS.map((g) => `<h2 id="${g.key}">${g.name}</h2><div class="cards">${g.slugs.map(card).join('')}</div>`).join('\n')}
<section style="max-width:74ch"><h2 id="why">Why start from the balcony, not the plant</h2>
<p>Most gardening advice is written for open ground. A balcony is a box hanging on a wall: the floor above cuts off the high summer sun, the side walls cut off the early and late sun, and the wind at the eighth floor is not the wind at street level. Pots hold a few gallons of mix that dry out in a day, and every gallon of wet mix weighs about six pounds.</p>
<p>So every guide on this site states which spot on the balcony it means, which numbers it relies on and where they come from. The tools work without an account; your balcony profile is stored only in your browser. Read <a href="/about/">how the calculations work and where their limits are</a>.</p></section>`
  };
}

export const STATIC_PAGES = [
  {
    path: '/about/', title: 'About Balcony Bloom Guide – method, sources and limits',
    description: 'Who publishes Balcony Bloom Guide, how the sun simulator and the weight, wind and watering tools calculate, which sources the guides rely on and what they cannot do.',
    crumbs: [['Home', '/'], ['About', '/about/']],
    html: legal('About &amp; method', 'About Balcony Bloom Guide', `<p class="lede">Balcony Bloom Guide is a gardening site for people who grow on balconies – usually in rented apartments, often several floors up, with a slab above and a building across the street. It answers questions with your balcony's numbers instead of general labels.</p>
<h2 id="who">Who publishes the site</h2>
<p>The site is published by AdStern, an advertising agency in Vienna, Austria (see the <a href="/imprint/">imprint</a>). It is financed by advertising, which can appear on guide, plant profile and tool pages as well as on the home page, the overview pages and this page; the imprint, privacy policy and contact page show none. No manufacturer or retailer pays for mentions, and the guides contain no affiliate links.</p>
<h2 id="sun">How the Sun &amp; Shade Simulator calculates</h2>
<p>The sun's position is computed with the solar position equations published by the U.S. National Oceanic and Atmospheric Administration (<a href="https://gml.noaa.gov/grad/solcalc/calcdetails.html" rel="noopener">NOAA solar calculation details</a>) for the 15th of each month, in two-minute steps. The sun counts only when it is more than 2° above the horizon. For each step, a straight line is drawn from three spots on your balcony – on the railing, in the middle and near the back wall – towards the sun. The line is checked against the planes of the balcony: the facade, the slab above, the side walls, a solid railing and, if you enter one, a building opposite modelled as a long wall. If nothing blocks the line, the spot is in direct sun.</p>
<p>The result is clear-sky geometry. It does not know about clouds, trees, awnings, plants on the railing, or reflections from light walls. On a cloudy coast the real light is lower; next to a white wall a shaded spot can be brighter than the hours suggest. The automated tests check the sun position against known values (for example the noon sun height at the June solstice) and the shading against hand-calculated cases.</p>
<h2 id="weights">Weights, wind and water</h2>
<ul><li><b>Pot weights</b> use the volume of the pot (minus 1 in or 2.5 cm of headspace) and typical wet weights of potting mixes after watering and draining – from about 0.6 kg per litre for a light peat-perlite mix to about 1.65 kg per litre for garden soil. Real mixes differ; weigh a filled bucket to calibrate. The site never says whether a balcony can carry a load.</li>
<li><b>Wind exposure</b> is a transparent points score from six questions (floor, corner position, surroundings, recess, railing, prevailing wind). It is a rule of thumb, not a measurement.</li>
<li><b>Watering</b> estimates water use from reference evaporation for the weather you choose, the sun hours, a wind factor and the leaf area of the plant, and compares it with the water a pot of that size can hold for the plant.</li></ul>
<h2 id="sources">Sources</h2>
<p>Horticultural advice follows established public sources such as the Royal Horticultural Society (<a href="https://www.rhs.org.uk/" rel="noopener">rhs.org.uk</a>), including its guidance on <a href="https://www.rhs.org.uk/garden-inspiration/garden-types/balconies-roof-gardens" rel="noopener">balconies and roof gardens</a>, U.S. university extension services such as <a href="https://extension.umn.edu/" rel="noopener">University of Minnesota Extension</a> and <a href="https://extension.psu.edu/" rel="noopener">Penn State Extension</a>, the <a href="https://planthardiness.ars.usda.gov/" rel="noopener">USDA Plant Hardiness Zone Map</a> and the <a href="https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants" rel="noopener">ASPCA list of toxic and non-toxic plants</a>. Each guide lists what it relies on.</p>
<h2 id="checks">How the content is checked</h2>
<p>Every guide was written for this site and checked in a separate fact-check pass before publication: plant hardiness and toxicity against the sources named on the page, every worked example recalculated with the same code the tools use, and every number compared across pages so that the site does not contradict itself. Each page shows the date of its last review; when a page is re-checked or corrected, that date changes.</p>
<h2 id="limits">What the site cannot do</h2>
<p>It does not replace a structural engineer, your lease or your building's rules. It cannot see your balcony: if a result contradicts what you observe – a spot that the simulator calls sunny but a tree shades every afternoon – trust your observation and enter the obstacle where you can.</p>
<h2 id="privacy">Your data</h2>
<p>Everything you enter in the tools stays in your browser (localStorage). There is no account and nothing is uploaded. Details on advertising and analytics are in the <a href="/privacy/">privacy policy</a>.</p>
<h2 id="history">History</h2>
<p>The site started in 2026 as a single page with a three-pot herb plan. It was rebuilt from scratch in October 2026 with the tools and guides you see now; the herb plan lives on, in a longer form, in the guide <a href="/guides/balcony-herb-garden-part-shade/">Balcony herb garden in part shade</a>.</p>`, 'November 4, 2026'), modified: '2026-11-04'
  },
  {
    path: '/imprint/', title: 'Imprint – Balcony Bloom Guide',
    description: 'Legal notice for balconybloomguide.com under the Austrian E-Commerce Act, Commercial Code and Media Act: publisher, business details and supervisory authority.',
    crumbs: [['Home', '/'], ['Imprint', '/imprint/']],
    html: legal('Legal notice', 'Imprint', `<p>Information pursuant to § 5 Austrian E-Commerce Act (ECG) and § 25 Austrian Media Act (MedienG).</p>
<h2 id="publisher">Publisher and media owner</h2>
<p>AdStern – Agentur für digitales Marketing<br>Seilerstätte 8/8<br>1010 Wien<br>Österreich</p>
<p>Email: <a href="mailto:office@adstern.com">office@adstern.com</a></p>
<h2 id="business">Business details</h2>
<ul><li>Line of business: advertising agency (Werbeagentur)</li>
<li>VAT identification number: ATU54682507</li>
<li>Trade authority: Magistratisches Bezirksamt für den 1./8. Bezirk, Vienna</li>
<li>Chamber membership: Vienna Chamber of Commerce (WKO Wien), Fachgruppe Werbung und Marktkommunikation</li>
<li>Trade regulations: Austrian Trade Regulation Act (Gewerbeordnung 1994), available in the <a href="${RIS}" rel="noopener">Austrian Legal Information System (RIS)</a></li></ul>
<h2 id="line">Basic editorial line (§ 25 MedienG)</h2>
<p>Balcony Bloom Guide publishes guides and free calculators for gardening on balconies. The content is general information for planning; it is not structural, legal or safety advice.</p>
<h2 id="liability">External links</h2>
<p>External links were checked when the page was published or last reviewed. We have no influence on the content of other websites and are not responsible for it.</p>
<h2 id="odr">Consumer disputes</h2>
<p>This website does not sell goods or services to consumers.</p>`)
  },
  {
    path: '/privacy/', title: 'Privacy policy – Balcony Bloom Guide',
    description: 'How balconybloomguide.com handles data: GitHub Pages hosting, Google AdSense with consent, Google Analytics, tool inputs kept in your browser, your rights.',
    crumbs: [['Home', '/'], ['Privacy', '/privacy/']],
    html: legal('Privacy', 'Privacy policy', `<p>This policy explains which data is processed when you use balconybloomguide.com, for what purpose and on which legal basis, and what rights you have.</p>
<h2 id="controller">Controller</h2>
<p>AdStern – Agentur für digitales Marketing, Seilerstätte 8/8, 1010 Wien, Österreich, <a href="mailto:office@adstern.com">office@adstern.com</a> (details in the <a href="/imprint/">imprint</a>).</p>
<h2 id="hosting">Hosting</h2>
<p>The website is a static site hosted on GitHub Pages, a service of GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA. When a page is loaded, your browser transmits technical data – IP address, requested address, date and time, browser type, referring page – to GitHub's servers, which use it to deliver the page and to protect the service and may keep it in log files for a limited period. Legal basis: our legitimate interest in a reliable and secure website (Art. 6(1)(f) GDPR). Transfers to the USA rely on the EU–U.S. Data Privacy Framework or standard contractual clauses. See the <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" rel="noopener">GitHub General Privacy Statement</a>.</p>
<h2 id="tools">Your balcony data in the tools</h2>
<p>Inputs in the Sun &amp; Shade Simulator, Pot Weight Planner, Wind Exposure Check and Watering Planner – location, balcony size, pot list – are processed only in your browser. The tools keep your inputs automatically in your browser's local storage on your device, so they are still there on your next visit; “Save as my balcony” additionally stores the calculated sun hours and wind class so that guide pages and the watering planner can use them. They are never sent to us or to third parties. You can delete them by clearing this site's data in your browser settings.</p>
<h2 id="ads">Advertising with Google AdSense</h2>
<p>This site shows advertising provided by Google AdSense, a service of Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland, and for users outside the EEA, UK and Switzerland Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA. AdSense uses cookies and similar technologies to display ads, limit how often an ad is shown, measure ad performance and prevent fraud.</p>
<p>Guide, plant profile, tool and overview pages (the home page, the guide, tool and plant overviews and About) can show advertising. The AdSense script, together with Google's consent message, is loaded on these pages; Google places ads automatically, so the number and position of ads can vary from page to page. The imprint, this privacy policy and the contact page do not load the AdSense script and show no ads; Google's consent script is loaded there only if you explicitly click “Open Google’s ad &amp; U.S. privacy choices” (see the <a href="#interim-statistics">interim statistics window</a>).</p>
<p><b>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites.</b> Google's use of advertising cookies enables it and its partners to serve ads to users based on their visits to this site and/or other sites on the internet.</p>
<p>You can opt out of personalized advertising in <a href="https://adssettings.google.com" rel="noopener">Google's Ads Settings</a>, at <a href="https://www.aboutads.info/choices/" rel="noopener">www.aboutads.info</a> or, in Europe, at <a href="https://www.youronlinechoices.eu/" rel="noopener">www.youronlinechoices.eu</a>. How Google uses information from sites that use its services is explained at <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">policies.google.com/technologies/partner-sites</a>.</p>
<p><b>Consent.</b> Visitors from the European Economic Area, the United Kingdom and Switzerland see a consent message from Google's certified consent management platform (IAB Transparency &amp; Consent Framework) before cookies or similar technologies that need consent are used. Personalized ads require your consent. Non-personalized ads, which are based on the page content and approximate location, also use cookies or identifiers for frequency capping, reporting and fraud prevention, so they too require consent to storing and accessing information on your device. Without consent, Google can show only limited ads. Limited ads are not personalised and do not use cookies or local storage for personalised advertising; Google may still use technical data, and where permitted storage, for fraud prevention and frequency limits as described in its documentation. Legal basis: your consent (Art. 6(1)(a) GDPR, § 165(3) Austrian Telecommunications Act 2021). You can change or withdraw your choice at any time with the <button type="button" class="linklike" data-privacy-settings>Privacy settings</button> link, also in the footer of every page.</p>
<h2 id="analytics">Google Analytics 4</h2>
<p>We use Google Analytics 4 (Google Ireland Limited / Google LLC) to see which guides and tools are used, so we can improve them. Before any Google script runs, Google Consent Mode is set to “denied” for advertising and analytics storage, and Google Analytics is switched off. In the EEA, the UK and Switzerland, Google Analytics is loaded only after you consent in the consent message to storing and accessing information on your device (TCF purpose 1), to Google as a vendor and to analytics. Elsewhere it is loaded only if the consent message reports analytics as granted or not requiring consent and has confirmed that you have not opted out under a U.S. state privacy law; missing or unclear signals keep it switched off. While Google's consent message is not displayed, Google Analytics is loaded only after you allow it in our <a href="#interim-statistics">interim statistics window</a> (see the next section). If your browser sends a Global Privacy Control signal, Google Analytics stays off. If you withdraw consent via “Privacy settings”, Consent Mode returns to “denied” and Google Analytics is switched off immediately. Google signals and ad personalisation are disabled in our Google Analytics configuration. Google Analytics 4 does not store IP addresses. Event data is stored for the retention period set in our Google Analytics property and then deleted. Legal basis: your consent (Art. 6(1)(a) GDPR). Transfers to Google LLC in the USA rely on the EU–U.S. Data Privacy Framework.</p>
<h2 id="interim-statistics">Interim statistics window</h2>
<p>At the moment Google's consent message is set up for this site but is not displayed. So that visits are still counted only with your consent, we show our own small window (“Almanac note · statistics only”) while this is the case. It appears about three seconds after a page has loaded if Google's consent management has by then neither shown its message nor reported a decision, and has not reported that the GDPR does not apply to your visit. It asks only about statistics with Google Analytics. It is not consent to advertising and never changes the advertising settings of Google Consent Mode: ad storage, ad user data and ad personalisation stay “denied”. “Allow” and “Decline” are equal choices. Closing the window with “×” or the Escape key, or making no choice, stores nothing and is not consent. If you have not chosen yet, Google Analytics stays off and the window appears again on the next page you open; a choice you saved earlier stays in force until you change it.</p>
<p>If you allow it, Consent Mode sets only analytics storage to “granted” and Google Analytics 4 is loaded once, as described above, with Google signals and ad personalisation switched off; Google Analytics then sets cookies on your device (<code>_ga</code>, <code>_ga_…</code>), and data may be transferred to Google LLC in the USA (EU–U.S. Data Privacy Framework). If you decline or later withdraw, Google Analytics is switched off at once, analytics storage returns to “denied” and the Google Analytics cookies (<code>_ga</code>, <code>_ga_…</code>) set for this domain are deleted; they are also deleted whenever a page finds a stored “Decline”.</p>
<p>What is stored: your choice is kept in your browser's local storage under the key <code>bbg-stats</code> – a version number, “granted” or “denied” and the time of your choice. It is not sent to us or to Google. After 12 months we ask again; an entry with a date in the future is ignored. If your browser blocks local storage, your choice applies only to the page you are on. Storing this entry is strictly necessary to respect your decision. Legal basis for Google Analytics: your consent (Art. 6(1)(a) GDPR; for storing and reading information on your device § 165(3) Austrian Telecommunications Act 2021, TKG 2021). You can change or withdraw your choice at any time with effect for the future via “Privacy settings” at the bottom of every page, including this one.</p>
<p>Google's consent management has priority: as soon as it shows its own message on a page, our window closes and does not appear again on that page. As soon as it reports a decision or reports that the GDPR does not apply to your visit, only that counts: a choice stored in our window is deleted and the rules in the <a href="#analytics">Google Analytics section</a> apply. If Google's consent management reports that you declined analytics, the Google Analytics cookies of this domain are deleted as well. If your browser sends a Global Privacy Control signal, Google Analytics stays off and the window does not appear by itself. The imprint, this privacy policy, the contact page and the error page load neither advertising nor Google Analytics; there “Privacy settings” opens the window so you can view, change or withdraw your choice for the other pages. When opened via “Privacy settings”, the window on every page offers the link “Open Google’s ad &amp; U.S. privacy choices”, which opens Google's consent message or, where a U.S. state privacy law applies, its opt-out dialog; it never gives consent to advertising. On all other pages Google's consent script is already loaded together with the AdSense script, so nothing more is loaded. On the imprint, privacy and contact pages and the error page, only when you click it is Google's consent script (fundingchoicesmessages.google.com) loaded – never the AdSense ad script – so that you can withdraw consent to advertising or, where a U.S. state privacy law applies, opt out; your decision there then takes priority as described above, but Google Analytics still stays off on these pages.</p>
<p><b>Visitors in the United States:</b> the window only appears while Google's consent management has not reported that the GDPR does not apply to your visit; once it reports that, the window does not appear and the rules for visitors outside the EEA, the UK and Switzerland in the Google Analytics section apply. If you have opted out under a U.S. state privacy law in Google's dialog, or your browser sends Global Privacy Control, Google Analytics stays off – even if you allowed it in the window – and its cookies are deleted.</p>
<h2 id="fonts">Fonts</h2>
<p>The fonts Young Serif and Atkinson Hyperlegible are served from this website. Apart from the Google advertising, consent and analytics scripts described above, no scripts, styles or fonts are loaded from third-party servers.</p>
<h2 id="email">Email</h2>
<p>If you email us, we use your address and message only to reply and delete them when they are no longer needed for that purpose, unless statutory retention periods apply (Art. 6(1)(b) and (f) GDPR).</p>
<h2 id="rights">Your rights</h2>
<p>You have the right of access (Art. 15 GDPR), rectification (Art. 16), erasure (Art. 17), restriction of processing (Art. 18), data portability (Art. 20) and to object to processing based on legitimate interests (Art. 21). You can withdraw consent at any time with effect for the future. As we do not store personal data about visitors ourselves, most requests concern Google; Google's controls are at <a href="https://myaccount.google.com/data-and-privacy" rel="noopener">myaccount.google.com</a>.</p>
<p>You may lodge a complaint with a supervisory authority – in Austria the Datenschutzbehörde, Barichgasse 40–42, 1030 Vienna, <a href="mailto:dsb@dsb.gv.at">dsb@dsb.gv.at</a>, <a href="https://www.dsb.gv.at/" rel="noopener">www.dsb.gv.at</a> – or with the authority in your country of residence.</p>
<h2 id="us">Notice for U.S. residents</h2>
<p>Some U.S. state privacy laws, such as the California Consumer Privacy Act as amended by the CPRA, treat advertising cookies used for cross-context behavioral advertising as “selling” or “sharing” personal information. Where these laws apply, Google's consent platform shows a “Do Not Sell or Share My Personal Information” option on this site, which you can reopen via “Privacy settings”. We do not sell personal information in any other way and do not knowingly collect personal information from children under 16.</p>
<h2 id="changes">Changes</h2>
<p>We update this policy when the services used on the site change; the date below shows the current version.</p>`, 'November 5, 2026'), modified: '2026-11-05'
  },
  {
    path: '/contact/', title: 'Contact – Balcony Bloom Guide',
    description: 'How to reach the publisher of Balcony Bloom Guide, how corrections are handled and what kind of help the site cannot offer.',
    crumbs: [['Home', '/'], ['Contact', '/contact/']],
    html: legal('Contact', 'Contact', `<p class="lede">Balcony Bloom Guide is published by AdStern in Vienna, Austria. You can write to <a href="mailto:office@adstern.com">office@adstern.com</a>; the postal address is in the <a href="/imprint/">imprint</a>.</p>
<h2 id="corrections">Corrections</h2>
<p>If a value in a guide or a tool result looks wrong, tell us which page and which number, and if possible your balcony's details. Confirmed errors are corrected and the review date at the bottom of the page changes.</p>
<h2 id="scope">What we cannot do</h2>
<p>We cannot assess a specific balcony's load capacity, give legal advice on a lease, or diagnose plant diseases from photos. We do not accept sponsored posts, paid links or product samples.</p>
<p>How we handle data is described in the <a href="/privacy/">privacy policy</a>.</p>`)
  }
];
