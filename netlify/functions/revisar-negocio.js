/* =========================================================
   "¿Aparezco?" — la búsqueda automática (Netlify Function)
   ---------------------------------------------------------
   PARA QUÉ SIRVE
   Antes, esta herramienta mandaba a la persona a abrir Google Maps
   y Apple Maps ella misma y contarnos, de memoria, qué vio. Esta
   función hace la búsqueda de verdad: consulta la API de Google
   Places (ubicación, calificación, número de reseñas, hasta 3
   reseñas de texto, si aparece buscando por su nombre y si aparece
   buscando por lo que vende), y opcionalmente Apple Maps y una IA
   que redacta sugerencias con esos datos reales.

   VARIABLES DE ENTORNO EN NETLIFY

     GOOGLE_PLACES_API_KEY   ← REQUERIDA. Sin ella, esta función
                                responde "noConfigurado" y
                                aparezco.html muestra un aviso de
                                "vuelve más tarde / agenda una cita"
                                — la búsqueda automática es la única
                                forma de usar la herramienta, ya no
                                existe un modo manual de respaldo.
                                Se crea en console.cloud.google.com,
                                con la "Places API (New)" habilitada
                                y facturación activa. Tiene costo por
                                consulta — ver INSTRUCCIONES-APARIENCIA.md.

     APPLE_MAPS_TEAM_ID
     APPLE_MAPS_KEY_ID
     APPLE_MAPS_PRIVATE_KEY  ← OPCIONALES. Sin ellas, el parámetro de
                                Apple Maps simplemente no aparece en
                                el scorecard (no cuenta a favor ni en
                                contra del puntaje). Solo confirman si
                                el negocio EXISTE como lugar — Apple
                                no tiene una API pública que dé
                                estrellas ni reseñas de negocios
                                ajenos.

     ANTHROPIC_API_KEY       ← OPCIONAL (la misma que ya usa
                                coach.js). Sin ella, las sugerencias
                                se arman con reglas fijas sobre los
                                datos reales, no con IA. Con ella,
                                solo se usa si quien busca inició
                                sesión — igual que el resto del
                                sitio, para controlar el gasto.

     SUPABASE_URL
     SUPABASE_ANON_KEY
     SUPABASE_SERVICE_ROLE_KEY  ← para el límite de 5 búsquedas por
                                   IP al día (tabla aparezco_contador
                                   en supabase-schema.sql) y para
                                   confirmar si quien busca tiene
                                   sesión. Si falta la llave de
                                   servicio, el límite simplemente
                                   no se aplica (no bloquea nada).

   PRIVACIDAD
   A diferencia del resto de esta herramienta, esta función SÍ manda
   el nombre, ciudad y giro del negocio a Google (y, si se configuró,
   a Apple y a Anthropic). aparezco.html lo dice con todas sus letras
   antes de que la persona toque el botón.
   ========================================================= */

const MAX_TEXTO = 140;
const LIMITE_DIARIO_POR_IP = 5;
const GOOGLE_FIELDS_BUSQUEDA_NOMBRE =
  "places.id,places.displayName,places.formattedAddress,places.rating," +
  "places.userRatingCount,places.googleMapsUri,places.businessStatus," +
  "places.nationalPhoneNumber,places.regularOpeningHours,places.websiteUri";
// Campos livianos: se piden para hasta 10 negocios del mismo giro, así que
// solo lo necesario para (a) encontrar la posición del propio negocio y
// (b) calcular el promedio de la competencia — nunca su ficha completa.
const GOOGLE_FIELDS_BUSQUEDA_GIRO = "places.id,places.displayName,places.rating,places.userRatingCount";
const GOOGLE_FIELDS_DETALLE = "reviews,editorialSummary,photos";

// Estándares fijos de "negocio bien puesto" — además de comparar contra la
// competencia real de su categoría y ciudad, siempre mostramos esta meta
// general para que el número tenga un piso, aunque toda su competencia
// esté igual de floja.
const META_CALIFICACION = 4.5;
const META_RESENAS = 50;
const META_FOTOS = 8;
const META_POSICION_GIRO = 3;

