# Implementation Plan: Resumen del consumidor en el analizador de crédito

**Branch**: `014-resumen-consumidor` (se trabaja en `master` local, como las especificaciones anteriores) | **Date**: 2026-10-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/014-resumen-consumidor/spec.md`

## Summary

La pantalla de resultado de `credito.html` pasa de volcar el reporte (indicadores vacíos, tabla, todas las cuentas con todos sus campos, listas genéricas y un plan repetido) a un **resumen para el consumidor** en el orden en que se lee un reporte: pasos del agente en vivo → datos generales (cuadro grande) → cuentas abiertas (cuadro pequeño) → cuentas con problemas como círculos con iniciales y color de gravedad → análisis por cuenta con la ley aplicable y la carta.

Enfoque técnico: un módulo puro nuevo, `analista-credito.js`, convierte el `Reporte` del lector en un `Analisis` (una sola fuente de verdad). Las reglas y las citas legales viven como datos dentro del módulo y se prueban contra `zyron-leyes.js`. El lector gana tres lecturas (últimos 4 del SSN, nombres sin identificadores, marca «Potentially negative» / «written off»). La página solo pinta el `Analisis`; el análisis viejo por palabras sueltas deja de mostrarse.

Base legal verificada con los skills `claude-legal-federal-laws:consumer-report-accuracy` y `consumer-credit-disputes` (texto oficial de FCRA y FDCPA); estética con `frontend-design:frontend-design` dentro del sistema «Mar en calma» ya aprobado (ver [research.md](research.md) R3, R4 y R10).

## Technical Context

**Language/Version**: JavaScript ES2020 en el navegador (sin compilación); Node 18+ para pruebas

**Primary Dependencies**: ninguna nueva. Ya cargadas: pdf.js 3.11, mammoth 1.12, SheetJS 0.18 (CDN); módulos propios `lector-credito.js`, `lector-credito-perfiles.js`, `cartas-bilingues.js`, `auth.js`

**Storage**: ninguno nuevo. Guardar en la cuenta reutiliza `CCAuth.saveAnalysis()` (Supabase, tabla `analisis_credito`) con la misma forma

**Testing**: `node --test tests/` (pruebas de módulo con fixtures sintéticos y pruebas de estructura del HTML, como `credito-lector-ui.test.js`)

**Target Platform**: navegadores modernos (escritorio y teléfono); Netlify estático

**Project Type**: sitio web estático, sin framework

**Performance Goals**: el análisis de un reporte de 23 páginas añade menos de 100 ms sobre la lectura actual; la pantalla de resultado aparece en cuanto termina la lectura (se quita la espera artificial de 400 ms)

**Constraints**: el archivo no sale del navegador; ningún dato personal en analítica ni en lo guardado más allá de lo que ya se guarda; sin dependencias nuevas; finales de línea LF; `escapeHtml` para todo texto del reporte

**Scale/Scope**: una sección de una página (`#analizar-reporte`), un módulo nuevo (~400 líneas), cambios acotados en el lector, 1 archivo de pruebas nuevo de módulo + 1 de vista

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. Honestidad y no asesoría | Análisis en cuatro partes que describen derechos y opciones; prueba que prohíbe «debes», «no pagues», «es ilegal», «garantiz»; aviso educativo al pie; leyes no cargadas se dicen con franqueza (FR-017/018) | ✅ |
| II. Privacidad por diseño | Todo en el navegador; `ssnUltimos4` solo se pinta, no se guarda ni se pasa a IA; `paraGuardar()` sin nombres ni direcciones (probado); analítica sin cambios (eventos sin datos) | ✅ con enmienda menor (ver Complexity Tracking) |
| III. Funciona sin IA | Todo el análisis es local y determinista; la IA queda para otra especificación | ✅ |
| IV. Una sola verdad, probada | Un solo `Analisis` alimenta todos los números; las citas se comprueban contra `zyron-leyes.js`; pruebas antes de publicar | ✅ |
| V. Multilingüe con revisión humana | Esta entrega es solo en español por decisión del dueño (el analizador ya era solo español); no se publica contenido traducido sin revisar | ✅ |
| Sitio estático / sin dependencias | Módulo JS de la raíz, sin librerías nuevas; `popover` nativo | ✅ |
| Todo lo de la raíz se publica | `analista-credito.js` es público a propósito (lo carga la página); no contiene datos personales ni textos completos de leyes | ✅ |
| Grafo y pruebas | `graphify update .` y `node --test tests/` al cerrar cada fase | ✅ |

