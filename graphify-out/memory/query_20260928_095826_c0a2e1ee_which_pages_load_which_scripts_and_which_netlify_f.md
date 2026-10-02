---
type: "query"
date: "2026-09-28T09:58:26.376024+00:00"
question: "Which pages load which scripts and which netlify functions and external services do they call?"
contributor: "graphify"
outcome: "corrected"
correction: "HTML <script src=...> includes are not extracted as edges. Real map (from grep): every page loads auth.js, cms.js, nav.js, empresa.js, analytics.js; credito.html loads cartas-bilingues.js + direccion-autocompletar.js; aparezco.html loads tds.js + ciudad-sugerida.js; herramientas.html loads mortgage-calculator.js, quick-calculators.js, mortgage-accelerator.js; comprar-auto.html loads auto-rates.js, rate-agent.js, us-state-shapes.js. Answer page->script questions with grep, not the graph."
source_nodes: ["credito.html", "cartas-bilingues.js", "aparezco.html", "tds.js"]
---

# Q: Which pages load which scripts and which netlify functions and external services do they call?

## Answer

Graph query returned 8 mostly-spec nodes and no page->script load edges (0 edges between credito.html and cartas-bilingues.js; only 18 html<->js edges in the whole graph despite ~180 <script src> tags across 18 pages).

## Outcome

- Signal: corrected
- Correction: HTML <script src=...> includes are not extracted as edges. Real map (from grep): every page loads auth.js, cms.js, nav.js, empresa.js, analytics.js; credito.html loads cartas-bilingues.js + direccion-autocompletar.js; aparezco.html loads tds.js + ciudad-sugerida.js; herramientas.html loads mortgage-calculator.js, quick-calculators.js, mortgage-accelerator.js; comprar-auto.html loads auto-rates.js, rate-agent.js, us-state-shapes.js. Answer page->script questions with grep, not the graph.

## Source Nodes

- credito.html
- cartas-bilingues.js
- aparezco.html
- tds.js