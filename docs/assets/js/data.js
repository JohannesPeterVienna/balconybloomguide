/*
 * Balcony Bloom Guide – reference data compiled for this site from primary sources (retrieved 18 Nov 2026).
 * Browser: window.BBData · Node: module.exports (the build prints the same rows as static tables).
 *
 * STATIONS  NOAA NCEI, U.S. Climate Normals 1991–2020, annual/seasonal product, variables
 *           ANN-TMIN-PRBLST-T32FP90/50/10 (last 32 °F in spring), ANN-TMIN-PRBFST-T32FP10/50/90 (first 32 °F in fall),
 *           ANN-TMIN-PRBOCC-LSTH032 (share of years with 32 °F or below). Dates are MM/DD; null = NOAA gives no date.
 *           [city, station id, NOAA station name, lat, lon, spring early (P90), spring median (P50), spring late (P10),
 *            fall early (P10), fall median (P50), fall late (P90), % of years with a freeze]
 * CROPS     Colorado State University Extension, GardenNotes #720 "Vegetable Planting Guide" (reviewed Sept 2024):
 *           frost class, typical days to harvest (fromTransplant = counted from transplanting), age of transplant in weeks.
 *           University of Maryland Extension, "Types of Containers for Growing Vegetables" (updated 20 Feb 2023): container class.
 * PERENNIALS  USDA zones for plants in the ground as cited on this site's plant profile pages (sources listed there).
 */
