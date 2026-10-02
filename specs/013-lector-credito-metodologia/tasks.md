---

description: "Tareas del lector de reportes de crédito — Fase 0 (hecha) y Fase 1 (lectura cuenta por cuenta + rediseño visual)"
---

# Tasks: Lector de reportes de crédito con metodología universal

**Input**: documentos de diseño en `specs/013-lector-credito-metodologia/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/lector-credito-api.md, contracts/ui-cuentas.md, quickstart.md

**Tests**: se incluyen porque los piden la spec (FR-006, SC-002 a SC-004), el quickstart y la constitución: toda lógica con reglas se prueba con `node --test tests/`.

**Alcance**:
- **US0 (Fase 0)**: ya implementada; sus tareas quedan marcadas como hechas.
- **US1 (Fase 1)**: se detalla completa.
- **US2 a US5 (Fases 2 a 5)**: recibirán sus tareas cuando se corra `/speckit-plan` para cada una. El modelo de datos ya las prevé.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (otro archivo, sin depender de una tarea pendiente)
- **[Story]**: historia de la spec (US0, US1)
- Rutas relativas a la raíz del repositorio (estructura plana, ver plan.md)

---

## Phase 1: Setup (infraestructura compartida)

**Purpose**: archivos vacíos con el patrón navegador+Node y la carga en la página.

- [X] T001 Crear `tests/fixtures/credito/` y `tests/fixtures/credito/esperado/` con un `tests/fixtures/credito/LEEME.md` que diga: «Todos los reportes de esta carpeta son sintéticos: personas, direcciones, acreedores y números inventados. Nunca copiar aquí un reporte real.»
- [X] T002 [P] Crear `lector-credito-perfiles.js` con el patrón de `tds.js` (IIFE; `window.ThemoraLectorPerfiles` en el navegador y `module.exports` en Node). Exportar `{ equifax:{}, experian:{}, transunion:{}, generico:{}, version:'2026-09-30' }` con la forma `Perfil` de `contracts/lector-credito-api.md`, todavía sin etiquetas
- [X] T003 [P] Crear `lector-credito.js` con el mismo patrón (`window.ThemoraLector` / `module.exports`). En Node, `require('./lector-credito-perfiles.js')` si no existe el global. Exportar como stubs: `leerReporte`, `detectarBuro`, `normalizarFecha`, `normalizarMonto`, `enmascararCuenta`, `codigoPago` y `resumen`. `leerReporte` debe lanzar `TypeError` si `paginas` no es un arreglo
- [X] T004 En `credito.html`, cargar `<script defer src="lector-credito-perfiles.js"></script>` y luego `<script defer src="lector-credito.js"></script>`, ambos antes del script del analizador y junto a `cartas-bilingues.js`. Si el módulo no cargó, el analizador sigue funcionando con la lectura de la Fase 0 (Principio III)

---

## Phase 2: Foundational (bloquea a US1)

**Purpose**: utilidades, vocabulario, preparación de páginas y detección del buró. Las usan todos los perfiles.

**⚠️ CRITICAL**: sin esto no empieza la lectura de cuentas.

- [X] T005 [P] Escribir pruebas de utilidades en `tests/lector-credito.test.js`. Deben fallar hasta T006. Casos:
  - `normalizarFecha`:
    - `'08/18/2025'` → `iso '2025-08-18'`
    - `'05/2024'` → `'2024-05'`
    - `'03/26'` → `'2026-03'`
    - `'May 2023'` → `'2023-05'`
    - `'Nov 7, 2022'` → `'2022-11-07'`
    - `'7 de noviembre de 2022'` → `'2022-11-07'`
    - `''` → `null`
    - regla: nunca inventa el día (R7)
  - `normalizarMonto`:
    - `'$1,500'` → `1500`
    - `'$0'` → `0`
    - `''`, `'-'` y `'—'` → `null` (R8)
  - `enmascararCuenta`: solo los últimos 4 dígitos visibles, y cualquier secuencia de 9 o más dígitos se enmascara (R9)
  - `codigoPago`: `'OK'`, `'30'`, `'CO'`, `'C'`, `'R'`, `'VS'`, `'V'`, `'F'`, `'FS'`, `'B'`, `'BK'`, `'TN'`, `'ND'`, `'-'`, `'PBC'`, `'G'`, `'IC'`, `'D'` y `'CLS'` se convierten a su código común; un código desconocido da `'desconocido'` (R11)
- [X] T006 Implementar en `lector-credito.js`:
  - `normalizarFecha`, que devuelve `{texto, iso}` con iso parcial permitido: `'2025'`, `'2025-05'` o `'2025-05-19'`
  - `normalizarMonto`
  - `enmascararCuenta`
  - la constante `CODIGOS_COMUNES` con el vocabulario de R11: `al_dia`, `atraso_30`, `atraso_60`, `atraso_90`, `atraso_120`, `atraso_150`, `atraso_180`, `cobranza`, `charge_off`, `reposesion`, `entrega_voluntaria`, `ejecucion_hipotecaria`, `ejecucion_iniciada`, `bancarrota`, `cerrada`, `muy_nueva`, `sin_datos`, `pagada_por_acreedor`, `reclamo_gobierno`, `reclamo_seguro`, `incumplimiento`, `desconocido`
  - `codigoPago`
- [X] T007 [P] Escribir `tests/lector-credito-perfiles.test.js` con las 5 invariantes de `contracts/lector-credito-api.md`:
  1. `fuente` y `verificadoEl` válidos (AAAA-MM-DD) en los 4 perfiles
  2. todo `campo` de `etiquetas` existe en `data-model.md` (lista de campos de `Cuenta`, `Consulta`, `Identidad`, `Reporte` y `RegistroPublico` copiada en la prueba)
  3. todo valor de `codigosPago` pertenece a `CODIGOS_COMUNES`
  4. el perfil genérico no tiene `detectar.fuertes` y sí tiene alias en español
  5. ningún perfil contiene secuencias de 4 o más dígitos fuera de códigos narrativos, ni palabras de una lista de nombres de prueba
- [X] T008 Implementar los ayudantes internos de `lector-credito.js`:
  - `valor(v, texto, origen)` y `noReportado(origen)`, con la forma `Valor<T>` de `data-model.md`: `{valor, texto, origen}` o `{estado:'no_reportado', origen}`. Si la etiqueta no aparece, el campo no existe
  - `origen(pagina, seccion, etiqueta, linea)`
- [X] T009 Implementar `prepararPaginas(paginas, perfil)` en `lector-credito.js` (R4 paso 1 y R13):
  - quitar las líneas que coinciden con `perfil.ruido`
  - cortar todo lo que sigue a `perfil.finDeDatos`
  - asignar a cada línea la sección canónica activa según `perfil.secciones`: `personal`, `avisos`, `resumen`, `cuentas`, `adversas`, `satisfactorias`, `cobranzas`, `consultas`, `registros_publicos` o `desconocida`
- [X] T010 Mover `detectCreditBureau` de `credito.html` a `detectarBuro(paginas)` en `lector-credito.js` (R3):
  - misma puntuación: menciones tempranas más 100 puntos por cada frase fuerte del perfil
  - añadir la señal de Equifax `/EFX-ACR/` y `/equifax\.com\/personal\/disputes/`
  - un empate o cero → `{buro:'desconocido', formatoVerificado:false}`
  - añadir sus casos a `tests/lector-credito.test.js`

**Checkpoint**: utilidades y detección probadas; se puede empezar la US1.

---

## Phase 3: User Story 0 — Resultados honestos en el lector actual (Priority: P1) — Fase 0 ✅

**Goal**: el lector actual deja de exagerar, dar órdenes o prometer.

**Independent Test**: `node --test tests/credito-fase0.test.js` (6 pruebas).

- [X] T011 [US0] Pasar las variaciones de identidad a prioridad «Para verificar», con la explicación de que suelen ser normales, en `evaluateDocument` de `credito.html` (FR-001)
- [X] T012 [US0] Reescribir la acción de cobranza sin órdenes, citando FDCPA §1692g y el plazo de 30 días, en `credito.html` (FR-002, FR-003)
- [X] T013 [US0] Quitar las consultas duras de los negativos y añadir el paso «Revisar tus consultas duras» al plan, en `credito.html` (FR-004)
- [X] T014 [US0] Eliminar `analyzer.js` (FR-005)
- [X] T015 [US0] Escribir `tests/credito-fase0.test.js`, que ejecuta `evaluateDocument` con un reporte sintético (FR-006)

**Checkpoint**: US0 entregada.

---

## Phase 4: User Story 1 — Ver mi reporte cuenta por cuenta (Priority: P1) — Fase 1 🎯 MVP

**Goal**: el reporte de Equifax, Experian, TransUnion o de formato desconocido se muestra como fichas de cuenta con todos sus campos, fechas, historial mes a mes y origen de cada dato, con el diseño de `contracts/ui-cuentas.md`.

**Independent Test**: los fixtures sintéticos de los 4 formatos producen exactamente el registro esperado (`quickstart.md` §1), y la página dibuja una ficha por cuenta (`quickstart.md` §2).

### Tests y fixtures de US1 (escribir primero; deben fallar)

- [X] T016 [P] [US1] Crear `tests/fixtures/credito/equifax.json` (arreglo de `Pagina` con `lineas` y `piezas` con `x`) imitando el formato de Equifax observado en mayo de 2026. Debe incluir:
  - el encabezado repetido «Prepared for / Date / Confirmation #» y el pie «Page N of M»
  - Summary y Personal Information con «Former Name(s)», «Employment Information: None», «Consumer File Notices: None», «Consumer Statement: No Statement on file», un SSN `XXX-XX-9999` y una «Date of Birth» inventados
  - 6 cuentas, una por cada caso:
    1. tarjeta abierta con el código narrativo 233
    2. tarjeta abierta con un «30» en la cuadrícula de 2026 y la tabla de 24 meses
    3. segunda tarjeta del mismo acreedor con la misma fecha de apertura, con 30/60/90/120 en 2024
    4. cuenta «Deposit Related» con « - Closed», «Status: Charge Off», DOFD, «Charge Off Amount», «Activity Designator: Paid» y los códigos 244, 156 y 093
    5. y 6. dos préstamos de auto « - Closed» con «Paid and Closed»
  - etiquetas impresas vacías en todas las cuentas
  - consultas en una sola tabla con varias fechas por fila, y una empresa que aparece como Hard y como Soft en las mismas fechas
  - «A Summary of Your Rights…» al final
  - todo con nombres inventados («ANA EJEMPLO RUIZ», «BANCO EJEMPLO», «TARJETA DEMO»)
- [X] T017 [P] [US1] Crear `tests/fixtures/credito/experian.json` según `EXPERIAN_CR.md`. Debe incluir:
  - Personal Information con AKA, «Year of Birth», «Spouse or Co-Applicant» y «Personal Statements: FILE LOCKED AT CONSUMER'S REQUEST»
  - una tarjeta con «Credit Limit / Original Balance»
  - un préstamo a plazos con «Credit Limit / Original Balance», «Terms: 60 Months», «Late Payments: April 2023 Jan 2023» y «Responsibility: Individual»
  - una cobranza con «Collection Opened», «Original Creditor» y «Original Loan Amount»
  - una cuadrícula de códigos OK, 30, CO y ND
  - Hard Inquiries con «Removal Date» y Soft Inquiries
- [X] T018 [P] [US1] Crear `tests/fixtures/credito/transunion.json` según `TRANSUNION_CR.md`, en su **versión por correo**. Debe incluir:
  - «Accounts with Adverse Information» con una cobranza dentro
  - «Satisfactory Accounts» con «Date Updated»
  - «Regular Inquiries», «Promotional Inquiries» y «Account Review Inquiries»
  - «Consumer Statement»
  - una página **sin posiciones `x`**, cuyo atraso debe quedar con `mesVerificable:false`
- [X] T019 [P] [US1] Crear `tests/fixtures/credito/generico.json`: reporte en español sin marca de buró, con «Acreedor», «Número de cuenta», «Fecha de apertura», «Saldo», «Límite de crédito», «Estado» y «Fecha del primer atraso»
- [X] T020 [US1] Escribir en `tests/fixtures/credito/esperado/` el `Reporte` esperado de cada fixture (`equifax.json`, `experian.json`, `transunion.json` y `generico.json`), a mano y siguiendo `data-model.md`
- [X] T021 [US1] Añadir a `tests/lector-credito.test.js` los casos de `quickstart.md` §1:
  - cada fixture produce exactamente su `esperado` (deepStrictEqual)
  - un campo impreso vacío da `{estado:'no_reportado'}` y nunca 0 (FR-013)
  - regla 233 → `limite` y `reglasAplicadas` contiene `'equifax-233-high-credit-es-limite'`
  - Experian: tarjeta → `limite` y préstamo → `montoOriginal`
  - TransUnion: la cobranza dentro de «adversas» tiene `esCobranza:true`
  - sin `x` → `mesVerificable:false` y `mes:null`
  - todo `Valor` tiene `origen.pagina` y `origen.seccion` (FR-012)
  - `JSON.stringify(reporte)` no contiene el SSN ni la fecha de nacimiento sembrados, y ningún número de cuenta tiene más de 4 dígitos visibles (FR-017)
  - páginas sin texto → advertencia `sin_texto` y 0 cuentas
  - `paginasTotales` > 150 → advertencia `paginas_truncadas`
  - misma entrada, misma salida (determinismo)

### Perfiles de US1

- [X] T022 [P] [US1] Llenar el perfil `equifax` en `lector-credito-perfiles.js` con `fuente:'Formato observado en un reporte de Equifax, mayo 2026 (sin datos personales)'` y `verificadoEl:'2026-09-30'`:
  - `detectar`
  - `ruido`: encabezado repetido, pie «Page N of M», leyenda «Paid on Time 30 30 Days Past Due …», textos de «An Overview of Your Credit Report»
  - `finDeDatos`
  - `secciones`: Summary, Personal Information, Consumer File Notices, Credit Accounts, Inquiries
  - `inicioCuenta`: `{tipo:'linea_siguiente', patron: nombre en mayúsculas con « - Closed» opcional, siguiente:/Date Reported:/}`
  - `etiquetas`: Date Reported, Balance, Account Number, Owner, Credit Limit, High Credit, Loan/Account Type, Status, Date Opened, Date of 1st Delinquency, Terms Frequency, Date of Last Activity, Date Major Delinquency 1st Reported, Months Reviewed, Scheduled Payment Amount, Amount Past Due, Deferred Payment Start Date, Actual Payment Amount, Charge Off Amount, Balloon Payment Amount, Date of Last Payment, Date Closed, Balloon Payment Date, Term Duration, Activity Designator, Narrative Code(s)
  - `codigosPago` de la leyenda
  - `codigosNarrativos` observados: 002, 093, 132, 156, 158, 214, 233, 244
  - `reglas:['equifax-233-high-credit-es-limite']`
- [X] T023 [P] [US1] Llenar el perfil `experian` con `fuente:'EXPERIAN_CR.md (guía pública de Experian)'`:
  - las etiquetas de «Account Information», «Payment Information», «Additional Information» y «Collections»
  - «Credit Limit / Original Balance» → campo `limiteOMontoOriginal`, que resuelve la regla `experian-limite-o-monto-original`
  - los códigos de pago de la guía
  - las secciones Hard/Soft Inquiries y Public Records
- [X] T024 [P] [US1] Llenar el perfil `transunion` con `fuente:'TRANSUNION_CR.md (guía pública de TransUnion)'`:
  - las secciones Personal Information, Public Records, Account Information, Accounts with Adverse Information, Satisfactory Accounts, Collections, Regular Inquiries, Promotional Inquiries, Account Review Inquiries, Consumer Statement
  - «Date Updated» → `fechaReportada`
  - la regla `transunion-cobranzas-en-adversas`
- [X] T025 [P] [US1] Llenar el perfil `generico` con `fuente:'Etiquetas comunes en inglés y español'`:
  - sin `detectar.fuertes`
  - anclas «Account Name|Creditor|Account Number|Acreedor|Número de cuenta»
  - alias en español de R16

### Motor de US1

- [X] T026 [US1] Implementar en `lector-credito.js` la segmentación de cuentas por perfil (R4 paso 3):
  - `linea_siguiente` para Equifax
  - `etiqueta` para Experian y el genérico
  - bloque de acreedor para TransUnion
  - una cuenta puede cruzar páginas
- [X] T027 [US1] Implementar la lectura etiqueta → valor (R5):
  - el valor va hasta la siguiente etiqueta conocida de la misma línea o hasta el final de la línea
  - vacío, «-» o «—» → `noReportado`
  - tipos `texto`, `fecha`, `monto`, `numero` y `cuenta` (enmascarada)
- [X] T028 [US1] Implementar la clasificación de la cuenta:
  - `tipo`: `rotativa`, `plazos`, `hipoteca`, `auto`, `estudiantil`, `cobranza`, `abierta`, `deposito` u `otra`
  - `cerrada`: por « - Closed», por `fechaCierre` con valor o por estado cerrado
  - `esCobranza`: por sección, tipo o estado
  - `id` = `buro-acreedor-últimos4-apertura` normalizado
  - las reglas de R10: 233 → `limite` y `saldoMasAlto` no reportado; Experian → `limite` si es rotativa, `montoOriginal` si es a plazos, `limiteOMontoOriginal` si no se sabe
  - anotar la regla en `reglasAplicadas`
- [X] T029 [US1] Implementar el historial (R6):
  - cuadrícula anual por `x` de los encabezados de mes; un código se asigna si la distancia es menor que la mitad del ancho de una columna, y si no → `{mes:null, mesVerificable:false}` más la advertencia `mes_no_verificable`
  - tabla de 24 meses por `x` de columnas, y sin `x` → `columnasVerificables:false`, guardando solo el mes y el saldo
  - Experian «Late Payments» → `atrasosListados`
  - códigos narrativos con su descripción
- [X] T030 [US1] Implementar `Identidad` y `Aviso`:
  - nombres, direcciones (con `tipo` actual o anterior si se distingue), teléfonos y empleadores
  - `ssnMostrado` y `fechaNacimientoMostrada` como booleanos; los valores se descartan al leer la línea (FR-017)
  - avisos de alerta de fraude, servicio activo, congelamiento, bloqueo («FILE LOCKED»), exclusión de ofertas y declaración
  - «None» o «No Statement on file» no crean aviso
- [X] T031 [US1] Implementar `Consulta` (R12) y `RegistroPublico`:
  - una consulta por fecha
  - tipo desde la columna, la sección o la palabra Hard/Soft: `dura`, `blanda`, `promocional`, `revision_cuenta` o `desconocida`
  - `fechaSalida` solo si está impresa (FR-027)
  - bancarrotas 7/11/12/13 con el número de caso enmascarado
- [X] T032 [US1] Completar `leerReporte(paginas, opciones)`:
  - detectar el buró o usar `opciones.buro`, y preparar las páginas
  - segmentar y leer
  - advertencias: `sin_texto`, `paginas_truncadas`, `formato_no_verificado`, `mes_no_verificable`
  - salida determinista
  - `resumen(reporte)` → `{cuentas, abiertas, cerradas, rotativas, cobranzas, consultasDuras, consultasBlandas, registrosPublicos}`
  - correr `node --test tests/lector-credito.test.js tests/lector-credito-perfiles.test.js` hasta que pasen

### Página de US1 (integración y rediseño, ver `contracts/ui-cuentas.md`)

- [X] T033 [US1] Cambiar la extracción en `credito.html`:
  - `extractPdf` devuelve `{text, detail, paginas}`: líneas agrupadas por `transform[5]` con tolerancia de 2 pt y ordenadas por `transform[4]`, con `piezas:[{texto, x}]`
  - `extractWord` devuelve una página con una línea por párrafo
  - `extractExcel` devuelve una página por hoja y una línea por fila, con las celdas unidas por dos espacios
  - `text` se sigue armando igual para `evaluateDocument` (R14)
- [X] T034 [US1] En `runAnalysis` de `credito.html`:
  - llamar a `window.ThemoraLector.leerReporte(paginas, {paginasTotales})` si el módulo existe
  - el progreso dice «Leyendo la página N de M» mientras pdf.js avanza
  - con la advertencia `sin_texto`, mostrar «No pudimos leer texto en este archivo. Si es una foto o un escaneo, descarga el PDF original desde el sitio del buró.» y **no** dibujar resultados como si el reporte estuviera limpio
  - pasar el `Reporte` a `render` junto con el resultado de `evaluateDocument`
- [X] T035 [US1] En `render` de `credito.html`:
  - el encabezado del documento es una frase: «Reporte de {Buró} del {fecha}. Leímos {N} de {M} páginas.»
  - el resumen es una frase: «Encontramos N cuentas: A abiertas y C cerradas…»
  - los contadores de cuentas, tarjetas y consultas salen de `ThemoraLector.resumen`
  - borrar `extractAccountsSummary` y `extractInquiriesSummary` cuando ya no se usen
  - quitar los « · » de `crDocumentMeta` y de `renderFinding`
- [X] T036 [US1] Añadir a `credito.html` el marcado de `contracts/ui-cuentas.md` §4 dentro de `#crResults`: `section#crCuentas` con `#crCuentasTitulo`, `#crResumenFrase`, `#crAvisosLectura`, `nav.lc-indice` y `#crFichas`. Escribir `renderCuentas(reporte)`:
  - una `article.lc-ficha` por cuenta con `data-estado`
  - los campos en el orden del §4: dinero, luego fechas, luego otros
  - `dd.lc-vacio` con «no reportado» en cursiva
  - `dd.lc-resaltado` **solo** en `dofd`, `fechaChargeOff`, `vencido > 0` y `montoChargeOff`, y solo si tienen valor
  - las fechas se muestran tal como están impresas
  - todo texto del reporte pasa por `escapeHtml`
  - las etiquetas en español con el término en inglés entre paréntesis donde aplica: «primer atraso (DOFD)»
  - `details.lc-origen` con «De dónde salió cada dato», que lista página, sección y etiqueta
