/* Lector de reportes de crédito, Fase 1 de la especificación 013 (lectura cuenta por cuenta).
   Ejecutar:  node --test tests/lector-credito.test.js

   Todos los reportes de tests/fixtures/credito/ son SINTÉTICOS (personas, acreedores y números
   inventados). Spec: specs/013-lector-credito-metodologia (FR-010 a FR-018, quickstart §1). */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const L = require('../lector-credito.js');

const FIX = path.join(__dirname, 'fixtures', 'credito');
const cargar = (nombre) => JSON.parse(fs.readFileSync(path.join(FIX, nombre), 'utf8'));
const cargarEsperado = (nombre) => JSON.parse(fs.readFileSync(path.join(FIX, 'esperado', nombre), 'utf8'));
const leer = (nombre, opciones) => L.leerReporte(cargar(nombre), opciones);
const plano = (v) => JSON.parse(JSON.stringify(v));
const pag = (...lineas) => [{ numero: 1, lineas: lineas.map((texto) => ({ texto })) }];

/* ------------------------------------------------------------ utilidades */

test('normalizarFecha: formatos del reporte, sin inventar el día (R7)', () => {
  const iso = (t) => { const f = L.normalizarFecha(t); return f && f.iso; };
  assert.strictEqual(iso('08/18/2025'), '2025-08-18');
  assert.strictEqual(iso('05/2024'), '2024-05');
  assert.strictEqual(iso('03/26'), '2026-03');
  assert.strictEqual(iso('May 2023'), '2023-05');
  assert.strictEqual(iso('Nov 7, 2022'), '2022-11-07');
  assert.strictEqual(iso('7 de noviembre de 2022'), '2022-11-07');
  assert.strictEqual(iso('noviembre de 2022'), '2022-11');
  assert.strictEqual(iso('2025'), '2025');
  assert.strictEqual(L.normalizarFecha(''), null);
  assert.strictEqual(L.normalizarFecha('-'), null);
  assert.strictEqual(L.normalizarFecha('13/01/2025'), null);
  assert.deepStrictEqual(L.normalizarFecha('05/2024'), { texto: '05/2024', iso: '2024-05' });
});

test('normalizarMonto: cero es un valor; vacío no lo es (R8)', () => {
  assert.strictEqual(L.normalizarMonto('$1,500'), 1500);
  assert.strictEqual(L.normalizarMonto('$1,500.00'), 1500);
  assert.strictEqual(L.normalizarMonto('$0'), 0);
  assert.strictEqual(L.normalizarMonto(''), null);
  assert.strictEqual(L.normalizarMonto('-'), null);
  assert.strictEqual(L.normalizarMonto('—'), null);
});

test('enmascararCuenta: solo quedan visibles los últimos 4 dígitos (R9)', () => {
  assert.strictEqual(L.enmascararCuenta('*1234'), '*1234');
  assert.strictEqual(L.enmascararCuenta('4111222233334444'), 'XXXXXXXXXXXX4444');
  assert.strictEqual(L.enmascararCuenta('123456XXXX'), 'XX3456XXXX');
  const visibles = (s) => (s.match(/\d/g) || []).length;
  ['987654321', '12-345-678-901', '4111 2222 3333 4444'].forEach((n) => assert.ok(visibles(L.enmascararCuenta(n)) <= 4, n));
});

test('codigoPago: los códigos impresos van al vocabulario común (R11)', () => {
  const esperado = {
    'OK': 'al_dia', '30': 'atraso_30', 'CO': 'charge_off', 'C': 'cobranza', 'R': 'reposesion',
    'VS': 'entrega_voluntaria', 'V': 'entrega_voluntaria', 'F': 'ejecucion_hipotecaria', 'FS': 'ejecucion_iniciada',
    'B': 'bancarrota', 'BK': 'bancarrota', 'TN': 'muy_nueva', 'ND': 'sin_datos', '-': 'sin_datos',
    'PBC': 'pagada_por_acreedor', 'G': 'reclamo_gobierno', 'IC': 'reclamo_seguro', 'D': 'incumplimiento', 'CLS': 'cerrada'
  };
  Object.entries(esperado).forEach(([impreso, comun]) => assert.strictEqual(L.codigoPago(impreso), comun, impreso));
  assert.strictEqual(L.codigoPago('ZZ'), 'desconocido');
  Object.values(esperado).forEach((c) => assert.ok(L.CODIGOS_COMUNES.includes(c), c));
});

