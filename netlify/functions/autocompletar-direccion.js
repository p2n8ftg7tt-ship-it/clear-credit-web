/* =========================================================
   Autocompletado de direcciones (Netlify Function)
   ---------------------------------------------------------
   PARA QUÉ SIRVE
   En los formularios que piden una dirección (cartas de crédito, carta de
   cese de comunicación, perfil de la cuenta y dirección del negocio),
   mientras la persona escribe en el campo de la calle esta función pide
   sugerencias a la API Places (New) de Google, y al elegir una devuelve
   calle, ciudad, estado y código postal separados. No hay casilla que
   activar: ver direccion-autocompletar.js.

   COMPROBAR QUE ESTÁ PUBLICADA (sin gastar cuota):
   POST con {"accion":"estado"} y la cabecera Origin del sitio →
   200 {vivo:true, configurado:true|false}. 404 = no está publicada.
   Pasos completos en INSTRUCCIONES-DIRECCIONES.md.

   POR QUÉ PASA POR AQUÍ Y NO DIRECTO DESDE EL NAVEGADOR
   - La llave de Google nunca sale del servidor.
   - Google recibe la consulta desde el servidor de Themora: no ve la
     dirección IP de la persona.
   - La política de seguridad del sitio (netlify.toml) no tiene que
     abrirse a scripts de Google.
   - Aquí se pone el tope de uso, para que nadie pueda gastar la cuota
     de pago.

   PRIVACIDAD (lo dice también privacidad.html)
   - Solo se llama cuando la persona escribe en el campo de la calle; el
     navegador no manda nada antes (ni al cargar ni al enfocar el campo).
   - Esta función NO guarda ni escribe en los registros lo que la persona
     escribe. Los errores solo registran el código HTTP.
   - Se rechaza cualquier texto que parezca un seguro social o una tarjeta.

   VARIABLES DE ENTORNO
   GOOGLE_PLACES_API_KEY (o GOOGLE_MAPS_API_KEY): la MISMA que ya usa
   revisar-negocio.js. Necesita «Places API (New)» habilitada y
   facturación activa. Sin llave, responde noConfigurado y el navegador
   simplemente deja de ofrecer el autocompletado.

   TOPES DE USO — LÉELO
   Los límites de aquí abajo viven en la memoria de cada instancia de la
   función: frenan el abuso casual, pero NO son una garantía (Netlify
   puede tener varias instancias a la vez). El tope que sí es firme es la
   cuota diaria de la API en Google Cloud: Console → APIs y servicios →
   Places API (New) → Cuotas → limita las solicitudes por día. Ponla.
   ========================================================= */

const MIN_CARACTERES = 4;
const MAX_CARACTERES = 100;
const LIMITE_POR_IP = 60;        // consultas por ventana, por instancia
const LIMITE_POR_SESION = 30;    // una sesión = una dirección que se está escribiendo
const VENTANA_MS = 10 * 60 * 1000;
const TIEMPO_GOOGLE_MS = 6000;
const MAX_ENTRADAS_MAPA = 5000;

const porIp = new Map();
const porSesion = new Map();

function googleApiKey() {
  return process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "";
}

function limpiar(texto, max) {
  return String(texto || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function responder(statusCode, cuerpo) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    body: JSON.stringify(cuerpo),
  };
}

function obtenerIp(event) {
  const h = event.headers || {};
  const valor = h["x-nf-client-connection-ip"] || h["client-ip"] || (h["x-forwarded-for"] || "").split(",")[0];
  return limpiar(valor, 45) || "desconocida";
}

/* Solo se acepta si la petición viene de una página del propio sitio. No es
   una defensa completa (un script fuera de un navegador puede mentir en la
   cabecera), pero corta el uso desde otros sitios web. */