- [X] T037 [US1] Escribir en `credito.html` la franja del historial dentro de `renderCuentas`:
  - una fila por año con 12 celdas `span.lc-mes[data-codigo]`
  - `aria-label` del tipo «marzo de 2026: 30 días de atraso»
  - número o sigla visible dentro de las celdas de atraso, cobranza o charge-off
  - para los meses no verificables, la nota «En {año} hay un atraso de {N} días cuyo mes no se pudo ubicar.»
- [X] T038 [US1] Escribir en `credito.html` el índice y los bloques finales:
  - `nav.lc-indice` con el nombre del acreedor y el estado, sin números
  - en menos de 760 px, `details` con «Ir a una cuenta (N)»
  - bloque de consultas duras y blandas agrupadas por empresa con sus fechas
  - bloque de datos personales, con la frase sobre SSN y fecha de nacimiento sin sus valores
- [X] T039 [US1] Añadir el CSS `.lc-*` al `<style>` de `credito.html`, usando solo tokens de `styles.css` y la escala `--text-*`, sin tamaños nuevos:
  - la ficha sobre `--copia-lavanda` con la franja `--franja-lavanda` arriba, renglones `--renglon`, radio `--radius` y sin sombra
  - `font-variant-numeric: tabular-nums` en las cifras
  - la franja del historial: al día = `--renglon`; atraso, cobranza y charge-off = `--corrector` con el texto dentro; sin datos = borde punteado
  - el resaltado con `--resaltador` como trazo de marcador
  - índice fijo (`position: sticky`) a partir de 1000 px
  - 12 celdas por fila y sin desplazamiento horizontal desde 320 px
  - `@media print` con `break-inside: avoid` y sin índice
