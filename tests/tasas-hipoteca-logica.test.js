/* Pruebas de la lógica pura del agente de tasas hipotecarias
   (netlify/functions/tasas-hipoteca-logica.js). No usan red ni base de datos:
   leen archivos de muestra en tests/fixtures/tasas/ con la misma forma que los
   feeds reales. Correr con:  node --test tests/*.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const L = require('../netlify/functions/tasas-hipoteca-logica.js');

const fx = nombre => fs.readFileSync(path.join(__dirname, 'fixtures', 'tasas', nombre), 'utf8');
const utc = (iso) => new Date(iso);

/* ------------------------------------------------------------------ *
 *  Catálogo de fuentes (US4)
 * ------------------------------------------------------------------ */
test('el catálogo tiene exactamente las tres fuentes de la v1 (MND y MBA no están)', () => {
  const ids = L.FUENTES.map(f => f.id).sort();
  assert.deepEqual(ids, ['freddie-pmms', 'nyfed-objetivo', 'tesoro-10a']);
});

test('cada fuente tiene nombre, qué mide, frecuencia, enlace https y atribución', () => {
  for (const f of L.FUENTES) {
    for (const campo of ['nombre', 'mide', 'frecuencia', 'url', 'atribucion']) {
      assert.ok(typeof f[campo] === 'string' && f[campo].trim().length > 3, `${f.id}.${campo}`);
    }
    assert.match(f.url, /^https:\/\//, `${f.id} url`);
  }
});

test('solo Freddie Mac es titular y muestra cifras; las otras son señales', () => {
  const titulares = L.FUENTES.filter(f => f.rol === 'titular');
  assert.equal(titulares.length, 1);
  assert.equal(titulares[0].id, 'freddie-pmms');
  assert.equal(titulares[0].mostrar_cifras, true);
  for (const f of L.FUENTES.filter(x => x.rol === 'senal')) {
    assert.equal(f.mostrar_cifras, false, `${f.id} no muestra cifras`);
  }
});

/* ------------------------------------------------------------------ *
 *  PMMS: lectura del archivo de Freddie Mac (US1)
 * ------------------------------------------------------------------ */
test('parsePmms toma las dos últimas filas completas y convierte la fecha a ISO', () => {
  const r = L.parsePmms(fx('pmms-ok.csv'));
  assert.equal(r.ok, true);
  assert.deepEqual(r.actual, { fechaFuente: '2026-09-17', pmms30: 6.95, pmms15: 6.26 });
  assert.deepEqual(r.previa, { fechaFuente: '2026-09-10', pmms30: 6.76, pmms15: 6.09 });
});

test('parsePmms ignora líneas vacías al final y no redondea los valores', () => {
  const r = L.parsePmms(fx('pmms-ok.csv'));
  assert.equal(r.actual.pmms30, 6.95);
  assert.equal(r.previa.pmms15, 6.09);
});

test('parsePmms salta la fila nueva si le falta el 15 años y usa las dos últimas completas', () => {
  const r = L.parsePmms(fx('pmms-columnas-vacias.csv'));
  assert.equal(r.ok, true);
  assert.equal(r.actual.fechaFuente, '2026-09-17');
  assert.equal(r.previa.fechaFuente, '2026-09-10');
});

test('parsePmms devuelve un error (no lanza y no adivina) con archivos malos o vacíos', () => {
  for (const nombre of ['pmms-malformado.csv', 'pmms-vacio.csv']) {
    const r = L.parsePmms(fx(nombre));
    assert.equal(r.ok, false, nombre);
    assert.equal(r.error, 'formato inesperado');
  }
  assert.equal(L.parsePmms('').ok, false);
  assert.equal(L.parsePmms(null).ok, false);
});

test('calcularCambio es valor − previo con 3 decimales', () => {
  assert.equal(L.calcularCambio(6.95, 6.76), 0.19);
  assert.equal(L.calcularCambio(6.26, 6.09), 0.17);
  assert.equal(L.calcularCambio(6.7, 6.7), 0);
  assert.equal(L.calcularCambio(6.5, 6.625), -0.125);
});

test('plausibilidad: PMMS fuera de [1, 15] se retiene', () => {
  assert.equal(L.evaluarPlausibilidad('pmms30', 6.95, 6.76).ok, true);
  assert.equal(L.evaluarPlausibilidad('pmms30', 0.5, null).ok, false);
  assert.equal(L.evaluarPlausibilidad('pmms15', 15.5, null).ok, false);
});

test('plausibilidad: un salto de más de 1.0 punto frente a la lectura previa se retiene', () => {
  const r = L.evaluarPlausibilidad('pmms30', 8.10, 6.76);
  assert.equal(r.ok, false);
  assert.equal(r.nota, 'salto > 1.0 pp');
  assert.equal(L.evaluarPlausibilidad('pmms30', 7.76, 6.76).ok, true, 'exactamente 1.0 no es "más de"');
});

test('plausibilidad: Tesoro fuera de [0, 15] y Fed fuera de [0, 20] se retienen', () => {
  assert.equal(L.evaluarPlausibilidad('dgs10', 4.9, null).ok, true);
  assert.equal(L.evaluarPlausibilidad('dgs10', 16, null).ok, false);
  assert.equal(L.evaluarPlausibilidad('dgs10', -0.1, null).ok, false);
  assert.equal(L.evaluarPlausibilidad('fed_hasta', 4.0, null).ok, true);
  assert.equal(L.evaluarPlausibilidad('fed_hasta', 21, null).ok, false);
});

test('construirSnapshotTitular arma 30 y 15 años y no incluye señales', () => {
  const r = L.parsePmms(fx('pmms-ok.csv'));
  const s = L.construirSnapshotTitular(r);
  assert.deepEqual(s['30'], { valor: 6.95, previo: 6.76, cambioPp: 0.19, fechaFuente: '2026-09-17' });
  assert.deepEqual(s['15'], { valor: 6.26, previo: 6.09, cambioPp: 0.17, fechaFuente: '2026-09-17' });
  assert.deepEqual(Object.keys(s).sort(), ['15', '30']);
  assert.ok(!JSON.stringify(s).match(/tesoro|fed|dgs10/i));
});

/* ------------------------------------------------------------------ *
 *  Calendario y frescura (US2)
 * ------------------------------------------------------------------ */
test('lunes y martes son corridas de publicación; los otros días, de vigilancia', () => {
  // 2026-09-21 es lunes.
  const dias = { '2026-09-20': 'vigilancia', '2026-09-21': 'publicacion', '2026-09-22': 'publicacion',
    '2026-09-23': 'vigilancia', '2026-09-24': 'vigilancia', '2026-09-25': 'vigilancia', '2026-09-26': 'vigilancia' };
  for (const [dia, esperado] of Object.entries(dias)) {
    assert.equal(L.tipoDeCorrida(utc(dia + 'T13:00:00Z')), esperado, dia);
  }
});

test('el interruptor de prueba fuerza el tipo de corrida', () => {
  const jueves = utc('2026-09-24T13:00:00Z');
  assert.equal(L.tipoDeCorrida(jueves, 'publicacion'), 'publicacion');
  assert.equal(L.tipoDeCorrida(utc('2026-09-21T13:00:00Z'), 'vigilancia'), 'vigilancia');
  assert.equal(L.tipoDeCorrida(jueves, 'cualquier-cosa'), 'vigilancia', 'valor inválido se ignora');
});

test('proximaActualizacion: el siguiente lunes o martes a las 13:00 UTC, estrictamente después', () => {
  assert.equal(L.proximaActualizacion(utc('2026-09-21T13:04:00Z')).toISOString(), '2026-09-22T13:00:00.000Z');
  assert.equal(L.proximaActualizacion(utc('2026-09-22T13:04:00Z')).toISOString(), '2026-09-28T13:00:00.000Z');
  assert.equal(L.proximaActualizacion(utc('2026-09-20T10:00:00Z')).toISOString(), '2026-09-21T13:00:00.000Z');
  assert.equal(L.proximaActualizacion(utc('2026-09-21T09:00:00Z')).toISOString(), '2026-09-21T13:00:00.000Z');
  assert.equal(L.proximaActualizacion(utc('2026-09-24T18:00:00Z')).toISOString(), '2026-09-28T13:00:00.000Z');
});

test('calcularFrescura: al_dia / sin_actualizar / sin_datos', () => {
  const lunes = '2026-09-21T13:00:05Z';
  assert.equal(L.calcularFrescura(null, utc('2026-09-21T14:00:00Z')), 'sin_datos');
  // Publicó el lunes; el miércoles sigue al día (la última ranura fue el martes... o el lunes)
  assert.equal(L.calcularFrescura(lunes, utc('2026-09-21T15:00:00Z')), 'al_dia');
  // Martes 13:00 pasó, aún dentro de la gracia de 3 horas sin publicación nueva.
  assert.equal(L.calcularFrescura(lunes, utc('2026-09-22T14:30:00Z')), 'al_dia');
  // Martes 17:00: la ranura pasó hace más de 3 horas sin publicación nueva.
  assert.equal(L.calcularFrescura(lunes, utc('2026-09-22T17:00:00Z')), 'sin_actualizar');
  // Si publicó el martes, el jueves sigue al día.
  assert.equal(L.calcularFrescura('2026-09-22T13:00:04Z', utc('2026-09-24T12:00:00Z')), 'al_dia');
  // El lunes siguiente, pasada la gracia y sin publicar: sin actualizar.
  assert.equal(L.calcularFrescura('2026-09-22T13:00:04Z', utc('2026-09-28T17:00:00Z')), 'sin_actualizar');
});

test('resultadoDeCorrida: ok / parcial / fallo', () => {
  assert.equal(L.resultadoDeCorrida({ a: 'ok', b: 'ok', c: 'ok' }), 'ok');
  assert.equal(L.resultadoDeCorrida({ a: 'ok', b: 'timeout', c: 'ok' }), 'parcial');
  assert.equal(L.resultadoDeCorrida({ a: 'timeout', b: 'http 503' }), 'fallo');
  assert.equal(L.resultadoDeCorrida({}), 'fallo');
});

/* ------------------------------------------------------------------ *
 *  Tesoro, Fed y meses a traer (US3)
 * ------------------------------------------------------------------ */
test('parseTesoro lee fecha y rendimiento a 10 años y los ordena', () => {
  const r = L.parseTesoro(fx('tesoro-ok.xml'));
  assert.equal(r.ok, true);
  assert.equal(r.filas.length, 7);
  assert.deepEqual(r.filas[0], { fecha: '2026-09-10', valor: 4.81 });
  assert.deepEqual(r.filas[r.filas.length - 1], { fecha: '2026-09-18', valor: 5.07 });
});

test('parseTesoro y parseNyFed devuelven error con archivos malos', () => {
  assert.equal(L.parseTesoro(fx('tesoro-malformado.xml')).ok, false);
  assert.equal(L.parseTesoro('').ok, false);
  assert.equal(L.parseNyFed(fx('nyfed-malformado.json')).ok, false);
  assert.equal(L.parseNyFed('esto no es json').ok, false);
});

test('parseNyFed toma el día más reciente aunque vengan en cualquier orden', () => {
  const r = L.parseNyFed(fx('nyfed-cambio.json'));
  assert.equal(r.ok, true);
  assert.deepEqual(r.actual, { fechaFuente: '2026-09-17', desde: 3.75, hasta: 4.00 });
});

test('mesesATraer: mes actual, y el anterior cuando la base cae en él', () => {
  assert.deepEqual(L.mesesATraer(utc('2026-05-04T13:00:00Z'), '2026-04-30'), ['202605', '202604']);
  assert.deepEqual(L.mesesATraer(utc('2026-05-12T13:00:00Z'), '2026-05-07'), ['202605']);
  assert.deepEqual(L.mesesATraer(utc('2026-01-05T13:00:00Z'), '2025-12-31'), ['202601', '202512']);
  assert.deepEqual(L.mesesATraer(utc('2026-05-12T13:00:00Z'), null), ['202605']);
});

test('baseTesoro: la fila de la fecha base, o la anterior más cercana, incluso de otro mes', () => {
  const t = L.parseTesoro(fx('tesoro-ok.xml'));
  assert.deepEqual(L.baseTesoro(t.filas, '2026-09-17'), { fecha: '2026-09-17', valor: 4.94 });
  const sin = L.parseTesoro(fx('tesoro-sin-base.xml'));
  assert.deepEqual(L.baseTesoro(sin.filas, '2026-09-17'), { fecha: '2026-09-16', valor: 4.93 });
  const mes = L.parseTesoro(fx('tesoro-base-mes-anterior.xml'));
  assert.deepEqual(L.baseTesoro(mes.filas, '2026-04-30'), { fecha: '2026-04-30', valor: 4.45 });
  assert.equal(L.baseTesoro(mes.filas, '2026-01-01'), null, 'sin base → null');
});

/* ------------------------------------------------------------------ *
 *  Reglas de alertas (US3)
 * ------------------------------------------------------------------ */
const pmms = (a30, a15, p30, p15, fecha = '2026-09-17') => ({
  actual: { fechaFuente: fecha, pmms30: a30, pmms15: a15 },
  previa: { fechaFuente: '2026-09-10', pmms30: p30, pmms15: p15 },
});
const base = (over = {}) => Object.assign({
  umbral: 0.125, pmms: null, tesoro: null, fed: null,
  alertasActivas: [], clavesExistentes: [], tipoCorrida: 'vigilancia',
}, over);

test('umbral: 0.12 no alerta, 0.125 sí; otro umbral cambia el resultado', () => {
  const no = L.evaluarAlertas(base({ pmms: pmms(6.88, 6.21, 6.76, 6.09) }));   // +0.12 y +0.12
  assert.equal(no.nuevas.length, 0);
  const si = L.evaluarAlertas(base({ pmms: pmms(6.885, 6.21, 6.76, 6.09) }));  // +0.125
  assert.equal(si.nuevas.length, 1);
  assert.equal(si.nuevas[0].termino, '30');
  const bajo = L.evaluarAlertas(base({ umbral: 0.05, pmms: pmms(6.88, 6.21, 6.76, 6.09) }));
  assert.equal(bajo.nuevas.length, 2, 'con umbral 0.05 ambos plazos alertan');
});

test('movimiento semanal: una alerta por plazo, con dirección, tamaño, fecha y fuente', () => {
  const r = L.evaluarAlertas(base({ pmms: pmms(6.95, 6.26, 6.76, 6.09) }));
  assert.equal(r.nuevas.length, 2);
  const a30 = r.nuevas.find(a => a.termino === '30');
  assert.equal(a30.tipo, 'movimiento_semanal');
  assert.equal(a30.direccion, 'sube');
  assert.equal(a30.magnitudPp, 0.19);
  assert.equal(a30.fechaFuente, '2026-09-17');
  assert.equal(a30.fuenteId, 'freddie-pmms');
  const baja = L.evaluarAlertas(base({ pmms: pmms(6.50, 6.09, 6.76, 6.09) }));
  assert.equal(baja.nuevas.length, 1);
  assert.equal(baja.nuevas[0].direccion, 'baja');
  assert.equal(baja.nuevas[0].magnitudPp, 0.26);
});

test('Tesoro: compara con su valor en la fecha del último PMMS y avisa que el semanal no se ha vuelto a publicar', () => {
  const tesoro = { actual: { fecha: '2026-09-18', valor: 5.07 }, base: { fecha: '2026-09-17', valor: 4.94 } };
  const r = L.evaluarAlertas(base({ tesoro }));
  assert.equal(r.nuevas.length, 1);
  const a = r.nuevas[0];
  assert.equal(a.tipo, 'tesoro_10a');
  assert.equal(a.termino, null);
  assert.equal(a.direccion, 'sube');
  assert.equal(a.magnitudPp, 0.13);
  assert.equal(a.fuenteId, 'tesoro-10a');
  assert.equal(a.datos.baseFecha, '2026-09-17');
  assert.equal(L.semanalPendiente(a), true);
  assert.equal(L.semanalPendiente({ tipo: 'movimiento_semanal' }), false);
});

test('Tesoro sin base: no hay alerta', () => {
  const r = L.evaluarAlertas(base({ tesoro: { actual: { fecha: '2026-09-18', valor: 5.07 }, base: null } }));
  assert.equal(r.nuevas.length, 0);
});

test('una señal nunca cambia las cifras titulares', () => {
  const r = L.evaluarAlertas(base({
    pmms: pmms(6.95, 6.26, 6.95, 6.26),
    tesoro: { actual: { fecha: '2026-09-18', valor: 5.30 }, base: { fecha: '2026-09-17', valor: 4.94 } },
  }));
  assert.equal(r.nuevas.length, 1);
  const snap = L.construirSnapshotTitular(pmms(6.95, 6.26, 6.95, 6.26));
  assert.equal(snap['30'].valor, 6.95);
  assert.equal(snap['30'].cambioPp, 0);
});

test('deduplicación: la misma clave nunca se avisa dos veces, ni si ya se cerró', () => {
  const primera = L.evaluarAlertas(base({ pmms: pmms(6.95, 6.26, 6.76, 6.09) }));
  const claves = primera.nuevas.map(a => a.clave);
  assert.equal(new Set(claves).size, claves.length, 'claves únicas');
  const segunda = L.evaluarAlertas(base({ pmms: pmms(6.95, 6.26, 6.76, 6.09), clavesExistentes: claves }));
  assert.equal(segunda.nuevas.length, 0, 'no se repite');
});

test('la clave cambia cuando cambia la base o crece el tamaño en pasos del umbral', () => {
  const t = (valor, baseFecha) => ({ actual: { fecha: '2026-09-18', valor }, base: { fecha: baseFecha, valor: 4.94 } });
  const a = L.evaluarAlertas(base({ tesoro: t(5.07, '2026-09-17') })).nuevas[0].clave;
  const b = L.evaluarAlertas(base({ tesoro: t(5.20, '2026-09-17') })).nuevas[0].clave;   // Δ 0.26 = 2 pasos
  const c = L.evaluarAlertas(base({ tesoro: t(5.07, '2026-09-16') })).nuevas[0].clave;
  assert.notEqual(a, b);
  assert.notEqual(a, c);
});

test('una corrida de publicación marca todas las alertas activas como superadas', () => {
  const activas = [{ id: 7, tipo: 'movimiento_semanal', clave: 'x' }, { id: 8, tipo: 'tesoro_10a', clave: 'y', datos: { baseFecha: '2026-09-17' } }];
  const r = L.evaluarAlertas(base({ tipoCorrida: 'publicacion', alertasActivas: activas, clavesExistentes: ['x', 'y'] }));
  assert.deepEqual(r.superadas.sort(), [7, 8]);
  const vig = L.evaluarAlertas(base({ tipoCorrida: 'vigilancia', alertasActivas: activas, clavesExistentes: ['x', 'y'] }));
  assert.deepEqual(vig.superadas, []);
});

test('histéresis del Tesoro: se despeja cuando |Δ| ≤ umbral/2 o cuando cambia la base', () => {
  const activa = { id: 9, tipo: 'tesoro_10a', clave: 'k', datos: { baseFecha: '2026-09-17' } };
  const sigue = L.evaluarAlertas(base({
    alertasActivas: [activa], clavesExistentes: ['k'],
    tesoro: { actual: { fecha: '2026-09-21', valor: 5.02 }, base: { fecha: '2026-09-17', valor: 4.94 } },   // Δ 0.08 > 0.0625
  }));
  assert.deepEqual(sigue.despejadas, []);
  const despeja = L.evaluarAlertas(base({
    alertasActivas: [activa], clavesExistentes: ['k'],
    tesoro: { actual: { fecha: '2026-09-21', valor: 4.99 }, base: { fecha: '2026-09-17', valor: 4.94 } },   // Δ 0.05 ≤ 0.0625
  }));
  assert.deepEqual(despeja.despejadas, [9]);
  const otraBase = L.evaluarAlertas(base({
    alertasActivas: [activa], clavesExistentes: ['k'],
    tesoro: { actual: { fecha: '2026-09-25', valor: 5.20 }, base: { fecha: '2026-09-24', valor: 5.10 } },
  }));
  assert.deepEqual(otraBase.despejadas, [9]);
});

const fed = (hastaAct, desdeAct, previo) => ({
  actual: { fechaFuente: '2026-09-17', desde: desdeAct, hasta: hastaAct }, previo,
});

test('Fed: un cambio del objetivo alerta con desde/hasta; mantenerlo no alerta', () => {
  const cambio = L.evaluarAlertas(base({ fed: fed(4.00, 3.75, { desde: 3.50, hasta: 3.75 }) }));
  assert.equal(cambio.nuevas.length, 1);
  const a = cambio.nuevas[0];
  assert.equal(a.tipo, 'fed_objetivo');
  assert.equal(a.termino, null);
  assert.equal(a.direccion, 'sube');
  assert.equal(a.magnitudPp, 0.25);
  assert.deepEqual(a.datos, { desde: '3.50–3.75', hasta: '3.75–4.00' });
  assert.equal(a.fuenteId, 'nyfed-objetivo');
  const baja = L.evaluarAlertas(base({ fed: fed(3.75, 3.50, { desde: 3.75, hasta: 4.00 }) }));
  assert.equal(baja.nuevas[0].direccion, 'baja');
  const igual = L.evaluarAlertas(base({ fed: fed(4.00, 3.75, { desde: 3.75, hasta: 4.00 }) }));
  assert.equal(igual.nuevas.length, 0, 'sin cambio no hay alerta');
});

test('Fed: la primera corrida guarda el valor y no alerta', () => {
  const r = L.evaluarAlertas(base({ fed: fed(4.00, 3.75, null) }));
  assert.equal(r.nuevas.length, 0);
});

test('prioridad del banner: Fed > semanal 30 > semanal 15 > Tesoro', () => {
  const lista = [
    { id: 1, tipo: 'tesoro_10a', termino: null },
    { id: 2, tipo: 'movimiento_semanal', termino: '15' },
    { id: 3, tipo: 'fed_objetivo', termino: null },
    { id: 4, tipo: 'movimiento_semanal', termino: '30' },
  ];
  assert.deepEqual(L.prioridadBanner(lista).map(a => a.id), [3, 4, 2, 1]);
});

/* ------------------------------------------------------------------ *
 *  Respuesta pública (contrato snapshot-public.md)
 * ------------------------------------------------------------------ */
const CONFIG_ON = { activo: true, umbral_pp: 0.125 };
const snapshotGuardado = () => ({
  snapshot: L.construirSnapshotTitular(L.parsePmms(fx('pmms-ok.csv'))),
  publicado_en: '2026-09-21T13:00:05Z',
});
const filaAlerta = (o = {}) => Object.assign({
  id: 41, tipo: 'movimiento_semanal', termino: '30', direccion: 'sube', magnitud_pp: 0.19,
  datos: null, fecha_fuente: '2026-09-17', fuente_id: 'freddie-pmms', detectada_en: '2026-09-18T13:00:07Z',
  clave: 'interna', estado: 'activa', cerrada_en: null,
}, o);

test('respuesta pública: desactivada devuelve solo version y activo:false', () => {
  const r = L.construirRespuestaPublica({ config: { activo: false }, publicado: null, alertas: [], ahora: utc('2026-09-21T14:00:00Z') });
  assert.deepEqual(r, { version: 1, activo: false });
});

test('respuesta pública: activa pero sin datos → sin_datos, sin números', () => {
  const r = L.construirRespuestaPublica({ config: CONFIG_ON, publicado: null, alertas: [], ahora: utc('2026-09-21T14:00:00Z') });
  assert.equal(r.activo, true);
  assert.equal(r.frescura, 'sin_datos');
  assert.equal(r.terminos, null);
  assert.equal(r.publicadoEn, null);
  assert.deepEqual(r.alertas, []);
});

test('respuesta pública: al día con cifras titulares exactas y proxima actualización', () => {
  const r = L.construirRespuestaPublica({ config: CONFIG_ON, publicado: snapshotGuardado(), alertas: [], ahora: utc('2026-09-21T14:00:00Z') });
  assert.equal(r.frescura, 'al_dia');
  assert.equal(r.terminos['30'].valor, 6.95);
  assert.equal(r.terminos['15'].fechaFuente, '2026-09-17');
  assert.equal(r.proximaActualizacion, '2026-09-22T13:00:00.000Z');
  assert.equal(r.fuente.id, 'freddie-pmms');
  assert.equal(r.fuentesSenal.length, 2);
});

test('respuesta pública: sin_actualizar conserva las cifras y sus fechas originales', () => {
  const r = L.construirRespuestaPublica({ config: CONFIG_ON, publicado: snapshotGuardado(), alertas: [], ahora: utc('2026-09-22T18:00:00Z') });
  assert.equal(r.frescura, 'sin_actualizar');
  assert.equal(r.terminos['30'].valor, 6.95);
  assert.equal(r.terminos['30'].fechaFuente, '2026-09-17');
});

test('respuesta pública: las alertas salen ordenadas y solo con campos públicos', () => {
  const alertas = [
    filaAlerta({ id: 1, tipo: 'tesoro_10a', termino: null, fuente_id: 'tesoro-10a', datos: { baseFecha: '2026-09-17', baseValor: 4.94 } }),
    filaAlerta({ id: 2, tipo: 'fed_objetivo', termino: null, fuente_id: 'nyfed-objetivo', datos: { desde: '3.50–3.75', hasta: '3.75–4.00' } }),
    filaAlerta({ id: 3, estado: 'superada' }),
  ];
  const r = L.construirRespuestaPublica({ config: CONFIG_ON, publicado: snapshotGuardado(), alertas, ahora: utc('2026-09-21T14:00:00Z') });
  assert.deepEqual(r.alertas.map(a => a.id), [2, 1], 'solo activas, Fed primero');
  const publica = r.alertas[0];
  assert.deepEqual(Object.keys(publica).sort(), ['datos', 'detectadaEn', 'direccion', 'fechaFuente', 'fuente', 'id', 'magnitudPp', 'semanalPendiente', 'termino', 'tipo']);
  assert.equal(publica.semanalPendiente, true);
  assert.deepEqual(publica.datos, { desde: '3.50–3.75', hasta: '3.75–4.00' });
  assert.equal(r.alertas[1].datos, null, 'los datos internos del Tesoro no salen');
  assert.ok(!JSON.stringify(r).includes('interna'), 'la clave interna no sale');
  for (const a of r.alertas) {
    for (const campo of ['tipo', 'direccion', 'magnitudPp', 'fechaFuente', 'fuente']) assert.ok(a[campo] !== undefined, campo);
  }
});

/* ------------------------------------------------------------------ *
 *  Vista del dueño (US5)
 * ------------------------------------------------------------------ */
test('diasEsperados: marca los días sin corrida y distingue publicación de vigilancia', () => {
  const ahora = utc('2026-09-22T14:00:00Z');   // martes, ya pasó la ranura de las 13:00
  const corridas = [
    { corrida_en: '2026-09-22T13:00:06Z', tipo: 'publicacion', resultado: 'ok' },
    { corrida_en: '2026-09-21T13:00:05Z', tipo: 'publicacion', resultado: 'ok' },
    { corrida_en: '2026-09-19T13:00:04Z', tipo: 'vigilancia', resultado: 'ok' },
  ];
  const dias = L.diasEsperados(ahora, corridas, 14);
  assert.equal(dias.length, 14);
  assert.equal(dias[0].dia, '2026-09-22', 'el día actual va primero cuando ya pasó su hora');
  const por = Object.fromEntries(dias.map(d => [d.dia, d]));
  assert.deepEqual(por['2026-09-22'], { dia: '2026-09-22', esperada: 'publicacion', hubo: true });
  assert.equal(por['2026-09-21'].esperada, 'publicacion');
  assert.equal(por['2026-09-20'].hubo, false, 'domingo sin corrida = falta');
  assert.equal(por['2026-09-20'].esperada, 'vigilancia');
  assert.equal(por['2026-09-19'].hubo, true);
});

test('diasEsperados: antes de las 13:00 UTC el día actual todavía no se espera', () => {
  const dias = L.diasEsperados(utc('2026-09-22T09:00:00Z'), [], 14);
  assert.equal(dias[0].dia, '2026-09-21');
});

test('horasDesdeUltimaOk cuenta desde la última corrida ok o parcial', () => {
  const ahora = utc('2026-09-22T16:00:00Z');
  const corridas = [
    { corrida_en: '2026-09-22T13:00:00Z', resultado: 'fallo' },
    { corrida_en: '2026-09-21T13:00:00Z', resultado: 'parcial' },
    { corrida_en: '2026-09-20T13:00:00Z', resultado: 'ok' },
  ];
  assert.equal(L.horasDesdeUltimaOk(corridas, ahora), 27);
  assert.equal(L.horasDesdeUltimaOk([{ corrida_en: '2026-09-22T13:00:00Z', resultado: 'fallo' }], ahora), null);
  assert.equal(L.horasDesdeUltimaOk([], ahora), null);
});

test('sanearErrorFuente devuelve solo una categoría corta, nunca una URL ni una traza', () => {
  assert.equal(L.sanearErrorFuente(new Error('The operation was aborted due to timeout')), 'timeout');
  assert.equal(L.sanearErrorFuente('AbortError'), 'timeout');
  assert.equal(L.sanearErrorFuente('respuesta http 503 de https://x.example/secreto?key=abc'), 'http 503');
  assert.equal(L.sanearErrorFuente(new Error('Unexpected token < in JSON at https://x.example/a?k=1\n    at foo (file.js:1:1)')), 'formato inesperado');
  for (const s of ['timeout', 'http 503', 'formato inesperado']) assert.ok(!/https?:|at .*\(/.test(s));
});

/* ---------------- casas flotantes: ultimaRevisionEn (specs/006-floating-rate-houses) ---------------- */
const CLAVES_004 = ['version', 'activo', 'generadoEn', 'frescura', 'publicadoEn', 'proximaActualizacion', 'fuente', 'terminos', 'alertas', 'fuentesSenal'];

test('respuesta pública: copia ultimaRevisionEn tal cual (texto ISO) y es null si falta', () => {
  const base = { config: CONFIG_ON, publicado: snapshotGuardado(), alertas: [], ahora: utc('2026-09-21T14:00:00Z') };
  const con = L.construirRespuestaPublica({ ...base, ultimaRevision: '2026-09-24T13:00:04.000Z' });
  assert.equal(con.ultimaRevisionEn, '2026-09-24T13:00:04.000Z');
  assert.equal(L.construirRespuestaPublica({ ...base, ultimaRevision: null }).ultimaRevisionEn, null);
  assert.equal(L.construirRespuestaPublica(base).ultimaRevisionEn, null);
  assert.equal(L.construirRespuestaPublica({ ...base, config: CONFIG_ON, publicado: null, ultimaRevision: '2026-09-24T13:00:04.000Z' }).ultimaRevisionEn, '2026-09-24T13:00:04.000Z');
});

test('respuesta pública: solo gana la clave ultimaRevisionEn y la versión sigue en 1', () => {
  const r = L.construirRespuestaPublica({ config: CONFIG_ON, publicado: snapshotGuardado(), alertas: [], ahora: utc('2026-09-21T14:00:00Z'), ultimaRevision: '2026-09-24T13:00:04.000Z' });
  assert.deepEqual(Object.keys(r).sort(), [...CLAVES_004, 'ultimaRevisionEn'].sort());
  assert.equal(r.version, 1);
});

test('respuesta pública apagada no cambia: sigue siendo solo version y activo:false', () => {
  const r = L.construirRespuestaPublica({ config: { activo: false }, publicado: null, alertas: [], ahora: utc('2026-09-21T14:00:00Z'), ultimaRevision: '2026-09-24T13:00:04.000Z' });
  assert.deepEqual(r, { version: 1, activo: false });
});
