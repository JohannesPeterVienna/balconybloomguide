/*
 * Balcony Bloom Guide – sun position and balcony shading.
 * Sun position: NOAA solar calculation (gml.noaa.gov/grad/solcalc/calcdetails.html),
 * accurate to well under a minute of time for 1900–2100, which is far more than a
 * balcony needs. Shading: straight rays against the planes of a box-shaped balcony.
 * Works in the browser (window.BBSun) and in Node (module.exports) for the tests.
 */
(function (root) {
  'use strict';
  var R = Math.PI / 180;

  function julianDay(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  // Sun elevation/azimuth (degrees, azimuth clockwise from north) for a UTC instant.
  function position(lat, lon, jd0, utcMin) {
    var jd = jd0 + utcMin / 1440, T = (jd - 2451545) / 36525;
    var L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
    var M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
    var e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
    var C = Math.sin(M * R) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
            Math.sin(2 * M * R) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * R) * 0.000289;
    var om = 125.04 - 1934.136 * T;
    var app = L0 + C - 0.00569 - 0.00478 * Math.sin(om * R);
    var eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
    var eps = eps0 + 0.00256 * Math.cos(om * R);
    var decl = Math.asin(Math.sin(eps * R) * Math.sin(app * R));
    var yv = Math.pow(Math.tan(eps * R / 2), 2);
    var eot = 4 / R * (yv * Math.sin(2 * L0 * R) - 2 * e * Math.sin(M * R) +
      4 * e * yv * Math.sin(M * R) * Math.cos(2 * L0 * R) -
      0.5 * yv * yv * Math.sin(4 * L0 * R) - 1.25 * e * e * Math.sin(2 * M * R));
    var tst = ((utcMin + eot + 4 * lon) % 1440 + 1440) % 1440;
    var ha = tst / 4 < 0 ? tst / 4 + 180 : tst / 4 - 180;
    var cz = Math.sin(lat * R) * Math.sin(decl) + Math.cos(lat * R) * Math.cos(decl) * Math.cos(ha * R);
    cz = Math.max(-1, Math.min(1, cz));
    var zen = Math.acos(cz);
    var el = 90 - zen / R;
    var az;
    var den = Math.cos(lat * R) * Math.sin(zen);
    if (Math.abs(den) < 1e-9) az = 180;
    else {
      var ca = (Math.sin(lat * R) * Math.cos(zen) - Math.sin(decl)) / den;
      ca = Math.max(-1, Math.min(1, ca));
      var a = Math.acos(ca) / R;
      az = ha > 0 ? (a + 180) % 360 : (540 - a) % 360;
    }
    return { el: el, az: az, tst: tst, eot: eot, decl: decl / R };
  }

  /*
   * Balcony model (all lengths in the same unit, e.g. metres):
   *   facing   – compass direction the balcony opens to (deg, 0 = N, 90 = E)
   *   depth    – from facade to railing
   *   width    – along the facade
   *   ceiling  – height of the slab above (null = open sky above)
   *   walls    – { left: bool, right: bool } full-height side walls (left/right seen from inside, looking out)
   *   railing  – { height, type: 'solid' | 'glass' | 'open' }
   *   opposite – null or { distance (from railing), height (top above your floor) }; treated as a long wall parallel to yours
   * Point: { y: distance in from the railing, x: offset from centre (+ = right looking out), z: height above floor }.
   */
  function isSunny(b, p, s, minEl) {
    if (s.el <= (minEl == null ? 2 : minEl)) return false;
    var a = (s.az - b.facing) * R, ce = Math.cos(s.el * R);
    var f = ce * Math.cos(a), l = ce * Math.sin(a), u = Math.sin(s.el * R);
    if (f <= 1e-6) return false;                       // sun is behind the facade
    var t = p.y / f;                                    // horizontal travel to the railing line (per unit f)
    var xf = p.x + l * t, zf = p.z + u * t;
    var half = b.width / 2;
    if (Math.abs(xf) > half) {                          // ray leaves through a side before the railing line
      var wall = xf > 0 ? b.walls.right : b.walls.left;
      if (wall) return false;
      var ts = (half - Math.abs(p.x)) / Math.abs(l);
      if (b.ceiling != null && p.z + u * ts > b.ceiling) return false;
      return !blockedByOpposite(b, p, f, u);
    }
    if (b.ceiling != null && zf > b.ceiling) return false;
    if (b.railing && b.railing.type === 'solid' && zf < b.railing.height) return false;
    return !blockedByOpposite(b, p, f, u);
  }

  function blockedByOpposite(b, p, f, u) {
    if (!b.opposite || !(b.opposite.height > 0)) return false;
    var t2 = (p.y + b.opposite.distance) / f;
    return p.z + u * t2 < b.opposite.height;
  }

  // Direct-sun minutes for one day; also returns the sunny intervals in local solar time (minutes 0–1440).
  function day(lat, lon, y, m, d, b, p, step) {
    step = step || 2;
    var jd0 = julianDay(y, m, d), mins = 0, runs = [], cur = null;
    var noonUtc = 720 - 4 * lon;
    for (var k = -720; k < 720; k += step) {
      var s = position(lat, lon, jd0, noonUtc + k);
      var on = isSunny(b, p, s);
      if (on) {
        mins += step;
        if (!cur) cur = [k + 720, k + 720 + step]; else cur[1] = k + 720 + step;
      } else if (cur) { runs.push(cur); cur = null; }
    }
    if (cur) runs.push(cur);
    return { minutes: mins, runs: runs };
  }

  function spots(b) {
    var plant = b.unit === 'ft' ? 1 : 0.3, inset = b.unit === 'ft' ? 0.5 : 0.15;
    return {
      railing: { x: 0, y: Math.min(inset, b.depth / 2), z: b.railing.height },
      middle: { x: 0, y: b.depth / 2, z: plant },
      back: { x: 0, y: Math.max(b.depth - 2 * inset, b.depth / 2), z: plant }
    };
  }

  function year(lat, lon, b, yr) {
    yr = yr || 2026;
    var sp = spots(b), out = {};
    Object.keys(sp).forEach(function (k) {
      out[k] = [];
      for (var m = 1; m <= 12; m++) out[k].push(day(lat, lon, yr, m, 15, b, sp[k]).minutes / 60);
    });
    return out;
  }

  function sunClass(h) { return h >= 6 ? 'full' : h >= 3 ? 'part' : 'shade'; }

  var api = { julianDay: julianDay, position: position, isSunny: isSunny, day: day, spots: spots, year: year, sunClass: sunClass };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BBSun = api;
})(this);
