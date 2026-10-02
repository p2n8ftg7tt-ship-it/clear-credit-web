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