function respuesta(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}

function limpiar(texto, max) {
  return String(texto || "").trim().slice(0, max);
}

function conTiempo(promesa, ms) {
  return Promise.race([
    promesa,
    new Promise((_, rej) => setTimeout(() => rej(new Error("tiempo agotado")), ms)),
  ]);
}

/* ---------------------------------------------------------
   Límite de gasto: 5 búsquedas por IP por día. Usa la llave de
   servicio de Supabase directamente por REST, sin librería —
   igual de espíritu que admin-data.js. Si algo falla o falta la
   llave, deja pasar la búsqueda: mejor un gasto ocasional que
   romper la herramienta para todo el mundo por un problema de la
   base de datos.
   --------------------------------------------------------- */
function cabecerasServicio(serviceKey) {
  const esNueva = String(serviceKey || "").startsWith("sb_");
  return esNueva
    ? { apikey: serviceKey, "Content-Type": "application/json" }
    : { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" };
}

function obtenerIp(event) {
  const encabezado = event.headers["x-nf-client-connection-ip"] || event.headers["client-ip"] ||
    (event.headers["x-forwarded-for"] || "").split(",")[0];
  return limpiar(encabezado, 45) || "desconocida";
}

async function revisarLimite(ip) {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { permitido: true };

  const base = url.replace(/\/$/, "");
  const hoy = new Date().toISOString().slice(0, 10);
  const headers = cabecerasServicio(serviceKey);

  try {
    const actual = await fetch(
      base + `/rest/v1/aparezco_contador?ip=eq.${encodeURIComponent(ip)}&dia=eq.${hoy}&select=veces`,
      { headers }
    ).then((r) => (r.ok ? r.json() : []));

    const veces = (actual[0] && actual[0].veces) || 0;
    if (veces >= LIMITE_DIARIO_POR_IP) return { permitido: false };

    await fetch(base + "/rest/v1/aparezco_contador", {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ ip, dia: hoy, veces: veces + 1 }),
    });
    return { permitido: true };
  } catch (err) {
    console.error("[revisar-negocio] no se pudo revisar el límite:", err.message);
    return { permitido: true };
  }
}

async function haySesion(accessToken) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey || !accessToken) return false;
  try {
    const res = await fetch(url.replace(/\/$/, "") + "/auth/v1/user", {
      headers: { Authorization: "Bearer " + accessToken, apikey: anonKey },
    });
    if (!res.ok) return false;
    const u = await res.json();
    return !!(u && u.id);
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------
   Google Places API (New)
   --------------------------------------------------------- */
async function buscarGoogle(query, fieldMask, pageSize) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify({ textQuery: query, pageSize: pageSize || 5 }),
  });
  if (!res.ok) {
    const texto = await res.text();
    throw new Error("Google Places respondió " + res.status + ": " + texto.slice(0, 200));
  }
  const datos = await res.json();
  return Array.isArray(datos.places) ? datos.places : [];
}

async function detalleGoogle(placeId) {
  const res = await fetch(
    "https://places.googleapis.com/v1/places/" + encodeURIComponent(placeId),
    {
      headers: {
        "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": GOOGLE_FIELDS_DETALLE,
      },
    }
  );
  if (!res.ok) return null;
  return res.json();
}

/* Promedio de calificación y reseñas de la competencia real: los negocios
   que salen buscando el mismo giro en la misma ciudad, sin contar al propio.
   Usa los mismos resultados que ya se piden para calcular la posición —
   no es una llamada extra a Google. */
