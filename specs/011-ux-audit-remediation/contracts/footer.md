# Contract: Shared footer

Applies to the 17 public pages (all `*.html` except `admin.html`).

## Structure (in this order)

1. **Optional page-specific block**: `<div class="wrap revision-legal">…</div>`. Allowed ONLY on pages that already have it (cartas-claras, comprar-casa, contrato-auto, credito, formar-negocio). Content is page-owned and excluded from the consistency test.
2. **Shared block** (byte-identical on every page after whitespace normalization):

```html
<div class="wrap footer-grid">
  <div class="footer-col">
    <span class="brand">Themora</span>
    <p class="footer-nosomos">No somos abogados, ni prestamistas, ni una empresa de reparación de crédito. Te explicamos qué opciones existen; la decisión es tuya.</p>
  </div>
  <nav class="footer-col" aria-label="Servicios">
    <strong>Servicios</strong>
    <a href="cartas-claras.html">Cartas Claras</a>
    <a href="contrato-auto.html">Contrato del dealer</a>
    <a href="credito.html">Crédito</a>
    <a href="aparezco.html">¿Aparece mi negocio?</a>
  </nav>
  <nav class="footer-col" aria-label="Themora">
    <strong>Themora</strong>
    <a href="quienes-somos.html">Quiénes somos</a>
    <a href="contacto.html">Contacto</a>
    <a href="agendar.html">Agendar una cita</a>
  </nav>
  <nav class="footer-col" aria-label="Legal">
    <strong>Legal</strong>
    <a href="privacidad.html">Privacidad</a>
    <a href="terminos.html">Términos</a>
  </nav>
</div>
<div class="wrap footer-inner" id="footerContact" data-cms-reveal hidden>…existing three data-cms spans…</div>
<div class="wrap footer-legal"><span>© 2026 Themora</span> <span data-empresa="corta" hidden></span></div>
```

The "no somos" line condenses the first three items of the homepage "Lo que no somos" list (`index.html` L419-421); nothing new is claimed.

## Rules

- Link labels and hrefs are fixed by this contract; adding a link means updating the contract, the reference page (`index.html`) and every page.
- `#footerContact` moves from index-only to all pages (the CMS already reveals it only when filled). Its inline `style` moves to `styles.css`.
- The identity slot keeps `data-empresa="corta"` and its hidden-until-filled behavior.
- Layout: 4 columns ≥1000px, 2 columns 600-999px, 1 column <600px. Each link has a ≥44px tall tap area below 720px.
- Colors: text ≥4.5:1 on `#0E3240`; focus ring uses `--agua` (see `ui-rules.md`).
