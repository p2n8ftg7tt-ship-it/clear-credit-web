# El agente en la página del analizador (Fase 4) — Implementation Plan

> **For agentic workers:** TDD por tarea (prueba → ver que falla → código mínimo → ver que pasa). Marca cada paso `[X]`. Contratos: `contracts/vista-api.md`. Decisiones D1–D6 en `plan.md`. Bloque A = tareas de la 014 (su texto completo está en `specs/014-resumen-consumidor/tasks.md`).

**Goal:** Terminar el resumen local de la 014 y poner encima el agente (marcas, pasos en vivo, resultado, cartas) en `credito.html`.

**Spec:** `specs/019-agente-en-credito/spec.md`

## Global Constraints

- Sin dependencias nuevas; LF; sin `console.log` en el código de producción; textos en español; «consumidor», nunca «cliente».
- **No tocar:** `lector-credito.js`, `lector-credito-perfiles.js`, `herramientas-credito.js`, `cartas-bilingues.js`, `cartas-agente.js`, `netlify/functions/**`.
- `agente-credito-cliente.js`: solo se agrega y exporta `letrasDe`.
- Todo texto que venga del reporte o del agente se pinta escapado. Nada envía cartas (no `mailto:`, no `<form action>`, ningún `fetch` en la vista).
- La analítica solo con `data-umami-event` o eventos sin propiedades: `agente-pedido`, `agente-terminado`, `agente-respaldo`, `carta-aprobada`, `carta-copiada`.
- Estilo: tokens de `styles.css` (Mar en calma); `--radius` 6px; foco con `--focus-ring`; nada de colores sueltos; 375 px sin desplazamiento horizontal; un solo movimiento (el pulso del paso en curso de la 014).
- No se debilita ninguna prueba existente; las pruebas que la 014 manda mover se **trasladan** (014 T038).
- En Windows la suite completa es `node --test tests/*.test.js`. Hoy fallan 19 (tasas y sistema visual); no puede aparecer ninguna falla nueva.
- **Commits:** los hace Claude al final.

## Review Focus

1. **Acreedor con `<script>` o comillas**: escapado en los círculos, en la lista de marcas, en el plan, en los pasos y en las tarjetas. Pruebas en las Tasks 2 y 3.
2. **Doble clic en «Analizar»**: una sola llamada al agente (el botón se desactiva mientras corre). Prueba en la Task 4.
3. **Analizar otro reporte después del agente**: se limpian el resultado, las marcas y las cartas. Prueba en la Task 4.
4. **Resultado `modo: 'ia'` con listas vacías**: no aparecen títulos sin contenido. Prueba en la Task 2.
5. **Escribir en un campo de una carta aprobada**: vuelve a borrador y se oculta la carta final. Prueba en la Task 3.

---

## Bloque A — terminar la 014

### Task 1: Tareas pendientes de la 014 (US2, US3, US4, US5)

**Files:** los indicados en cada tarea de `specs/014-resumen-consumidor/tasks.md`.

- [X] **Step 1:** Ejecutar T017–T023 (US2: reglas, círculos y su CSS) tal como están escritas, con TDD.
- [X] **Step 2:** Ejecutar T024–T030 (US3: textos legales, `esObsoleta`, `renderAnalisis` y carta precargada).
- [X] **Step 3:** Ejecutar T031–T034 (US4: pasos de lectura en `#crPasos`).
- [X] **Step 4:** Ejecutar T035–T041 (US5: retirar lo viejo, `paraGuardar`, identidad sin `evaluateDocument`, trasladar pruebas, «consumidor», impresión y prueba final).
- [X] **Step 5:** En `specs/014-resumen-consumidor/tasks.md`, marcar `[X]` T017–T041. En T042–T046, poner `[X]` con la nota «cubierta por 019 (Task 6)».
- [X] **Step 6:** `node --test tests/analista-credito.test.js tests/credito-resumen-ui.test.js tests/credito-lector-ui.test.js tests/credito-fase0.test.js tests/credito-identidad.test.js` → PASS.

---

## Bloque B — el agente en la página

### Task 2: Vista del agente — marcas, pasos y resultado

