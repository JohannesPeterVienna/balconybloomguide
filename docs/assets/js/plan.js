/*
 * Balcony Bloom Guide – planning logic without any page access: frost-date arithmetic, sowing windows,
 * container figures, balcony area load, winter check for pots, shareable-link encoding and CSV cells.
 * Browser: window.BBPlan · Node: module.exports (used by the tests and by the build for the static tables).
 */
(function (root) {
  'use strict';
  var DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var GAL = 3.78541, LB = 2.20462, PSF = 4.88243; // litres per US gallon, lb per kg, kg/m² per lb/ft²

  // "MM/DD" → day of a 365-day year (1–365), or null. 29 Feb is read as 28 Feb.
  function doy(md) {
    var m = /^\s*(\d{1,2})\/(\d{1,2})\s*$/.exec(String(md == null ? '' : md));
    if (!m) return null;
    var mo = +m[1], d = +m[2];
    if (mo < 1 || mo > 12 || d < 1) return null;
    if (mo === 2 && d === 29) d = 28;
    if (d > DAYS[mo - 1]) return null;
    for (var i = 0, n = 0; i < mo - 1; i++) n += DAYS[i];
    return n + d;
  }
  function wrap(n) { return ((Math.round(n) - 1) % 365 + 365) % 365 + 1; }
  function fromDoy(n) {
    n = wrap(n);
    for (var i = 0; i < 12; i++) { if (n <= DAYS[i]) return { m: i + 1, d: n }; n -= DAYS[i]; }
    return { m: 12, d: 31 };
  }
  function label(n) { var x = fromDoy(n); return MON[x.m - 1] + ' ' + x.d; }
  function range(a, b) { return wrap(a) === wrap(b) ? label(a) : label(a) + ' – ' + label(b); }
  // days from day a forward to day b within one year (0–364)
  function daysBetween(a, b) { return ((b - a) % 365 + 365) % 365; }

  /*
   * Sowing and planting windows for one crop row of BBData.CROPS.
   * lastFrost / firstFrost: day of year (firstFrost may be null). classes: BBData.CLASSES.
   * Outdoor window = last frost + class offsets; indoor sowing = outdoor window minus the transplant age;
   * season = days from the start of planting out to the first fall frost, compared with days to harvest.
   */
  function schedule(crop, lastFrost, firstFrost, classes) {
    var cls = crop[2] ? classes[crop[2]] : null;
    if (!cls || lastFrost == null) return null;
    var out = [lastFrost + cls.from, lastFrost + cls.to], age = crop[5], dth = crop[3];
    var res = { cls: crop[2], outFrom: wrap(out[0]), outTo: wrap(out[1]), outText: range(out[0], out[1]), sowText: null, sowFrom: null, sowTo: null, seasonDays: null, fit: null, harvestText: null };
    if (age) {
      res.sowFrom = wrap(out[0] - age[1] * 7); res.sowTo = wrap(out[1] - age[0] * 7);
      res.sowText = range(out[0] - age[1] * 7, out[1] - age[0] * 7);
    }
    if (firstFrost != null) {
      // planting out at the end of the window is the cautious case
      res.seasonDays = daysBetween(wrap(out[1]), firstFrost);
      if (dth != null) {
        res.harvestText = label(out[1] + dth);
        res.fit = res.seasonDays >= dth + 28 ? 'fits' : res.seasonDays >= dth ? 'tight' : 'short';
      }
    }
    return res;
  }

  // Container figures: wet weight of the mix for a volume range in gallons (kg per litre as in BBCalc.MIXES).
  function containerWeight(gal, wetKgPerL) {
    var k = wetKgPerL == null ? 0.75 : wetKgPerL;
    return { litres: [gal[0] * GAL, gal[1] * GAL], kg: [gal[0] * GAL * k, gal[1] * GAL * k], lb: [gal[0] * GAL * k * LB, gal[1] * GAL * k * LB] };
  }

  /*
   * Average load of the pots over the balcony floor, compared with a live-load figure the user supplies.
   * The comparison is arithmetic only: the same figure also has to cover people, furniture and snow.
   * state: 'none' (no figure), 'low' (< 50 %), 'high' (50–100 %), 'over' (more than the whole figure).
   */
  function areaLoad(totalKg, areaM2, refKgM2) {
    if (!(totalKg >= 0) || !(areaM2 > 0)) return null;
    var avg = totalKg / areaM2, r = { avgKgM2: avg, avgPsf: avg / PSF, share: null, state: 'none', restKg: null };
    if (refKgM2 > 0) {
      r.share = avg / refKgM2;
      r.state = r.share >= 1 ? 'over' : r.share >= 0.5 ? 'high' : 'low';
      r.restKg = refKgM2 * areaM2 - totalKg;
    }
    return r;
  }

  /*
   * Winter check for a plant in a pot. zone = the user's USDA zone (1–13), minZone = coldest zone the plant is
   * rated for in the ground. Penn State Extension: "go two zones colder with containerized plants".
   */
  function potWinter(zone, minZone) {
    if (!(zone >= 1 && zone <= 13) || !(minZone >= 1)) return null;
    if (zone >= minZone + 2) return 'out';        // rated two zones colder than the balcony
    if (zone >= minZone) return 'protect';        // hardy in the ground here, but without the two-zone margin
    return 'in';                                  // not hardy here even in the ground
  }
  // USDA zone from the average annual extreme minimum temperature in °F: 10 °F bands, zone 1 starts at −60 °F; a/b halves of 5 °F.
  function zoneFromMinF(f) {
    if (!isFinite(f)) return null;
    var z = Math.floor((f + 60) / 10) + 1;
    if (z < 1) z = 1; if (z > 13) z = 13;
    var lo = -60 + (z - 1) * 10;
    return { zone: z, half: f - lo < 5 ? 'a' : 'b', lowF: lo, highF: lo + 10 };
  }

  /* ---- shareable links: "key=value&key=value" in the part of the address after #. Repeated keys become arrays. ---- */
  function encodeState(obj) {
    var out = [];
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (v == null || v === '') return;
      (Array.isArray(v) ? v : [v]).forEach(function (x) { out.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(x))); });
    });
    return out.join('&');
  }
  function decodeState(str) {
    var out = {};
    String(str || '').replace(/^#/, '').split('&').forEach(function (part) {
      if (!part || part.length > 600) return;
      var i = part.indexOf('='), k, v;
      try { k = decodeURIComponent(i < 0 ? part : part.slice(0, i)); v = decodeURIComponent(i < 0 ? '' : part.slice(i + 1).replace(/\+/g, ' ')); } catch (e) { return; }
      if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,23}$/.test(k)) return;
      if (Object.prototype.hasOwnProperty.call(out, k)) { if (!Array.isArray(out[k])) out[k] = [out[k]]; if (out[k].length < 40) out[k].push(v); }
      else out[k] = v;
    });
    return out;
  }
  // A number from a link, limited to a range; anything else gives the fallback.
  function numIn(v, min, max, fallback) {
    if (typeof v !== 'string' || !/^-?\d{1,6}(\.\d{1,4})?$/.test(v.trim())) return fallback;
    var n = parseFloat(v);
    return n >= min && n <= max ? n : fallback;
  }
  function oneOf(v, list, fallback) { return list.indexOf(v) >= 0 ? v : fallback; }
  // Free text from a link (pot names): control characters removed, trimmed, cut to max characters. Escaped again when shown.
  function cleanText(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max || 40); }

  // One CSV cell: cells that a spreadsheet would read as a formula (= + - @, tab, CR at the start) get a leading apostrophe.
  function csvCell(v) {
    var s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function csv(rows) { return rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n'; }

  var api = { GAL: GAL, LB: LB, PSF: PSF, doy: doy, fromDoy: fromDoy, label: label, range: range, daysBetween: daysBetween, schedule: schedule,
    containerWeight: containerWeight, areaLoad: areaLoad, potWinter: potWinter, zoneFromMinF: zoneFromMinF,
    encodeState: encodeState, decodeState: decodeState, numIn: numIn, oneOf: oneOf, cleanText: cleanText, csvCell: csvCell, csv: csv };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BBPlan = api;
})(this);
