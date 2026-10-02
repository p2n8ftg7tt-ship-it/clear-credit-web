/* Fase 0 de la especificación 013: el lector deja de exagerar, ordenar o prometer.
   Ejecutar:  node --test tests/credito-fase0.test.js

   Qué se movió y por qué (spec 019, Task 1 = 014 T035/T038): evaluateDocument() se retiró de
   credito.html porque el analista (analista-credito.js) lo reemplaza. Las garantías FR-001 a FR-004
   que se probaban sobre evaluateDocument se trasladaron, sin aflojarlas, a
   tests/analista-credito.test.js («Garantías de la Fase 0»). Aquí queda la FR-005, ampliada. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(raiz, 'credito.html'), 'utf8');

test('el analizador viejo sin uso ya no existe (FR-005)', () => {
  assert.ok(!fs.existsSync(path.join(raiz, 'analyzer.js')));
  assert.ok(!/analyzer\.js/.test(html));
});

test('el evaluador por palabras clave ya no existe en credito.html (FR-005 ampliada, 014 T038)', () => {
  assert.ok(!html.includes('function evaluateDocument('), 'evaluateDocument sigue en credito.html');
  assert.ok(!/evaluateDocument\(/.test(html), 'algo sigue llamando a evaluateDocument');
});
