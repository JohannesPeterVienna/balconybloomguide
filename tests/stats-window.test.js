// node --test tests/stats-window.test.js – interim statistics window ("almanac note", Google Analytics only).
// Runs docs/assets/js/consent.js + bloom.js against a stubbed DOM, a stubbed clock and an optional stubbed
// Google CMP (googlefc callback queue + __tcfapi + __gpp).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const JS = path.join(__dirname, '..', 'docs', 'assets', 'js');
const CONSENT = fs.readFileSync(path.join(JS, 'consent.js'), 'utf8');
const BLOOM = fs.readFileSync(path.join(JS, 'bloom.js'), 'utf8');
const KEY = 'bbg-stats';
const OFF = 'ga-disable-G-T00HRG2YVF';
const DAY = 864e5;
const GA_SRC = /googletagmanager\.com\/gtag\/js\?id=G-T00HRG2YVF/;
const C = require(path.join(JS, 'consent.js'));

// element stub: enough for the note (children by selector, hidden, focus, events)
function el(doc, tag) {
  const e = {
    tagName: tag, attrs: {}, children: {}, handlers: {}, style: {}, hidden: false, textContent: '', innerHTML: '', focused: 0,
    setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k]; },
    addEventListener(ev, fn) { this.handlers[ev] = fn; },
    querySelector(sel) { return this.children[sel] || (this.children[sel] = el(doc, 'child ' + sel)); },
    contains(x) { return x === this || Object.values(this.children).includes(x); },
    getBoundingClientRect() { return { height: 200 }; },
    focus() { this.focused++; doc.activeElement = this; },
    after(...nodes) { doc.inserted.push(...nodes); }
  };
  return e;
}

