/* =========================================================
   Ciudad aproximada de quien visita "¿Aparezco?"
   ---------------------------------------------------------
   Netlify deduce la ciudad por la conexión (context.geo), sin
   pedir permiso al teléfono y sin llamar a otra empresa. Esta
   función devuelve SOLO ciudad y estado de EE. UU. — nunca
   coordenadas, código postal ni zona horaria — y no guarda ni
   registra nada. La página la usa para sugerir la ciudad; la
   persona siempre puede cambiarla.

   Está escrita con la sintaxis moderna (export default) porque
   context.geo solo existe ahí; el resto de funciones sigue igual.
   No necesita variables de entorno ni cuesta dinero.
   ========================================================= */

const CABECERAS = {
  "Content-Type": "application/json; charset=utf-8",
  // La ciudad es de cada visitante: nunca en la caché compartida.
  "Cache-Control": "private, no-store",
};
const NULOS = { ciudad: null, estado: null };

const responder = (cuerpo, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: CABECERAS });

export default async (req, context) => {
  if (req.method !== "GET") return responder({ error: "Método no permitido." }, 405);
  try {
    const geo = (context && context.geo) || {};
    const pais = geo.country && geo.country.code;
    const ciudad = String(geo.city || "").trim().slice(0, 80);
    const estado = String((geo.subdivision && geo.subdivision.code) || "").trim().toUpperCase();
    if (pais !== "US" || !ciudad || !/^[A-Z]{2}$/.test(estado)) return responder(NULOS);
    return responder({ ciudad, estado });
  } catch {
    return responder(NULOS);
  }
};
