# Quickstart: Validate UX Audit Remediation

## Prerequisites
- Node 18+ (for `node --test`), any static server (`npx serve .` or Netlify dev), Chrome DevTools.
- Optional: owner has filled `empresa.js` for steps 1b and 1c.

## 1. Trust (Phase 1)
a. `node --test tests/` → all pass, including `cabecera-pie.test.js` (see `contracts/consistency-test.md`).
b. With identity empty: open any page. The footer shows the 4 groups and "© 2026 Themora". No identity text and no empty gap.
c. With identity filled (local test only, then revert): the footer shows name · address; formar-negocio and listar-negocio show "Operado por {name}, {state}" under the payment box.
d. View source of `cuenta.html` and `login.html`: the `noindex` meta is present.

## 2. Accessibility (Phase 2)
a. Tab through index (hero → dark business band → footer), comprar-auto and contrato-auto. The focus ring is visible everywhere; on dark areas it is the light water color.
b. DevTools contrast picker: hero-stat labels, logged-in account button, input borders, and footer links meet the ratios in `contracts/ui-rules.md`.
c. At 360px: the menu button measures ≥44×44; group labels in the open menu don't react to taps.
d. Zoom to 200% at 1280px: no horizontal scroll on index, credito, contrato-auto.

## 3. Label sizes
In the contrato-auto contract preview and the comprar-auto stats, Computed font-size is ≥14px for every label that carries a value or name.

## 4. Performance (Phase 3)
a. DevTools Network on index (reload, cache disabled): `zyron-brain.js` and `zyron-leyes.js` do NOT load.
b. Open the assistant and ask "¿qué es la FDCPA?". Both files load then and an answer appears.
c. Block `zyron-brain.js` in DevTools, reload, open the assistant, and ask again: the local fallback answer or a friendly message appears, not a broken panel.
d. The rate notice still appears on the 12 notice pages when triggered (`node --test tests/tasas-paginas.test.js`).

## 5. Shape and color (Phases 4-5)
a. Screenshot all 17 pages at 390px and 1280px. Cards, inputs, buttons and menus all have 6px corners; pills only on chips; circles only on avatars and the launcher.
b. Logged-in state: the avatar fill is pale water with petrol text, with no gold.
c. `grep -E 'border-radius:(8|9|12|14|16|18|20|22|26|28)px' styles.css` returns nothing.

## 6. Focus and polish (Phase 6)
a. Homepage hero: one filled button ("Explicar mi carta gratis"). "Tengo un negocio" is in the dark business band, and the Umami event `inicio-negocio` still fires.
b. comprar-casa at 390px: only the launcher floats. Tap into a form field and the launcher disappears; blur the field and it returns.

## Done when
All steps pass, `node --test tests/` is green, and `graphify update .` has been run.
