/* Validación del agente de crédito (spec 017). Ejecutar: node --test tests/agente-credito-validar.test.js */
const test = require('node:test');
const assert = require('node:assert');
const V = require('../netlify/functions/lib/agente-credito-validar.js');

const ETIQUETADO = {
  identidad: { nombres: [{ etiqueta: 'Nombre 1', diferencias: [] }, { etiqueta: 'Nombre 2', diferencias: ['nombre_de_pila_distinto'] }], direcciones: [], telefonos: [] },
  cuentas: [{ letra: 'A', saldo: 1284, dofd: '2021-03' }, { letra: 'B', saldo: 1284, esCobranza: true }, { letra: 'C', saldo: 890, limite: 1000 }],
  marcadas: { cuentas: ['B'], datos: ['Nombre 2'] }
};
const HERRAMIENTAS = [{ fechas: [{ salida: '2028-09', rango: { desde: '2028-08', hasta: '2028-09' } }] }, { total: { porcentaje: 89 } }];
const valido = () => ({
  diagnostico: 'Tu reporte tiene dos puntos importantes. La deuda de ACME BANK parece aparecer dos veces. Tu tarjeta NOVA CARD usa casi todo su límite.',
  plan: [
    { tipo: 'disputar', cuentas: ['A'], hechos: [{ cuenta: 'A', dato: 'saldo $1,284', fuente: 'reporte' }, { cuenta: 'A', dato: 'primer atraso 03/2021', fuente: 'reporte' }], interpretacion: 'Una cuenta vendida normalmente muestra saldo $0.', accion: 'Puedes pedirle al buró que revise el saldo.' },
    { tipo: 'pagar', cuentas: ['C'], hechos: [{ cuenta: 'C', dato: 'utilización 89%', fuente: 'herramienta' }], interpretacion: 'Usar casi todo el límite suele pesar.', accion: 'Bajar el saldo puede ayudar.' },
    { tipo: 'esperar', cuentas: ['B'], hechos: [{ cuenta: 'B', dato: 'salida estimada 2028-09', fuente: 'herramienta' }], interpretacion: 'Es una estimación mensual.', accion: 'Consulta el plazo de prescripción de tu estado antes de pagar.' }
  ],
  despues: [], preguntasParaTi: ['¿Recibiste una carta del cobrador en los últimos 30 días?'], verificar: ['Confirma que A y B son la misma deuda.'],
  datosPersonales: [{ etiqueta: 'Nombre 2', razon: 'nombre de pila distinto' }],
  cartas: []
});
const validar = (r) => V.validarResultado(r, { etiquetado: ETIQUETADO, resultadosHerramientas: HERRAMIENTAS });

test('barrera: deja pasar un etiquetado limpio', () => {
  assert.deepStrictEqual(V.barreraDatosPersonales(ETIQUETADO), { ok: true });
  assert.deepStrictEqual(V.barreraDatosPersonales({ fecha: '2026-09-11', rango: '2028-08', texto: 'Account sold to another lender [número]' }), { ok: true });
});

test('barrera: rechaza datos personales', () => {
  const caso = (v) => V.barreraDatosPersonales(v).motivo;
  assert.strictEqual(caso({ c: ['nota 123-45-6789'] }), 'ssn');
  assert.strictEqual(caso({ c: 'nota 123 45 6789' }), 'ssn');
  assert.strictEqual(caso({ c: 'cuenta 4417123412341234' }), 'numero_largo');
  assert.strictEqual(caso({ c: 'escribe a ana@ejemplo.com' }), 'correo');
  assert.strictEqual(caso({ c: 'Date of Birth: 01/02/1980' }), 'fecha_nacimiento');
  assert.strictEqual(caso({ cuentas: [{ numero: 'XXXX1234' }] }), 'clave_prohibida');
  assert.strictEqual(caso({ c: 'x'.repeat(61 * 1024) }), 'muy_grande');
});