function hostsPermitidos() {
  const hosts = new Set(["mithemora.com", "www.mithemora.com"]);
  [process.env.URL, process.env.DEPLOY_PRIME_URL, process.env.DEPLOY_URL].forEach((u) => {
    try { if (u) hosts.add(new URL(u).host); } catch (_) { /* variable mal escrita: se ignora */ }
  });
  if (process.env.NETLIFY_DEV === "true") { hosts.add("localhost:8888"); hosts.add("localhost:3000"); }
  return hosts;
}

function origenPermitido(event) {
  const h = event.headers || {};
  const crudo = h.origin || h.referer || "";
  try { return hostsPermitidos().has(new URL(crudo).host); } catch (_) { return false; }
}

function dentroDelLimite(mapa, clave, maximo, ahora) {
  if (mapa.size > MAX_ENTRADAS_MAPA) {
    for (const [k, v] of mapa) if (ahora - v.desde > VENTANA_MS) mapa.delete(k);
    if (mapa.size > MAX_ENTRADAS_MAPA) mapa.clear();
  }
  let e = mapa.get(clave);
  if (!e || ahora - e.desde > VENTANA_MS) { e = { desde: ahora, veces: 0 }; mapa.set(clave, e); }
  e.veces += 1;
  return e.veces <= maximo;
}

/* Un seguro social o una tarjeta escritos por error en el campo de la calle
   no deben viajar a Google. */
function pareceSensible(texto) {
  const t = String(texto || "");
  return /\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b/.test(t) || /\b(?:\d[ -]?){13,19}\b/.test(t);
}

const TIPOS_DE_DIRECCION = ["street_address", "premise", "subpremise"];
const TIPOS_QUE_NO_SON_DIRECCION = ["establishment", "point_of_interest", "locality", "administrative_area_level_1",
  "country", "route", "postal_code"];

/* Solo interesan direcciones con número. Si Google no manda tipos, se deja pasar. */
function esDireccion(prediccion) {
  const t = Array.isArray(prediccion.types) ? prediccion.types : [];
  if (t.some((x) => TIPOS_DE_DIRECCION.includes(x))) return true;
  if (t.some((x) => TIPOS_QUE_NO_SON_DIRECCION.includes(x))) return false;
  return true;
}

function armarSugerencias(datos) {
  const lista = Array.isArray(datos && datos.suggestions) ? datos.suggestions : [];
  return lista
    .map((s) => s && s.placePrediction)
    .filter((p) => p && p.placeId && esDireccion(p))
    .slice(0, 5)
    .map((p) => {
      const f = p.structuredFormat || {};
      return {
        id: String(p.placeId),
        principal: limpiar((f.mainText && f.mainText.text) || (p.text && p.text.text) || "", 120),
        secundario: limpiar((f.secondaryText && f.secondaryText.text) || "", 120),
      };
    });
}

function armarDireccion(lugar) {
  const c = Array.isArray(lugar && lugar.addressComponents) ? lugar.addressComponents : [];
  const buscar = (tipo, corto) => {
    const x = c.find((k) => Array.isArray(k.types) && k.types.includes(tipo));
    return x ? limpiar(corto ? (x.shortText || x.longText) : (x.longText || x.shortText), 80) : "";
  };
  const numero = buscar("street_number");
  const ruta = buscar("route");
  const unidad = buscar("subpremise");
  let calle = [numero, ruta].filter(Boolean).join(" ");
  if (calle && unidad) calle += " " + (/^\d/.test(unidad) ? "#" + unidad : unidad);
  const ciudad = buscar("locality") || buscar("postal_town") || buscar("sublocality_level_1") ||
    buscar("sublocality") || buscar("administrative_area_level_3");
  const estado = buscar("administrative_area_level_1", true);
  const cp5 = buscar("postal_code");
  const sufijo = buscar("postal_code_suffix");
  const cp = cp5 ? (sufijo ? cp5 + "-" + sufijo : cp5) : "";
  return { calle, ciudad, estado, cp, completa: !!(calle && ciudad && estado && cp) };
}

