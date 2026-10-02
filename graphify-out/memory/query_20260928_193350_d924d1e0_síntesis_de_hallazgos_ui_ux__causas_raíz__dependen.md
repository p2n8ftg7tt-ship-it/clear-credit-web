---
type: "analysis"
date: "2026-09-28T19:33:50.631428+00:00"
question: "Síntesis de hallazgos UI/UX: causas raíz, dependencias, riesgos y prioridades"
contributor: "graphify"
outcome: "useful"
source_nodes: ["cms.js", "admin.html", "styles.css", "index.html", "Contract: Site-wide UI rules"]
---

# Q: Síntesis de hallazgos UI/UX: causas raíz, dependencias, riesgos y prioridades

## Answer

# Síntesis de hallazgos: causas raíz, dependencias, riesgos y prioridades (2026-09-28)

## Causas raíz
- R1: los estilos se apilan en vez de reemplazarse (.btn y .eyebrow duplicados; overrides por página con !important). De aquí salen los restos marrones, las píldoras, las MAYÚSCULAS y los radios dispersos.
- R2: cada página trae su propio <style>. Resultado: unos 800 tamaños de letra fijos, bordes con --line, focos débiles y el iframe Auto Coach aparte.
- R3: los nombres heredados esconden el color real: --gold es --franja-celeste (2.7:1) y --gold-light es --agua (1.64:1). Esto explica todos los fallos de contraste.
- R4: la idea "papel y resaltador" vive solo en index.html. De aquí salen la foto de stock de credito, los círculos decorativos y los bloques oscuros encadenados.
- Grupo 5, independiente: errores de accesibilidad locales en el marcado.

## Problemas repetidos
- Los anillos de foco aparecen en la auditoría y en la revisión visual; su causa es R3.
- El radio, el texto chico y las MAYÚSCULAS aparecen en la auditoría, en la revisión y en el contrato 011; su causa es R1.
- Los restos marrones se resuelven con una sola limpieza.
- El iframe Auto Coach es un solo componente.
- Los bordes de campo se resuelven con un solo cambio de token.

## Dependencias
R3 primero, luego R1 (unificar componentes), luego R2 (páginas sobre componentes compartidos) y al final R4 (hero nuevo). Los arreglos de marcado son independientes.

## Riesgos
- cms.js:26 escribe variables CSS desde Supabase, y el editor de colores de admin.html:587-591 escribe --gold, --gold-light, --navy, --navy-deep y --teal. Esos nombres son una interfaz viva y no se pueden renombrar (765 usos en 19 archivos).
- Ningún test cubre la apariencia: de 25 archivos de prueba, solo tests/cabecera-pie.test.js revisa la UI compartida.
- Hay 55 atributos data-umami-event (18 en comprar-auto) que no pueden cambiar.
- Los selectores body[data-cms-page=...] con !important le ganan a cualquier regla compartida.
- Netlify tiene que seguir detectando los formularios de respaldo al publicar.

## Piezas reutilizables
El contrato de reglas 011 (specs/011-ux-audit-remediation/contracts/ui-rules.md), los colores .copia-*, el hero de index.html como componente, tests/cabecera-pie.test.js como modelo de test, la regla global de reduced-motion y el flujo spec-kit.

## Prioridades (impacto / riesgo)
1. Marcado accesible (alto / bajo)
2. Tokens por rol (alto / bajo-medio)
3. Limpieza de restos marrones y botones (medio-alto / bajo)
4. Escala tipográfica y componentes únicos (alto / medio-alto)
5. Hero de papel en credito (el mayor impacto para la marca / medio)
6. iframe Auto Coach (medio / medio)
7. Arreglos menores

Plan detallado: specs/012-un-sistema-visual/plan.md (cambios C1-C7).

## Outcome

- Signal: useful

## Source Nodes

- cms.js
- admin.html
- styles.css
- index.html
- Contract: Site-wide UI rules