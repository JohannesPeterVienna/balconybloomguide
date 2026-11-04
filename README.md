# balconybloomguide.com

Static site, published from `docs/` (GitHub Pages, CNAME `balconybloomguide.com`). Built for this domain only.

- Build: `npm run build` (`src/build.mjs`) – guide texts in `src/guides/*.html`, plant profiles in `src/plants/*.html`, tool texts in `src/tools/*.html` (meta block + body), tool forms in `src/forms.mjs`, home and legal pages in `src/pages.mjs`. `docs/assets/` is hand-written and not regenerated.
- Browser code: `sun.js` (NOAA sun position + balcony shading), `calc.js` (pot volume/weight, wind score, watering estimate), `tools.js` (tool UIs), `consent.js` (consent decision), `bloom.js` (ad slots, consent-gated GA4, saved balcony profile).
- Ads: the AdSense loader sits statically in the head of every indexable page (after the consent default), except imprint, privacy, contact and 404; `bloom.js` never loads it a second time. Slot IDs in `docs/assets/js/bloom.js` (`SLOTS`). Empty ID = nothing rendered, no space reserved. Ad boxes never inside tool blocks and none on home, index or legal pages; the browser test forces every box visible and requires 150 px to buttons, inputs and summaries.
- Plant profiles: `src/plants/*.html` (same meta block as guides), hub at `/plants/`.
- Tests: `npm test` (calculations, consent rules, page checks), `npm run test:browser` (all sitemap pages at 390/1366 px, tools, saved profile).
- Old URLs: see `REDIRECTS.md`.