- [X] T040 [US1] Rediseñar en `credito.html` lo existente según `contracts/ui-cuentas.md` §6:
  - `.cr-dropzone` como hoja lavanda con renglones y franja, sin el círculo `.cr-upload-icon`
  - texto «Sube tu reporte de Equifax, Experian o TransUnion»
  - el botón de analizar dice «Leer mi reporte», sin `<span>→</span>`
  - `.cr-progress` como renglón que se resalta, sin `.cr-spinner`
  - `.cr-health` con las copias rosa, celeste o verde y su franja, en lugar de los rgba sueltos
  - `.cr-kpis` reducido a un renglón
- [X] T041 [US1] Implementar el único movimiento en `credito.html`: al mostrar los resultados, el resaltador recorre una vez los `dd.lc-resaltado` de la primera ficha (`background-size` de 0 a 100 %, 600 ms). Con `@media (prefers-reduced-motion: reduce)` aparece ya pintado
- [X] T042 [US1] Escribir `tests/credito-lector-ui.test.js`, que lee `credito.html` y comprueba:
  - `lector-credito-perfiles.js` se carga antes que `lector-credito.js`, y ambos antes del analizador
  - los ids del §4 existen
  - `renderCuentas` usa `escapeHtml`
  - el botón de analizar no contiene «→»
  - `renderCuentas` y `render` no arman textos con « · »
  - las reglas `.lc-` no usan colores hex sueltos: solo `var(--…)`
  - no hay `font-size` con valores nuevos fuera de `var(--text-*)`
  - `prefers-reduced-motion` está presente

