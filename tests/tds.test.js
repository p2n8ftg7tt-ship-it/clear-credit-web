/* Pruebas del motor TDS 0.1 en JavaScript (tds.js).

   Paridad: cada ejemplo de tests/fixtures/tds/ debe dar EXACTAMENTE lo mismo
   que el motor Python de G:\My Drive\TDS (salidas guardadas en
   tests/fixtures/tds/esperado/, generadas con `python -m tds_engine score`).
   Si alguna vez el motor Python cambia, se vuelven a generar esos archivos;
   los números no se ajustan a mano.

   Correr con:  node --test tests/*.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const T = require('../tds.js');

const DIR = path.join(__dirname, 'fixtures', 'tds');
const texto = nombre => fs.readFileSync(path.join(DIR, nombre + '.json'), 'utf8');
const esperado = nombre => JSON.parse(fs.readFileSync(path.join(DIR, 'esperado', nombre + '.json'), 'utf8'));
const modelo = T.loadModel('0.1.0');
const guajiro = () => JSON.parse(texto('guajiro'));
const comp = (r, code) => r.components.find(c => c.code === code);

/* ---------------- Paridad con el motor Python ---------------- */
const EJEMPLOS = ['guajiro', 'guajiro_no_activity', 'guajiro_no_cohort', 'guajiro_no_v_no_a',
  'guajiro_small_zone', 'maximum', 'minimum', 'not_locatable', 'review_burst'];

for (const nombre of EJEMPLOS) {
  test('paridad con Python: ' + nombre, () => {
    assert.deepEqual(T.score(texto(nombre)), esperado(nombre));
  });
}

test('paridad con Python: simulate con sitio web', () => {
  const cambios = { 'info_checks.website_linked': true, 'contact_channels.website_reachable': true };
  const r = T.simulate(texto('guajiro'), cambios);
  const e = esperado('guajiro_simular_web');
  assert.equal(r.tds, e.tds);
  assert.deepEqual(r.simulation, e.simulation);
  assert.deepEqual(r.components, e.components);
  assert.deepEqual(r.reasons, e.reasons);
});

test('paridad con Python: simulate con fotos y ficha no reclamada', () => {
  const r = T.simulate(texto('guajiro'), { photos: 10, 'listing.claimed': false });
  const e = esperado('guajiro_simular_fotos');
  assert.equal(r.tds, e.tds);
  assert.equal(r.gate, e.gate);
  assert.deepEqual(r.simulation, e.simulation);
  assert.deepEqual(r.components, e.components);
});

test('entrada inválida: calificación 6 da TDSInputError en business.reviews.rating', () => {
  assert.throws(() => T.score(texto('invalid_rating_6')), err =>
    err instanceof T.TDSInputError && err.field === 'business.reviews.rating' && err.allowed_range === '[1, 5] o null');
});

test('el modelo tiene el mismo parameters_hash que en Python', () => {
  assert.equal(modelo.parameters_hash, esperado('guajiro').parameters_hash);
  assert.equal(modelo.label, 'TDS 0.1 – metodología en validación');
});

/* ---------------- Caso de referencia (README del motor) ---------------- */
test('Guajiro LLC: 33 ± 2,8 · Crítico; acción principal enlazar sitio web (+6,0)', () => {
  const r = T.score(guajiro());
  assert.equal(r.tds, 33);
  assert.equal(r.margin, 2.8);
  assert.equal(r.category, 'Crítico');
  assert.equal(comp(r, 'R').score, 55.18);
  assert.equal(comp(r, 'I').score, 57.14);
  assert.equal(comp(r, 'C').score, 25);
  assert.equal(comp(r, 'A').score, 41.67);
  assert.equal(r.reasons[0].code, 'link_website');
  assert.equal(r.reasons[0].gain_points, 6);
});

test('mismo resultado como objeto o como texto (salvo el hash de números como 5.0)', () => {
  const a = T.score(guajiro());
  const b = T.score(texto('guajiro'));
  assert.deepEqual({ ...a, input_hash: null }, { ...b, input_hash: null });
});

test('el orden de las claves no cambia el input_hash', () => {
  const g = guajiro();
  const alReves = {};
  for (const k of Object.keys(g).reverse()) alReves[k] = g[k];
  assert.equal(T.score(alReves).input_hash, T.score(g).input_hash);
});

