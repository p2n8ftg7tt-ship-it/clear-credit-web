# Cartas del agente (Fase 3) — Implementation Plan

> **For agentic workers:** implementa tarea por tarea con TDD (prueba primero → ver que falla → código mínimo → ver que pasa). Marca cada paso `[X]` al terminarlo. Contratos exactos en `contracts/cartas-agente-api.md`; decisiones D1–D8 en `plan.md`.

**Goal:** El agente propone hasta 3 cartas (listas cerradas); el servidor las valida; el dispositivo las convierte en borradores bilingües que solo el consumidor aprueba.

**Spec:** `specs/018-cartas-agente/spec.md`

## Global Constraints

- Sin dependencias nuevas, sin `package.json`, archivos nuevos en LF, sin `console.log` en el código de producción.
- **No tocar:** `credito.html`, `lector-credito.js`, `lector-credito-perfiles.js`, `analista-credito.js`, `herramientas-credito.js`, `netlify/functions/coach.js`.
- En `cartas-bilingues.js` solo se agregan `BUROS` y el bloque `cuentas-disputadas`. **Ningún texto existente cambia:** las 50 pruebas de `tests/cartas-bilingues.test.js` deben pasar sin modificarlas.
- Ningún dato del consumidor (remitente, cobrador) ni `privado` viaja al servidor.
- Nada envía cartas. No se agrega ningún `fetch`, `XMLHttpRequest`, `navigator.sendBeacon` ni `mailto:` en `cartas-agente.js`.
- Comentarios y textos en español, con el estilo de `cartas-bilingues.js` y `agente-credito-cliente.js`.
- En Windows, la suite completa se corre con `node --test tests/*.test.js`.
- **Commits:** los hace Claude al final, no Codex.

## Review Focus

1. **Una disputa con 10 cuentas**: lista larga y numerada; se arma sin romper el formato. Prueba en la Task 3.
2. **Un acreedor con caracteres raros** (`"ACME & CO., INC."`): sale tal cual en los dos idiomas, sin escaparlo dos veces. Prueba en la Task 3.
3. **Se aprueba una carta y después cambia la dirección**: vuelve a `borrador` y `textoFinal` lanza un error. Prueba en la Task 4.
4. **El agente propone la misma cuenta en una disputa y en una validación**: son destinatarios distintos y ambas son válidas. Prueba en la Task 1.
5. **`marcadas` con ids que no existen**: se descartan sin error. Prueba en la Task 2.

---

### Task 1: Esquema, manual y validación de cartas (servidor)

**Files:** `netlify/functions/lib/agente-credito-manual.js`, `netlify/functions/lib/agente-credito-validar.js`, `tests/agente-credito-validar.test.js`, `tests/agente-credito-manual.test.js`, `tests/agente-credito-ayuda.js` (agregar `cartas` a `RESULTADO_VALIDO`)

**Produce:** `validarCartas(cartas, { etiquetado, plan }) → { validas, problemas }`, exportada. `validarResultado` exige el campo `cartas` (`forma:campos` si falta) y agrega los problemas de `validarCartas`.

- [X] **Step 1: Tests** — agregar a `tests/agente-credito-validar.test.js` (el `valido()` de la prueba gana `cartas: []`, y el `ETIQUETADO` gana `marcadas: { cuentas: ['B'], datos: ['Nombre 2'] }`, `cuentas[1].esCobranza = true` e `identidad.nombres` ya trae «Nombre 2»):