async function llamarGoogle(url, opciones) {
  const res = await fetch(url, { ...opciones, signal: AbortSignal.timeout(TIEMPO_GOOGLE_MS) });
  if (!res.ok) {
    // Solo el código: el cuerpo de la respuesta puede repetir lo que la persona escribió.
    console.error("[autocompletar-direccion] Google respondió " + res.status);
    return null;
  }
  return res.json();
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return responder(405, { error: "Método no permitido." });
  if (!origenPermitido(event)) return responder(403, { error: "Origen no permitido." });

  let cuerpo;
  try { cuerpo = JSON.parse(event.body || "{}"); } catch (_) { return responder(400, { error: "Solicitud inválida." }); }

  /* «estado»: para que el dueño compruebe, sin gastar cuota, que el servicio está
     publicado y si tiene llave. No llama a Google, no pide sesión y nunca devuelve
     la llave. Va ANTES de la comprobación de la llave: así «sin llave» se puede ver. */
  if (cuerpo && cuerpo.accion === "estado") {
    if (!dentroDelLimite(porIp, obtenerIp(event), LIMITE_POR_IP, Date.now())) {
      return responder(429, { limitado: true, error: "Demasiadas consultas." });
    }
    return responder(200, { vivo: true, configurado: !!googleApiKey() });
  }

  const llave = googleApiKey();
  if (!llave) return responder(503, { noConfigurado: true, error: "El autocompletado no está configurado." });

  const sesion = String(cuerpo.sesion || "");
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(sesion)) return responder(400, { error: "Sesión inválida." });

  const ahora = Date.now();
  if (!dentroDelLimite(porIp, obtenerIp(event), LIMITE_POR_IP, ahora) ||
      !dentroDelLimite(porSesion, sesion, LIMITE_POR_SESION, ahora)) {
    return responder(429, { limitado: true, error: "Demasiadas consultas. Escribe la dirección a mano." });
  }

  try {
    if (cuerpo.accion === "sugerir") {
      const texto = limpiar(cuerpo.texto, MAX_CARACTERES);
      if (texto.length < MIN_CARACTERES) return responder(200, { sugerencias: [] });
      if (pareceSensible(texto)) return responder(400, { error: "Esto no parece una dirección. No escribas aquí números de seguro social ni de tarjeta." });

      const datos = await llamarGoogle("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": llave },
        body: JSON.stringify({ input: texto, sessionToken: sesion, includedRegionCodes: ["us"], languageCode: "en" }),
      });
      if (!datos) return responder(502, { noDisponible: true, error: "El autocompletado no está disponible ahora." });
      return responder(200, { sugerencias: armarSugerencias(datos) });
    }

    if (cuerpo.accion === "detalle") {
      const id = String(cuerpo.id || "");
      if (!/^[A-Za-z0-9_-]{10,300}$/.test(id)) return responder(400, { error: "Lugar inválido." });

      const datos = await llamarGoogle(
        "https://places.googleapis.com/v1/places/" + encodeURIComponent(id) + "?sessionToken=" + encodeURIComponent(sesion),
        { headers: { "X-Goog-Api-Key": llave, "X-Goog-FieldMask": "addressComponents" } }
      );
      if (!datos) return responder(502, { noDisponible: true, error: "El autocompletado no está disponible ahora." });
      return responder(200, { direccion: armarDireccion(datos) });
    }

    return responder(400, { error: "Acción inválida." });
  } catch (err) {
    console.error("[autocompletar-direccion] error: " + (err && err.name ? err.name : "desconocido"));
    return responder(502, { noDisponible: true, error: "El autocompletado no está disponible ahora." });
  }
};

// Para las pruebas (tests/autocompletar-direccion.test.js).
exports.__prueba = { armarDireccion, armarSugerencias, esDireccion, pareceSensible, origenPermitido, porIp, porSesion };
