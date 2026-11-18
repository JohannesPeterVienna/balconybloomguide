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

// ---- planning logic and reference data added on November 18, 2026 ----
const P = require('../docs/assets/js/plan.js');
const D = require('../docs/assets/js/data.js');
test('day-of-year arithmetic: hand-counted cases, wrap-around, invalid dates', () => {
  assert.equal(P.doy('01/01'), 1);
  assert.equal(P.doy('03/30'), 31 + 28 + 30);
  assert.equal(P.doy('12/31'), 365);
  assert.equal(P.doy('02/29'), P.doy('02/28'));
  for (const bad of ['13/01', '02/30', '00/10', '4/0', 'x', '', null, '<b>', '4/31']) assert.equal(P.doy(bad), null, String(bad));
  assert.equal(P.label(P.doy('03/30') + 14), 'Apr 13');
  assert.equal(P.label(P.doy('01/05') - 14), 'Dec 22');             // back across New Year
  assert.equal(P.daysBetween(P.doy('04/13'), P.doy('11/20')), 221);  // 17 + 31 + 30 + 31 + 31 + 30 + 31 + 20
  assert.equal(P.daysBetween(P.doy('09/20'), P.doy('05/10')), 232);  // Southern Hemisphere: forward across New Year
});
test('sowing windows follow the CSU offsets (New York, median dates)', () => {
  const ny = D.STATIONS.find((s) => s[1] === 'USW00094728');
  assert.deepEqual(ny.slice(5, 11), ['03/14', '03/30', '04/09', '11/06', '11/20', '12/06']);   // as retrieved from NCEI
  const crop = (k) => D.CROPS.find((c) => c[0] === k);
  const tom = P.schedule(crop('tomato'), P.doy(ny[6]), P.doy(ny[9]), D.CLASSES);
  assert.equal(tom.outText, 'Apr 13');                       // very tender: +14 days
  assert.equal(tom.sowText, 'Feb 23 – Mar 9');               // 7 and 5 weeks earlier
  assert.equal(tom.seasonDays, 221); assert.equal(tom.fit, 'fits');
  const let_ = P.schedule(crop('lettuce'), P.doy(ny[6]), P.doy(ny[9]), D.CLASSES);
  assert.equal(let_.outText, 'Mar 2 – Mar 16');              // hardy: 4 to 2 weeks before
  assert.equal(let_.sowText, null);
  assert.equal(P.schedule(crop('basil'), 100, 300, D.CLASSES), null);          // no frost class in the source
  const anc = D.STATIONS.find((s) => s[0] === 'Anchorage, AK');
  const sq = P.schedule(crop('winter-squash'), P.doy(anc[7]), P.doy(anc[8]), D.CLASSES);
  assert.equal(sq.fit, 'tight');                             // May 29 → Sep 18 = 112 days for 100 days to harvest
  const short = P.schedule(crop('potato'), P.doy('06/01'), P.doy('09/01'), D.CLASSES);
  assert.equal(short.fit, 'short');
  assert.equal(P.schedule(crop('tomato'), P.doy('05/01'), null, D.CLASSES).fit, null);
});
test('reference data is complete and consistent', () => {
  assert.equal(D.STATIONS.length, 53);
  for (const s of D.STATIONS) {
    assert.match(s[1], /^USW\d{8}$/);
    const dates = s.slice(5, 11);
    if (dates.some((d) => d === null)) { assert.ok(dates.every((d) => d === null), s[0]); assert.equal(s[11], 0, s[0]); continue; }
    for (const d of dates) assert.notEqual(P.doy(d), null, s[0] + ' ' + d);
    // spring: early ≤ median ≤ late, measured from the early date; fall likewise
    assert.ok(P.daysBetween(P.doy(s[5]), P.doy(s[6])) <= P.daysBetween(P.doy(s[5]), P.doy(s[7])), s[0]);
    assert.ok(P.daysBetween(P.doy(s[8]), P.doy(s[9])) <= P.daysBetween(P.doy(s[8]), P.doy(s[10])), s[0]);
  }
  const keys = new Set();
  for (const c of D.CROPS) {
    assert.ok(!keys.has(c[0])); keys.add(c[0]);
    assert.ok(c[2] === null || Object.hasOwn(D.CLASSES, c[2]), c[0]);
    for (const k of c[6]) assert.ok(Object.hasOwn(D.CONTAINERS, k), c[0]);
    if (c[5]) assert.ok(c[5][0] <= c[5][1]);
    if (c[2] === null) assert.equal(c[3], null);
  }
  for (const r of D.PERENNIALS) assert.ok(r[1] >= 1 && r[1] <= r[2] && r[2] <= 13);
  for (const s of D.STATIONS) assert.ok(!/ US$|DWTNC/.test(s[2]) && /, [A-Z]{2}$/.test(s[2]), s[2]);
});
test('container weight is volume times wet weight per litre', () => {
  const w = P.containerWeight([8, 10], 0.75);
  assert.ok(Math.abs(w.kg[0] - 8 * 3.78541 * 0.75) < 1e-9);
  assert.ok(Math.abs(w.lb[1] - 10 * 3.78541 * 0.75 * 2.20462) < 1e-9);
  assert.ok(Math.abs(P.containerWeight([1, 3]).kg[1] - 3 * 3.78541 * 0.75) < 1e-9);    // default: standard mix as in calc.js
  assert.equal(C.MIXES.potting.wet, 0.75); assert.equal(C.MIXES.lightweight.wet, 0.6);
});
test('floor load: average and share, no reassuring class', () => {
  const m2 = 10 * 5 * 0.3048 * 0.3048, ref = 60 * P.PSF;
  const r = P.areaLoad(125, m2, ref);
  assert.ok(Math.abs(r.avgKgM2 - 26.91) < 0.01);
  assert.ok(Math.abs(r.avgPsf - 5.51) < 0.01);
  assert.ok(Math.abs(r.share - 0.0919) < 0.0005);
  assert.equal(r.state, 'share');                                       // a percentage, never "low" or "fine"
  for (const k of [0.01, 0.3, 0.5, 0.99]) assert.equal(P.areaLoad(ref * m2 * k, m2, ref).state, 'share');
  assert.equal(P.areaLoad(ref * m2, m2, ref).state, 'over');           // the whole figure counts as "over"
  assert.equal(P.areaLoad(125, m2, null).state, 'none');
  assert.equal(P.areaLoad(125, 0, ref), null);
  assert.equal(P.areaLoad(NaN, m2, ref), null);
  assert.ok(Math.abs(60 * P.PSF - 292.9) < 0.1);                        // 60 psf in kg/m²
});
test('winter check for pots reads the bands from the data and is never less cautious than two zones', () => {
  const row = (slug) => D.PERENNIALS.find((r) => r[3] === slug);
  for (const r of D.PERENNIALS) { assert.ok(r[5] >= r[1] + 2, r[0] + ': pot stays out closer than two zones'); assert.ok(r[6] >= r[1] && r[6] < r[5], r[0]); }
  assert.deepEqual([9, 8, 7, 6, 5, 4].map((z) => P.potWinter(z, row('lavender'))), ['out', 'out', 'protect', 'protect', 'in', 'in']);
  assert.deepEqual([11, 10, 9, 8, 7].map((z) => P.potWinter(z, row('rosemary'))), ['out', 'out', 'protect', 'protect', 'in']);
  assert.deepEqual([13, 8, 6, 5].map((z) => P.potWinter(z, row('hydrangea'))), ['protect', 'protect', 'protect', 'in']);   // never without shelter
  assert.equal(P.potWinter(NaN, row('lavender')), null);
  assert.equal(P.potWinter(14, row('lavender')), null);
  assert.equal(P.potWinter(7, undefined), null);
  assert.deepEqual(P.zoneFromMinF(-3), { zone: 6, half: 'b', lowF: -10, highF: 0 });
  assert.equal(P.zoneFromMinF(-60).zone, 1); assert.equal(P.zoneFromMinF(55).zone, 12); assert.equal(P.zoneFromMinF(65).zone, 13);
  assert.equal(P.zoneFromMinF(-7).half, 'a');
});
test('every station × both risk levels: no nonsense season, low-frost stations get no schedule', () => {
  const noSchedule = D.STATIONS.filter((s) => !s[6] || !P.freezeRegular(s[11])).map((s) => s[0]).sort();
  assert.deepEqual(noSchedule, ['Honolulu, HI', 'Los Angeles, CA', 'Miami, FL', 'New Orleans, LA', 'Orlando, FL', 'Phoenix, AZ', 'San Diego, CA', 'San Francisco, CA', 'Tampa, FL']);
  for (const s of D.STATIONS) {
    if (!s[6] || !P.freezeRegular(s[11])) continue;
    for (const [lfK, ffK] of [[6, 9], [7, 8]]) {
      const lf = P.doy(s[lfK]), ff = P.doy(s[ffK]), free = P.daysBetween(lf, ff);
      assert.ok(free >= 100 && free <= 340, `${s[0]}: ${free} frost-free days`);
      for (const c of D.CROPS) {
        const r = P.schedule(c, lf, ff, D.CLASSES);
        if (!r) continue;
        assert.equal(r.seasonDays, free - D.CLASSES[c[2]].to, `${s[0]} ${c[1]}`);
        assert.ok(r.seasonDays >= 86 && r.seasonDays <= 365, `${s[0]} ${c[1]}: ${r.seasonDays}`);
        assert.ok(!/NaN|undefined/.test(r.outText + r.sowText + r.harvestText));
      }
    }
  }
  // the case from the review: Phoenix and Tampa median dates must not produce "only 12 days" even if someone enters them by hand
  for (const name of ['Phoenix, AZ', 'Tampa, FL']) {
    const s = D.STATIONS.find((x) => x[0] === name);
    for (const c of D.CROPS) { const r = P.schedule(c, P.doy(s[6]), P.doy(s[9]), D.CLASSES); if (r) assert.ok(r.seasonDays > 300, `${name} ${c[1]}: ${r.seasonDays}`); }
  }
});
test('light figures only for the crops the source names', () => {
  assert.deepEqual(Object.keys(D.LIGHT_NAMED).sort(), ['eggplant', 'lettuce', 'pepper', 'spinach', 'summer-squash', 'tomato', 'winter-squash']);
  for (const k of Object.keys(D.LIGHT_NAMED)) { const c = D.CROPS.find((x) => x[0] === k); assert.equal(D.CLASSES[c[2]].season, D.LIGHT_NAMED[k], k); }
  assert.equal(D.STATIONS.find((s) => s[1] === 'USW00093134')[2], 'LOS ANGELES DWTN USC CAMPUS, CA');
});
test('shared links: round trip, hostile input, number and list limits', () => {
  const st = { city: 'New York, NY', deg: 90, p: ['Tomato & basil~round~40.6', 'x'], empty: '', none: null };
  const enc = P.encodeState(st);
  assert.ok(!/[<>"' ]/.test(enc));
  assert.deepEqual(P.decodeState('#' + enc), { city: 'New York, NY', deg: '90', p: ['Tomato & basil~round~40.6', 'x'] });
  const evil = P.decodeState('#__proto__=1&constructor=2&a=%3Cscript%3Ealert(1)%3C/script%3E&b=%E0%A4%A&9x=1&ok=1&' + 'k='.padEnd(700, 'y'));
  assert.deepEqual(Object.keys(evil).sort(), ['a', 'constructor', 'ok']);   // broken escapes, bad keys and oversized parts are dropped
  assert.equal(({}).polluted, undefined);
  assert.equal(evil.a, '<script>alert(1)</script>');                        // stays text; every tool validates or escapes it
  assert.equal(P.numIn(evil.a, 0, 10, 5), 5);
  assert.equal(P.oneOf(evil.a, ['open', 'glass'], 'open'), 'open');
  for (const bad of ['1e9', '0x10', ' ', '1;2', '--1', '9999999', 'NaN', 'Infinity', undefined, 12]) assert.equal(P.numIn(bad, 0, 100, -1), -1, String(bad));
  assert.equal(P.numIn('7.5', 0, 100, -1), 7.5); assert.equal(P.numIn('101', 0, 100, -1), -1); assert.equal(P.numIn('-5', -66, 66, 0), -5);
  assert.equal(P.cleanText('  a\u0000b\nc' + 'x'.repeat(80), 10), 'a b cxxxxx');
  const many = P.decodeState(Array.from({ length: 60 }, (_, i) => 'p=' + i).join('&'));
  assert.equal(many.p.length, 40);
});
test('CSV cells that start like a formula are defused', () => {
  assert.equal(P.csvCell('=SUM(A1:A9)'), '"\'=SUM(A1:A9)"');
  assert.equal(P.csvCell('+1'), '"\'+1"'); assert.equal(P.csvCell('-1'), '"\'-1"'); assert.equal(P.csvCell('@cmd'), '"\'@cmd"');
  assert.equal(P.csvCell('\t=1'), '"\'\t=1"');
  assert.equal(P.csvCell('He said "hi", twice'), '"He said ""hi"", twice"');
  assert.equal(P.csvCell(12.5), '"12.5"'); assert.equal(P.csvCell(null), '""');
  assert.equal(P.csv([['a', '=b'], ['c']]), '"a","\'=b"\r\n"c"\r\n');
});