test('palabrasProhibidas: detecta veredictos y promesas, sin acentos ni mayúsculas', () => {
  assert.deepStrictEqual(V.palabrasProhibidas('Debes pagar hoy'), ['debes']);
  assert.deepStrictEqual(V.palabrasProhibidas('Esto es ILÉGAL'), ['ilegal']);
  assert.deepStrictEqual(V.palabrasProhibidas('La cuenta debe eliminarse'), ['debe_eliminarse']);
  assert.deepStrictEqual(V.palabrasProhibidas('Resultado garantizado'), ['garantiza']);
  assert.deepStrictEqual(V.palabrasProhibidas('Esto subirá tu puntaje'), ['promesa_puntaje']);
  assert.deepStrictEqual(V.palabrasProhibidas('Tienes que llamar'), ['tienes_que']);
  assert.deepStrictEqual(V.palabrasProhibidas('Puedes pedir una alerta de fraude gratis'), []);
  assert.deepStrictEqual(V.palabrasProhibidas('Parece fraude'), ['fraude']);
  assert.deepStrictEqual(V.palabrasProhibidas('Tu puntaje de 640 es bajo'), ['numero_de_puntaje']);
  assert.deepStrictEqual(V.palabrasProhibidas('Puedes pedirle al buró que lo revise'), []);
});

test('numerosDelDato: montos, porcentajes y fechas normalizados', () => {
  const valores = V.numerosDelDato('saldo $1,284.50, uso 89 %, DOFD 03/2021, salida 2028-09, pago 09/15/2025').map((x) => x.tipo + ':' + x.valor);
  assert.deepStrictEqual(valores, ['numero:1284.5', 'numero:89', 'fecha:2028-09', 'fecha:2025-09-15', 'fecha:2021-03']);
});

test('validarResultado: acepta un resultado correcto', () => {
  assert.deepStrictEqual(validar(valido()), { ok: true, problemas: [] });
});

test('validarResultado: forma', () => {
  const r = valido(); delete r.verificar;
  assert.deepStrictEqual(validar(r).problemas, ['forma:campos']);
  const r2 = valido(); r2.plan[0].tipo = 'demandar';
  assert.deepStrictEqual(validar(r2).problemas, ['forma:plan[0]']);
  const r3 = valido(); r3.plan.push(r3.plan[0]);
  assert.ok(validar(r3).problemas.includes('plan_mas_de_3'));
  const r4 = valido(); r4.diagnostico = 'Una sola oración.';
  assert.deepStrictEqual(validar(r4).problemas, ['diagnostico_oraciones:1']);
});

test('validarResultado: cuentas, etiquetas y números sin fuente', () => {
  const r = valido(); r.plan[0].cuentas = ['F'];
  assert.deepStrictEqual(validar(r).problemas, ['cuenta_inexistente:F']);
  const r2 = valido(); r2.datosPersonales = [{ etiqueta: 'Nombre 9', razon: 'x' }];
  assert.deepStrictEqual(validar(r2).problemas, ['etiqueta_inexistente:Nombre 9']);
  const r3 = valido(); r3.plan[0].hechos[0].dato = 'saldo $999';
  assert.deepStrictEqual(validar(r3).problemas, ['numero_sin_fuente:$999']);
  const r4 = valido(); r4.plan[2].hechos[0].dato = 'salida 2029-01';
  assert.deepStrictEqual(validar(r4).problemas, ['numero_sin_fuente:2029-01']);
  const r5 = valido(); r5.plan[0].hechos[0].dato = 'saldo $1284';
  assert.deepStrictEqual(validar(r5), { ok: true, problemas: [] });
});

test('validarResultado: palabras prohibidas en cualquier texto', () => {
  const r = valido(); r.plan[1].accion = 'Debes pagar la tarjeta.';
  assert.deepStrictEqual(validar(r).problemas, ['palabra_prohibida:debes']);
  const r2 = valido(); r2.verificar = ['Esta cuenta es ilegal.'];
  assert.deepStrictEqual(validar(r2).problemas, ['palabra_prohibida:ilegal']);
});

