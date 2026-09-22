/* Prueba de la función pública tasas-hipoteca con un "fetch" falso: forma de la
   respuesta, caché, apagado, caída de la base de datos y que no se filtre nada
   interno. Correr con:  node --test tests/*.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');

const funcion = require('../netlify/functions/tasas-hipoteca.js');

const ENV = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_prueba' };
const AHORA = new Date('2026-09-21T14:00:00Z');
const json = (cuerpo, status = 200) => ({ ok: status < 400, status, json: async () => cuerpo });

function falso({ activo = true, publicado = true, alertas = [], caida = false } = {}) {
  return async url => {
    if (caida) return json({}, 500);
    if (url.includes('tasas_config')) return json([{ activo }]);
    if (url.includes('tasas_publicado')) {
      return json(publicado ? [{
        snapshot: {
          '30': { valor: 6.95, previo: 6.76, cambioPp: 0.19, fechaFuente: '2026-09-17' },
          '15': { valor: 6.26, previo: 6.09, cambioPp: 0.17, fechaFuente: '2026-09-17' },
        },
        publicado_en: '2026-09-21T13:00:05Z',
      }] : []);
    }
    if (url.includes('tasas_alertas')) return json(alertas);
    throw new Error('URL inesperada: ' + url);
  };
}
const llamar = (opts, evento = { httpMethod: 'GET' }) =>
  funcion.handler(evento, {}, { fetch: falso(opts), env: ENV, ahora: AHORA });

test('activa con datos: 200, JSON, caché pública de 5 minutos y cifras exactas', async () => {
  const r = await llamar();
  assert.equal(r.statusCode, 200);
  assert.match(r.headers['Content-Type'], /application\/json/);
  assert.match(r.headers['Cache-Control'], /public/);
  assert.match(r.headers['Cache-Control'], /s-maxage=300/);
  const c = JSON.parse(r.body);
  assert.equal(c.version, 1);
  assert.equal(c.activo, true);
  assert.equal(c.frescura, 'al_dia');
  assert.equal(c.terminos['30'].valor, 6.95);
  assert.equal(c.fuente.id, 'freddie-pmms');
});

test('apagada: solo version y activo:false (nada que revelar antes del lanzamiento)', async () => {
  const r = await llamar({ activo: false });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(JSON.parse(r.body), { version: 1, activo: false });
});

test('activa pero sin publicar todavía: sin_datos y sin cifras', async () => {
  const c = JSON.parse((await llamar({ publicado: false })).body);
  assert.equal(c.frescura, 'sin_datos');
  assert.equal(c.terminos, null);
});

test('las alertas salen sin la clave interna ni datos del Tesoro', async () => {
  const alertas = [{
    id: 5, tipo: 'tesoro_10a', termino: null, direccion: 'sube', magnitud_pp: 0.13,
    datos: { baseFecha: '2026-09-17', baseValor: 4.94 }, fecha_fuente: '2026-09-18',
    fuente_id: 'tesoro-10a', detectada_en: '2026-09-21T13:00:07Z', estado: 'activa',
  }];
  const r = await llamar({ alertas });
  const c = JSON.parse(r.body);
  assert.equal(c.alertas.length, 1);
  assert.equal(c.alertas[0].semanalPendiente, true);
  assert.equal(c.alertas[0].datos, null);
  assert.ok(!/clave|baseValor|umbral|corrida/i.test(r.body));
});

test('si la base de datos no responde: 503 sin caché y un mensaje corto', async () => {
  const r = await llamar({ caida: true });
  assert.equal(r.statusCode, 503);
  assert.equal(r.headers['Cache-Control'], 'no-store');
  assert.deepEqual(JSON.parse(r.body), { estado: 'no_disponible' });
});

test('sin variables de entorno: 503; con otro método: 405', async () => {
  const sinEnv = await funcion.handler({ httpMethod: 'GET' }, {}, { fetch: falso(), env: {}, ahora: AHORA });
  assert.equal(sinEnv.statusCode, 503);
  const post = await llamar({}, { httpMethod: 'POST' });
  assert.equal(post.statusCode, 405);
});

/* ---------------- casas flotantes: ultimaRevisionEn (specs/006-floating-rate-houses) ---------------- */
const FILA_CORRIDA = { corrida_en: '2026-09-21T13:00:04Z', resultado: 'ok', tipo: 'publicacion', fuentes: { x: 1 }, duracion_ms: 900, retenidas: 0, publicadas: 2 };
function falsoConRevision({ corridas = 'ok', filas = [FILA_CORRIDA], activo = true, configCae = false, publicadoCae = false } = {}) {
  const base = falso({ activo });
  const urls = [];
  const f = async url => {
    urls.push(url);
    if (url.includes('tasas_corridas')) {
      if (corridas === 'falla') return json({}, 500);
      if (corridas === 'lanza') throw new Error('sin red');
      return json(filas);
    }
    if (configCae && url.includes('tasas_config')) return json({}, 500);
    if (publicadoCae && url.includes('tasas_publicado')) return json({}, 500);
    return base(url);
  };
  f.urls = urls;
  return f;
}
const llamarCon = fetchFalso => funcion.handler({ httpMethod: 'GET' }, {}, { fetch: fetchFalso, env: ENV, ahora: AHORA });