```js
const disputa = (cuentas) => ({ tipo: 'bureau-dispute', cuentas, subtipo: 'no_aplica', etiquetas: [] });
const PLAN = valido().plan; // el paso 0 es «disputar» con la cuenta A
const vc = (cartas) => V.validarCartas(cartas, { etiquetado: ETIQUETADO, plan: PLAN });

test('validarCartas: acepta una disputa respaldada por un paso «disputar»', () => {
  assert.deepStrictEqual(vc([disputa([{ letra: 'A', motivo: 'wrong-amount' }])]), { validas: [disputa([{ letra: 'A', motivo: 'wrong-amount' }])], problemas: [] });
});

test('validarCartas: reglas de FR-003', () => {
  assert.deepStrictEqual(vc([disputa([{ letra: 'C', motivo: 'wrong-amount' }])]).problemas, ['carta[0]:sin_paso_disputar:C']);
  assert.deepStrictEqual(vc([disputa([{ letra: 'F', motivo: 'other' }])]).problemas, ['carta[0]:cuenta_inexistente:F']);
  assert.deepStrictEqual(vc([disputa([{ letra: 'A', motivo: 'no_aplica' }])]).problemas, ['carta[0]:forma']);
  assert.deepStrictEqual(vc([disputa([{ letra: 'A', motivo: 'not-mine' }])]).problemas, ['carta[0]:no_marcada:A']);
  assert.deepStrictEqual(vc([{ tipo: 'debt-validation', cuentas: [{ letra: 'C', motivo: 'no_aplica' }], subtipo: 'no_aplica', etiquetas: [] }]).problemas, ['carta[0]:no_es_cobranza:C']);
  assert.deepStrictEqual(vc([{ tipo: 'identity', cuentas: [], subtipo: 'identity-names', etiquetas: ['Nombre 1'] }]).problemas, ['carta[0]:no_marcada:Nombre 1']);
  assert.deepStrictEqual(vc([{ tipo: 'demanda', cuentas: [], subtipo: 'no_aplica', etiquetas: [] }]).problemas, ['carta[0]:tipo']);
  const d = disputa([{ letra: 'A', motivo: 'wrong-amount' }]);
  assert.deepStrictEqual(vc([d, d]).problemas, ['carta[1]:repetida']);
  const cuatro = [d, { tipo: 'debt-validation', cuentas: [{ letra: 'B', motivo: 'no_aplica' }], subtipo: 'no_aplica', etiquetas: [] },
    { tipo: 'identity', cuentas: [], subtipo: 'identity-names', etiquetas: ['Nombre 2'] }, d];
  const r = vc(cuatro);
  assert.deepStrictEqual(r.problemas, ['carta[3]:sobra']);
  assert.strictEqual(r.validas.length, 3);
});

test('validarCartas: la misma cuenta en una disputa y en una validación es válida (Review Focus 4)', () => {
  const plan = [{ tipo: 'disputar', cuentas: ['B'], hechos: [], interpretacion: 'x', accion: 'y' }];
  const r = V.validarCartas([disputa([{ letra: 'B', motivo: 'wrong-amount' }]),
    { tipo: 'debt-validation', cuentas: [{ letra: 'B', motivo: 'no_aplica' }], subtipo: 'no_aplica', etiquetas: [] }], { etiquetado: ETIQUETADO, plan });
  assert.deepStrictEqual(r.problemas, []);
});

test('validarResultado: exige cartas y prefija sus problemas', () => {
  const r = valido(); delete r.cartas;
  assert.deepStrictEqual(validar(r).problemas, ['forma:campos']);
  const r2 = valido(); r2.cartas = [disputa([{ letra: 'C', motivo: 'other' }])];
  assert.deepStrictEqual(validar(r2).problemas, ['carta[0]:sin_paso_disputar:C']);
});
```

En `tests/agente-credito-manual.test.js`, agregar:

```js
test('el esquema y el manual incluyen las cartas', () => {
  const E = M.ESQUEMA_RESULTADO;
  assert.ok(E.required.includes('cartas'));
  const item = E.properties.cartas.items;
  assert.deepStrictEqual(item.properties.tipo.enum, ['bureau-dispute', 'debt-validation', 'identity']);
  assert.deepStrictEqual(item.properties.cuentas.items.properties.motivo.enum, ['not-mine', 'wrong-amount', 'wrong-date', 'already-resolved', 'wrong-status', 'other', 'no_aplica']);
  assert.deepStrictEqual(item.properties.subtipo.enum, ['identity-names', 'identity-phones', 'identity-addresses', 'identity-mixed', 'no_aplica']);
  assert.match(M.MANUAL, /CARTAS/);
  assert.match(M.MANUAL, /not-mine/);
  assert.match(M.MANUAL, /marcadas/);
});
```

Y cambiar la primera prueba de esquema para esperar `['diagnostico', 'plan', 'despues', 'preguntasParaTi', 'verificar', 'datosPersonales', 'cartas']`.

