/* Herramientas de cálculo del agente de crédito (spec 016).
   Ejecutar: node --test tests/herramientas-credito.test.js

   Todos los datos son sintéticos. Spec: specs/016-herramientas-agente-credito. */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const H = require('../herramientas-credito.js');

const FIX = path.join(__dirname, 'fixtures', 'credito');
function congelar(v) {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.values(v).forEach(congelar);
    Object.freeze(v);
  }
  return v;
}
const cargarAcme = () => congelar(JSON.parse(fs.readFileSync(path.join(FIX, 'agente', 'acme-zeta.json'), 'utf8')));
const origen = (etiqueta = 'Dato') => ({ pagina: 1, seccion: 'cuentas', etiqueta, linea: 1 });
const valor = (v, etiqueta) => ({ valor: v, texto: typeof v === 'object' ? v.iso : String(v), origen: origen(etiqueta) });
const fecha = (iso, etiqueta = 'Fecha') => valor({ texto: iso, iso }, etiqueta);
const cuenta = (id, extra = {}) => ({ id, cerrada: false, esCobranza: false, historial: [], atrasosListados: [], comentarios: [], codigosNarrativos: [], ...extra });
const consulta = (empresa, iso, tipo = 'dura') => ({ tipo, empresa: valor(empresa, 'Company'), ...(iso === undefined ? {} : { fecha: fecha(iso, 'Inquiry Date') }) });

test('base: nombre desconocido y catálogo congelado', () => {
  assert.throws(() => H.ejecutar('noExiste', cargarAcme(), {}), TypeError);
  assert.ok(Object.isFrozen(H.CATALOGO));
});

test('US1: referencia ACME/ZETA y no aplica', () => {
  const r = cargarAcme();
  const esperado = (id, pagina, seccion) => ({
    cuentaId: id, regla: 'cobranza_o_chargeoff', estado: 'calculado', motivo: null, caracter: 'calculo_informativo',
    fechas: [{ reglaBase: '7_anos_mas_180_dias', base: { campo: 'dofd', valor: '2021-03', origen: { pagina, seccion, etiqueta: 'Date of 1st Delinquency', linea: id === 'A' ? 9 : 6 } }, salida: '2028-09', precision: 'mes', estimada: true, motivoEstimacion: 'dofd_sin_dia_exacto', rango: { desde: '2028-08', hasta: '2028-09' }, yaPaso: false }],
    omitidos: [], avisos: []
  });
  assert.deepStrictEqual(H.calcularFechaSalida(r.cuentas[0], { hoy: '2026-10-01' }), esperado('A', 1, 'adversas'));
  assert.deepStrictEqual(H.calcularFechaSalida(r.cuentas[1], { hoy: '2026-10-01' }), esperado('B', 2, 'cobranzas'));
  const na = (id) => ({ cuentaId: id, regla: 'no_aplica', estado: 'no_aplica', motivo: null, caracter: 'calculo_informativo', fechas: [], omitidos: [], avisos: [] });
  assert.deepStrictEqual(H.calcularFechaSalida(r.cuentas[2], { hoy: '2026-10-01' }), na('C'));
  assert.deepStrictEqual(H.calcularFechaSalida(r.cuentas[3], { hoy: '2026-10-01' }), na('D'));
});

test('US1: calendario exacto, bisiesto y precisión mensual', () => {
  const calc = (iso) => H.calcularFechaSalida(cuenta('X', { esCobranza: true, dofd: fecha(iso, 'DOFD') }), { hoy: '2026-01-01' }).fechas[0];
  assert.deepStrictEqual(calc('2019-03-15'), { reglaBase: '7_anos_mas_180_dias', base: { campo: 'dofd', valor: '2019-03-15', origen: origen('DOFD') }, salida: '2026-09-11', precision: 'dia', estimada: false, motivoEstimacion: null, rango: null, yaPaso: false });
  assert.strictEqual(calc('2023-09-02').salida, '2031-02-28');
  assert.deepStrictEqual(calc('2019-03').rango, { desde: '2026-08', hasta: '2026-09' });
  assert.strictEqual(calc('2019-03').salida, '2026-09');
});