const disputa = (cuentas) => ({ tipo: 'bureau-dispute', cuentas, subtipo: 'no_aplica', etiquetas: [] });
const PLAN = valido().plan; // el paso 0 es «disputar» con la cuenta A
const vc = (cartas) => V.validarCartas(cartas, { etiquetado: ETIQUETADO, plan: PLAN });

test('validarCartas: acepta una disputa respaldada por un paso «disputar»', () => {
  assert.deepStrictEqual(vc([disputa([{ letra: 'A', motivo: 'wrong-amount' }])]), { validas: [disputa([{ letra: 'A', motivo: 'wrong-amount' }])], problemas: [] });
});

test('validarCartas: reglas de FR-003', () => {
  assert.deepStrictEqual(vc([disputa([{ letra: 'C', motivo: 'wrong-amount' }])]).problemas, ['carta[0]:sin_paso_disputar:C']);
  assert.deepStrictEqual(vc([disputa([{ letra: 'F', motivo: 'other' }])]).problemas, ['carta[0]:cuenta_inexistente:F']);
  assert.deepStrictEqual(vc([disputa([{ letra: 'A', motivo: 'no_aplica' }])]).problemas, ['carta[0]:forma']);
  assert.deepStrictEqual(vc([disputa([{ letra: 'A', motivo: 'not-mine' }])]).problemas, ['carta[0]:no_marcada:A']);
  assert.deepStrictEqual(vc([{ tipo: 'debt-validation', cuentas: [{ letra: 'C', motivo: 'no_aplica' }], subtipo: 'no_aplica', etiquetas: [] }]).problemas, ['carta[0]:no_es_cobranza:C']);
  assert.deepStrictEqual(vc([{ tipo: 'identity', cuentas: [], subtipo: 'identity-names', etiquetas: ['Nombre 1'] }]).problemas, ['carta[0]:no_marcada:Nombre 1']);
  assert.deepStrictEqual(vc([{ tipo: 'demanda', cuentas: [], subtipo: 'no_aplica', etiquetas: [] }]).problemas, ['carta[0]:tipo']);
  const d = disputa([{ letra: 'A', motivo: 'wrong-amount' }]);
  assert.deepStrictEqual(vc([d, d]).problemas, ['carta[1]:repetida']);
  const cuatro = [d, { tipo: 'debt-validation', cuentas: [{ letra: 'B', motivo: 'no_aplica' }], subtipo: 'no_aplica', etiquetas: [] },
    { tipo: 'identity', cuentas: [], subtipo: 'identity-names', etiquetas: ['Nombre 2'] }, d];
  const r = vc(cuatro);
  assert.deepStrictEqual(r.problemas, ['carta[3]:sobra']);
  assert.strictEqual(r.validas.length, 3);
});

test('validarCartas: la misma cuenta en una disputa y en una validación es válida (Review Focus 4)', () => {
  const plan = [{ tipo: 'disputar', cuentas: ['B'], hechos: [], interpretacion: 'x', accion: 'y' }];
  const r = V.validarCartas([disputa([{ letra: 'B', motivo: 'wrong-amount' }]),
    { tipo: 'debt-validation', cuentas: [{ letra: 'B', motivo: 'no_aplica' }], subtipo: 'no_aplica', etiquetas: [] }], { etiquetado: ETIQUETADO, plan });
  assert.deepStrictEqual(r.problemas, []);
});

test('validarResultado: exige cartas y prefija sus problemas', () => {
  const r = valido(); delete r.cartas;
  assert.deepStrictEqual(validar(r).problemas, ['forma:campos']);
  const r2 = valido(); r2.cartas = [disputa([{ letra: 'C', motivo: 'other' }])];
  assert.deepStrictEqual(validar(r2).problemas, ['carta[0]:sin_paso_disputar:C']);
});