**Files:** crear `agente-credito-vista.js` y `tests/agente-credito-vista.test.js`; modificar `agente-credito-cliente.js` (agregar `letrasDe`) y `tests/agente-credito-cliente.test.js`.

**Produce:** `ThemoraAgenteVista.{ AVISO, TIPO_PASO, MOTIVO_RESPALDO, FALTA, escapar, textoEvento, renderMarcar, renderResultado, renderAgenteEnCirculo }` y `ThemoraAgenteCredito.letrasDe(reporte) → { [cuentaId]: letra }`.

- [X] **Step 1: Tests**

`tests/agente-credito-cliente.test.js` (agregar):

```js
test('letrasDe: mismo orden que el etiquetador', () => {
  const r = cargar('agente/acme-zeta.json');
  assert.deepStrictEqual(C.letrasDe(r), { A: 'A', B: 'B', C: 'C', D: 'D' });
  const otro = { cuentas: [{ id: 'x-1' }, { id: 'x-2' }] };
  assert.deepStrictEqual(C.letrasDe(otro), { 'x-1': 'A', 'x-2': 'B' });
});
```

`tests/agente-credito-vista.test.js`:

```js
/* Vista del agente en credito.html (spec 019). Ejecutar: node --test tests/agente-credito-vista.test.js. Datos SINTÉTICOS. */
const test = require('node:test');
const assert = require('node:assert');
const V = require('../agente-credito-vista.js');
const AY = require('./agente-credito-ayuda.js');
const C = require('../agente-credito-cliente.js');

const PROHIBIDAS = /\bdebes\b|ilegal|garantiz|debe eliminarse|subir[aá] tu puntaje|\bclientes?\b/i;
const privado = () => C.etiquetarReporte(AY.acme()).privado;
const IA = () => Object.assign({ modo: 'ia', hoy: '2026-10-01' }, AY.RESULTADO_VALIDO);

test('textoEvento: tabla del contrato, con el acreedor de la cuenta', () => {
  const p = privado();
  assert.strictEqual(V.textoEvento('etiquetando', p), 'Quitando tus datos personales antes de enviar');
  assert.strictEqual(V.textoEvento('enviando:1', p), 'Enviando tu reporte sin datos personales al agente');
  assert.strictEqual(V.textoEvento('enviando:3', p), 'El agente sigue revisando (paso 3)');
  assert.strictEqual(V.textoEvento('herramienta:calcularFechaSalida:B', p), 'Calculando hasta cuándo puede aparecer la cuenta B (ZETA COLLECTIONS)');
  assert.strictEqual(V.textoEvento('herramienta:calcularFechaSalida:Z', p), 'Calculando hasta cuándo puede aparecer la cuenta Z');
  assert.strictEqual(V.textoEvento('respaldo:limite_diario', p), V.MOTIVO_RESPALDO.limite_diario);
  assert.strictEqual(V.textoEvento('terminado', p), 'Listo');
  assert.strictEqual(V.textoEvento('raro', p), 'Trabajando…');
});

test('renderMarcar: casillas sin marcar, valores escapados (Review Focus 1)', () => {
  const html = V.renderMarcar({ cuentas: [{ id: 'A', acreedor: 'ACME <script>x</script>', frase: 'Charge-off, mar. 2021' }], datos: [{ etiqueta: 'Nombre 2', tipo: 'Nombre', valor: 'ANA "R"' }] });
  assert.match(html, /name="marca-cuenta" value="A"/);
  assert.match(html, /name="marca-dato" value="Nombre 2"/);
  assert.ok(!/checked/.test(html));
  assert.ok(!html.includes('<script>x'));
  assert.ok(html.includes('&lt;script&gt;') && html.includes('&quot;R&quot;'));
  assert.match(html, /¿Hay algo que no reconoces\?/);
  assert.match(html, /data-accion="cancelar-marcar"/);
});

test('renderResultado ia: seis partes, cuentas con nombre, fuente de cada hecho y aviso', () => {
  const html = V.renderResultado(IA(), privado());
  ['Lo que encontró el agente', 'Cuenta A (ACME BANK)', 'Disputar', 'Pagar', 'Esperar', 'data-fuente="reporte"', 'data-fuente="herramienta"',
    'del reporte', 'calculado', 'Preguntas para ti', 'Para verificar', V.AVISO].forEach((x) => assert.ok(html.includes(x), x));
  assert.ok(!PROHIBIDAS.test(html.replace(V.AVISO, '')));
});

test('renderResultado ia: listas vacías no pintan su título (Review Focus 4)', () => {
  const r = IA(); r.despues = []; r.datosPersonales = [];
  const html = V.renderResultado(r, privado());
  assert.ok(!html.includes('Después') && !html.includes('Datos personales para revisar'));
});

test('renderResultado local: motivo y las cuatro herramientas', () => {
  const { paraHerramientas } = C.etiquetarReporte(AY.acme());
  const local = C.analisisLocal(paraHerramientas, { hoy: '2026-10-01', motivo: 'limite_diario' });
  const html = V.renderResultado(local, privado());
  [V.MOTIVO_RESPALDO.limite_diario, 'Fechas de salida', '2028-09', 'estimada', 'Uso de tus tarjetas', '89%', 'Posibles deudas repetidas', 'Consultas duras en 12 meses', V.AVISO]
    .forEach((x) => assert.ok(html.includes(x), x));
  const sinDatos = Object.assign({}, local, { herramientas: { fechasSalida: null, utilizacion: null, duplicados: null, consultasDuras: null } });
  assert.ok(V.renderResultado(sinDatos, privado()).includes('No se pudo calcular'));
});

test('renderAgenteEnCirculo: solo los pasos de esa cuenta', () => {
  const html = V.renderAgenteEnCirculo(IA(), 'A', privado());
  assert.ok(html.includes('Lo que dice el agente') && html.includes('Disputar') && !html.includes('Pagar'));
  assert.strictEqual(V.renderAgenteEnCirculo(IA(), 'D', privado()), '');
  assert.strictEqual(V.renderAgenteEnCirculo({ modo: 'local' }, 'A', privado()), '');
});

test('escapar cubre & < > " \'', () => {
  assert.strictEqual(V.escapar('a&b<c>"d\'e'), 'a&amp;b&lt;c&gt;&quot;d&#39;e');
});
```

