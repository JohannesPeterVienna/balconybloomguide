// node --test tests/privacy-button.test.js – "Privacy settings" opens the U.S. opt-out dialog or the consent message.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const JS = path.join(__dirname, '..', 'docs', 'assets', 'js');
const CONSENT = fs.readFileSync(path.join(JS, 'consent.js'), 'utf8');
const BLOOM = fs.readFileSync(path.join(JS, 'bloom.js'), 'utf8');

function page(usStatus, withEnum) {
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
  return { calls, consentUpdates, click: () => clickHandler(), runQueue, usstatesoptout, last: () => consentUpdates[consentUpdates.length - 1] };
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