function calcularCompetencia(candidatosGiro, idPropio) {
  const otros = (candidatosGiro || [])
    .filter((p) => p.id !== idPropio && typeof p.rating === "number")
    .slice(0, 5)
    .map((p) => ({
      nombre: limpiar((p.displayName && p.displayName.text) || "", 80),
      calificacion: p.rating,
      totalResenas: typeof p.userRatingCount === "number" ? p.userRatingCount : 0,
    }));
  if (!otros.length) return null;
  return {
    cantidad: otros.length,
    promedioCalificacion: otros.reduce((s, p) => s + p.calificacion, 0) / otros.length,
    promedioResenas: Math.round(otros.reduce((s, p) => s + p.totalResenas, 0) / otros.length),
    top: otros,
  };
}

async function consultarGoogle(nombre, ciudad, giro) {
  const consultaNombre = nombre + (ciudad ? " " + ciudad : "");
  const consultaGiro = (giro || nombre) + (ciudad ? " en " + ciudad : " cerca de mí");

  const [candidatosNombre, candidatosGiro] = await Promise.all([
    buscarGoogle(consultaNombre, GOOGLE_FIELDS_BUSQUEDA_NOMBRE, 3),
    buscarGoogle(consultaGiro, GOOGLE_FIELDS_BUSQUEDA_GIRO, 10),
  ]);

  const mejor = candidatosNombre[0];
  if (!mejor) {
    return { encontrado: false, consultaNombre, consultaGiro, competencia: calcularCompetencia(candidatosGiro, null) };
  }

  const posicion = candidatosGiro.findIndex((p) => p.id === mejor.id);
  const detalle = await detalleGoogle(mejor.id).catch(() => null);

  const reseñas = ((detalle && detalle.reviews) || []).slice(0, 3).map((r) => ({
    texto: limpiar((r.text && r.text.text) || "", 220),
    calificacion: typeof r.rating === "number" ? r.rating : null,
    autor: limpiar((r.authorAttribution && r.authorAttribution.displayName) || "", 60),
  }));

  return {
    encontrado: true,
    nombre: limpiar((mejor.displayName && mejor.displayName.text) || nombre, 120),
    direccion: limpiar(mejor.formattedAddress || "", 200),
    telefono: limpiar(mejor.nationalPhoneNumber || "", 30) || null,
    sitioWeb: limpiar(mejor.websiteUri || "", 200) || null,
    calificacion: typeof mejor.rating === "number" ? mejor.rating : null,
    totalResenas: typeof mejor.userRatingCount === "number" ? mejor.userRatingCount : null,
    mapsUri: mejor.googleMapsUri || null,
    estado: mejor.businessStatus || null,
    horarioCompleto: !!(mejor.regularOpeningHours && Array.isArray(mejor.regularOpeningHours.periods) && mejor.regularOpeningHours.periods.length > 0),
    fotos: detalle && Array.isArray(detalle.photos) ? detalle.photos.length : null,
    enGiroTop: posicion !== -1,
    posicion: posicion !== -1 ? posicion + 1 : null,
    resumen: limpiar((detalle && detalle.editorialSummary && detalle.editorialSummary.text) || "", 200) || null,
    resenas: reseñas,
    competencia: calcularCompetencia(candidatosGiro, mejor.id),
    consultaNombre,
    consultaGiro,
  };
}

/* ---------------------------------------------------------
   Scorecard — un parámetro por fila, con la meta y (cuando hay
   datos) el promedio real de la competencia. El puntaje es el
   porcentaje de peso cumplido sobre el peso de lo que sí aplica
   (por ejemplo, si Apple Maps no está configurado, ese parámetro
   ni suma ni resta).
   --------------------------------------------------------- */
