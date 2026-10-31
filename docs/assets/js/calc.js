/*
 * Balcony Bloom Guide – weight, wind and watering estimates.
 * Pure functions, SI units inside (cm, litres, kg). Browser: window.BBCalc · Node: module.exports.
 * All figures are planning estimates; the pages say so next to every result.
 */
(function (root) {
  'use strict';

  // Wet weight of the mix at container capacity (after watering and draining), kg per litre.
  // Typical values from dry bulk density + water held at container capacity; real mixes vary ±20 %.
  var MIXES = {
    lightweight: { name: 'Lightweight mix (peat or coir + perlite)', wet: 0.6 },
    potting:     { name: 'Standard potting mix (peat/bark/compost)', wet: 0.75 },
    compost:     { name: 'Compost-rich or loam-based mix', wet: 0.85 },
    gritty:      { name: 'Gritty mix (pumice, grit – cacti, alpines)', wet: 1.05 },
    soil:        { name: 'Garden soil or topsoil (not recommended in pots)', wet: 1.65 }
  };
  // Pot wall: density g/cm³ and typical wall thickness cm (used only if the empty weight is not entered).
  var MATERIALS = {
    plastic:    { name: 'Plastic', rho: 0.95, wall: 0.3, dry: 1.0 },
    fiberglass: { name: 'Fiberglass / fiberstone', rho: 1.8, wall: 0.5, dry: 1.0 },
    terracotta: { name: 'Terracotta (unglazed)', rho: 1.8, wall: 1.2, dry: 1.15 },
    glazed:     { name: 'Glazed ceramic', rho: 2.1, wall: 1.1, dry: 1.0 },
    concrete:   { name: 'Concrete', rho: 2.3, wall: 2.5, dry: 1.05 },
    wood:       { name: 'Wood planter', rho: 0.6, wall: 2.0, dry: 1.05 },
    metal:      { name: 'Metal (thin steel/zinc)', rho: 7.8, wall: 0.08, dry: 1.0 },
    fabric:     { name: 'Fabric grow bag', rho: 0.3, wall: 0.3, dry: 1.25 }
  };
  var HEADSPACE = 2.5; // cm left free below the rim for watering

  // Pot geometry in cm. shape: 'round' (top, bottom diameter), 'square' (top, bottom side), 'trough' (length, width, bottom length, bottom width)
  function frustumRound(dTop, dBot, h) {
    var R = dTop / 2, r = dBot / 2;
    return Math.PI * h / 3 * (R * R + R * r + r * r);
  }
  function prismoid(a1, a2, am, h) { return h / 6 * (a1 + a2 + 4 * am); }

  function potVolume(p) {
    var h = p.height, fill = Math.max(0, h - HEADSPACE), k = h > 0 ? fill / h : 0, inner, filled, wallArea;
    if (p.shape === 'round') {
      var dt = p.top, db = p.bottom || p.top, dFill = db + (dt - db) * k;
      inner = frustumRound(dt, db, h); filled = frustumRound(dFill, db, fill);
      var slant = Math.sqrt(h * h + Math.pow((dt - db) / 2, 2));
      wallArea = Math.PI * (dt + db) / 2 * slant + Math.PI * db * db / 4;
      return { total: inner / 1000, soil: filled / 1000, topArea: Math.PI * dt * dt / 4 / 1e4, footArea: Math.PI * db * db / 4 / 1e4, wallArea: wallArea };
    }
    var Lt = p.top, Wt = p.shape === 'square' ? p.top : p.width;
    var Lb = p.bottom || Lt, Wb = p.shape === 'square' ? Lb : (p.bottomWidth || Wt);
    function at(f) { return [Lb + (Lt - Lb) * f, Wb + (Wt - Wb) * f]; }
    var m = at(0.5), F = at(k), mf = at(k / 2);
    inner = prismoid(Lt * Wt, Lb * Wb, m[0] * m[1], h);
    filled = prismoid(F[0] * F[1], Lb * Wb, mf[0] * mf[1], fill);
    wallArea = 2 * h * ((Lt + Lb) / 2 + (Wt + Wb) / 2) + Lb * Wb;
    return { total: inner / 1000, soil: filled / 1000, topArea: Lt * Wt / 1e4, footArea: Lb * Wb / 1e4, wallArea: wallArea };
  }

  function potWeight(p) {
    var v = potVolume(p);
    var mixWet = p.mixWet != null ? p.mixWet : MIXES[p.mix || 'potting'].wet;
    var mat = MATERIALS[p.material || 'plastic'];
    var potKg = p.emptyKg != null && p.emptyKg !== '' ? +p.emptyKg : v.wallArea * mat.wall * mat.rho / 1000;
    var soilKg = v.soil * mixWet;
    var plantKg = +(p.plantKg || 0);
    var total = (soilKg + potKg + plantKg) * (p.count || 1);
    return {
      volumeL: v.total, soilL: v.soil, soilKg: soilKg, potKg: potKg, plantKg: plantKg,
      eachKg: soilKg + potKg + plantKg, totalKg: total, footM2: v.footArea, topM2: v.topArea,
      pressureKgM2: v.footArea > 0 ? (soilKg + potKg + plantKg) / v.footArea : 0
    };
  }

  // Wind exposure – a transparent points score, not a measurement.
  var WIND_CLASSES = [
    { max: 2, key: 'sheltered', name: 'Sheltered', factor: 1.0 },
    { max: 4, key: 'moderate', name: 'Moderate', factor: 1.15 },
    { max: 6.5, key: 'exposed', name: 'Exposed', factor: 1.3 },
    { max: 99, key: 'very', name: 'Very exposed', factor: 1.5 }
  ];
  function windScore(w) {
    var parts = [];
    var fl = +w.floor || 1;
    parts.push(['Floor level', fl <= 2 ? 0 : fl <= 5 ? 1 : fl <= 10 ? 2 : fl <= 20 ? 3 : 4]);
    parts.push(['Position on the building', { middle: 0, end: 1, corner: 2 }[w.position] || 0]);
    parts.push(['Surroundings', { dense: 0, mixed: 1, open: 2 }[w.surroundings] || 0]);
    parts.push(['Recess and side walls', { loggia: -1, partial: 0, projecting: 1 }[w.recess] || 0]);
    parts.push(['Railing', { solid: 0, glass: 0, open: 1 }[w.railing] || 0]);
    parts.push(['Faces the prevailing wind', { yes: 1, no: 0, unknown: 0.5 }[w.prevailing] || 0]);
    var score = parts.reduce(function (s, p) { return s + p[1]; }, 0);
    var cls = WIND_CLASSES.filter(function (c) { return score <= c.max; })[0];
    return { score: score, parts: parts, cls: cls };
  }

  // Watering estimate. weather: reference evaporation in mm/day for a sunny open site.
  var WEATHER = { cool: { name: 'Cool spring/fall days', et: 2 }, warm: { name: 'Warm summer days', et: 4 }, hot: { name: 'Hot summer days', et: 6 }, heat: { name: 'Heatwave', et: 8 } };
  var CANOPY = { compact: 1.0, bushy: 1.5, large: 2.5 };
  var AVAILABLE = 0.2;    // share of the mix volume plants can use between watering and wilting
  var REFILL_AT = 0.5;    // water when half of that is used
  function waterUse(o) {
    var et = WEATHER[o.weather || 'warm'].et;
    var sunF = 0.4 + 0.06 * Math.min(Math.max(+o.sunHours || 0, 0), 10);
    var windF = o.windFactor || 1;
    var matF = (MATERIALS[o.material || 'plastic'] || MATERIALS.plastic).dry;
    var area = o.topM2 * (CANOPY[o.canopy || 'bushy']);
    var perDay = et * sunF * windF * matF * area;          // 1 mm on 1 m² = 1 litre
    var buffer = o.soilL * AVAILABLE * REFILL_AT;
    var days = perDay > 0 ? buffer / perDay : Infinity;
    var away = +o.daysAway || 0;
    var reservoir = Math.max(0, away * perDay * 1.2 - buffer);
    return { perDay: perDay, intervalDays: days, reservoirL: reservoir };
  }
  function checkAdvice(days) {
    if (days < 0.75) return 'Twice a day in this weather – move it to a cooler spot or into a bigger pot';
    if (days < 1.5) return 'Check daily';
    if (days < 2.5) return 'Check every 1–2 days';
    if (days < 4) return 'Check every 2–3 days';
    return 'Check twice a week';
  }

  var api = { MIXES: MIXES, MATERIALS: MATERIALS, HEADSPACE: HEADSPACE, potVolume: potVolume, potWeight: potWeight,
    WIND_CLASSES: WIND_CLASSES, windScore: windScore, WEATHER: WEATHER, CANOPY: CANOPY, waterUse: waterUse, checkAdvice: checkAdvice };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BBCalc = api;
})(this);