**Re-check tras el diseño (Fase 1)**: sin cambios; el diseño no añadió servicios, dependencias ni almacenamiento.

## Project Structure

### Documentation (this feature)

```text
specs/014-resumen-consumidor/
├── spec.md
├── plan.md              # este archivo
├── research.md          # decisiones R1–R10 (reglas, leyes, estética)
├── data-model.md        # Analisis, CuentaConProblema, HallazgoLegal…
├── quickstart.md        # cómo validar
├── contracts/
│   ├── analista-api.md  # ThemoraAnalista + cambios en ThemoraLector
│   └── ui-resumen.md    # vista y elementos de #analizar-reporte
├── checklists/requirements.md
└── tasks.md             # lo crea /speckit-tasks
```

### Source Code (repository root)

```text
analista-credito.js            # NUEVO: reglas, citas, Analisis, iniciales, paraGuardar
lector-credito.js              # ssnUltimos4, nombres sin «Name ID», marcaNegativaBuro, «written off»
lector-credito-perfiles.js     # etiquetas de Experian para «POTENTIALLY NEGATIVE» y SSN parcial
credito.html                   # #analizar-reporte: pasos, datos generales, abiertas, círculos, análisis;
                               #   render() nuevo; se retiran KPIs, tabla, fichas, listas y plan repetido
styles.css                     # solo el token --atencion (naranja) si hace falta compartirlo; el resto en <style> de credito.html
tests/
├── analista-credito.test.js   # NUEVO
├── credito-resumen-ui.test.js # NUEVO (sustituye las partes de credito-lector-ui.test.js que vigilaban las fichas)
├── lector-credito.test.js     # casos nuevos
└── fixtures/credito/          # experian.json ampliado con «POTENTIALLY NEGATIVE», «written off», SSN parcial (inventados)
```

**Structure Decision**: mismo patrón que la especificación 013 — lógica en módulos puros de la raíz probados en Node, la página solo pinta. No se crea carpeta `src/`: el sitio se sirve tal cual.

## Orden de entrega (por historia)

1. **US1 (P1)** — lector (SSN, nombres) + `analizar()` con `resumen`, `abiertas`, `consultas` + cuadros y carteles. Ya conviven con lo viejo debajo.
2. **US2 (P1)** — reglas de gravedad + círculos.
3. **US3 (P2)** — hallazgos legales + panel de análisis + carta precargada.
4. **US4 (P2)** — pasos del agente.
5. **US5 (P3)** — retirar lo viejo, «consumidor», imprimir y guardar con `paraGuardar()`.

Cada historia cierra con `node --test tests/`, revisión en el navegador según [quickstart.md](quickstart.md) y `graphify update .`.

## Complexity Tracking

| Desviación | Por qué hace falta | Alternativa más simple descartada porque |
|---|---|---|
| Enmienda a FR-017 de la 013: se conservan los **últimos 4** dígitos del SSN (antes, ninguno) | El dueño pidió mostrar `xxx-xx-1234` en datos generales | No conservar nada impide cumplir el pedido; se limita a 4 dígitos, solo en memoria de la página, fuera de lo guardado y de la IA |
| Token de color nuevo `--atencion` (naranja) | El dueño fijó tres gravedades; la paleta no tiene naranja con contraste ≥4.5:1 | Reusar `--franja-rosa` no alcanza contraste para iniciales blancas |
