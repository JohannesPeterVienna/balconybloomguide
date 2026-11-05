/*
 * Balcony Bloom Guide – page runtime: ad slots, consent-gated analytics, privacy settings,
 * and the saved "balcony profile" shown on guide pages.
 * Ad slot IDs stay empty until AdSense units exist: an empty ID renders nothing and reserves no space.
 *
 * Interim statistics window (“almanac note”, since 5 Nov 2026, Google Analytics only):
 * Google's consent message is published but currently reports displayStatus "hidden", so no TCF decision
 * arrives and analytics would never start. If, 3 s after start, Google's CMP has not spoken – no __tcfapi,
 * no "useractioncomplete", no "tcloaded" with a non-empty TC string, no message on screen ("cmpuishown" with
 * displayStatus hidden/disabled does not count) and gdprApplies is not false – the page asks itself.
 * Allow: analytics_storage granted + gtag.js once (Google signals and ad personalisation off).
 * Decline, withdrawal or a stored "denied": ga-disable on, analytics_storage denied, _ga/_ga_* cookies deleted.
 * The window never sends ad_storage, ad_user_data or ad_personalization (they stay "denied").
 * Stored in localStorage "bbg-stats" {v, choice, at}; asked again after 12 months.
 * Google's CMP always wins: once it shows its message, reports a decision or gdprApplies === false, only the
 * existing logic counts, the window closes and a stored choice is deleted; a clear "no" from Google deletes
 * the _ga cookies. GPC or a U.S. opt-out (initial status or GPP): no analytics, no automatic window.
 * Pages without Google code (html[data-google="off"]: imprint, privacy, contact, 404) load neither ads nor
 * analytics; there "Privacy settings" opens the window to view, change or withdraw the choice.
 */