- [X] **Step 2: Run** `node --test tests/agente-credito-validar.test.js tests/agente-credito-manual.test.js` → deben FALLAR.
- [X] **Step 3: Implement**
  - En el esquema: `cartas` es un arreglo de objetos cerrados con `tipo`, `cuentas` (`{ letra, motivo }`), `subtipo` y `etiquetas`, todos `required`.
  - En el manual, agregar una sección «CARTAS» antes de «RESPUESTA FINAL». Debe decir:
    - el agente propone **hasta 3 cartas** y no las redacta: las cartas salen de plantillas fijas;
    - `bureau-dispute`: solo sobre cuentas de un paso «disputar», una carta por buró, motivo de la lista;
    - `not-mine`: solo para cuentas en `marcadas.cuentas`;
    - `debt-validation`: una por cobranza, motivo `no_aplica`;
    - `identity`: solo con etiquetas en `marcadas.datos`;
    - el consumidor revisa, aprueba y envía; el agente nunca envía.
  - En «RESPUESTA FINAL», agregar la línea `cartas`.
  - Implementar `validarCartas` según la tabla del contrato (orden de comprobación por carta: `sobra` → `tipo` → `forma` → cuentas inexistentes → reglas propias del tipo → `repetida`).
- [X] **Step 4: Run** las dos pruebas → PASS. En `tests/agente-credito-ayuda.js`, agregar a `RESULTADO_VALIDO` `cartas: [{ tipo: 'bureau-dispute', cuentas: [{ letra: 'A', motivo: 'wrong-amount' }], subtipo: 'no_aplica', etiquetas: [] }]`. Correr `node --test tests/agente-credito-*.test.js` → PASS.

### Task 2: Rechazo parcial en la función y `marcadas`/`privado` en el etiquetador

**Files:** `netlify/functions/agente-credito.js`, `agente-credito-cliente.js`, `tests/agente-credito-funcion.test.js`, `tests/agente-credito-cliente.test.js`

**Produce:** `etiquetarReporte(reporte, { marcadas: { cuentaIds: string[], datos: string[] } }?) → { etiquetado (con marcadas: { cuentas, datos }), paraHerramientas, privado: { cuentas: { [letra]: { acreedor, ultimos4, apertura } }, identidad: { [etiqueta]: { tipo, valor } } } }`. `analizarConAgente(reporte, { marcadas, … })` lo pasa.

- [X] **Step 1: Tests** — en `tests/agente-credito-funcion.test.js`:

```js
test('carta no válida tras la corrección: se entrega el análisis sin esa carta (FR-004)', async () => {
  const conMala = JSON.parse(JSON.stringify(RESULTADO_VALIDO));
  conMala.cartas.push({ tipo: 'bureau-dispute', cuentas: [{ letra: 'C', motivo: 'not-mine' }], subtipo: 'no_aplica', etiquetas: [] });
  const e = crearEntorno({ respuestasIA: [pideHerramientas(PEDIDOS_ACME), termina(conMala), termina(conMala)] });
  const r1 = await vuelta1(e);
  const r2 = await vueltaSiguiente(e, r1);
  assert.match(r2.cuerpo.messages.slice(-1)[0].content, /carta\[1\]/);
  const r3 = await vueltaSiguiente(e, r2);
  assert.strictEqual(r3.cuerpo.estado, 'terminado');
  assert.deepStrictEqual(r3.cuerpo.resultado.cartas, RESULTADO_VALIDO.cartas);
});
```

En `tests/agente-credito-cliente.test.js`:

```js
test('etiquetar: marcadas y privado (Review Focus 5)', () => {
  const r = cargar('agente/acme-zeta.json');
  r.cuentas[0].numero = { valor: 'XXXX0123', texto: 'XXXX0123' };
  const { etiquetado, privado } = C.etiquetarReporte(r, { marcadas: { cuentaIds: ['B', 'NO-EXISTE'], datos: ['Nombre 9'] } });
  assert.deepStrictEqual(etiquetado.marcadas, { cuentas: ['B'], datos: [] });
  assert.deepStrictEqual(privado.cuentas.A, { acreedor: 'ACME BANK', ultimos4: '0123', apertura: '2018-06' });
  assert.strictEqual(privado.cuentas.B.ultimos4, null);
  assert.ok(!JSON.stringify(etiquetado).includes('0123'));
});

test('etiquetar: sin marcadas → listas vacías', () => {
  assert.deepStrictEqual(C.etiquetarReporte(cargar('agente/acme-zeta.json')).etiquetado.marcadas, { cuentas: [], datos: [] });
});

test('lo que se envía al servidor nunca lleva privado ni datos del consumidor (SC-004)', async () => {
  const cuerpos = [];
  const e = AY.crearEntorno({ respuestasIA: [AY.pideHerramientas(AY.PEDIDOS_ACME), AY.termina(AY.RESULTADO_VALIDO)] });
  const r = AY.acme(); r.cuentas[0].numero = { valor: 'XXXX0123', texto: 'XXXX0123' };
  await C.analizarConAgente(r, { accessToken: 'bueno', marcadas: { cuentaIds: ['B'], datos: [] }, fetch: async (url, init) => { cuerpos.push(init.body); return haciaFuncion(e.handler)(url, init); } });
  cuerpos.forEach((c) => { assert.ok(!c.includes('0123')); assert.ok(!c.includes('"privado"')); });
  assert.ok(JSON.parse(cuerpos[0]).etiquetado.marcadas.cuentas.includes('B'));
});
```

Nota: `cargar` existe en el archivo; `haciaFuncion` y `AY` ya están declarados más arriba (Task 6 de la spec 017).

- [X] **Step 2: Run** → FALLAN.
- [X] **Step 3: Implement**
  - En la función: al recibir un `end_turn` con problemas, si **todos** empiezan con `carta[` y (`k` = 1 o `n` ≥ 6), responder `terminado` con `resultado.cartas = validarCartas(...).validas`.
  - `ultimos4` (D4): `numero` (con `simple`) → la última coincidencia de `/\d{4}/`, o `null`.
  - `privado.identidad`: por cada etiqueta, `{ tipo: 'Nombre'|'Dirección'|'Teléfono', valor }`.
- [X] **Step 4: Run** `node --test tests/agente-credito-*.test.js` → PASS.

### Task 3: `BUROS` y el bloque de varias cuentas en `cartas-bilingues.js`

**Files:** `cartas-bilingues.js`, `tests/cartas-bilingues.test.js` (solo agregar pruebas al final)

- [X] **Step 1: Tests** (al final de `tests/cartas-bilingues.test.js`; usar sus helpers existentes si sirven, o `require` directo):