function evaluarParametros(g, apple) {
  const filas = [];
  let pesoTotal = 0;
  let pesoGanado = 0;

  function fila(clave, etiqueta, aplica, cumplido, tuValor, meta, nota, peso) {
    if (!aplica) return;
    pesoTotal += peso;
    if (cumplido) pesoGanado += peso;
    filas.push({ clave, etiqueta, cumplido, tuValor, meta, nota: nota || null });
  }

  fila(
    "presencia", "Tienes ficha en Google Maps", true, g.encontrado,
    g.encontrado ? "Sí, existe" : "No la encontramos",
    "Ficha creada y reclamada",
    g.encontrado ? null : "Sin esto, ningún otro parámetro de esta lista puede mejorar todavía.",
    25
  );

  if (g.encontrado) {
    const tieneCal = g.calificacion != null;
    fila(
      "calificacion", "Calificación", true, tieneCal && g.calificacion >= META_CALIFICACION,
      tieneCal ? g.calificacion.toFixed(1) + "★" : "Sin calificación todavía",
      META_CALIFICACION.toFixed(1) + "★ o más",
      g.competencia ? `El promedio de tu categoría en tu ciudad es ${g.competencia.promedioCalificacion.toFixed(1)}★.` : null,
      20
    );

    fila(
      "resenas", "Número de reseñas", true, (g.totalResenas || 0) >= META_RESENAS,
      (g.totalResenas || 0) + (g.totalResenas === 1 ? " reseña" : " reseñas"),
      META_RESENAS + " reseñas o más",
      g.competencia ? `El promedio de tu categoría es ${g.competencia.promedioResenas} reseñas.` : null,
      15
    );

    fila(
      "categoria", "Apareces buscando lo que vendes (sin tu nombre)", true,
      !!g.enGiroTop && g.posicion <= META_POSICION_GIRO,
      g.enGiroTop ? "Posición " + g.posicion + " de 10" : "No apareces",
      "Entre los primeros " + META_POSICION_GIRO,
      null, 20
    );

    fila(
      "horario", "Horario cargado completo", true, !!g.horarioCompleto,
      g.horarioCompleto ? "Completo" : "Incompleto o vacío",
      "Los 7 días, con hora de apertura y cierre",
      null, 10
    );

    fila(
      "fotos", "Fotos del negocio", g.fotos != null, g.fotos != null && g.fotos >= META_FOTOS,
      g.fotos != null ? g.fotos + (g.fotos === 1 ? " foto" : " fotos") : "Sin datos",
      META_FOTOS + " fotos o más", null, 5
    );

    fila(
      "sitioweb", "Sitio web enlazado a tu ficha", true, !!g.sitioWeb,
      g.sitioWeb ? "Sí" : "No",
      "Un sitio web, aunque sea sencillo", null, 5
    );
  }

  if (apple && apple.configurado) {
    fila(
      "apple", "Tienes ficha en Apple Maps", true, apple.encontrado === true,
      apple.encontrado ? "Sí, existe" : "No la encontramos",
      "Ficha creada en Apple Business Connect", null, 10
    );
  }

  const puntaje = pesoTotal ? Math.round((100 * pesoGanado) / pesoTotal) : 0;
  return { filas, puntaje };
}

/* ---------------------------------------------------------
   Apple Maps Server API — solo confirma si existe. Apple no
   expone estrellas ni reseñas de negocios de terceros por API.
   Requiere una cuenta de Apple Developer Program con una llave de
   tipo "Maps" (MapKit). Ver INSTRUCCIONES-APARIENCIA.md.
   --------------------------------------------------------- */
function base64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function firmarJwtApple(teamId, keyId, privateKeyPem) {
  const crypto = require("crypto");
  const header = { alg: "ES256", kid: keyId, typ: "JWT" };
  const ahora = Math.floor(Date.now() / 1000);
  const payload = { iss: teamId, iat: ahora, exp: ahora + 1200 };
  const entrada = base64url(JSON.stringify(header)) + "." + base64url(JSON.stringify(payload));
  // La llave de Apple es EC P-256 (no Ed25519), así que el algoritmo de hash
  // hay que darlo explícito — con null, Node lo rechaza para este tipo de llave.
  const firma = crypto.sign("sha256", Buffer.from(entrada), {
    key: privateKeyPem,
    dsaEncoding: "ieee-p1363",
  });
  return entrada + "." + base64url(firma);
}