(function (root) {
  'use strict';
  var RETRIEVED = '2026-11-18';
  var STATIONS = [
    ["Albany, NY", "USW00014735", "ALBANY AP, NY", 42.74, -73.81, "04/16", "04/27", "05/11", "10/03", "10/15", "11/01", 100.0],
    ["Albuquerque, NM", "USW00023050", "ALBUQUERQUE INTL AP, NM", 35.04, -106.62, "03/17", "04/06", "04/23", "10/21", "11/03", "11/16", 100.0],
    ["Anchorage, AK", "USW00026451", "ANCHORAGE INTL AP, AK", 61.17, -150.03, "04/24", "05/05", "05/15", "09/18", "10/01", "10/14", 100.0],
    ["Atlanta, GA", "USW00013874", "ATLANTA HARTSFIELD INTL AP, GA", 33.63, -84.44, "02/23", "03/15", "04/04", "11/04", "11/20", "12/10", 100.0],
    ["Austin, TX", "USW00013958", "AUSTIN-CAMP MABRY, TX", 30.32, -97.76, "01/23", "02/20", "03/14", "11/15", "12/03", "01/01", 99.4],
    ["Baltimore, MD", "USW00093721", "BALTIMORE WASH INTL AP, MD", 39.17, -76.68, "03/27", "04/10", "04/25", "10/17", "10/31", "11/12", 100.0],
    ["Boise, ID", "USW00024131", "BOISE AIR TERMINAL, ID", 43.57, -116.24, "04/04", "04/24", "05/09", "10/05", "10/21", "11/05", 100.0],
    ["Boston, MA", "USW00014739", "BOSTON LOGAN INTL AP, MA", 42.36, -71.01, "03/25", "04/04", "04/17", "10/29", "11/09", "11/22", 100.0],
    ["Buffalo, NY", "USW00014733", "BUFFALO, NY", 42.95, -78.74, "04/11", "04/24", "05/09", "10/10", "10/26", "11/09", 100.0],
    ["Charlotte, NC", "USW00013881", "CHARLOTTE DOUGLAS AP, NC", 35.22, -80.96, "03/12", "03/30", "04/14", "10/22", "11/03", "11/17", 100.0],
    ["Chicago, IL", "USW00094846", "CHICAGO OHARE INTL AP, IL", 41.99, -87.93, "04/03", "04/16", "05/01", "10/15", "10/28", "11/11", 100.0],
    ["Cincinnati, OH", "USW00093814", "CINCINNATI NORTHERN KY AP, KY", 39.04, -84.67, "04/03", "04/18", "05/07", "10/12", "10/25", "11/05", 100.0],
    ["Cleveland, OH", "USW00014820", "CLEVELAND, OH", 41.41, -81.86, "04/04", "04/20", "05/05", "10/21", "11/03", "11/17", 100.0],
    ["Columbus, OH", "USW00014821", "COLUMBUS PORT COLUMBUS INTL AP, OH", 39.99, -82.88, "04/04", "04/18", "05/05", "10/14", "10/27", "11/07", 100.0],
    ["Dallas, TX", "USW00003927", "DALLAS FT WORTH AP, TX", 32.9, -97.02, "02/17", "03/08", "03/26", "11/06", "11/24", "12/12", 100.0],
    ["Denver, CO", "USW00023062", "DENVER-STAPLETON, CO", 39.76, -104.87, "04/20", "05/04", "05/16", "09/25", "10/08", "10/20", 100.0],
    ["Des Moines, IA", "USW00014933", "DES MOINES INTL AP, IA", 41.53, -93.65, "04/04", "04/18", "05/02", "10/04", "10/20", "11/01", 100.0],
    ["Detroit, MI", "USW00094847", "DETROIT METRO AP, MI", 42.23, -83.33, "04/06", "04/20", "05/08", "10/14", "10/27", "11/09", 100.0],
    ["Hartford, CT", "USW00014740", "HARTFORD BRADLEY INTL AP, CT", 41.94, -72.68, "04/08", "04/21", "05/06", "10/03", "10/16", "11/02", 100.0],
    ["Honolulu, HI", "USW00022521", "HONOLULU INTL AP, HI", 21.32, -157.93, null, null, null, null, null, null, 0.0],
    ["Houston, TX", "USW00012960", "HOUSTON INTERCONT AP, TX", 29.98, -95.36, "01/12", "02/13", "03/12", "11/17", "12/09", "01/11", 98.9],
    ["Indianapolis, IN", "USW00093819", "INDIANAPOLIS, IN", 39.71, -86.28, "04/02", "04/15", "05/02", "10/13", "10/26", "11/07", 100.0],
    ["Kansas City, MO", "USW00003947", "KANSAS CITY INTL AP, MO", 39.3, -94.73, "03/30", "04/13", "04/29", "10/09", "10/24", "11/05", 100.0],
    ["Las Vegas, NV", "USW00023169", "LAS VEGAS MCCARRAN AP, NV", 36.07, -115.16, "12/20", "01/20", "02/14", "11/28", "12/15", "01/07", 94.3],
    ["Los Angeles, CA", "USW00093134", "LOS ANGELES DWTNC CAMPUS, CA", 34.05, -118.24, null, null, null, null, null, null, 0.0],
    ["Louisville, KY", "USW00093821", "LOUISVILLE INTL AP, KY", 38.18, -85.74, "03/14", "03/31", "04/16", "10/28", "11/07", "11/23", 100.0],
    ["Madison, WI", "USW00014837", "MADISON DANE RGNL AP, WI", 43.14, -89.35, "04/16", "05/01", "05/16", "09/26", "10/10", "10/24", 100.0],
    ["Memphis, TN", "USW00013893", "MEMPHIS INTL AP, TN", 35.06, -89.99, "02/27", "03/16", "04/04", "11/02", "11/16", "12/03", 100.0],
    ["Miami, FL", "USW00012839", "MIAMI INTL AP, FL", 25.79, -80.32, null, null, null, null, null, null, 0.0],
    ["Milwaukee, WI", "USW00014839", "MILWAUKEE MITCHELL AP, WI", 42.95, -87.9, "04/06", "04/19", "05/02", "10/15", "10/29", "11/10", 100.0],
    ["Minneapolis, MN", "USW00014922", "MINNEAPOLIS/ST PAUL AP, MN", 44.88, -93.23, "04/08", "04/23", "05/07", "10/01", "10/18", "10/31", 100.0],
    ["Nashville, TN", "USW00013897", "NASHVILLE INTL AP, TN", 36.12, -86.69, "03/13", "03/31", "04/16", "10/22", "11/03", "11/18", 100.0],
    ["New Orleans, LA", "USW00012916", "NEW ORLEANS INTL AP, LA", 29.99, -90.25, "12/29", "01/30", "02/27", "12/01", "12/31", "01/31", 86.8],
    ["New York, NY", "USW00094728", "NEW YORK CNTRL PK TWR, NY", 40.78, -73.97, "03/14", "03/30", "04/09", "11/06", "11/20", "12/06", 100.0],
    ["Oklahoma City, OK", "USW00013967", "OKLAHOMA CITY WILL ROGERS AP, OK", 35.39, -97.6, "03/16", "04/04", "04/20", "10/21", "11/02", "11/17", 100.0],
    ["Omaha, NE", "USW00014942", "OMAHA EPPLEY AIRFIELD, NE", 41.31, -95.9, "04/05", "04/18", "04/30", "10/06", "10/21", "11/01", 100.0],
    ["Orlando, FL", "USW00012815", "ORLANDO INTL AP, FL", 28.43, -81.33, "12/30", "01/25", "02/26", "12/18", "01/10", "02/10", 60.7],
    ["Philadelphia, PA", "USW00013739", "PHILADELPHIA INTL AP, PA", 39.87, -75.23, "03/19", "04/02", "04/13", "10/30", "11/10", "11/24", 100.0],
    ["Phoenix, AZ", "USW00023183", "PHOENIX SKY HARBOR INTL AP, AZ", 33.43, -112.0, "12/19", "01/05", "01/22", "12/18", "01/03", "01/21", 17.5],
    ["Pittsburgh, PA", "USW00094823", "PITTSBURGH INTL AP, PA", 40.48, -80.21, "04/09", "04/23", "05/12", "10/09", "10/23", "11/06", 100.0],
    ["Portland, OR", "USW00024229", "PORTLAND INTL AP, OR", 45.59, -122.6, "02/22", "03/13", "04/01", "10/29", "11/19", "12/10", 100.0],
    ["Providence, RI", "USW00014765", "PROVIDENCE T F GREEN AP, RI", 41.72, -71.43, "04/01", "04/11", "04/23", "10/16", "10/30", "11/12", 100.0],
    ["Raleigh, NC", "USW00013722", "RALEIGH DURHAM INTL AP, NC", 35.89, -78.78, "03/15", "03/31", "04/16", "10/23", "11/04", "11/17", 100.0],
    ["Richmond, VA", "USW00013740", "RICHMOND INTL AP, VA", 37.51, -77.32, "03/19", "04/03", "04/18", "10/23", "11/04", "11/19", 100.0],
    ["Sacramento, CA", "USW00023232", "SACRAMENTO EXECUTIVE AP, CA", 38.51, -121.5, "01/02", "02/02", "03/05", "11/16", "12/02", "01/02", 98.1],
    ["Salt Lake City, UT", "USW00024127", "SALT LAKE CITY INTL AP, UT", 40.78, -111.97, "03/17", "04/08", "04/30", "10/17", "10/31", "11/13", 100.0],
    ["San Antonio, TX", "USW00012921", "SAN ANTONIO INTL AP, TX", 29.54, -98.48, "01/29", "02/26", "03/17", "11/07", "11/28", "12/22", 99.9],
    ["San Diego, CA", "USW00023188", "SAN DIEGO LINDBERGH FLD, CA", 32.73, -117.18, null, null, null, null, null, null, 0.0],
    ["San Francisco, CA", "USW00023272", "SAN FRANCISCO DWTN, CA", 37.77, -122.43, null, null, null, null, null, null, 0.0],
    ["Seattle, WA", "USW00024233", "SEATTLE TACOMA INTL AP, WA", 47.44, -122.31, "02/05", "03/02", "03/23", "11/06", "11/23", "12/15", 100.0],
    ["St. Louis, MO", "USW00013994", "ST LOUIS LAMBERT INTL AP, MO", 38.75, -90.37, "03/17", "04/02", "04/17", "10/23", "11/04", "11/18", 100.0],
    ["Tampa, FL", "USW00012842", "TAMPA INTL AP, FL", 27.96, -82.54, "12/27", "01/20", "02/10", "12/23", "01/12", "02/05", 34.5],
    ["Washington, DC", "USW00013743", "WASHINGTON REAGAN AP, VA", 38.85, -77.03, "03/07", "03/24", "04/06", "11/05", "11/18", "12/06", 100.0]
  ];

  // Frost classes and planting-out rule, CSU GardenNotes #720. from/to = days relative to the average last spring frost.
  var CLASSES = {
    hardy:  { name: 'Hardy', season: 'cool', from: -28, to: -14, rule: 'as early as 2–4 weeks before the average last spring frost' },
    semi:   { name: 'Semi-hardy', season: 'cool', from: -14, to: 0, rule: 'as early as 0–2 weeks before the average last spring frost' },
    tender: { name: 'Tender', season: 'warm', from: 0, to: 0, rule: 'from seed around the average last spring frost; transplants once frost is over' },
    very:   { name: 'Very tender', season: 'warm', from: 14, to: 14, rule: 'typically 2 or more weeks after the average last spring frost' }
  };
  // Container classes, UMD Extension. Volumes in US gallons of growing media, depth in inches.
  var CONTAINERS = {
    L: { name: 'Large', gal: [8, 10], depth: [12, 16], note: 'one plant per container' },
    M: { name: 'Medium', gal: [4, 6], depth: [8, 12], note: '' },
    S: { name: 'Small', gal: [1, 3], depth: [4, 6], note: '' }
  };
  // Direct sun, UMD Extension "Growing Vegetables in Containers" (updated 23 Mar 2026):
  // 6–8 h for warm-season crops, 3–5 h for cool-season crops.
  var LIGHT = { warm: [6, 8], cool: [3, 5] };

  // [key, name, class or null, days to harvest or null, fromTransplant, transplant age weeks [min,max] or null, container classes, remark]
  var CROPS = [
    ['broccoli', 'Broccoli', 'hardy', 65, true, [5, 7], ['M'], 'UMD names "cole crops" as a group'],
    ['cabbage', 'Cabbage', 'hardy', 85, true, [5, 7], ['M'], ''],
    ['kohlrabi', 'Kohlrabi', 'hardy', 50, false, null, ['M'], 'UMD names "cole crops" as a group'],
    ['lettuce', 'Lettuce (leaf types)', 'hardy', 60, false, null, ['S'], 'UMD: "salad greens"'],
    ['scallion', 'Onions, green (scallions)', 'hardy', 60, false, null, ['S'], ''],
    ['peas', 'Peas', 'hardy', 65, false, null, ['S'], ''],
    ['radish', 'Radishes', 'hardy', 30, false, null, ['S'], ''],
    ['spinach', 'Spinach', 'hardy', 40, false, null, ['S'], ''],
    ['turnip', 'Turnips', 'hardy', 50, false, null, [], ''],
    ['beet', 'Beets', 'semi', 60, false, null, ['M'], ''],
    ['carrot', 'Carrots', 'semi', 70, false, null, ['M'], ''],
    ['cauliflower', 'Cauliflower', 'semi', null, true, [5, 7], ['M'], 'UMD names "cole crops" as a group'],
    ['parsley', 'Parsley', 'semi', null, false, null, ['M'], 'UMD: "larger herbs"'],
    ['potato', 'Potatoes', 'semi', 125, false, null, [], 'UMD: 30 gallons of potting mix'],
    ['chard', 'Swiss chard', 'semi', 60, false, null, ['M', 'S'], 'UMD lists chard in two size groups'],
    ['bean', 'Beans, snap', 'tender', 60, false, null, ['M', 'S'], 'UMD lists beans in two size groups'],
    ['cucumber', 'Cucumbers', 'tender', 55, false, [2, 3], ['L'], 'CSU: best direct-seeded; transplants no older than 2–3 weeks'],
    ['summer-squash', 'Squash, summer', 'tender', 50, false, [2, 3], ['M'], 'CSU: best direct-seeded; transplants no older than 2–3 weeks'],
    ['eggplant', 'Eggplant', 'very', 60, true, [6, 9], ['L'], 'UMD: dwarf varieties fit the medium size'],
    ['pepper', 'Pepper', 'very', 70, true, [6, 8], ['L'], 'UMD: dwarf varieties fit the medium size'],
    ['tomato', 'Tomato', 'very', 65, true, [5, 7], ['L'], 'UMD: dwarf varieties fit the medium size'],
    ['winter-squash', 'Squash, winter', 'very', 100, false, [2, 3], ['L'], 'CSU: best direct-seeded; transplants no older than 2–3 weeks'],
    ['cantaloupe', 'Cantaloupe', 'very', 85, false, [2, 3], [], 'UMD calls melons a "more challenging" container crop'],
    // herbs and fruit that UMD names with a container size; CSU #720 gives no frost class for them
    ['basil', 'Basil', null, null, false, null, ['S'], ''],
    ['cilantro', 'Cilantro', null, null, false, null, ['S'], ''],
    ['thyme', 'Thyme', null, null, false, null, ['S'], ''],
    ['mint', 'Mint', null, null, false, null, ['S'], ''],
    ['marjoram', 'Marjoram', null, null, false, null, ['S'], ''],
    ['garlic', 'Garlic', null, null, false, null, ['S'], ''],
    ['rosemary', 'Rosemary', null, null, false, null, ['M'], 'UMD: "larger herbs"'],
    ['lavender', 'Lavender', null, null, false, null, ['M'], 'UMD: "larger herbs"'],
    ['fennel', 'Fennel', null, null, false, null, ['M'], 'UMD: "larger herbs"'],
    ['strawberry', 'Strawberries', null, null, false, null, [], 'UMD: container depth of 8 inches']
  ];

  // Plants kept for more than one year: USDA zones in the ground as cited on the profile page. [name, lowest zone, highest zone, profile slug, remark]
  var PERENNIALS = [
    ['English lavender (Lavandula angustifolia)', 5, 8, 'lavender', 'cultivars differ'],
    ['Bigleaf hydrangea (Hydrangea macrophylla)', 6, 9, 'hydrangea', 'many cultivars; flower buds are less hardy than the plant'],
    ['Rosemary (species)', 8, 10, 'rosemary', "a few cultivars such as 'Arp' are tougher"],
    ['Purple fountain grass', 9, 10, 'ornamental-grasses', ''],
    ['Zonal geranium (Pelargonium)', 10, 11, 'geranium-pelargonium', 'usually overwintered indoors'],
    ['Petunia', 10, 11, 'petunia', 'grown as an annual elsewhere'],
    ['Fuchsia (most hybrids)', 10, 11, 'fuchsia', 'hardy fuchsia differs']
  ];

  // Live-load figure read in full in an adopted code text (see /guides/balcony-weight-limit-planters/#design-loads).
  var LOAD_REFS = [
    { key: 'wa60', psf: 60, label: '60 psf – exterior balconies and decks, Washington State Residential Code (WAC 51-51-0301, Table R301.5)' },
    { key: 'wa40', psf: 40, label: '40 psf – rooms other than sleeping areas in the same table (for comparison)' }
  ];

  var api = { RETRIEVED: RETRIEVED, STATIONS: STATIONS, CLASSES: CLASSES, CONTAINERS: CONTAINERS, LIGHT: LIGHT, CROPS: CROPS, PERENNIALS: PERENNIALS, LOAD_REFS: LOAD_REFS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BBData = api;
})(this);