test('US1: faltantes, clasificación y atrasos', () => {
  const otras = { fechaReportada: fecha('2025-01-01'), ultimaActividad: fecha('2025-02-01'), fechaChargeOff: fecha('2025-03-01') };
  for (const dofd of [undefined, { estado: 'no_reportado', origen: origen('DOFD') }]) {
    const r = H.calcularFechaSalida(cuenta('X', { esCobranza: true, dofd, ...otras }), { hoy: '2026-10-01' });
    assert.strictEqual(r.estado, 'no_calculable'); assert.strictEqual(r.motivo, 'falta_dofd'); assert.deepStrictEqual(r.fechas, []);
  }
  assert.strictEqual(H.calcularFechaSalida(cuenta('X', { esCobranza: true, dofd: fecha('2021') }), { hoy: '2026-10-01' }).motivo, 'dofd_imprecisa');
  const variantes = [{ estado: valor('Charged Off') }, { historial: [{ codigo: 'charge_off' }] }, { montoChargeOff: valor(5) }, { esCobranza: true }];
  variantes.forEach((x) => assert.strictEqual(H.calcularFechaSalida(cuenta('X', { ...x, dofd: fecha('2020-01') }), { hoy: '2026-10-01' }).regla, 'cobranza_o_chargeoff'));
  const hs = [{ anio: 2022, mes: 5, codigo: 'atraso_30', mesVerificable: true, origen: origen('History') }, { anio: 2022, mes: 6, codigo: 'atraso_60', mesVerificable: true, origen: origen('History') }, { anio: 2022, mes: 7, codigo: 'al_dia', mesVerificable: true, origen: origen('History') }, { anio: 2023, mes: 1, codigo: 'atraso_30', mesVerificable: false, origen: origen('History') }];
  const late = H.calcularFechaSalida(cuenta('L', { historial: hs, atrasosListados: [fecha('2022-06', 'Late Payments')] }), { hoy: '2026-10-01' });
  assert.deepStrictEqual(late.fechas.map((x) => x.salida), ['2029-05', '2029-06']);
  assert.ok(late.fechas.every((x) => x.reglaBase === '7_anos_desde_atraso' && x.precision === 'mes' && x.estimada && x.motivoEstimacion === 'atraso_sin_dia_exacto' && x.rango.desde === x.salida && x.rango.hasta === x.salida));
  assert.deepStrictEqual(late.omitidos, [{ referencia: { campo: 'atraso', valor: '2023-01', origen: origen('History') }, motivo: 'mes_no_verificable' }]);
  const solo = H.calcularFechaSalida(cuenta('L', { historial: [hs[3]] }), { hoy: '2026-10-01' });
  assert.strictEqual(solo.motivo, 'sin_atrasos_verificables');
  const co = H.calcularFechaSalida(cuenta('CO', { estado: valor('Charge Off'), dofd: fecha('2020-01'), historial: hs }), { hoy: '2026-10-01' });
  assert.strictEqual(co.fechas.length, 1);
});

test('US1: yaPaso, avisos, validación y ejecutar', () => {
  const f = (iso, hoy, extra = {}) => H.calcularFechaSalida(cuenta('X', { esCobranza: true, dofd: fecha(iso), ...extra }), { hoy });
  assert.strictEqual(f('2018-01', '2026-10-01').fechas[0].yaPaso, true);
  assert.deepStrictEqual(f('2018-01', '2026-10-01').fechas[0].rango, { desde: '2025-06', hasta: '2025-07' });
  assert.strictEqual(f('2019-03', '2026-08-15').fechas[0].yaPaso, 'incierto');
  assert.strictEqual(f('2019-03-15', '2026-09-11').fechas[0].yaPaso, false);
  assert.strictEqual(f('2019-03-15', '2026-09-12').fechas[0].yaPaso, true);
  assert.deepStrictEqual(f('2027-01', '2026-10-01').avisos, ['dofd_futura']);
  const futuraMismoMes = f('2026-10-15', '2026-10-01');
  assert.deepStrictEqual(futuraMismoMes.avisos, ['dofd_futura']);
  assert.strictEqual(futuraMismoMes.fechas.length, 1);
  assert.deepStrictEqual(f('2026-10-01', '2026-10-01').avisos, []);
  assert.deepStrictEqual(f('2017-01', '2026-10-01', { fechaApertura: fecha('2018-06') }).avisos, ['dofd_antes_de_apertura']);
  assert.throws(() => H.calcularFechaSalida(cuenta('X'), {}), TypeError);
  assert.throws(() => H.calcularFechaSalida(cuenta('X'), { hoy: '2026-02-30' }), TypeError);
  assert.throws(() => H.calcularFechaSalida(cuenta('X'), { hoy: '2026/10/01' }), TypeError);
  assert.throws(() => H.calcularFechaSalida(null, { hoy: '2026-10-01' }), TypeError);
  assert.throws(() => H.calcularFechaSalida({}, { hoy: '2026-10-01' }), TypeError);
  const r = cargarAcme();
  assert.deepStrictEqual(H.ejecutar('calcularFechaSalida', r, { hoy: '2026-10-01', cuentaId: 'A' }), H.calcularFechaSalida(r.cuentas[0], { hoy: '2026-10-01' }));
  assert.deepStrictEqual(H.ejecutar('calcularFechaSalida', r, { hoy: '2026-10-01' }).map((x) => x.cuentaId), ['A', 'B', 'C', 'D']);
  assert.throws(() => H.ejecutar('calcularFechaSalida', r, { hoy: '2026-10-01', cuentaId: 'ZZ' }), TypeError);
});

