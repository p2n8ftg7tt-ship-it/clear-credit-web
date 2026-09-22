/* Pruebas de cómo el autocompletado rellena los campos según la forma del formulario.
   Ejecutar:  node --test tests/direccion-formas.test.js
   Solo prueba la lógica pura (sin navegador ni red): qué valor va en cada campo cuando
   la persona elige una sugerencia. Las formas están descritas en
   specs/003-address-autocomplete-bilingual-letters/data-model.md */

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

global.window = {};
const modulo = require(path.join(__dirname, '..', 'direccion-autocompletar.js'));
const { valoresParaBloque } = modulo.__prueba;

const COMPLETA = { calle: '123 Main St', ciudad: 'Roanoke', estado: 'VA', cp: '24016' };

test('cargar el script en Node no falla aunque no haya document', () => {
  assert.strictEqual(typeof document, 'undefined');
  assert.strictEqual(typeof modulo.conectar, 'function');
  assert.strictEqual(typeof modulo.conectarBloque, 'function');
  assert.strictEqual(window.ThemoraDireccion, modulo);
});

test('separado: cada dato va a su campo', () => {
  assert.deepStrictEqual(valoresParaBloque(COMPLETA, 'separado'), COMPLETA);
});

test('estado-cp: estado y código postal juntos en un campo', () => {
  assert.deepStrictEqual(valoresParaBloque(COMPLETA, 'estado-cp'),
    { calle: '123 Main St', ciudad: 'Roanoke', estadoCp: 'VA 24016' });
});

test('estado-cp: si falta uno de los dos, solo va el que hay, sin espacios de sobra', () => {
  assert.strictEqual(valoresParaBloque({ ...COMPLETA, cp: '' }, 'estado-cp').estadoCp, 'VA');
  assert.strictEqual(valoresParaBloque({ ...COMPLETA, estado: '' }, 'estado-cp').estadoCp, '24016');
  const v = valoresParaBloque({ ...COMPLETA, estado: '', cp: '' }, 'estado-cp');
  assert.ok(!('estadoCp' in v), 'sin estado ni código postal no se escribe el campo');
});

test('unico: toda la dirección en una sola línea', () => {
  assert.deepStrictEqual(valoresParaBloque(COMPLETA, 'unico'), { calle: '123 Main St, Roanoke, VA 24016' });
});

test('unico: sin comas ni espacios colgando cuando faltan partes', () => {
  const caso = (parcial) => valoresParaBloque({ calle: '', ciudad: '', estado: '', cp: '', ...parcial }, 'unico').calle;
  assert.strictEqual(caso({ calle: '123 Main St', estado: 'VA', cp: '24016' }), '123 Main St, VA 24016');
  assert.strictEqual(caso({ calle: '123 Main St', ciudad: 'Roanoke', estado: 'VA' }), '123 Main St, Roanoke, VA');
  assert.strictEqual(caso({ calle: '123 Main St' }), '123 Main St');
  assert.strictEqual(caso({ calle: '123 Main St', ciudad: 'Roanoke' }), '123 Main St, Roanoke');
  assert.strictEqual(caso({ calle: '123 Main St', cp: '24016' }), '123 Main St, 24016');
  ['calle', 'ciudad', 'estado', 'cp'].forEach((k) => {
    const s = caso({ calle: 'A', ciudad: 'B', estado: 'C', cp: 'D', [k]: '' });
    assert.ok(!/,\s*,|^,|,\s*$|\s{2,}/.test(s), 'formato raro: "' + s + '"');
  });
});

test('los valores vacíos nunca se devuelven (no se borra lo que la persona ya escribió)', () => {
  const v = valoresParaBloque({ calle: '123 Main St', ciudad: '', estado: '', cp: '' }, 'separado');
  assert.deepStrictEqual(v, { calle: '123 Main St' });
  const w = valoresParaBloque({ calle: '', ciudad: 'Roanoke', estado: 'VA', cp: '' }, 'estado-cp');
  assert.deepStrictEqual(w, { ciudad: 'Roanoke', estadoCp: 'VA' });
});

test('el código postal con sufijo (ZIP+4) se conserva', () => {
  assert.strictEqual(valoresParaBloque({ ...COMPLETA, cp: '24016-1234' }, 'separado').cp, '24016-1234');
  assert.strictEqual(valoresParaBloque({ ...COMPLETA, cp: '24016-1234' }, 'estado-cp').estadoCp, 'VA 24016-1234');
  assert.strictEqual(valoresParaBloque({ ...COMPLETA, cp: '24016-1234' }, 'unico').calle, '123 Main St, Roanoke, VA 24016-1234');
});

test('una forma desconocida se trata como separado y una dirección vacía no rompe', () => {
  assert.deepStrictEqual(valoresParaBloque(COMPLETA, 'rara'), COMPLETA);
  assert.deepStrictEqual(valoresParaBloque(null, 'separado'), {});
  assert.deepStrictEqual(valoresParaBloque({}, 'unico'), {});
});
