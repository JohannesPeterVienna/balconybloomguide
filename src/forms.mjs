// Interactive tool blocks (markup only; behaviour in docs/assets/js/tools.js). No ads inside these blocks.

const unitSeg = (id, a, b, label) => `<div class="row" style="margin-bottom:12px"><span class="lbl" id="${id}-l">${label}</span><div class="seg" id="${id}" role="group" aria-labelledby="${id}-l"><button type="button" data-v="${a}" aria-pressed="true">${a}</button><button type="button" data-v="${b}" aria-pressed="false">${b}</button></div></div>`;

export const FORMS = {
  'sun-hours': `<section class="tool" data-tool="sun" aria-labelledby="tool-h">
<h2 id="tool-h" style="margin-top:0">Your balcony</h2>
${unitSeg('sun-units', 'ft', 'm', 'Units')}
<form id="sun-form" novalidate>
<fieldset><legend>Where and which way</legend><div class="fields">
<div><label for="sun-city">Location</label><select id="sun-city" name="city"></select></div>
<div><label for="sun-facing">Balcony faces</label><select id="sun-facing" name="facing">
<option value="0">North</option><option value="45">Northeast</option><option value="90" selected>East</option><option value="135">Southeast</option><option value="180">South</option><option value="225">Southwest</option><option value="270">West</option><option value="315">Northwest</option></select></div>
<div><label for="sun-deg">Exact direction <span class="hint">degrees, 0 = N, 90 = E</span></label><input id="sun-deg" name="facingDeg" type="number" inputmode="decimal" value="90" min="0" max="359"></div>
<div><label for="sun-month">Month for the day view</label><select id="sun-month" name="month">${['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}</select></div>
</div>
<div class="fields" id="sun-custom" hidden style="margin-top:12px">
<div><label for="sun-lat">Latitude <span class="hint">e.g. 40.71 (south = negative)</span></label><input id="sun-lat" name="lat" type="number" inputmode="decimal" step="0.01" value="40.71"></div>
<div><label for="sun-lon">Longitude <span class="hint">e.g. −74.01 (west = negative)</span></label><input id="sun-lon" name="lon" type="number" inputmode="decimal" step="0.01" value="-74.01"></div>
</div></fieldset>
<fieldset><legend>Size and what is above</legend><div class="fields">
<div><label for="sun-depth">Depth <span class="hint">facade to railing, <span class="u-len">ft</span></span></label><input id="sun-depth" name="depth" type="number" inputmode="decimal" step="0.1" value="5"></div>
<div><label for="sun-width">Width <span class="hint">along the facade, <span class="u-len">ft</span></span></label><input id="sun-width" name="width" type="number" inputmode="decimal" step="0.1" value="10"></div>
<div><label for="sun-ceiling">Ceiling height <span class="hint">floor to the slab above, <span class="u-len">ft</span></span></label><input id="sun-ceiling" name="ceiling" type="number" inputmode="decimal" step="0.1" value="8.5"></div>
<div><label class="check"><input type="checkbox" id="sun-open-sky" name="openSky"> Open sky above (no balcony or roof over it)</label></div>
</div></fieldset>
<fieldset><legend>Sides and railing</legend><div class="fields">
<div><label class="check"><input type="checkbox" name="wallLeft" checked> Wall on the left <span class="hint">looking out</span></label></div>
<div><label class="check"><input type="checkbox" name="wallRight" checked> Wall on the right</label></div>
<div><label for="sun-rail">Railing height <span class="hint"><span class="u-len">ft</span></span></label><input id="sun-rail" name="rail" type="number" inputmode="decimal" step="0.1" value="3.5"></div>
<div><label for="sun-railtype">Railing type</label><select id="sun-railtype" name="railType"><option value="open">Open bars or mesh</option><option value="glass">Glass</option><option value="solid">Solid (wall, panels)</option></select></div>
</div></fieldset>
<fieldset><legend>Building opposite (optional)</legend>
<label class="check"><input type="checkbox" id="sun-opp" name="opp"> There is a building in front of my balcony</label>
<div class="fields" id="sun-opp-fields" hidden>
<div><label for="sun-oppd">Distance from my railing <span class="hint"><span class="u-len">ft</span></span></label><input id="sun-oppd" name="oppDist" type="number" inputmode="decimal" step="1" value="60"></div>
<div><label for="sun-opph">Its top above my balcony floor <span class="hint"><span class="u-len">ft</span></span></label><input id="sun-opph" name="oppHeight" type="number" inputmode="decimal" step="1" value="30"></div>
</div></fieldset>
</form>
<div id="sun-results" class="results" aria-live="polite"></div>
<p class="small">Clear-sky geometry: clouds, trees and buildings you have not entered are not included. The building opposite is treated as a long wall parallel to yours.</p>
</section>`,

  'pot-weight': `<section class="tool" data-tool="pots" aria-labelledby="tool-h">
<h2 id="tool-h" style="margin-top:0">Add your pots</h2>
${unitSeg('pot-units', 'in', 'cm', 'Units')}
<form id="pot-form" novalidate>
<div class="fields">
<div><label for="pot-name">Name <span class="hint">optional</span></label><input id="pot-name" name="name" type="text" maxlength="40" placeholder="e.g. Tomato pot"></div>
<div><label for="pot-shape">Shape</label><select id="pot-shape" name="shape"><option value="round">Round</option><option value="square">Square</option><option value="trough">Trough / railing box</option></select></div>
<div><label for="pot-top"><span id="pot-top-label">Top diameter</span> <span class="hint">inside, <span class="u-len">in</span></span></label><input id="pot-top" name="top" type="number" inputmode="decimal" step="0.1" value="16"></div>
<div id="pot-width-wrap" hidden><label for="pot-width">Top width <span class="hint"><span class="u-len">in</span></span></label><input id="pot-width" name="width" type="number" inputmode="decimal" step="0.1" value="8"></div>
<div><label for="pot-bottom"><span id="pot-bottom-label">Bottom diameter</span> <span class="hint">blank = straight sides</span></label><input id="pot-bottom" name="bottom" type="number" inputmode="decimal" step="0.1" value="12"></div>
<div id="pot-bwidth-wrap" hidden><label for="pot-bwidth">Bottom width <span class="hint">blank = straight</span></label><input id="pot-bwidth" name="bwidth" type="number" inputmode="decimal" step="0.1"></div>
<div><label for="pot-height">Height <span class="hint"><span class="u-len">in</span></span></label><input id="pot-height" name="height" type="number" inputmode="decimal" step="0.1" value="14"></div>
<div><label for="pot-material">Pot material</label><select id="pot-material" name="material"></select></div>
<div><label for="pot-mix">Filled with</label><select id="pot-mix" name="mix"></select></div>
<div><label for="pot-empty">Empty pot weight <span class="hint">if known, <span class="u-w">lb</span></span></label><input id="pot-empty" name="empty" type="number" inputmode="decimal" step="0.1"></div>
<div><label for="pot-plant">Plant and extras <span class="hint"><span class="u-w">lb</span></span></label><input id="pot-plant" name="plant" type="number" inputmode="decimal" step="0.1" value="0"></div>
<div><label for="pot-count">How many</label><input id="pot-count" name="count" type="number" inputmode="numeric" step="1" min="1" value="1"></div>
</div>
<div class="row" style="margin-top:14px"><button class="btn" type="submit">Add to list</button><span id="pot-msg" class="small" role="alert"></span></div>
</form>
<div id="pot-results" class="results" aria-live="polite"></div>
</section>`,

  'wind-check': `<section class="tool" data-tool="wind" aria-labelledby="tool-h">
<h2 id="tool-h" style="margin-top:0">Six questions about your balcony</h2>
<form id="wind-form" novalidate><div class="fields">
<div><label for="w-floor">Floor <span class="hint">street level = 1</span></label><input id="w-floor" name="floor" type="number" inputmode="numeric" min="1" step="1" value="6"></div>
<div><label for="w-pos">Position on the building</label><select id="w-pos" name="position"><option value="middle">Middle of the facade</option><option value="end">Near the end of the building</option><option value="corner">On a corner (open on two sides)</option></select></div>
<div><label for="w-sur">Surroundings at your height</label><select id="w-sur" name="surroundings"><option value="dense">Buildings or trees as tall as you, close by</option><option value="mixed" selected>Mixed, some gaps</option><option value="open">Open: park, water, fields or nothing as tall nearby</option></select></div>
<div><label for="w-rec">Balcony type</label><select id="w-rec" name="recess"><option value="loggia">Recessed into the building (loggia)</option><option value="partial" selected>Side walls on one or both sides</option><option value="projecting">Projecting, open at the sides</option></select></div>
<div><label for="w-rail">Railing</label><select id="w-rail" name="railing"><option value="open">Open bars or mesh</option><option value="glass">Glass</option><option value="solid">Solid wall or panels</option></select></div>
<div><label for="w-prev">Faces the usual wind direction?</label><select id="w-prev" name="prevailing"><option value="unknown">Not sure</option><option value="yes">Yes</option><option value="no">No</option></select></div>
</div></form>
<div id="wind-results" class="results" aria-live="polite"></div>
</section>`,

  'watering-planner': `<section class="tool" data-tool="water" aria-labelledby="tool-h">
<h2 id="tool-h" style="margin-top:0">Pot, place and weather</h2>
${unitSeg('water-units', 'in', 'cm', 'Units')}
<p id="water-profile" class="small"></p>
<p id="water-import" class="small" hidden>You have <span></span> pot(s) in the Pot Weight Planner. <button type="button" class="linklike">Use my pot list</button></p>
<form id="water-form" novalidate><div class="fields">
<div><label for="wa-dia">Pot top diameter <span class="hint"><span class="u-len">in</span></span></label><input id="wa-dia" name="dia" type="number" inputmode="decimal" step="0.5" value="12"></div>
<div><label for="wa-h">Pot height <span class="hint"><span class="u-len">in</span></span></label><input id="wa-h" name="height" type="number" inputmode="decimal" step="0.5" value="11"></div>
<div><label for="wa-mat">Pot material</label><select id="wa-mat" name="material"></select></div>
<div><label for="wa-can">Plant size</label><select id="wa-can" name="canopy"><option value="compact">Compact (herbs, small flowers)</option><option value="bushy" selected>Bushy, leaves beyond the rim</option><option value="large">Large (tomato, shrub)</option></select></div>
<div><label for="wa-sun">Direct sun <span class="hint">hours per day</span></label><input id="wa-sun" name="sun" type="number" inputmode="decimal" step="0.5" min="0" max="16" value="6"></div>
<div><label for="wa-wind">Wind class</label><select id="wa-wind" name="wind"><option value="sheltered">Sheltered</option><option value="moderate" selected>Moderate</option><option value="exposed">Exposed</option><option value="very">Very exposed</option></select></div>
<div><label for="wa-we">Weather</label><select id="wa-we" name="weather"></select></div>
<div><label for="wa-days">Days away <span class="hint">0 = not travelling</span></label><input id="wa-days" name="days" type="number" inputmode="numeric" min="0" max="30" step="1" value="0"></div>
</div></form>
<div id="water-results" class="results" aria-live="polite"></div>
</section>`
};