```js
const fsB = require('node:fs');
const pathB = require('node:path');
const CB = require('../cartas-bilingues.js');
const remitenteB = { givenNames: 'ANA', firstSurname: 'RUIZ', secondSurname: '', street: '1 MAIN ST', city: 'MIAMI', state: 'FL', postalCode: '33101', currentPhone: '3055550100' };

test('BUROS coincide con la tabla de credito.html (Principio IV)', () => {
  const html = fsB.readFileSync(pathB.join(__dirname, '..', 'credito.html'), 'utf8');
  Object.values(CB.BUROS).forEach((b) => {
    assert.ok(html.includes("recipient: '" + b.destinatario + "'"), b.nombre);
    assert.ok(html.includes("address: ['" + b.direccion.join("', '") + "']"), b.nombre);
  });
  assert.ok(Object.isFrozen(CB.BUROS));
});

test('disputa sin cuentas: idéntica a hoy', () => {
  const base = { remitente: remitenteB, buro: CB.BUROS.equifax, motivo: 'wrong-amount', fecha: new Date(2026, 9, 2) };
  assert.deepStrictEqual(CB.armar('bureau-dispute', base), CB.armar('bureau-dispute', Object.assign({ cuentas: [] }, base)));
  assert.ok(!CB.armar('bureau-dispute', base).bloques.some((b) => b.id === 'cuentas-disputadas'));
});

test('disputa con varias cuentas: bloque bilingüe después del motivo', () => {
  const c = CB.armar('bureau-dispute', { remitente: remitenteB, buro: CB.BUROS.equifax, motivo: 'other', fecha: new Date(2026, 9, 2),
    cuentas: [{ acreedor: 'ACME BANK', ultimos4: '0123', motivo: 'wrong-amount' }, { acreedor: 'ACME & CO., INC.', ultimos4: null, motivo: 'wrong-date' }] });
  const ids = c.bloques.map((b) => b.id);
  assert.strictEqual(ids.indexOf('cuentas-disputadas'), ids.indexOf('motivo') + 1);
  const b = c.bloques.find((x) => x.id === 'cuentas-disputadas');
  assert.deepStrictEqual(b.es, ['CUENTAS QUE DISPUTO:', '1. ACME BANK — cuenta terminada en 0123 — ' + CB.MOTIVOS['wrong-amount'].es,
    '2. ACME & CO., INC. — número no visible en el reporte — ' + CB.MOTIVOS['wrong-date'].es]);
  assert.deepStrictEqual(b.en, ['ACCOUNTS I AM DISPUTING:', '1. ACME BANK — account ending in 0123 — ' + CB.MOTIVOS['wrong-amount'].en,
    '2. ACME & CO., INC. — account number not shown on the report — ' + CB.MOTIVOS['wrong-date'].en]);
  assert.strictEqual(b.libre, false);
});

test('disputa con 10 cuentas (Review Focus 1)', () => {
  const cuentas = Array.from({ length: 10 }, (_, i) => ({ acreedor: 'BANCO ' + i, ultimos4: String(1000 + i), motivo: 'other' }));
  const b = CB.armar('bureau-dispute', { remitente: remitenteB, buro: CB.BUROS.experian, motivo: 'other', cuentas }).bloques.find((x) => x.id === 'cuentas-disputadas');
  assert.strictEqual(b.es.length, 11);
  assert.match(b.en[10], /^10\. BANCO 9 — account ending in 1009 — /);
});
```

- [X] **Step 2: Run** `node --test tests/cartas-bilingues.test.js` → las nuevas FALLAN y las 50 existentes PASAN.
- [X] **Step 3: Implement**
  - `BUROS`, congelado, con los valores del contrato.
  - El bloque `cuentas-disputadas` solo si `datos.cuentas` trae elementos.
  - Agregar `TODO(NATIVE_REVIEW)` al comentario del bloque nuevo.
  - Exportar `BUROS` en la `API`.
  - **No cambiar ningún texto existente.**
- [X] **Step 4: Run** → todas pasan (las 50 de antes y las 4 nuevas).

### Task 4: `cartas-agente.js` — borradores y aprobación

**Files:** crear `cartas-agente.js` y `tests/cartas-agente.test.js`

**Consume:** `ThemoraCartas` (`armar`, `BUROS`, `MOTIVOS`) y lo que devuelven `etiquetarReporte` y `analizarConAgente`. **Produce:** lo del contrato «ThemoraCartasAgente».

- [X] **Step 1: Tests** — `tests/cartas-agente.test.js`:

