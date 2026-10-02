---
type: "tooling"
date: "2026-09-28T19:33:52.165126+00:00"
question: "Qué problemas tiene graphify en este proyecto"
contributor: "graphify"
outcome: "corrected"
correction: "Usar grep para preguntas de qué página carga qué script y para auditorías de CSS/HTML; no confiar en las conexiones sorpresa que solo coinciden por nombre de función."
source_nodes: ["tds.js", "mortgage-accelerator.js", "credito.html", "cartas-bilingues.js"]
---

# Q: Qué problemas tiene graphify en este proyecto

## Answer

# Problemas de graphify encontrados en esta sesión (2026-09-28)

1. No extrae qué scripts carga cada página: los <script src> del HTML no generan aristas. Hay solo 18 aristas página↔JS para unas 180 etiquetas script, y entre credito.html y cartas-bilingues.js no hay ninguna. Para esas preguntas hay que usar grep.
2. Una conexión sorpresa es falsa por nombres iguales. El reporte liga EntradaTDS/ResultadoTDS (specs/007) con calcular() de mortgage-accelerator.js, pero el calcular() de TDS está en tds.js:137 y el grafo no tiene un nodo calcular para tds.js (el AST no lo registró). Lo mismo pasa con los vínculos de specs 003/008 hacia texto() de cartas-bilingues.js.
3. No sirve para auditorías de UI: el grafo no tiene reglas CSS, campos de formulario ni el contenido de iframes srcdoc, así que la auditoría tuvo que leer el HTML y el CSS directamente.
4. Versiones distintas: el skill instalado es 0.9.64 y el paquete 0.9.65. Se corrige con `graphify install --platform claude`.
5. Etiqueta de frescura engañosa: GRAPH_REPORT.md decía "Built from commit 7266b1a3", pero ya incluía las specs 010 y 011, que llegaron en commits posteriores.
6. Una consulta con presupuesto de 1200 tokens devolvió casi solo nodos de specs (29 de 102) y ningún hecho de código para una pregunta de dependencias. Hace falta un presupuesto mayor o un filtro de contexto.
7. `graphify update .` es solo AST: los hallazgos en Markdown y los documentos de specs necesitan el flujo --update con extracción semántica para entrar al grafo.

## Outcome

- Signal: corrected
- Correction: Usar grep para preguntas de qué página carga qué script y para auditorías de CSS/HTML; no confiar en las conexiones sorpresa que solo coinciden por nombre de función.

## Source Nodes

- tds.js
- mortgage-accelerator.js
- credito.html
- cartas-bilingues.js