async function consultarApple(nombre, ciudad) {
  const teamId = process.env.APPLE_MAPS_TEAM_ID;
  const keyId = process.env.APPLE_MAPS_KEY_ID;
  const llavePrivada = process.env.APPLE_MAPS_PRIVATE_KEY;
  if (!teamId || !keyId || !llavePrivada) return { configurado: false, encontrado: null };

  try {
    const jwt = firmarJwtApple(teamId, keyId, llavePrivada.replace(/\\n/g, "\n"));
    const tokenRes = await fetch("https://maps-api.apple.com/v1/token", {
      headers: { Authorization: "Bearer " + jwt },
    });
    if (!tokenRes.ok) throw new Error("token de Apple: " + tokenRes.status);
    const { accessToken } = await tokenRes.json();

    const consulta = nombre + (ciudad ? " " + ciudad : "");
    const buscarRes = await fetch(
      "https://maps-api.apple.com/v1/search?q=" + encodeURIComponent(consulta) + "&limitToCountries=US",
      { headers: { Authorization: "Bearer " + accessToken } }
    );
    if (!buscarRes.ok) throw new Error("búsqueda de Apple: " + buscarRes.status);
    const datos = await buscarRes.json();
    const resultados = Array.isArray(datos.results) ? datos.results : [];
    return { configurado: true, encontrado: resultados.length > 0 };
  } catch (err) {
    console.error("[revisar-negocio] Apple Maps falló:", err.message);
    return { configurado: true, encontrado: null, error: true };
  }
}

/* ---------------------------------------------------------
   Sugerencias — con IA (solo con sesión) o con reglas fijas.
   --------------------------------------------------------- */
const SUG_SYSTEM_PROMPT = `Eres Zyron, el asistente de Themora. Te doy datos reales, ya verificados, de la
ficha de un negocio en Google Maps (y a veces Apple Maps), un scorecard de parámetros con su meta, y a
veces el promedio real de su competencia (otros negocios del mismo giro y ciudad). Tu trabajo es escribir
de 3 a 5 sugerencias concretas en español sobre qué mejorar, basadas SOLO en los datos que te doy — nunca
inventes cifras, reseñas ni datos que no aparezcan ahí.

Reglas:
- Cada sugerencia en su propia línea, empezando con "- ".
- Cálido y directo, sin tecnicismos, sin sonar a folleto.
- Nunca prometas un resultado ("vas a subir a la posición 1", "así consigues más clientes seguro").
- Nunca digas que algo "es ilegal".
- Si los datos ya son buenos, dilo con honestidad y sugiere mantenerlos (pedir reseñas frescas, revisar el horario cada tanto) en vez de inventar un problema.
- No repitas el nombre del negocio en cada línea.`;

function reglasFijas(datos) {
  const T = [];
  if (!datos.encontrado) {
    T.push("Reclama tu ficha en google.com/business — hoy tu negocio no aparece ni buscando tu propio nombre, así que nadie que ya te conoce puede confirmarte por ahí.");
    return T;
  }
  if (datos.estado && datos.estado !== "OPERATIONAL") {
    T.push("Tu ficha de Google dice que el negocio está cerrado o cerrado permanentemente. Corrige eso primero en google.com/business — es lo que más aleja a un cliente nuevo.");
  }
  const comp = datos.competencia;
  if (datos.calificacion == null || datos.totalResenas == null || datos.totalResenas < 5) {
    T.push("Tienes pocas reseñas (o ninguna todavía). Pide a tus próximos clientes contentos que dejen una — es lo único de esta lista que sigue trabajando para ti todos los días.");
  } else if (datos.calificacion < 4.0) {
    const contexto = comp ? ` El promedio de tu categoría en tu ciudad es ${comp.promedioCalificacion.toFixed(1)} estrellas.` : "";
    T.push(`Tu calificación está en ${datos.calificacion.toFixed(1)} estrellas con ${datos.totalResenas} reseñas.${contexto} Contesta las reseñas negativas con calma y sigue pidiendo reseñas nuevas — eso sube el promedio con el tiempo.`);
  }
  if (comp && (datos.totalResenas || 0) < comp.promedioResenas * 0.6) {
    T.push(`Tu competencia en esta categoría tiene en promedio ${comp.promedioResenas} reseñas — vas bastante atrás en volumen, aunque tu calificación esté bien. Más reseñas es lo que más pesa para que un cliente nuevo decida entrar.`);
  }
  if (!datos.horarioCompleto) {
    T.push("No tienes el horario completo cargado en Google. Un horario a medias hace que la gente no sepa si estás abierto y prefiera no arriesgarse.");
  }
  if (datos.enGiroTop === false) {
    T.push("Te encontramos por tu nombre, pero no apareces cuando alguien busca lo que vendes sin conocerte. Revisa la categoría de tu ficha y que la descripción use las mismas palabras que usaría un cliente nuevo.");
  }
  if (datos.apple && datos.apple.configurado && datos.apple.encontrado === false) {
    T.push("No te encontramos en Apple Maps. Regístrate gratis en business.apple.com — es la mitad de los teléfonos en Estados Unidos.");
  }
  if (T.length === 0) {
    T.push("Lo básico ya está bien puesto. Sigue pidiendo reseñas y revisa la ficha cada tres meses — Google cambia datos solo, y cualquiera puede \"sugerir una corrección\" sin avisarte.");
  }
  return T;
}

