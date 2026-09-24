/* Pruebas del Themora Digital Score (tds.js): el caso de referencia de
   Guajiro Llc, los límites de cada banda, los datos que Google no da (nunca
   cuentan como cero), las acciones y las palabras prohibidas.
   Correr con:  node --test tests/*.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');

const T = require('../tds.js');

const FIJA = { valor: 4.7, origen: 'fija', cantidad: 0 };
const base = (cambios = {}) => ({
  encontrado: true,
  calificacion: 5,
  totalResenas: 1,
  sitioWeb: false,
  horarioCompleto: false,
  fotos: 0,
  posicionGiro: null,
  giroMedible: true,
  referencia: FIJA,
  ...cambios,
});
const pilar = (r, clave) => r.pilares.find(p => p.clave === clave);

/* ---------------- Caso de referencia ---------------- */
test('Guajiro Llc: 30, Invisible, parcial con 4 de 5 pilares', () => {
  const r = T.calcular(base());
  assert.equal(r.tds, 30);
  assert.equal(r.banda, 'invisible');
  assert.equal(r.parcial, true);
  assert.equal(r.pilaresMedidos, 4);
  assert.equal(r.multiplicador, 1);
  assert.ok(Math.abs(pilar(r, 'reputacion').valor - 63.8) < 0.1);
  assert.equal(pilar(r, 'visibilidad').valor, 30);
  assert.equal(pilar(r, 'fundamentos').valor, 0);
  assert.equal(pilar(r, 'completitud').valor, 0);
  assert.equal(pilar(r, 'actividad').valor, null);
  assert.equal(pilar(r, 'actividad').pesoAplicado, 0);
  assert.deepEqual(r.referencia, FIJA);
});

test('los cinco pilares van en orden fijo y los pesos aplicados suman 1', () => {
  const r = T.calcular(base());
  assert.deepEqual(r.pilares.map(p => p.clave), ['reputacion', 'visibilidad', 'fundamentos', 'completitud', 'actividad']);
  const suma = r.pilares.reduce((s, p) => s + p.pesoAplicado, 0);
  assert.ok(Math.abs(suma - 1) < 1e-9);
});

test('pilares mostrados × pesos reproducen el TDS con ±1', () => {
  const casos = [
    base(),
    base({ sitioWeb: true, horarioCompleto: true, fotos: 10, totalResenas: 80, calificacion: 4.8, posicionGiro: 2 }),
    base({ fotos: 4, posicionGiro: 6, totalResenas: 12, calificacion: 4.1 }),
    base({ giroMedible: false, fotos: null }),
  ];
  for (const e of casos) {
    const r = T.calcular(e);
    const reconstruido = r.pilares.reduce((s, p) => s + (p.valor == null ? 0 : Math.round(p.valor) * p.pesoAplicado), 0);
    assert.ok(Math.abs(reconstruido - r.tds) <= 1, `TDS ${r.tds} vs ${reconstruido}`);
  }
});

/* ---------------- Reputación ---------------- */
test('SC-002: 1 reseña de 5.0 nunca supera a 50+ reseñas de 4.7+', () => {
  const una = pilar(T.calcular(base({ calificacion: 5, totalResenas: 1 })), 'reputacion').valor;
  for (const [cal, v] of [[4.7, 50], [4.7, 100], [4.9, 60], [5, 50]]) {
    const muchas = pilar(T.calcular(base({ calificacion: cal, totalResenas: v })), 'reputacion').valor;
    assert.ok(muchas > una, `${cal}★ con ${v}: ${muchas} vs ${una}`);
  }
});

test('100 reseñas de 4.7 tienen más reputación que 1 de 5.0', () => {
  const a = pilar(T.calcular(base({ calificacion: 4.7, totalResenas: 100 })), 'reputacion').valor;
  const b = pilar(T.calcular(base({ calificacion: 5, totalResenas: 1 })), 'reputacion').valor;
  assert.ok(a > b);
});

test('cero reseñas: calificación = referencia, volumen 0, y la razón no dice "0.0★"', () => {
  const r = T.calcular(base({ calificacion: null, totalResenas: 0 }));
  const p = pilar(r, 'reputacion');
  assert.ok(Math.abs(p.valor - 0.6 * (4.7 / 5) * 100) < 0.1);
  assert.doesNotMatch(p.razon, /0\.0★/);
  assert.match(p.razon, /no tienes reseñas/i);
});

test('referencia: promedio de la competencia con 3 o más, si no la fija de 4.7', () => {
  assert.deepEqual(T.referencia({ cantidad: 5, promedioCalificacion: 4.56 }), { valor: 4.56, origen: 'competencia', cantidad: 5 });
  assert.deepEqual(T.referencia({ cantidad: 2, promedioCalificacion: 4.1 }), { valor: 4.7, origen: 'fija', cantidad: 2 });
  assert.deepEqual(T.referencia(null), { valor: 4.7, origen: 'fija', cantidad: 0 });
  const r = T.calcular(base({ referencia: T.referencia({ cantidad: 5, promedioCalificacion: 4.6 }) }));
  assert.match(pilar(r, 'reputacion').razon, /5 negocios/);
  assert.match(pilar(T.calcular(base()), 'reputacion').razon, /referencia fija de 4\.7★/);
});

