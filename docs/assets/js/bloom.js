/*
 * Balcony Bloom Guide – page runtime: ad slots, consent-gated analytics, privacy settings,
 * and the saved "balcony profile" shown on guide pages.
 * Ad slot IDs stay empty until AdSense units exist: an empty ID renders nothing and reserves no space.
 */
(function () {
  'use strict';
  var CLIENT = 'ca-pub-7811071715414905';
  var SLOTS = {
    top: '',      // 970×250 billboard (≥1024 px) / 728×90 (≥768 px) / 300×250 (mobile), below the tool or the intro
    side: '',     // 300×600 half page, sidebar from 1200 px, not sticky
    inline: ''    // 300×250 in long guides
  };
  var GA_ID = 'G-T00HRG2YVF';
  var html = document.documentElement;
  var adsOn = html.getAttribute('data-ads') === 'yes';

  /* ---------- ads ---------- */
  function loadAdScript() {
    if (document.querySelector('script[src*="adsbygoogle.js"]')) return;
    var s = document.createElement('script');
    s.async = true; s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + CLIENT;
    document.head.appendChild(s);
  }
  function fillSlots() {
    if (!adsOn) return;
    var wide = window.matchMedia('(min-width: 1200px)').matches;
    document.querySelectorAll('.ad[data-slot]').forEach(function (box) {
      var id = SLOTS[box.getAttribute('data-slot')];
      if (!id) return;
      if (box.getAttribute('data-slot') === 'side' && !wide) return;
      var ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.setAttribute('data-ad-client', CLIENT);
      ins.setAttribute('data-ad-slot', id);
      if (box.getAttribute('data-slot') !== 'side') ins.setAttribute('data-full-width-responsive', 'true');
      box.appendChild(ins);
      box.hidden = false;
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { box.hidden = true; }
    });
  }

  /* ---------- consent + analytics ---------- */
  var gtag = window.gtag || function () { (window.dataLayer = window.dataLayer || []).push(arguments); };
  var state = { tc: null, cmReady: false, us: null, last: '' };
  var gaLoaded = false;
  var OPTED_OUT = 3;   // InitialUsStatesOptOutStatusEnum.OPTED_OUT
  function loadGA() {
    if (gaLoaded) return; gaLoaded = true;
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    gtag('js', new Date()); gtag('config', GA_ID);
  }
  function consentModeValues() {
    try {
      var fc = window.googlefc;
      return fc && typeof fc.getGoogleConsentModeValues === 'function' ? (fc.getGoogleConsentModeValues() || null) : null;
    } catch (e) { return null; }
  }
  function apply() {
    var C = window.BBConsent;
    var cm = state.cmReady && C.tcfSignal(state.tc) !== 'no' ? consentModeValues() : null;
    var d = C.decide(state.tc, cm, state.us);
    var ga = d.analytics_storage === 'granted';
    window['ga-disable-' + GA_ID] = !ga;
    var key = JSON.stringify(d);
    if (key !== state.last) { state.last = key; gtag('consent', 'update', d); }
    if (ga) loadGA();
  }
  function watchConsent() {
    window.googlefc = window.googlefc || {};
    window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
    window.googlefc.callbackQueue.push({
      CONSENT_API_READY: function () {
        if (typeof window.__tcfapi !== 'function') return;
        window.__tcfapi('addEventListener', 2, function (tc, ok) {
          state.tc = ok ? tc : null;
          if (ok && tc && tc.eventStatus === 'useractioncomplete' && typeof window.googlefc.getGoogleConsentModeValues === 'function') state.cmReady = true;
          apply();
        });
      },
      CONSENT_MODE_DATA_READY: function () { state.cmReady = true; apply(); },
      INITIAL_US_STATES_OPT_OUT_DATA_READY: function () {
        try {
          var u = window.googlefc.usstatesoptout;
          state.us = u && typeof u.getInitialUsStatesOptOutStatus === 'function' ? u.getInitialUsStatesOptOutStatus() : null;
        } catch (e) { state.us = null; }
        apply();
      }
    });
    apply();
  }
  // U.S. visitors under a state privacy law get Google's opt-out dialog, everyone else the consent message.
  function openPrivacyMessage(before) {
    var fc = window.googlefc;
    var u = fc.usstatesoptout;
    if (u && typeof u.getInitialUsStatesOptOutStatus === 'function') {
      var E = u.InitialUsStatesOptOutStatusEnum;
      var doesNotApply = E && E.DOES_NOT_APPLY !== undefined ? E.DOES_NOT_APPLY : 1;
      var us = u.getInitialUsStatesOptOutStatus();
      if (us !== doesNotApply) {
        u.openConfirmationDialog(function (userDidOptOut) {
          if (userDidOptOut) {
            state.us = OPTED_OUT;   // ad personalization and analytics stay denied
          } else {
            try { state.us = u.getInitialUsStatesOptOutStatus(); } catch (e) { state.us = null; }
            // no opt-out: restore the signals withdrawn on click unless the CMP already sent new ones
            if (state.tc === null && !state.cmReady) { state.tc = before.tc; state.cmReady = before.cmReady; }
          }
          apply();
        });
        return;
      }
    }
    fc.showRevocationMessage();
  }
  function privacyButtons() {
    document.querySelectorAll('[data-privacy-settings]').forEach(function (b) {
      b.addEventListener('click', function () {
        // withdraw at once; the CMP reports the new decision through the listeners above
        var before = { tc: state.tc, cmReady: state.cmReady };
        state.tc = null; state.cmReady = false; apply();
        window.googlefc = window.googlefc || {};
        window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
        window.googlefc.callbackQueue.push(function () {
          try { openPrivacyMessage(before); } catch (e) { /* CMP not available */ }
        });
        loadAdScript();
      });
    });
  }

  /* ---------- saved balcony profile (localStorage only) ---------- */
  function readProfile() {
    try { return JSON.parse(localStorage.getItem('bbg-profile') || 'null'); } catch (e) { return null; }
  }
  function showProfile() {
    var box = document.getElementById('profile');
    if (!box) return;
    var p = readProfile();
    if (!p || !p.sun) return;
    var m = new Date().getMonth(), june = 5;
    function h(k, i) { return p.sun[k] ? p.sun[k][i].toFixed(1) + ' h' : '–'; }
    var dirs = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
    var dir = dirs[Math.round(((p.facing % 360) + 360) % 360 / 45) % 8];
    box.innerHTML = '<p><b>Your saved balcony</b> (' + dir + '-facing' + (p.place ? ', ' + p.place : '') + '): ' +
      'railing ' + h('railing', june) + ', middle ' + h('middle', june) + ', back wall ' + h('back', june) + ' of direct sun in June' +
      (m !== june ? '; this month railing ' + h('railing', m) + ', back wall ' + h('back', m) : '') +
      (p.wind ? '. Wind: ' + p.wind : '') + '. <a href="/tools/sun-hours/">Change it in the simulator</a>.</p>';
    box.hidden = false;
  }

  privacyButtons();
  if (adsOn) { loadAdScript(); fillSlots(); }
  if (window.BBConsent) watchConsent();
  showProfile();
})();