/* ------------------------------------------------------------- detección */

test('detectarBuro: frases fuertes, señales de Equifax y empates (R3)', () => {
  assert.strictEqual(L.detectarBuro(pag('Equifax Credit Report', 'Personal Information')).buro, 'equifax');
  assert.strictEqual(L.detectarBuro(pag('Prepared for: X', 'EFX-ACR 1')).buro, 'equifax');
  assert.strictEqual(L.detectarBuro(pag('Dispute online at equifax.com/personal/disputes')).buro, 'equifax');
  assert.strictEqual(L.detectarBuro(pag('Experian Credit Report')).buro, 'experian');
  assert.strictEqual(L.detectarBuro(pag('TransUnion Consumer Solutions')).buro, 'transunion');
  assert.deepStrictEqual(L.detectarBuro(pag('Reporte de crédito')), { buro: 'desconocido', puntaje: 0, formatoVerificado: false });
  const empate = L.detectarBuro(pag('Equifax Report and Experian Report'));
  assert.strictEqual(empate.buro, 'desconocido');
  assert.strictEqual(empate.formatoVerificado, false);
});

test('leerReporte: TypeError solo si las páginas no son un arreglo', () => {
  assert.throws(() => L.leerReporte('texto'), TypeError);
  assert.doesNotThrow(() => L.leerReporte([{ numero: 1, lineas: [{ texto: '¿?¿? %%% ###' }] }]));
});

test('páginas sin texto: advertencia sin_texto y ninguna cuenta (PDF escaneado)', () => {
  const r = L.leerReporte([{ numero: 1, lineas: [] }, { numero: 2, lineas: [{ texto: '   ' }] }]);
  assert.strictEqual(r.cuentas.length, 0);
  assert.deepStrictEqual(r.advertencias.map((a) => a.codigo), ['sin_texto']);
});

test('más de 150 páginas: advertencia paginas_truncadas', () => {
  const r = L.leerReporte(pag('Equifax Credit Report'), { paginasTotales: 160 });
  assert.ok(r.advertencias.some((a) => a.codigo === 'paginas_truncadas'));
  assert.strictEqual(r.paginasTotales, 160);
  assert.strictEqual(r.paginasLeidas, 1);
  const muchas = Array.from({ length: 151 }, (_, i) => ({ numero: i + 1, lineas: [{ texto: 'Equifax Credit Report' }] }));
  assert.strictEqual(L.leerReporte(muchas).paginasLeidas, 150);
});

test('registros públicos: bancarrota con número de caso enmascarado', () => {
  const r = L.leerReporte(pag(
    'Experian Credit Report', 'Public Records', 'US BANKRUPTCY COURT CHAPTER 7',
    'Court: Tribunal Ejemplo', 'Case Number: 2401234567', 'Date Filed: 03/2019', 'Status: Discharged'
  ));
  assert.strictEqual(r.registrosPublicos.length, 1);
  const reg = r.registrosPublicos[0];
  assert.strictEqual(reg.tipo.valor, 'bancarrota_7');
  assert.strictEqual(reg.numeroCaso.valor, 'XXXXXX4567');
  assert.strictEqual(reg.fechaPresentacion.valor.iso, '2019-03');
});

/* ----------------------------------------------- fixtures (quickstart §1) */

const FIXTURES = ['equifax.json', 'experian.json', 'transunion.json', 'generico.json', 'experian-resumen.json'];

