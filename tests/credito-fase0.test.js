/* Fase 0 de la especificación 013: el lector actual deja de exagerar, ordenar o prometer.
   Ejecutar:  node --test tests/credito-fase0.test.js

   evaluateDocument() vive dentro de credito.html. Estas pruebas recortan del script las
   funciones de lectura (desde «const normalize=» hasta «function showError(») más
   evaluateDocument, y las ejecutan en Node con un reporte SINTÉTICO (datos inventados).
   Spec: specs/013-lector-credito-metodologia/spec.md (FR-001 a FR-006). */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(raiz, 'credito.html'), 'utf8');

function cuerpoDe(nombre) {
  const inicio = html.indexOf('function ' + nombre + '(');
  assert.ok(inicio >= 0, 'no se encontró la función ' + nombre);
  /* El sangrado del archivo puede cambiar (formateador del editor): la próxima función se busca con cualquier sangrado. */
  const resto = html.slice(inicio + 10).search(/\n[ \t]*function /);
  const siguiente = resto >= 0 ? inicio + 10 + resto : -1;
  return html.slice(inicio, siguiente > 0 ? siguiente : undefined);
}

function cargarEvaluador() {
  const desde = html.search(/const normalize\s*=/);
  const hasta = html.indexOf('function showError(', desde);
  assert.ok(desde > 0 && hasta > desde, 'no se encontraron las funciones de lectura');
  const fuente = html.slice(desde, hasta) + cuerpoDe('evaluateDocument') + '\nreturn evaluateDocument;';
  const window = {}; // sin ThemoraCartas: se usan los umbrales de respaldo de la página
  const escapeHtml = (v) => String(v);
  return new Function('window', 'escapeHtml', fuente)(window, escapeHtml);
}

/* Reporte inventado: 3 nombres, 2 teléfonos, 2 direcciones, una cobranza y 6 consultas duras. */
const REPORTE = [
  'Equifax Credit Report',
  'Personal Information',
  'Social Security Number: XXX-XX-1234',
  'Date of Birth: 01/01/1980',
  'Names reported:',
  'Maria Lopez Perez',
  'Maria L Perez',
  'Mary Lopez',
  'Phone: 540-555-0101 540-555-0102',
  '100 Main St Springfield, VA 24000',
  '200 Oak Ave Springfield, VA 24000',
  'Account Information',
  'Collection account placed for collection',
  'Hard inquiries: 6',
  'Hard 02/22/2025 Hard 02/22/2025 Hard 02/23/2025 Hard 02/23/2025 Hard 02/24/2025 Hard 02/24/2025'
].join('\n');

/* «Cuenta garantizada» (secured account) es un tipo de cuenta, no una promesa: no cuenta. */
const ORDENES = /\b(no pagues|debes|tienes que|garantizamos|(?<!cuenta )garantizad[oa]s?)\b/i;

test('las variaciones de identidad se muestran «Para verificar», nunca Crítica ni Alta (FR-001)', () => {
  const r = cargarEvaluador()(REPORTE, 'prueba');
  const identidad = r.negatives.filter((n) => n.evidence === 'Identidad');
  assert.ok(identidad.length > 0, 'el reporte sintético debería producir hallazgos de identidad');
  identidad.forEach((n) => assert.strictEqual(n.priority, 'Para verificar', n.title));
  assert.ok(identidad.every((n) => /suele ser normal/.test(n.description)), 'debe explicar que las variantes suelen ser normales');
});

test('las variaciones de identidad solas no ponen el perfil en «Atención prioritaria»', () => {
  const soloIdentidad = REPORTE.replace(/Collection account placed for collection\n/, '');
  const r = cargarEvaluador()(soloIdentidad, 'prueba');
  assert.notStrictEqual(r.health, 'Atención prioritaria');
});

test('la cobranza se explica sin órdenes y menciona el plazo de validación (FR-002, FR-003)', () => {
  const r = cargarEvaluador()(REPORTE, 'prueba');
  const cobranza = r.negatives.find((n) => n.issueKey === 'collection');
  assert.ok(cobranza, 'debería detectarse la cobranza');
  assert.ok(!ORDENES.test(cobranza.action), cobranza.action);
  assert.ok(/1692g/.test(cobranza.action) && /30 días/.test(cobranza.action), 'debe citar §1692g y el plazo');
});

test('varias consultas duras no son un punto negativo (FR-004)', () => {
  const r = cargarEvaluador()(REPORTE, 'prueba');
  assert.ok(!r.negatives.some((n) => n.issueKey === 'inquiries'), 'las consultas no deben estar en negativos');
  const plan = r.strategies.find((s) => s.issueKey === 'inquiries');
  assert.ok(plan, 'debe quedar un paso para revisar consultas no reconocidas');
  assert.ok(/como una sola/.test(plan.description), 'debe explicar que pueden contarse como una');
});

test('ningún texto del evaluador da órdenes ni garantías (FR-002)', () => {
  const cuerpo = cuerpoDe('evaluateDocument');
  const textos = cuerpo.match(/'[^'\n]{12,}'/g) || [];
  const conOrden = textos.filter((t) => ORDENES.test(t));
  assert.deepStrictEqual(conOrden, []);
});

test('el analizador viejo sin uso ya no existe (FR-005)', () => {
  assert.ok(!fs.existsSync(path.join(raiz, 'analyzer.js')));
  assert.ok(!/analyzer\.js/.test(html));
});
