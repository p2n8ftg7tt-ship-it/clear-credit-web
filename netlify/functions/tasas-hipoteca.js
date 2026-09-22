/* =========================================================
   Agente de tasas hipotecarias — resumen PÚBLICO (solo lectura)
   (specs/004-mortgage-rate-agent · contracts/snapshot-public.md)

   Lo leen el bloque de Comprar casa y el aviso de las demás páginas.
   GET /.netlify/functions/tasas-hipoteca

   Por qué NO pide sesión ni límite por IP (a propósito):
   - Los visitantes no deben iniciar sesión para ver una tasa de referencia.
   - La respuesta es igual para todos, es de solo lectura, no lleva datos
     personales y no cuesta nada por llamada.
   - Se guarda en la caché de Netlify 5 minutos (s-maxage=300), así que muchas
     visitas no llegan cada una a la base de datos.
   Solo entrega lo que un visitante puede ver: nunca el registro de corridas,
   el umbral, las lecturas retenidas ni las claves internas de las alertas.

   Usa las mismas variables de entorno que el panel de administrador:
   SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
   ========================================================= */

const L = require('./tasas-hipoteca-logica.js');

function cabecerasServicio(serviceKey) {
  const esNueva = String(serviceKey || '').startsWith('sb_');
  return esNueva
    ? { apikey: serviceKey }
    : { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey };
}

function responder(statusCode, cuerpo, cache) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cache || 'no-store',
    },
    body: JSON.stringify(cuerpo),
  };
}

exports.handler = async (event, _context, deps = {}) => {
  if (event && event.httpMethod && event.httpMethod !== 'GET') {
    return responder(405, { error: 'Método no permitido.' });
  }

  const f = deps.fetch || fetch;
  const env = deps.env || process.env;
  const ahora = deps.ahora || new Date();
  const url = env.SUPABASE_URL;
  const llave = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !llave) return responder(503, { estado: 'no_disponible' });

  const base = url.replace(/\/$/, '') + '/rest/v1/';
  const cab = cabecerasServicio(llave);
  const leer = async ruta => {
    const res = await f(base + ruta, { headers: cab });
    if (!res.ok) throw new Error('http ' + res.status);
    return res.json();
  };

  try {
    const [configs, publicados] = await Promise.all([
      leer('tasas_config?id=eq.principal&select=activo'),
      leer('tasas_publicado?id=eq.actual&select=snapshot,publicado_en'),
    ]);
    const config = configs && configs[0] ? configs[0] : null;

    // Apagado o sin fila de configuración: no se dice nada más (y se puede guardar en caché).
    if (!config || config.activo !== true) {
      return responder(200, { version: 1, activo: false }, 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    }

    const alertas = await leer(
      'tasas_alertas?estado=eq.activa&select=id,tipo,termino,direccion,magnitud_pp,datos,fecha_fuente,fuente_id,detectada_en,estado');

    const cuerpo = L.construirRespuestaPublica({
      config,
      publicado: publicados && publicados[0] ? publicados[0] : null,
      alertas: alertas || [],
      ahora,
    });
    return responder(200, cuerpo, 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  } catch (e) {
    console.error('[tasas-hipoteca] no se pudo leer:', L.sanearErrorFuente(e));
    return responder(503, { estado: 'no_disponible' });
  }
};