```js
/* Cartas del agente (spec 018). Ejecutar: node --test tests/cartas-agente.test.js. Datos SINTÉTICOS. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const CA = require('../cartas-agente.js');
const C = require('../agente-credito-cliente.js');
const AY = require('./agente-credito-ayuda.js');

const REM = { givenNames: 'ANA', firstSurname: 'RUIZ', secondSurname: '', street: '1 MAIN ST', city: 'MIAMI', state: 'FL', postalCode: '33101', currentPhone: '3055550100' };
const COB = { nombre: 'ZETA COLLECTIONS', calle: '9 DEBT RD', ciudad: 'DALLAS', estado: 'TX', cp: '75201' };
function preparar() { const r = AY.acme(); r.cuentas[0].numero = { valor: 'XXXX0123', texto: 'XXXX0123' }; return C.etiquetarReporte(r, { marcadas: { cuentaIds: [], datos: [] } }); }
const resultadoIA = (cartas) => Object.assign({ modo: 'ia', hoy: '2026-10-01' }, AY.RESULTADO_VALIDO, { cartas });
const DISPUTA_A = { tipo: 'bureau-dispute', cuentas: [{ letra: 'A', motivo: 'wrong-amount' }], subtipo: 'no_aplica', etiquetas: [] };
const VALIDA_B = { tipo: 'debt-validation', cuentas: [{ letra: 'B', motivo: 'no_aplica' }], subtipo: 'no_aplica', etiquetas: [] };

test('crearBorradores: sin modo ia o sin cartas → []', () => {
  assert.deepStrictEqual(CA.crearBorradores({ modo: 'local' }, preparar(), { buro: 'equifax' }), []);
  assert.deepStrictEqual(CA.crearBorradores(resultadoIA([]), preparar(), { buro: 'equifax' }), []);
});

test('borrador de disputa: datos del dispositivo, incompleto hasta tener remitente', () => {
  const [b] = CA.crearBorradores(resultadoIA([DISPUTA_A]), preparar(), { buro: 'equifax' });
  assert.strictEqual(b.id, 'carta-1');
  assert.deepStrictEqual(b.cuentas, [{ letra: 'A', acreedor: 'ACME BANK', ultimos4: '0123', motivo: 'wrong-amount' }]);
  assert.deepStrictEqual(b.destino, { nombre: 'Equifax', destinatario: 'Equifax Information Services LLC', direccion: ['P.O. Box 740241', 'Atlanta, GA 30374'] });
  assert.strictEqual(b.estado, 'incompleto');
  assert.deepStrictEqual(b.faltan, ['falta_nombre', 'falta_direccion']);
  assert.ok(Object.isFrozen(b));
});

test('aprobación: solo con datos completos y las dos confirmaciones (FR-011)', () => {
  let [b] = CA.crearBorradores(resultadoIA([DISPUTA_A]), preparar(), { buro: 'equifax' });
  b = CA.actualizarDatos(b, { remitente: REM });
  assert.strictEqual(b.estado, 'borrador');
  assert.throws(() => CA.textoFinal(b), /carta_no_aprobada/);
  b = CA.confirmar(b, { inexacta: true });
  assert.strictEqual(b.estado, 'borrador');
  b = CA.confirmar(b, { yoEnvio: true });
  assert.strictEqual(b.estado, 'aprobada');
  const t = CA.textoFinal(b, { fecha: new Date(2026, 9, 2) });
  ['ACME BANK', 'account ending in 0123', 'P.O. Box 740241', 'Atlanta, GA 30374', '15 U.S.C. § 1681i'].forEach((x) => assert.ok(t.textoEn.includes(x), x));
  assert.ok(t.textoEs.includes('CUENTAS QUE DISPUTO:'));
  assert.deepStrictEqual(t.guia, CA.GUIA_ENVIO['bureau-dispute']);
});

test('cambiar datos después de aprobar → vuelve a borrador (Review Focus 3, FR-013)', () => {
  let [b] = CA.crearBorradores(resultadoIA([DISPUTA_A]), preparar(), { buro: 'equifax' });
  b = CA.confirmar(CA.actualizarDatos(b, { remitente: REM }), { inexacta: true, yoEnvio: true });
  assert.strictEqual(b.estado, 'aprobada');
  b = CA.actualizarDatos(b, { remitente: Object.assign({}, REM, { street: '2 OAK RD' }) });
  assert.strictEqual(b.estado, 'borrador');
  assert.deepStrictEqual(b.confirmaciones, { inexacta: false, yoEnvio: false });
  assert.throws(() => CA.textoFinal(b), /carta_no_aprobada/);
});

test('validación de deuda: necesita la dirección del cobrador', () => {
  let [b] = CA.crearBorradores(resultadoIA([VALIDA_B]), preparar(), { buro: 'equifax' });
  b = CA.actualizarDatos(b, { remitente: REM });
  assert.deepStrictEqual([b.estado, b.faltan], ['incompleto', ['falta_cobrador']]);
  b = CA.confirmar(CA.actualizarDatos(b, { cobrador: COB }), { inexacta: true, yoEnvio: true });
  const t = CA.textoFinal(b, { fecha: new Date(2026, 9, 2) });
  ['ZETA COLLECTIONS', '9 DEBT RD', '15 U.S.C. § 1692g'].forEach((x) => assert.ok(t.textoEn.includes(x), x));
});

test('buró desconocido → falta_destinatario y no se aprueba', () => {
  let [b] = CA.crearBorradores(resultadoIA([DISPUTA_A]), preparar(), { buro: 'desconocido' });
  b = CA.confirmar(CA.actualizarDatos(b, { remitente: REM }), { inexacta: true, yoEnvio: true });
  assert.deepStrictEqual([b.estado, b.faltan], ['incompleto', ['falta_destinatario']]);
});

test('guía de envío: correo certificado, copias, plazos y sin promesas (FR-014)', () => {
  const todo = Object.values(CA.GUIA_ENVIO).flat().join(' ');
  ['certificado', 'acuse', 'copia', '30 días'].forEach((x) => assert.ok(todo.toLowerCase().includes(x), x));
  assert.ok(!/garantiz|seguro que|subir[aá] tu puntaje/i.test(todo));
  assert.ok(Object.isFrozen(CA.GUIA_ENVIO));
});

test('nada envía cartas (FR-015)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'cartas-agente.js'), 'utf8');
  assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|mailto:/.test(src));
});

test('ciclo completo ACME/ZETA → disputa a Equifax aprobable (SC-001)', async () => {
  const e = AY.crearEntorno({ respuestasIA: [AY.pideHerramientas(AY.PEDIDOS_ACME), AY.termina(AY.RESULTADO_VALIDO)] });
  const fetchF = async (url, init) => { const r = await e.handler({ httpMethod: 'POST', body: init.body }); return { status: r.statusCode, json: async () => JSON.parse(r.body) }; };
  const reporte = AY.acme();
  const res = await C.analizarConAgente(reporte, { accessToken: 'bueno', fetch: fetchF });
  const [b] = CA.crearBorradores(res, C.etiquetarReporte(reporte), { buro: reporte.buro });
  const t = CA.textoFinal(CA.confirmar(CA.actualizarDatos(b, { remitente: REM }), { inexacta: true, yoEnvio: true }));
  assert.ok(t.textoEn.includes('ACME BANK') && t.textoEn.includes('Equifax Information Services LLC'));
});
```