/* ---------------- Diferencia de ¿Aparezco?: "No sé" si está reclamada ---------------- */
test('ficha reclamada desconocida: no castiga (compuerta 1) y lleva la bandera', () => {
  const g = guajiro();
  g.business.listing.claimed = null;
  const r = T.score(g);
  assert.equal(r.gate, 1);
  assert.equal(r.tds, 33);
  assert.ok(r.flags.includes('claimed_unknown'));
  assert.equal(r.reasons.some(x => x.code === 'claim_listing'), false);
});

test('ficha no reclamada: compuerta 0,85 y aparece "Reclama tu ficha" si da puntos', () => {
  const g = guajiro();
  g.business.listing.claimed = false;
  const r = T.score(g);
  assert.equal(r.gate, 0.85);
  assert.ok(r.tds < 33);
  assert.equal(r.flags.includes('claimed_unknown'), false);
});

/* ---------------- Datos que faltan nunca cuentan como cero ---------------- */
test('sin visibilidad ni actividad: cobertura 0,6, incompleta y sin categoría', () => {
  const r = T.score(texto('guajiro_no_v_no_a'));
  assert.equal(r.coverage, 0.6);
  assert.equal(r.status, 'incomplete');
  assert.equal(r.category, null);
  assert.equal(typeof r.tds, 'number');
});

test('no localizable: no evaluable, sin TDS ni compuerta', () => {
  const r = T.score(texto('not_locatable'));
  assert.equal(r.status, 'not_evaluable');
  assert.equal(r.tds, null);
  assert.equal(r.gate, null);
});

test('un dato sin evidencia se trata como desconocido', () => {
  const g = guajiro();
  g.business.evidence = g.business.evidence.filter(e => e.field !== 'photos');
  const r = T.score(g);
  assert.ok(r.flags.includes('missing_evidence'));
  assert.equal(comp(r, 'I').findings.some(f => f.includes('fotos en la ficha')), false);
});

test('límites: todo al máximo da 100 Referente, todo al mínimo da ≥ 0 Crítico', () => {
  const max = T.score(texto('maximum'));
  const min = T.score(texto('minimum'));
  assert.equal(max.tds, 100);
  assert.equal(max.category, 'Referente');
  assert.ok(min.tds >= 0);
  assert.equal(min.category, 'Crítico');
});

/* ---------------- Números idénticos a Python ---------------- */
test('redondeo mitad hacia arriba como Decimal de Python', () => {
  assert.equal(T.roundHalfUp(32.5, 0), 33);
  assert.equal(T.roundHalfUp(33.14, 0), 33);
  assert.equal(T.roundHalfUp(2.8213, 1), 2.8);
  assert.equal(T.roundHalfUp(2.675, 2), 2.68); // str(2.675) = '2.675'
  assert.equal(T.roundHalfUp(0.00004, 4), 0);
  assert.equal(T.roundHalfUp(0.00005, 4), 0.0001);
});

test('repr de floats y texto con coma como Python', () => {
  assert.equal(T.pyFloatRepr(1), '1.0');
  assert.equal(T.pyFloatRepr(0.3), '0.3');
  assert.equal(T.pyFloatRepr(0.00001), '1e-05');
  assert.equal(T.pyFloatRepr(1e16), '1e+16');
  assert.equal(T.numEs(4.545454, 2), '4,55');
  assert.equal(T.numEs(4.625, 2), '4,62'); // mitad exacta: al par, como f"{x:.2f}"
  assert.equal(T.numEs(5, 1), '5,0');
});

test('SHA-256 correcto (vectores conocidos)', () => {
  assert.equal(T.sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(T.sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(T.sha256Hex('a'.repeat(1000)), '41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3');
});

/* ---------------- Modelo ---------------- */
test('un modelo con pesos que no suman 1 se rechaza', () => {
  const malo = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'models', 'tds-0.1.0.json'), 'utf8'));
  malo.weights.V = 0.5;
  assert.throws(() => T.modelFromDict(malo), T.TDSModelError);
});

test('simular un campo no permitido da TDSInputError', () => {
  assert.throws(() => T.simulate(guajiro(), { 'business.plan_contratado': true }), T.TDSInputError);
});

/* ---------------- Textos ---------------- */
test('ningún texto promete clientes, ventas ni posiciones', () => {
  const r = T.score(guajiro());
  const todo = JSON.stringify(r) + T.SIMULATION_DISCLAIMER;
  for (const p of ['pierdes', 'perdiendo', 'garantizamos', 'vas a subir']) {
    assert.equal(todo.toLowerCase().includes(p), false, p);
  }
});
