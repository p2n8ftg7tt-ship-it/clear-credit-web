/* Pase del agente de crédito (spec 017). Ejecutar: node --test tests/agente-credito-pase.test.js */
const test = require('node:test');
const assert = require('node:assert');
const P = require('../netlify/functions/lib/agente-credito-pase.js');

const S = 'secreto-de-prueba';
const DATOS = { v: 1, a: 'abc', u: 'u1', d: '2026-10-01', n: 2, e: 2000, c: 0, k: 0, h: 'hh' };

test('canonico: ordena claves y es estable', () => {
  assert.strictEqual(P.canonico({ b: 1, a: [2, { d: 3, c: 'x' }] }), '{"a":[2,{"c":"x","d":3}],"b":1}');
  assert.strictEqual(P.canonico({ a: 1, b: 2 }), P.canonico({ b: 2, a: 1 }));
});

test('firmarPase y leerPase: ida y vuelta', () => {
  const pase = P.firmarPase(DATOS, S);
  assert.match(pase, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.deepStrictEqual(P.leerPase(pase, S, 1000), DATOS);
});

test('leerPase: rechaza alterado, otro secreto, vencido y basura', () => {
  const pase = P.firmarPase(DATOS, S);
  const [cuerpo, firma] = pase.split('.');
  const otroCuerpo = Buffer.from(JSON.stringify({ ...DATOS, u: 'u2' })).toString('base64url');
  assert.strictEqual(P.leerPase(otroCuerpo + '.' + firma, S, 1000), null);
  assert.strictEqual(P.leerPase(cuerpo + '.' + firma.slice(0, -1) + (firma.endsWith('A') ? 'B' : 'A'), S, 1000), null);
  assert.strictEqual(P.leerPase(pase, 'otro-secreto', 1000), null);
  assert.strictEqual(P.leerPase(pase, S, 2000), null, 'vencido en e');
  assert.strictEqual(P.leerPase(pase, S, 2001), null);
  ['', 'x', 'a.b.c', null, 42].forEach((x) => assert.strictEqual(P.leerPase(x, S, 1000), null));
});

test('hmacConversacion: cambia si cambia cualquier mensaje', () => {
  const m = [{ role: 'user', content: 'Hoy: 2026-10-01' }, { role: 'assistant', content: [{ type: 'thinking', thinking: '', signature: 's' }] }];
  const h = P.hmacConversacion(m, S);
  assert.strictEqual(P.hmacConversacion(JSON.parse(JSON.stringify(m)), S), h);
  assert.notStrictEqual(P.hmacConversacion([{ ...m[0], content: 'Hoy: 2026-10-02' }, m[1]], S), h);
  assert.notStrictEqual(P.hmacConversacion(m, 'otro'), h);
});
