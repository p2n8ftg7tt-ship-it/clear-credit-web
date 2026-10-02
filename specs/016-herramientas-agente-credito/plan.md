# Implementation Plan: Herramientas de cálculo del agente de crédito (Fase 1)

**Branch**: `016-herramientas-agente-credito` | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/016-herramientas-agente-credito/spec.md`

## Summary

Crear el motor de cálculo que usará el agente de crédito: cuatro funciones puras y deterministas (Fecha de salida, Utilización, Posibles duplicados y Consultas duras en 12 meses). Trabajan sobre el `Reporte` normalizado que ya entrega el lector (spec 013) y devuelven solo hechos, códigos y el origen de cada dato, nunca interpretaciones.

Van en un módulo UMD nuevo, `herramientas-credito.js`. Es la capa que faltaba entre el lector (extracción y normalización) y el analista (interpretación). El mismo archivo se usa en el navegador (camino sin IA) y en la futura función del agente en Netlify. Un `CATALOGO` con `ejecutar(nombre, …)` deja lista la entrada para agregar más herramientas y para que el agente las llame por nombre.

Las pruebas usan el caso ACME/ZETA como reporte normalizado sintético, más una prueba de humo sobre los seis reportes esperados que ya existen. No se tocan `credito.html`, las cartas, el lector ni el analista.

## Technical Context

**Language/Version**: JavaScript (ES2020), sin paso de compilación; Node 18+ para las pruebas (local: v24.21.0)

**Primary Dependencies**: ninguna (ni librerías de fechas ni de números)

**Storage**: N/A: funciones puras, no guardan nada

**Testing**: `node:test` + `node:assert` (`node --test tests/`), como el resto del proyecto

**Target Platform**: navegador del consumidor (`<script>`, `window.ThemoraHerramientas`) y Node en funciones de Netlify (`require('../../herramientas-credito.js')`)

**Project Type**: biblioteca interna de un sitio estático (módulo UMD en la raíz)

**Performance Goals**: un reporte típico (≤ 60 cuentas, ≤ 150 consultas) se procesa con las cuatro herramientas en menos de 50 ms en un teléfono. Duplicados es O(n²) sobre cuentas, insignificante con n ≤ 100

**Constraints**: deterministas en cualquier zona horaria (sin `Date`); sin mutar la entrada; sin datos personales en la salida; sin texto para el consumidor; archivo < ~800 líneas (research R8)

**Scale/Scope**: 4 herramientas, 1 archivo de código, 1 archivo de pruebas, 1 fixture nuevo

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio / regla | Cómo se cumple | ✓ |
|---|---|---|
| **I. Honestidad y no asesoría** | Las herramientas no dicen «debes», «ilegal» ni «debe eliminarse»; la fecha de salida es `calculo_informativo`, con su regla y la ley citada en la spec (FCRA §605). Las estimaciones van marcadas (`estimada`, `rango`). Hay una prueba de palabras prohibidas (R10) | ✅ |
| **II. Privacidad por diseño** | No leen ni devuelven `identidad`, números de cuenta ni contactos. Corren en el navegador y no envían nada | ✅ |
| **III. Funciona sin IA** | Es código local puro; el analista puede usarlo sin IA. El agente es un extra posterior | ✅ |
| **IV. Una sola verdad, probada** | Cada número sale de una sola función que comparten navegador y servidor. Pruebas con `node --test` antes de publicar | ✅ |
| **V. Multilingüe con revisión humana** | No aplica: no producen texto para el consumidor | ✅ |
| Sitio estático, sin dependencias nuevas | Un `.js` en la raíz, sin dependencias | ✅ |
| Todo lo de la raíz se publica | `herramientas-credito.js` es código público, como `analista-credito.js`. `tests/` y `specs/` ya están bloqueados en `netlify.toml` (404) | ✅ |
| Finales de línea LF | Archivos nuevos en LF | ✅ |
| `graphify update .` tras el cambio | Incluido en quickstart | ✅ |

**Re-check post-design**: sin cambios. Ninguna decisión de `research.md` ni de `data-model.md` introduce violaciones. No hay nada que justificar en «Complexity Tracking».

## Project Structure

### Documentation (this feature)

```text
specs/016-herramientas-agente-credito/
├── spec.md
├── plan.md              # este archivo
├── research.md          # R1–R10: decisiones
├── data-model.md        # formas de salida y errores
├── quickstart.md        # cómo validar
├── contracts/
│   └── herramientas-api.md
├── checklists/
│   └── requirements.md
└── tasks.md             # lo crea /speckit-tasks
```

### Source Code (repository root)

```text
MyWeb/
├── lector-credito.js            # 013 · extracción + normalización          (no cambia)
├── lector-credito-perfiles.js   # 013 · perfiles por buró                   (no cambia)
├── herramientas-credito.js      # 016 · CÁLCULO: 4 herramientas + CATALOGO  (NUEVO)
├── analista-credito.js          # 014 · interpretación para el consumidor   (no cambia; la usará después)
├── credito.html                 # renderizado                               (no cambia)
├── cartas-bilingues.js          # cartas                                    (no cambia)
└── tests/
    ├── herramientas-credito.test.js          # NUEVO
    └── fixtures/credito/
        ├── esperado/*.json                   # existentes: prueba de humo
        └── agente/
            ├── LEEME.md                      # NUEVO: «reportes ya normalizados, no páginas»
            └── acme-zeta.json                # NUEVO: Reporte normalizado ACME/ZETA
```

**Structure Decision**: se mantiene la estructura plana del proyecto (módulos UMD en la raíz y pruebas en `tests/`). `herramientas-credito.js` es la mejor ubicación porque separa el cálculo de la interpretación, lo pueden cargar el navegador y Netlify, y sigue el precedente de `tds.js` (research R1).

### Organización interna de `herramientas-credito.js`

En este orden, cada bloque con su comentario de sección como en `lector-credito.js`:

1. **Utilidades de valores**: `tieneValor`, `isoDe`, `refDe(cuenta, campo)` → `Referencia`.
2. **Calendario** (research R2): `parsearIso`, `sumarDias`, `sumarMeses`, `ultimoDiaDelMes`, `compararIso`. Solo enteros.
3. **Validación de uso**: `exigirHoy`, `exigirArreglo`, `exigirCuenta` (lanzan `TypeError`).
4. **Clasificación de hechos**: `esCobranzaOChargeOff` (R4), `mesesConAtraso` (R5), `normalizarNombre` (R7), `buscarMarcaVendida` (R7).
5. **Las cuatro herramientas**.
6. **`CATALOGO` + `ejecutar`** (R8).
7. **Exportación UMD**.

Las utilidades no se exportan. El proyecto no usa el patrón de exportar funciones internas para las pruebas. Por eso el calendario se prueba a través de `calcularFechaSalida` y `contarConsultasDuras`, con casos elegidos para cada regla de fechas (fase 3).

## Fases de implementación (para `/speckit-tasks`)

1. **Fixture**: `acme-zeta.json` (4 cuentas, 5 consultas, orígenes escritos a mano) y `LEEME.md`.
2. **Esqueleto**: módulo UMD, validaciones de uso, `CATALOGO` vacío; pruebas de `TypeError`.
3. **Calendario**: pruebas primero, usando cuentas de un solo caso pasadas a `calcularFechaSalida`: DOFD `2021-03` → rango `2028-08`–`2028-09` (cubre 2021-03-01 + 180 d = 2021-08-28 y 2021-03-31 + 180 d = 2021-09-27); DOFD `2019-03-15` → `2026-09-11`; DOFD `2023-09-02` → + 180 d = 2024-02-29 → + 7 años = `2031-02-28` (recorte al fin de mes). El recorte de la ventana de consultas con hoy = 29 de febrero se prueba en `contarConsultasDuras`.
4. **US1 Fecha de salida** (P1): pruebas de ACME/ZETA y de los casos límite, después el código.
5. **US2 Utilización** (P2).
6. **US3 Posibles duplicados** (P2).
7. **US4 Consultas duras** (P3).
8. **Transversales**: determinismo ×100 y TZ, no mutación, palabras prohibidas, origen y humo sobre `esperado/*.json`.
9. **Cierre**: `node --test tests/` completo, `graphify update .` y verificar que no hay cambios fuera del alcance.

Cada herramienta se hace con TDD: primero la prueba que falla, después el código mínimo.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Un perfil de buró deja los atrasos solo en `historial24` y no se calculan sus fechas | Anotado en R5; se corrige en el lector si aparece en el banco de reportes (015) |
| La marca de venta cita texto del reporte que contiene «fraud» | R10: la prueba de palabras prohibidas excluye los textos citados; se revisa con reportes reales |
| El reporte normalizado cambia de forma en el lector | La prueba de humo sobre `esperado/*.json` lo detecta |
| Un caso de nombre parecido («CAPITAL ONE» y «CAPITAL ONE BANK») no se empareja | Decisión deliberada (R7): mejor no encontrar un par que inventarlo; se revisa con el banco 015 |

## Complexity Tracking

Sin violaciones de la constitución; nada que justificar.