function site({ cmp = 'hidden', stored, gpc = false, googleOff = false, cookies = [], blockStorage = false, cm = 2, us, gpp } = {}) {
  const timers = []; let clock = 0;
  const updates = [], configs = [], scripts = [], cookieWrites = [], events = [];
  const store = new Map(stored === undefined ? [] : [[KEY, typeof stored === 'string' ? stored : JSON.stringify(stored)]]);
  let jar = cookies.slice();
  const doc = { inserted: [], activeElement: null };
  const body = el(doc, 'body');
  const skip = el(doc, 'a.skip'); skip.parentNode = body;
  const button = el(doc, 'button[data-privacy-settings]');
  Object.assign(doc, {
    documentElement: { getAttribute: (k) => (k === 'data-ads' ? 'no' : k === 'data-google' ? (googleOff ? 'off' : null) : null) },
    head: { appendChild: (s) => scripts.push(s.src) },
    body,
    createElement: (t) => el(doc, t),
    querySelector: (sel) => (sel === '.skip' ? skip : null),
    querySelectorAll: (sel) => (sel === '[data-privacy-settings]' ? [button] : []),
    getElementById: () => null
  });
  Object.defineProperty(doc, 'cookie', {
    get() { return jar.join('; '); },
    set(v) {
      cookieWrites.push(v);
      const name = v.split('=')[0];
      if (/expires=Thu, 01 Jan 1970/.test(v)) jar = jar.filter((c) => c.split('=')[0] !== name);
      else if (!jar.some((c) => c.split('=')[0] === name)) jar.push(v.split(';')[0]);
    }
  });
  const storage = blockStorage
    ? { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } }
    : { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  let tcfListener = null;
  const googlefc = { callbackQueue: [], showRevocationMessage: () => events.push('revocation'),
    getGoogleConsentModeValues: () => ({ adStoragePurposeConsentStatus: cm, adUserDataPurposeConsentStatus: cm, adPersonalizationPurposeConsentStatus: cm, analyticsStoragePurposeConsentStatus: cm }) };
  if (us !== undefined) googlefc.usstatesoptout = { getInitialUsStatesOptOutStatus: () => us };
  const window = {
    document: doc, navigator: gpc ? { globalPrivacyControl: true } : {}, Date, JSON, Object, console,
    location: { hostname: 'www.balconybloomguide.com' },
    localStorage: storage,
    matchMedia: () => ({ matches: false }),
    addEventListener() {},
    setTimeout: (fn, ms) => { timers.push({ at: clock + (ms || 0), fn }); return timers.length; },
    gtag: (...a) => {
      if (a[0] === 'consent' && a[1] === 'update') updates.push({ ...a[2] });
      if (a[0] === 'config') configs.push(a[2]);
      if (a[0] === 'event') events.push('ga-event');
    },
    googlefc
  };
  if (gpp) window.__gpp = gpp;
  if (cmp !== 'none') window.__tcfapi = (cmd, v, cb) => { if (cmd === 'addEventListener') tcfListener = cb; };
  window.window = window;
  window.localStorage = storage;
  const ctx = vm.createContext(window);
  vm.runInContext(CONSENT, ctx);
  vm.runInContext(BLOOM, ctx);
  const advance = (ms) => {
    const until = clock + ms;
    for (;;) {
      timers.sort((a, b) => a.at - b.at);
      const t = timers[0];
      if (!t || t.at > until) break;
      timers.shift(); clock = t.at; t.fn();
    }
    clock = until;
  };
  // Funding Choices: run queued ready callbacks (objects) and functions
  const ready = () => {
    for (const item of googlefc.callbackQueue.splice(0)) {
      if (typeof item === 'function') item();
      else { item.CONSENT_API_READY && item.CONSENT_API_READY(); item.CONSENT_MODE_DATA_READY && item.CONSENT_MODE_DATA_READY(); item.INITIAL_US_STATES_OPT_OUT_DATA_READY && item.INITIAL_US_STATES_OPT_OUT_DATA_READY(); }
    }
  };
  const tcf = (tc) => tcfListener && tcfListener(tc, true);
  if (cmp === 'hidden') { ready(); tcf({ gdprApplies: true, eventStatus: 'cmpuishown', displayStatus: 'hidden' }); tcf({ gdprApplies: true, eventStatus: 'tcloaded', tcString: '', displayStatus: 'hidden' }); }
  if (cmp === 'none' || cmp === 'manual') ready();
  const note = () => doc.inserted.find((n) => n.attrs && n.attrs.role === 'dialog');
  const live = () => doc.inserted.find((n) => n.attrs && n.attrs.role === 'status');
  const noteOpen = () => !!note() && !note().hidden;
  const pick = (v) => note().handlers.click({ target: { closest: () => ({ getAttribute: () => v }) } });
  const gaScripts = () => scripts.filter((s) => GA_SRC.test(s)).length;
  return { window, store, updates, configs, scripts, cookieWrites, events, advance, ready, tcf, note, live, noteOpen, pick, gaScripts, button, doc,
    jar: () => jar.slice(), set cm(v) { cm = v; } };
}
const adKeys = (u) => Object.keys(u).filter((k) => k !== 'analytics_storage');
const lastAnalytics = (s) => { const u = s.updates.filter((x) => 'analytics_storage' in x); return u.length ? u[u.length - 1].analytics_storage : undefined; };

// ---------- pure rules ----------
test('rules: cmpuishown with displayStatus hidden/disabled is not "Google shows a dialog"', () => {
  assert.equal(C.cmpShowing({ eventStatus: 'cmpuishown', displayStatus: 'hidden' }), false);
  assert.equal(C.cmpShowing({ eventStatus: 'cmpuishown', displayStatus: 'disabled' }), false);
  assert.equal(C.cmpShowing({ eventStatus: 'cmpuishown', displayStatus: 'visible' }), true);
  assert.equal(C.cmpSpoke({ eventStatus: 'tcloaded', tcString: '' }), false);
  assert.equal(C.cmpSpoke({ eventStatus: 'tcloaded', tcString: 'CQ…' }), true);
  assert.equal(C.cmpSpoke({ eventStatus: 'useractioncomplete' }), true);
  assert.equal(C.cmpSpoke({ gdprApplies: false, eventStatus: 'cmpuishown', displayStatus: 'hidden' }), true);
  assert.equal(C.cmpSpoke(null), false);
});

