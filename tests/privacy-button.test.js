// node --test tests/privacy-button.test.js – "Privacy settings" opens the U.S. opt-out dialog or the consent message.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const JS = path.join(__dirname, '..', 'docs', 'assets', 'js');
const CONSENT = fs.readFileSync(path.join(JS, 'consent.js'), 'utf8');
const BLOOM = fs.readFileSync(path.join(JS, 'bloom.js'), 'utf8');

function page(usStatus, withEnum, gpp) {
  const calls = [];
  const consentUpdates = [];
  let clickHandler = null;
  const button = { addEventListener: (ev, fn) => { if (ev === 'click') clickHandler = fn; } };
  const document = {
    documentElement: { getAttribute: () => 'no' },
    querySelectorAll: (sel) => (sel === '[data-privacy-settings]' ? [button] : []),
    querySelector: () => null,
    createElement: () => ({ setAttribute() {} }),
    head: { appendChild: (el) => calls.push(['script', el.src]) },
    getElementById: () => null
  };
  const usstatesoptout = {
    getInitialUsStatesOptOutStatus: () => usStatus,
    openConfirmationDialog: (cb) => { calls.push(['usDialog']); usstatesoptout.answer = cb; }
  };
  if (withEnum) usstatesoptout.InitialUsStatesOptOutStatusEnum = { UNKNOWN: 0, DOES_NOT_APPLY: 1, NOT_OPTED_OUT: 2, OPTED_OUT: 3 };
  const googlefc = {
    callbackQueue: [],
    usstatesoptout,
    showRevocationMessage: () => calls.push(['revocation']),
    getGoogleConsentModeValues: () => ({ adStoragePurposeConsentStatus: 3, adUserDataPurposeConsentStatus: 3, adPersonalizationPurposeConsentStatus: 3, analyticsStoragePurposeConsentStatus: 3 })
  };
  let tcfListener = null;
  const window = {
    googlefc,
    gtag: (...a) => { if (a[0] === 'consent') consentUpdates.push(a[2]); },
    __tcfapi: (cmd, v, cb) => { if (cmd === 'addEventListener') tcfListener = cb; },
    matchMedia: () => ({ matches: false }),
    localStorage: { getItem: () => null }
  };
  if (gpp) window.__gpp = gpp;
  const ctx = vm.createContext({ window, document, localStorage: window.localStorage, console, JSON, Date });
  ctx.this = ctx;
  vm.runInContext(CONSENT.replace('})(this);', '})(window);'), ctx);
  vm.runInContext(BLOOM, ctx);
  // run the CMP queue like Funding Choices: objects get their ready callbacks, functions are called
  const runQueue = () => {
    const q = googlefc.callbackQueue.splice(0);
    for (const item of q) {
      if (typeof item === 'function') item();
      else { item.CONSENT_API_READY && item.CONSENT_API_READY(); item.CONSENT_MODE_DATA_READY && item.CONSENT_MODE_DATA_READY(); item.INITIAL_US_STATES_OPT_OUT_DATA_READY && item.INITIAL_US_STATES_OPT_OUT_DATA_READY(); }
    }
  };
  runQueue();
  // a U.S. visitor outside the GDPR who has not opted out
  tcfListener({ gdprApplies: false, eventStatus: 'tcloaded' }, true);
  return { calls, consentUpdates, window, click: () => clickHandler(), runQueue, usstatesoptout, last: () => consentUpdates[consentUpdates.length - 1] };
}

test('U.S. state law applies: opens the opt-out dialog, not the EU message; opting out keeps everything denied', () => {
  const p = page(2, true);
  assert.equal(p.last().analytics_storage, 'granted');
  p.click();
  assert.equal(p.last().ad_personalization, 'denied');            // withdrawn at once
  assert.ok(p.calls.some((c) => c[0] === 'script' && /adsbygoogle\.js/.test(c[1])), 'ad script loaded lazily');
  p.runQueue();
  assert.deepEqual(p.calls.filter((c) => c[0] !== 'script'), [['usDialog']]);
  p.usstatesoptout.getInitialUsStatesOptOutStatus = () => 3;
  p.usstatesoptout.answer(true);
  assert.equal(p.last().ad_personalization, 'denied');
  assert.equal(p.last().analytics_storage, 'denied');
});

test('U.S. visitor who does not opt out gets the previous signals back', () => {
  const p = page(2, false);   // no enum object: falls back to DOES_NOT_APPLY = 1
  p.click(); p.runQueue();
  assert.deepEqual(p.calls.filter((c) => c[0] !== 'script'), [['usDialog']]);
  p.usstatesoptout.answer(false);
  assert.equal(p.last().analytics_storage, 'granted');
});

test('U.S. state law does not apply: shows the consent (revocation) message', () => {
  for (const withEnum of [true, false]) {
    const p = page(1, withEnum);
    p.click(); p.runQueue();
    assert.deepEqual(p.calls.filter((c) => c[0] !== 'script'), [['revocation']]);
  }
});

