/*
 * Balcony Bloom Guide – consent decision (pure function, tested in tests/consent.test.js).
 * A purpose only becomes "granted" when Google's certified CMP (Privacy & messaging) says so:
 *  - GDPR applies (or is not stated as false): TCF purpose 1 + Google (vendor 755) consent, TCF data
 *    loaded, AND the CMP's Consent Mode value for that purpose is GRANTED (1).
 *  - GDPR does not apply (gdprApplies === false): Consent Mode value GRANTED (1) or NOT_APPLICABLE (3)
 *    AND the U.S. state status reported as DOES_NOT_APPLY (1) or NOT_OPTED_OUT (2).
 * Anything missing, unknown, denied, not configured or failing stays "denied".
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

  var api = { tcfSignal: tcfSignal, decide: decide, DENIED_ALL: DENIED_ALL };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BBConsent = api;
})(this);