- [X] **Step 2: Run** `node --test tests/agente-credito-vista.test.js tests/agente-credito-cliente.test.js` → FALLA.
- [X] **Step 3: Implement** `letrasDe` (reutilizando `letra()`) y `agente-credito-vista.js` según el contrato. UMD `window.ThemoraAgenteVista`.
- [X] **Step 4: Run** → PASS.

### Task 3: Vista del agente — tarjetas de cartas

**Files:** `agente-credito-vista.js`, `tests/agente-credito-vista.test.js`

**Consume:** `ThemoraCartasAgente` (spec 018). **Produce:** `ThemoraAgenteVista.renderCarta(borrador, textoFinal?) → html`.

- [X] **Step 1: Tests** (agregar):

```js
const CA = require('../cartas-agente.js');
const REM = { givenNames: 'ANA', firstSurname: 'RUIZ', secondSurname: '', street: '1 MAIN ST', city: 'MIAMI', state: 'FL', postalCode: '33101', currentPhone: '3055550100' };
const borrador = () => CA.crearBorradores(IA(), C.etiquetarReporte(AY.acme()), { buro: 'equifax' })[0];

test('renderCarta incompleta: campos, faltantes en español y sin carta final', () => {
  const html = V.renderCarta(borrador());
  ['data-campo="remitente.givenNames"', 'data-campo="remitente.postalCode"', 'data-confirmacion="inexacta"', 'data-confirmacion="yoEnvio"',
    'Falta: tu nombre, tu dirección', 'Disputa al buró', 'Equifax Information Services LLC', 'ACME BANK'].forEach((x) => assert.ok(html.includes(x), x));
  assert.ok(!html.includes('cr-letter-pair') && !html.includes('copiar-carta'));
});

test('renderCarta aprobada: dos columnas, copiar y guía; sin envío', () => {
  const b = CA.confirmar(CA.actualizarDatos(borrador(), { remitente: REM }), { inexacta: true, yoEnvio: true });
  const html = V.renderCarta(b, CA.textoFinal(b, { fecha: new Date(2026, 9, 2) }));
  ['data-estado="aprobada"', 'Aprobada: lista para que la envíes tú', 'cr-letter-pair', 'cr-letter-cell en', 'ACCOUNTS I AM DISPUTING',
    'data-accion="copiar-carta"', 'Copiar carta en inglés', 'correo certificado'].forEach((x) => assert.ok(html.includes(x), x));
  assert.ok(!/mailto:|<form[^>]*action=/i.test(html));
  assert.ok(html.includes('value="ANA"'));
});

test('renderCarta: cambiar un dato tras aprobar oculta la carta final (Review Focus 5)', () => {
  let b = CA.confirmar(CA.actualizarDatos(borrador(), { remitente: REM }), { inexacta: true, yoEnvio: true });
  b = CA.actualizarDatos(b, { remitente: Object.assign({}, REM, { street: '2 OAK RD' }) });
  const html = V.renderCarta(b);
  assert.ok(html.includes('Marca las dos confirmaciones para aprobarla') && !html.includes('cr-letter-pair'));
});

test('renderCarta: validación pide el cobrador; datos escapados', () => {
  const r = Object.assign(IA(), { cartas: [{ tipo: 'debt-validation', cuentas: [{ letra: 'B', motivo: 'no_aplica' }], subtipo: 'no_aplica', etiquetas: [] }] });
  const b = CA.actualizarDatos(CA.crearBorradores(r, C.etiquetarReporte(AY.acme()), { buro: 'equifax' })[0], { remitente: Object.assign({}, REM, { givenNames: '<b>ANA</b>' }) });
  const html = V.renderCarta(b);
  assert.ok(html.includes('Validación de deuda') && html.includes('data-campo="cobrador.calle"') && html.includes('los datos del cobrador'));
  assert.ok(!html.includes('<b>ANA</b>') && html.includes('&lt;b&gt;ANA&lt;/b&gt;'));
});
```