test('rules: stored record – version, choice, 12 months, future time stamp, junk', () => {
  const now = Date.UTC(2026, 10, 5, 12);
  assert.deepEqual(C.statsRecord({ v: 1, choice: 'granted', at: now - DAY }, now), { v: 1, choice: 'granted', at: now - DAY });
  assert.equal(C.statsRecord({ v: 1, choice: 'granted', at: Date.UTC(2025, 10, 5, 11) }, now), null, 'older than 12 months');
  assert.ok(C.statsRecord({ v: 1, choice: 'denied', at: Date.UTC(2025, 10, 5, 13) }, now), 'just under 12 months');
  assert.equal(C.statsRecord({ v: 1, choice: 'granted', at: now + 60000 }, now), null, 'future time stamp');
  assert.equal(C.statsRecord({ v: 2, choice: 'granted', at: now }, now), null);
  assert.equal(C.statsRecord({ v: 1, choice: 'yes', at: now }, now), null);
  assert.equal(C.statsRecord('{broken', now), null);
  assert.equal(C.statsRecord(null, now), null);
  assert.deepEqual(C.gaCookieNames('_ga=1; _ga_ABC123=2; _gid=3; x_ga=4; _gat=5'), ['_ga', '_ga_ABC123']);
  assert.deepEqual(C.cookieDomains('www.balconybloomguide.com'), ['', 'www.balconybloomguide.com', '.www.balconybloomguide.com', 'balconybloomguide.com', '.balconybloomguide.com']);
});

// ---------- when the window appears ----------
test('CMP loads but stays hidden: window after 3 s, not before; analytics stays off until a choice', () => {
  const s = site({ cmp: 'hidden' });
  s.advance(2999);
  assert.equal(s.noteOpen(), false);
  s.advance(1);
  assert.equal(s.noteOpen(), true);
  assert.equal(s.note().attrs['aria-modal'], 'false');
  assert.match(s.live().textContent, /statistics/);
  assert.equal(s.window[OFF], true);
  assert.equal(s.gaScripts(), 0);
  assert.notEqual(lastAnalytics(s), 'granted');
});

test('no __tcfapi at all: window after 3 s', () => {
  const s = site({ cmp: 'none' });
  s.advance(3000);
  assert.equal(s.noteOpen(), true);
});

test('Google CMP decides before 3 s: no window, stored window choice deleted', () => {
  const s = site({ cmp: 'manual', stored: { v: 1, choice: 'granted', at: Date.now() - DAY } });
  s.tcf({ gdprApplies: true, eventStatus: 'useractioncomplete', tcString: 'CQ', purpose: { consents: { 1: true } }, vendor: { consents: { 755: true } } });
  s.advance(5000);
  assert.equal(s.noteOpen(), false);
  assert.equal(s.store.has(KEY), false);
  assert.equal(s.gaScripts(), 0, 'Consent Mode analytics value 2 (denied) → no GA');
});

test('Google shows its own message (cmpuishown visible): no window', () => {
  const s = site({ cmp: 'manual' });
  s.tcf({ gdprApplies: true, eventStatus: 'cmpuishown', displayStatus: 'visible' });
  s.advance(5000);
  assert.equal(s.noteOpen(), false);
});

test('gdprApplies false: no window, own choice deleted, the existing non-EU logic decides', () => {
  const s = site({ cmp: 'manual', stored: { v: 1, choice: 'denied', at: Date.now() - DAY }, cm: 3, us: 2 });
  s.tcf({ gdprApplies: false, eventStatus: 'tcloaded', displayStatus: 'hidden' });
  s.advance(5000);
  assert.equal(s.noteOpen(), false);
  assert.equal(s.store.has(KEY), false);
  assert.equal(s.window[OFF], false, 'non-EU, NOT_OPTED_OUT, NOT_APPLICABLE → existing logic measures');
  assert.equal(s.gaScripts(), 1);
});

test('Global Privacy Control: no window, no GA even with a stored "granted"; the button shows an info note', () => {
  const s = site({ cmp: 'hidden', gpc: true, stored: { v: 1, choice: 'granted', at: Date.now() - DAY }, cookies: ['_ga=GA1.1.1'] });
  s.advance(5000);
  assert.equal(s.noteOpen(), false);
  assert.equal(s.gaScripts(), 0);
  assert.equal(s.window[OFF], true);
  assert.deepEqual(s.jar(), [], 'GA cookies removed');
  s.button.handlers.click();
  assert.equal(s.noteOpen(), true);
  assert.equal(s.note().querySelector('[data-note-picks]').hidden, true, 'no Allow/Decline under GPC');
  assert.equal(s.note().querySelector('[data-note-ok]').hidden, false);
});

