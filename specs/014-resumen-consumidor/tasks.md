---
description: "Tareas para el resumen del consumidor en el analizador de crédito (014)"
---

# Tasks: Resumen del consumidor en el analizador de crédito

> **Para quien ejecute:** usar `superpowers:executing-plans` (nativo) o `superpowers:subagent-driven-development`. Cada tarea sigue TDD: primero la prueba, verla fallar, código mínimo, verla pasar. **No hacer commit ni push sin que el dueño lo pida** (memoria del proyecto: publicar con `git push origin master:main` solo a pedido).

**Input**: `specs/014-resumen-consumidor/` — [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/analista-api.md](contracts/analista-api.md), [contracts/ui-resumen.md](contracts/ui-resumen.md), [quickstart.md](quickstart.md)

**Goal**: cambiar la pantalla de resultado de `credito.html` por un resumen para el consumidor (pasos del agente → datos generales → cuentas abiertas → círculos de cuentas con problemas → análisis con la ley), alimentado por un único módulo puro, `analista-credito.js`.

**Architecture**: `lector-credito.js` lee el reporte → `analista-credito.js` (`ThemoraAnalista.analizar(reporte)`) decide resumen, problemas, hallazgos legales y pasos → `credito.html` solo pinta. El análisis viejo por palabras (`evaluateDocument`) se retira en US5.

**Tech Stack**: JavaScript ES2020 sin compilación; `node:test` + `node:assert`; pdf.js/mammoth/SheetJS ya cargados; CSS con los tokens de `styles.css`.

**Tests**: sí — la especificación pide pruebas (Principio IV y quickstart §1).

## Global Constraints

- Se dice «consumidor», nunca «cliente» (FR-023).
- Ningún texto dice «debes», «no pagues», «es ilegal» ni «garantiz…» (FR-018, Principio I).
- SSN: solo `xxx-xx-` + 4 últimos dígitos; el número completo nunca se conserva, se pinta, se imprime, se guarda ni se envía (FR-005).
- Citas legales solo de secciones presentes en `zyron-leyes.js`; se compara la sección base (`§ 1681c(a)(4)` → `§ 1681c`) (FR-017).
- Todo texto que viene del reporte pasa por `escapeHtml` (FR-024).
- Sin dependencias nuevas; `popover` nativo con respaldo `hidden`.
- Colores solo por tokens: `--corrector` (rojo), `--atencion` `#B4561B` (naranja, nuevo), `--resaltador` (amarillo, iniciales en `--tinta`); `--radius` 6px en cuadros, 50% solo en círculos; círculos ≥ 44px.
- Fixtures sintéticos únicamente; ningún dato del reporte real del dueño entra al repositorio.
- Archivos con finales de línea LF.
- Al cerrar cada fase: `node --test tests/` y `graphify update .`.

## Review Focus

1. **Lectura parcial o sin cuentas** — un reporte con 0 cuentas leídas no debe decir «no se encontraron problemas» como si estuviera limpio; debe decir que no se pudieron leer las cuentas. Prueba en T009.
2. **Nombre solo con identificadores** — si todas las entradas son «Name ID #…», se muestra «Nombre no legible en el reporte», nunca un número. Prueba en T004.
3. **SSN completo impreso** — `123-45-6789` produce `ssnUltimos4: '6789'` y ni `JSON.stringify(reporte)`, ni el HTML pintado, ni `paraGuardar()` contienen `123-45` o `123456789`. Pruebas en T005, T013 y T036.
4. **Acreedor sin letras o vacío** — `iniciales('')` y `iniciales('123')` devuelven `'?'`, sin excepción. Prueba en T018.
5. **Cientos de consultas blandas** — 113 blandas de 12 empresas se agrupan en 12 filas, y el cartel tiene desplazamiento propio (`max-height` + `overflow:auto`). Pruebas en T010 y T014.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (otro archivo, sin depender de tareas pendientes).
- **[Story]**: US1–US5 de spec.md.

---

## Phase 1: Setup

**Purpose**: fixture sintético y esqueleto del módulo, que todas las historias usan.

- [X] T001 [P] Crear el fixture sintético `tests/fixtures/credito/experian-resumen.json` (arreglo de `Pagina`, formato de `specs/013-lector-credito-metodologia/contracts/lector-credito-api.md`), con personas y acreedores inventados:
  - Encabezado: `Prepared For` / `ANA PRUEBA EJEMPLO` / `Date Generated  May 20, 2026` / `Report Number`.
  - Bloque `Names` con `ANA PRUEBA EJEMPLO`, `ANA P EJEMPLO` y las líneas `Name ID #10001` y `Name ID #10002` (deben descartarse).
  - `Social Security Number: XXX-XX-4321`.
  - `Addresses`: `100 CALLE FALSA CIUDAD EJEMPLO FL 00000` (actual), `200 AVENIDA DEMO CIUDAD EJEMPLO FL 00000`, `300 CAMINO PRUEBA OTRA CIUDAD FL 00000`.
  - `Phone Numbers`: `(555) 010-0001`, `(555) 010-0002`.
  - Cinco cuentas:
    - (a) `COOPERATIVA DEMO CREDIT UNION`, línea `POTENTIALLY NEGATIVE`, Deposit, `Status Paid, Closed. $144 written off.`, historial 2026 con `CO` en febrero.
    - (b) `COOPERATIVA DEMO CREDIT UNION`, `POTENTIALLY NEGATIVE`, Credit card, `Status Open.`, `Credit Limit $500`, `Balance $294`, historial 2026 con `30` en febrero.
    - (c) `TARJETA EJEMPLO BANK NA`, Credit card, `Open/Never late.`.
    - (d) `AUTOS PRUEBA FINANCIAL`, Auto Loan, `Paid, Closed/Never late.`.
    - (e) `COBROS EJEMPLO LLC`, Collection, `Original Creditor: CLINICA DEMO`, `Balance $800`, `Date of First Delinquency 01/2018`.
  - `Hard Inquiries`: 3 (dos de `BANCO DEMO` en fechas distintas y una de `AUTOS PRUEBA FINANCIAL`).
  - `Soft Inquiries`: 5 de 2 empresas.
  - `Public Records` / `No public records reported.`

  Añadir el resultado esperado del lector en `tests/fixtures/credito/esperado/experian-resumen.json` **después** de T003–T006 (se genera con el lector ya corregido y se revisa a mano).