async function generarSugerenciasIA(datos) {
  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 400,
      system: SUG_SYSTEM_PROMPT,
      messages: [{ role: "user", content: "Datos del negocio:\n" + JSON.stringify(datos) }],
    }),
  });
  if (!anthropicRes.ok) throw new Error("Anthropic respondió " + anthropicRes.status);
  const data = await anthropicRes.json();
  const texto = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const lineas = texto.split("\n").map((l) => l.replace(/^[\s-]+/, "").trim()).filter(Boolean);
  if (!lineas.length) throw new Error("Anthropic no devolvió sugerencias");
  return lineas.slice(0, 5);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return respuesta(405, { error: "Método no permitido." });

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return respuesta(200, { noConfigurado: true });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return respuesta(400, { error: "Solicitud inválida." });
  }

  const nombre = limpiar(payload.nombre, MAX_TEXTO);
  const ciudad = limpiar(payload.ciudad, MAX_TEXTO);
  const giro = limpiar(payload.giro, MAX_TEXTO);
  if (!nombre) return respuesta(400, { error: "Falta el nombre del negocio." });

  const ip = obtenerIp(event);
  const { permitido } = await revisarLimite(ip);
  if (!permitido) {
    return respuesta(200, {
      limitado: true,
      error: "Ya hiciste varias búsquedas gratis hoy desde esta conexión. Intenta mañana, o búscalo tú mismo mientras tanto.",
    });
  }

  try {
    const [google, apple] = await Promise.all([
      conTiempo(consultarGoogle(nombre, ciudad, giro), 8000),
      conTiempo(consultarApple(nombre, ciudad), 6000).catch(() => ({ configurado: false, encontrado: null })),
    ]);

    let sugerencias;
    const sesionActiva = process.env.ANTHROPIC_API_KEY && (await haySesion(payload.accessToken));
    if (sesionActiva) {
      try {
        sugerencias = await conTiempo(generarSugerenciasIA({ ...google, apple }), 6000);
      } catch (err) {
        console.error("[revisar-negocio] IA de sugerencias falló, uso reglas fijas:", err.message);
        sugerencias = reglasFijas({ ...google, apple });
      }
    } else {
      sugerencias = reglasFijas({ ...google, apple });
    }

    const { filas: parametros, puntaje } = evaluarParametros(google, apple);

    return respuesta(200, { ok: true, google, apple, sugerencias, parametros, puntaje, conIA: !!sesionActiva });
  } catch (err) {
    console.error("[revisar-negocio] error:", err.message);
    return respuesta(502, { error: "No se pudo completar la búsqueda en este momento. Intenta de nuevo en un minuto." });
  }
};