test('ultimaRevisionEn: se lee la última corrida ok/parcial y sale tal cual', async () => {
  const f = falsoConRevision();
  const r = await llamarCon(f);
  assert.equal(r.statusCode, 200);
  const url = f.urls.find(u => u.includes('tasas_corridas'));
  assert.ok(url, 'debe leer tasas_corridas');
  assert.match(url, /resultado=in\.\(ok,parcial\)/);
  assert.match(url, /order=corrida_en\.desc/);
  assert.match(url, /limit=1/);
  assert.equal(JSON.parse(r.body).ultimaRevisionEn, '2026-09-21T13:00:04Z');
});

test('ultimaRevisionEn: sin corridas exitosas es null', async () => {
  const r = await llamarCon(falsoConRevision({ filas: [] }));
  assert.equal(JSON.parse(r.body).ultimaRevisionEn, null);
});

test('ultimaRevisionEn: si SOLO falla esa lectura, la respuesta sigue siendo 200 con null', async () => {
  for (const modo of ['falla', 'lanza']) {
    const r = await llamarCon(falsoConRevision({ corridas: modo }));
    assert.equal(r.statusCode, 200, modo);
    const c = JSON.parse(r.body);
    assert.equal(c.ultimaRevisionEn, null, modo);
    assert.equal(c.terminos['30'].valor, 6.95, 'el resto sigue intacto');
    assert.equal(c.frescura, 'al_dia');
  }
});

test('ultimaRevisionEn: los 503 de siempre siguen igual (config o publicado caídos)', async () => {
  for (const opts of [{ configCae: true }, { publicadoCae: true }]) {
    const r = await llamarCon(falsoConRevision(opts));
    assert.equal(r.statusCode, 503);
    assert.deepEqual(JSON.parse(r.body), { estado: 'no_disponible' });
  }
});

test('ultimaRevisionEn: apagada no lee corridas y devuelve solo { version, activo:false }', async () => {
  const f = falsoConRevision({ activo: false });
  const r = await llamarCon(f);
  assert.deepEqual(JSON.parse(r.body), { version: 1, activo: false });
  assert.equal(f.urls.some(u => u.includes('tasas_corridas')), false);
});

test('ultimaRevisionEn: no se filtra ningún otro dato de las corridas', async () => {
  const r = await llamarCon(falsoConRevision());
  assert.ok(!/duracion_ms|retenidas|publicadas|"fuentes"|resultado|"tipo":"publicacion"/.test(r.body), r.body);
});
