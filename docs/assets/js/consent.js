/*
 * Balcony Bloom Guide – consent decision (pure function, tested in tests/consent.test.js).
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

  var api = { tcfSignal: tcfSignal, decide: decide, gppUsOptOut: gppUsOptOut, DENIED_ALL: DENIED_ALL };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BBConsent = api;
})(this);
