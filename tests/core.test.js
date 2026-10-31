// node --test tests/ – sun position, balcony shading, weights, wind, watering and consent rules.
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../docs/assets/js/sun.js');
const C = require('../docs/assets/js/calc.js');
const K = require('../docs/assets/js/consent.js');

function maxEl(lat, lon, y, m, d) { const jd = S.julianDay(y, m, d); let b = -99; for (let k = 0; k < 1440; k++) b = Math.max(b, S.position(lat, lon, jd, k).el); return b; }
test('noon sun height matches 90° − latitude + declination', () => {
  assert.ok(Math.abs(maxEl(40.7128, -74.006, 2026, 6, 21) - (90 - 40.7128 + 23.44)) < 0.1);   // June solstice
  assert.ok(Math.abs(maxEl(40.7128, -74.006, 2026, 12, 21) - (90 - 40.7128 - 23.44)) < 0.1);  // December solstice
  assert.ok(Math.abs(maxEl(-33.87, 151.21, 2026, 6, 21) - (90 - 33.87 - 23.44)) < 0.1);       // Sydney winter
});
test('day length at the equinox is about 12 h (sun above 0°)', () => {
  const jd = S.julianDay(2026, 3, 20); let m = 0;
  for (let k = 0; k < 1440; k++) if (S.position(48.2, 16.37, jd, k).el > -0.83) m++;
  assert.ok(Math.abs(m / 60 - 12.1) < 0.3, 'got ' + m / 60);
});
const east = { unit: 'ft', facing: 90, depth: 5, width: 10, ceiling: 8.5, walls: { left: true, right: true }, railing: { height: 3.5, type: 'open' }, opposite: null };
test('railing gets at least as much sun as the back wall every month', () => {
  for (const facing of [0, 45, 90, 135, 180, 225, 270, 315]) {
    const y = S.year(45, -93, { ...east, facing });
    for (let i = 0; i < 12; i++) assert.ok(y.railing[i] + 1e-9 >= y.back[i] - 0.05, `facing ${facing} month ${i + 1}`);
  }
});
test('a north-facing balcony gets no direct sun in December at 45° N', () => {
  const y = S.year(45, -93, { ...east, facing: 0 });
  assert.equal(y.railing[11], 0);
});
test('sun behind the facade, under a ceiling or a solid railing is blocked (hand cases)', () => {
  const b = { ...east, facing: 180 };
  assert.equal(S.isSunny(b, { x: 0, y: 1, z: 1 }, { el: 30, az: 0 }), false);            // behind facade
  assert.equal(S.isSunny(b, { x: 0, y: 4, z: 1 }, { el: 70, az: 180 }), false);          // 4 ft in, tan70×4 = 11 ft > 8.5−1 → ceiling
  assert.equal(S.isSunny(b, { x: 0, y: 1, z: 1 }, { el: 70, az: 180 }), true);           // 1 ft in: rises 2.75 ft → 3.75 ft < 8.5
  const solid = { ...b, railing: { height: 3.5, type: 'solid' } };
  assert.equal(S.isSunny(solid, { x: 0, y: 2, z: 1 }, { el: 30, az: 180 }), false);      // rises 1.15 ft → 2.15 ft < 3.5 ft
  const opp = { ...b, opposite: { distance: 40, height: 30 } };
  assert.equal(S.isSunny(opp, { x: 0, y: 0.5, z: 3.5 }, { el: 20, az: 180 }), false);    // tan20×40.5 = 14.7 + 3.5 < 30
  assert.equal(S.isSunny(opp, { x: 0, y: 0.5, z: 3.5 }, { el: 40, az: 180 }), true);     // tan40×40.5 = 34 + 3.5 > 30
});
test('pot volumes match the closed formulas', () => {
  const cyl = C.potVolume({ shape: 'round', top: 30, bottom: 30, height: 30 });
  assert.ok(Math.abs(cyl.total - Math.PI * 15 * 15 * 30 / 1000) < 1e-9);
  const box = C.potVolume({ shape: 'trough', top: 80, width: 20, height: 18 });
  assert.ok(Math.abs(box.total - 80 * 20 * 18 / 1000) < 1e-9);
  assert.ok(Math.abs(box.soil - 80 * 20 * (18 - C.HEADSPACE) / 1000) < 1e-9);
  const fr = C.potVolume({ shape: 'round', top: 40, bottom: 20, height: 30 });
  assert.ok(Math.abs(fr.total - Math.PI * 30 / 3 * (400 + 200 + 100) / 1000) < 1e-9);
  const sq = C.potVolume({ shape: 'square', top: 30, bottom: 20, height: 30 });
  assert.ok(Math.abs(sq.total - 30 / 3 * (900 + 400 + 600) / 1000) < 1e-9);       // frustum of a square pyramid
});
test('wet weight: standard mix, entered empty weight, count', () => {
  const w = C.potWeight({ shape: 'trough', top: 100, width: 10, height: 12.5, mix: 'potting', material: 'plastic', emptyKg: 2, count: 3 });
  assert.ok(Math.abs(w.soilL - 10) < 1e-9);
  assert.ok(Math.abs(w.eachKg - (7.5 + 2)) < 1e-9);
  assert.ok(Math.abs(w.totalKg - 28.5) < 1e-9);
});
test('wind classes from the score', () => {
  assert.equal(C.windScore({ floor: 1, position: 'middle', surroundings: 'dense', recess: 'loggia', railing: 'solid', prevailing: 'no' }).cls.key, 'sheltered');
  assert.equal(C.windScore({ floor: 25, position: 'corner', surroundings: 'open', recess: 'projecting', railing: 'open', prevailing: 'yes' }).cls.key, 'very');
});
test('watering: more sun, wind and heat never mean less water', () => {
  const base = { topM2: 0.07, soilL: 10, material: 'plastic', canopy: 'bushy', sunHours: 4, windFactor: 1, weather: 'warm' };
  const a = C.waterUse(base).perDay;
  assert.ok(C.waterUse({ ...base, sunHours: 8 }).perDay > a);
  assert.ok(C.waterUse({ ...base, windFactor: 1.3 }).perDay > a);
  assert.ok(C.waterUse({ ...base, weather: 'hot' }).perDay > a);
  assert.ok(C.waterUse({ ...base, material: 'terracotta' }).perDay > a);
  assert.equal(C.waterUse({ ...base, daysAway: 0 }).reservoirL, 0);
});
test('consent: nothing granted without clear signals', () => {
  const cmAll = { adStoragePurposeConsentStatus: 1, adUserDataPurposeConsentStatus: 1, adPersonalizationPurposeConsentStatus: 1, analyticsStoragePurposeConsentStatus: 1 };
  const tcYes = { gdprApplies: true, eventStatus: 'useractioncomplete', purpose: { consents: { 1: true } }, vendor: { consents: { 755: true } } };
  assert.deepEqual(K.decide(null, cmAll, 2), K.DENIED_ALL);
  assert.deepEqual(K.decide({ ...tcYes, vendor: { consents: {} } }, cmAll, 2), K.DENIED_ALL);
  assert.deepEqual(K.decide(tcYes, null, 2), K.DENIED_ALL);
  assert.equal(K.decide(tcYes, cmAll, null).analytics_storage, 'granted');
  assert.equal(K.decide(tcYes, { ...cmAll, analyticsStoragePurposeConsentStatus: 3 }, null).analytics_storage, 'denied');
  const outside = { gdprApplies: false };
  assert.deepEqual(K.decide(outside, cmAll, null), K.DENIED_ALL);      // US status unknown
  assert.deepEqual(K.decide(outside, cmAll, 3), K.DENIED_ALL);         // opted out
  assert.equal(K.decide(outside, { ...cmAll, analyticsStoragePurposeConsentStatus: 3 }, 2).analytics_storage, 'granted');
  assert.equal(K.decide(outside, { ...cmAll, analyticsStoragePurposeConsentStatus: 0 }, 1).analytics_storage, 'denied');
});
