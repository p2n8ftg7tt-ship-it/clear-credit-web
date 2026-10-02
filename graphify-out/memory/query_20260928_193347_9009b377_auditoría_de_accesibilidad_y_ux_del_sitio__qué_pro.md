---
type: "audit"
date: "2026-09-28T19:33:47.456886+00:00"
question: "Auditoría de accesibilidad y UX del sitio: qué problemas objetivos hay y dónde"
contributor: "graphify"
outcome: "useful"
source_nodes: ["cuenta.html", "agendar.html", "formar-negocio.html", "listar-negocio.html", "herramientas.html", "comprar-casa.html", "admin.html", "styles.css"]
---

# Q: Auditoría de accesibilidad y UX del sitio: qué problemas objetivos hay y dónde

## Answer

# Auditoría de accesibilidad y UX (Web Interface Guidelines de Vercel), 2026-09-28

Lo que ya cumple: skip link, <main>, lang, theme-color, zoom permitido, regla global de reduced-motion (styles.css:530), aria-expanded en el menú (nav.js). Sin transition:all, sin pegar bloqueado, sin <div onclick>.

## Alta prioridad
- Formularios de respaldo de Netlify con class="sr-only" en vez de hidden: el teclado y el lector de pantalla llegan a campos sin etiqueta, incluido el anti-spam bot-field. agendar.html:243 (#agStaticForm), formar-negocio.html:495 (#fnStaticForm), listar-negocio.html:446 (#lnStaticForm).
- Anillos de foco invisibles (la regla propia pide al menos 3:1): styles.css:462 .form-group input:focus usa --gold-light (1.64:1); styles.css:414 .credit-coach-input; styles.css:481 .auth-phone-group; styles.css:323 .tila-field quita el outline y el fondo cambia apenas 1.06:1; styles.css:491 .auth-country-search (1.13:1); comprar-casa.html:204 .fha-calc-input con rgba(.14); iframe Auto Coach en herramientas.html:489.
- cuenta.html:357, 361, 365: los tres .acct-toggle no tienen nombre accesible. cuenta.html:99: "Guardado ✓" mide .7rem y no tiene aria-live (el JS de cuenta.html:652 solo cambia la opacidad).
- Contraste: --gold (#5FA8B8, 2.7:1) usado como texto en comprar-casa.html:232 (.fha-mip-card strong) y aparezco.html:186 (.ap-stars). Bordes de campo con --line (1.33:1) en vez de --borde-campo (3.76:1): styles.css:413 y 461; comprar-casa.html:203 y 307; contrato-auto.html:149 y 158; herramientas.html:37 y 64. Bordes del iframe Auto Coach #b9cbd1 (1.68:1).
- cuenta.html:95: el interruptor encendido usa --gold (2.7:1).

## Formularios
- Falta autocomplete: contacto.html:113, 118; formar-negocio.html:394, 398, 402, 410; listar-negocio.html:242, 246, 250, 270, 274; herramientas.html:761, 763, 765.
- Correo o teléfono con type=text: admin.html:271, 275, 832; cuenta.html:330; listar-negocio.html:453.
- Campos sin etiqueta: admin.html:227 (clientSearch) y admin.html:832 (paBuscar, paCorreo, paReferencia, paServicio).
- Solo aparezco y login usan aria-invalid / aria-describedby. credito (15 campos obligatorios) y herramientas (12) no ligan los errores a su campo.
- mortgage-calculator.js:68 usa alert() para un error.

## Consistencia
- El iframe Auto Coach (herramientas.html:482, srcdoc) es otro sistema de diseño: colores #062C60 y #008B94, fuentes Montserrat y Playfair Display (ninguna se carga dentro del iframe), radios de 8-9px, texto de 12-13px y height:420px (crece con el script frameElement de herramientas.html:678).
- Radios distintos de 6px: herramientas (unos 25), admin.html:40, 50, 53, 74, 85, 86; formar-negocio.html:31, 32, 45, 62, 67; aparezco.html:129, 138, 189; listar-negocio.html:50, 85; cuenta.html:120, 121; agendar.html:48.
- Etiquetas por debajo de .75rem: herramientas (13), comprar-casa.html:45, 47, 213, 328, 628; cartas-claras.html:87, 123, 135; formar-negocio.html:48, 52, 361; styles.css:285, 371.

## Imágenes y menores
- El logo del encabezado no tiene width/height en las 18 páginas; tampoco index.html:478, 486, 494 ni credito.html:394-397 (las 4 fotos del hero cargan completas para un fundido de 48s).
- Encabezados que saltan nivel: admin.html:150 (h1→h3), credito.html:601 y terminos.html:124 (h2→h4).
- contrato-auto.html:426 usa "..." en vez de "…".
- mortgage-accelerator.js:195-196 y tasas-texto.js:91 formatean números a mano (conviene Intl.NumberFormat).

## Outcome

- Signal: useful

## Source Nodes

- cuenta.html
- agendar.html
- formar-negocio.html
- listar-negocio.html
- herramientas.html
- comprar-casa.html
- admin.html
- styles.css