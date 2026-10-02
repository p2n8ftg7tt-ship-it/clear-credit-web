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
