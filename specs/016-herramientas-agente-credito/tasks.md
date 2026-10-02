---

description: "Task list — Herramientas de cálculo del agente de crédito (Fase 1)"
---

# Tasks: Herramientas de cálculo del agente de crédito (Fase 1)

**Input**: Design documents from `specs/016-herramientas-agente-credito/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/herramientas-api.md, quickstart.md

**Tests**: SÍ. La spec las exige (FR-038, FR-039, SC-001 a SC-007) y el plan fija TDD: en cada historia, primero la prueba que falla y después el código mínimo para que pase.

**Organization**: una fase por historia (US1 Fecha de salida → US2 Utilización → US3 Posibles duplicados → US4 Consultas duras). Todo el código va en `herramientas-credito.js` y todas las pruebas en `tests/herramientas-credito.test.js`. Por eso las tareas de un mismo archivo son secuenciales y casi no hay `[P]`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (otro archivo, sin dependencias pendientes)
- **[Story]**: historia de `spec.md` (US1–US4)
- Rutas relativas a la raíz del proyecto (`MyWeb/`)

## Reglas para todas las tareas

- **No tocar** `credito.html`, `cartas-bilingues.js`, `lector-credito.js`, `lector-credito-perfiles.js` ni `analista-credito.js` (FR-040).
- **Sin `Date`**: no usar `new Date`, `Date.now`, `Date.UTC` ni `toISOString` en `herramientas-credito.js` (research R2).
- **Salida solo con códigos**: `snake_case`, sin frases para el consumidor (FR-003). Textos copiados del reporte, solo en `marcaVendida.texto`, `responsabilidad` y `empresa`.
- **Sin sustituir datos**: si falta un dato se devuelve estado + motivo; nunca se usa otro campo (FR-005).
- **Finales de línea LF** en todos los archivos nuevos.
- **Estilo**: comentarios de sección como en `lector-credito.js`; `'use strict'`; IIFE + UMD.
- Después de cada historia: `node --test tests/herramientas-credito.test.js` tiene que pasar.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: fixture de referencia y archivos vacíos.

- [X] T001 [P] Crear `tests/fixtures/credito/agente/LEEME.md`. Debe explicar que esta carpeta guarda **Reportes ya normalizados** (la forma de `tests/fixtures/credito/esperado/*.json`, spec 013), no arreglos de `Pagina`; que son sintéticos; que sirven para probar cálculo sin pasar por el lector (research R9); y que los orígenes (`pagina`, `seccion`, `etiqueta`, `linea`) se escriben a mano.
- [X] T002 [P] Crear `tests/fixtures/credito/agente/acme-zeta.json` con un `Reporte` normalizado. Cada dato usa la forma `Valor` de la spec 013 (`{ valor, texto, origen: { pagina, seccion, etiqueta, linea } }`, y las fechas `valor: { texto, iso }`):
  - Raíz: `buro: 'equifax'`, `identidad: { nombres: [], direcciones: [], telefonos: [], empleadores: [], ssnMostrado: false, ssnUltimos4: null, fechaNacimientoMostrada: false }`, `avisos: []`, `registrosPublicos: []`, `advertencias: []`.
  - Cuenta `id: 'A'`: acreedor «ACME BANK», `tipo` `rotativa`, `cerrada: true`, `esCobranza: false`, `estado` «Charge Off», `saldo` 1284, `dofd` iso `'2021-03'` (texto «03/2021», etiqueta «Date of 1st Delinquency», sección `adversas`, página 1), `fechaApertura` iso `'2018-06'`, `comentarios: [ «Account sold to another lender» ]` con origen, `historial: []`, `atrasosListados: []`, `codigosNarrativos: []`.
  - Cuenta `id: 'B'`: acreedor «ZETA COLLECTIONS», `tipo` `cobranza`, `cerrada: false`, `esCobranza: true`, `acreedorOriginal` «ACME BANK», `saldo` 1284, `dofd` iso `'2021-03'`, sección `cobranzas`, página 2, sin comentarios.
  - Cuenta `id: 'C'`: acreedor «NOVA CARD», `tipo` `rotativa`, `cerrada: false`, `responsabilidad` «Individual», `saldo` 890, `limite` 1000, `historial` con 2 meses `al_dia`.
  - Cuenta `id: 'D'`: acreedor «SOL AUTO», `tipo` `auto`, `cerrada: false`, `saldo` 14200, `historial` con 2 meses `al_dia`.
  - `consultas`: dura `2026-02-14` (CAPITAL DEMO), dura `2025-11-03` (AUTO LENDER DEMO), dura iso `'2025-10'` (BANCO MES DEMO), dura `2025-08-20` (VIEJA DEMO), blanda `2026-05-01` (PROMO DEMO). Cada `fecha` y `empresa` con origen en la sección `consultas`, página 3.
- [X] T003 Crear `herramientas-credito.js` con el encabezado de comentario (propósito, spec 016, «no toca el DOM, no hace llamadas de red, no lee el reloj ni guarda nada»), la IIFE con `'use strict'` y la exportación UMD: `window.ThemoraHerramientas` y `module.exports`. Exportar por ahora `{ CATALOGO: Object.freeze([]), ejecutar }`; `ejecutar` lanza `TypeError` con cualquier nombre.
- [X] T004 Crear `tests/herramientas-credito.test.js` con un encabezado como el de `tests/analista-credito.test.js` (cómo ejecutarlo, «todos los datos son sintéticos», enlace a la spec 016), `require` de `node:test`, `node:assert`, `node:fs`, `node:path` y `../herramientas-credito.js`, más el helper `cargarAcme()`, que lee `tests/fixtures/credito/agente/acme-zeta.json` y lo **congela en profundidad** (`Object.freeze` recursivo), para que cualquier mutación lance un error en modo estricto.

**Checkpoint**: `node --test tests/herramientas-credito.test.js` corre (sin pruebas que fallen).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: utilidades internas que usan las cuatro herramientas (plan, «Organización interna», bloques 1–4). No se exportan; se prueban a través de las herramientas.

**⚠️ CRITICAL**: ninguna historia empieza antes de terminar esta fase.

- [X] T005 Prueba en `tests/herramientas-credito.test.js`: `ejecutar('noExiste', reporte, {})` lanza `TypeError`; `CATALOGO` está congelado (`Object.isFrozen`).
- [X] T006 En `herramientas-credito.js`, bloque «Utilidades de valores»: `tieneValor(v)` (igual que en `analista-credito.js`: existe, `estado !== 'no_reportado'` y `valor` no vacío), `isoDe(v)` (devuelve `v.valor.iso` o `''`) y `refDe(cuenta, campo)` → `{ campo, valor, origen }` (para fechas, `valor` es el iso; para montos, el número; `origen` copiado tal cual).
- [X] T007 En `herramientas-credito.js`, bloque «Calendario» (research R2), **solo con enteros**:
  - `parsearIso(iso)` → `{ anio, mes|null, dia|null }`, o `null` si el formato no es `AAAA`, `AAAA-MM` o `AAAA-MM-DD` válido.
  - `diasDesdeCivil(a, m, d)` y `civilDesdeDias(n)` (algoritmo *days from civil* de Howard Hinnant).
  - `sumarDias(fecha, n)`.
  - `sumarMeses(fecha, n)`, que recorta al último día del mes si el día no existe.
  - `sumarAnios(fecha, n)` = `sumarMeses(fecha, 12n)`.
  - `ultimoDiaDelMes(a, m)`, con bisiestos.
  - `formatearIso(fecha, precision)`, con ceros a la izquierda.
  - `compararIso(a, b)`, comparación de cadenas del mismo largo.
- [X] T008 En `herramientas-credito.js`, bloque «Validación de uso»:
  - `exigirHoy(hoy)` lanza `TypeError` si `hoy` no es `AAAA-MM-DD` válido (mes 1–12; día que existe en ese mes).
  - `exigirArreglo(x, nombre)`.
  - `exigirCuenta(c)` lanza `TypeError` si no es un objeto con `id` de tipo string no vacío.
  - `exigirMeses(m)`: entero entre 1 y 120.
- [X] T009 En `herramientas-credito.js`, bloque «Clasificación de hechos»:
  - `esCobranzaOChargeOff(c)` (research R4): verdadero si `c.esCobranza === true`; o algún `historial[].codigo === 'charge_off'`; o `tieneValor(c.fechaChargeOff)`; o `tieneValor(c.montoChargeOff)`; o el texto de `estado`, `estadoPago` o `designadorActividad` coincide con `/charge[\s-]?off|charged[\s-]off|cargad[ao] a p[eé]rdida/i`.
  - `normalizarNombre(s)` (R7): `normalize('NFD')`, quitar `\p{Diacritic}`, mayúsculas, `[^A-Z0-9]` → espacio, juntar espacios y recortar.
  - `buscarMarcaVendida(c)` (R7): busca `/\bsold\b|\btransferred\b|vendid[ao]|transferid[ao]/i` en `comentarios[]`, `estado`, `estadoPago` y `codigosNarrativos[].descripcion`, en ese orden. Devuelve `{ encontrada: true, texto, origen }` con la primera coincidencia, o `{ encontrada: false, texto: null, origen: null }`.

**Checkpoint**: T005 pasa; el archivo carga sin errores.

---

## Phase 3: User Story 1 - Fecha de salida (Priority: P1) 🎯 MVP

**Goal**: `calcularFechaSalida(cuenta, { hoy })` según FR-010 a FR-019 y `data-model.md` § ResultadoFechaSalida.

**Independent Test**: ACME y ZETA → `2028-09`, `precision: 'mes'`, `estimada: true`, `reglaBase: '7_anos_mas_180_dias'`, `motivoEstimacion: 'dofd_sin_dia_exacto'`, rango `2028-08`–`2028-09`, `yaPaso: false`; NOVA y SOL → `no_aplica`.

### Tests for User Story 1 ⚠️ (escribir primero; deben FALLAR)

- [X] T010 [US1] Prueba ACME/ZETA en `tests/herramientas-credito.test.js`, con `hoy: '2026-10-01'`.
  - Para A y B, comparar con `deepStrictEqual` contra el objeto completo de `contracts/herramientas-api.md` § Ejemplo (`regla: 'cobranza_o_chargeoff'`, `estado: 'calculado'`, `motivo: null`, `caracter: 'calculo_informativo'`, una `FechaCalculada` con `base.campo: 'dofd'`, `base.valor: '2021-03'` y el origen del fixture, `omitidos: []`, `avisos: []`).
  - C y D → `{ regla: 'no_aplica', estado: 'no_aplica', motivo: null, caracter: 'calculo_informativo', fechas: [], omitidos: [], avisos: [] }`.
- [X] T011 [US1] Pruebas de calendario y precisión en `tests/herramientas-credito.test.js`, con cuentas mínimas creadas en la prueba:
  - cobranza con DOFD `2019-03-15` → `salida: '2026-09-11'`, `precision: 'dia'`, `estimada: false`, `motivoEstimacion: null`, `rango: null`;
  - cobranza con DOFD `2023-09-02` → `'2031-02-28'` (pasa por 2024-02-29 y se recorta);
  - cobranza con DOFD `2019-03` → `'2026-09'`, rango `2026-08`–`2026-09` (ejemplo de la spec 013).
- [X] T012 [US1] Pruebas de datos faltantes en `tests/herramientas-credito.test.js`:
  - cobranza sin `dofd`, pero con `fechaReportada`, `ultimaActividad` y `fechaChargeOff` presentes → `estado: 'no_calculable'`, `motivo: 'falta_dofd'`, `fechas: []`;
  - `dofd` con `estado: 'no_reportado'` → lo mismo;
  - DOFD solo con año `'2021'` → `motivo: 'dofd_imprecisa'`.
- [X] T013 [US1] Pruebas de clasificación (R4) en `tests/herramientas-credito.test.js`. Una cuenta es `cobranza_o_chargeoff` cuando: solo tiene `estado` «Charged Off»; solo tiene `historial` con `charge_off`; solo tiene `montoChargeOff`; o solo tiene `esCobranza: true`. Una cuenta charge-off que además tiene atrasos en su historial devuelve **una sola** `FechaCalculada` (regla de la cuenta), no una por atraso.
- [X] T014 [US1] Pruebas de atrasos (FR-015, R5) en `tests/herramientas-credito.test.js`.
  - Cuenta rotativa abierta con `historial`: `2022-05 atraso_30`, `2022-06 atraso_60`, `2022-07 al_dia`, `2023-01 atraso_30` con `mesVerificable: false`; y `atrasosListados` con `2022-06` (repetido).
  - Resultado esperado: `regla: 'atrasos'`, dos fechas (`2029-05`, `2029-06`) con `reglaBase: '7_anos_desde_atraso'`, `precision: 'mes'`, `estimada: true`, `motivoEstimacion: 'atraso_sin_dia_exacto'` y `rango` igual a `{ desde: salida, hasta: salida }`; `omitidos` con el mes `2023-01` y motivo `mes_no_verificable`.
  - Si todos los atrasos son no verificables → `estado: 'no_calculable'`, `motivo: 'sin_atrasos_verificables'`.
- [X] T015 [US1] Pruebas de `yaPaso` y avisos en `tests/herramientas-credito.test.js`:
  - DOFD `2018-01`, hoy `2026-10-01` → rango `2025-06`–`2025-07`, `yaPaso: true`;
  - DOFD `2019-03`, hoy `2026-08-15` → rango `2026-08`–`2026-09`, `yaPaso: 'incierto'`;
  - DOFD `2019-03-15` y hoy `2026-09-11` → `yaPaso: false` (el mismo día no ha pasado); hoy `2026-09-12` → `true`;
  - DOFD `2027-01` con hoy `2026-10-01` → aviso `'dofd_futura'`;
  - DOFD `2017-01` con `fechaApertura` `2018-06` → aviso `'dofd_antes_de_apertura'`; en ambos casos la fecha se calcula igual.
- [X] T016 [US1] Pruebas de uso indebido en `tests/herramientas-credito.test.js`: `TypeError` si falta `hoy`; si `hoy` es `'2026-02-30'` o `'2026/10/01'`; si `cuenta` es `null`; si `cuenta` no tiene `id`.

### Implementation for User Story 1

- [X] T017 [US1] Implementar `calcularFechaSalida(cuenta, { hoy })` en `herramientas-credito.js`:
  - validar con `exigirCuenta` y `exigirHoy`;
  - decidir la `regla` con `esCobranzaOChargeOff` y la presencia de atrasos;
  - para `cobranza_o_chargeoff`: DOFD con día → `sumarAnios(sumarDias(dofd, 180), 7)`; DOFD con mes → `salida` = `sumarMeses(mesDOFD, 90)` y `rango` = mes de (día 1 + 180 d + 7 a) a mes de (último día + 180 d + 7 a); DOFD con año → `dofd_imprecisa`; sin DOFD → `falta_dofd`, **sin mirar otras fechas**;
  - para `atrasos`: meses de `historial` con código `/^atraso_\d+$/` y `mesVerificable: true`, más `atrasosListados`; quitar repetidos y ordenar; `salida` = mes + 84 meses;
  - calcular `yaPaso` (data-model) y los `avisos`;
  - devolver siempre `caracter: 'calculo_informativo'`.
- [X] T018 [US1] Agregar `calcularFechaSalida` al export y al `CATALOGO` (`{ nombre: 'calcularFechaSalida', version: '1.0.0', alcance: 'cuenta' }`) en `herramientas-credito.js`.
  - `ejecutar('calcularFechaSalida', reporte, { hoy, cuentaId })` devuelve el resultado de esa cuenta.
  - Sin `cuentaId`, devuelve un arreglo con todas las cuentas, ordenado por `cuentaId`.
  - Un `cuentaId` inexistente lanza `TypeError`.
  - Agregar la prueba de `ejecutar` en `tests/herramientas-credito.test.js`.

**Checkpoint**: T010–T018 pasan. US1 está completa y se puede demostrar sola (quickstart § 4).

---

## Phase 4: User Story 2 - Utilización (Priority: P2)

**Goal**: `calcularUtilizacion(cuentas)` según FR-020 a FR-026 y `data-model.md` § ResultadoUtilizacion.

**Independent Test**: ACME/ZETA → C con 89 %, total $890 / $1,000 = 89 %, excluida A (`cargada_a_perdida`).

### Tests for User Story 2 ⚠️

- [X] T019 [US2] Prueba ACME/ZETA en `tests/herramientas-credito.test.js`:
  - `porCuenta` = `[{ cuentaId: 'C', saldo: 890, limite: 1000, porcentaje: 89, sobreLimite: false, responsabilidad: 'Individual', referencias: { saldo: refDe(C, 'saldo'), limite: refDe(C, 'limite') } }]` (orígenes copiados del fixture);
  - `total: { saldo: 890, limite: 1000, porcentaje: 89, cuentas: 1 }`;
  - `excluidas: [{ cuentaId: 'A', motivo: 'cargada_a_perdida' }]`; B y D no aparecen.
- [X] T020 [US2] Pruebas de exclusiones y del orden de prioridad (R6, «gana la primera que aplica: `cobranza`, `cargada_a_perdida`, `cerrada`, `sin_saldo`, `saldo_negativo`, `sin_limite`, `limite_cero`») en `tests/herramientas-credito.test.js`. Una cuenta rotativa por motivo. Además:
  - una rotativa cerrada **y** sin límite → `cerrada`;
  - una rotativa sin `limite` pero con `saldoMasAlto` → `sin_limite` (nunca usa `saldoMasAlto`);
  - todas excluidas → `total: null`.
- [X] T021 [US2] Pruebas de cálculo en `tests/herramientas-credito.test.js`:
  - saldo 1200 / límite 1000 → 120 %, `sobreLimite: true`;
  - redondeo con mitad hacia arriba: 5 / 1000 → 1 (0,5 % sube a 1) y 4 / 1000 → 0;
  - centavos: 0.1 + 0.2 de saldo en dos tarjetas con límite 1 cada una → total exacto, sin error de coma flotante;
  - una rotativa de usuario autorizado se incluye con `responsabilidad: 'Authorized User'`;
  - lista vacía → `{ porCuenta: [], total: null, excluidas: [] }`;
  - `calcularUtilizacion(null)` → `TypeError`.

### Implementation for User Story 2

- [X] T022 [US2] Implementar `calcularUtilizacion(cuentas)` en `herramientas-credito.js`:
  - analizar solo las cuentas con `tipo.valor === 'rotativa'`;
  - aplicar las exclusiones en el orden de R6;
  - trabajar en centavos (`Math.round(x * 100)`);
  - porcentaje = `Math.floor((200 * saldoC + limiteC) / (2 * limiteC))`;
  - el total suma centavos de las incluidas;
  - devolver montos en dólares (`centavos / 100`);
  - ordenar por `cuentaId`.
- [X] T023 [US2] Agregar `calcularUtilizacion` al export y al `CATALOGO` (`alcance: 'reporte'`; `ejecutar` le pasa `reporte.cuentas`) en `herramientas-credito.js`, con su prueba de `ejecutar` en `tests/herramientas-credito.test.js`.

**Checkpoint**: US1 y US2 pasan por separado.

---

## Phase 5: User Story 3 - Posibles duplicados (Priority: P2)

**Goal**: `buscarPosiblesDuplicados(cuentas)` según FR-027 a FR-032 y `data-model.md` § PosibleDuplicado.

**Independent Test**: ACME/ZETA → exactamente un par `original_y_cobranza ['A','B']` con la marca de venta encontrada.

### Tests for User Story 3 ⚠️

- [X] T024 [US3] Prueba ACME/ZETA en `tests/herramientas-credito.test.js`. El resultado debe ser exactamente:
  ```
  [{ tipo: 'original_y_cobranza', cuentas: ['A','B'], nombreComparado: 'ACME BANK',
     coinciden: ['acreedor_original','saldo','dofd'],
     difieren: [{ campo: 'fecha_apertura', a: '2018-06', b: null }],
     ambosConSaldo: true,
     marcaVendida: { encontrada: true, texto: 'Account sold to another lender', origen: <origen del fixture> } }]
  ```
- [X] T025 [US3] Pruebas de variantes en `tests/herramientas-credito.test.js`:
  - ACME sin comentario → mismo par con `marcaVendida: { encontrada: false, texto: null, origen: null }`;
  - cobranza sin `acreedorOriginal` → `[]`;
  - «Acme Bank.» frente a «ACME  BANK» → se emparejan; «ACME BANK» frente a «ACME BK» → no;
  - con acento, «Bancó Ñandú» frente a «BANCO NANDU» → se emparejan.
- [X] T026 [US3] Pruebas de los otros tipos en `tests/herramientas-credito.test.js`:
  - dos cuentas «DEMO CARD», sin cobranza, con `fechaApertura` `2020-04` → `mismo_acreedor_misma_apertura`;
  - dos cobranzas con `acreedorOriginal` «TIENDA DEMO» → `dos_cobranzas_mismo_original`, con `marcaVendida: null`;
  - una cuenta que entra en dos pares aparece en ambos;
  - ningún par se repite ni empareja una cuenta consigo misma;
  - el orden del resultado es el mismo si se invierte el orden de la lista de entrada;
  - `buscarPosiblesDuplicados('x')` → `TypeError`.

### Implementation for User Story 3

- [X] T027 [US3] Implementar `buscarPosiblesDuplicados(cuentas)` en `herramientas-credito.js`:
  - recorrer todos los pares `i < j` sobre las cuentas ordenadas por `id`;
  - detectar los tres tipos de FR-027 con `normalizarNombre`;
  - `coinciden` y `difieren` sobre `acreedor_original` o `acreedor`, `saldo`, `dofd` (comparado al mes, `AAAA-MM`) y `fecha_apertura`, en ese orden; un dato que falta va a `difieren` con `null` y nunca a `coinciden`;
  - `ambosConSaldo` = los dos saldos > 0;
  - `marcaVendida` con `buscarMarcaVendida(original)` solo en `original_y_cobranza`;
  - con `original_y_cobranza`, `cuentas` va como `[original, cobranza]`;
  - orden final por `cuentas[0]`, después `cuentas[1]`, después `tipo`.
- [X] T028 [US3] Agregar `buscarPosiblesDuplicados` al export y al `CATALOGO` (`alcance: 'reporte'`) en `herramientas-credito.js`, con su prueba de `ejecutar` en `tests/herramientas-credito.test.js`.

**Checkpoint**: US1–US3 pasan por separado.

---

## Phase 6: User Story 4 - Consultas duras en 12 meses (Priority: P3)

**Goal**: `contarConsultasDuras(consultas, { hoy, meses = 12 })` según FR-033 a FR-037 y `data-model.md` § ConteoConsultasDuras.

**Independent Test**: ACME/ZETA con hoy `2026-10-01` → `total: 2`, `inciertas: 1`.

### Tests for User Story 4 ⚠️

- [X] T029 [US4] Prueba ACME/ZETA en `tests/herramientas-credito.test.js`:
  - `ventana: { desde: '2025-10-01', hasta: '2026-10-01', incluyeDesde: false, incluyeHasta: true }`;
  - `total: 2`;
  - `dentro` = [CAPITAL DEMO 2026-02-14, AUTO LENDER DEMO 2025-11-03] (de la más reciente a la más antigua, con `empresa`, `fecha` y `origen`);
  - `inciertas` = [BANCO MES DEMO `2025-10`];
  - `futuras: []`, `sinFecha: 0`, `desconocidas: 0`.
- [X] T030 [US4] Pruebas de bordes en `tests/herramientas-credito.test.js`:
  - consulta con fecha igual a `desde` (`2025-10-01`) → fuera; igual a `hoy` → dentro;
  - con hoy `2026-10-01`: mes `2025-11` → dentro y mes `2025-09` → fuera;
  - hoy `2028-02-29` → `desde: '2027-02-28'`;
  - `meses: 24` cambia la ventana;
  - fecha `2026-12-01` → `futuras`;
  - sin fecha → `sinFecha: 1`;
  - `tipo: 'desconocida'` → `desconocidas: 1`;
  - `promocional` y `revision_cuenta` se ignoran;
  - tres consultas de la misma empresa en 5 días cuentan 3 (FR-037);
  - `meses: 0`, `meses: 1.5` o `hoy` inválido → `TypeError`.

### Implementation for User Story 4

- [X] T031 [US4] Implementar `contarConsultasDuras(consultas, { hoy, meses = 12 })` en `herramientas-credito.js`:
  - `desde = sumarMeses(hoy, -meses)`, recortando al fin de mes;
  - fecha con día: dentro si `desde < f <= hoy`;
  - fecha con mes: dentro si el día 1 > `desde` y el último día ≤ `hoy`; fuera si el último día ≤ `desde` o el día 1 > `hoy`; si no, incierta (y si el día 1 > `hoy`, va a `futuras`);
  - fecha solo con año o inválida: se trata como `sinFecha`;
  - ordenar `dentro`, `inciertas` y `futuras` de la más reciente a la más antigua y, si empatan, por empresa.
- [X] T032 [US4] Agregar `contarConsultasDuras` al export y al `CATALOGO` (`alcance: 'reporte'`; `ejecutar` le pasa `reporte.consultas`) en `herramientas-credito.js`, con su prueba de `ejecutar` en `tests/herramientas-credito.test.js`.

**Checkpoint**: las cuatro historias pasan.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: garantías del contrato (SC-003 a SC-007) y cierre.

- [X] T033 Prueba de determinismo en `tests/herramientas-credito.test.js`: cada herramienta corre 100 veces con el fixture ACME/ZETA y las 100 salidas son `deepStrictEqual` a la primera (SC-003).
- [X] T034 Prueba de no mutación en `tests/herramientas-credito.test.js`: las cuatro herramientas corren sobre `cargarAcme()` (congelado en profundidad) sin lanzar errores, y el JSON del fixture es idéntico antes y después.
- [X] T035 Prueba de palabras prohibidas en `tests/herramientas-credito.test.js` (FR-004, SC-005, R10): las salidas de las cuatro herramientas con ACME/ZETA, **excluyendo** los campos de texto copiados del reporte (`marcaVendida.texto`, `responsabilidad`, `empresa`), no contienen `/debe eliminarse|ilegal|violaci[oó]n|fraude|garantiz|subir[aá] tu puntaje|must be removed|illegal|violation|fraud/i`.
- [X] T036 Prueba de origen y privacidad en `tests/herramientas-credito.test.js`:
  - toda `Referencia`, `FechaCalculada.base`, consulta en `dentro` e `inciertas`, y toda `marcaVendida` encontrada traen `origen.pagina` y `origen.etiqueta` (SC-006);
  - ninguna salida contiene las claves `identidad`, `numero`, `contacto`, `nombres`, `direcciones` ni `telefonos` (FR-008).
- [X] T037 Prueba de humo en `tests/herramientas-credito.test.js`: para cada `tests/fixtures/credito/esperado/*.json` (6 archivos), con `hoy: '2026-10-01'`, `ejecutar` corre las cuatro herramientas del `CATALOGO` sin errores, dos veces con salida idéntica, y sin palabras prohibidas en los campos generados.
- [X] T038 Agregar en `tests/herramientas-credito.test.js` una prueba que confirme que `CATALOGO` lista exactamente `['calcularFechaSalida', 'calcularUtilizacion', 'buscarPosiblesDuplicados', 'contarConsultasDuras']`, cada uno con `version: '1.0.0'` y su `alcance`, y que sus entradas están congeladas y no exponen funciones.
- [X] T039 Revisar `herramientas-credito.js`: que no use `Date`, `Math.random` ni `console`; que no tenga dependencias; que tenga menos de ~800 líneas; que sea LF. Comprobar con `grep -nE "new Date|Date\.|Math\.random|console\." herramientas-credito.js`, que debe salir vacío.
- [X] T040 Ejecutar las validaciones de `specs/016-herramientas-agente-credito/quickstart.md`:
  - `node --test tests/herramientas-credito.test.js`;
  - lo mismo con `TZ=America/Los_Angeles` y con `TZ=Asia/Tokyo`;
  - `node --test tests/` completo (0 regresiones, SC-007);
  - la prueba manual de § 4.

  Reportar cualquier fallo tal cual.
- [X] T041 Verificar el alcance (FR-040): `git status --short` y `git diff --stat` no muestran cambios nuevos en `credito.html`, `cartas-bilingues.js`, `lector-credito.js`, `lector-credito-perfiles.js` ni `analista-credito.js` respecto al inicio de la fase. Ojo: hay cambios previos del dueño sin commit; se compara contra ese estado, no contra HEAD.
- [X] T042 Ejecutar `graphify update .` para actualizar `graphify-out/`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias. T001 y T002 son `[P]`; T003 y T004 van después (T004 usa el fixture de T002).
- **Foundational (Phase 2)**: depende de T003. Bloquea todas las historias.
- **US1 a US4 (Phases 3–6)**: dependen solo de la Phase 2; no dependen entre sí. Como comparten archivo, se hacen en orden de prioridad: US1 → US2 → US3 → US4.
- **Polish (Phase 7)**: depende de las cuatro historias.

### User Story Dependencies

- **US1 (P1)**: independiente. Es el MVP.
- **US2 (P2)**: independiente. Usa `esCobranzaOChargeOff` (Phase 2) para excluir charge-offs.
- **US3 (P2)**: independiente.
- **US4 (P3)**: independiente. Usa `sumarMeses` (Phase 2).

### Within Each User Story

- Las pruebas se escriben primero y se comprueba que **fallan**.
- Después va la implementación (`calcular…`) y por último el registro en `CATALOGO` + `ejecutar`.
- No se pasa a la siguiente historia con pruebas en rojo.

### Parallel Opportunities

- T001 ∥ T002 (dos archivos distintos de fixture).
- Todo lo demás toca `herramientas-credito.js` o `tests/herramientas-credito.test.js` y va en secuencia. Con un solo implementador, paralelizar no ahorra nada; es una decisión deliberada (plan, R1: un archivo).

---

## Parallel Example: Setup

```text
Task: "T001 [P] Crear tests/fixtures/credito/agente/LEEME.md"
Task: "T002 [P] Crear tests/fixtures/credito/agente/acme-zeta.json"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (T001–T004) y Phase 2 (T005–T009).
2. Phase 3 (T010–T018): Fecha de salida.
3. **Parar y validar**: `node --test tests/herramientas-credito.test.js` y la prueba manual de quickstart § 4. Es la herramienta con más riesgo legal; revisarla con el dueño antes de seguir.

### Incremental Delivery

1. MVP (US1) → revisión.
2. US2 Utilización → pruebas.
3. US3 Duplicados → pruebas.
4. US4 Consultas → pruebas.
5. Phase 7 → todas las garantías y cierre.

Cada paso deja las pruebas en verde y no toca nada fuera del alcance.

---

## Notes

- 42 tareas. `[P]` solo en T001 y T002.
- Sin commits automáticos: el dueño tiene cambios previos sin commit en el árbol. Se hace commit solo si lo pide, y solo con los archivos de esta feature (`herramientas-credito.js`, `tests/herramientas-credito.test.js`, `tests/fixtures/credito/agente/*`, `specs/016-herramientas-agente-credito/*`).
- Si una prueba de referencia no cuadra con lo aprobado, se reporta tal cual; no se ajusta la prueba para que pase (constitución, «Pruebas»).