(function () {
  'use strict';
  var CLIENT = 'ca-pub-7811071715414905';
  var SLOTS = {
    // Shared responsive AdSense units “Themen-Websites – …” (account pub-7811071715414905, created 17 Oct 2026)
    top: '7497607759',     // 970×250 billboard (≥1024 px) / 728×90 (≥768 px) / 300×250 (mobile), below the tool or the intro
    side: '1292301217',    // 300×600 half page, sidebar from 1200 px, not sticky
    inline: '1292301217'   // 300×250 in long guides
  };
  var GA_ID = 'G-T00HRG2YVF';
  var html = document.documentElement;
  var adsOn = html.getAttribute('data-ads') === 'yes';
  var googleOff = html.getAttribute('data-google') === 'off';   // imprint, privacy, contact, 404
  var gpc = false;
  try { gpc = navigator.globalPrivacyControl === true; } catch (e) { gpc = false; }

  /* ---------- ads ---------- */
  function loadAdScript() {
    if (document.querySelector('script[src*="adsbygoogle.js"]')) return;
    var s = document.createElement('script');
    s.async = true; s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + CLIENT;
    document.head.appendChild(s);
  }
  // Pages without Google code: on an explicit click only Google's consent script (Funding Choices) is loaded –
  // never adsbygoogle.js, so no Auto Ads can appear on the imprint, privacy, contact or error page.
  var consentScriptLoaded = false;
  function loadConsentScript() {
    if (consentScriptLoaded || document.querySelector('script[src*="fundingchoicesmessages.google.com"]')) return;
    consentScriptLoaded = true;
    signalGooglefcPresent();
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://fundingchoicesmessages.google.com/i/pub-7811071715414905?ers=1';
    document.head.appendChild(s);
  }
  // as in Google's own snippet: an invisible iframe named "googlefcPresent" tells the CMP it is present
  function signalGooglefcPresent() {
    try {
      if (window.frames && window.frames.googlefcPresent) return;
      if (!document.body) { if (typeof setTimeout === 'function') setTimeout(signalGooglefcPresent, 0); return; }
      var f = document.createElement('iframe');
      f.style.cssText = 'width:0;height:0;border:none;z-index:-1000;left:-1000px;top:-1000px;display:none';
      f.name = 'googlefcPresent';
      f.setAttribute('aria-hidden', 'true');
      f.tabIndex = -1;
      document.body.appendChild(f);
    } catch (e) { /* ignore */ }
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
  var state = { tc: null, cmReady: false, us: null, gppOptOut: false, last: '' };
  var gaLoaded = false;
  var OPTED_OUT = 3;   // InitialUsStatesOptOutStatusEnum.OPTED_OUT
  var lastTc = null;   // latest TCF data the CMP reported
  var GA_OFF = 'ga-disable-' + GA_ID;
  function loadGA() {
    if (gaLoaded) return; gaLoaded = true;
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    gtag('js', new Date()); gtag('config', GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
  }  function consentModeValues() {
    try {
      var fc = window.googlefc;
      return fc && typeof fc.getGoogleConsentModeValues === 'function' ? (fc.getGoogleConsentModeValues() || null) : null;
    } catch (e) { return null; }
  }
  function apply() {
    var C = window.BBConsent;
    if (stats.phase === 'active' || stats.phase === 'settings') { applyStats(); return; }   // interim window decides analytics
    var cm = state.cmReady && C.tcfSignal(state.tc) !== 'no' ? consentModeValues() : null;
    // a U.S. opt-out reported later through GPP keeps everything denied for the rest of the page view
    var d = state.gppOptOut ? Object.assign({}, C.DENIED_ALL) : C.decide(state.tc, cm, state.us);
    if (gpc || googleOff) d.analytics_storage = 'denied';   // GPC, or a page without analytics: no GA
    var ga = d.analytics_storage === 'granted';
    window[GA_OFF] = !ga;
    var key = JSON.stringify(d);
    if (key !== state.last) { state.last = key; gtag('consent', 'update', d); }
    if (ga) { loadGA(); stats.erased = false; }
    else googleNoCheck();
  }

  /* ---------- interim statistics window: state, storage, cookies ---------- */
  // phase: "waiting" (first 3 s) | "active" (the window decides analytics) | "retired" (Google's CMP decides)
  //        | "settings" (page without Google code: the window only stores a choice, nothing is measured here)
  var stats = { phase: googleOff ? 'settings' : 'waiting', pick: null, memo: undefined, erased: false };
  function statsRead() {
    var raw = stats.memo;   // a choice made in this page view wins (also when storage is blocked)
    if (raw === undefined) { try { raw = window.localStorage.getItem(window.BBConsent.STATS.KEY); } catch (e) { raw = null; } }
    return window.BBConsent.statsRecord(raw, Date.now());
  }
  function statsSave(choice) {
    var rec = { v: window.BBConsent.STATS.VERSION, choice: choice, at: Date.now() };
    stats.memo = JSON.stringify(rec);
    try { window.localStorage.setItem(window.BBConsent.STATS.KEY, stats.memo); } catch (e) { /* blocked: holds for this page view */ }
    return rec;
  }
  function statsForget() {
    stats.memo = null;
    try { window.localStorage.removeItem(window.BBConsent.STATS.KEY); } catch (e) { /* blocked: nothing stored */ }
  }
  function eraseGaCookies() {
    var C = window.BBConsent, names, host = '';
    try { names = C.gaCookieNames(document.cookie); } catch (e) { return; }
    try { host = window.location.hostname; } catch (e) { host = ''; }
    var domains = C.cookieDomains(host);
    names.forEach(function (n) {
      domains.forEach(function (d) {
        try { document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=/' + (d ? '; domain=' + d : ''); } catch (e) { /* ignore */ }
      });
    });
  }
  // statistics may not run at all: GPC, or a U.S. opt-out reported by Google (initial status or GPP)
  function statsBlocked() { return gpc || state.gppOptOut || state.us === OPTED_OUT; }
  function applyStats() {
    var ok = stats.phase === 'active' && !statsBlocked() && !!stats.pick && stats.pick.choice === 'granted';
    window[GA_OFF] = !ok;
    var key = 'stats:' + ok;
    // only analytics_storage – the window never touches ad_storage, ad_user_data or ad_personalization
    if (key !== state.last) { state.last = key; gtag('consent', 'update', { analytics_storage: ok ? 'granted' : 'denied' }); }
    if (ok) { loadGA(); stats.erased = false; }
    else googleNoCheck();
  }
  // Google clearly declined analytics (even if the window was never active), GPC or a U.S. opt-out:
  // no GA cookie may stay
  function googleNoCheck() {
    if (stats.erased) return;
    var no = statsBlocked();
    if (!no && state.tc) {
      var cm = state.cmReady ? consentModeValues() : null;
      no = window.BBConsent.googleSaysNo(state.tc, cm ? cm.analyticsStoragePurposeConsentStatus : undefined);
    }
    if (no) { stats.erased = true; eraseGaCookies(); }
  }
  // every TCF event: Google's CMP has priority over the window
  function statsSeeTc(tc) {
    var C = window.BBConsent;
    if (!tc || (stats.phase === 'settings' && !googleAsked)) return;
    if (tc.gdprApplies === false || C.cmpDecided(tc)) statsForget();   // Google's answer replaces the window's
    if (C.cmpSpoke(tc) && stats.phase !== 'retired') {
      stats.phase = 'retired'; stats.pick = null;
      state.last = '';     // send the full CMP-based update again
      closeNote(false);
    }
  }
  var statsTimer = null;
  function startStats(byButton) {
    if (statsTimer !== null) { try { clearTimeout(statsTimer); } catch (e) { /* ignore */ } statsTimer = null; }
    if (stats.phase !== 'waiting') return;
    if (window.BBConsent.cmpSpoke(state.tc)) { statsSeeTc(state.tc); apply(); return; }
    stats.phase = 'active';
    stats.pick = statsRead();
    state.last = '';
    apply();
    if (!byButton && !stats.pick && !statsBlocked()) openNote(null);   // GPC / U.S. opt-out: nothing is pushed
  }
  // Later U.S. opt-outs (after the initial status) arrive through the IAB GPP API of Google's CMP.
  // Only ever used to deny; a missing API or a failed call leaves the current (denied-by-default) state.
  var gppWatching = false;
  function gppEvent(pd) {
    var out;
    try { out = window.BBConsent.gppUsOptOut(pd); } catch (e) { out = true; }
    if (out === true && !state.gppOptOut) { state.gppOptOut = true; apply(); closeNote(false); }
  }
  function watchGpp() {
    if (gppWatching || typeof window.__gpp !== 'function') return;
    try {
      window.__gpp('addEventListener', function (evt, ok) {
        if (!ok) return;   // call failed: nothing changes
        try {
          if (evt && evt.pingData !== undefined) gppEvent(evt.pingData);
          else window.__gpp('ping', function (pd, pok) { if (pok) gppEvent(pd); });
        } catch (e) { gppEvent(null); }
      });
      gppWatching = true;
    } catch (e) { /* GPP API not usable: keep the current state */ }
  }
  function watchConsent() {
    window.googlefc = window.googlefc || {};
    window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
    window.googlefc.callbackQueue.push({
      CONSENT_API_READY: function () {
        watchGpp();
        if (typeof window.__tcfapi !== 'function') return;
        window.__tcfapi('addEventListener', 2, function (tc, ok) {
          state.tc = ok ? tc : null;
          if (ok && tc) lastTc = tc;   // kept across the click-time withdrawal for the dialog choice
          if (ok && tc) statsSeeTc(tc);
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
        watchGpp();
      }
    });
    apply();
  }
  // U.S. visitors under a state privacy law get Google's opt-out dialog, everyone else the consent message.
  // The U.S. dialog only when the status is known to be NOT_OPTED_OUT or OPTED_OUT and the TCF data
  // does not say the GDPR applies; UNKNOWN (0), DOES_NOT_APPLY or an EU visitor → revocation message,
  // so a visitor in the EU can always withdraw consent.
  function openPrivacyMessage(before) {
    var fc = window.googlefc;
    var u = fc.usstatesoptout;
    if (u && typeof u.getInitialUsStatesOptOutStatus === 'function') {
      var E = u.InitialUsStatesOptOutStatusEnum;
      var notOptedOut = E && E.NOT_OPTED_OUT !== undefined ? E.NOT_OPTED_OUT : 2;
      var optedOut = E && E.OPTED_OUT !== undefined ? E.OPTED_OUT : 3;
      var tc = lastTc || (before && before.tc);
      var gdpr = !!(tc && tc.gdprApplies === true);
      var us = u.getInitialUsStatesOptOutStatus();
      if ((us === notOptedOut || us === optedOut) && !gdpr && typeof u.openConfirmationDialog === 'function') {
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
        // interim mode or a page without Google code: our own window to view, change or withdraw
        // first 3 s: decide now – Google's way only if its CMP has already spoken
        if (stats.phase === 'waiting') startStats(true);
        if (stats.phase === 'active' || stats.phase === 'settings') { openNote(b); return; }
        openGoogleChoices();
      });
    });
  }
  // Google's consent message (EU) or U.S. opt-out dialog. Withdraws at once; the CMP reports the new
  // decision through the listeners above.
  var googleAsked = false;
  function openGoogleChoices() {
    var before = { tc: state.tc, cmReady: state.cmReady };
    state.tc = null; state.cmReady = false; apply();
    window.googlefc = window.googlefc || {};
    window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
    window.googlefc.callbackQueue.push(function () {
      try { openPrivacyMessage(before); } catch (e) { /* CMP not available */ }
    });
    if (googleOff) googleAsked = true;
    // order as in Google's snippet: queue + callback (above) → iframe "googlefcPresent" → consent script.
    // Content pages already carry the AdSense loader with the CMP: nothing is loaded then. Never adsbygoogle.js on click.
    if (googleOff || !document.querySelector('script[src*="adsbygoogle.js"]')) loadConsentScript();
  }

  /* ---------- interim statistics window: the almanac note ---------- */
  var note = null, noteLive = null, noteOpener = null, noteResize = false;
  function noteDate(ms) {
    try { return new Date(ms).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }
    catch (e) { return new Date(ms).toISOString().slice(0, 10); }
  }
  function buildNote() {
    var el = document.createElement('section');
    el.className = 'almanote';
    el.id = 'bbg-stats';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'false');
    el.setAttribute('aria-labelledby', 'almanote-title');
    el.setAttribute('aria-describedby', 'almanote-text');
    el.innerHTML =
      '<p class="almanote-kicker"><span class="almanote-sun" aria-hidden="true"></span>Almanac note · statistics only</p>' +
      '<button type="button" class="almanote-x" data-note="close" aria-label="Close without choosing" title="Close without choosing">×</button>' +
      '<h2 class="almanote-title" id="almanote-title" tabindex="-1"></h2>' +
      '<div class="almanote-text" id="almanote-text"></div>' +
      '<p class="almanote-now" data-note-now></p>' +
      '<div class="almanote-picks" data-note-picks>' +
      '<button type="button" class="almanote-pick" data-note="granted">Allow</button>' +
      '<button type="button" class="almanote-pick" data-note="denied">Decline</button></div>' +
      '<div class="almanote-picks almanote-picks--one" data-note-ok hidden><button type="button" class="almanote-pick" data-note="close">Close</button></div>' +
      '<p class="almanote-google" data-note-google hidden><button type="button" class="linklike" data-note="google">Open Google’s ad &amp; U.S. privacy choices</button></p>';
    el.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-note]') : null;
      if (!t) return;
      var what = t.getAttribute('data-note');
      if (what === 'granted' || what === 'denied') chooseStats(what);
      else if (what === 'google') {   // explicit click only: load Google's consent script and open its message
        var opener = noteOpener; closeNote(false); noteOpener = null;
        openGoogleChoices();
        if (opener && opener.focus) { try { opener.focus(); } catch (e2) { /* ignore */ } }
      }
      else closeNote(true);   // × = no choice
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeNote(true); }   // Escape = no choice, never consent
    });
    // early in the tab order (right after "Skip to content"), shown fixed at the bottom: no layout shift
    var skip = document.querySelector('.skip');
    if (skip && skip.parentNode === document.body && skip.after) skip.after(el);
    else document.body.insertBefore(el, document.body.firstChild);
    note = el;
  }
  // the live region exists from page start, so screen readers pick up later announcements
  function makeLive() {
    try {
      if (noteLive || !document.body) return;
      var live = document.createElement('p');
      live.className = 'almanote-live';
      live.setAttribute('role', 'status');
      var skip = document.querySelector('.skip');
      if (skip && skip.parentNode === document.body && skip.after) skip.after(live);
      else document.body.insertBefore(live, document.body.firstChild);
      noteLive = live;
    } catch (e) { /* no DOM */ }
  }
  function announce(text) {
    makeLive();
    if (!noteLive) return;
    noteLive.textContent = '';
    if (typeof setTimeout === 'function') setTimeout(function () { noteLive.textContent = text; }, 150);
    else noteLive.textContent = text;
  }
  function fillNote() {
    var title = note.querySelector('#almanote-title'), text = note.querySelector('#almanote-text'), now = note.querySelector('[data-note-now]');
    var blocked = statsBlocked();
    var link = ' <a href="/privacy/#interim-statistics">Privacy policy</a>';
    if (blocked) {
      title.textContent = 'Statistics stay off';
      text.innerHTML = '<p>' + (gpc
        ? 'Your browser sends a Global Privacy Control signal, so Google Analytics stays switched off on this site and we don’t ask for consent.'
        : 'You have opted out under a U.S. state privacy law, so Google Analytics stays switched off on this site.') + link + '</p>';
      now.textContent = '';
    } else {
      var rec = statsRead();
      title.textContent = 'Allow visitor statistics?';
      text.innerHTML = '<p>If you allow it, Google Analytics (Google Ireland Ltd.) counts page views and how the guides and tools are used, and sets cookies on your device; data may be processed in the USA. ' +
        'Statistics only – this is not consent to advertising. No choice means no statistics. ' +
        'Saved in this browser for 12 months; change it any time under “Privacy settings”.' + link + '</p>';
      var line = rec ? 'Your current choice: ' + (rec.choice === 'granted' ? 'allowed' : 'declined') + ' on ' + noteDate(rec.at) + '.'
        : (noteOpener ? 'No choice saved in this browser yet.' : '');
      if (stats.phase === 'settings') line += (line ? ' ' : '') + 'Nothing is measured on this page. To withdraw consent to ads or to opt out under U.S. state law, use the link below; it loads Google’s consent script only then.';
      now.textContent = line;
    }
    now.hidden = !now.textContent;
    note.querySelector('[data-note-picks]').hidden = blocked;
    note.querySelector('[data-note-ok]').hidden = !blocked;
    note.querySelector('[data-note-google]').hidden = !noteOpener;   // only in a window opened via “Privacy settings”
  }
  function noteRoom() {   // keeps the footer reachable while the note is open
    try {
      document.body.style.paddingBottom = note && !note.hidden ? Math.ceil(note.getBoundingClientRect().height) + 16 + 'px' : '';
    } catch (e) { /* ignore */ }
  }
  function openNote(opener) {
    try {
      if (!document.body) return;
      if (!note) buildNote();
      noteOpener = opener || null;
      fillNote();
      note.hidden = false;
      watchEscape(true);
      noteRoom();
      if (!noteResize) { noteResize = true; window.addEventListener('resize', noteRoom); }
      if (noteOpener) note.querySelector('#almanote-title').focus({ preventScroll: true });   // asked for: focus moves in
      else announce('A question about visitor statistics is shown at the bottom of the page.');
    } catch (e) { /* no DOM: nothing to show */ }
  }
  // Escape also closes the open note when focus is elsewhere – unless another open menu or dialog, or a
  // form field, handles Escape itself. The listener exists only while the note is open.
  function noteEscape(e) {
    if (e.key !== 'Escape' || e.defaultPrevented || !note || note.hidden) return;
    var t = e.target;
    if (t && t.closest && t.closest('dialog[open], [role="dialog"]:not(#bbg-stats), [role="menu"], [role="listbox"], [aria-expanded="true"], details[open], select, textarea, input')) return;
    closeNote(true);
  }
  function watchEscape(on) {
    try {
      if (on) document.addEventListener('keydown', noteEscape);
      else document.removeEventListener('keydown', noteEscape);
    } catch (e) { /* no DOM */ }
  }
  function closeNote(returnFocus) {
    if (!note || note.hidden) return;
    var hadFocus = false;
    try { hadFocus = note.contains(document.activeElement); } catch (e) { hadFocus = false; }
    note.hidden = true;
    watchEscape(false);
    noteRoom();
    try {
      if ((returnFocus || hadFocus) && noteOpener && noteOpener.focus) noteOpener.focus();
      else if (hadFocus) {   // no opener (window appeared by itself): focus goes to the main content
        var main = document.getElementById('main');
        if (main) { if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); }
      }
    } catch (e) { /* ignore */ }
    noteOpener = null;
  }
  function chooseStats(choice) {
    if (stats.phase !== 'active' && stats.phase !== 'settings') { closeNote(true); return; }   // Google decides now
    if (statsBlocked()) { closeNote(true); return; }
    stats.pick = statsSave(choice);
    if (choice === 'denied') {
      window[GA_OFF] = true;
      if (stats.phase === 'active') { gtag('consent', 'update', { analytics_storage: 'denied' }); state.last = 'stats:false'; }
      eraseGaCookies();
    }
    if (stats.phase === 'active') apply();   // pages without Google code: stored only, no gtag update
    closeNote(true);
    announce(stats.phase === 'settings'
      ? 'Saved for the other pages of this site: statistics ' + (choice === 'denied' ? 'declined' : 'allowed') + '. Nothing is measured on this page.'
      : choice === 'denied' ? 'Saved: statistics are switched off.' : 'Saved: statistics with Google Analytics are switched on.');
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
  if (window.BBConsent) {
    makeLive();
    var stored = statsRead();
    if (stored && stored.choice === 'denied') eraseGaCookies();   // declined earlier: no GA cookie may linger
    watchConsent();
    if (stats.phase === 'waiting' && typeof setTimeout === 'function') statsTimer = setTimeout(function () { statsTimer = null; startStats(false); }, window.BBConsent.STATS.WAIT_MS);
  } else stats.phase = 'retired';
  showProfile();
})();