/* ---------------- Visibilidad ---------------- */
test('visibilidad: top 3 = 100, 4–10 bajan 15 por lugar, solo por nombre = 30', () => {
  const vis = pos => pilar(T.calcular(base({ posicionGiro: pos })), 'visibilidad').valor;
  assert.equal(vis(1), 100);
  assert.equal(vis(3), 100);
  assert.equal(vis(4), 85);
  assert.equal(vis(9), 10);
  assert.equal(vis(10), 0); // 100 − 15·7 sería negativo: nunca baja de 0
  assert.equal(vis(null), 30);
});

test('sin "a qué se dedica": Visibilidad no se mide y no cuenta como cero', () => {
  const r = T.calcular(base({ giroMedible: false }));
  const p = pilar(r, 'visibilidad');
  assert.equal(p.valor, null);
  assert.equal(p.pesoAplicado, 0);
  assert.match(p.razon, /No lo pudimos comprobar/);
  assert.equal(r.pilaresMedidos, 3);
});

/* ---------------- Completitud ---------------- */
test('fotos: 10 (el tope de Google) cuenta completo; menos sigue la curva', () => {
  const comp = n => pilar(T.calcular(base({ fotos: n })), 'completitud').valor;
  assert.equal(comp(10), 100);
  assert.equal(comp(0), 0);
  assert.ok(Math.abs(comp(5) - 100 * (1 - Math.exp(-0.25))) < 0.1);
  const r = T.calcular(base({ fotos: null }));
  assert.equal(pilar(r, 'completitud').valor, null);
});

/* ---------------- No encontrado ---------------- */
test('no encontrado: TDS 0, Invisible, multiplicador 0', () => {
  const r = T.calcular({ encontrado: false, referencia: FIJA });
  assert.equal(r.tds, 0);
  assert.equal(r.banda, 'invisible');
  assert.equal(r.multiplicador, 0);
  assert.deepEqual(T.acciones({ encontrado: false, referencia: FIJA }), []);
});

/* ---------------- Bandas ---------------- */
test('bandas en sus límites', () => {
  const casos = [[0, 'invisible'], [39, 'invisible'], [40, 'vulnerable'], [59, 'vulnerable'], [60, 'saludable'],
    [79, 'saludable'], [80, 'fuerte'], [94, 'fuerte'], [95, 'dominante'], [100, 'dominante']];
  for (const [n, b] of casos) assert.equal(T.banda(n), b, String(n));
});

test('cada banda tiene nombre y frase', () => {
  for (const clave of ['invisible', 'vulnerable', 'saludable', 'fuerte', 'dominante']) {
    assert.ok(T.BANDAS[clave].nombre);
    assert.ok(T.BANDAS[clave].frase);
  }
});

/* ---------------- Acciones ---------------- */
test('acciones de Guajiro: fotos +16; sitio web y horario +11 (empatan con reseñas y ganan por orden fijo)', () => {
  const a = T.acciones(base());
  assert.deepEqual(a.map(x => [x.clave, x.puntos]), [['fotos', 16], ['sitioweb', 11], ['horario', 11]]);
});

test('cada acción suma exactamente lo que da recalcular con ese cambio', () => {
  const e = base({ fotos: 3, totalResenas: 7, calificacion: 4.4 });
  const actual = T.calcular(e).tds;
  for (const a of T.acciones(e)) {
    assert.equal(a.puntos, T.calcular(T.aplicarAccion(e, a.clave)).tds - actual);
    assert.ok(a.puntos >= 1);
  }
});

test('lo que ya se cumple no aparece como acción', () => {
  const a = T.acciones(base({ sitioWeb: true, horarioCompleto: true, fotos: 10, totalResenas: 60 }));
  assert.deepEqual(a, []);
});

test('simular no cambia la entrada original', () => {
  const e = base();
  const copia = JSON.parse(JSON.stringify(e));
  const s = T.simular(e, { sitioWeb: true });
  assert.ok(s.tds > T.calcular(e).tds);
  assert.deepEqual(e, copia);
});

/* ---------------- Palabras prohibidas (principio I) ---------------- */
test('ningún texto predice clientes perdidos ni promete resultados', () => {
  const PROHIBIDO = /pierd|perdiendo|cuestan? clientes|regal|no existes|garantiz|seguro que|%.*clientes|themora/i;
  const textos = [];
  for (const b of Object.values(T.BANDAS)) textos.push(b.frase, b.nombre);
  textos.push(T.FRASE_NO_ENCONTRADO);
  const entradas = [
    base(), base({ calificacion: null, totalResenas: 0 }), base({ giroMedible: false, fotos: null }),
    base({ posicionGiro: 2, sitioWeb: true, horarioCompleto: true, fotos: 10, totalResenas: 90, calificacion: 4.9 }),
    base({ posicionGiro: 7 }), { encontrado: false, referencia: FIJA },
  ];
  for (const e of entradas) {
    const r = T.calcular(e);
    r.pilares.forEach(p => textos.push(p.razon));
    T.acciones(e).forEach(a => textos.push(a.texto));
  }
  for (const t of textos) assert.doesNotMatch(t, PROHIBIDO, t);
});
