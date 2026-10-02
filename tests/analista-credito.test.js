/* Analista de reportes de crédito (especificación 014: resumen del consumidor).
   Ejecutar:  node --test tests/analista-credito.test.js

   Todos los reportes de tests/fixtures/credito/ son SINTÉTICOS (personas, acreedores y números
   inventados). Spec: specs/014-resumen-consumidor (data-model.md, contracts/analista-api.md). */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const L = require('../lector-credito.js');
const A = require('../analista-credito.js');

const FIX = path.join(__dirname, 'fixtures', 'credito');
const cargar = (nombre) => JSON.parse(fs.readFileSync(path.join(FIX, nombre), 'utf8'));
const leer = (nombre, opciones) => L.leerReporte(cargar(nombre), opciones);
const pag = (...lineas) => [{ numero: 1, lineas: lineas.map((texto) => ({ texto })) }];

test('analizar: rechaza lo que no es un Reporte y devuelve la forma de Analisis', () => {
  assert.throws(() => A.analizar(null), TypeError);
  assert.throws(() => A.analizar({}), TypeError);
  const a = A.analizar({ cuentas: [], consultas: [], registrosPublicos: [], identidad: { nombres: [], direcciones: [], telefonos: [] }, advertencias: [] });
  assert.deepStrictEqual(Object.keys(a).sort(), ['abiertas', 'advertencias', 'conclusion', 'consultas', 'pasos', 'problemas', 'resumen'].sort());
});

/* ------------------------------------------------------------ US1: resumen claro y confiable */

test('US1 resumen: datos generales de experian-resumen.json', () => {
  const r = A.analizar(leer('experian-resumen.json')).resumen;
  assert.deepStrictEqual(r.buro, { id: 'experian', nombre: 'Experian' });
  assert.ok(r.fecha && r.fecha.iso.startsWith('2026-05'), 'fecha del reporte');
  assert.strictEqual(r.fecha.texto, '20 de mayo de 2026');
  assert.strictEqual(r.nombre, 'ANA PRUEBA EJEMPLO');
  assert.deepStrictEqual(r.ssn, { mostrado: true, ultimos4: '4321' });
  assert.deepStrictEqual(r.telefono, { actual: '(555) 010-0001', otros: 1 });
  assert.deepStrictEqual(r.direccion, { actual: '100 CALLE FALSA, CIUDAD EJEMPLO, FL 00000', otras: 2 });
  assert.deepStrictEqual(r.cuentas, { total: 5, abiertas: 2, cerradas: 2, enCobranza: 1 });
  assert.strictEqual(r.registrosPublicos, 0);
});

test('US1 resumen: sin nombre legible y sin SSN impreso', () => {
  const r = A.analizar(L.leerReporte(pag('Experian Credit Report', 'Personal Information', 'Name ID #1'))).resumen;
  assert.strictEqual(r.nombre, 'Nombre no legible en el reporte');
  assert.deepStrictEqual(r.ssn, { mostrado: false, ultimos4: null });
  assert.deepStrictEqual(r.telefono, { actual: null, otros: 0 });
});

test('US1 (Review Focus #1): si no se pudieron leer las cuentas, se dice; no se presenta como limpio', () => {
  const a = A.analizar(L.leerReporte(pag('Experian Credit Report', 'Accounts', 'Credit Inquiries', 'Hard Inquiries')));
  assert.ok(a.advertencias.includes('No pudimos leer las cuentas de este reporte.'), a.advertencias.join(' | '));
  assert.deepStrictEqual(a.problemas, []);
});

test('US1 cuentas abiertas: solo tipos con cuentas, en orden fijo', () => {
  const a = A.analizar(leer('experian-resumen.json'));
  assert.deepStrictEqual(a.abiertas, { total: 2, porTipo: [{ tipo: 'rotativa', etiqueta: 'Tarjetas', cantidad: 2 }] });
  const eq = A.analizar(leer('equifax.json'));
  assert.ok(eq.abiertas.porTipo.every((t) => t.cantidad > 0));
  assert.strictEqual(eq.abiertas.porTipo.reduce((s, t) => s + t.cantidad, 0), eq.abiertas.total);
});

test('US1 consultas: duras y blandas agrupadas por empresa, la más reciente primero', () => {
  const c = A.analizar(leer('experian-resumen.json')).consultas;
  assert.strictEqual(c.duras.total, 3);
  assert.deepStrictEqual(c.duras.porEmpresa, [
    { empresa: 'BANCO DEMO', fechas: ['05/12/2026', '12/20/2025'] },
    { empresa: 'AUTOS PRUEBA FINANCIAL', fechas: ['04/04/2025'] }
  ]);
  assert.strictEqual(c.blandas.total, 5);
  assert.deepStrictEqual(c.blandas.porEmpresa.map((g) => g.empresa), ['MONITOREO DEMO', 'TIENDA PROMO']);
});

