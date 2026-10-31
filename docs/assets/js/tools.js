/*
 * Balcony Bloom Guide – tool interfaces (Sun & Shade Simulator, Pot Weight Planner,
 * Wind Exposure Check, Watering & Holiday Planner). Everything runs in the browser;
 * inputs are kept only in this browser's localStorage.
 */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTHS_L = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var SPOTS = [['railing', 'Railing'], ['middle', 'Middle'], ['back', 'Back wall']];
  var IN = 2.54, LB = 2.20462, FT = 0.3048;

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
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
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
  function segValue(el) { var b = $('button[aria-pressed="true"]', el); return b ? b.getAttribute('data-v') : null; }

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
    $$('button', unitSeg).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === unit ? 'true' : 'false'); });
    function labelUnits() { $$('.u-len', root).forEach(function (s) { s.textContent = unit; }); }
    labelUnits();
    segment(unitSeg, function (u) {
      if (u === unit) return;
      var k = u === 'm' ? FT : 1 / FT;
      lenIds.forEach(function (id) { var el = f.elements[id]; var v = num(el); if (isFinite(v)) el.value = +(v * k).toFixed(u === 'm' ? 2 : 1); });
      unit = u; labelUnits(); run();
    });
    function customVis() { $('#sun-custom', f).hidden = city.value !== 'custom'; }
    city.addEventListener('change', customVis);
    $('#sun-facing', f).addEventListener('change', function () { f.elements.facingDeg.value = this.value; });
    $('#sun-open-sky', f).addEventListener('change', function () { f.elements.ceiling.disabled = this.checked; });
    $('#sun-opp', f).addEventListener('change', function () { $('#sun-opp-fields', f).hidden = !this.checked; });

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

    function chartWidth() { var w = $('#sun-results', root).clientWidth || 640; return Math.max(320, Math.min(640, Math.round(w))); }
    var last = null;
    function run() {
      var r = read(), out = $('#sun-results', root);
      store('bbg-sun-form', { unit: unit, v: formValues(f) });
      if (r.errs.length) { out.innerHTML = '<p role="alert"><b>Please check:</b> ' + r.errs.map(esc).join(' ') + '</p>'; last = null; return; }
      var year = BBSun.year(r.lat, r.lon, r.b), m = r.month, bd = band(r.lat, r.lon, r.b, m);
      last = { r: r, year: year };
      var html = '<h3>' + MONTHS_L[m - 1] + ' 15: direct sun per spot</h3><div class="result-grid">';
      SPOTS.forEach(function (sp) { var h = year[sp[0]][m - 1]; html += '<div class="stat"><div class="l">' + sp[1] + '</div><div class="v">' + h.toFixed(1) + ' h</div>' + pill(h) + '</div>'; });
      html += '</div><h3>Through the year</h3><div class="legend"><span><i style="background:var(--sun-bar)"></i>Railing</span><span><i style="background:var(--moss)"></i>Middle</span><span><i style="background:var(--shade)"></i>Back wall</span><span>dashed line = 6 h (full sun)</span></div>' + chart(year);
      html += '<h3>When the sun reaches each spot (' + MONTHS_L[m - 1] + ' 15)</h3>' + bd.svg + '<p class="small">' + bd.text.map(esc).join(' · ') + '. Times are local solar time: 12:00 is when the sun is highest; add about an hour in summer time and the offset of your time zone.</p>';
      var tbl = '<div class="tablewrap"><table class="data"><caption>Direct sun hours on the 15th of each month</caption><thead><tr><th>Month</th><th>Railing</th><th>Middle</th><th>Back wall</th></tr></thead><tbody>';
      for (var i = 0; i < 12; i++) tbl += '<tr><td>' + MONTHS_L[i] + '</td><td>' + year.railing[i].toFixed(1) + '</td><td>' + year.middle[i].toFixed(1) + '</td><td>' + year.back[i].toFixed(1) + '</td></tr>';
      html += tbl + '</tbody></table></div>';
      html += '<div class="row noprint"><button type="button" class="btn sun" id="sun-save">Save as my balcony</button><button type="button" class="btn ghost" id="sun-print">Print sun sheet</button><span id="sun-saved" class="small" role="status"></span></div>';
      out.innerHTML = html;
      $('#sun-save', out).addEventListener('click', function () {
        profile({ place: r.place, facing: r.b.facing, sun: year, savedAt: new Date().toISOString().slice(0, 10) });
        $('#sun-saved', out).textContent = 'Saved in this browser. Guide pages and the watering planner now use these hours.';
      });
      $('#sun-print', out).addEventListener('click', function () { window.print(); });
    }
    f.addEventListener('input', debounce(run, 250));
    f.addEventListener('change', run);
    f.addEventListener('submit', function (e) { e.preventDefault(); run(); });
    customVis();
    f.elements.ceiling.disabled = f.elements.openSky.checked;
    $('#sun-opp-fields', f).hidden = !f.elements.opp.checked;
    if (!saved) f.elements.month.value = String(new Date().getMonth() + 1);
    run();
  }

  function formValues(f) {
    var v = {};
    $$('input, select', f).forEach(function (el) { if (!el.name) return; v[el.name] = el.type === 'checkbox' ? el.checked : el.value; });
    return v;
  }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  /* ================= Pot Weight Planner ================= */
  function initPots(root) {
    var f = $('#pot-form', root), unitSeg = $('#pot-units', root), list = store('bbg-pots') || [];
    var unit = (store('bbg-pot-unit') || 'in');
    $$('button', unitSeg).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === unit ? 'true' : 'false'); });
    function labels() {
      $$('.u-len', root).forEach(function (s) { s.textContent = unit; });
      $$('.u-w', root).forEach(function (s) { s.textContent = unit === 'in' ? 'lb' : 'kg'; });
    }
    segment(unitSeg, function (u) { unit = u; store('bbg-pot-unit', u); labels(); render(); });
    labels();
    Object.keys(BBCalc.MIXES).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = BBCalc.MIXES[k].name; f.elements.mix.appendChild(o); });
    Object.keys(BBCalc.MATERIALS).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = BBCalc.MATERIALS[k].name; f.elements.material.appendChild(o); });
    f.elements.mix.value = 'potting'; f.elements.material.value = 'terracotta';
    function shapeVis() {
      var s = f.elements.shape.value;
      $('#pot-width-wrap', f).hidden = s !== 'trough';
      $('#pot-bwidth-wrap', f).hidden = s !== 'trough';
      $('#pot-top-label', f).textContent = s === 'round' ? 'Top diameter' : s === 'square' ? 'Top side' : 'Top length';
      $('#pot-bottom-label', f).textContent = s === 'round' ? 'Bottom diameter' : s === 'square' ? 'Bottom side' : 'Bottom length';
    }
    f.elements.shape.addEventListener('change', shapeVis); shapeVis();

    function toCm(v) { return unit === 'in' ? v * IN : v; }
    function toKg(v) { return unit === 'in' ? v / LB : v; }
    function showW(kg) { return unit === 'in' ? fmt(kg * LB, 0) + ' lb' : fmt(kg, 1) + ' kg'; }
    function showV(l) { return unit === 'in' ? fmt(l / 3.78541, 1) + ' gal' : fmt(l, 1) + ' L'; }

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var el = f.elements, s = el.shape.value;
      var p = {
        name: el.name.value.trim() || ('Pot ' + (list.length + 1)), shape: s,
        top: toCm(num(el.top)), bottom: isFinite(num(el.bottom)) ? toCm(num(el.bottom)) : null, height: toCm(num(el.height)),
        width: s === 'trough' ? toCm(num(el.width)) : null, bottomWidth: s === 'trough' && isFinite(num(el.bwidth)) ? toCm(num(el.bwidth)) : null,
        material: el.material.value, mix: el.mix.value, count: Math.max(1, Math.round(num(el.count) || 1)),
        emptyKg: isFinite(num(el.empty)) ? toKg(num(el.empty)) : null, plantKg: isFinite(num(el.plant)) ? toKg(num(el.plant)) : 0
      };
      var msg = $('#pot-msg', root);
      if (!(p.top > 0) || !(p.height > 0) || (s === 'trough' && !(p.width > 0))) { msg.textContent = 'Please enter the size of the pot (top and height' + (s === 'trough' ? ' and width' : '') + ').'; return; }
      if (p.bottom != null && p.bottom > p.top * 1.5) { msg.textContent = 'The bottom is much wider than the top – please check the numbers.'; return; }
      msg.textContent = '';
      list.push(p); store('bbg-pots', list); render();
      el.name.value = '';
    });

    function render() {
      var out = $('#pot-results', root);
      if (!list.length) { out.innerHTML = '<p class="small">No pots yet. Add your first pot above – the example values are a 16 in (41 cm) terracotta pot.</p>'; return; }
      var tot = 0, soil = 0, rows = '';
      list.forEach(function (p, i) {
        var w = BBCalc.potWeight(p);
        tot += w.totalKg; soil += w.soilL * p.count;
        var size = unit === 'in' ? fmt(p.top / IN, 0) + ' × ' + fmt(p.height / IN, 0) + ' in' : fmt(p.top, 0) + ' × ' + fmt(p.height, 0) + ' cm';
        rows += '<tr><td>' + esc(p.name) + (p.count > 1 ? ' ×' + p.count : '') + '<br><span class="small">' + p.shape + ', ' + size + ', ' + BBCalc.MATERIALS[p.material].name.toLowerCase() + '</span></td>' +
          '<td class="n">' + showV(w.soilL) + '</td><td class="n">' + showW(w.soilKg) + '</td><td class="n">' + showW(w.potKg) + '</td><td class="n"><b>' + showW(w.eachKg) + '</b></td><td class="n">' + showW(w.totalKg) + '</td>' +
          '<td class="noprint"><button type="button" class="linklike" data-del="' + i + '">Remove</button></td></tr>';
      });
      out.innerHTML = '<div class="result-grid"><div class="stat"><div class="l">Total wet weight</div><div class="v">' + showW(tot) + '</div></div><div class="stat"><div class="l">Potting mix in all pots</div><div class="v">' + showV(soil) + '</div></div><div class="stat"><div class="l">Pots</div><div class="v">' + list.reduce(function (s, p) { return s + p.count; }, 0) + '</div></div></div>' +
        '<div class="tablewrap"><table class="potlist"><caption class="small" style="text-align:left">Balcony pot list – weights after watering and draining (estimates)</caption><thead><tr><th>Pot</th><th class="n">Mix</th><th class="n">Wet mix</th><th class="n">Empty pot</th><th class="n">Each</th><th class="n">All</th><th class="noprint"></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<p class="small">Estimates for planning only. A balcony\'s safe load depends on its construction and condition; this sheet does not say whether your balcony can carry these pots. Show it to your building manager or a structural engineer. Printed ' + new Date().toISOString().slice(0, 10) + ' from balconybloomguide.com.</p>' +
        '<div class="row noprint"><button type="button" class="btn sun" id="pot-print">Print data sheet</button><button type="button" class="btn ghost" id="pot-clear">Clear list</button></div>';
      $$('[data-del]', out).forEach(function (b) { b.addEventListener('click', function () { list.splice(+b.getAttribute('data-del'), 1); store('bbg-pots', list); render(); }); });
      $('#pot-print', out).addEventListener('click', function () { window.print(); });
      $('#pot-clear', out).addEventListener('click', function () { if (window.confirm('Remove all pots from the list?')) { list = []; store('bbg-pots', list); render(); } });
    }
    render();
  }

  /* ================= Wind Exposure Check ================= */
  var WIND_ADVICE = {
    sheltered: ['Most balcony plants are fine; normal pots and railing boxes on the inside of the railing work.', 'Still secure anything light or tall – gusts happen on every balcony.', 'Pots dry at about the normal rate for their sun.'],
    moderate: ['Choose wide, low pots for anything taller than about 3 ft (90 cm), or add weight at the base.', 'Railing boxes need adjustable clamp brackets that grip the rail (no drilling), not ones that only hook over it.', 'Expect pots to dry noticeably faster on windy days; mulch the surface.'],
    exposed: ['Avoid tall, top-heavy plants in light pots; group pots against the wall and in corners out of the gusts.', 'Fix every railing box and trellis; use a permeable screen (mesh, slatted) rather than a solid panel, which creates turbulence behind it.', 'Pick tough, small-leaved or grassy plants; large soft leaves tear.', 'Water checks become daily in summer.'],
    very: ['Treat everything as something that could fall: no loose pots on ledges, no hanging baskets, nothing hung on the outside of the railing.', 'Low, heavy containers only, placed against the wall; tall screens need professional fixing and the building\'s approval.', 'Grow compact, wind-hardy plants; protect evergreens from winter wind burn.', 'Drip irrigation or self-watering pots help – wind can dry small pots within a day.']
  };
  function initWind(root) {
    var f = $('#wind-form', root);
    var saved = store('bbg-wind-form');
    if (saved) Object.keys(saved).forEach(function (k) { if (f.elements[k]) f.elements[k].value = saved[k]; });
    function run() {
      var e = f.elements, w = { floor: num(e.floor), position: e.position.value, surroundings: e.surroundings.value, recess: e.recess.value, railing: e.railing.value, prevailing: e.prevailing.value };
      store('bbg-wind-form', formValues(f));
      var out = $('#wind-results', root);
      if (!(w.floor >= 0)) { out.innerHTML = '<p role="alert">Please enter your floor (street level = 1).</p>'; return; }
      var r = BBCalc.windScore(w);
      var rows = r.parts.map(function (p) { return '<tr><td>' + p[0] + '</td><td class="n">' + (p[1] > 0 ? '+' : '') + p[1] + '</td></tr>'; }).join('');
      out.innerHTML = '<div class="result-grid"><div class="stat"><div class="l">Wind class</div><div class="v">' + r.cls.name + '</div><div class="l">score ' + r.score + ' (−1 to 11)</div></div><div class="stat"><div class="l">Drying factor used by the watering planner</div><div class="v">× ' + r.cls.factor.toFixed(2) + '</div></div></div>' +
        '<h3>What this means on your balcony</h3><ul>' + WIND_ADVICE[r.cls.key].map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
        '<div class="tablewrap"><table class="potlist"><caption class="small" style="text-align:left">How the score was built</caption><tbody>' + rows + '<tr><th>Total</th><th class="n">' + r.score + '</th></tr></tbody></table></div>' +
        '<div class="row noprint"><button type="button" class="btn sun" id="wind-save">Save to my balcony</button><span class="small" id="wind-saved" role="status"></span></div>';
      $('#wind-save', out).addEventListener('click', function () { profile({ wind: r.cls.name, windKey: r.cls.key, windFactor: r.cls.factor }); $('#wind-saved', out).textContent = 'Saved in this browser.'; });
    }
    f.addEventListener('change', run); f.addEventListener('input', debounce(run, 250));
    f.addEventListener('submit', function (e) { e.preventDefault(); run(); });
    run();
  }

  /* ================= Watering & Holiday Planner ================= */
  function initWater(root) {
    var f = $('#water-form', root), unitSeg = $('#water-units', root), unit = store('bbg-pot-unit') || 'in';
    $$('button', unitSeg).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === unit ? 'true' : 'false'); });
    function labels() { $$('.u-len', root).forEach(function (s) { s.textContent = unit; }); }
    segment(unitSeg, function (u) {
      var k = u === 'cm' ? IN : 1 / IN;
      ['dia', 'height'].forEach(function (id) { var v = num(f.elements[id]); if (isFinite(v)) f.elements[id].value = Math.round(v * k); });
      unit = u; store('bbg-pot-unit', u); labels(); run();
    });
    labels();
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
      var res = unit === 'in' ? fmt(w.reservoirL / 3.78541, 2) + ' gal' : fmt(w.reservoirL, 1) + ' L';
      return { html: '<tr><td>' + esc(name) + '</td><td class="n">' + per + '</td><td>' + BBCalc.checkAdvice(w.intervalDays) + '</td><td class="n">' + (num(e.days) > 0 ? res : '–') + '</td></tr>', w: w };
    }
    function run() {
      var e = f.elements, out = $('#water-results', root);
      if (!(num(e.sun) >= 0 && num(e.sun) <= 16)) { out.innerHTML = '<p role="alert">Enter direct sun hours between 0 and 16.</p>'; return; }
      var rows = '', sum = 0, sumRes = 0;
      if (useList && pots.length) {
        pots.forEach(function (pt) { for (var i = 0; i < pt.count; i++) { var r = row(pt.name + (pt.count > 1 ? ' #' + (i + 1) : ''), pt, e); rows += r.html; sum += r.w.perDay; sumRes += r.w.reservoirL; } });
      } else {
        var d = num(e.dia), h = num(e.height);
        if (!(d > 0) || !(h > 0)) { out.innerHTML = '<p role="alert">Enter the pot diameter and height.</p>'; return; }
        var k = unit === 'in' ? IN : 1;
        var r1 = row('Your pot', { shape: 'round', top: d * k, bottom: d * k * 0.8, height: h * k, material: e.material.value }, e);
        rows = r1.html; sum = r1.w.perDay; sumRes = r1.w.reservoirL;
      }
      var tot = unit === 'in' ? fmt(sum / 3.78541, 2) + ' gal' : fmt(sum, 1) + ' L';
      var totRes = unit === 'in' ? fmt(sumRes / 3.78541, 1) + ' gal' : fmt(sumRes, 1) + ' L';
      out.innerHTML = '<div class="result-grid"><div class="stat"><div class="l">Estimated water use per day</div><div class="v">' + tot + '</div></div>' +
        (num(e.days) > 0 ? '<div class="stat"><div class="l">Reservoir for ' + num(e.days) + ' days away (incl. 20 % margin)</div><div class="v">' + totRes + '</div></div>' : '') + '</div>' +
        '<div class="tablewrap"><table class="potlist"><thead><tr><th>Pot</th><th class="n">Per day</th><th>Check</th><th class="n">Reservoir</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<p class="small">Estimates for a plant of the chosen size in a pot of this volume. The finger test decides: water when the top inch (2–3 cm) is dry, until water runs from the drainage hole.</p>';
    }
    f.addEventListener('change', run); f.addEventListener('input', debounce(run, 250));
    f.addEventListener('submit', function (e) { e.preventDefault(); run(); });
    run();
  }

  var t = document.querySelector('[data-tool]');
  if (!t) return;
  ({ sun: initSun, pots: initPots, wind: initWind, water: initWater })[t.getAttribute('data-tool')](t);
})();
