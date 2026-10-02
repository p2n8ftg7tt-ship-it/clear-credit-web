---
type: "implementation"
date: "2026-09-29T01:41:15.050440+00:00"
question: "Qué se implementó en la spec 012 y qué causaba el salto entre páginas y las letras más chicas en credito"
contributor: "graphify"
outcome: "useful"
source_nodes: ["styles.css", "nav.js", "cms.js", "credito.html", "index.html", "C8"]
---

# Q: Qué se implementó en la spec 012 y qué causaba el salto entre páginas y las letras más chicas en credito

## Answer

# Implementación de la spec 012 «Un sistema visual» (2026-09-28)

Las 36 tareas de specs/012-un-sistema-visual/tasks.md quedaron hechas en la computadora local. Sin commit y sin publicar (decisiones 11 y 12 del dueño). mithemora.com sigue en el commit 7266b1a, cuatro commits detrás de master.

## Decisiones del dueño (Detalles de revisión.md)
Fundido muy sutil y sin saltos. La cinta conserva su color. Primero lo de bajo riesgo y luego el diseño. Se hace lo recomendado (errores ligados a su campo). Se quita la foto de credito y se usa la hoja de papel. Los colores están bien. **El tamaño de las letras no se cambia.** No se toca Auto Coach. "Escríbenos". Ni commit ni publicación todavía.

## Lo que se cambió
- C1 accesibilidad:
  - formularios de respaldo con `hidden` (agendar, formar-negocio, listar-negocio)
  - interruptores de cuenta con aria-labelledby y `role=status` que dice "Guardado" (cuenta.html, función flash)
  - autocomplete y tipos de campo; etiquetas en admin
  - marcarCampos/limpiarCampos en credito.html (aria-invalid + aria-describedby) y lo mismo en #cdForm de herramientas
- C2 tokens de rol:
  - nuevo --texto-acento
  - 19 focos pasan a var(--focus-ring)
  - 16 bordes de campo pasan a --borde-campo
  - 19 textos con --gold pasan a --texto-acento
  - el interruptor encendido pasa a --accion
- C8 cinta y transición:
  - text-size-adjust:100%
  - @view-transition con la cinta quieta (view-transition-name: site-header): salida en 120ms, entrada en 200ms
  - fuentes de respaldo con medidas iguales («Bricolage fallback» sobre Arial al 91.13%, «Literata fallback» sobre Georgia al 103.2%)
  - Google Fonts con display=optional
  - .nav con 72px de alto fijo; logo de 36×36
  - espacio reservado de 7rem para #navAuthLink
  - la sección actual se marca con :has y en nav.js (is-active + aria-current)
  - cms.js solo escribe lo que cambia y guarda los colores en localStorage (themora_colores); un script en el <head> de las 18 páginas los aplica antes de dibujar
- C3:
  - 40 restos café y dorados cambiados por su función (specs/012-un-sistema-visual/color-mapping-log.md)
  - botones de acción con 6px y la fuente de títulos
  - 81 reglas sin MAYÚSCULAS
  - se quedan a propósito: el ámbar #8A5A00 de .aviso-envio y .pago-*, las bandas TDS, .range-seg, .rate-status, el medidor de contraseña y los logos de Google y Microsoft
- C4 reducido: .btn*, .eyebrow y .eyebrow-dark definidos una sola vez en styles.css
- C5: el componente .papel-muestra (antes .hm-* de index) pasa a styles.css. credito tiene un hero con una hoja de reporte inventada en lavanda que resalta la "Date of first delinquency", y una nota de 7 años (FCRA §605) comprobada contra zyron-leyes.js. La banda de reportes oficiales y el analizador pasan a fondo claro.
- C7: "Escríbenos"; orden de encabezados en admin, credito y términos; "Leyendo hojas…"; en mortgage-calculator.js un aviso role=status en lugar de alert().
- Nueva prueba tests/sistema-visual.test.js (§A–§I). Resultado: 438 pruebas, 420 pasan, y fallan solo las 18 de siempre (casas y tasas).

## Lecciones
- **Causa raíz del "salto" y de las "letras más chicas en credito":** en el sitio publicado, la cinta mostraba Arial (el respaldo) durante unos 0.9s después de cada clic, antes de cambiar a Bricolage (display=swap). Pasa sobre todo en credito, la página más pesada. Se resolvió con display=optional y fuentes de respaldo con las mismas medidas. Medido con Edge por DevTools Protocol, sin tocar el sitio.
- La cinta mide lo mismo en todas las páginas (73px), con el mismo tamaño de letra, en 1920, 1366, 1280, 1024 y 375px.
- La transición entre páginas no funciona con file:// (doble clic en el archivo). Para verla hay que usar un servidor, por ejemplo http://127.0.0.1:8765.
- Edge headless con --window-size no reproduce anchos de teléfono. Para eso hay que usar CDP con Emulation.setDeviceMetricsOverride (scripts en el scratchpad: shots.mjs, cinta.mjs, vivo.mjs).
- El editor de colores de admin.html (líneas 587-591) escribe --gold, --gold-light, --navy, --navy-deep y --teal por medio de cms.js. Por eso esos nombres no se pueden renombrar.
- styles.css:905 ya desactivaba [data-reveal], así que T019 no necesitó cambios.
- T031 (Intl.NumberFormat) se descartó: mortgage-accelerator escribe en un <input type=number>, que necesita el formato "12.34".

## Pendientes
- El hero de credito ocupa unas 1.7 pantallas a 375px; la meta era 1.2 o menos, y se logra acortando el texto de introducción.
- El botón "Explicar esta carta" de cartas-claras tiene poco contraste: fondo --gold con texto oscuro.
- images/credito-hero-1..4.jpg ya no se usan; se pueden borrar con aprobación.
- C6 Auto Coach y la escala tipográfica (R6) quedan diferidos.
- Falta hacer commit y publicar (git push origin master:main), con aprobación.

## Outcome

- Signal: useful

## Source Nodes

- styles.css
- nav.js
- cms.js
- credito.html
- index.html
- C8