test('US2: referencia, exclusiones, redondeo y centavos', () => {
  const r = cargarAcme();
  const C = r.cuentas[2];
  assert.deepStrictEqual(H.calcularUtilizacion(r.cuentas), { porCuenta: [{ cuentaId: 'C', saldo: 890, limite: 1000, porcentaje: 89, sobreLimite: false, responsabilidad: 'Individual', referencias: { saldo: { campo: 'saldo', valor: 890, origen: C.saldo.origen }, limite: { campo: 'limite', valor: 1000, origen: C.limite.origen } } }], total: { saldo: 890, limite: 1000, porcentaje: 89, cuentas: 1 }, excluidas: [{ cuentaId: 'A', motivo: 'cargada_a_perdida' }] });
  const rot = (id, extra = {}) => cuenta(id, { tipo: valor('rotativa'), saldo: valor(10, 'Balance'), limite: valor(100, 'Limit'), ...extra });
  const casos = [rot('1', { esCobranza: true, cerrada: true }), rot('2', { estado: valor('Charge Off'), cerrada: true }), rot('3', { cerrada: true, limite: undefined }), rot('4', { saldo: undefined }), rot('5', { saldo: valor(-1) }), rot('6', { limite: undefined, saldoMasAlto: valor(500) }), rot('7', { limite: valor(0) })];
  assert.deepStrictEqual(H.calcularUtilizacion(casos).excluidas.map((x) => x.motivo), ['cobranza', 'cargada_a_perdida', 'cerrada', 'sin_saldo', 'saldo_negativo', 'sin_limite', 'limite_cero']);
  assert.strictEqual(H.calcularUtilizacion(casos).total, null);
  const calc = H.calcularUtilizacion([rot('A', { saldo: valor(1200), limite: valor(1000) }), rot('B', { saldo: valor(5), limite: valor(1000) }), rot('C', { saldo: valor(4), limite: valor(1000) }), rot('D', { saldo: valor(0.1), limite: valor(1) }), rot('E', { saldo: valor(0.2), limite: valor(1), responsabilidad: valor('Authorized User') })]);
  assert.deepStrictEqual(calc.porCuenta.map((x) => x.porcentaje), [120, 1, 0, 10, 20]);
  assert.strictEqual(calc.porCuenta[0].sobreLimite, true);
  assert.strictEqual(calc.porCuenta[4].responsabilidad, 'Authorized User');
  assert.strictEqual(calc.total.saldo, 1209.3);
  assert.deepStrictEqual(H.calcularUtilizacion([]), { porCuenta: [], total: null, excluidas: [] });
  assert.throws(() => H.calcularUtilizacion(null), TypeError);
  assert.deepStrictEqual(H.ejecutar('calcularUtilizacion', r, {}), H.calcularUtilizacion(r.cuentas));
});

