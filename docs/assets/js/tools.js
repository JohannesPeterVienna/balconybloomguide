/*
 * Balcony Bloom Guide – tool interfaces (Sun & Shade Simulator, Pot Weight Planner, Wind Exposure Check,
 * Watering & Holiday Planner, Frost Date & Sowing Planner, plant reference filter, quick sun check on the home page).
 * Everything runs in the browser; inputs are kept only in this browser's localStorage. A link made with
 * "Copy link" carries the entered values after the # sign; they are read once and then removed from the address bar.
 */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var P = window.BBPlan, D = window.BBData;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTHS_L = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var SPOTS = [['railing', 'Railing'], ['middle', 'Middle'], ['back', 'Back wall']];
  var IN = 2.54, LB = 2.20462, FT = 0.3048, GAL = 3.78541, PSF = 4.88243, KN = 101.972;

  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key) || 'null');
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }
  function profile(patch) {
    var p = store('bbg-profile') || {};
    if (patch) { Object.keys(patch).forEach(function (k) { p[k] = patch[k]; }); store('bbg-profile', p); }
    return p;
  }
  function num(el) { var v = parseFloat(String(el.value).replace(',', '.')); return isFinite(v) ? v : NaN; }
  function fmt(v, d) { return isFinite(v) ? v.toFixed(d == null ? 1 : d) : '–'; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clock(min) { var h = Math.floor(min / 60), m = Math.round(min % 60); if (m === 60) { h++; m = 0; } return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
  function pill(h) { var c = BBSun.sunClass(h); return '<span class="pill ' + c + '">' + { full: 'full sun', part: 'part sun', shade: 'shade' }[c] + '</span>'; }
  function segment(el, onChange) {
    $$('button', el).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('button', el).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        onChange(b.getAttribute('data-v'));
      });
    });
  }
  function setSeg(el, v) { $$('button', el).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === v ? 'true' : 'false'); }); }
  function formValues(f) {
    var v = {};
    $$('input, select', f).forEach(function (el) { if (!el.name) return; v[el.name] = el.type === 'checkbox' ? el.checked : el.value; });
    return v;
  }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  // A result is rebuilt only when a value really changed: leaving a field (the "change" event) must not replace
  // the buttons under the result while one of them is being clicked.
  function sigOf(f) { return JSON.stringify(formValues(f)); }
  function bind(f, run) {
    function maybe() { if (sigOf(f) !== f._sig) run(); }
    f.addEventListener('input', debounce(maybe, 250));
    f.addEventListener('change', maybe);
    f.addEventListener('submit', function (e) { e.preventDefault(); run(); });
  }

  /* ---------- links, copying, files ---------- */
  // Values from a shared link (#key=value&…). Plain anchors such as #faq are left alone.
  function takeHash() {
    var h = location.hash || '';
    if (h.indexOf('=') < 0) return {};
    var st = P.decodeState(h);
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* address stays as it is */ }
    return st;
  }
  function linkFor(path, state) { return location.origin + path + '#' + P.encodeState(state); }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea'), ok = false;
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-999px';
    document.body.appendChild(ta); ta.select();
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  function copyText(text, status, okMsg) {
    function done(ok) { if (status) status.textContent = ok ? okMsg : 'Copying is blocked in this browser – the text is shown below, select and copy it by hand.'; if (!ok && status) { var pre = document.createElement('textarea'); pre.className = 'copybox'; pre.readOnly = true; pre.rows = 4; pre.value = text; pre.setAttribute('aria-label', 'Text to copy'); if (!status.parentNode.querySelector('.copybox')) status.parentNode.appendChild(pre); } }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallbackCopy(text)); });
    else done(fallbackCopy(text));
  }
  function download(name, text, mime) {
    var a = document.createElement('a'), url = URL.createObjectURL(new Blob([text], { type: mime }));
    a.href = url; a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 800);
  }
  var SHARE_NOTE = 'The link contains the values you entered, after the # sign. That part is not sent to our server when someone opens the link, but everyone you give the link to can read it.';
  function shareBar(extra) {
    return '<div class="row noprint sharebar"><button type="button" class="btn ghost" data-act="link">Copy link to this result</button><button type="button" class="btn ghost" data-act="text">Copy result as text</button>' + (extra || '') + '<span class="small" role="status" data-share-status></span></div><p class="small noprint">' + SHARE_NOTE + '</p>';
  }
  function wireShare(out, path, getState, getText) {
    var status = $('[data-share-status]', out);
    var l = $('[data-act="link"]', out), t = $('[data-act="text"]', out);
    if (l) l.addEventListener('click', function () { copyText(linkFor(path, getState()), status, 'Link copied.'); });
    if (t) t.addEventListener('click', function () { copyText(getText(), status, 'Result copied as text.'); });
  }
  // Example buttons: each fills the form with one stated case.
  function exampleBar(box, list, apply) {
    if (!box) return;
    box.innerHTML = '<span class="lbl">Examples</span>';
    list.forEach(function (ex) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = ex.name;
      b.addEventListener('click', function () { apply(ex.state); });
      box.appendChild(b);
    });
  }

  /* ================= Sun & Shade Simulator ================= */
  var CITIES = [
    ['New York, NY', 40.71, -74.01], ['Los Angeles, CA', 34.05, -118.24], ['Chicago, IL', 41.88, -87.63], ['Houston, TX', 29.76, -95.37],
    ['Phoenix, AZ', 33.45, -112.07], ['Philadelphia, PA', 39.95, -75.17], ['San Francisco, CA', 37.77, -122.42], ['Seattle, WA', 47.61, -122.33],
    ['Boston, MA', 42.36, -71.06], ['Washington, DC', 38.91, -77.04], ['Miami, FL', 25.76, -80.19], ['Atlanta, GA', 33.75, -84.39],
    ['Denver, CO', 39.74, -104.99], ['Minneapolis, MN', 44.98, -93.27], ['Toronto, ON', 43.65, -79.38], ['Montreal, QC', 45.50, -73.57],
    ['Vancouver, BC', 49.28, -123.12], ['London, UK', 51.51, -0.13], ['Manchester, UK', 53.48, -2.24], ['Edinburgh, UK', 55.95, -3.19],
    ['Dublin, Ireland', 53.35, -6.26], ['Amsterdam, Netherlands', 52.37, 4.90], ['Berlin, Germany', 52.52, 13.40], ['Vienna, Austria', 48.21, 16.37],
    ['Paris, France', 48.86, 2.35], ['Madrid, Spain', 40.42, -3.70], ['Rome, Italy', 41.90, 12.50], ['Dubai, UAE', 25.20, 55.27],
    ['Mumbai, India', 19.08, 72.88], ['Singapore', 1.35, 103.82], ['Hong Kong', 22.32, 114.17], ['Tokyo, Japan', 35.68, 139.69],
    ['Sydney, Australia', -33.87, 151.21], ['Melbourne, Australia', -37.81, 144.96], ['Brisbane, Australia', -27.47, 153.03],
    ['Perth, Australia', -31.95, 115.86], ['Auckland, New Zealand', -36.85, 174.76], ['Cape Town, South Africa', -33.92, 18.42]
  ];
  var FACINGS = [[0, 'North'], [45, 'Northeast'], [90, 'East'], [135, 'Southeast'], [180, 'South'], [225, 'Southwest'], [270, 'West'], [315, 'Northwest']];
  function cityIndex(name) { for (var i = 0; i < CITIES.length; i++) if (CITIES[i][0] === name) return i; return -1; }
  // Which crop group's light figure (UMD Extension) a number of sun hours meets.
  function lightGroup(h) {
    if (h >= 6) return 'meets the 6–8 h given for warm-season crops (tomato, pepper, eggplant, squash)';
    if (h >= 3) return 'meets the 3–5 h given for cool-season crops (lettuce, spinach, Asian greens), not the 6–8 h for warm-season crops';
    return 'is below the 3–5 h given for cool-season crops';
  }

  function initSun(root) {
    var f = $('#sun-form', root), unitSeg = $('#sun-units', root);
    var city = $('#sun-city', f);
    CITIES.forEach(function (c, i) { var o = document.createElement('option'); o.value = i; o.textContent = c[0]; city.appendChild(o); });
    var o2 = document.createElement('option'); o2.value = 'custom'; o2.textContent = 'Other place (enter latitude/longitude)'; city.appendChild(o2);
    var lenIds = ['depth', 'width', 'ceiling', 'rail', 'oppDist', 'oppHeight'];
    var unit = 'ft';

    function fill(v) {
      Object.keys(v).forEach(function (k) {
        var el = f.elements[k];
        if (!el) return;
        if (el.type === 'checkbox') el.checked = !!v[k]; else el.value = v[k];
      });
    }
    var saved = store('bbg-sun-form');
    if (saved && saved.unit) { unit = saved.unit; fill(saved.v); }
    function labelUnits() { $$('.u-len', root).forEach(function (s) { s.textContent = unit; }); }
    function syncVis() {
      $('#sun-custom', f).hidden = city.value !== 'custom';
      f.elements.ceiling.disabled = f.elements.openSky.checked;
      $('#sun-opp-fields', f).hidden = !f.elements.opp.checked;
    }
    // values from a link or an example button; everything is checked before it reaches the form
    function applyState(st) {
      var e = f.elements, i;
      if (st.unit) { unit = P.oneOf(st.unit, ['ft', 'm'], unit); }
      if (typeof st.city === 'string' && (i = cityIndex(st.city)) >= 0) city.value = String(i);
      else if (st.lat != null && st.lon != null) { city.value = 'custom'; e.lat.value = P.numIn(st.lat, -66, 66, 40.71); e.lon.value = P.numIn(st.lon, -180, 180, -74.01); }
      if (st.deg != null) { var d = P.numIn(st.deg, 0, 359.99, 90); e.facingDeg.value = d; if (d % 45 === 0) e.facing.value = String(d); }
      if (st.month != null) e.month.value = String(P.numIn(st.month, 1, 12, 6) | 0);
      [['depth', 0.1, 200], ['width', 0.1, 200], ['ceiling', 0.1, 200], ['rail', 0, 30], ['od', 0.1, 5000, 'oppDist'], ['oh', 0, 5000, 'oppHeight']].forEach(function (k) {
        if (st[k[0]] != null) { var n = P.numIn(st[k[0]], k[1], k[2], NaN); if (isFinite(n)) e[k[3] || k[0]].value = n; }
      });
      if (st.sky != null) e.openSky.checked = st.sky === '1';
      if (st.wl != null) e.wallLeft.checked = st.wl === '1';
      if (st.wr != null) e.wallRight.checked = st.wr === '1';
      if (st.rt != null) e.railType.value = P.oneOf(st.rt, ['open', 'glass', 'solid'], 'open');
      e.opp.checked = st.od != null && st.oh != null ? true : (st.opp === '0' ? false : e.opp.checked);
      setSeg(unitSeg, unit); labelUnits(); syncVis();
    }
    function state() {
      var e = f.elements, st = { deg: e.facingDeg.value, month: e.month.value, unit: unit, depth: e.depth.value, width: e.width.value, wl: e.wallLeft.checked ? 1 : 0, wr: e.wallRight.checked ? 1 : 0, rail: e.rail.value, rt: e.railType.value };
      if (city.value === 'custom') { st.lat = e.lat.value; st.lon = e.lon.value; } else st.city = CITIES[+city.value][0];
      if (e.openSky.checked) st.sky = 1; else st.ceiling = e.ceiling.value;
      if (e.opp.checked) { st.od = e.oppDist.value; st.oh = e.oppHeight.value; } else st.opp = 0;
      return st;
    }
    var linked = takeHash(), hasLink = Object.keys(linked).length > 0;
    if (hasLink) applyState(linked);
    setSeg(unitSeg, unit); labelUnits();
    segment(unitSeg, function (u) {
      if (u === unit) return;
      var k = u === 'm' ? FT : 1 / FT;
      lenIds.forEach(function (id) { var el = f.elements[id]; var v = num(el); if (isFinite(v)) el.value = +(v * k).toFixed(u === 'm' ? 2 : 1); });
      unit = u; labelUnits(); run();
    });
    city.addEventListener('change', syncVis);
    $('#sun-facing', f).addEventListener('change', function () { f.elements.facingDeg.value = this.value; });
    $('#sun-open-sky', f).addEventListener('change', syncVis);
    $('#sun-opp', f).addEventListener('change', syncVis);
    exampleBar($('#sun-examples', root), [
      { name: 'East-facing, New York, balcony above', state: { city: 'New York, NY', deg: '90', unit: 'ft', depth: '5', width: '10', ceiling: '8.5', sky: '0', wl: '1', wr: '1', rail: '3.5', rt: 'open', opp: '0', month: '6' } },
      { name: 'South-facing top floor, Phoenix, open sky', state: { city: 'Phoenix, AZ', deg: '180', unit: 'ft', depth: '6', width: '12', sky: '1', wl: '0', wr: '0', rail: '3.5', rt: 'glass', opp: '0', month: '7' } },
      { name: 'West-facing, London, building opposite', state: { city: 'London, UK', deg: '270', unit: 'm', depth: '1.5', width: '3', ceiling: '2.6', sky: '0', wl: '1', wr: '0', rail: '1.1', rt: 'solid', od: '18', oh: '9', month: '6' } }
    ], function (st) { applyState(st); run(); });

    function read() {
      var e = f.elements, lat, lon, place;
      if (city.value === 'custom') { lat = num(e.lat); lon = num(e.lon); place = 'custom location'; }
      else { var c = CITIES[+city.value]; lat = c[1]; lon = c[2]; place = c[0]; }
      var b = {
        unit: unit, facing: ((num(e.facingDeg) % 360) + 360) % 360, depth: num(e.depth), width: num(e.width),
        ceiling: e.openSky.checked ? null : num(e.ceiling),
        walls: { left: e.wallLeft.checked, right: e.wallRight.checked },
        railing: { height: num(e.rail), type: e.railType.value },
        opposite: e.opp.checked ? { distance: num(e.oppDist), height: num(e.oppHeight) } : null
      };
      var errs = [];
      if (!(lat >= -66 && lat <= 66) || !(lon >= -180 && lon <= 180)) errs.push('Latitude must be between −66° and 66°, longitude between −180° and 180°.');
      if (!(b.depth > 0) || !(b.width > 0)) errs.push('Depth and width must be greater than zero.');
      if (b.ceiling != null && !(b.ceiling > b.railing.height)) errs.push('The ceiling must be higher than the railing.');
      if (!(b.railing.height >= 0)) errs.push('Enter the railing height (0 if there is none).');
      if (b.opposite && (!(b.opposite.distance > 0) || !(b.opposite.height >= 0))) errs.push('Enter distance and height of the building opposite.');
      if (!isFinite(b.facing)) errs.push('Enter the direction the balcony faces.');
      return { lat: lat, lon: lon, place: place, b: b, month: +e.month.value, errs: errs };
    }

    function chart(year) {
      var W = chartWidth(), H = W < 500 ? 220 : 230, L = 26, B = 30, T = 10, max = 16, bw = (W - L - 8) / 12;
      var y = function (h) { return T + (H - T - B) * (1 - Math.min(h, max) / max); };
      var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-labelledby="sun-chart-t"><title id="sun-chart-t">Direct sun hours per day on the 15th of each month for railing, middle and back wall</title>';
      [0, 3, 6, 9, 12, 15].forEach(function (h) { s += '<line class="ax" x1="' + L + '" x2="' + (W - 4) + '" y1="' + y(h) + '" y2="' + y(h) + '"/><text x="' + (L - 6) + '" y="' + (y(h) + 4) + '" text-anchor="end">' + h + '</text>'; });
      s += '<line class="six" x1="' + L + '" x2="' + (W - 4) + '" y1="' + y(6) + '" y2="' + y(6) + '"/>';
      for (var m = 0; m < 12; m++) {
        var x0 = L + m * bw + 4, w = (bw - 8) / 3;
        SPOTS.forEach(function (sp, i) {
          var h = year[sp[0]][m];
          s += '<rect class="b-' + sp[0] + '" x="' + (x0 + i * w).toFixed(1) + '" y="' + y(h).toFixed(1) + '" width="' + (w - 1).toFixed(1) + '" height="' + (H - B - y(h)).toFixed(1) + '"><title>' + MONTHS_L[m] + ', ' + sp[1] + ': ' + h.toFixed(1) + ' h</title></rect>';
        });
        s += '<text x="' + (x0 + (bw - 8) / 2) + '" y="' + (H - 10) + '" text-anchor="middle">' + (W < 500 ? MONTHS[m].charAt(0) : MONTHS[m]) + '</text>';
      }
      return s + '</svg>';
    }
    function band(lat, lon, b, month) {
      var sp = BBSun.spots(b), W = chartWidth(), rowH = 34, L = W < 500 ? 72 : 92, H = 3 * rowH + 34, from = 240, to = 1200;
      var x = function (min) { return L + (W - L - 8) * (Math.min(Math.max(min, from), to) - from) / (to - from); };
      var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-labelledby="sun-band-t"><title id="sun-band-t">Times of direct sun on ' + MONTHS_L[month - 1] + ' 15 in local solar time</title>';
      for (var t = 300; t <= 1140; t += (W < 500 ? 240 : 120)) s += '<line class="ax" x1="' + x(t) + '" x2="' + x(t) + '" y1="4" y2="' + (H - 24) + '"/><text x="' + x(t) + '" y="' + (H - 8) + '" text-anchor="middle">' + clock(t) + '</text>';
      var txt = [];
      SPOTS.forEach(function (spot, i) {
        var d = BBSun.day(lat, lon, 2026, month, 15, b, sp[spot[0]]), y0 = 8 + i * rowH;
        s += '<text x="0" y="' + (y0 + 18) + '">' + spot[1] + '</text><rect x="' + L + '" y="' + y0 + '" width="' + (W - L - 8) + '" height="' + (rowH - 10) + '" rx="5" fill="var(--shade-soft)"/>';
        d.runs.forEach(function (r) { s += '<rect class="b-' + spot[0] + '" x="' + x(r[0]).toFixed(1) + '" y="' + y0 + '" width="' + Math.max(1, x(r[1]) - x(r[0])).toFixed(1) + '" height="' + (rowH - 10) + '" rx="5"><title>' + clock(r[0]) + '–' + clock(r[1]) + '</title></rect>'; });
        txt.push(spot[1] + ': ' + (d.runs.length ? d.runs.map(function (r) { return clock(r[0]) + '–' + clock(r[1]); }).join(', ') : 'no direct sun'));
      });
      return { svg: s + '</svg>', text: txt };
    }
    // The geometry behind the hours: how high the sun gets that day and from which angle the slab or a solid railing cuts it off.
    function why(r) {
      var jd = BBSun.julianDay(2026, r.month, 15), noonUtc = 720 - 4 * r.lon, best = -99, ahead = null, k;
      for (k = -720; k < 720; k += 2) {
        var s = BBSun.position(r.lat, r.lon, jd, noonUtc + k);
        if (s.el > best) best = s.el;
        var da = Math.abs(((s.az - r.b.facing) % 360 + 540) % 360 - 180);
        if (s.el > 2 && da < 1.5 && (!ahead || da < ahead.da)) ahead = { da: da, el: s.el, t: k + 720 };
      }
      var sp = BBSun.spots(r.b), li = '<li>Highest sun on ' + MONTHS_L[r.month - 1] + ' 15: ' + fmt(best, 1) + '° above the horizon (at 12:00 solar time).</li>';
      li += ahead ? '<li>The sun stands straight in front of the balcony at about ' + clock(ahead.t) + ' solar time, ' + fmt(ahead.el, 1) + '° high.</li>' : '<li>On this date the sun never stands straight in front of the balcony while it is above the horizon.</li>';
      if (r.b.ceiling != null) {
        li += '<li>The slab above cuts off sun that is steeper – measured straight out from the balcony – than ' + SPOTS.map(function (x) {
          var p = sp[x[0]], a = Math.atan2(r.b.ceiling - p.z, p.y) * 180 / Math.PI;
          return fmt(a, 0) + '° at the ' + x[1].toLowerCase() + ' spot';
        }).join(', ') + '. That is why the back of a balcony loses the high summer sun first.</li>';
      } else li += '<li>Open sky above: nothing cuts off the high sun; only the facade, side walls and the railing shade the spots.</li>';
      if (r.b.railing.type === 'solid' && r.b.railing.height > 0) {
        li += '<li>The solid railing blocks sun lower than ' + ['middle', 'back'].map(function (kx) {
          var p = sp[kx], a = Math.atan2(Math.max(0, r.b.railing.height - p.z), p.y) * 180 / Math.PI;
          return fmt(a, 0) + '° at the ' + (kx === 'middle' ? 'middle' : 'back wall') + ' spot';
        }).join(' and ') + ' (pots stand ' + (unit === 'ft' ? '1 ft' : '0.3 m') + ' high in the model).</li>';
      }
      if (r.b.opposite) li += '<li>The building opposite hides sun lower than ' + fmt(Math.atan2(r.b.opposite.height - r.b.railing.height, r.b.opposite.distance) * 180 / Math.PI, 0) + '° seen from the railing top.</li>';
      return '<h3>Why these hours</h3><ul>' + li + '</ul>';
    }

    function chartWidth() { var w = $('#sun-results', root).clientWidth || 640; return Math.max(320, Math.min(640, Math.round(w))); }
    function run() {
      f._sig = sigOf(f);
      var r = read(), out = $('#sun-results', root);
      store('bbg-sun-form', { unit: unit, v: formValues(f) });
      if (r.errs.length) { out.innerHTML = '<p role="alert"><b>Please check:</b> ' + r.errs.map(esc).join(' ') + '</p>'; return; }
      var year = BBSun.year(r.lat, r.lon, r.b), m = r.month, bd = band(r.lat, r.lon, r.b, m);
      var html = '<h3>' + MONTHS_L[m - 1] + ' 15: direct sun per spot</h3><div class="result-grid">';
      SPOTS.forEach(function (sp) { var h = year[sp[0]][m - 1]; html += '<div class="stat"><div class="l">' + sp[1] + '</div><div class="v">' + h.toFixed(1) + ' h</div>' + pill(h) + '</div>'; });
      html += '</div>' + why(r);
      html += '<h3>What that light is enough for</h3><ul>' + SPOTS.map(function (sp) {
        var h = year[sp[0]][m - 1];
        return '<li><b>' + sp[1] + ', ' + h.toFixed(1) + ' h:</b> ' + lightGroup(h) + '. <a href="/plants/reference/#hours=' + h.toFixed(1) + '">Crops for ' + h.toFixed(1) + ' h</a> · <a href="/tools/watering-planner/#sun=' + h.toFixed(1) + '">watering at ' + h.toFixed(1) + ' h</a></li>';
      }).join('') + '</ul><p class="small">Light figures: University of Maryland Extension, Growing Vegetables in Containers. They describe the growing season; check the months in which the crop stands outside.</p>';
      html += '<h3>Through the year</h3><div class="legend"><span><i style="background:var(--sun-bar)"></i>Railing</span><span><i style="background:var(--moss)"></i>Middle</span><span><i style="background:var(--shade)"></i>Back wall</span><span>dashed line = 6 h (full sun)</span></div>' + chart(year);
      html += '<h3>When the sun reaches each spot (' + MONTHS_L[m - 1] + ' 15)</h3>' + bd.svg + '<p class="small">' + bd.text.map(esc).join(' · ') + '. Times are local solar time: 12:00 is when the sun is highest; add about an hour in summer time and the offset of your time zone.</p>';
      var tbl = '<div class="tablewrap"><table class="data"><caption>Direct sun hours on the 15th of each month</caption><thead><tr><th>Month</th><th>Railing</th><th>Middle</th><th>Back wall</th></tr></thead><tbody>';
      for (var i = 0; i < 12; i++) tbl += '<tr><td>' + MONTHS_L[i] + '</td><td>' + year.railing[i].toFixed(1) + '</td><td>' + year.middle[i].toFixed(1) + '</td><td>' + year.back[i].toFixed(1) + '</td></tr>';
      html += tbl + '</tbody></table></div>';
      html += '<div class="row noprint"><button type="button" class="btn sun" id="sun-save">Save as my balcony</button><button type="button" class="btn ghost" id="sun-print">Print sun sheet</button><span id="sun-saved" class="small" role="status"></span></div>' + shareBar();
      out.innerHTML = html;
      $('#sun-save', out).addEventListener('click', function () {
        profile({ place: r.place, facing: r.b.facing, sun: year, savedAt: new Date().toISOString().slice(0, 10) });
        $('#sun-saved', out).textContent = 'Saved in this browser. Guide pages and the watering planner now use these hours.';
      });
      $('#sun-print', out).addEventListener('click', function () { window.print(); });
      wireShare(out, '/tools/sun-hours/', state, function () {
        var t = 'Direct sun on ' + MONTHS_L[m - 1] + ' 15 – ' + r.place + ', balcony facing ' + fmt(r.b.facing, 0) + '° (clear-sky geometry, balconybloomguide.com)\n';
        SPOTS.forEach(function (sp) { t += sp[1] + ': ' + year[sp[0]][m - 1].toFixed(1) + ' h\n'; });
        t += 'Month: railing / middle / back wall\n';
        for (var j = 0; j < 12; j++) t += MONTHS[j] + ': ' + year.railing[j].toFixed(1) + ' / ' + year.middle[j].toFixed(1) + ' / ' + year.back[j].toFixed(1) + '\n';
        return t;
      });
    }
    bind(f, run);
    syncVis();
    if (!saved && !hasLink) f.elements.month.value = String(new Date().getMonth() + 1);
    run();
  }

  /* ================= Quick sun check (home page) ================= */
  function initQuick(root) {
    var f = $('#quick-form', root), out = $('#quick-results', root), city = f.elements.city, facing = f.elements.facing;
    CITIES.forEach(function (c, i) { var o = document.createElement('option'); o.value = i; o.textContent = c[0]; city.appendChild(o); });
    FACINGS.forEach(function (x) { var o = document.createElement('option'); o.value = x[0]; o.textContent = x[1]; facing.appendChild(o); });
    facing.value = '90';
    takeHash();   // the home page takes no values from a link; anything of that shape is removed from the address bar
    var mNow = new Date().getMonth();
    function run() {
      var c = CITIES[+city.value] || CITIES[0], above = f.elements.above.checked;
      var b = { unit: 'ft', facing: +facing.value, depth: 5, width: 10, ceiling: above ? 8.5 : null, walls: { left: true, right: true }, railing: { height: 3.5, type: 'open' }, opposite: null };
      var year = BBSun.year(c[1], c[2], b);
      var st = { city: c[0], deg: facing.value, unit: 'ft', depth: 5, width: 10, wl: 1, wr: 1, rail: 3.5, rt: 'open', opp: 0, month: mNow + 1 };
      if (above) st.ceiling = 8.5; else st.sky = 1;
      var html = '<div class="result-grid">' + SPOTS.map(function (sp) { var h = year[sp[0]][mNow]; return '<div class="stat"><div class="l">' + sp[1] + ', ' + MONTHS_L[mNow] + ' 15</div><div class="v">' + h.toFixed(1) + ' h</div>' + pill(h) + '</div>'; }).join('') + '</div>';
      html += '<p>Same balcony on June 15: railing ' + year.railing[5].toFixed(1) + ' h, back wall ' + year.back[5].toFixed(1) + ' h. On December 15: railing ' + year.railing[11].toFixed(1) + ' h, back wall ' + year.back[11].toFixed(1) + ' h.</p>';
      html += '<p class="small">Assumed here: 5 ft (1.5 m) deep, 10 ft (3 m) wide, side walls, open railing' + (above ? ', the slab of the balcony above at 8.5 ft (2.6 m)' : ', open sky above') + '; clear-sky geometry for the 15th of the month.</p>';
      html += '<p class="row"><a class="btn sun" href="/tools/sun-hours/#' + esc(P.encodeState(st)) + '">Change the sizes and see all 12 months</a><a class="btn ghost" href="/plants/reference/#hours=' + year.railing[mNow].toFixed(1) + '">Crops for ' + year.railing[mNow].toFixed(1) + ' h at the railing</a></p>';
      out.innerHTML = html;
    }
    bind(f, run);
    run();
  }

  /* ================= Pot Weight Planner ================= */
  var POT_EXAMPLES = [
    { name: 'One 16 in terracotta pot', pots: [{ name: 'Terracotta pot', shape: 'round', top: 40.6, bottom: 30.5, height: 35.6, width: null, bottomWidth: null, material: 'terracotta', mix: 'potting', count: 1, emptyKg: null, plantKg: 0 }] },
    { name: 'Tomato tub and two rail boxes', pots: [
      { name: 'Tomato tub', shape: 'round', top: 45.7, bottom: 38.1, height: 40.6, width: null, bottomWidth: null, material: 'plastic', mix: 'potting', count: 1, emptyKg: null, plantKg: 3 },
      { name: 'Rail box', shape: 'trough', top: 61, bottom: null, height: 17.8, width: 20.3, bottomWidth: null, material: 'plastic', mix: 'lightweight', count: 2, emptyKg: null, plantKg: 0.5 }] },
    { name: 'Three herb pots, lightweight mix', pots: [{ name: 'Herb pot', shape: 'round', top: 30.5, bottom: 22.9, height: 25.4, width: null, bottomWidth: null, material: 'plastic', mix: 'lightweight', count: 3, emptyKg: null, plantKg: 0 }] }
  ];
  function initPots(root) {
    var f = $('#pot-form', root), af = $('#area-form', root), unitSeg = $('#pot-units', root), list = store('bbg-pots') || [];
    var unit = (store('bbg-pot-unit') || 'in');
    function labels() {
      $$('.u-len', root).forEach(function (s) { s.textContent = unit; });
      $$('.u-w', root).forEach(function (s) { s.textContent = unit === 'in' ? 'lb' : 'kg'; });
      $$('.u-big', root).forEach(function (s) { s.textContent = unit === 'in' ? 'ft' : 'm'; });
    }
    Object.keys(BBCalc.MIXES).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = BBCalc.MIXES[k].name; f.elements.mix.appendChild(o); });
    Object.keys(BBCalc.MATERIALS).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = BBCalc.MATERIALS[k].name; f.elements.material.appendChild(o); });
    f.elements.mix.value = 'potting'; f.elements.material.value = 'terracotta';
    var refSel = af.elements.ref;
    D.LOAD_REFS.forEach(function (r) { var o = document.createElement('option'); o.value = r.key; o.textContent = r.label; refSel.insertBefore(o, refSel.options[refSel.options.length - 1]); });
    var area = store('bbg-area') || {};
    ['bw', 'bd', 'refv'].forEach(function (k) { if (area[k] != null && af.elements[k]) af.elements[k].value = area[k]; });
    if (area.ref) refSel.value = P.oneOf(area.ref, ['none', 'custom'].concat(D.LOAD_REFS.map(function (r) { return r.key; })), 'none');
    if (area.refu) af.elements.refu.value = P.oneOf(area.refu, ['psf', 'kn', 'kg'], 'psf');

    // one pot from a link: name~shape~top~bottom~height~width~bottomWidth~material~mix~count~emptyKg~plantKg (cm and kg)
    function potFromLink(s) {
      var a = String(s).split('~');
      if (a.length !== 12) return null;
      var shape = P.oneOf(a[1], ['round', 'square', 'trough'], null), n = function (i, max) { return a[i] === '' ? null : P.numIn(a[i], 0, max, NaN); };
      var p = { name: P.cleanText(a[0], 40) || 'Pot', shape: shape, top: n(2, 500), bottom: n(3, 500), height: n(4, 500), width: n(5, 500), bottomWidth: n(6, 500),
        material: own(BBCalc.MATERIALS, a[7]) ? a[7] : null, mix: own(BBCalc.MIXES, a[8]) ? a[8] : null, count: P.numIn(a[9], 1, 99, 1) | 0, emptyKg: n(10, 2000), plantKg: n(11, 2000) || 0 };
      var bad = !shape || !p.material || !p.mix || !(p.top > 0) || !(p.height > 0) || (shape === 'trough' && !(p.width > 0));
      [p.bottom, p.width, p.bottomWidth, p.emptyKg, p.plantKg].forEach(function (v) { if (v != null && !isFinite(v)) bad = true; });
      if (shape !== 'trough') { p.width = null; p.bottomWidth = null; }
      return bad ? null : p;
    }
    function potToLink(p) {
      var r = function (v) { return v == null ? '' : String(+(+v).toFixed(2)); };
      return [String(p.name).replace(/~/g, ' '), p.shape, r(p.top), r(p.bottom), r(p.height), r(p.width), r(p.bottomWidth), p.material, p.mix, p.count, r(p.emptyKg), r(p.plantKg)].join('~');
    }
    var linked = takeHash();
    if (linked.unit) { unit = P.oneOf(linked.unit, ['in', 'cm'], unit); store('bbg-pot-unit', unit); }
    if (linked.p) {
      var fromLink = [].concat(linked.p).map(potFromLink).filter(Boolean).slice(0, 40);
      if (fromLink.length && (!list.length || window.confirm('This link contains a pot list. Replace the list saved in this browser with it?'))) { list = fromLink; store('bbg-pots', list); }
    }
    if (linked.bw != null) af.elements.bw.value = P.numIn(linked.bw, 0.1, 500, '');
    if (linked.bd != null) af.elements.bd.value = P.numIn(linked.bd, 0.1, 500, '');
    if (linked.ref != null) refSel.value = P.oneOf(linked.ref, ['none', 'custom'].concat(D.LOAD_REFS.map(function (r) { return r.key; })), 'none');
    if (linked.refv != null) af.elements.refv.value = P.numIn(linked.refv, 0.1, 5000, '');
    if (linked.refu != null) af.elements.refu.value = P.oneOf(linked.refu, ['psf', 'kn', 'kg'], 'psf');

    setSeg(unitSeg, unit);
    segment(unitSeg, function (u) {
      if (u === unit) return;
      var k = u === 'cm' ? FT : 1 / FT;
      ['bw', 'bd'].forEach(function (id) { var v = num(af.elements[id]); if (isFinite(v)) af.elements[id].value = +(v * k).toFixed(2); });
      unit = u; store('bbg-pot-unit', u); labels(); render();
    });
    labels();
    function shapeVis() {
      var s = f.elements.shape.value;
      $('#pot-width-wrap', f).hidden = s !== 'trough';
      $('#pot-bwidth-wrap', f).hidden = s !== 'trough';
      $('#pot-top-label', f).textContent = s === 'round' ? 'Top diameter' : s === 'square' ? 'Top side' : 'Top length';
      $('#pot-bottom-label', f).textContent = s === 'round' ? 'Bottom diameter' : s === 'square' ? 'Bottom side' : 'Bottom length';
    }
    f.elements.shape.addEventListener('change', shapeVis); shapeVis();
    function refVis() { $('#area-custom', af).hidden = refSel.value !== 'custom'; }
    refVis();

    function toCm(v) { return unit === 'in' ? v * IN : v; }
    function toKg(v) { return unit === 'in' ? v / LB : v; }
    function showW(kg) { return unit === 'in' ? fmt(kg * LB, 0) + ' lb' : fmt(kg, 1) + ' kg'; }
    function showV(l) { return unit === 'in' ? fmt(l / GAL, 1) + ' gal' : fmt(l, 1) + ' L'; }
    function showP(kgm2) { return unit === 'in' ? fmt(kgm2 / PSF, 0) + ' lb/sq ft' : fmt(kgm2, 0) + ' kg/m²'; }

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var el = f.elements, s = el.shape.value;
      var p = {
        name: el.name.value.trim().slice(0, 40) || ('Pot ' + (list.length + 1)), shape: s,
        top: toCm(num(el.top)), bottom: isFinite(num(el.bottom)) ? toCm(num(el.bottom)) : null, height: toCm(num(el.height)),
        width: s === 'trough' ? toCm(num(el.width)) : null, bottomWidth: s === 'trough' && isFinite(num(el.bwidth)) ? toCm(num(el.bwidth)) : null,
        material: el.material.value, mix: el.mix.value, count: Math.min(99, Math.max(1, Math.round(num(el.count) || 1))),
        emptyKg: isFinite(num(el.empty)) && num(el.empty) >= 0 ? toKg(num(el.empty)) : null, plantKg: isFinite(num(el.plant)) && num(el.plant) > 0 ? toKg(num(el.plant)) : 0
      };
      var msg = $('#pot-msg', root);
      if (!(p.top > 0) || !(p.height > 0) || (s === 'trough' && !(p.width > 0))) { msg.textContent = 'Please enter the size of the pot (top and height' + (s === 'trough' ? ' and width' : '') + ').'; return; }
      if (p.top > 500 || p.height > 500 || (p.width || 0) > 500) { msg.textContent = 'That is larger than 5 m (16 ft) – please check the numbers and the unit.'; return; }
      if (p.bottom != null && (p.bottom <= 0 || p.bottom > p.top * 1.5)) { msg.textContent = 'Please check the bottom size: it must be greater than zero and not much wider than the top.'; return; }
      if (list.length >= 40) { msg.textContent = 'The list holds up to 40 entries; use "How many" for identical pots.'; return; }
      msg.textContent = '';
      list.push(p); store('bbg-pots', list); render();
      el.name.value = '';
    });
    exampleBar($('#pot-examples', root), POT_EXAMPLES.map(function (x) { return { name: x.name, state: x.pots }; }), function (pots) {
      if (list.length && !window.confirm('Replace your current list with this example?')) return;
      list = pots.map(function (p) { var c = {}; Object.keys(p).forEach(function (k) { c[k] = p[k]; }); return c; });
      store('bbg-pots', list); render();
    });

    function readArea() {
      var e = af.elements, w = num(e.bw), d = num(e.bd), k = unit === 'in' ? FT : 1;
      var ref = null, refText = '';
      if (refSel.value === 'custom') {
        var v = num(e.refv), u = e.refu.value;
        if (v > 0) { ref = u === 'psf' ? v * PSF : u === 'kn' ? v * KN : v; refText = fmt(v, u === 'kn' ? 2 : 0) + ' ' + { psf: 'psf', kn: 'kN/m²', kg: 'kg/m²' }[u]; }
      } else {
        D.LOAD_REFS.forEach(function (r) { if (r.key === refSel.value) { ref = r.psf * PSF; refText = r.psf + ' psf'; } });
      }
      store('bbg-area', { bw: e.bw.value, bd: e.bd.value, ref: refSel.value, refv: e.refv.value, refu: e.refu.value });
      return { m2: w > 0 && d > 0 ? w * k * d * k : null, ref: ref, refText: refText };
    }
    function steps(p, w) {
      var mat = BBCalc.MATERIALS[p.material], v = BBCalc.potVolume(p), mixWet = BBCalc.MIXES[p.mix].wet;
      var s = '<li><b>' + esc(p.name) + ':</b> pot volume ' + fmt(v.total, 1) + ' L; filled to ' + BBCalc.HEADSPACE + ' cm below the rim ' + fmt(w.soilL, 1) + ' L × ' + mixWet + ' kg/L = ' + fmt(w.soilKg, 1) + ' kg wet mix; ';
      s += p.emptyKg != null ? 'empty pot as entered ' + fmt(w.potKg, 1) + ' kg; ' : 'pot wall ' + fmt(v.wallArea, 0) + ' cm² × ' + mat.wall + ' cm × ' + mat.rho + ' g/cm³ = ' + fmt(w.potKg, 1) + ' kg; ';
      s += 'plant ' + fmt(w.plantKg, 1) + ' kg → ' + fmt(w.eachKg, 1) + ' kg each' + (p.count > 1 ? ' × ' + p.count + ' = ' + fmt(w.totalKg, 1) + ' kg' : '') + '; base ' + fmt(w.footM2, 3) + ' m² → ' + fmt(w.pressureKgM2, 0) + ' kg/m² under the pot.</li>';
      return s;
    }
    function loadBlock(tot, heaviest) {
      var a = readArea();
      var h = '<h3>Load on the floor</h3>';
      if (heaviest) h += '<p>Most concentrated: <b>' + esc(heaviest.name) + '</b> puts ' + showP(heaviest.p) + ' on the area of its own base. A balcony figure in psf or kN/m² describes a load spread evenly over the whole floor, so a single heavy pot is a different kind of load – that question belongs to an engineer.</p>';
      if (!a.m2) return h + '<p class="small">Enter the length and depth of the balcony floor above to see the average load of the pots per ' + (unit === 'in' ? 'square foot' : 'square metre') + '.</p>';
      var r = P.areaLoad(tot, a.m2, a.ref);
      h += '<div class="result-grid"><div class="stat"><div class="l">Pots averaged over ' + (unit === 'in' ? fmt(a.m2 / (FT * FT), 0) + ' sq ft' : fmt(a.m2, 1) + ' m²') + '</div><div class="v">' + showP(r.avgKgM2) + '</div></div>';
      if (r.state !== 'none') h += '<div class="stat"><div class="l">Pots alone, as a share of the ' + esc(a.refText) + ' figure</div><div class="v">' + fmt(r.share * 100, 0) + ' %</div></div>';
      h += '</div>';
      var msg = {
        none: 'Choose or enter the live-load figure that applies to your building to compare. Without one, this number is only a description of your pots.',
        share: 'This percentage is not a rating, and a small one is not an all-clear. Planters are a permanent load that stays in place day and night; a live-load figure is the allowance for people, furniture and other movable things and is not spare capacity for plants. It also has to cover water in saucers and snow.',
        over: 'The pots alone reach or exceed the whole figure meant for everything on the balcony. Do not set this up without a structural engineer\'s written approval.'
      }[r.state];
      h += '<aside class="caution loadmsg" data-state="' + r.state + '"><p><b>' + { none: 'No comparison yet.', share: 'A proportion, not a verdict.', over: 'Over the figure.' }[r.state] + '</b> ' + msg + '</p><p>This is arithmetic, not a clearance: a design figure only helps if it is the one your balcony was built to and the structure is still sound, and nobody can see that from a pot list. The example figures come from one state\'s residential code and need not apply to your building. The owner, the building manager or a structural engineer decides.</p></aside>';
      return h;
    }
    function state() {
      var e = af.elements, st = { unit: unit, p: list.map(potToLink) };
      if (num(e.bw) > 0 && num(e.bd) > 0) { st.bw = e.bw.value; st.bd = e.bd.value; }
      if (refSel.value !== 'none') { st.ref = refSel.value; if (refSel.value === 'custom') { st.refv = e.refv.value; st.refu = e.refu.value; } }
      return st;
    }
    function rowsFor() {
      return list.map(function (p) { return { p: p, w: BBCalc.potWeight(p) }; });
    }

    function render() {
      af._sig = sigOf(af);
      var out = $('#pot-results', root);
      if (!list.length) { out.innerHTML = '<p class="small">No pots yet. Add your first pot above – the example values are a 16 in (41 cm) terracotta pot – or load one of the examples.</p>'; return; }
      var tot = 0, soil = 0, rows = '', heaviest = null, all = rowsFor();
      all.forEach(function (x, i) {
        var p = x.p, w = x.w;
        tot += w.totalKg; soil += w.soilL * p.count;
        if (!heaviest || w.pressureKgM2 > heaviest.p) heaviest = { name: p.name, p: w.pressureKgM2 };
        var size = unit === 'in' ? fmt(p.top / IN, 0) + ' × ' + fmt(p.height / IN, 0) + ' in' : fmt(p.top, 0) + ' × ' + fmt(p.height, 0) + ' cm';
        rows += '<tr><td>' + esc(p.name) + (p.count > 1 ? ' ×' + p.count : '') + '<br><span class="small">' + p.shape + ', ' + size + ', ' + BBCalc.MATERIALS[p.material].name.toLowerCase() + '</span></td>' +
          '<td class="n">' + showV(w.soilL) + '</td><td class="n">' + showW(w.soilKg) + '</td><td class="n">' + showW(w.potKg) + '</td><td class="n"><b>' + showW(w.eachKg) + '</b></td><td class="n">' + showW(w.totalKg) + '</td><td class="n">' + showP(w.pressureKgM2) + '</td>' +
          '<td class="noprint"><button type="button" class="linklike" data-del="' + i + '" aria-label="Remove ' + esc(p.name) + '">Remove</button></td></tr>';
      });
      out.innerHTML = '<div class="result-grid"><div class="stat"><div class="l">Total wet weight</div><div class="v">' + showW(tot) + '</div></div><div class="stat"><div class="l">Potting mix in all pots</div><div class="v">' + showV(soil) + '</div></div><div class="stat"><div class="l">Pots</div><div class="v">' + list.reduce(function (s, p) { return s + p.count; }, 0) + '</div></div></div>' +
        '<div class="tablewrap"><table class="potlist"><caption class="small" style="text-align:left">Balcony pot list – weights after watering and draining (estimates)</caption><thead><tr><th>Pot</th><th class="n">Mix</th><th class="n">Wet mix</th><th class="n">Empty pot</th><th class="n">Each</th><th class="n">All</th><th class="n">Under its base</th><th class="noprint"></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        loadBlock(tot, heaviest) +
        '<details class="steps"><summary>Show the calculation for each pot</summary><ul>' + all.map(function (x) { return steps(x.p, x.w); }).join('') + '</ul><p class="small">Volumes: truncated cone for round pots, prismoidal formula for square pots and troughs. Wet weight per litre and wall figures are the planner\'s stated typical values; real mixes vary by about a fifth.</p></details>' +
        '<p class="small">Estimates for planning only. A balcony\'s safe load depends on its construction and condition; this sheet does not say whether your balcony can carry these pots. Show it to your building manager or a structural engineer. Printed ' + new Date().toISOString().slice(0, 10) + ' from balconybloomguide.com.</p>' +
        '<div class="row noprint"><button type="button" class="btn sun" id="pot-print">Print data sheet</button><button type="button" class="btn ghost" id="pot-csv">Download CSV</button><button type="button" class="btn ghost" id="pot-clear">Clear list</button></div>' + shareBar();
      $$('[data-del]', out).forEach(function (b) { b.addEventListener('click', function () { list.splice(+b.getAttribute('data-del'), 1); store('bbg-pots', list); render(); }); });
      $('#pot-print', out).addEventListener('click', function () { window.print(); });
      $('#pot-clear', out).addEventListener('click', function () { if (window.confirm('Remove all pots from the list?')) { list = []; store('bbg-pots', list); render(); } });
      $('#pot-csv', out).addEventListener('click', function () {
        var rowsCsv = [['Pot', 'Count', 'Shape', 'Top (cm)', 'Bottom (cm)', 'Height (cm)', 'Width (cm)', 'Material', 'Mix', 'Mix volume (L)', 'Wet mix (kg)', 'Empty pot (kg)', 'Plant (kg)', 'Each (kg)', 'All (kg)', 'Under its base (kg/m2)']];
        all.forEach(function (x) {
          var p = x.p, w = x.w;
          rowsCsv.push([p.name, p.count, p.shape, fmt(p.top, 1), p.bottom == null ? '' : fmt(p.bottom, 1), fmt(p.height, 1), p.width == null ? '' : fmt(p.width, 1), BBCalc.MATERIALS[p.material].name, BBCalc.MIXES[p.mix].name, fmt(w.soilL, 1), fmt(w.soilKg, 1), fmt(w.potKg, 1), fmt(w.plantKg, 1), fmt(w.eachKg, 1), fmt(w.totalKg, 1), fmt(w.pressureKgM2, 0)]);
        });
        rowsCsv.push(['Total', '', '', '', '', '', '', '', '', fmt(soil, 1), '', '', '', '', fmt(tot, 1), '']);
        rowsCsv.push(['Estimates for planning only; not a statement about what the balcony can carry. balconybloomguide.com']);
        download('balcony-pot-list.csv', '﻿' + P.csv(rowsCsv), 'text/csv;charset=utf-8');
      });
      wireShare(out, '/tools/pot-weight/', state, function () {
        var t = 'Balcony pot list – wet weights after watering and draining (estimates, balconybloomguide.com)\n';
        all.forEach(function (x) { t += x.p.name + (x.p.count > 1 ? ' ×' + x.p.count : '') + ': ' + showW(x.w.eachKg) + ' each, ' + showW(x.w.totalKg) + ' in all, ' + showP(x.w.pressureKgM2) + ' under its base\n'; });
        t += 'Total: ' + showW(tot) + '\n';
        var a = readArea();
        if (a.m2) { var r = P.areaLoad(tot, a.m2, a.ref); t += 'Averaged over the floor: ' + showP(r.avgKgM2) + (r.share != null ? ' = ' + fmt(r.share * 100, 0) + ' % of ' + a.refText + ' (pots alone)' : '') + '\n'; }
        return t + 'Not a statement about what the balcony can carry.\n';
      });
    }
    bind(af, function () { refVis(); render(); });
    render();
  }

  /* ================= Wind Exposure Check ================= */
  var WIND_ADVICE = {
    sheltered: ['Most balcony plants are fine; normal pots and railing boxes on the inside of the railing work.', 'Still secure anything light or tall – gusts happen on every balcony.', 'Pots dry at about the normal rate for their sun.'],
    moderate: ['Choose wide, low pots for anything taller than about 3 ft (90 cm), or add weight at the base.', 'Railing boxes need adjustable clamp brackets that grip the rail (no drilling), not ones that only hook over it.', 'Expect pots to dry noticeably faster on windy days; mulch the surface.'],
    exposed: ['Avoid tall, top-heavy plants in light pots; group pots against the wall and in corners out of the gusts.', 'Fix every railing box and trellis; use a permeable screen (mesh, slatted) rather than a solid panel, which creates turbulence behind it.', 'Pick tough, small-leaved or grassy plants; large soft leaves tear.', 'Water checks become daily in summer.'],
    very: ['Treat everything as something that could fall: no loose pots on ledges, no hanging baskets, nothing hung on the outside of the railing.', 'Low, heavy containers only, placed against the wall; tall screens need professional fixing and the building\'s approval.', 'Grow compact, wind-hardy plants; protect evergreens from winter wind burn.', 'Drip irrigation or self-watering pots help – wind can dry small pots within a day.']
  };
  var WIND_OPTS = { position: ['middle', 'end', 'corner'], surroundings: ['dense', 'mixed', 'open'], recess: ['loggia', 'partial', 'projecting'], railing: ['open', 'glass', 'solid'], prevailing: ['unknown', 'yes', 'no'] };
  function initWind(root) {
    var f = $('#wind-form', root);
    var saved = store('bbg-wind-form');
    if (saved) Object.keys(saved).forEach(function (k) { if (f.elements[k]) f.elements[k].value = saved[k]; });
    function applyState(st) {
      if (st.floor != null) f.elements.floor.value = P.numIn(st.floor, 1, 200, 6) | 0;
      Object.keys(WIND_OPTS).forEach(function (k) { if (st[k] != null) f.elements[k].value = P.oneOf(st[k], WIND_OPTS[k], f.elements[k].value); });
    }
    applyState(takeHash());
    exampleBar($('#wind-examples', root), [
      { name: '2nd floor, loggia in a dense street', state: { floor: '2', position: 'middle', surroundings: 'dense', recess: 'loggia', railing: 'solid', prevailing: 'no' } },
      { name: '7th floor, end of the block, glass railing', state: { floor: '7', position: 'end', surroundings: 'mixed', recess: 'partial', railing: 'glass', prevailing: 'unknown' } },
      { name: '18th floor corner facing open water', state: { floor: '18', position: 'corner', surroundings: 'open', recess: 'projecting', railing: 'open', prevailing: 'yes' } }
    ], function (st) { applyState(st); run(); });
    function run() {
      f._sig = sigOf(f);
      var e = f.elements, w = { floor: num(e.floor), position: e.position.value, surroundings: e.surroundings.value, recess: e.recess.value, railing: e.railing.value, prevailing: e.prevailing.value };
      store('bbg-wind-form', formValues(f));
      var out = $('#wind-results', root);
      if (!(w.floor >= 1 && w.floor <= 200)) { out.innerHTML = '<p role="alert">Please enter your floor as a number from 1 (street level) to 200.</p>'; return; }
      var r = BBCalc.windScore(w);
      var rows = r.parts.map(function (p) { return '<tr><td>' + p[0] + '</td><td class="n">' + (p[1] > 0 ? '+' : '') + p[1] + '</td></tr>'; }).join('');
      out.innerHTML = '<div class="result-grid"><div class="stat"><div class="l">Wind class</div><div class="v">' + r.cls.name + '</div><div class="l">score ' + r.score + ' (−1 to 11)</div></div><div class="stat"><div class="l">Drying factor used by the watering planner</div><div class="v">× ' + r.cls.factor.toFixed(2) + '</div></div></div>' +
        '<h3>What this means on your balcony</h3><ul>' + WIND_ADVICE[r.cls.key].map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
        '<div class="tablewrap"><table class="potlist"><caption class="small" style="text-align:left">How the score was built</caption><tbody>' + rows + '<tr><th>Total</th><th class="n">' + r.score + '</th></tr></tbody></table></div>' +
        '<p>Next step: <a href="/tools/watering-planner/#wind=' + r.cls.key + '">open the watering planner with the ' + r.cls.name + ' class</a>.</p>' +
        '<div class="row noprint"><button type="button" class="btn sun" id="wind-save">Save to my balcony</button><span class="small" id="wind-saved" role="status"></span></div>' + shareBar();
      $('#wind-save', out).addEventListener('click', function () { profile({ wind: r.cls.name, windKey: r.cls.key, windFactor: r.cls.factor }); $('#wind-saved', out).textContent = 'Saved in this browser.'; });
      wireShare(out, '/tools/wind-check/', function () { return { floor: w.floor, position: w.position, surroundings: w.surroundings, recess: w.recess, railing: w.railing, prevailing: w.prevailing }; }, function () {
        return 'Wind exposure (points score, balconybloomguide.com): ' + r.cls.name + ', score ' + r.score + '\n' + r.parts.map(function (p) { return p[0] + ': ' + p[1]; }).join('\n') + '\nDrying factor for watering: × ' + r.cls.factor.toFixed(2) + '\n';
      });
    }
    bind(f, run);
    run();
  }

  /* ================= Watering & Holiday Planner ================= */
  function initWater(root) {
    var f = $('#water-form', root), unitSeg = $('#water-units', root), unit = store('bbg-pot-unit') || 'in';
    function labels() { $$('.u-len', root).forEach(function (s) { s.textContent = unit; }); }
    Object.keys(BBCalc.MATERIALS).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = BBCalc.MATERIALS[k].name; f.elements.material.appendChild(o); });
    Object.keys(BBCalc.WEATHER).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = BBCalc.WEATHER[k].name; f.elements.weather.appendChild(o); });
    f.elements.material.value = 'plastic'; f.elements.weather.value = 'hot';
    if (unit === 'cm') { f.elements.dia.value = 30; f.elements.height.value = 28; }
    var p = profile(), m = new Date().getMonth(), note = $('#water-profile', root);
    if (p.sun) {
      f.elements.sun.value = p.sun.railing[m].toFixed(1);
      note.textContent = 'Sun hours and wind are taken from your saved balcony (railing, ' + MONTHS_L[m] + '). Change them for pots at the back wall.';
    }
    if (p.windKey) f.elements.wind.value = p.windKey;
    function applyState(st) {
      var e = f.elements;
      if (st.unit) { unit = P.oneOf(st.unit, ['in', 'cm'], unit); }
      if (st.dia != null) e.dia.value = P.numIn(st.dia, 1, 500, e.dia.value);
      if (st.height != null) e.height.value = P.numIn(st.height, 1, 500, e.height.value);
      if (st.material != null && own(BBCalc.MATERIALS, st.material)) e.material.value = st.material;
      if (st.canopy != null) e.canopy.value = P.oneOf(st.canopy, ['compact', 'bushy', 'large'], e.canopy.value);
      if (st.sun != null) e.sun.value = P.numIn(st.sun, 0, 16, e.sun.value);
      if (st.wind != null) e.wind.value = P.oneOf(st.wind, ['sheltered', 'moderate', 'exposed', 'very'], e.wind.value);
      if (st.weather != null && own(BBCalc.WEATHER, st.weather)) e.weather.value = st.weather;
      if (st.days != null) e.days.value = P.numIn(st.days, 0, 30, 0) | 0;
      setSeg(unitSeg, unit); labels();
    }
    var linked = takeHash();
    if (Object.keys(linked).length) { applyState(linked); if (linked.sun != null || linked.wind != null) note.textContent = 'Values taken from the link you opened.'; }
    setSeg(unitSeg, unit);
    segment(unitSeg, function (u) {
      if (u === unit) return;
      var k = u === 'cm' ? IN : 1 / IN;
      ['dia', 'height'].forEach(function (id) { var v = num(f.elements[id]); if (isFinite(v)) f.elements[id].value = Math.round(v * k); });
      unit = u; store('bbg-pot-unit', u); labels(); run();
    });
    labels();
    exampleBar($('#water-examples', root), [
      { name: '12 in plastic pot, 6 h sun, hot days', state: { unit: 'in', dia: '12', height: '11', material: 'plastic', canopy: 'bushy', sun: '6', wind: 'moderate', weather: 'hot', days: '0' } },
      { name: 'Large tomato tub, 8 h sun, heatwave', state: { unit: 'in', dia: '18', height: '16', material: 'plastic', canopy: 'large', sun: '8', wind: 'exposed', weather: 'heat', days: '0' } },
      { name: 'Terracotta herb pot, one week away', state: { unit: 'in', dia: '10', height: '9', material: 'terracotta', canopy: 'compact', sun: '5', wind: 'sheltered', weather: 'warm', days: '7' } }
    ], function (st) { applyState(st); run(); });

    var pots = (store('bbg-pots') || []);
    var imp = $('#water-import', root);
    if (pots.length) { imp.hidden = false; imp.querySelector('span').textContent = pots.length; }
    var useList = false;
    imp.querySelector('button').addEventListener('click', function () { useList = !useList; this.textContent = useList ? 'Use the single pot below instead' : 'Use my pot list'; run(); });

    function factor(key) { var c = BBCalc.WIND_CLASSES.filter(function (x) { return x.key === key; })[0]; return c ? c.factor : 1; }
    function row(name, potLike, e) {
      var v = BBCalc.potVolume(potLike);
      var w = BBCalc.waterUse({ topM2: v.topArea, soilL: v.soil, material: potLike.material, canopy: e.canopy.value, sunHours: num(e.sun), windFactor: factor(e.wind.value), weather: e.weather.value, daysAway: num(e.days) || 0 });
      var per = unit === 'in' ? fmt(w.perDay * 33.814, 0) + ' fl oz' : fmt(w.perDay, 2) + ' L';
      var res = unit === 'in' ? fmt(w.reservoirL / GAL, 2) + ' gal' : fmt(w.reservoirL, 1) + ' L';
      return { html: '<tr><td>' + esc(name) + '</td><td class="n">' + per + '</td><td>' + BBCalc.checkAdvice(w.intervalDays) + '</td><td class="n">' + (num(e.days) > 0 ? res : '–') + '</td></tr>', w: w, v: v, text: name + ': ' + per + ' per day, ' + BBCalc.checkAdvice(w.intervalDays) + (num(e.days) > 0 ? ', reservoir ' + res : '') };
    }
    function run() {
      f._sig = sigOf(f);
      var e = f.elements, out = $('#water-results', root);
      if (!(num(e.sun) >= 0 && num(e.sun) <= 16)) { out.innerHTML = '<p role="alert">Enter direct sun hours between 0 and 16.</p>'; return; }
      if (!(num(e.days) >= 0 && num(e.days) <= 30) && e.days.value !== '') { out.innerHTML = '<p role="alert">Enter days away between 0 and 30.</p>'; return; }
      var rows = '', sum = 0, sumRes = 0, texts = [], how = '';
      if (useList && pots.length) {
        pots.forEach(function (pt) { for (var i = 0; i < pt.count; i++) { var r = row(pt.name + (pt.count > 1 ? ' #' + (i + 1) : ''), pt, e); rows += r.html; sum += r.w.perDay; sumRes += r.w.reservoirL; texts.push(r.text); } });
      } else {
        var d = num(e.dia), h = num(e.height);
        if (!(d > 0) || !(h > 0) || d > 500 || h > 500) { out.innerHTML = '<p role="alert">Enter the pot diameter and height (greater than zero).</p>'; return; }
        var k = unit === 'in' ? IN : 1;
        var r1 = row('Your pot', { shape: 'round', top: d * k, bottom: d * k * 0.8, height: h * k, material: e.material.value }, e);
        rows = r1.html; sum = r1.w.perDay; sumRes = r1.w.reservoirL; texts.push(r1.text);
        var et = BBCalc.WEATHER[e.weather.value].et, sunF = 0.4 + 0.06 * Math.min(Math.max(num(e.sun), 0), 10), wf = factor(e.wind.value), mf = BBCalc.MATERIALS[e.material.value].dry, cf = BBCalc.CANOPY[e.canopy.value];
        how = '<details class="steps"><summary>Show the calculation</summary><ul><li>Water use: ' + et + ' mm/day (weather) × ' + fmt(sunF, 2) + ' (sun: 0.4 + 0.06 × ' + fmt(Math.min(num(e.sun), 10), 1) + ' h) × ' + fmt(wf, 2) + ' (wind) × ' + fmt(mf, 2) + ' (pot material) × ' + fmt(r1.v.topArea, 3) + ' m² pot top × ' + cf + ' (plant size) = ' + fmt(r1.w.perDay, 2) + ' L per day.</li><li>Buffer: ' + fmt(r1.v.soil, 1) + ' L of mix × 0.2 usable × 0.5 (water when half is used) = ' + fmt(r1.v.soil * 0.1, 2) + ' L; ' + fmt(r1.v.soil * 0.1, 2) + ' ÷ ' + fmt(r1.w.perDay, 2) + ' = ' + fmt(r1.w.intervalDays, 1) + ' days between checks.</li>' + (num(e.days) > 0 ? '<li>Trip: ' + num(e.days) + ' days × ' + fmt(r1.w.perDay, 2) + ' L × 1.2 − ' + fmt(r1.v.soil * 0.1, 2) + ' L buffer = ' + fmt(r1.w.reservoirL, 1) + ' L reservoir.</li>' : '') + '</ul><p class="small">The factors are this planner\'s stated assumptions, not measurements of your plant.</p></details>';
      }
      var tot = unit === 'in' ? fmt(sum / GAL, 2) + ' gal' : fmt(sum, 1) + ' L';
      var totRes = unit === 'in' ? fmt(sumRes / GAL, 1) + ' gal' : fmt(sumRes, 1) + ' L';
      out.innerHTML = '<div class="result-grid"><div class="stat"><div class="l">Estimated water use per day</div><div class="v">' + tot + '</div></div>' +
        (num(e.days) > 0 ? '<div class="stat"><div class="l">Reservoir for ' + num(e.days) + ' days away (incl. 20 % margin)</div><div class="v">' + totRes + '</div></div>' : '') + '</div>' +
        '<div class="tablewrap"><table class="potlist"><thead><tr><th>Pot</th><th class="n">Per day</th><th>Check</th><th class="n">Reservoir</th></tr></thead><tbody>' + rows + '</tbody></table></div>' + how +
        '<p class="small">Estimates for a plant of the chosen size in a pot of this volume. The finger test decides: water when the top inch (2–3 cm) is dry, until water runs from the drainage hole.</p>' + shareBar();
      wireShare(out, '/tools/watering-planner/', function () { return { unit: unit, dia: e.dia.value, height: e.height.value, material: e.material.value, canopy: e.canopy.value, sun: e.sun.value, wind: e.wind.value, weather: e.weather.value, days: e.days.value || 0 }; }, function () {
        return 'Watering estimate (balconybloomguide.com) – ' + BBCalc.WEATHER[e.weather.value].name + ', ' + e.sun.value + ' h direct sun, wind class ' + e.wind.value + '\n' + texts.join('\n') + '\nTotal per day: ' + tot + (num(e.days) > 0 ? '\nReservoir for ' + num(e.days) + ' days: ' + totRes : '') + '\nEstimate only – the finger test decides.\n';
      });
    }
    bind(f, run);
    run();
  }

  /* ================= Frost Date & Sowing Planner ================= */
  function initFrost(root) {
    var f = $('#frost-form', root), out = $('#frost-results', root), place = f.elements.place;
    D.STATIONS.forEach(function (s) { var o = document.createElement('option'); o.value = s[1]; o.textContent = s[0]; place.appendChild(o); });
    var oc = document.createElement('option'); oc.value = 'custom'; oc.textContent = 'Other place – enter my own frost dates'; place.appendChild(oc);
    place.value = 'USW00094728';
    ['lfm', 'ffm'].forEach(function (id) { MONTHS_L.forEach(function (mn, i) { var o = document.createElement('option'); o.value = i + 1; o.textContent = mn; f.elements[id].appendChild(o); }); });
    f.elements.lfm.value = '4'; f.elements.ffm.value = '10';
    function station(id) { for (var i = 0; i < D.STATIONS.length; i++) if (D.STATIONS[i][1] === id) return D.STATIONS[i]; return null; }
    function vis() { $('#frost-custom', f).hidden = place.value !== 'custom'; f.elements.risk.disabled = place.value === 'custom'; }
    function applyState(st) {
      var e = f.elements;
      if (st.place != null) place.value = st.place === 'custom' || station(st.place) ? st.place : place.value;
      if (st.risk != null) e.risk.value = P.oneOf(st.risk, ['median', 'cautious'], 'median');
      if (st.lf != null && P.doy(st.lf) != null) { var a = P.fromDoy(P.doy(st.lf)); e.lfm.value = a.m; e.lfd.value = a.d; }
      if (st.ff != null && P.doy(st.ff) != null) { var b = P.fromDoy(P.doy(st.ff)); e.ffm.value = b.m; e.ffd.value = b.d; }
      if (st.mix != null) e.mix.value = P.oneOf(st.mix, ['potting', 'lightweight'], 'potting');
      vis();
    }
    applyState(takeHash());
    exampleBar($('#frost-examples', root), [
      { name: 'Minneapolis, median dates', state: { place: 'USW00014922', risk: 'median' } },
      { name: 'Atlanta, cautious dates', state: { place: 'USW00013874', risk: 'cautious' } },
      { name: 'Own dates: May 12 and October 5', state: { place: 'custom', lf: '5/12', ff: '10/5' } }
    ], function (st) { applyState(st); run(); });

    function timeline(lf, ff, s) {
      var W = Math.max(320, Math.min(720, Math.round(out.clientWidth || 640))), L = W < 500 ? 78 : 96, rowH = 24, top = 26, H = top + 5 * rowH + 28;
      var x = function (d) { return L + (W - L - 8) * (d - 1) / 364; };
      var svg = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-labelledby="frost-tl"><title id="frost-tl">Year line with the frost-free period and the earliest planting-out dates of the four frost classes</title>';
      var acc = 0;
      for (var m = 0; m < 12; m++) { svg += '<line class="ax" x1="' + x(acc + 1).toFixed(1) + '" x2="' + x(acc + 1).toFixed(1) + '" y1="' + top + '" y2="' + (H - 22) + '"/><text x="' + (x(acc + 15)).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + (W < 500 ? MONTHS[m].charAt(0) : MONTHS[m]) + '</text>'; acc += [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m]; }
      function span(a, b, y, h, cls, title) {   // a → b going forward through the year, drawn in one or two pieces
        var parts = a <= b ? [[a, b]] : [[a, 365], [1, b]], o = '';
        parts.forEach(function (p) { o += '<rect class="' + cls + '" x="' + x(p[0]).toFixed(1) + '" y="' + y + '" width="' + Math.max(2, x(p[1]) - x(p[0])).toFixed(1) + '" height="' + h + '" rx="3"><title>' + esc(title) + '</title></rect>'; });
        return o;
      }
      svg += '<text x="0" y="' + (top + 15) + '">Frost-free</text>';
      if (ff != null) svg += span(lf, ff, top + 3, rowH - 8, 'b-railing', 'Between the last spring and first fall freeze: ' + P.label(lf) + ' – ' + P.label(ff));
      if (s && s[5] && s[7]) svg += span(P.doy(s[5]), P.doy(s[7]), top - 6, 5, 'b-back', 'Last spring freeze falls in this span in 8 of 10 years: ' + P.label(P.doy(s[5])) + ' – ' + P.label(P.doy(s[7])));
      if (s && s[8] && s[10]) svg += span(P.doy(s[8]), P.doy(s[10]), top - 6, 5, 'b-back', 'First fall freeze falls in this span in 8 of 10 years: ' + P.label(P.doy(s[8])) + ' – ' + P.label(P.doy(s[10])));
      ['hardy', 'semi', 'tender', 'very'].forEach(function (k, i) {
        var c = D.CLASSES[k], y0 = top + (i + 1) * rowH + 3, a = lf + c.from, b = lf + c.to;
        svg += '<text x="0" y="' + (y0 + 12) + '">' + c.name + '</text>';
        var ax = (a - 1 + 3650) % 365 + 1, bx = (b - 1 + 3650) % 365 + 1;
        svg += span(ax, bx, y0, rowH - 8, 'b-middle', c.name + ': plant out from ' + P.range(a, b));
      });
      return svg + '</svg><p class="small">Thin grey bars above the line: the span in which NOAA expects the last spring and first fall freeze in 8 of 10 years. Dark bars: earliest planting-out window of each frost class.</p>';
    }

    function run() {
      f._sig = sigOf(f);
      vis();
      var e = f.elements, s = place.value === 'custom' ? null : station(place.value), lf, ff, basis, mixKey = e.mix.value, wet = mixKey === 'lightweight' ? 0.6 : 0.75;
      if (s) {
        if (!s[6] || !P.freezeRegular(s[11])) {
          out.innerHTML = '<p><b>' + esc(s[0]) + ':</b> ' + (s[6]
            ? 'at this station (' + esc(s[2]) + ') a temperature of 32 °F or lower occurred in only ' + fmt(s[11], 1) + ' % of the years 1991–2020. In the years with a freeze, NOAA\'s median dates are ' + P.label(P.doy(s[9])) + ' for the first and ' + P.label(P.doy(s[6])) + ' for the last one – both in mid-winter, with no frost-free "season" between a spring and a fall date.'
            : 'NOAA gives no freeze dates for this station (' + esc(s[2]) + '): a temperature of 32 °F or lower occurred in ' + fmt(s[11], 0) + ' % of the years 1991–2020.') +
            ' Frost does not set the planting calendar here; heat and day length do, and a schedule counted from frost dates would mislead, so this planner gives none. Use the planting calendar of your state\'s extension service' + (s[6] ? ' and protect tender pots on the rare cold night' : '') + '. The container sizes in the <a href="/plants/reference/">plant reference</a> apply everywhere.</p>';
          return;
        }
        var cautious = e.risk.value === 'cautious';
        lf = P.doy(cautious ? s[7] : s[6]); ff = P.doy(cautious ? s[8] : s[9]);
        basis = cautious ? 'cautious dates (1 year in 10 has a later spring freeze or an earlier fall freeze)' : 'median dates (half of the years have a later spring freeze)';
      } else {
        lf = P.doy(e.lfm.value + '/' + e.lfd.value); ff = e.ffd.value === '' ? null : P.doy(e.ffm.value + '/' + e.ffd.value);
        if (lf == null || (e.ffd.value !== '' && ff == null)) { out.innerHTML = '<p role="alert">Please enter real calendar dates: a month and a day from 1 to 31 that exists in that month. Leave the fall day empty if you have no fall frost date.</p>'; return; }
        basis = 'the dates you entered';
      }
      var free = ff == null ? null : P.daysBetween(lf, ff);
      var html = '<div class="result-grid"><div class="stat"><div class="l">Last spring freeze used</div><div class="v">' + P.label(lf) + '</div></div>' +
        (ff != null ? '<div class="stat"><div class="l">First fall freeze used</div><div class="v">' + P.label(ff) + '</div></div><div class="stat"><div class="l">Days in between</div><div class="v">' + free + '</div></div>' : '') + '</div>';
      if (s) {
        html += '<p>NOAA station ' + esc(s[2]) + ' (' + s[1] + '), climate normals 1991–2020, 32 °F threshold. Last spring freeze: 9 years in 10 after ' + P.label(P.doy(s[5])) + ', median ' + P.label(P.doy(s[6])) + ', 1 year in 10 after ' + P.label(P.doy(s[7])) + '. First fall freeze: 1 year in 10 before ' + P.label(P.doy(s[8])) + ', median ' + P.label(P.doy(s[9])) + ', 9 years in 10 before ' + P.label(P.doy(s[10])) + '. The plan below uses the ' + basis + '.</p>';
        if (s[11] < 99.95) html += '<p><b>Note:</b> at this station 32 °F or lower occurred in only ' + fmt(s[11], 1) + ' % of the years 1991–2020, so some winters have no freeze at all.</p>';
        html += '<p class="small">Airport and city-centre stations can differ from your street by a week or more; a balcony against a heated wall is usually milder than open ground, an exposed high floor is not.</p>';
      } else html += '<p>The plan below uses ' + basis + '.</p>';
      html += timeline(lf, ff, s);
      var rows = '', csvRows = [['Crop', 'Frost class (CSU)', 'Sow indoors', 'Plant or sow outdoors from', 'Days to harvest (CSU)', 'First harvest about', 'Season check', 'Container (UMD)', 'Wet mix weight']], text = [];
      D.CROPS.forEach(function (c) {
        var r = P.schedule(c, lf, ff, D.CLASSES);
        if (!r) return;
        var cont = c[6].map(function (k) { var cc = D.CONTAINERS[k], w = P.containerWeight(cc.gal, wet); return cc.gal[0] + '–' + cc.gal[1] + ' gal (' + fmt(w.litres[0], 0) + '–' + fmt(w.litres[1], 0) + ' L), ' + cc.depth[0] + '–' + cc.depth[1] + ' in deep'; }).join(' or ') || (c[7] || 'not given');
        var wt = c[6].map(function (k) { var w = P.containerWeight(D.CONTAINERS[k].gal, wet); return fmt(w.lb[0], 0) + '–' + fmt(w.lb[1], 0) + ' lb (' + fmt(w.kg[0], 0) + '–' + fmt(w.kg[1], 0) + ' kg)'; }).join(' or ') || '–';
        var warm = c[2] === 'very';   // CSU: very tender crops also need settled warm weather, not just a frost-free date
        var fit = r.fit == null ? (ff == null ? '–' : r.seasonDays + ' days to the fall freeze') : { fits: (warm ? 'Long enough by the calendar: ' : 'Fits: ') + r.seasonDays + ' days to the fall freeze', tight: 'Tight: ' + r.seasonDays + ' days, less than 4 weeks to spare', short: 'Too short: only ' + r.seasonDays + ' days' }[r.fit];
        if (warm && r.fit && r.fit !== 'short') fit += ' – only if days are warm; a cool summer can still fail this crop';
        var outNote = warm ? 'not before daytime temperatures stay above 55 °F (13 °C)' : '';
        var dth = c[3] == null ? '–' : c[3] + (c[4] ? ' from transplanting' : ' from sowing');
        rows += '<tr><td><b>' + esc(c[1]) + '</b></td><td>' + D.CLASSES[c[2]].name + '</td><td>' + (r.sowText || '–') + '</td><td>' + r.outText + (outNote ? '<br><span class="small">' + outNote + ' (CSU)</span>' : '') + '</td><td>' + dth + '</td><td>' + (r.harvestText || '–') + '</td><td>' + fit + '</td><td>' + esc(cont) + '</td><td>' + wt + '</td></tr>';
        csvRows.push([c[1], D.CLASSES[c[2]].name, r.sowText || '', r.outText + (outNote ? '; ' + outNote : ''), dth, r.harvestText || '', fit, cont, wt]);
        text.push(c[1] + ': ' + (r.sowText ? 'sow indoors ' + r.sowText + ', ' : '') + 'outdoors from ' + r.outText + (outNote ? ' (' + outNote + ')' : ''));
      });
      html += '<div class="tablewrap"><table class="data wide"><caption>Earliest dates by the frost rule for ' + esc(s ? s[0] : 'your dates') + '</caption><thead><tr><th>Crop</th><th>Frost class</th><th>Sow indoors</th><th>Plant or sow outdoors from</th><th>Days to harvest</th><th>First harvest about</th><th>Season check</th><th>Smallest container</th><th>Wet mix in it</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      html += '<p class="small">Frost classes, planting-out rule, transplant age and days to harvest: Colorado State University Extension, GardenNotes #720. Container sizes: University of Maryland Extension. The dates and weights are this site\'s arithmetic on those figures. They are the earliest dates by frost alone – CSU also ties planting to soil temperature and, for very tender crops, to summer-like weather with days consistently above 55 °F; it notes that a week of daytime temperatures below 55 °F may stunt them. "First harvest" counts the typical days to harvest from the end of the planting-out window; cool nights and a shaded balcony slow that down.</p>';
      html += '<div class="row noprint"><button type="button" class="btn sun" id="frost-print">Print plan</button><button type="button" class="btn ghost" id="frost-csv">Download CSV</button></div>' + shareBar();
      out.innerHTML = html;
      $('#frost-print', out).addEventListener('click', function () { window.print(); });
      $('#frost-csv', out).addEventListener('click', function () { download('balcony-sowing-plan.csv', '﻿' + P.csv(csvRows), 'text/csv;charset=utf-8'); });
      wireShare(out, '/tools/frost-dates/', function () {
        var st = { place: place.value, mix: mixKey };
        if (s) st.risk = e.risk.value; else { st.lf = e.lfm.value + '/' + e.lfd.value; if (ff != null) st.ff = e.ffm.value + '/' + e.ffd.value; }
        return st;
      }, function () {
        return 'Sowing plan from frost dates (balconybloomguide.com) – ' + (s ? s[0] + ', NOAA normals 1991–2020, ' + basis : 'own dates') + '\nLast spring freeze used: ' + P.label(lf) + (ff != null ? '; first fall freeze used: ' + P.label(ff) : '') + '\n' + text.join('\n') + '\nEarliest dates by frost alone; soil temperature and weather decide.\n';
      });
    }
    bind(f, run);
    run();
  }

  /* ================= Plant reference filter ================= */
  function initRef(root) {
    var f = $('#ref-form', root), crops = $$('#ref-crops tbody tr'), per = $$('#ref-perennials tbody tr'), count = $('#ref-count', root);
    for (var z = 1; z <= 13; z++) { var o = document.createElement('option'); o.value = z; o.textContent = 'Zone ' + z; f.elements.zone.appendChild(o); }
    var st = takeHash();
    if (st.hours != null) f.elements.hours.value = P.numIn(st.hours, 0, 16, '');
    if (st.zone != null) f.elements.zone.value = String(P.numIn(st.zone, 1, 13, '') || '');
    if (st.season != null) f.elements.season.value = P.oneOf(st.season, ['', 'cool', 'warm', 'none'], '');
    if (st.size != null) f.elements.size.value = P.oneOf(st.size, ['', 'L', 'M', 'S'], '');
    if (st.q != null) f.elements.q.value = P.cleanText(st.q, 40);
    var WINTER = { out: 'Can stay outside in its pot', protect: 'Outside only with shelter: against the wall, pot wrapped, see the profile', 'in': 'Too cold for the pot outside: overwinter frost-free or grow as an annual' };
    function run() {
      var e = f.elements, q = e.q.value.trim().toLowerCase(), h = num(e.hours), n = 0, zone = parseInt(e.zone.value, 10);
      crops.forEach(function (tr) {
        var ok = true, min = parseFloat(tr.getAttribute('data-min'));
        if (q && tr.textContent.toLowerCase().indexOf(q) < 0) ok = false;
        if (e.season.value && tr.getAttribute('data-season') !== e.season.value) ok = false;
        if (e.size.value && (' ' + tr.getAttribute('data-size') + ' ').indexOf(' ' + e.size.value + ' ') < 0) ok = false;
        if (isFinite(h) && e.hours.value !== '' && !(min <= h)) ok = false;   // rows without a light figure are hidden while a number of hours is set
        tr.hidden = !ok; if (ok) n++;
      });
      count.textContent = 'Showing ' + n + ' of ' + crops.length + ' rows' + (isFinite(h) && e.hours.value !== '' ? ' whose light figure starts at ' + fmt(h, 1) + ' h or less; rows without a light figure are hidden' : '') + '.';
      per.forEach(function (tr) {
        var cell = $('[data-winter]', tr), r = P.potWinter(zone, D.PERENNIALS[parseInt(tr.getAttribute('data-i'), 10)]);
        cell.textContent = r ? WINTER[r] : 'Choose your zone above';
        tr.setAttribute('data-state', r || '');
      });
      $('#ref-empty', root).hidden = n > 0;
    }
    f.addEventListener('input', debounce(run, 150)); f.addEventListener('change', run);
    f.addEventListener('submit', function (e) { e.preventDefault(); run(); });
    f.addEventListener('reset', function () { setTimeout(run, 0); });
    $('#ref-link', root).addEventListener('click', function () {
      var e = f.elements;
      copyText(linkFor('/plants/reference/', { q: e.q.value.trim(), season: e.season.value, size: e.size.value, hours: e.hours.value, zone: e.zone.value }), $('#ref-status', root), 'Link copied.');
    });
    $('#ref-csv', root).addEventListener('click', function () {
      var rows = [$$('#ref-crops thead th').map(function (th) { return th.textContent; })];
      crops.forEach(function (tr) { if (!tr.hidden) rows.push($$('td, th', tr).map(function (td) { return td.textContent.replace(/\s+/g, ' ').trim(); })); });
      rows.push(['Sources: Colorado State University Extension GardenNotes #720; University of Maryland Extension; arithmetic by balconybloomguide.com. Retrieved ' + D.RETRIEVED + '.']);
      download('balcony-crop-reference.csv', '﻿' + P.csv(rows), 'text/csv;charset=utf-8');
    });
    run();
  }

  var t = document.querySelector('[data-tool]');
  if (!t) return;
  ({ sun: initSun, pots: initPots, wind: initWind, water: initWater, frost: initFrost, ref: initRef, quick: initQuick })[t.getAttribute('data-tool')](t);
})();
