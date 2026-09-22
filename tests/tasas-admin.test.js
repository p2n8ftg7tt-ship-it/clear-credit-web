/* Pruebas de la vista del dueño: la función tasas-admin no entrega nada sin una
   sesión de administrador. No usan red: sin token, la función responde antes de
   hablar con Supabase. Las reglas puras de esta vista (días esperados, horas desde
   la última corrida buena, errores saneados) se prueban en
   tests/tasas-hipoteca-logica.test.js.
   Correr con:  node --test tests/*.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');

const admin = require('../netlify/functions/tasas-admin.js');

test('sin encabezado Authorization responde 401 y no entrega datos', async () => {
  const r = await admin.handler({ httpMethod: 'GET', headers: {} });
  assert.equal(r.statusCode, 401);
  const cuerpo = JSON.parse(r.body);
  assert.ok(cuerpo.error);
  assert.ok(!('corridas' in cuerpo) && !('umbralPp' in cuerpo) && !('retenidas' in cuerpo));
  assert.equal(r.headers['Cache-Control'], 'no-store');
});

test('con un token vacío o mal formado también responde 401', async () => {
  for (const auth of ['', 'Bearer', 'Bearer ', 'Basic abc']) {
    const r = await admin.handler({ httpMethod: 'GET', headers: { authorization: auth } });
    assert.equal(r.statusCode, 401, `«${auth}»`);
  }
});

test('solo acepta GET', async () => {
  const r = await admin.handler({ httpMethod: 'POST', headers: {} });
  assert.equal(r.statusCode, 405);
});

/* ---- con sesión: solo el administrador recibe datos ---- */
const ENV = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_prueba' };
const AHORA = new Date('2026-09-22T14:30:00Z');
const json = (cuerpo, status = 200) => ({ ok: status < 400, status, json: async () => cuerpo });

function falso({ usuario }) {
  return async url => {
    if (url.includes('/auth/v1/user')) return usuario ? json(usuario) : json({}, 401);
    if (url.includes('tasas_config')) return json([{ activo: false, umbral_pp: 0.125 }]);
    if (url.includes('tasas_publicado')) return json([{ publicado_en: '2026-09-22T13:00:05Z' }]);
    if (url.includes('tasas_corridas')) return json([
      { corrida_en: '2026-09-22T13:00:05Z', tipo: 'publicacion', resultado: 'ok', fuentes: { 'freddie-pmms': 'ok' }, publicadas: 2, retenidas: 0, alerta_nueva: false, duracion_ms: 2100 },
      { corrida_en: '2026-09-21T13:00:04Z', tipo: 'publicacion', resultado: 'parcial', fuentes: { 'tesoro-10a': 'timeout' }, publicadas: 2, retenidas: 0, alerta_nueva: true, duracion_ms: 8400 },
    ]);
    if (url.includes('tasas_lecturas')) return json([{ id: 88, serie: 'pmms30', valor: 8.12, fecha_fuente: '2026-09-17', nota: 'salto > 1.0 pp' }]);
    if (url.includes('tasas_alertas')) return json([]);
    throw new Error('URL inesperada: ' + url);
  };
}
const llamar = usuario => admin.handler(
  { httpMethod: 'GET', headers: { authorization: 'Bearer token-de-prueba' } }, {},
  { fetch: falso({ usuario }), env: ENV, ahora: AHORA });

test('una sesión válida que NO es administradora recibe 403 y ningún dato', async () => {
  const r = await llamar({ id: 'u1', app_metadata: {} });
  assert.equal(r.statusCode, 403);
  const c = JSON.parse(r.body);
  assert.ok(!('corridas' in c) && !('umbralPp' in c));
});

test('un token que Supabase rechaza recibe 401', async () => {
  const r = await llamar(null);
  assert.equal(r.statusCode, 401);
});

test('el administrador recibe el estado completo con la forma del contrato', async () => {
  const r = await llamar({ id: 'u1', app_metadata: { is_admin: true } });
  assert.equal(r.statusCode, 200);
  assert.equal(r.headers['Cache-Control'], 'no-store');
  const c = JSON.parse(r.body);
  assert.equal(c.activo, false);
  assert.equal(c.umbralPp, 0.125);
  assert.equal(c.frescura, 'al_dia');
  assert.equal(c.horasDesdeUltimaOk, 1);
  assert.equal(c.corridas.length, 2);
  assert.equal(c.corridas[1].fuentes['tesoro-10a'], 'timeout');
  assert.deepEqual(c.retenidas[0], { id: 88, serie: 'pmms30', valor: 8.12, fechaFuente: '2026-09-17', nota: 'salto > 1.0 pp' });
  assert.equal(c.diasEsperados.length, 14);
  assert.ok(c.diasEsperados.some(d => d.hubo === false), 'los días sin corrida quedan marcados');
  assert.ok(!/https?:\/\/|service_role|sb_secret/i.test(r.body), 'sin URLs ni llaves en la respuesta');
});