// ---------- choices ----------
test('Allow sets only analytics_storage granted and loads gtag.js once (signals off)', () => {
  const s = site({ cmp: 'hidden' });
  s.advance(3000);
  const before = s.updates.length;
  s.pick('granted');
  const mine = s.updates.slice(before);
  assert.ok(mine.length >= 1);
  for (const u of mine) assert.deepEqual(adKeys(u), [], 'window never sends ad_* signals: ' + JSON.stringify(u));
  assert.equal(lastAnalytics(s), 'granted');
  assert.equal(s.window[OFF], false);
  assert.equal(s.gaScripts(), 1);
  assert.deepEqual({ ...s.configs[0] }, { allow_google_signals: false, allow_ad_personalization_signals: false });
  assert.equal(JSON.parse(s.store.get(KEY)).choice, 'granted');
  assert.equal(s.noteOpen(), false);
  assert.match(s.live().textContent, /switched on/);
  // reopen and allow again: still one script
  s.button.handlers.click(); s.pick('granted');
  assert.equal(s.gaScripts(), 1);
  // no update anywhere ever grants an ad signal
  for (const u of s.updates) for (const k of adKeys(u)) assert.equal(u[k], 'denied');
});

test('Decline: GA off, analytics_storage denied, _ga/_ga_* deleted for every domain variant', () => {
  const s = site({ cmp: 'hidden', cookies: ['_ga=GA1.1.1', '_ga_T00HRG2YVF=GS1', 'other=1'] });
  s.advance(3000);
  s.pick('denied');
  assert.equal(s.window[OFF], true);
  assert.equal(lastAnalytics(s), 'denied');
  assert.deepEqual(s.jar(), ['other=1']);
  for (const d of ['', '; domain=www.balconybloomguide.com', '; domain=.balconybloomguide.com', '; domain=balconybloomguide.com']) {
    assert.ok(s.cookieWrites.some((w) => w.startsWith('_ga=;') && w.endsWith('path=/' + d)), 'missing variant ' + d);
  }
  assert.equal(JSON.parse(s.store.get(KEY)).choice, 'denied');
  assert.equal(s.gaScripts(), 0);
});

test('withdrawal after Allow via "Privacy settings": focus on the heading, Decline switches off and deletes _ga', () => {
  const s = site({ cmp: 'hidden' });
  s.advance(3000); s.pick('granted');
  s.window.document.cookie = '_ga=GA1.1.2';
  s.button.handlers.click();
  assert.equal(s.noteOpen(), true);
  assert.ok(s.note().querySelector('#almanote-title').focused > 0);
  assert.match(s.note().querySelector('[data-note-now]').textContent, /allowed on/);
  s.pick('denied');
  assert.equal(s.window[OFF], true);
  assert.equal(lastAnalytics(s), 'denied');
  assert.deepEqual(s.jar(), []);
  assert.ok(s.button.focused > 0, 'focus returns to the button');
});

test('× and Escape store nothing and are not consent', () => {
  const s = site({ cmp: 'hidden' });
  s.advance(3000);
  s.pick('close');
  assert.equal(s.noteOpen(), false);
  assert.equal(s.store.has(KEY), false);
  assert.equal(s.window[OFF], true);
  s.button.handlers.click();
  let prevented = false;
  s.note().handlers.keydown({ key: 'Escape', preventDefault() { prevented = true; } });
  assert.ok(prevented);
  assert.equal(s.noteOpen(), false);
  assert.equal(s.store.has(KEY), false);
  assert.equal(s.gaScripts(), 0);
});

test('a stored "denied" deletes _ga at load and the window stays closed', () => {
  const s = site({ cmp: 'hidden', stored: { v: 1, choice: 'denied', at: Date.now() - DAY }, cookies: ['_ga=GA1.1.1'] });
  assert.deepEqual(s.jar(), [], 'deleted right at load');
  s.advance(3000);
  assert.equal(s.noteOpen(), false);
  assert.equal(s.window[OFF], true);
});