**Checkpoint**: US1 entregada. El lector muestra cada cuenta con sus datos y su origen, y la Fase 0 sigue intacta.

---

## Phase 5: Polish & cross-cutting

- [X] T043 Correr `node --test tests/sistema-visual.test.js tests/credito-fase0.test.js tests/credito-identidad.test.js tests/cartas-bilingues.test.js tests/lector-credito.test.js tests/lector-credito-perfiles.test.js tests/credito-lector-ui.test.js` y corregir lo que falle en archivos de esta feature, sin debilitar pruebas
- [X] T044 Correr la suite completa. Reportar tal cual los fallos ajenos (hoy son 18, en las pruebas de tasas y casas) sin tocarlos
- [ ] T045 Hacer a mano la prueba de `quickstart.md` §2 con un reporte propio: teléfono de 360 px, «Reducir movimiento», impresión y PDF escaneado
- [X] T046 [P] Actualizar `INFORME-CREDITO-CLARO.md` para que ya no mencione `analyzer.js` como archivo existente y apunte a `lector-credito.js`
- [X] T047 Correr `graphify update .` y confirmar que `lector-credito.js` aparece conectado a `credito.html` en el grafo

---

## Phase 6: Ajustes tras prueba con reporte real (2026-09-30)

- [X] T048 Reconocer etiquetas tabulares sin dos puntos y valores en la línea siguiente en el motor, sin relajar el corte de ruido ni de derechos.
- [X] T049 Completar las etiquetas públicas de Experian y TransUnion, incluidas consultas, datos personales y `Address ID` ignorado.
- [X] T050 Añadir el fixture sintético `experian-tabla.json`, su esperado de conteos y pruebas de cuentas, cobranza y consultas.
- [X] T051 Añadir advertencias `cuentas_no_leidas` y `consultas_no_leidas`; la interfaz no presenta ceros inventados.
- [X] T052 Rediseñar «Resumen del reporte» con datos generales, tabla por tipo, negativas, consultas, registros y avisos.
- [X] T053 Actualizar el título del resultado, pruebas de interfaz y ejecutar la suite y `graphify update .`.

