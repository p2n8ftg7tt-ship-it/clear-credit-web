---
type: "audit"
date: "2026-09-28T21:01:58.669716+00:00"
question: "Por qué parpadea la página al navegar y por qué el encabezado no se ve igual en credito"
contributor: "graphify"
outcome: "useful"
source_nodes: ["auth.js", "cms.js", "nav.js", "styles.css", "credito.html"]
---

# Q: Por qué parpadea la página al navegar y por qué el encabezado no se ve igual en credito

## Answer

Cada clic recarga la página y después del primer pintado cambian varias cosas: las fuentes pasan de Arial/Georgia a Bricolage/Literata (display=swap, sin preload); auth.js (L93-139) cambia Iniciar sesión por el avatar; cms.js (se carga al final, después del CDN de Supabase) reescribe textos, colores e imágenes (cms.js:26,34,36); las secciones [data-reveal] empiezan con opacity 0 (styles.css:860). El encabezado es translúcido, rgba .88 con blur (styles.css:95), y sobre la foto oscura de credito se ve gris. nav.js no marca el grupo activo (.nav-group-btn.is-active existe en styles.css:111 pero nunca se aplica), así que en las páginas de submenú no se resalta nada. A 1440px el alto es el mismo (unos 73px en credito e index); el tamaño en teléfono falta verificarlo en el dispositivo. Solución: cambio C8 en specs/012-un-sistema-visual/plan.md.

## Outcome

- Signal: useful

## Source Nodes

- auth.js
- cms.js
- nav.js
- styles.css
- credito.html