- [X] T002 [P] Crear `analista-credito.js` en la raíz con el patrón UMD de `lector-credito.js`. Cargarlo en `credito.html` justo después de `<script defer src="lector-credito.js"></script>` (línea ~2925) con `<script defer src="analista-credito.js"></script>`. Crear `tests/analista-credito.test.js` con la cabecera de comentario al estilo de `tests/lector-credito.test.js`.
  ```js
  (function (raiz, fabrica) {
    const api = fabrica();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else raiz.ThemoraAnalista = api;
  })(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    function analizar(reporte, opciones) {
      if (!reporte || !Array.isArray(reporte.cuentas)) throw new TypeError('analizar: se esperaba un Reporte');
      return { resumen: null, abiertas: null, problemas: [], consultas: null, pasos: [], conclusion: '', advertencias: [] };
    }
    return { analizar, REGLAS: [] };
  });
  ```
  Primera prueba: `analizar(null)` lanza `TypeError`, y `analizar({ cuentas: [] })` devuelve las siete claves de `Analisis` (data-model.md). Correr `node --test tests/analista-credito.test.js`: primero FAIL (falta el módulo) y después PASS.

---

## Phase 2: Foundational (lector) — bloquea US1–US3

**Purpose**: que el lector entregue los datos que el resumen necesita (contracts/analista-api.md, «Cambios en ThemoraLector»). Las pruebas existentes de `tests/lector-credito.test.js` y `tests/lector-credito-perfiles.test.js` deben seguir pasando.

