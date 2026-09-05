/* =========================================================
   Panel de administrador — datos (Netlify Function)
   Solo responde si quien llama inició sesión en el sitio Y su cuenta
   tiene app_metadata.is_admin = true (se marca a mano en Supabase,
   igual que el campo "plan" — ver INSTRUCCIONES-ADMIN.md).

   Variables de entorno requeridas en Netlify (además de las que ya
   tienes para el resto del sitio):
   - SUPABASE_URL                (la misma que ya usas en auth.js)
   - SUPABASE_ANON_KEY           (la misma que ya usas en auth.js)
   - SUPABASE_SERVICE_ROLE_KEY   (NUEVA — llave secreta, solo aquí,
                                   NUNCA en ningún archivo del sitio)

   Esta función es la única parte del sitio que usa la llave secreta.
   Esa llave puede leer TODO en tu base de datos sin restricciones,
   así que solo vive como variable de entorno en Netlify — nunca en
   auth.js, nunca en admin.html, nunca en un archivo que se publique
   en el navegador.
   ========================================================= */

const MAX_USER_PAGES = 10; // hasta 10,000 clientes; suficiente para arrancar

function corsHeaders() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
}

function jsonResponse(statusCode, body) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

// Verifica quién llama usando la llave pública (anon) — igual que coach.js.
// Esto NO necesita la llave secreta: solo confirma que el token pertenece
// a una sesión real y nos deja ver los datos propios de esa persona,
// incluido si tiene is_admin = true.
async function verifyCaller(accessToken) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey || !accessToken) return null;

  try {
    const res = await fetch(url.replace(/\/$/, "") + "/auth/v1/user", {
      headers: {
        Authorization: "Bearer " + accessToken,
        apikey: anonKey,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.id ? data : null;
  } catch (err) {
    console.error("[admin-data] error verificando sesión:", err);
    return null;
  }
}

async function fetchAllUsers(baseUrl, serviceKey) {
  const headers = { apikey: serviceKey, Authorization: "Bearer " + serviceKey };
  const all = [];
  for (let page = 1; page <= MAX_USER_PAGES; page++) {
    const res = await fetch(
      baseUrl.replace(/\/$/, "") + `/auth/v1/admin/users?page=${page}&per_page=1000`,
      { headers }
    );
    if (!res.ok) {
      throw new Error("No se pudo leer la lista de clientes (status " + res.status + ")");
    }
    const data = await res.json();
    const batch = Array.isArray(data.users) ? data.users : [];
    all.push(...batch);
    if (batch.length < 1000) break;
  }
  return all;
}

const MAX_ROW_PAGES = 10; // hasta 10,000 filas por tabla; suficiente para arrancar

// Trae TODAS las filas de una tabla (solo las columnas que pidas), paginando
// de 1000 en 1000. Se usa para analisis_credito y calculos_hipoteca — así
// podemos calcular promedios y distribuciones reales, no solo un conteo.
async function fetchAllRows(baseUrl, serviceKey, table, select) {
  const headers = { apikey: serviceKey, Authorization: "Bearer " + serviceKey };
  const all = [];
  for (let page = 0; page < MAX_ROW_PAGES; page++) {
    const offset = page * 1000;
    const res = await fetch(
      baseUrl.replace(/\/$/, "") +
        `/rest/v1/${table}?select=${select}&order=created_at.asc&limit=1000&offset=${offset}`,
      { headers }
    );
    if (!res.ok) return all; // si algo falla a medio camino, seguimos con lo que ya tenemos
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 1000) break;
  }
  return all;
}

function daysAgo(iso) {
  if (!iso) return Infinity;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return Infinity;
  return (Date.now() - then) / 86400000;
}

// Lunes de la semana ISO a la que pertenece una fecha — para agrupar
// registros nuevos por semana sin depender de ninguna extensión de SQL.
function mondayOf(dateIso) {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return null;
  const day = (d.getUTCDay() + 6) % 7; // lunes = 0
  d.setUTCDate(d.getUTCDate() - day);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

// Cuenta cuántos clientes nuevos hubo cada semana (lunes a domingo) en las
// últimas `weeks` semanas, incluyendo la semana en curso.
function weeklySignups(users, weeks) {
  const buckets = new Map();
  const today = new Date();
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i * 7);
    const key = mondayOf(d.toISOString());
    if (key) buckets.set(key, 0);
  }
  users.forEach((u) => {
    if (!u.created_at) return;
    const key = mondayOf(u.created_at);
    if (key && buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
  });
  return Array.from(buckets.entries()).map(([semana, cantidad]) => ({ semana, cantidad }));
}

// Clasifica un puntaje FICO en los mismos cinco rangos que ya explicamos en
// credito.html (300–579 Malo … 800–850 Excepcional), para que el panel de
// administrador use exactamente el mismo lenguaje que el resto del sitio.
function scoreTier(score) {
  if (score == null || Number.isNaN(score)) return null;
  if (score < 580) return "malo";
  if (score < 670) return "regular";
  if (score < 740) return "bueno";
  if (score < 800) return "muy_bueno";
  return "excepcional";
}

function priceTier(price) {
  if (price == null || Number.isNaN(price)) return null;
  if (price < 200000) return "menos_200k";
  if (price < 350000) return "200k_350k";
  if (price < 500000) return "350k_500k";
  return "mas_500k";
}

function average(nums) {
  const valid = nums.filter((n) => typeof n === "number" && !Number.isNaN(n));
  if (!valid.length) return null;
  return valid.reduce((sum, n) => sum + n, 0) / valid.length;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Método no permitido." });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse(503, {
      error: "El panel de administrador todavía no está configurado en este sitio.",
      notConfigured: true,
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return jsonResponse(400, { error: "Solicitud inválida." });
  }

  const accessToken = String(payload.accessToken || "");
  const caller = await verifyCaller(accessToken);
  if (!caller) {
    return jsonResponse(401, { error: "Inicia sesión para ver esta página.", requiresLogin: true });
  }
  const isAdmin = !!(caller.app_metadata && caller.app_metadata.is_admin);
  if (!isAdmin) {
    return jsonResponse(403, { error: "Tu cuenta no tiene acceso al panel de administrador." });
  }

  try {
    const TRIAL_DAYS = 7; // debe coincidir con TRIAL_DAYS en auth.js

    const [users, analyses, mortgages] = await Promise.all([
      fetchAllUsers(supabaseUrl, serviceKey),
      fetchAllRows(supabaseUrl, serviceKey, "analisis_credito", "puntaje,utilizacion,created_at"),
      fetchAllRows(supabaseUrl, serviceKey, "calculos_hipoteca", "precio,pago_mensual,tasa,created_at"),
    ]);

    const planCounts = { basico: 0, estandar: 0, premium: 0, sin_plan: 0 };
    let newLast7 = 0;
    let newLast30 = 0;
    let activos30 = 0; // inició sesión en los últimos 30 días
    let elegiblesPrueba = 0; // cuenta con más de TRIAL_DAYS de creada
    let conPlanTrasPrueba = 0; // de esas, cuántas ya tienen un plan pagado

    const clients = users.map((u) => {
      const plan = u.app_metadata && u.app_metadata.plan ? u.app_metadata.plan : null;
      if (plan && planCounts.hasOwnProperty(plan)) planCounts[plan]++;
      else planCounts.sin_plan++;

      const age = daysAgo(u.created_at);
      if (age <= 7) newLast7++;
      if (age <= 30) newLast30++;
      if (daysAgo(u.last_sign_in_at) <= 30) activos30++;
      if (age > TRIAL_DAYS) {
        elegiblesPrueba++;
        if (plan) conPlanTrasPrueba++;
      }

      return {
        id: u.id,
        email: u.email || null,
        phone: u.phone || null,
        name: (u.user_metadata && u.user_metadata.full_name) || null,
        plan: plan,
        is_admin: !!(u.app_metadata && u.app_metadata.is_admin),
        created_at: u.created_at || null,
        last_sign_in_at: u.last_sign_in_at || null,
      };
    });

    clients.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    // Distribución de puntaje detectado por el analizador (mismos 5 rangos
    // que credito.html) — te dice qué tan sano llega el crédito de la gente
    // que usa el sitio, así sabes si el contenido debe enfocarse más en
    // reparación o en mantenimiento/optimización.
    const scoreDist = { malo: 0, regular: 0, bueno: 0, muy_bueno: 0, excepcional: 0, sin_dato: 0 };
    analyses.forEach((a) => {
      const tier = scoreTier(a.puntaje);
      if (tier) scoreDist[tier]++;
      else scoreDist.sin_dato++;
    });

    // Distribución del precio de casa que la gente cotiza en la calculadora
    // — te dice en qué rango de precio enfocar contenido y ejemplos.
    const priceDist = { menos_200k: 0, "200k_350k": 0, "350k_500k": 0, mas_500k: 0, sin_dato: 0 };
    mortgages.forEach((m) => {
      const tier = priceTier(m.precio);
      if (tier) priceDist[tier]++;
      else priceDist.sin_dato++;
    });

    return jsonResponse(200, {
      stats: {
        total_clientes: clients.length,
        nuevos_7_dias: newLast7,
        nuevos_30_dias: newLast30,
        planes: planCounts,
        total_analisis_credito: analyses.length,
        total_calculos_hipoteca: mortgages.length,

        // --- Estadísticas nuevas ---
        tendencia_registros: weeklySignups(users, 8),
        actividad: {
          activos_30_dias: activos30,
          inactivos: Math.max(clients.length - activos30, 0),
        },
        conversion_prueba: {
          elegibles: elegiblesPrueba,
          con_plan: conPlanTrasPrueba,
          pct: elegiblesPrueba ? Math.round((conPlanTrasPrueba / elegiblesPrueba) * 100) : null,
        },
        distribucion_puntaje: scoreDist,
        utilizacion_promedio: average(analyses.map((a) => a.utilizacion)),
        hipoteca: {
          precio_promedio: average(mortgages.map((m) => m.precio)),
          pago_promedio: average(mortgages.map((m) => m.pago_mensual)),
          tasa_promedio: average(mortgages.map((m) => m.tasa)),
          distribucion_precio: priceDist,
        },
      },
      clients,
    });
  } catch (err) {
    console.error("[admin-data] error inesperado:", err);
    return jsonResponse(500, { error: "Ocurrió un error leyendo los datos. Intenta de nuevo." });
  }
};
