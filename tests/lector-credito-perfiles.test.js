/* Perfiles de lectura por buró (spec 013, Fase 1): las 5 invariantes de
   specs/013-lector-credito-metodologia/contracts/lector-credito-api.md.
   Ejecutar:  node --test tests/lector-credito-perfiles.test.js */

const test = require('node:test');
const assert = require('node:assert');

const P = require('../lector-credito-perfiles.js');
const { CODIGOS_COMUNES } = require('../lector-credito.js');

const PERFILES = ['equifax', 'experian', 'transunion', 'generico'];

/* Campos de data-model.md: Reporte, Identidad, Aviso, Cuenta, Consulta y RegistroPublico. */
const CAMPOS_MODELO = new Set([
  'fechaReporte',
  'nombres', 'direcciones', 'telefonos', 'empleadores', 'ssnMostrado', 'fechaNacimientoMostrada',
  'texto',
  'acreedor', 'acreedorOriginal', 'numero', 'tipo', 'responsabilidad', 'estado', 'estadoPago', 'designadorActividad',
  'saldo', 'limite', 'saldoMasAlto', 'montoOriginal', 'limiteOMontoOriginal', 'vencido', 'pagoProgramado', 'pagoReal',
  'montoChargeOff', 'plazo', 'frecuencia', 'mesesRevisados', 'fechaApertura', 'fechaCierre', 'dofd',
  'fechaMorosidadGraveReportada', 'ultimoPago', 'ultimaActividad', 'fechaReportada', 'fechaChargeOff', 'fechaCobranza',
  'atrasosListados', 'codigosNarrativos', 'comentarios', 'declaracionConsumidor', 'contacto',
  'empresa', 'fecha', 'fechaSalida', 'tipoNegocio',
  'tribunal', 'numeroCaso', 'fechaPresentacion', 'fechaResolucion', 'fuente'
]);
const CAMPOS_FILA24 = new Set(['saldo', 'pagoProgramado', 'pagoReal', 'fechaUltimoPago', 'vencido', 'saldoMasAlto', 'limite', 'codigosNarrativos']);

test('1. los cuatro perfiles tienen fuente y fecha de verificación válida', () => {
  PERFILES.forEach((id) => {
    const p = P[id];
    assert.strictEqual(p.id, id);
    assert.ok(typeof p.fuente === 'string' && p.fuente.length > 10, id + ': sin fuente');
    assert.match(p.verificadoEl, /^\d{4}-\d{2}-\d{2}$/, id);
    assert.ok(!Number.isNaN(Date.parse(p.verificadoEl)), id);
  });
  assert.match(P.version, /^\d{4}-\d{2}-\d{2}$/);
});

test('2. todo campo de las etiquetas existe en el modelo de datos', () => {
  PERFILES.forEach((id) => {
    P[id].etiquetas.forEach((e) => {
      assert.ok(e.patron instanceof RegExp, id + ': etiqueta sin patrón');
      if (e.ambito === 'ignorar') return assert.strictEqual(e.campo, null);
      assert.ok(CAMPOS_MODELO.has(e.campo), id + ': campo desconocido ' + e.campo);
    });
    (P[id].historial24 ? P[id].historial24.columnas : []).forEach((c) => assert.ok(CAMPOS_FILA24.has(c.campo), c.campo));
  });
});

test('3. todo código de pago pertenece al vocabulario común', () => {
  PERFILES.forEach((id) => {
    Object.entries(P[id].codigosPago).forEach(([impreso, comun]) => {
      assert.ok(CODIGOS_COMUNES.includes(comun), id + ': ' + impreso + ' → ' + comun);
    });
  });
});

test('4. el perfil genérico no tiene frases fuertes y sí etiquetas en español', () => {
  const g = P.generico;
  assert.ok(!g.detectar.fuertes || g.detectar.fuertes.length === 0);
  const fuentes = g.etiquetas.map((e) => e.patron.source).join(' ');
  ['Acreedor', 'N[uú]mero de cuenta', 'Fecha de apertura', 'Saldo', 'L[ií]mite de cr[eé]dito', 'Estado', 'Fecha del primer atraso']
    .forEach((alias) => assert.ok(fuentes.includes(alias), 'falta el alias ' + alias));
});

test('5. los perfiles no contienen datos de ninguna persona', () => {
  const NOMBRES_DE_PRUEBA = ['ANA', 'EJEMPLO', 'RUIZ', 'PEDRO', 'CALLE FALSA'];
  PERFILES.forEach((id) => {
    const p = P[id];
    // La fuente y la fecha de verificación describen el perfil; los datos de lectura son el resto.
    const datos = Object.assign({}, p, { codigosNarrativos: undefined, fuente: undefined, verificadoEl: undefined });
    const texto = JSON.stringify(datos, (k, v) => (v instanceof RegExp ? v.source : v));
    assert.ok(!/\d{4,}/.test(texto), id + ': contiene una secuencia de 4 o más dígitos');
    NOMBRES_DE_PRUEBA.forEach((n) => assert.ok(!new RegExp('\\b' + n + '\\b').test(texto.toUpperCase()), id + ': contiene ' + n));
  });
});

test('las reglas especiales están declaradas en el perfil que las usa', () => {
  assert.deepStrictEqual(P.equifax.reglas, ['equifax-233-high-credit-es-limite']);
  assert.deepStrictEqual(P.experian.reglas, ['experian-limite-o-monto-original']);
  assert.deepStrictEqual(P.transunion.reglas, ['transunion-cobranzas-en-adversas']);
  assert.strictEqual(P.equifax.codigosNarrativos['233'], 'Amount in High Credit Column is Credit Limit');
});