test('US1 consultas (Review Focus #5): 113 blandas de 12 empresas quedan en 12 grupos', () => {
  const lineas = ['Experian Credit Report', 'Soft Inquiries'];
  for (let i = 0; i < 113; i++) {
    // Fecha única por empresa (el lector une consultas de la misma empresa en la misma fecha).
    lineas.push('EMPRESA DEMO ' + (i % 12), 'Inquired on: ' + String(1 + (i % 12)).padStart(2, '0') + '/' + String(1 + Math.floor(i / 12)).padStart(2, '0') + '/2025');
  }
  const c = A.analizar(L.leerReporte(pag(...lineas))).consultas;
  assert.strictEqual(c.blandas.total, 113);
  assert.strictEqual(c.blandas.porEmpresa.length, 12);
  assert.strictEqual(c.blandas.porEmpresa.reduce((s, g) => s + g.fechas.length, 0), 113);
});

/* ------------------------------------------------------------ US2: cuentas con problemas (spec 014 T017–T018, hechas en la 019) */

const val = (valor, etiqueta) => ({ valor, texto: String(valor && valor.texto ? valor.texto : valor), origen: { pagina: 2, seccion: 'cuentas', etiqueta: etiqueta || 'X', linea: 1 } });
const fechaV = (iso) => val({ texto: iso, iso });
const cta = (id, extra) => Object.assign({ id, acreedor: val('BANCO ' + id), cerrada: false, esCobranza: false, historial: [], historial24: [], atrasosListados: [], codigosNarrativos: [], comentarios: [] }, extra || {});
const rep = (cuentas, extra) => Object.assign({ buro: 'experian', fechaReporte: fechaV('2026-05-20'), cuentas, consultas: [], registrosPublicos: [], identidad: { nombres: [], direcciones: [], telefonos: [] }, advertencias: [] }, extra || {});
const mes = (anio, m, codigo) => ({ anio, mes: m, codigo, texto: codigo, mesVerificable: true, origen: { pagina: 2, seccion: 'cuentas', etiqueta: 'Payment History', linea: 3 } });

test('US2 problemas y gravedad (T017)', () => {
  const p = A.analizar(rep([
    cta('cob', { esCobranza: true, fechaCobranza: fechaV('2025-01') }),
    cta('co', { montoChargeOff: val(144), fechaChargeOff: fechaV('2025-03') }),
    cta('at', { historial: [mes(2025, 6, 'atraso_30')] }),
    cta('ven', { vencido: val(50) }),
    cta('mar', { marcaNegativaBuro: true }),
    cta('ok', { historial: [mes(2025, 6, 'al_dia')] }),
    cta('coat', { montoChargeOff: val(90), fechaChargeOff: fechaV('2024-02'), historial: [mes(2024, 1, 'atraso_60')] })
  ], { registrosPublicos: [{ tipo: 'bancarrota_7', fechaPresentacion: fechaV('2020-04') }] })).problemas;
  const por = Object.fromEntries(p.map((x) => [x.id, x]));
  assert.strictEqual(por.cob.gravedad, 'roja');
  assert.strictEqual(por.cob.hallazgos[0].regla, 'cobranza');
  assert.strictEqual(por.co.gravedad, 'roja');
  assert.strictEqual(por.at.gravedad, 'naranja');
  assert.strictEqual(por.ven.gravedad, 'naranja');
  assert.strictEqual(por.mar.gravedad, 'amarilla');
  assert.ok(!por.ok);
  assert.strictEqual(por.coat.gravedad, 'roja');
  assert.deepStrictEqual(por.coat.hallazgos.map((h) => h.regla).slice(0, 2), ['charge_off', 'atraso']);
  assert.ok(por['rp-0'] && por['rp-0'].gravedad === 'roja');
  const orden = p.map((x) => x.gravedad);
  assert.deepStrictEqual(orden, orden.slice().sort((a, b) => ['roja', 'naranja', 'amarilla'].indexOf(a) - ['roja', 'naranja', 'amarilla'].indexOf(b)));
  const rojas = p.filter((x) => x.gravedad === 'roja').map((x) => x.id);
  assert.deepStrictEqual(rojas, ['co', 'cob', 'coat', 'rp-0']);
});