FIXTURES.forEach((nombre) => {
  test('fixture ' + nombre + ' produce exactamente su registro esperado', () => {
    const esperado = JSON.parse(fs.readFileSync(path.join(FIX, 'esperado', nombre), 'utf8'));
    assert.deepStrictEqual(plano(leer(nombre)), esperado);
  });

  test('fixture ' + nombre + ': determinista (misma entrada, misma salida)', () => {
    assert.deepStrictEqual(plano(leer(nombre)), plano(leer(nombre)));
  });

  test('fixture ' + nombre + ': todo Valor tiene página y sección de origen (FR-012)', () => {
    const r = leer(nombre);
    const revisar = (v, ruta) => {
      if (Array.isArray(v)) return v.forEach((x, i) => revisar(x, ruta + '[' + i + ']'));
      if (!v || typeof v !== 'object') return;
      if ('valor' in v || v.estado === 'no_reportado') {
        assert.ok(v.origen && Number.isInteger(v.origen.pagina) && v.origen.pagina >= 1, ruta + ' sin página');
        assert.ok(v.origen.seccion, ruta + ' sin sección');
      }
      Object.entries(v).forEach(([k, x]) => { if (k !== 'origen') revisar(x, ruta + '.' + k); });
    };
    revisar(r, nombre);
  });

  test('fixture ' + nombre + ': sin SSN, sin fecha de nacimiento y números enmascarados (FR-017)', () => {
    const r = leer(nombre);
    const json = JSON.stringify(r);
    /* Enmienda 014: del SSN solo pueden quedar los últimos 4 dígitos, y solo en identidad.ssnUltimos4. */
    assert.ok(r.identidad.ssnUltimos4 === null || /^\d{4}$/.test(r.identidad.ssnUltimos4), 'ssnUltimos4 debe ser 4 dígitos o null');
    const sinUltimos4 = JSON.stringify(Object.assign({}, r, { identidad: Object.assign({}, r.identidad, { ssnUltimos4: null }) }));
    assert.ok(!sinUltimos4.includes('9999'), 'el SSN sembrado (…9999) aparece fuera de ssnUltimos4');
    assert.ok(!/XXX-XX-|\d{3}-\d{2}-\d{4}/.test(json), 'quedó el SSN impreso en la salida');
    assert.ok(!json.includes('02/29/1976') && !json.includes('1976'), 'la fecha de nacimiento sembrada aparece en la salida');
    r.cuentas.forEach((c) => {
      if (c.numero && c.numero.valor) assert.ok((c.numero.valor.match(/\d/g) || []).length <= 4, c.numero.valor);
    });
    assert.ok(!/\d{9,}/.test(json), 'quedó una secuencia de 9 o más dígitos');
  });
});

test('Equifax: 6 cuentas, 3 abiertas y 3 cerradas, con el charge-off y su DOFD', () => {
  const r = leer('equifax.json');
  assert.strictEqual(r.buro, 'equifax');
  assert.strictEqual(r.cuentas.length, 6);
  assert.deepStrictEqual(L.resumen(r), {
    cuentas: 6, abiertas: 3, cerradas: 3, rotativas: 3, cobranzas: 0,
    consultasDuras: 4, consultasBlandas: 3, registrosPublicos: 0
  });
  const co = r.cuentas.find((c) => c.estado && c.estado.valor === 'Charge Off');
  assert.ok(co, 'falta la cuenta en charge-off');
  assert.strictEqual(co.cerrada, true);
  assert.strictEqual(co.dofd.valor.iso, '2021-03');
  assert.strictEqual(co.montoChargeOff.valor, 480);
  assert.deepStrictEqual(co.codigosNarrativos.map((x) => x.codigo), ['244', '156', '093']);
  const mismas = r.cuentas.filter((c) => c.acreedor.valor === 'TARJETA DEMO');
  assert.strictEqual(mismas.length, 2);
  assert.strictEqual(mismas[0].fechaApertura.valor.iso, mismas[1].fechaApertura.valor.iso);
  assert.notStrictEqual(mismas[0].id, mismas[1].id);
});

test('Equifax: campo impreso vacío → no_reportado, nunca 0 (FR-013)', () => {
  const r = leer('equifax.json');
  const primera = r.cuentas[0];
  assert.deepStrictEqual(Object.keys(primera.dofd), ['estado', 'origen']);
  assert.strictEqual(primera.dofd.estado, 'no_reportado');
  assert.strictEqual(primera.vencido.estado, 'no_reportado');
  assert.ok(!('valor' in primera.vencido));
});

test('Equifax: con el código 233, «High Credit» es el límite (US1 escenario 2)', () => {
  const c = leer('equifax.json').cuentas[0];
  assert.strictEqual(c.limite.valor, 2000);
  assert.strictEqual(c.saldoMasAlto.estado, 'no_reportado');
  assert.ok(c.reglasAplicadas.includes('equifax-233-high-credit-es-limite'));
  assert.strictEqual(c.codigosNarrativos[0].descripcion, 'Amount in High Credit Column is Credit Limit');
});

test('Equifax: el atraso de la cuadrícula cae en su mes y la tabla de 24 meses se lee por columnas', () => {
  const c = leer('equifax.json').cuentas[1];
  const atraso = c.historial.find((h) => h.codigo === 'atraso_30');
  assert.deepStrictEqual([atraso.anio, atraso.mes, atraso.mesVerificable], [2026, 3, true]);
  assert.strictEqual(c.historial24.length, 2);
  assert.strictEqual(c.historial24[0].mes.iso, '2026-04');
  assert.strictEqual(c.historial24[0].saldo.valor, 640);
  assert.strictEqual(c.historial24[1].vencido.valor, 35);
  assert.ok(c.historial24.every((f) => f.columnasVerificables));
});

