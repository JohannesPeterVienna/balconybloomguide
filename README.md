# balconybloomguide.com

Static site, published from `docs/` (GitHub Pages, CNAME `balconybloomguide.com`). Built for this domain only.

- Build: `npm run build` (`src/build.mjs`) – guide texts in `src/guides/*.html`, tool texts in `src/tools/*.html` (meta block + body), tool forms in `src/forms.mjs`, home and legal pages in `src/pages.mjs`. `docs/assets/` is hand-written and not regenerated.
- Browser code: `sun.js` (NOAA sun position + balcony shading), `calc.js` (pot volume/weight, wind score, watering estimate), `tools.js` (tool UIs), `consent.js` (consent decision), `bloom.js` (ad slots, consent-gated GA4, saved balcony profile).
- Ads: slot IDs in `docs/assets/js/bloom.js` (`SLOTS`). Empty ID = nothing rendered, no space reserved. Ads never inside tool blocks; none on home, index, legal pages.
- Tests: `npm test` (calculations, consent rules, page checks), `npm run test:browser` (all sitemap pages at 390/1366 px, tools, saved profile).
- Old URLs: see `REDIRECTS.md`.
