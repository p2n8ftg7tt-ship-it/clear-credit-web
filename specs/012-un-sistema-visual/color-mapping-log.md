# Color mapping log (012, C3)

Restos de las paletas café/dorada anteriores, cambiados por su función (research R5).
Se quedan a propósito, porque tienen significado: el ámbar de "sí sale de tu teléfono" (`.aviso-envio*`, `#8A5A00`), las opciones de pago (`.pago-*`), las bandas del TDS en aparezco, la barra de rangos de crédito (`.range-seg`), el punto de "sin actualizar" (`.rate-status`), el medidor de contraseña de login y los logos de Google y Microsoft. El iframe Auto Coach no se tocó (decisión 8 del dueño).

| Archivo | Regla | Antes | Después | Función |
|---|---|---|---|---|
| styles.css | `.talk-icon` | `rgba(201,138,62,.4)` | `rgba(18,63,79,.4)` | sombra |
| styles.css | `.auth-cta-btn` | `rgba(201,138,62,.5)` | `rgba(18,63,79,.5)` | sombra |
| styles.css | `.auth-cta-btn:hover` | `rgba(201,138,62,.6)` | `rgba(18,63,79,.6)` | sombra |
| styles.css | `/* =========================================================` | `rgba(201,138,62,.28)` | `rgba(18,63,79,.28)` | sombra |
| styles.css | `(varias)` | `linear-gradient(135deg,var(--navy-deep),#171008)` | `background:var(--tinta)` | cabecera Zyron sólida ×1 |
| styles.css | `(varias)` | `linear-gradient(135deg,var(--gold-light),var(--go` | `background:var(--copia,var(--copia-celeste))` | ícono con degradado dorado → copia ×2 |
| aparezco.html | `/* Aviso de límite diario o de búsqueda no disponible */
  .` | `rgba(184,134,48,.3)` | `rgba(95,168,184,.3)` | tinte/borde → celeste |
| aparezco.html | `/* Aviso de límite diario o de búsqueda no disponible */
  .` | `rgba(184,134,48,.09)` | `rgba(95,168,184,.09)` | tinte/borde → celeste |
| aparezco.html | `/* Aviso de límite diario o de búsqueda no disponible */
  .` | `#8a5a20` | `var(--tinta)` | texto café |
| cartas-claras.html | `/* ===== HERRAMIENTA (reutiliza patrones de credito.html) ==` | `rgba(201,138,62,.13)` | `rgba(95,168,184,.13)` | tinte/borde → celeste |
| cartas-claras.html | `.cc-scope-chip.is-detected` | `rgba(201,138,62,.4)` | `rgba(18,63,79,.4)` | sombra |
| cartas-claras.html | `.cr-file-type` | `rgba(184,134,59,.14)` | `rgba(95,168,184,.14)` | tinte/borde → celeste |
| cartas-claras.html | `.cc-badge-cat` | `rgba(201,138,62,.16)` | `rgba(95,168,184,.16)` | tinte/borde → celeste |
| cartas-claras.html | `.cc-badge-cat` | `#8a5a20` | `var(--tinta)` | texto café |
| cartas-claras.html | `.cc-badge-cat` | `rgba(201,138,62,.45)` | `rgba(95,168,184,.45)` | tinte/borde → celeste |
| cartas-claras.html | `.cc-badge-urg-media` | `rgba(201,138,62,.16)` | `rgba(95,168,184,.16)` | tinte/borde → celeste |
| cartas-claras.html | `.cc-badge-urg-media` | `#8a5a20` | `var(--tinta)` | texto café |
| cartas-claras.html | `.cc-badge-urg-media` | `rgba(201,138,62,.45)` | `rgba(95,168,184,.45)` | tinte/borde → celeste |
| cartas-claras.html | `/* ===== Permiso para mandar la foto ===== */
  .cc-permiso` | `rgba(184,134,48,.07)` | `rgba(95,168,184,.07)` | tinte/borde → celeste |
| cartas-claras.html | `.cc-ico` | `#8a6a2f` | `var(--accion)` | texto café |
| comprar-auto.html | `.auto-myth::before` | `rgba(217,168,74,.14)` | `rgba(159,211,219,.14)` | brillo sobre oscuro → agua |
| comprar-casa.html | `.tasas-mensaje,.tasas-obsoleto` | `rgba(201,138,62,.12)` | `rgba(95,168,184,.12)` | tinte/borde → celeste |
| comprar-casa.html | `.tasas-mensaje,.tasas-obsoleto` | `rgba(201,138,62,.35)` | `rgba(95,168,184,.35)` | tinte/borde → celeste |
| comprar-casa.html | `.citizen-myth::before` | `rgba(217,168,74,.14)` | `rgba(159,211,219,.14)` | brillo sobre oscuro → agua |
| comprar-casa.html | `.cmp-fha header span` | `rgba(201,138,62,.16)` | `rgba(95,168,184,.16)` | tinte/borde → celeste |
| comprar-casa.html | `.cmp-fha header span` | `#8a5a1f` | `var(--tinta)` | texto café |
| comprar-casa.html | `.mip-paso-clave` | `rgba(232,201,154,.3)` | `rgba(159,211,219,.3)` | brillo sobre oscuro → agua |
| comprar-casa.html | `(varias)` | `linear-gradient(135deg,var(--gold-light),var(--go` | `background:var(--copia,var(--copia-celeste))` | ícono con degradado dorado → copia ×1 |
| contrato-auto.html | `/* ===== Hero — sentado en el dealer, con el contrato enfren` | `rgba(240,207,152,.16)` | `rgba(159,211,219,.16)` | brillo sobre oscuro → agua |
| credito.html | `.cr-file-type` | `rgba(184,134,59,.14)` | `rgba(95,168,184,.14)` | tinte/borde → celeste |
| credito.html | `.cr-health.attention` | `rgba(184,134,59,.15)` | `rgba(95,168,184,.15)` | tinte/borde → celeste |
| credito.html | `.cr-detected-data` | `rgba(184,134,59,.35)` | `rgba(95,168,184,.35)` | tinte/borde → celeste |
| credito.html | `.cr-letter-note` | `rgba(200,146,62,.10)` | `rgba(95,168,184,.10)` | tinte/borde → celeste |
| cuenta.html | `.acct-identity::before` | `rgba(217,168,74,.14)` | `rgba(159,211,219,.14)` | brillo sobre oscuro → agua |
| herramientas.html | `.status-soon` | `rgba(184,134,59,.14)` | `rgba(95,168,184,.14)` | tinte/borde → celeste |
| herramientas.html | `/* El campo que la persona escribió se marca; los otros dos ` | `rgba(201,138,62,.09)` | `rgba(95,168,184,.09)` | tinte/borde → celeste |
| herramientas.html | `/* El campo que la persona escribió se marca; los otros dos ` | `rgba(201,138,62,.35)` | `rgba(95,168,184,.35)` | tinte/borde → celeste |
| privacidad.html | `.legal-note` | `rgba(184,134,48,.07)` | `rgba(95,168,184,.07)` | tinte/borde → celeste |
| quienes-somos.html | `.qs-not-item .qs-badge` | `rgba(232,201,154,.16)` | `rgba(159,211,219,.16)` | brillo sobre oscuro → agua |
| terminos.html | `.legal-note` | `rgba(184,134,48,.07)` | `rgba(95,168,184,.07)` | tinte/borde → celeste |