- [X] **Step 2: Run** → FALLA. **Step 3: Implement** `renderCarta`. **Step 4: Run** → PASS.

### Task 4: Cableado en `credito.html`

**Files:** `credito.html`, crear `tests/credito-agente-ui.test.js`

- [X] **Step 1: Tests** — `tests/credito-agente-ui.test.js`. Debe leer `credito.html` como texto y comprobar:
  1. **Scripts (D2):** `herramientas-credito.js`, `agente-credito-cliente.js`, `cartas-agente.js` y `agente-credito-vista.js` están con `defer`, en ese orden y **después** de `analista-credito.js`.
  2. **Marcado dentro de `#crResults`:** `<section class="cr-agente" id="crAgente" aria-labelledby="crAgenteT">` con `<h3 id="crAgenteT">Análisis con el agente</h3>`, `<button type="button" id="crAgenteBoton" data-umami-event="agente-pedido">Analizar con el agente</button>`, `<p id="crAgenteSesion" hidden>`, `<div id="crMarcar" hidden>`, `<div id="crAgenteResultado" hidden>` y `<section class="cr-cartas-agente" id="crCartasAgente" aria-labelledby="crCartasAgenteT" hidden>` con `<h3 id="crCartasAgenteT">Tus cartas</h3>`.
  3. **El bloque `/* 019-agente:inicio */ … /* 019-agente:fin */`** existe y dentro aparecen `analizarConAgente(`, `CCAuth.getAccessToken`, `letrasDe(`, `crearBorradores(`, `actualizarDatos(`, `confirmar(`, `textoFinal(`, `renderAgenteEnCirculo(` y `navigator.clipboard`. Dentro del bloque **no** aparecen `mailto:`, `fetch(` (la llamada la hace `analizarConAgente`) ni `innerHTML = ` con texto sin pasar por la vista.
  4. **Ejecutar el bloque en Node** con el mismo método de recorte y DOM mínimo de `tests/credito-resumen-ui.test.js`, exponiendo `iniciarAgente(estado)`. Con `CCAuth` falso sin token, tocar el botón muestra `#crAgenteSesion` y `analizarConAgente` **no** se llama (SC-004). Con token, tocar el botón pinta `renderMarcar` en `#crMarcar`; «Cancelar» no llama al agente; confirmar con la cuenta B marcada llama una sola vez, aunque se envíe dos veces seguidas (Review Focus 2), con `marcadas.cuentaIds = ['B']`. Usar `analizarConAgente` falso que devuelve `{ modo:'ia', ... RESULTADO_VALIDO }` y emite eventos.
  5. **Después del resultado:** `#crAgenteResultado` contiene «Lo que encontró el agente», `#crCartasAgente` deja de estar oculto con 1 tarjeta, y cada evento quedó como `<li>` en `#crPasos`.
  6. **`limpiarAgente()`** (la llama `runAnalysis` al empezar un reporte nuevo) vacía y oculta `#crMarcar`, `#crAgenteResultado` y `#crCartasAgente` (Review Focus 3).
  7. **CSS:** las reglas de `.cr-agente`, `.cr-marcar`, `.cr-agente-plan`, `.cr-fuente` y `.cr-carta-agente` usan solo `var(--…)` para el color y se apilan en `@media (max-width: 600px)`.