test('Equifax: una consulta por fecha, incluida la empresa dura y blanda (R12)', () => {
  const r = leer('equifax.json');
  const auto = r.consultas.filter((c) => c.empresa.valor === 'AUTO DEMO FINANCE');
  assert.deepStrictEqual(auto.map((c) => c.tipo + ' ' + c.fecha.valor.iso), [
    'dura 2026-05-10', 'dura 2026-05-12', 'blanda 2026-05-10', 'blanda 2026-05-12'
  ]);
  assert.ok(r.consultas.every((c) => c.fechaSalida === undefined), 'no se inventa una fecha de salida (FR-027)');
});

test('Equifax: identidad sin SSN ni fecha de nacimiento, y avisos «None» que no crean aviso', () => {
  const r = leer('equifax.json');
  assert.strictEqual(r.identidad.ssnMostrado, true);
  assert.strictEqual(r.identidad.fechaNacimientoMostrada, true);
  assert.deepStrictEqual(r.identidad.nombres.map((n) => n.valor), ['ANA EJEMPLO RUIZ', 'ANA E RUIZ']);
  assert.deepStrictEqual(r.identidad.direcciones.map((d) => d.tipo), ['actual', 'anterior']);
  assert.deepStrictEqual(r.identidad.empleadores, []);
  assert.deepStrictEqual(r.avisos, []);
  assert.strictEqual(r.fechaReporte.valor.iso, '2026-05-24');
});

test('Experian: «Credit Limit / Original Balance» según el tipo de cuenta (US1 escenario 3)', () => {
  const r = leer('experian.json');
  assert.strictEqual(r.buro, 'experian');
  const tarjeta = r.cuentas.find((c) => c.tipo.valor === 'rotativa');
  const prestamo = r.cuentas.find((c) => c.tipo.valor === 'plazos');
  assert.strictEqual(tarjeta.limite.valor, 1500);
  assert.strictEqual(tarjeta.limiteOMontoOriginal, undefined);
  assert.strictEqual(prestamo.montoOriginal.valor, 12000);
  assert.strictEqual(prestamo.limite, undefined);
  assert.deepStrictEqual(prestamo.atrasosListados.map((a) => a.valor.iso), ['2023-04', '2023-01']);
  assert.ok(prestamo.reglasAplicadas.includes('experian-limite-o-monto-original'));
});

test('Experian: cobranza, bloqueo del archivo, consultas con fecha de salida impresa', () => {
  const r = leer('experian.json');
  const cobranza = r.cuentas.find((c) => c.esCobranza);
  assert.strictEqual(cobranza.acreedorOriginal.valor, 'TIENDA EJEMPLO');
  assert.strictEqual(cobranza.montoOriginal.valor, 300);
  assert.deepStrictEqual(r.avisos.map((a) => a.tipo), ['bloqueo']);
  assert.strictEqual(r.identidad.fechaNacimientoMostrada, true);
  const dura = r.consultas.find((c) => c.tipo === 'dura');
  assert.strictEqual(dura.fechaSalida.valor.iso, '2028-06');
  assert.ok(r.consultas.some((c) => c.tipo === 'blanda'));
});

test('TransUnion por correo: cobranza dentro de «adversas» y mes no verificable (US1 escenarios 4 y 6)', () => {
  const r = leer('transunion.json');
  assert.strictEqual(r.buro, 'transunion');
  const cobranza = r.cuentas.find((c) => c.esCobranza);
  assert.ok(cobranza, 'no se encontró la cobranza');
  assert.ok(cobranza.reglasAplicadas.includes('transunion-cobranzas-en-adversas'));
  const sinMes = r.cuentas.flatMap((c) => c.historial).filter((h) => !h.mesVerificable);
  assert.ok(sinMes.length >= 1);
  sinMes.forEach((h) => assert.strictEqual(h.mes, null));
  assert.ok(r.advertencias.some((a) => a.codigo === 'mes_no_verificable'));
  assert.deepStrictEqual([...new Set(r.consultas.map((c) => c.tipo))], ['dura', 'promocional', 'revision_cuenta']);
  assert.deepStrictEqual(r.avisos.map((a) => a.tipo), ['declaracion']);
});