test('US3: referencia y variantes de nombres', () => {
  const r = cargarAcme();
  assert.deepStrictEqual(H.buscarPosiblesDuplicados(r.cuentas), [{ tipo: 'original_y_cobranza', cuentas: ['A', 'B'], nombreComparado: 'ACME BANK', coinciden: ['acreedor_original', 'saldo', 'dofd'], difieren: [{ campo: 'fecha_apertura', a: '2018-06', b: null }], ambosConSaldo: true, marcaVendida: { encontrada: true, texto: 'Account sold to another lender', origen: r.cuentas[0].comentarios[0].origen } }]);
  const original = cuenta('A', { acreedor: valor('Acme Bank.'), saldo: valor(1), fechaApertura: fecha('2020-04') });
  const cobranza = cuenta('B', { esCobranza: true, acreedor: valor('Zeta'), acreedorOriginal: valor('ACME  BANK'), saldo: valor(1) });
  assert.strictEqual(H.buscarPosiblesDuplicados([original, cobranza])[0].marcaVendida.encontrada, false);
  assert.deepStrictEqual(H.buscarPosiblesDuplicados([original, { ...cobranza, acreedorOriginal: undefined }]), []);
  assert.deepStrictEqual(H.buscarPosiblesDuplicados([original, { ...cobranza, acreedorOriginal: valor('ACME BK') }]), []);
  assert.strictEqual(H.buscarPosiblesDuplicados([{ ...original, acreedor: valor('Bancó Ñandú') }, { ...cobranza, acreedorOriginal: valor('BANCO NANDU') }]).length, 1);
});

test('US3: otros tipos, estabilidad y validación', () => {
  const a = cuenta('A', { acreedor: valor('DEMO CARD'), fechaApertura: fecha('2020-04'), saldo: valor(2) });
  const b = cuenta('B', { acreedor: valor('DEMO CARD'), fechaApertura: fecha('2020-04'), saldo: valor(3) });
  assert.strictEqual(H.buscarPosiblesDuplicados([a, b])[0].tipo, 'mismo_acreedor_misma_apertura');
  const c = cuenta('C', { esCobranza: true, acreedorOriginal: valor('TIENDA DEMO'), saldo: valor(2) });
  const d = cuenta('D', { esCobranza: true, acreedorOriginal: valor('TIENDA DEMO'), saldo: valor(3) });
  assert.strictEqual(H.buscarPosiblesDuplicados([c, d])[0].tipo, 'dos_cobranzas_mismo_original');
  assert.strictEqual(H.buscarPosiblesDuplicados([c, d])[0].marcaVendida, null);
  const todas = [a, b, cuenta('E', { acreedor: valor('DEMO CARD'), fechaApertura: fecha('2020-04') })];
  const x = H.buscarPosiblesDuplicados(todas), y = H.buscarPosiblesDuplicados(todas.slice().reverse());
  assert.deepStrictEqual(x, y); assert.strictEqual(x.length, 3); assert.ok(x.every((p) => p.cuentas[0] !== p.cuentas[1]));
  assert.throws(() => H.buscarPosiblesDuplicados('x'), TypeError);
  const r = cargarAcme(); assert.deepStrictEqual(H.ejecutar('buscarPosiblesDuplicados', r, {}), H.buscarPosiblesDuplicados(r.cuentas));
});

test('US4: referencia y bordes', () => {
  const r = cargarAcme();
  const q = H.contarConsultasDuras(r.consultas, { hoy: '2026-10-01' });
  assert.deepStrictEqual(q, { ventana: { desde: '2025-10-01', hasta: '2026-10-01', incluyeDesde: false, incluyeHasta: true }, total: 2, dentro: [{ empresa: 'CAPITAL DEMO', fecha: '2026-02-14', origen: r.consultas[0].fecha.origen }, { empresa: 'AUTO LENDER DEMO', fecha: '2025-11-03', origen: r.consultas[1].fecha.origen }], inciertas: [{ empresa: 'BANCO MES DEMO', fecha: '2025-10', origen: r.consultas[2].fecha.origen }], futuras: [], sinFecha: 0, desconocidas: 0 });
  const bordes = H.contarConsultasDuras([consulta('DESDE', '2025-10-01'), consulta('HOY', '2026-10-01'), consulta('MES', '2025-11'), consulta('FUERA', '2025-09'), consulta('FUTURA', '2026-12-01'), consulta('SIN'), consulta('DESC', '2026-01-01', 'desconocida'), consulta('PROMO', '2026-01-01', 'promocional'), consulta('REV', '2026-01-01', 'revision_cuenta')], { hoy: '2026-10-01' });
  assert.deepStrictEqual(bordes.dentro.map((x) => x.empresa), ['HOY', 'MES']); assert.strictEqual(bordes.futuras.length, 1); assert.strictEqual(bordes.sinFecha, 1); assert.strictEqual(bordes.desconocidas, 1);
  assert.strictEqual(H.contarConsultasDuras([], { hoy: '2028-02-29' }).ventana.desde, '2027-02-28');
  assert.strictEqual(H.contarConsultasDuras([], { hoy: '2026-10-01', meses: 24 }).ventana.desde, '2024-10-01');
  assert.strictEqual(H.contarConsultasDuras([consulta('X', '2026-01-01'), consulta('X', '2026-01-03'), consulta('X', '2026-01-05')], { hoy: '2026-10-01' }).total, 3);
  for (const opts of [{ hoy: '2026-10-01', meses: 0 }, { hoy: '2026-10-01', meses: 1.5 }, { hoy: 'x' }]) assert.throws(() => H.contarConsultasDuras([], opts), TypeError);
  assert.deepStrictEqual(H.ejecutar('contarConsultasDuras', r, { hoy: '2026-10-01' }), q);
});