test('stored "granted" within 12 months: no window, GA on; older than 12 months or in the future: ask again', () => {
  const a = site({ cmp: 'hidden', stored: { v: 1, choice: 'granted', at: Date.now() - 300 * DAY } });
  a.advance(3000);
  assert.equal(a.noteOpen(), false);
  assert.equal(a.gaScripts(), 1);
  const b = site({ cmp: 'hidden', stored: { v: 1, choice: 'granted', at: Date.now() - 370 * DAY } });
  b.advance(3000);
  assert.equal(b.noteOpen(), true);
  assert.equal(b.gaScripts(), 0);
  const c = site({ cmp: 'hidden', stored: { v: 1, choice: 'granted', at: Date.now() + 30 * DAY } });
  c.advance(3000);
  assert.equal(c.noteOpen(), true);
  assert.equal(c.gaScripts(), 0);
});

test('blocked localStorage throws nothing; the choice holds for the page view', () => {
  const s = site({ cmp: 'hidden', blockStorage: true });
  s.advance(3000);
  assert.equal(s.noteOpen(), true);
  assert.doesNotThrow(() => s.pick('granted'));
  assert.equal(s.window[OFF], false);
  assert.equal(s.gaScripts(), 1);
});

// ---------- Google's CMP has priority ----------
test('late Google decision after Allow: window choice deleted, Google says no → GA off and _ga deleted', () => {
  const s = site({ cmp: 'hidden' });
  s.advance(3000); s.pick('granted');
  s.window.document.cookie = '_ga=GA1.1.3';
  s.button.handlers.click();             // window open again when Google finally decides
  s.tcf({ gdprApplies: true, eventStatus: 'useractioncomplete', tcString: 'CQ', purpose: { consents: {} }, vendor: { consents: {} } });
  assert.equal(s.noteOpen(), false, 'window closes');
  assert.equal(s.store.has(KEY), false, 'own choice deleted');
  assert.equal(s.window[OFF], true);
  assert.equal(lastAnalytics(s), 'denied');
  assert.deepEqual(s.jar(), []);
  const last = s.updates[s.updates.length - 1];
  assert.deepEqual({ ...last }, { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
  // the button now goes to Google's CMP, not to the window
  s.button.handlers.click(); s.ready();
  assert.equal(s.noteOpen(), false);
  assert.ok(s.events.includes('revocation'));
});

test('late Google "yes" after Allow: GA stays on without a second gtag.js', () => {
  const s = site({ cmp: 'hidden', cm: 1 });
  s.advance(3000); s.pick('granted');
  s.tcf({ gdprApplies: true, eventStatus: 'useractioncomplete', tcString: 'CQ', purpose: { consents: { 1: true } }, vendor: { consents: { 755: true } } });
  assert.equal(s.window[OFF], false);
  assert.equal(s.gaScripts(), 1);
  assert.equal(s.store.has(KEY), false);
});

test('Google declines while the window was never active: _ga deleted', () => {
  const s = site({ cmp: 'manual', cookies: ['_ga=GA1.1.4', '_ga_T00HRG2YVF=GS1'] });
  s.tcf({ gdprApplies: true, eventStatus: 'tcloaded', tcString: 'CQ', purpose: { consents: { 1: false } }, vendor: { consents: {} } });
  assert.deepEqual(s.jar(), []);
  s.advance(5000);
  assert.equal(s.noteOpen(), false);
});

test('U.S. opt-out through GPP after Allow: GA off at once', () => {
  let gppCb = null;
  const gpp = (cmd, cb) => { if (cmd === 'addEventListener') gppCb = cb; };
  const s = site({ cmp: 'hidden', gpp, cookies: ['_ga=GA1.1.5'] });
  assert.ok(gppCb, 'GPP listener registered');
  s.advance(3000); s.pick('granted');
  s.window.document.cookie = '_ga=GA1.1.5';
  assert.equal(s.window[OFF], false);
  gppCb({ pingData: { signalStatus: 'ready', applicableSections: [7], parsedSections: { usnat: [{ SaleOptOut: 1, SharingOptOut: 1, TargetedAdvertisingOptOut: 1 }] } } }, true);
  assert.equal(s.window[OFF], true);
  assert.equal(lastAnalytics(s), 'denied');
  assert.deepEqual(s.jar(), []);
  for (const u of s.updates) for (const k of adKeys(u)) assert.equal(u[k], 'denied');
});

test('initial U.S. status OPTED_OUT: no automatic window, no GA', () => {
  const s = site({ cmp: 'none', us: 3 });
  s.advance(3000);
  assert.equal(s.noteOpen(), false);
  assert.equal(s.window[OFF], true);
});

// ---------- pages without Google code ----------
test('imprint/privacy/404 (data-google="off"): no automatic window, no GA; the button opens the window and stores the choice', () => {
  const s = site({ cmp: 'none', googleOff: true });
  s.advance(5000);
  assert.equal(s.noteOpen(), false);
  s.button.handlers.click();
  assert.equal(s.noteOpen(), true);
  assert.match(s.note().querySelector('[data-note-now]').textContent, /Nothing is measured on this page/);
  s.pick('granted');
  assert.equal(JSON.parse(s.store.get(KEY)).choice, 'granted');
  assert.equal(s.window[OFF], true);
  assert.equal(s.gaScripts(), 0);
  assert.equal(s.scripts.filter((x) => /adsbygoogle/.test(x)).length, 0, 'no ad script either');
  assert.ok(s.events.every((e) => e !== 'revocation'));
});

// ---------- GA events ----------
test('no gtag("event") call anywhere in the site scripts without the ga-disable guard', () => {
  for (const f of fs.readdirSync(JS)) {
    const src = fs.readFileSync(path.join(JS, f), 'utf8');
    for (const m of src.matchAll(/gtag\(\s*['"]event['"]/g)) {
      const before = src.slice(Math.max(0, m.index - 120), m.index);
      assert.match(before, /\[\s*(GA_OFF|'ga-disable-G-T00HRG2YVF')\s*\]\s*===\s*false/, f + ': unguarded gtag event');
    }
  }
});

test('pages without Google code: the Google choices link loads only the consent script, Google then takes priority, GA stays off', () => {
  const s = site({ cmp: 'manual', googleOff: true, stored: { v: 1, choice: 'granted', at: Date.now() - DAY }, cm: 1 });
  s.button.handlers.click();
  assert.equal(s.note().querySelector('[data-note-google]').hidden, false);
  assert.equal(s.scripts.length, 0, 'nothing from Google before the click');
  s.pick('google');
  assert.equal(s.noteOpen(), false);
  assert.deepEqual(s.scripts, ['https://fundingchoicesmessages.google.com/i/pub-7811071715414905?ers=1']);
  assert.equal(s.scripts.filter((x) => /adsbygoogle/.test(x)).length, 0);
  s.ready();
  assert.ok(s.events.includes('revocation'), 'Google consent message opened');
  s.tcf({ gdprApplies: true, eventStatus: 'useractioncomplete', tcString: 'CQ', purpose: { consents: { 1: true } }, vendor: { consents: { 755: true } } });
  assert.equal(s.store.has(KEY), false, 'Google decision replaces the window choice');
  assert.equal(s.window[OFF], true, 'GA stays off on these pages');
  assert.equal(s.gaScripts(), 0);
  assert.equal(lastAnalytics(s), 'denied');
  // the footer button now goes straight to Google, again without adsbygoogle.js
  s.button.handlers.click(); s.ready();
  assert.equal(s.scripts.length, 1);
  assert.equal(s.events.filter((e) => e === 'revocation').length, 2);
});

test('pages without Google code, U.S. visitor: the link opens the U.S. opt-out dialog', () => {
  const s = site({ cmp: 'manual', googleOff: true, us: 2 });
  let dialog = 0;
  s.window.googlefc.usstatesoptout.openConfirmationDialog = () => { dialog++; };
  s.button.handlers.click(); s.pick('google'); s.ready();
  assert.equal(dialog, 1);
  assert.equal(s.window[OFF], true);
});

test('content pages: the Google choices link is not shown in the window', () => {
  const s = site({ cmp: 'hidden' });
  s.advance(3000);
  assert.equal(s.note().querySelector('[data-note-google]').hidden, true);
});