test('Genérico: formato no verificado y etiquetas en español (US1 escenario 7, R16)', () => {
  const r = leer('generico.json');
  assert.strictEqual(r.buro, 'desconocido');
  assert.strictEqual(r.perfil.formatoVerificado, false);
  assert.ok(r.advertencias.some((a) => a.codigo === 'formato_no_verificado'));
  assert.strictEqual(r.cuentas.length, 2);
  assert.strictEqual(r.cuentas[1].dofd.valor.iso, '2022-07');
  assert.strictEqual(r.cuentas[0].limite.valor, 800);
});

test('opciones.buro fuerza el perfil', () => {
  const r = L.leerReporte(cargar('generico.json'), { buro: 'experian' });
  assert.strictEqual(r.buro, 'experian');
  assert.strictEqual(r.perfil.id, 'experian');
});

test('Experian tabular sin dos puntos: cuentas, cobranza y consultas se estructuran', () => {
  const r = L.leerReporte(cargar('experian-tabla.json'));
  const esperado = cargarEsperado('experian-tabla.json');
  const s = L.resumen(r);
  assert.deepStrictEqual(Object.assign({}, s, { plazos: r.cuentas.filter((c) => c.tipo && c.tipo.valor === 'plazos').length }), {
    cuentas: esperado.cuentas, abiertas: esperado.abiertas, cerradas: esperado.cerradas,
    rotativas: esperado.rotativas, cobranzas: esperado.cobranzas, consultasDuras: esperado.consultasDuras,
    consultasBlandas: esperado.consultasBlandas, registrosPublicos: 0, plazos: esperado.plazos
  });
});

test('advierte cuando hay señales de cuentas o consultas pero no se pudieron leer', () => {
  const r = L.leerReporte(pag('Experian Credit Report', 'Accounts', 'Credit Inquiries', 'Hard Inquiries'));
  assert.ok(r.advertencias.some((a) => a.codigo === 'cuentas_no_leidas'));
  assert.ok(r.advertencias.some((a) => a.codigo === 'consultas_no_leidas'));
});

/* ------------------------------------------------ especificación 014 (resumen del consumidor) */

const personal = (...lineas) => pag('Experian Credit Report', 'Personal Information', ...lineas);

test('014 nombres: los identificadores «Name ID #…» y los números sueltos no son nombres', () => {
  const r = L.leerReporte(cargar('experian-resumen.json'));
  assert.deepStrictEqual(r.identidad.nombres.map((v) => v.texto), ['ANA PRUEBA EJEMPLO', 'ANA P EJEMPLO']);
  const soloIds = L.leerReporte(personal('Name ID #1', 'Name ID #2', '#22917'));
  assert.deepStrictEqual(soloIds.identidad.nombres, []);
});

test('014 SSN: solo se conservan los últimos 4 dígitos', () => {
  const parcial = L.leerReporte(personal('Social Security Number: XXX-XX-4321'));
  assert.strictEqual(parcial.identidad.ssnUltimos4, '4321');
  assert.strictEqual(parcial.identidad.ssnMostrado, true);
  const completo = L.leerReporte(personal('Social Security Number: 123-45-6789'));
  assert.strictEqual(completo.identidad.ssnUltimos4, '6789');
  const json = JSON.stringify(completo);
  assert.ok(!json.includes('123-45') && !json.includes('123456789'), 'el SSN completo quedó en el reporte');
  assert.strictEqual(L.leerReporte(personal('Name: ANA PRUEBA')).identidad.ssnUltimos4, null);
  const oculto = L.leerReporte(personal('Social Security Number: XXX-XX-XXXX'));
  assert.strictEqual(oculto.identidad.ssnUltimos4, null);
  assert.strictEqual(oculto.identidad.ssnMostrado, true);
});

test('014 Experian: «POTENTIALLY NEGATIVE» marca la cuenta siguiente y «written off» es charge-off', () => {
  const r = L.leerReporte(cargar('experian-resumen.json'));
  const [deposito, tarjeta, sana] = r.cuentas;
  assert.strictEqual(deposito.marcaNegativaBuro, true);
  assert.strictEqual(tarjeta.marcaNegativaBuro, true);
  assert.strictEqual(sana.marcaNegativaBuro, undefined);
  assert.strictEqual(deposito.montoChargeOff.valor, 144);
  assert.ok(deposito.historial.some((h) => h.codigo === 'charge_off'));
});