- [X] **Step 2: Run** `node --test tests/cartas-agente.test.js` → FALLA (no existe el módulo).
- [X] **Step 3: Implement** `cartas-agente.js`:
  - UMD `ThemoraCartasAgente`, carga `ThemoraCartas` con `window` o `require('./cartas-bilingues.js')`.
  - Funciones puras que devuelven objetos congelados (`Object.freeze` también en `cuentas`, `datos` y `confirmaciones`).
  - `GUIA_ENVIO`, congelada, en español:
    - **disputa e identidad**: «Envíala por correo certificado con acuse de recibo»; «Manda copias, nunca originales, de tu identificación, comprobante de domicilio y las páginas del reporte»; «Guarda una copia de la carta y el recibo del correo»; «El buró tiene normalmente 30 días (a veces 45) para investigar y responderte por escrito»;
    - **validación**: las tres primeras, más «Mientras el cobrador no responda con la validación, debe pausar el cobro».
  - En `textoFinal`, la fecha por omisión es la del dispositivo.
- [X] **Step 4: Run** → PASS.

### Task 5: Cierre

- [X] **Step 1:** `node --test tests/cartas-agente.test.js tests/cartas-bilingues.test.js tests/agente-credito-*.test.js tests/herramientas-credito.test.js` → todas pasan.
- [X] **Step 2:** `node --test tests/*.test.js` → solo los 19 fallos que ya existían (`tasas-*`, `sistema-visual`), ninguno nuevo.
- [X] **Step 3:** `git status --short` (solo lectura): los únicos cambios nuevos son los archivos de este plan; `credito.html` y los demás protegidos siguen igual que antes.
- [X] **Step 4:** `grep -nE "console\.log|fetch\(" cartas-agente.js` → vacío.
- [X] **Step 5:** Commits y `graphify update .` → **los hace Claude**, no Codex.

## Cobertura

| Requisito | Task |
|---|---|
| FR-001–FR-005 | 1, 2 |
| FR-006–FR-010 | 2, 3, 4 |
| FR-011–FR-015 | 4 |
| FR-016–FR-017 | 3, 5 |
