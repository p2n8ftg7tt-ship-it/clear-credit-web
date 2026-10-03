## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Antes de empezar

- Lee `.specify/memory/constitution.md`, sobre todo «Lecciones aprendidas»: reglas nacidas de problemas reales (tiempo de Netlify, costo de IA, créditos, secretos, Codex, Windows).
- Si hay trabajo en pausa, su nota «punto de retomar» está en `specs/<nnn>/` (por ejemplo, `specs/017-agente-credito-ia/notas-prueba-real.md`).