test('US2 utilidades: iniciales, nombreCorto y frase (T018)', () => {
  assert.strictEqual(A.iniciales('COOPERATIVA DEMO CREDIT UNION'), 'CD');
  assert.strictEqual(A.iniciales('AMERICREDIT/GM FINANCIAL'), 'AG');
  assert.strictEqual(A.iniciales('DISCOVER CARD'), 'DI');
  assert.strictEqual(A.iniciales('WFBNA CARD'), 'WF');
  assert.strictEqual(A.iniciales(''), '?');
  assert.strictEqual(A.iniciales('123'), '?');
  assert.strictEqual(A.nombreCorto('TARJETA EJEMPLO BANK NA'), 'Tarjeta Ejemplo');
  const largo = A.nombreCorto('ABCDEFGHIJ KLMNOPQRST UVWXYZABCD EFGHIJKLMN');
  assert.ok(largo.length <= 22 && largo.endsWith('…'));
  const p = A.analizar(leer('experian-resumen.json')).problemas;
  const frase = (i) => p.find((x) => x.id.indexOf(i) >= 0).frase;
  assert.strictEqual(frase('3411'), 'Charge-off, feb. 2026');
  assert.strictEqual(frase('7508'), 'Atraso de 30 días, feb. 2026');
  assert.ok(frase('0123').startsWith('En cobranza'));
  assert.deepStrictEqual(p.map((x) => [x.acreedor, x.gravedad]), [
    ['COBROS EJEMPLO LLC', 'roja'], ['COOPERATIVA DEMO CREDIT UNION', 'roja'], ['COOPERATIVA DEMO CREDIT UNION', 'naranja']]);
});

/* ------------------------------------------------------------ US3: la ley y las opciones (spec 014 T024–T025, hechas en la 019) */

test('US3 invariantes de REGLAS (T024)', () => {
  const leyes = fs.readFileSync(path.join(__dirname, '..', 'zyron-leyes.js'), 'utf8');
  const prohibidas = /\bdebes\b|no pagues|es ilegal|garantiz|\bcliente/i;
  A.REGLAS.forEach((r) => {
    (r.citas || []).forEach((c) => {
      const base = c.seccion.replace(/\(.*$/, '').trim();
      assert.ok(leyes.includes(base), r.id + ' cita ' + c.seccion + ' que no está en zyron-leyes.js');
    });
    const textos = JSON.stringify([r.textos, r.citas]);
    assert.ok(!prohibidas.test(textos), r.id + ' usa palabras prohibidas');
    ['ANA', 'COBROS', 'COOPERATIVA', 'CALLE'].forEach((x) => assert.ok(!textos.includes(x), r.id + ' contiene ' + x));
    if (r.gravedad === 'roja' || r.gravedad === 'naranja') {
      assert.ok(r.citas.length >= 1, r.id + ' sin citas');
      assert.ok(r.textos.opciones.length >= 1, r.id + ' sin opciones');
    }
  });
  const hallazgos = JSON.stringify(A.analizar(leer('experian-resumen.json')).problemas.map((p) => p.hallazgos));
  assert.ok(!prohibidas.test(hallazgos));
});

test('US3 esObsoleta (T025)', () => {
  const rep = '2026-05-20';
  assert.strictEqual(A.esObsoleta(cta('a', { dofd: fechaV('2018-01') }), rep), true);
  assert.strictEqual(A.esObsoleta(cta('b', { dofd: fechaV('2021-01') }), rep), false);
  assert.strictEqual(A.esObsoleta(cta('c', { historial: [mes(2017, 3, 'atraso_30')] }), rep), true);
  assert.strictEqual(A.esObsoleta(cta('d'), rep), false);
  const cobranza = A.analizar(leer('experian-resumen.json')).problemas.find((p) => p.id.includes('0123'));
  const obs = cobranza.hallazgos.find((h) => h.regla === 'obsoleta');
  assert.ok(obs, 'la cobranza del fixture tiene hallazgo obsoleta');
  assert.ok(obs.queDiceLaLey.some((c) => c.seccion === '§ 1681c(a)'));
  assert.strictEqual(cobranza.gravedad, 'roja');
});

/* ------------------------------------------------------------ US4: pasos (spec 014 T031, hecha en la 019) */

test('US4 pasos con datos reales (T031)', () => {
  const a = A.analizar(leer('experian-resumen.json'));
  assert.deepStrictEqual(a.pasos.map((p) => p.id), ['observar', 'leer', 'revisar', 'concluir']);
  a.pasos.forEach((p) => assert.strictEqual(p.estado, 'hecho'));
  assert.ok(a.pasos[0].texto.includes('Experian') && a.pasos[0].texto.includes('2026'));
  assert.ok(a.pasos[1].texto.includes('5 cuentas') && a.pasos[1].texto.includes('3 consultas duras'), a.pasos[1].texto);
  assert.strictEqual(a.pasos[2].texto, 'Revisé cada cuenta contra la FCRA y la FDCPA');
  assert.strictEqual(a.pasos[3].texto, 'Encontré 3 cuentas con problemas');
  const uno = A.analizar(rep([cta('x', { esCobranza: true })]));
  assert.strictEqual(uno.pasos[3].texto, 'Encontré 1 cuenta con problemas');
  assert.strictEqual(A.analizar(rep([])).pasos[3].texto, 'No encontré cuentas con problemas');
});
