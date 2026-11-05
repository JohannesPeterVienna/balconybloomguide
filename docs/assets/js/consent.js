/*
 * Balcony Bloom Guide – consent decision and interim statistics rules (pure functions, tested in tests/privacy-button.test.js and tests/stats-window.test.js).
 * A purpose only becomes "granted" when Google's certified CMP (Privacy & messaging) says so:
 *  - GDPR applies (or is not stated as false): TCF purpose 1 + Google (vendor 755) consent, TCF data
 *    loaded, AND the CMP's Consent Mode value for that purpose is GRANTED (1).
 *  - GDPR does not apply (gdprApplies === false): Consent Mode value GRANTED (1) or NOT_APPLICABLE (3)
 *    AND the U.S. state status reported as DOES_NOT_APPLY (1) or NOT_OPTED_OUT (2).
 * Anything missing, unknown, denied, not configured or failing stays "denied".
 * Later U.S. opt-outs arrive through the IAB GPP API (__gpp addEventListener); gppUsOptOut() reads them.
 * Enum values: developers.google.com/funding-choices/fc-api-docs
 */
(function (root) {
  'use strict';
  var GRANTED = 1, NOT_APPLICABLE = 3, US_DOES_NOT_APPLY = 1, US_NOT_OPTED_OUT = 2, GOOGLE = 755;
  var DENIED_ALL = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' };

  function tcfSignal(tc) {
    if (!tc) return 'no';
    if (tc.gdprApplies === false) return 'outside';
    var loaded = tc.eventStatus === 'tcloaded' || tc.eventStatus === 'useractioncomplete';
    var p1 = !!(tc.purpose && tc.purpose.consents && tc.purpose.consents[1]);
    var g = !!(tc.vendor && tc.vendor.consents && tc.vendor.consents[GOOGLE]);
    return loaded && p1 && g ? 'yes' : 'no';
  }

  function decide(tc, cm, usStatus) {
    var sig = tcfSignal(tc);
    if (sig === 'no' || !cm) return Object.assign({}, DENIED_ALL);
    if (sig === 'outside' && usStatus !== US_DOES_NOT_APPLY && usStatus !== US_NOT_OPTED_OUT) return Object.assign({}, DENIED_ALL);
    function ok(v) { return sig === 'yes' ? v === GRANTED : (v === GRANTED || v === NOT_APPLICABLE); }
    return {
      ad_storage: ok(cm.adStoragePurposeConsentStatus) ? 'granted' : 'denied',
      ad_user_data: ok(cm.adUserDataPurposeConsentStatus) ? 'granted' : 'denied',
      ad_personalization: ok(cm.adPersonalizationPurposeConsentStatus) ? 'granted' : 'denied',
      analytics_storage: ok(cm.analyticsStoragePurposeConsentStatus) ? 'granted' : 'denied'
    };
  }

  /*
   * IAB GPP pingData → U.S. opt-out? (GPP spec v1.1; section IDs 6 uspv1, 7 usnat, 8 usca, 9 usva … all U.S.)
   *  true  = a U.S. section reports SaleOptOut/SharingOptOut/TargetedAdvertisingOptOut 1 (= opted out),
   *          uspv1 "OptOutSale" Y – or a U.S. section applies but its data cannot be read (fail closed)
   *  false = no U.S. section applies, or every applicable U.S. section clearly reports no opt-out (0/2)
   *  null  = CMP not ready yet: nothing changes
   * It never grants anything: the caller only uses true to deny.
   */
  var US_FIELDS = ['SaleOptOut', 'SharingOptOut', 'TargetedAdvertisingOptOut'];
  function usSectionState(sec) {      // 'out' | 'in' | 'unclear'
    if (typeof sec === 'string') {    // uspv1 as a string, e.g. "1YYN" (3rd character = opt-out of sale)
      if (sec.length !== 4) return 'unclear';
      return sec.charAt(2) === 'Y' ? 'out' : 'in';
    }
    var parts = Array.isArray(sec) ? sec : [sec];   // a section may come as [core, gpc] segments
    var seen = false;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (!p || typeof p !== 'object') continue;
      if (p.OptOutSale !== undefined) {               // uspv1 parsed
        if (p.OptOutSale === 'Y') return 'out';
        if (p.OptOutSale !== 'N' && p.OptOutSale !== '-') return 'unclear';
        seen = true;
      }
      for (var j = 0; j < US_FIELDS.length; j++) {
        var v = p[US_FIELDS[j]];
        if (v === undefined) continue;
        if (v === 1 || v === '1') return 'out';
        if (typeof v !== 'number') return 'unclear';
        seen = true;
      }
    }
    return seen ? 'in' : 'unclear';
  }
  function gppUsOptOut(pd) {
    if (!pd || typeof pd !== 'object') return true;
    if (pd.signalStatus === 'not ready') return null;
    var applicable = pd.applicableSections, parsed = pd.parsedSections;
    var usApplies = Array.isArray(applicable) ? applicable.some(function (id) { return typeof id === 'number' && id >= 6; }) : null;
    if (usApplies === false) return false;
    if (!parsed || typeof parsed !== 'object') return true;   // a U.S. section may apply but cannot be read
    var found = false;
    for (var k in parsed) {
      if (!Object.prototype.hasOwnProperty.call(parsed, k) || k.slice(0, 2) !== 'us') continue;
      found = true;
      if (usSectionState(parsed[k]) !== 'in') return true;
    }
    if (found) return false;
    return true;   // a U.S. section applies (or applicableSections is missing) but none was parsed
  }

  /*
   * Interim statistics window (since 5 Nov 2026) – the rules without DOM, tested in tests/stats-window.test.js.
   * Google's consent message is published but reports displayStatus "hidden", so no TCF decision arrives.
   * The page then asks itself – for Google Analytics only. These helpers say when Google's CMP has spoken
   * and read the stored choice; bloom.js does the rest.
   */
  var STATS = { KEY: 'bbg-stats', VERSION: 1, WAIT_MS: 3000, MONTHS: 12 };
  // a real decision: the visitor acted in Google's message, or Google loaded a stored decision (non-empty TC string)
  function cmpDecided(tc) {
    return !!tc && (tc.eventStatus === 'useractioncomplete' ||
      (tc.eventStatus === 'tcloaded' && typeof tc.tcString === 'string' && tc.tcString !== ''));
  }
  // Google's own message is on screen; "cmpuishown" with displayStatus hidden/disabled does NOT count
  function cmpShowing(tc) {
    if (!tc) return false;
    if (tc.displayStatus === 'visible') return true;
    return tc.eventStatus === 'cmpuishown' && tc.displayStatus !== 'hidden' && tc.displayStatus !== 'disabled';
  }
  // from now on only Google's CMP (and the logic above) counts
  function cmpSpoke(tc) { return !!tc && (tc.gdprApplies === false || cmpDecided(tc) || cmpShowing(tc)); }
  // a clear "no" to analytics from Google (TCF purpose 1 / vendor 755 missing, or Consent Mode analytics DENIED = 2)
  function googleSaysNo(tc, cmAnalytics) {
    if (!tc) return false;
    if (tc.gdprApplies === false) return cmAnalytics === 2;
    if (!cmpDecided(tc)) return false;
    var p1 = !!(tc.purpose && tc.purpose.consents && tc.purpose.consents[1]);
    var g = !!(tc.vendor && tc.vendor.consents && tc.vendor.consents[GOOGLE]);
    return !p1 || !g || cmAnalytics === 2;
  }
  // stored record → valid record or null (wrong version/choice, time stamp in the future, older than 12 months)
  function statsRecord(raw, now) {
    var rec = raw;
    if (typeof raw === 'string') { try { rec = JSON.parse(raw); } catch (e) { return null; } }
    if (!rec || typeof rec !== 'object' || rec.v !== STATS.VERSION) return null;
    if (rec.choice !== 'granted' && rec.choice !== 'denied') return null;
    if (typeof rec.at !== 'number' || !isFinite(rec.at) || rec.at > now) return null;
    var until = new Date(rec.at); until.setMonth(until.getMonth() + STATS.MONTHS);
    return now < until.getTime() ? { v: rec.v, choice: rec.choice, at: rec.at } : null;
  }
  // GA cookie names (_ga, _ga_<container>) in a document.cookie string
  function gaCookieNames(jar) {
    return String(jar || '').split(';').map(function (c) { return c.split('=')[0].trim(); })
      .filter(function (n) { return /^_ga(_.+)?$/.test(n); });
  }
  // every domain attribute a cookie for this host can carry: host-only, host, .host and each parent domain
  function cookieDomains(host) {
    var parts = String(host || '').split('.').filter(Boolean), out = [''];
    for (var i = 0; i < parts.length - 1; i++) { var d = parts.slice(i).join('.'); out.push(d, '.' + d); }
    return out;
  }

  var api = { tcfSignal: tcfSignal, decide: decide, gppUsOptOut: gppUsOptOut, DENIED_ALL: DENIED_ALL,
    STATS: STATS, cmpDecided: cmpDecided, cmpShowing: cmpShowing, cmpSpoke: cmpSpoke, googleSaysNo: googleSaysNo,
    statsRecord: statsRecord, gaCookieNames: gaCookieNames, cookieDomains: cookieDomains };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BBConsent = api;
})(this);