test('transversal: determinismo, no mutación, catálogo, origen y privacidad', () => {
  const r = cargarAcme(), antes = JSON.stringify(r);
  const llamadas = [() => H.calcularFechaSalida(r.cuentas[0], { hoy: '2026-10-01' }), () => H.calcularUtilizacion(r.cuentas), () => H.buscarPosiblesDuplicados(r.cuentas), () => H.contarConsultasDuras(r.consultas, { hoy: '2026-10-01' })];
  llamadas.forEach((fn) => { const primero = fn(); for (let i = 0; i < 100; i++) assert.deepStrictEqual(fn(), primero); });
  assert.strictEqual(JSON.stringify(r), antes);
  assert.deepStrictEqual(H.CATALOGO.map((x) => x.nombre), ['calcularFechaSalida', 'calcularUtilizacion', 'buscarPosiblesDuplicados', 'contarConsultasDuras']);
  assert.deepStrictEqual(H.CATALOGO.map((x) => x.alcance), ['cuenta', 'reporte', 'reporte', 'reporte']);
  H.CATALOGO.forEach((x) => { assert.strictEqual(x.version, '1.0.0'); assert.ok(Object.isFrozen(x)); assert.ok(!Object.values(x).some((v) => typeof v === 'function')); });
  const salidas = llamadas.map((fn) => fn());
  const limpio = JSON.stringify(salidas).replace(/"texto":"[^"]*"/g, '');
  assert.doesNotMatch(limpio, /debe eliminarse|ilegal|violaci[oó]n|fraude|garantiz|subir[aá] tu puntaje|must be removed|illegal|violation|fraud/i);
  assert.doesNotMatch(JSON.stringify(salidas), /"(?:identidad|numero|contacto|nombres|direcciones|telefonos)"/);
  const origenes = [];
  (function recorrer(v) { if (!v || typeof v !== 'object') return; if (v.origen) origenes.push(v.origen); Object.values(v).forEach(recorrer); }(salidas));
  assert.ok(origenes.length > 0); origenes.forEach((o) => { assert.strictEqual(typeof o.pagina, 'number'); assert.strictEqual(typeof o.etiqueta, 'string'); });
});

test('transversal: humo sobre reportes esperados', () => {
  const dir = path.join(FIX, 'esperado');
  let reportes = 0;
  for (const nombre of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const r = congelar(JSON.parse(fs.readFileSync(path.join(dir, nombre), 'utf8')));
    if (!Array.isArray(r.cuentas) || !Array.isArray(r.consultas)) {
      assert.strictEqual(nombre, 'experian-tabla.json');
      continue;
    }
    reportes++;
    for (const item of H.CATALOGO) {
      const opciones = item.nombre === 'calcularFechaSalida' || item.nombre === 'contarConsultasDuras' ? { hoy: '2026-10-01' } : {};
      const a = H.ejecutar(item.nombre, r, opciones), b = H.ejecutar(item.nombre, r, opciones);
      assert.deepStrictEqual(a, b, nombre + ': ' + item.nombre);
    }
  }
  assert.strictEqual(reportes, 5);
});