- [X] T003 Prueba nueva en `tests/lector-credito.test.js`: «nombres sin identificadores». Con `pag('Names', 'ANA PRUEBA EJEMPLO', 'Name ID #10001', '#22917', 'ANA P EJEMPLO')` y el perfil de Experian (`{ buro: 'experian' }`), `identidad.nombres.map(v => v.texto)` es `['ANA PRUEBA EJEMPLO', 'ANA P EJEMPLO']`. Ver que falla.
- [X] T004 Implementar en `lector-credito.js` (`itemIdentidad` / `leerIdentidadYAvisos`, ~L289–345) un filtro que descarte las entradas de `nombres` que cumplan `/^(?:name|address)\s*id\b|^#?\s*\d[\d\s#-]*$/i`. Añadir la prueba de Review Focus #2: con solo `Name ID #1` y `Name ID #2`, `identidad.nombres` queda vacío. T003 y esta prueba pasan.
- [X] T005 Prueba nueva en `tests/lector-credito.test.js`: «SSN: solo los últimos 4».
  - `Social Security Number: XXX-XX-4321` → `identidad.ssnUltimos4 === '4321'`, y `ssnMostrado === true`.
  - `Social Security Number: 123-45-6789` → `'6789'`, y `JSON.stringify(reporte)` no contiene `123-45` ni `123456789` (Review Focus #3).
  - Sin línea de SSN → `ssnUltimos4 === null`.
  - `Social Security Number: XXX-XX-XXXX` → `ssnUltimos4 === null` y `ssnMostrado === true`.
- [X] T006 Implementar en `lector-credito.js`:
  - En el estado inicial (L758) añadir `ssnUltimos4: null`.
  - En la rama `ssnMostrado` (L324) calcular los cuatro últimos antes de descartar el valor:
    ```js
    const digitos = v.replace(/\D/g, '');
    if (digitos.length >= 4) id.ssnUltimos4 = digitos.slice(-4);
    ```
  - Actualizar el comentario FR-017 para que diga «enmienda 014: solo los últimos 4».
  - Añadir `ssnUltimos4` a la tabla `Identidad` de `specs/013-lector-credito-metodologia/data-model.md` con la nota «(014)».

  T005 pasa.
- [X] T007 Prueba nueva en `tests/lector-credito.test.js`: «Experian: POTENTIALLY NEGATIVE y written off». Con las cuentas (a) y (b) de T001 como `pag(...)`:
  - Ambas tienen `marcaNegativaBuro === true` y (c) no la tiene.
  - (a) tiene `montoChargeOff.valor === 144` y algún `historial` con `codigo === 'charge_off'`.
- [X] T008 Implementar en `lector-credito-perfiles.js` (perfil `experian`) y en `lector-credito.js` (`leerCuentas`, ~L561):
  - Una línea `^POTENTIALLY NEGATIVE$` antes de `? Account Info` marca la cuenta siguiente con `marcaNegativaBuro: true`. Sin tocar los perfiles de otros burós.
  - Si `estado.texto` coincide con `/\$\s?([\d,]+)\s+written off/i` y la cuenta no tiene `montoChargeOff`, se crea `montoChargeOff` con ese monto y el mismo `origen` de `estado`.

  T007 pasa. Correr `node --test tests/lector-credito.test.js tests/lector-credito-perfiles.test.js`: todo PASS. Generar `tests/fixtures/credito/esperado/experian-resumen.json` (T001), revisarlo a mano y añadir la prueba de fixture al bucle existente de `tests/lector-credito.test.js`.

**Checkpoint**: el lector entrega nombres limpios, `ssnUltimos4`, `marcaNegativaBuro` y charge-off por «written off».

---

## Phase 3: User Story 1 — Resumen claro y confiable (P1) 🎯 MVP

**Goal**: cuadro grande de datos generales + cuadro pequeño de cuentas abiertas + carteles de consultas, todos con números que cuadran.

**Independent Test**: con `experian-resumen.json`, el cuadro muestra `ANA PRUEBA EJEMPLO`, `xxx-xx-4321`, `(555) 010-0001 y 1 más`, dirección actual `y 2 más`, `5` cuentas (`2 abiertas, 2 cerradas y 1 en cobranza`; las cobranzas se cuentan aparte), duras `3` y blandas `5`; el cartel de duras lista `BANCO DEMO` con 2 fechas y `AUTOS PRUEBA FINANCIAL` con 1.

### Tests para US1

- [X] T009 [P] [US1] En `tests/analista-credito.test.js`, pruebas de `analizar(leer('experian-resumen.json')).resumen` según la tabla `ResumenGeneral` de data-model.md:
  - `buro: { id:'experian', nombre:'Experian' }`.
  - `fecha.iso` empieza por `'2026-05'`.
  - `nombre: 'ANA PRUEBA EJEMPLO'`.
  - `ssn: { mostrado:true, ultimos4:'4321' }`.
  - `telefono: { actual:'(555) 010-0001', otros:1 }`.
  - `direccion.otras === 2`.
  - `cuentas: { total:5, abiertas:2, cerradas:3 }`.
  - `registrosPublicos === 0`.

  Casos borde:
  - Reporte sin nombres → `nombre === 'Nombre no legible en el reporte'`.
  - Review Focus #1: un reporte con la advertencia `cuentas_no_leidas` (o con 0 cuentas) → `advertencias` incluye «No pudimos leer las cuentas de este reporte» y `problemas` es `[]`.
- [X] T010 [P] [US1] En `tests/analista-credito.test.js`, pruebas de `abiertas` y `consultas`:
  - `abiertas` es `{ total:2, porTipo:[{ tipo:'rotativa', etiqueta:'Tarjetas', cantidad:1 }, …] }`, sin tipos en cero y en el orden fijo de data-model.md.
  - `consultas.duras.total === 3`, y `porEmpresa[0]` es la empresa con la consulta más reciente.
  - `consultas.blandas.total === 5`, y suma promocionales y de revisión de cuenta.
  - Review Focus #5: un reporte armado en la prueba con 113 consultas blandas de 12 empresas → `porEmpresa.length === 12` y la suma de fechas es 113.

### Implementación US1

- [X] T011 [US1] Implementar en `analista-credito.js`:
  - `resumenGeneral(reporte)`, `cuentasAbiertas(reporte)` y `grupoConsultas(reporte, tipos)` según data-model.md. Usar `ThemoraLector.resumen(reporte)` cuando exista (Node: `require('./lector-credito.js')`) para no recontar.
  - Etiquetas de tipo: `rotativa→'Tarjetas'`, `auto→'Préstamos de auto'`, `hipoteca→'Hipotecas'`, `estudiantil→'Préstamos estudiantiles'`, `plazos→'Otros préstamos'`, el resto→`'Otras'`.
  - Teléfono y dirección actual: el de `tipo === 'actual'` o el primero.
  - Fecha en español largo con `MESES_ES`.
  - Conectar todo en `analizar()`.

  T009 y T010 pasan.
- [X] T012 [US1] En `credito.html`, dentro de `#crResults` y **antes** de `.cr-results-head` (que se conserva hasta US5), añadir el marcado de contracts/ui-resumen.md:
  ```html
  <section class="cr-dg copia-lavanda" id="crDatosGenerales" aria-labelledby="crDgTitulo">
    <h3 id="crDgTitulo">Tus datos generales</h3>
    <dl class="cr-dg-lista" id="crDgLista"></dl>
    <div class="cr-dg-consultas">
      <button type="button" class="cr-consulta cr-consulta-dura" id="crConsultasDuras" aria-expanded="false" aria-controls="crCartelDuras"></button>
      <button type="button" class="cr-consulta" id="crConsultasBlandas" aria-expanded="false" aria-controls="crCartelBlandas"></button>
    </div>
    <div class="cr-cartel" id="crCartelDuras" popover role="dialog" aria-labelledby="crCartelDurasT"></div>
    <div class="cr-cartel" id="crCartelBlandas" popover role="dialog" aria-labelledby="crCartelBlandasT"></div>
  </section>
  <section class="cr-abiertas" id="crAbiertas" aria-labelledby="crAbiertasT"></section>
  ```
- [X] T013 [US1] En el script de `credito.html`, añadir `renderResumen(analisis)`:
  - Llena `#crDgLista` con pares `<div><dt>…</dt><dd>…</dd></div>` para Seguro Social, Dirección, Teléfono, Cuentas y Registros públicos. El nombre va como título del cuadro y el buró con la fecha a su derecha.
  - SSN: `'xxx-xx-' + ultimos4` o la frase «Este reporte no muestra tu número de Seguro Social». Si `mostrado` es verdadero y no hay `ultimos4`, la frase es «Tu reporte muestra el número, pero no pudimos leer los últimos cuatro».
  - Los botones de consultas llevan un ícono SVG en línea (lupa sobre hoja, `aria-hidden="true"`), el número y la etiqueta: «consultas duras» / «consultas blandas».
  - Cada cartel tiene un título `<h4 id="crCartelDurasT">`, una `<ul>` con «Empresa: fecha, fecha» y un botón «Cerrar».
  - Se llama desde `render()` con `window.ThemoraAnalista.analizar(reporte)` cuando exista el lector.
  - Todo valor del reporte pasa por `escapeHtml`.
  - Review Focus #3 (pintado): con un reporte cuyo SSN es `123-45-6789`, el `innerHTML` de `#crDgLista` no contiene `123-45`.
- [X] T014 [US1] Comportamiento de los carteles en `credito.html`:
  - Si existe `HTMLElement.prototype.showPopover`, usar `cartel.togglePopover()` y sincronizar `aria-expanded` con el evento `toggle`.
  - Si no, alternar `cartel.hidden` y cerrar con `keydown` Escape y con un clic fuera.
  - Al abrir, el foco va al título del cartel (`tabindex="-1"`); al cerrar, vuelve al botón.
  - CSS del cartel: `max-height:min(60vh,420px); overflow:auto` (Review Focus #5).
- [X] T015 [P] [US1] CSS en el `<style>` de `credito.html` para `.cr-dg`, `.cr-dg-lista`, `.cr-consulta`, `.cr-cartel` y `.cr-abiertas`, solo con tokens:
  - `.cr-dg` usa `background:var(--copia)` y `border-top:4px solid var(--franja)`; la lista va en dos columnas desde 720px y en una en teléfono.
  - El número de `.cr-consulta-dura` va con `font-family:var(--font-display)` y es más grande que el de las blandas.
  - `.cr-abiertas` es un cuadro estrecho (`max-width:22rem`) con fondo `var(--paper)` y borde `var(--renglon)`.
  - Sin mayúsculas sostenidas y sin `·` en los textos.
  - Foco con `var(--focus-ring)`.
- [X] T016 [US1] Crear `tests/credito-resumen-ui.test.js` (estilo de `tests/credito-lector-ui.test.js`: leer `credito.html`, recortar `renderResumen` y ejecutarlo con un `$` mínimo):
  - Existen los ids `crDatosGenerales`, `crDgLista`, `crConsultasDuras`, `crConsultasBlandas`, `crCartelDuras`, `crCartelBlandas` y `crAbiertas`.
  - Los botones tienen `aria-controls` y `aria-expanded`.
  - Con `experian-resumen.json`, la lista contiene `xxx-xx-4321` y `y 1 más`, y no contiene «No visible».
  - Las reglas `.cr-dg`, `.cr-cartel` y `.cr-consulta` no tienen colores hex.
  - `analista-credito.js` carga después de `lector-credito.js`.

**Checkpoint**: US1 sola ya le da al consumidor datos generales correctos (lo viejo sigue debajo). `node --test tests/` PASS; revisar en el navegador con quickstart §2 pasos 3–5.

---

## Phase 4: User Story 2 — Cuentas con problemas en círculos (P1)

**Goal**: solo las cuentas con problemas, como círculos con iniciales y color por gravedad, ordenados.

**Independent Test**: con `experian-resumen.json` aparecen exactamente 3 círculos en este orden: `COBROS EJEMPLO` rojo (cobranza), `COOPERATIVA DEMO` rojo (charge-off, feb. 2026) y `COOPERATIVA DEMO` naranja (atraso de 30 días, feb. 2026). `TARJETA EJEMPLO` y `AUTOS PRUEBA` no aparecen.

### Tests para US2

- [ ] T017 [P] [US2] En `tests/analista-credito.test.js`, prueba de «problemas y gravedad» con cuentas armadas en la prueba (objetos `Cuenta` mínimos con `Valor` del data-model de la 013):
  - `esCobranza` → roja, regla `cobranza`.
  - `montoChargeOff.valor > 0` → roja.
  - Historial con `atraso_30` → naranja.
  - `vencido.valor = 50` → naranja.
  - Solo `marcaNegativaBuro` → amarilla.
  - Al día → no aparece.
  - Charge-off más atraso → una sola entrada roja con dos hallazgos.

  Orden: roja antes que naranja antes que amarilla; dentro de la misma gravedad, la `fechaProblema` más reciente primero; un registro público sale como problema rojo con `id` `rp-0`.
- [ ] T018 [P] [US2] En `tests/analista-credito.test.js`, pruebas de las utilidades:
  - `iniciales('COOPERATIVA DEMO CREDIT UNION') === 'CD'`
  - `iniciales('AMERICREDIT/GM FINANCIAL') === 'AG'`
  - `iniciales('DISCOVER CARD') === 'DI'`
  - `iniciales('WFBNA CARD') === 'WF'`
  - `iniciales('') === '?'` y `iniciales('123') === '?'` (Review Focus #4)
  - `nombreCorto('TARJETA EJEMPLO BANK NA') === 'Tarjeta Ejemplo'` y `nombreCorto(x).length <= 22` para un nombre de 40 letras (termina en `…`)
  - `frase` de la cuenta (a) `=== 'Charge-off, feb. 2026'`, de la (b) `=== 'Atraso de 30 días, feb. 2026'` y de la (e) empieza por `'En cobranza'`

### Implementación US2

- [ ] T019 [US2] Implementar `REGLAS` en `analista-credito.js` con los ids, detección y gravedad de research.md R2: `cobranza`, `charge_off`, `reposesion`, `ejecucion_hipotecaria`, `atraso`, `saldo_vencido`, `marcada_por_buro` y `registro_publico`.
  - Cada `detecta(cuenta, reporte)` devuelve `{ fecha, dato, origen }` o `null`. Por ejemplo, `atraso` toma el mes verificable más reciente con código `/^atraso_\d+$/` y `dato: 'Atraso de ' + n + ' días'`.
  - `analizar()` llena `problemas` con `CuentaConProblema` (data-model.md), usando `iniciales`, `nombreCorto`, `gravedadTexto` (`roja→'Grave'`, `naranja→'Atención'`, `amarilla→'Para revisar'`) y `frase`.
  - `carta` vale `'debt-validation'` en las cobranzas, `'bureau-dispute'` en las demás rojas y naranjas, y `null` en las amarillas.

  T017 pasa.
- [ ] T020 [US2] Implementar y exportar en `analista-credito.js`:
  - `iniciales(acreedor)`: separar por `/[\s\/&,.-]+/` y quitar `BANK, NA, N.A, CARD, CREDIT, UNION, FINANCIAL, SERVICES, SERVICE, INC, LLC, CORP, CO, THE, OF, FSB, USA`. Si quedan dos palabras o más, la primera letra de las dos primeras; si queda una, sus dos primeras letras. Mayúsculas; `'?'` si no hay letras.
  - `nombreCorto`: formato título y sin los sufijos `BANK NA, NA, N.A., INC, LLC, CORP`; si pasa de 22 caracteres, se corta en 21 y se añade `…`.
  - Fechas cortas con `['ene.','feb.','mar.','abr.','may.','jun.','jul.','ago.','sept.','oct.','nov.','dic.']`.

  T018 pasa.
- [ ] T021 [US2] `credito.html`: marcado `<section class="cr-problemas" id="crProblemas" aria-labelledby="crProblemasT"><h3 id="crProblemasT">Cuentas con problemas</h3><div class="cr-circulos" id="crCirculos"></div><div class="cr-analisis" id="crAnalisis" hidden tabindex="-1"></div></section>`, después de `#crAbiertas`. Añadir `renderProblemas(analisis)`:
  - Cada problema es un `<button type="button" class="cr-circulo" data-gravedad="roja|naranja|amarilla" data-id="…" aria-expanded="false" aria-controls="crAnalisis">` con `<span class="cr-iniciales" aria-hidden="true">CD</span>`, `<span class="cr-circulo-nombre">Cooperativa Demo</span>`, `<span class="cr-circulo-frase">Charge-off, feb. 2026</span>` y `<span class="visually-hidden">Gravedad: Grave.</span>`.
  - Sin problemas: `<p class="cr-sin-problemas">No encontramos cuentas con problemas en este reporte.</p>`.
  - Si `analisis.advertencias` dice que no se leyeron las cuentas, mostrar esa frase en lugar de la tranquila (Review Focus #1).
  - Verificar que `.visually-hidden` existe en `styles.css`; si no existe, crearla ahí.
- [ ] T022 [P] [US2] CSS de los círculos en el `<style>` de `credito.html`:
  - En `:root` de `styles.css`, añadir `--atencion:#B4561B;` con un comentario («naranja de gravedad media; ≥4.5:1 con blanco»).
  - `.cr-circulos` es `display:flex; flex-wrap:wrap; gap:var(--space-3)`.
  - `.cr-iniciales` es un círculo de `3.5rem` (≥44px), `border-radius:50%`, con `font-family:var(--font-display)`.
  - Colores por gravedad: `[data-gravedad=roja]` fondo `var(--corrector)` con texto blanco; `naranja` con `var(--atencion)` y texto blanco; `amarilla` con `var(--resaltador)` y texto `var(--tinta)`.
  - `[aria-expanded=true]`: anillo de `3px` en `var(--tinta)` alrededor del círculo.
  - `:focus-visible` usa `var(--focus-ring)`.
  - En teléfono los círculos pasan a varias filas, sin desplazamiento horizontal.
  - Ningún otro elemento recibe movimiento.
- [ ] T023 [US2] En `tests/credito-resumen-ui.test.js`, con `experian-resumen.json`:
  - Hay 3 `.cr-circulo` en orden rojo, rojo, naranja; cada uno tiene `aria-controls="crAnalisis"` y texto oculto de gravedad.
  - No aparece «Tarjeta Ejemplo».
  - Con `experian.json`, el número de círculos es igual a `analizar(...).problemas.length`.
  - `--atencion` existe en `styles.css`.

**Checkpoint**: US1 + US2 funcionan solas; el número de problemas es único (FR-002).

---

## Phase 5: User Story 3 — Análisis con la ley y la carta (P2)

**Goal**: al tocar un círculo se abre su análisis en cuatro partes, con la cita legal y la carta precargada.

**Independent Test**: tocar el círculo del charge-off → «Qué vimos» menciona «$144» y «página»; «Qué dice la ley» cita FCRA § 1681c y § 1681i; «Qué puedes hacer» ofrece «Preparar carta de disputa». Tocar el de cobranza → cita FDCPA § 1692g y ofrece la carta de validación. Ningún texto contiene las palabras prohibidas.

### Tests para US3

- [ ] T024 [P] [US3] En `tests/analista-credito.test.js`, prueba de las invariantes de `REGLAS` (contracts/analista-api.md):
  1. Toda `cita.seccion`, reducida con `.replace(/\(.*$/, '').trim()`, aparece en el texto de `zyron-leyes.js` (`fs.readFileSync`).
  2. Ningún texto de reglas ni de hallazgos generados con `experian-resumen.json` cumple `/\bdebes\b|no pagues|es ilegal|garantiz|\bcliente/i`.
  3. Toda regla roja o naranja tiene `citas.length >= 1` y `textos.opciones.length >= 1`.
  4. Los textos de las reglas no contienen nombres del fixture.
- [ ] T025 [P] [US3] En `tests/analista-credito.test.js`, prueba de `esObsoleta(cuenta, fechaReporte)`:
  - DOFD `01/2018` con fecha del reporte `2026-05-20` → `true` (2018-01 + 7 años + 180 días = 2025-07).
  - DOFD `01/2021` → `false`.
  - Sin DOFD y con un `atraso_30` verificable en `2017-03` → `true`.
  - Sin ninguna fecha → `false`.
  - La cobranza (e) del fixture tiene un hallazgo `obsoleta` que cita `FCRA § 1681c(a)`.

### Implementación US3

- [ ] T026 [US3] Completar `textos` y `citas` de cada regla en `analista-credito.js` con la tabla de research.md R3. Las opciones siguen el orden de R4 (verificar el dato → disputa al buró por correo certificado con acuse → disputa al acreedor → validación con el cobrador si es cobranza; recordar que una queja a la CFPB no es una disputa).

  Texto de la regla `charge_off` (las demás siguen el mismo tono):
  ```js
  textos: {
    queSignifica: 'El acreedor dio esta deuda por perdida en su contabilidad. Para tu historial cuenta como una de las marcas más pesadas, aunque la cuenta ya esté cerrada o pagada.',
    opciones: [
      'Compara el monto, las fechas y el número de cuenta con tus estados de cuenta.',
      'Si algún dato no es correcto, puedes disputarlo directamente con el buró por correo certificado con acuse de recibo y guardar la copia y el comprobante.',
      'También puedes disputarlo con quien reporta la cuenta; esa disputa lo obliga a investigar.',
      'Si el dato es correcto, la ley no obliga a borrarlo antes de su plazo; pagarlo no lo elimina, pero el reporte puede mostrarlo como pagado.'
    ]
  },
  citas: [
    { ley: 'FCRA', seccion: '§ 1681c(a)(4)', texto: 'Una cuenta enviada a cobranza o dada por perdida puede aparecer hasta 7 años.' },
    { ley: 'FCRA', seccion: '§ 1681c(c)', texto: 'Ese plazo empieza 180 días después del primer atraso que llevó a esa situación, y no vuelve a empezar si la deuda se vende o se paga.' },
    { ley: 'FCRA', seccion: '§ 1681i(a)', texto: 'Si lo disputas, el buró debe investigarlo gratis en 30 días (hasta 45 si aportas información nueva) y corregir o borrar lo que no pueda verificar.' }
  ]
  ```
  Escribir también `cobranza` (§ 1692g(b), § 1692e(8), § 1681c(a)(4)), `atraso` (§ 1681c(a)(5), § 1681i(a), § 1681s-2), `saldo_vencido` (§ 1681i(a)), `reposesion` y `ejecucion_hipotecaria` (§ 1681c(a)(5), § 1681i(a)), `registro_publico` (§ 1681c(a)(1), § 1681i(a)) y `marcada_por_buro` (sin cita obligatoria; opciones de revisión).

  `noCubierto` en cobranza y charge-off: «La prescripción de la deuda depende de las leyes de tu estado, que este sitio todavía no tiene cargadas.» T024 pasa.
- [ ] T027 [US3] Implementar `esObsoleta` en `analista-credito.js` (inicio = `dofd.valor.iso` o, si falta, el mes verificable más antiguo con `atraso_*`; fin = inicio + 7 años + 180 días; obsoleta si fin < fecha del reporte, o `opciones.hoy`) y la regla `obsoleta`, que añade un hallazgo sin cambiar la gravedad. Ajustar research.md R2 (fila `obsoleta`) a esta definición. T025 pasa.
- [ ] T028 [US3] `credito.html`: añadir `renderAnalisis(problema)`, que llena `#crAnalisis` con:
  - `<h4 tabindex="-1">` con el nombre y la gravedad.
  - Por cada hallazgo, las secciones «Qué vimos», «Qué significa para ti», «Qué dice la ley» (lista `<li><strong>FCRA § 1681c(a)(4)</strong> texto</li>`) y «Qué puedes hacer» (`<ol>`).
  - `noCubierto` como nota.
  - El botón de la carta.

  Delegación de clics en `#crCirculos`:
  - Al tocar un círculo: `aria-expanded="true"` en ese botón y `"false"` en los demás, `#crAnalisis.hidden = false`, se pinta y se enfoca el `<h4>`.
  - Al tocar otra vez el mismo círculo: se cierra.

  Todo texto del reporte pasa por `escapeHtml`.
- [ ] T029 [US3] Carta precargada en `credito.html`: el botón del análisis reutiliza `renderBureauDisputeForm(item, formId, bureauKey)` o `renderDebtValidationForm(item, formId)` (L3389–3424) dentro de un `<form class="cr-solution-form" hidden>`, con `item = { title, solutionType: problema.carta, issueKey: regla, issueArg: dato }` y el mismo `cr-solution-toggle`.
  - En la validación de deuda, `collectorName` y `accountReference` se precargan con `datosCarta.acreedor` y `datosCarta.numero` (ya enmascarado).
  - En la disputa, el `<select name="creditBureau">` sale con el buró detectado.
  - Los manejadores de envío existentes deben seguir funcionando: delegación en `results`, L3747 en adelante.
- [ ] T030 [US3] En `tests/credito-resumen-ui.test.js`:
  - Abrir el análisis del charge-off con `renderAnalisis` produce las cuatro partes, «página», `§ 1681c` y `§ 1681i`.
  - El de la cobranza contiene `§ 1692g` y un formulario con `data-solution-type="debt-validation"`.
  - El HTML pintado no contiene las palabras prohibidas.
  - Un acreedor con `<script>` en el nombre sale escapado.

**Checkpoint**: US1–US3 completas.

---

## Phase 6: User Story 4 — Pasos del agente en vivo (P2)

**Goal**: la espera muestra el trabajo real en cuatro pasos.

**Independent Test**: los pasos aparecen en orden; el último dice «Encontré 3 cuentas con problemas» con `experian-resumen.json` (igual que los círculos); si la lectura falla, el paso en curso queda `fallido`.

- [ ] T031 [P] [US4] En `tests/analista-credito.test.js`: `analizar(...).pasos` tiene los ids `observar`, `leer`, `revisar` y `concluir`, todos en `estado:'hecho'`.
  - `pasos[0].texto` incluye `Experian` y `2026`.
  - `pasos[1].texto` incluye `5 cuentas` y `3 consultas duras`.
  - `pasos[2].texto === 'Revisé cada cuenta contra la FCRA y la FDCPA'`.
  - `pasos[3].texto === 'Encontré 3 cuentas con problemas'` (`'Encontré 1 cuenta con problemas'` en singular, `'No encontré cuentas con problemas'` con cero).
- [ ] T032 [US4] Implementar `pasos` en `analista-credito.js` (data-model `PasoAgente`). T031 pasa.
- [ ] T033 [US4] `credito.html`: reemplazar el contenido de `#crProgress` por `<ol class="cr-pasos" id="crPasos" aria-live="polite">` con cuatro `<li data-estado="pendiente">`. En `runAnalysis()` (L3714):
  - El paso «observar» pasa a `en_curso` con el texto «Leyendo la página N de M» dentro del callback de `extractPdf`.
  - Al terminar `leerReporte`, «observar» y «leer» quedan `hecho` con sus textos.
  - Tras `analizar`, «revisar» y «concluir» quedan `hecho` con los textos de `analisis.pasos`.
  - Se borra `await new Promise(resolve => setTimeout(resolve, 400));`.
  - En el `catch`, el paso en curso queda `fallido` y se muestra `#crError` como hoy.
  - La lista de pasos queda visible encima del resultado (no se oculta al terminar).
- [ ] T034 [P] [US4] CSS de `.cr-pasos`:
  - Marcador por estado con tokens: hecho = palomita en `var(--good)`; en curso = punto en `var(--accion)`; fallido = cruz en `var(--corrector)`; pendiente = `var(--muted)`.
  - El único movimiento es un pulso suave del punto en curso, dentro de `@media (prefers-reduced-motion: no-preference)`.
  - Añadir a `tests/credito-resumen-ui.test.js`: `#crPasos` tiene `aria-live`, la animación vive solo dentro de ese media query y el bloque de `setTimeout(resolve, 400)` ya no existe.

**Checkpoint**: US4 completa.

---

## Phase 7: User Story 5 — Una pantalla que no aturde (P3)

**Goal**: retirar lo viejo, una sola verdad, «consumidor», e imprimir y guardar con el resumen nuevo.

**Independent Test**: tras el análisis, las únicas secciones visibles son los pasos, los datos generales, las cuentas abiertas, las cuentas con problemas (con su análisis), las acciones y el aviso. Ningún hallazgo se repite; no aparece «cliente».

- [ ] T035 [US5] Retirar de `credito.html`:
  - El marcado `.cr-results-head`, `#crKpis`, `.cr-summary`, `#crCuentas`, `.cr-groups` y `.cr-strategy`.
  - Las funciones que ya no se usan: `evaluateDocument`, `stripReportNoise`, `renderFinding`, `renderStrategy`, `renderReportSummary`, `summaryFromReport`, el bloque `MESES_ES`…`renderCuentas` (fichas `lc-*`) y `firstNumber`/`count` si nadie más los usa (confirmar con `graphify query "evaluateDocument callers"` y Grep).
  - Su CSS (`.cr-kpi*`, `.cr-summary*`, `.lc-*`, `.cr-group*`, `.cr-finding*`, `.cr-strategy*`).

  Sin `ThemoraLector` o `ThemoraAnalista`, `runAnalysis` muestra `#crError` con «No pudimos cargar el lector de reportes. Recarga la página e inténtalo otra vez.», sin caer a un análisis por palabras (FR-001).
- [ ] T036 [US5] Implementar `paraGuardar(analisis)` en `analista-credito.js`. Devuelve `{ health, tone, conclusion, score:null, utilization:null, negatives, positives:[], accountsSummary:{ count, cardCount, byType }, inquiriesSummary:{ hard, soft, total } }`, donde:
  - `negatives` es `problemas.map(p => ({ title: p.frase, priority: p.gravedadTexto }))`.
  - `health` y `tone`: si hay alguna roja, `'Atención prioritaria'`/`'critical'`; si hay problemas, `'Hay margen de mejora'`/`'attention'`; si no, `'Perfil sin alertas obvias'`/`'stable'`.

  Prueba en `tests/analista-credito.test.js`: con un reporte cuyo SSN es `123-45-6789`, `JSON.stringify(paraGuardar(a))` no contiene `6789`, `ANA`, `CALLE` ni `555` (Review Focus #3). `CCAuth.resumenSeguro()` de `auth.js` acepta la forma (prueba con `require('../auth-helpers.js')` si la expone; si no, comparar contra las claves que lee `auth.js:358-371`).

  En `credito.html`: `window.__ccLastAnalysis = ThemoraAnalista.paraGuardar(analisis)`.
- [ ] T037 [US5] Identidad sin `evaluateDocument`: construir `detectedValues` para el formulario de corrección de identidad desde `reporte.identidad` (nombres, teléfonos y direcciones con `identityDisplayValue`).
  - Ofrecerlo como enlace discreto dentro de `#crDatosGenerales`, «¿No reconoces alguno de estos datos?», que abre `renderIdentityForm` plegado.
  - `tiposDeTarjeta` sigue decidiendo qué tarjeta se ofrece.
  - Ajustar `tests/credito-identidad.test.js` solo en la fuente de los datos (la lista sigue agrupada, sin nada marcado y con la misma analítica). Ninguna aserción se debilita.
- [ ] T038 [US5] Pruebas que vigilaban lo retirado:
  - **`tests/credito-lector-ui.test.js`**: borrar las pruebas de fichas (`renderCuentas`, historial, «no reportado», resaltador de DOFD) y conservar las de orden de carga y del botón «Leer mi reporte».
  - **`tests/credito-fase0.test.js`**: portar FR-001 a FR-004 a `tests/analista-credito.test.js`:
    - la identidad nunca es problema;
    - la cobranza sin órdenes y con plazo;
    - las consultas duras nunca son problema;
    - sin palabras prohibidas.
  - **FR-005** («el analizador viejo no existe») se amplía a que `evaluateDocument` ya no está en `credito.html`.
  - Anotar en el encabezado de cada archivo qué se movió y por qué (constitución: no se debilita una prueba; se traslada).
- [ ] T039 [US5] Lenguaje: cambiar en `credito.html` todo «cliente» que se refiera a la persona por «consumidor» (Grep `-i "cliente"` en la sección del analizador y en sus textos de JS). Prueba en `tests/credito-resumen-ui.test.js`: entre `id="analizar-reporte"` y su `</section>`, y en `analista-credito.js`, no aparece `/\bclientes?\b/i`.
- [ ] T040 [US5] Impresión: en el `@media print` de `credito.html`:
  - Ocultar los pasos, los botones y los carteles.
  - Mostrar los datos generales, las cuentas abiertas, la lista de problemas y **todos** los análisis: al imprimir se pinta cada análisis en un contenedor `#crAnalisisImpresion`, oculto en pantalla.
  - Los círculos se imprimen con borde y la gravedad en texto.
  - Prueba: existe la regla de impresión y `#crAnalisisImpresion` se llena con un análisis por problema.
- [ ] T041 [US5] Prueba final de la historia en `tests/credito-resumen-ui.test.js`: dentro de `#crResults` ya no existen los ids `crKpis`, `crSummaryGrid`, `crCuentas`, `crNegativeList` ni `crStrategyList`, y ninguna `frase` de problema aparece dos veces en el HTML pintado (SC-006).

**Checkpoint**: las cinco historias completas.

---

## Phase 8: Polish & Cross-Cutting

- [ ] T042 Correr `node --test tests/`: todo PASS. Reportar cualquier fallo tal cual.
- [ ] T043 Revisión manual con quickstart.md §2 (pasos 1–11) con un PDF real de Experian del dueño, sin copiarlo al proyecto; incluye 375px y movimiento reducido. Tomar una captura de la pantalla de resultado y revisarla con la guía de `frontend-design` (una sola cosa llamativa: los círculos; nada más con movimiento; contraste).
- [ ] T044 [P] Medir SC-004: altura de `#crResults` con un reporte de 16 cuentas, antes y después (DevTools); anotarla en `specs/014-resumen-consumidor/quickstart.md`.
- [ ] T045 [P] `graphify update .` y confirmar con `graphify explain "analista-credito.js"` que el módulo aparece conectado con `credito.html` y `lector-credito.js`.
- [ ] T046 [P] Actualizar la memoria `analizador-credito-agente.md` (qué quedó hecho y qué sigue: IA híbrida, más leyes, idiomas) y marcar en `specs/013-lector-credito-metodologia/spec.md` que las fases 2 y 4 avanzaron vía 014.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001–T002)**: sin dependencias.
- **Foundational (T003–T008)**: depende de T001; bloquea US1–US3.
- **US1 (T009–T016)**: depende de Foundational.
- **US2 (T017–T023)**: depende de Foundational; usa los cuadros de US1 solo para el orden visual (puede probarse sola).
- **US3 (T024–T030)**: depende de US2 (`REGLAS` y círculos).
- **US4 (T031–T034)**: depende de US1 (`analizar` con resumen) y de US2 (número de problemas).
- **US5 (T035–T041)**: depende de US1–US3 (no se retira nada sin su reemplazo).
- **Polish (T042–T046)**: al final.

### Within Each Story

Prueba → verla fallar → implementación mínima → pasar → CSS/marcado → prueba de vista.

### Parallel Opportunities

- T001 ∥ T002.
- T009 ∥ T010 (mismo archivo de pruebas pero bloques distintos; hacerlas en serie si las ejecuta una sola persona).
- T015 ∥ T013/T014 (CSS frente a JS).
- T017 ∥ T018; T022 ∥ T021.
- T024 ∥ T025; T031 ∥ T034.
- T044 ∥ T045 ∥ T046.

## Parallel Example: User Story 2

```text
Task: "T017 prueba de problemas y gravedad en tests/analista-credito.test.js"
Task: "T018 prueba de iniciales/nombreCorto/frase en tests/analista-credito.test.js"
Task: "T022 CSS de círculos y token --atencion en credito.html / styles.css"
```

## Implementation Strategy

### MVP (US1)

Setup → Foundational → US1 → **parar y validar** con quickstart §2 pasos 3–5. El consumidor ya ve datos generales correctos aunque lo viejo siga debajo.

### Entrega incremental

US1 → US2 (círculos) → US3 (análisis y carta) → US4 (pasos) → US5 (limpieza). Cada una cierra con `node --test tests/`, revisión en el navegador y `graphify update .`. Publicar solo cuando el dueño lo pida.

## Notes

- Total: 46 tareas.
- Las líneas citadas de `credito.html` (L2925, L3389–3424, L3714, L3747) y de `lector-credito.js` (L289–345, L561, L758) son del 2026-10-01; confirmarlas con Grep antes de editar.
- Ningún fixture ni documento lleva datos del reporte real del dueño.