- [X] **Step 2: Run** → FALLA.
- [X] **Step 3: Implement** en `credito.html`:
  - el marcado después de `#crProblemas`;
  - los cuatro `<script defer>`;
  - el bloque `019-agente` con `iniciarAgente` y `limpiarAgente`;
  - la delegación de eventos: botón, envío o cancelación de las marcas, `input`/`change` en `[data-campo]` y `[data-confirmacion]` (vuelve a pintar esa tarjeta), y `copiar-carta` (con `navigator.clipboard` y, si falla, el mismo respaldo con textarea de hoy, L4260);
  - los eventos de analítica: `agente-terminado`, `agente-respaldo`, `carta-aprobada` y `carta-copiada`;
  - en el `renderAnalisis` de la 014, después del análisis local, agregar `renderAgenteEnCirculo(resultado, letras[cuentaId], privado)` cuando haya resultado;
  - llamar a `limpiarAgente()` al inicio de `runAnalysis`;
  - el CSS con tokens.
- [X] **Step 4: Run** → PASS.

### Task 5: Recorrido completo (SC-001)

- [X] **Step 1: Test** en `tests/credito-agente-ui.test.js`: con el entorno de `tests/agente-credito-ayuda.js` (función real con IA simulada) y el `analizarConAgente` **real**:
  - ACME/ZETA → marcas vacías → resultado `ia`;
  - tarjeta de la disputa: llenar los campos por `[data-campo]` y marcar las dos confirmaciones;
  - la tarjeta queda `data-estado="aprobada"` con `ACCOUNTS I AM DISPUTING`;
  - `copiar-carta` llama a un `navigator.clipboard.writeText` falso con un texto que contiene `Equifax Information Services LLC` y **no** contiene `CUENTAS QUE DISPUTO` (solo inglés).
- [X] **Step 2: Run** → PASS (si falla, corregir el cableado, no la prueba).

### Task 6: Cierre

- [X] **Step 1:** `node --test tests/*.test.js` → solo los 19 fallos previos; ninguno nuevo.
- [X] **Step 2:** `grep -nE "console\.log|mailto:" agente-credito-vista.js` → vacío; `grep -n "\bcliente" agente-credito-vista.js` → vacío.
- [X] **Step 3:** `git status --short` (solo lectura): solo cambiaron los archivos de este plan y los de la 014 Bloque A.
- [ ] **Step 4 (pendiente del dueño):** Revisión visual en 375 px y 1440 px (SC-006): **la hace el dueño**; anotar el resultado en `specs/019-agente-en-credito/notas-revision.md`.
- [X] **Step 5:** Commits, `graphify update .` y la memoria del proyecto → **los hace Claude**.

## Cobertura

| Requisito | Task |
|---|---|
| FR-001 | 1 |
| FR-002–FR-006 | 2, 4 |
| FR-007–FR-011 | 2, 4 |
| FR-012–FR-016 | 3, 4, 5 |
| FR-017–FR-020 | 2, 4, 6 |
