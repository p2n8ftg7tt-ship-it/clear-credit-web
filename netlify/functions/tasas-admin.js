/* =========================================================
   Agente de tasas hipotecarias — estado para el DUEÑO
   (specs/004-mortgage-rate-agent · contracts/status-admin.md)

   GET /.netlify/functions/tasas-admin   con   Authorization: Bearer <token de sesión>

   Solo responde si quien llama inició sesión en el sitio Y su cuenta tiene
   app_metadata.is_admin = true (igual que admin-data.js; ver INSTRUCCIONES-ADMIN.md).
   Sin token o con un token inválido: 401 sin datos. Con sesión pero sin ser
   administrador: 403 sin datos. Nadie más puede leer esto.

   NO manda correos ni avisos de ningún tipo: el dueño abre la vista y mira.
   Por eso la vista muestra cuánto hace de la última corrida buena y marca los
   días en que se esperaba una corrida y no hubo.

   Variables de entorno (las mismas del panel): SUPABASE_URL, SUPABASE_ANON_KEY,
   SUPABASE_SERVICE_ROLE_KEY.
   ========================================================= */

const L = require('./tasas-hipoteca-logica.js');

function responder(statusCode, cuerpo) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify(cuerpo),
  };
}

function cabecerasServicio(serviceKey) {
  const esNueva = String(serviceKey || '').startsWith('sb_');
  return esNueva
    ? { apikey: serviceKey }
    : { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey };
}

// Confirma que el token es de una sesión real (con la llave pública, como admin-data.js).
async function verifyCaller(accessToken, url, anonKey, f) {
  if (!url || !anonKey || !accessToken) return null;
  try {
    const res = await f(url.replace(/\/$/, '') + '/auth/v1/user', {
      headers: { Authorization: 'Bearer ' + accessToken, apikey: anonKey },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.id ? data : null;
  } catch (_) {
    return null;
  }
}

function tokenDe(event) {
  const h = (event && event.headers) || {};
  const auth = String(h.authorization || h.Authorization || '');
  const m = /^Bearer\s+(\S+)$/i.exec(auth.trim());
  return m ? m[1] : '';
}

exports.handler = async (event, _context, deps = {}) => {
  if (!event || event.httpMethod !== 'GET') return responder(405, { error: 'Método no permitido.' });

  const token = tokenDe(event);
  if (!token) return responder(401, { error: 'Inicia sesión para ver esta página.', requiresLogin: true });

  const f = deps.fetch || fetch;
  const env = deps.env || process.env;
  const ahora = deps.ahora || new Date();

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return responder(503, { error: 'El panel todavía no está configurado en este sitio.', notConfigured: true });
  }

  const quien = await verifyCaller(token, env.SUPABASE_URL, env.SUPABASE_ANON_KEY, f);
  if (!quien) return responder(401, { error: 'Inicia sesión para ver esta página.', requiresLogin: true });
  if (!(quien.app_metadata && quien.app_metadata.is_admin)) {
    return responder(403, { error: 'Tu cuenta no tiene acceso al panel de administrador.' });
  }

  // A partir de aquí ya sabemos que es el dueño.
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return responder(503, { error: 'Falta SUPABASE_SERVICE_ROLE_KEY en Netlify (ver INSTRUCCIONES-TASAS.md).', notConfigured: true });
  }
  const base = env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/';
  const cab = cabecerasServicio(env.SUPABASE_SERVICE_ROLE_KEY);
  const leer = async ruta => {
    const res = await f(base + ruta, { headers: cab });
    if (!res.ok) throw new Error('http ' + res.status);
    return res.json();
  };

  try {
    const [configs, publicados, corridas, retenidas, alertas] = await Promise.all([
      leer('tasas_config?id=eq.principal&select=activo,umbral_pp'),
      leer('tasas_publicado?id=eq.actual&select=publicado_en'),
      leer('tasas_corridas?select=corrida_en,tipo,resultado,fuentes,publicadas,retenidas,alerta_nueva,duracion_ms&order=corrida_en.desc&limit=60'),
      leer('tasas_lecturas?estado=eq.retenida&select=id,serie,valor,fecha_fuente,nota&order=fecha_fuente.desc&limit=20'),
      leer('tasas_alertas?estado=eq.activa&select=id,tipo,termino,direccion,magnitud_pp,datos,fecha_fuente,fuente_id,detectada_en,estado'),
    ]);
    const config = configs && configs[0] ? configs[0] : { activo: false, umbral_pp: L.UMBRAL_POR_DEFECTO };
    const publicadoEn = publicados && publicados[0] ? publicados[0].publicado_en : null;
    const listaCorridas = corridas || [];
    const buenas = listaCorridas.filter(c => c.resultado === 'ok' || c.resultado === 'parcial');

    return responder(200, {
      activo: config.activo === true,
      umbralPp: Number(config.umbral_pp),
      ultimaCorridaOk: buenas.length ? new Date(buenas[0].corrida_en).toISOString() : null,
      horasDesdeUltimaOk: L.horasDesdeUltimaOk(listaCorridas, ahora),
      publicadoEn: publicadoEn ? new Date(publicadoEn).toISOString() : null,
      frescura: L.calcularFrescura(publicadoEn, ahora),
      corridas: listaCorridas.map(c => ({
        corridaEn: c.corrida_en, tipo: c.tipo, resultado: c.resultado, fuentes: c.fuentes || {},
        publicadas: c.publicadas, retenidas: c.retenidas, alertaNueva: c.alerta_nueva, duracionMs: c.duracion_ms,
      })),
      retenidas: (retenidas || []).map(r => ({ id: r.id, serie: r.serie, valor: Number(r.valor), fechaFuente: r.fecha_fuente, nota: r.nota })),
      alertasActivas: L.construirRespuestaPublica({ config: { activo: true }, publicado: null, alertas: alertas || [], ahora }).alertas,
      diasEsperados: L.diasEsperados(ahora, listaCorridas, 14),
    });
  } catch (e) {
    console.error('[tasas-admin] no se pudo leer:', L.sanearErrorFuente(e));
    return responder(503, { error: 'No pudimos leer el estado del agente. Intenta de nuevo.' });
  }
};
