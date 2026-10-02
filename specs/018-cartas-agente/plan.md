# Implementation Plan: Cartas del agente de crédito (Fase 3)

**Branch**: `018-cartas-agente` | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

## Summary

El resultado del agente (spec 017) suma `cartas`: propuestas sin datos personales y con valores de listas cerradas. El servidor las valida con reglas deterministas; si después de la corrección única alguna sigue sin ser válida, entrega el análisis **sin esa carta**. En el dispositivo, un módulo nuevo (`cartas-agente.js`) convierte cada propuesta en un **borrador** con las plantillas existentes de `cartas-bilingues.js`, completa los datos que escribe el consumidor y controla la **aprobación**. Nada envía cartas.

## Technical Context

**Language/Version**: JavaScript ES2020, UMD para el navegador, Node 18+ para las pruebas · **Dependencies**: ninguna nueva · **Storage**: ninguno · **Testing**: `node:test`, IA simulada con la ayuda de la spec 017 · **Constraints**: sin IA en las cartas; ningún dato del consumidor en lo que va al servidor; los textos existentes de las cartas no cambian

## Decisiones (research)

- **D1. Propuestas en el resultado, no como herramienta nueva.** Una herramienta extra gastaría vueltas (el máximo es 6) y obligaría a mandar datos de la carta y del ciclo. La IA solo elige valores de listas cerradas; la validación y la corrección de la spec 017 ya cubren el ida y vuelta.
- **D2. Forma en el esquema:** `cartas: [{ tipo, cuentas: [{ letra, motivo }], subtipo, etiquetas: [string] }]`. `motivo` incluye `no_aplica` (validación de deuda) y `subtipo` incluye `no_aplica` (disputa y validación), porque el esquema estricto exige todos los campos.
- **D3. Rechazo parcial (FR-004):** `validarResultado` devuelve los problemas de cartas con el prefijo `carta[i]:`. En la función, si **todos** los problemas que quedan son de cartas y ya no hay corrección posible (`k` = 1 o `n` = 6), se entrega `terminado` con solo las cartas válidas. Si hay otros problemas, sigue el flujo de la spec 017 sin cambios.
- **D4. Datos privados que nunca salen:** `etiquetarReporte(reporte, { marcadas })` devuelve además `privado`: por letra, `{ acreedor, ultimos4, apertura }`; por etiqueta de identidad, `{ tipo: 'Nombre'|'Dirección'|'Teléfono', valor }`. `privado` no se envía nunca; una prueba lo comprueba. `ultimos4` = el último grupo de 4 dígitos del número enmascarado (`'XXX0123XXXX'` → `'0123'`), o `null`.
- **D5. Marcadas:** `marcadas` llega con los **ids originales** de las cuentas (los que conoce la página) y con etiquetas («Nombre 3»). El etiquetador las convierte en letras. Las desconocidas se descartan.
- **D6. Bloque de varias cuentas:** `armar('bureau-dispute', datos)` acepta `datos.cuentas: [{ acreedor, ultimos4, motivo }]`. Si viene, agrega el bloque `cuentas-disputadas` justo después de `motivo`. Si no viene, la carta queda **idéntica** a hoy. Con 1 cuenta, `datos.motivo` es el de esa cuenta; con varias, `other`.
- **D7. Tabla de burós:** `ThemoraCartas.BUROS` (equifax, experian, transunion) se copia de `credito.html` **sin cambiarla**. Una prueba lee `credito.html` y compara las tres direcciones (Principio IV).
- **D8. Estados del borrador:** `incompleto` → (datos completos) `borrador` → (confirmaciones) `aprobada`. Cualquier cambio de datos o confirmaciones recalcula el estado. Las funciones son puras y devuelven un borrador nuevo; no mutan el anterior.

## Constitution Check

| Principio | Cumplimiento | ✓ |
|---|---|---|
| I. Honestidad | La IA no redacta texto legal; la guía de envío no promete resultados; «no es mía» solo con la marca del consumidor | ✅ |
| II. Privacidad | Los datos del consumidor y `privado` nunca se envían (prueba); no se guarda nada | ✅ |
| III. Sin IA | Las plantillas funcionan sin IA; con el análisis local no hay propuestas, pero las cartas manuales de hoy siguen existiendo en la página | ✅ |
| IV. Una verdad | Una sola tabla de burós, con una prueba contra `credito.html`; los motivos salen del `MOTIVOS` existente | ✅ |
| V. Multilingüe | El bloque nuevo en inglés queda marcado como pendiente de revisión nativa | ✅ |

## Archivos

| Archivo | Cambio |
|---|---|
| `netlify/functions/lib/agente-credito-manual.js` | + `cartas` en `ESQUEMA_RESULTADO`; + sección «CARTAS» del manual |
| `netlify/functions/lib/agente-credito-validar.js` | + `validarCartas`; `validarResultado` exige y valida `cartas` |
| `netlify/functions/agente-credito.js` | Rechazo parcial (D3) |
| `agente-credito-cliente.js` | `etiquetarReporte(reporte, { marcadas })` → `marcadas` y `privado`; `analizarConAgente` pasa `opciones.marcadas` |
| `cartas-bilingues.js` | + `BUROS`; + bloque `cuentas-disputadas` (D6). Nada más |
| `cartas-agente.js` | **Nuevo**, UMD `ThemoraCartasAgente` |
| `tests/cartas-agente.test.js` | **Nuevo** |
| `tests/agente-credito-*.test.js`, `tests/agente-credito-ayuda.js`, `tests/cartas-bilingues.test.js` | Ajustes y pruebas nuevas |

**No se tocan:** `credito.html`, `lector-credito*.js`, `analista-credito.js`, `herramientas-credito.js`, `coach.js`.