test('CMP without the U.S. API: shows the consent message', () => {
  const p = page(1, true);
  delete p.usstatesoptout.getInitialUsStatesOptOutStatus;
  p.click(); p.runQueue();
  assert.deepEqual(p.calls.filter((c) => c[0] !== 'script'), [['revocation']]);
});

// ---------- later U.S. opt-out through the IAB GPP API ----------
function gppStub() {
  const g = function (cmd, cb) {
    if (cmd === 'addEventListener') { g.listener = cb; cb({ eventName: 'listenerRegistered', listenerId: 1, data: true, pingData: g.ping }, true); }
    else if (cmd === 'ping') cb(g.ping, true);
  };
  g.ping = { gppVersion: '1.1', cmpStatus: 'loaded', signalStatus: 'ready', applicableSections: [7], parsedSections: { usnat: [{ Version: 1, SaleOptOut: 2, SharingOptOut: 2, TargetedAdvertisingOptOut: 2 }] } };
  g.fire = (pingData) => g.listener({ eventName: 'signalStatus', listenerId: 1, data: 'ready', pingData }, true);
  return g;
}
const GA_OFF = 'ga-disable-G-T00HRG2YVF';

test('GPP: later opt-out after an initial NOT_OPTED_OUT switches everything off at once', () => {
  const g = gppStub();
  const p = page(2, true, g);
  assert.ok(g.listener, 'GPP listener registered');
  assert.equal(p.last().analytics_storage, 'granted');
  assert.equal(p.window[GA_OFF], false);
  g.fire({ signalStatus: 'ready', applicableSections: [7], parsedSections: { usnat: [{ Version: 1, SaleOptOut: 1, SharingOptOut: 1, TargetedAdvertisingOptOut: 1 }, { Gpc: false }] } });
  assert.deepEqual({ ...p.last() }, { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
  assert.equal(p.window[GA_OFF], true);
  // a later "no opt-out" event or the TCF listener does not grant anything again in this page view
  g.fire(g.ping);
  assert.equal(p.last().analytics_storage, 'denied');
});

test('GPP: state section (usca) with only TargetedAdvertising/Sharing opt-out also counts', () => {
  const g = gppStub();
  const p = page(2, true, g);
  g.fire({ signalStatus: 'ready', applicableSections: [8], parsedSections: { usca: { Version: 1, SaleOptOut: 2, SharingOptOut: 1 } } });
  assert.equal(p.last().ad_personalization, 'denied');
  assert.equal(p.window[GA_OFF], true);
});

test('GPP: no opt-out, no U.S. section or CMP not ready leaves the state unchanged', () => {
  const g = gppStub();
  const p = page(2, true, g);
  g.fire({ signalStatus: 'ready', applicableSections: [7], parsedSections: { usnat: { SaleOptOut: 0, SharingOptOut: 2, TargetedAdvertisingOptOut: 2 } } });
  g.fire({ signalStatus: 'ready', applicableSections: [-1], parsedSections: {} });
  g.fire({ signalStatus: 'not ready' });
  assert.equal(p.last().analytics_storage, 'granted');
  assert.equal(p.window[GA_OFF], false);
});

test('no GPP API: nothing changes (granted stays granted, denied stays denied)', () => {
  const p = page(2, true);
  assert.equal(p.last().analytics_storage, 'granted');
  const q = page(0, true);   // UNKNOWN initial U.S. status
  assert.equal(q.last().analytics_storage, 'denied');
  const g = gppStub();
  const r = page(0, true, g);   // GPP saying "no opt-out" never grants anything
  g.fire(g.ping);
  assert.equal(r.last().analytics_storage, 'denied');
  assert.equal(r.window[GA_OFF], true);
});

test('GPP: malformed or unreadable data → denied', () => {
  const bad = [
    'garbage',
    null,
    { signalStatus: 'ready', applicableSections: [7], parsedSections: { usnat: 'xx' } },
    { signalStatus: 'ready', applicableSections: [7], parsedSections: { usnat: [{ SaleOptOut: 'no' }] } },
    { signalStatus: 'ready', applicableSections: [7] },
    { signalStatus: 'ready', parsedSections: { tcfeuv2: {} } }
  ];
  for (const pd of bad) {
    const g = gppStub();
    const p = page(2, true, g);
    assert.equal(p.last().analytics_storage, 'granted');
    g.fire(pd);
    assert.equal(p.last().analytics_storage, 'denied', JSON.stringify(pd));
    assert.equal(p.last().ad_personalization, 'denied');
    assert.equal(p.window[GA_OFF], true);
  }
  // a GPP API that throws keeps the page working and grants nothing new
  const p = page(0, true, () => { throw new Error('boom'); });
  assert.equal(p.last().analytics_storage, 'denied');
});
