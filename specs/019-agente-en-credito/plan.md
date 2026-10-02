# Implementation Plan: El agente en la página del analizador (Fase 4)

**Branch**: `019-agente-en-credito` | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

## Summary

Dos bloques de trabajo sobre `credito.html`:

1. **Terminar la 014** (círculos, análisis local por problema, pasos de lectura y limpieza) siguiendo sus tareas T017–T041 tal como están escritas.
2. **Agregar el agente encima**, con un módulo de vista nuevo y puro (`agente-credito-vista.js`) que arma el HTML escapado de:
   - la lista de marcas,
   - los pasos en vivo,
   - el resultado del agente (IA o local),
   - el bloque «Lo que dice el agente» de cada círculo,
   - las tarjetas de cartas.

`credito.html` solo conecta los eventos, dentro de un bloque marcado `/* 019-agente:inicio */ … /* 019-agente:fin */`.

## Technical Context

- **Lenguaje**: JS ES2020 UMD en el navegador y Node 18+ para las pruebas.
- **Dependencias**: ninguna nueva.
- **Almacenamiento**: ninguno; el estado vive en memoria mientras la página está abierta.
- **Pruebas**: `node:test`; la vista se prueba como funciones puras; el cableado de `credito.html` se prueba con los mismos recortes y el DOM mínimo que usa `tests/credito-resumen-ui.test.js`.
- **Restricciones**:
  - todo texto pasa por `escapar`;
  - nada envía cartas;
  - la analítica solo registra eventos;
  - 375 px sin desplazamiento horizontal;
  - tokens de Mar en calma.

## Decisiones

- **D1. Vista pura en módulo aparte.** `credito.html` ya pesa más de 4,500 líneas. Separar la vista permite probarla sin navegador (Principio IV) y no agranda la página.
- **D2. Orden de carga (todo con `defer`, después de `analista-credito.js`):** `herramientas-credito.js` → `agente-credito-cliente.js` → `cartas-agente.js` → `agente-credito-vista.js`. `cartas-bilingues.js` ya se carga.
- **D3. Mapa id de cuenta → letra.** Se exporta `letrasDe(reporte)` en `agente-credito-cliente.js`, usando la misma función `letra()` del etiquetador, para no duplicar la regla. La página lo usa para unir círculos (por id de cuenta) con el plan (por letra).
- **D4. Pasos en vivo.** Los eventos del agente se agregan como `<li>` a la misma `#crPasos` de la 014, a continuación de los pasos de lectura. El texto sale de `ThemoraAgenteVista.textoEvento(codigo, privado)`.
- **D5. La 014 se cierra marcando sus tareas.** Al terminar T017–T041 se marcan `[X]`; T042–T046 se cubren con el cierre de la 019 y se marcan «cubierta por 019».
- **D6. Cartas manuales.** Los formularios manuales de hoy siguen existiendo (la 014 T029 los usa desde el análisis local). «Tus cartas» es aparte y solo aparece con propuestas del agente.

## Constitution Check

| Principio | Cumplimiento | ✓ |
|---|---|---|
| I. Honestidad | Aviso educativo fijo; los hechos van separados de la interpretación; sin veredictos (la prueba de palabras prohibidas también corre sobre la vista) | ✅ |
| II. Privacidad | Los valores reales solo en pantalla; el agente recibe etiquetas; la analítica solo eventos | ✅ |
| III. Sin IA | El resumen local va primero y siempre; el respaldo local se pinta en cada falla | ✅ |
| IV. Una verdad | Cálculos de la 016; mapa de letras exportado, no duplicado; los textos legales de las cartas son los de `cartas-bilingues.js` | ✅ |
| V. Multilingüe | Solo español en la vista; el inglés de las cartas sigue marcado para revisión nativa | ✅ |

## Archivos

| Archivo | Cambio |
|---|---|
| `analista-credito.js`, `styles.css`, `credito.html`, `tests/analista-credito.test.js`, `tests/credito-resumen-ui.test.js`, `tests/credito-lector-ui.test.js`, `tests/credito-fase0.test.js`, `tests/credito-identidad.test.js` | Tareas T017–T041 de la 014 |
| `agente-credito-cliente.js` | + `letrasDe` (D3) |
| `agente-credito-vista.js` | **Nuevo** (contrato en `contracts/vista-api.md`) |
| `credito.html` | + scripts (D2); + marcado de `#crAgente`, `#crMarcar`, `#crAgenteResultado`, `#crCartasAgente`; + bloque `019-agente` |
| `tests/agente-credito-vista.test.js`, `tests/credito-agente-ui.test.js` | **Nuevos** |

**No se tocan:** `lector-credito*.js`, `herramientas-credito.js`, `cartas-bilingues.js`, `cartas-agente.js`, `netlify/functions/**`.
