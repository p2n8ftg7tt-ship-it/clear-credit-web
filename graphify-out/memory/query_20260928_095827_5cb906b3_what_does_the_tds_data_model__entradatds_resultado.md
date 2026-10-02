---
type: "query"
date: "2026-09-28T09:58:27.963908+00:00"
question: "What does the TDS data model (EntradaTDS/ResultadoTDS) feed into?"
contributor: "graphify"
outcome: "corrected"
correction: "Wrong: name collision. The TDS calcular() lives in tds.js:137, but the graph has no calcular node for tds.js (function missing from AST extraction), so the inferred edge attached to mortgage-accelerator.js calcular() instead. Similarly the specs 003/008 -> texto() in cartas-bilingues.js links are name-matched, not real."
source_nodes: ["EntradaTDS (input to `calcular`)", "ResultadoTDS (output of `calcular`)", "calcular()"]
---

# Q: What does the TDS data model (EntradaTDS/ResultadoTDS) feed into?

## Answer

GRAPH_REPORT Surprising Connections links EntradaTDS/ResultadoTDS (specs/007) --references--> calcular() in mortgage-accelerator.js [INFERRED].

## Outcome

- Signal: corrected
- Correction: Wrong: name collision. The TDS calcular() lives in tds.js:137, but the graph has no calcular node for tds.js (function missing from AST extraction), so the inferred edge attached to mortgage-accelerator.js calcular() instead. Similarly the specs 003/008 -> texto() in cartas-bilingues.js links are name-matched, not real.

## Source Nodes

- EntradaTDS (input to `calcular`)
- ResultadoTDS (output of `calcular`)
- calcular()