## Dependencies & Execution Order

- **Setup (T001–T004)** → **Foundational (T005–T010)** → **US1 (T016–T042)** → **Polish (T043–T047)**
- **US0 (T011–T015)**: hecha e independiente.
- **Dentro de US1**:
  - Fixtures (T016–T019) → esperado (T020) → pruebas (T021)
  - Perfiles (T022–T025) en paralelo
  - Motor: T026 → T027 → T028 → T029 → T030 → T031 → T032
  - Página: T033 → T034 → T035 → T036 → T037 → T038, y luego T039 → T040 → T041 → T042
- **Qué depende del motor**: T033 y la creación del CSS (T039) solo dependen de Setup y pueden empezar antes de terminar el motor. T034 a T038 necesitan T032.
- **Fases 2 a 5 de la spec (US2–US5)**: dependen de US1 y tendrán su propio `/speckit-plan` y `/speckit-tasks`.

## Parallel Example: User Story 1

```text
# Fixtures, en paralelo:
T016 equifax.json    T017 experian.json    T018 transunion.json    T019 generico.json

# Perfiles, en paralelo (mismo archivo pero secciones separadas; si se trabaja solo, en secuencia):
T022 equifax    T023 experian    T024 transunion    T025 generico

# Mientras se escribe el motor (T026–T032):
T033 extracción con posiciones en credito.html
T039 CSS .lc-* en credito.html
```

## Implementation Strategy

### MVP (US1)

1. Setup y Foundational.
2. Fixtures y pruebas de US1, en rojo.
3. Perfiles y motor hasta que las pruebas pasen, en verde.
4. Integración en la página y rediseño.
5. **Parar y validar** con `quickstart.md`, y mostrarlo al dueño antes de publicar (sin commit ni push hasta que lo pida).

### Entrega incremental

- US0 ✅ → US1 (lectura) → US2 (revisión y explicación) → US3 (comparar burós) → US4 (leyes) → US5 (disputa y seguimiento).
- Cada historia se puede publicar sola.

## Notes

- `[P]` = otro archivo y sin depender de una tarea pendiente. T022–T025 comparten archivo: en paralelo solo si se trabaja por secciones.
- **Ningún dato del reporte real de Equifax entra al repositorio**: solo su estructura.
- **Formato LF**: al editar con Python en Windows, abrir los archivos en binario.
- **Sin commit ni push** hasta que el dueño lo pida.
