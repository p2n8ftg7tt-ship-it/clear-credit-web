/* =========================================================
   Mr. Credit Coach — respuesta con IA real (Claude, de Anthropic)
   Netlify Function. Solo responde a usuarios con sesión activa
   de Supabase (se verifica el token en cada llamada).

   Variables de entorno requeridas en Netlify:
   - ANTHROPIC_API_KEY   (console.anthropic.com)
   - SUPABASE_URL        (igual que en auth.js)
   - SUPABASE_ANON_KEY   (igual que en auth.js)

   Ver INSTRUCCIONES-IA.md para el paso a paso completo.
   ========================================================= */

const MODEL = "claude-3-5-haiku-20241022";
const MAX_QUESTION_LENGTH = 500;
const MAX_HISTORY_TURNS = 6;

const SYSTEM_PROMPT = `Eres "Mr. Credit Coach", el asistente educativo del sitio Themora.
Respondes SIEMPRE en español claro y sencillo, con un tono cálido y profesional.

Tu único territorio es: crédito personal, reportes e historial de crédito, puntajes FICO/VantageScore,
compra de casa (hipotecas, FHA/VA/USDA/convencional), compra de auto y financiamiento, y la calculadora
hipotecaria del sitio. Puedes explicar conceptos, dar pasos generales y orientación educativa.

Reglas estrictas:
- NUNCA des asesoría legal, financiera o de inversión personalizada ("deberías invertir en...",
  "deberías demandar...", cifras garantizadas de aprobación, etc.). En su lugar, explica el concepto
  general y sugiere consultar a un profesional autorizado (asesor de crédito certificado, abogado,
  oficial de préstamos) para decisiones específicas.
- NUNCA pidas ni proceses números de cuenta, número de seguro social, contraseñas u otra información
  sensible. Si el usuario los comparte, dile que no es necesario compartir esos datos y continúa sin
  ellos.
- Si la pregunta no tiene relación con crédito, vivienda, auto o finanzas personales básicas, redirige
  amablemente el tema hacia lo que sí puedes ayudar.
- Sé breve: 2 a 5 oraciones por respuesta, salvo que el usuario pida más detalle.
- Aclara siempre que es orientación educativa y no sustituye asesoría profesional cuando la pregunta
  sea sobre una decisión importante (comprar una casa, disputar una deuda grande, declarar bancarrota).`;

function corsHeaders() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
}

function jsonResponse(statusCode, body) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

async function verifySupabaseUser(accessToken) {
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
    console.error("[coach] error verificando sesión de Supabase:", err);
    return null;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Método no permitido." });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonResponse(503, {
      error: "El asistente con IA todavía no está configurado en este sitio.",
      notConfigured: true,
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return jsonResponse(400, { error: "Solicitud inválida." });
  }

  const question = String(payload.question || "").trim();
  const accessToken = String(payload.accessToken || "");
  const history = Array.isArray(payload.history) ? payload.history : [];

  if (!question) return jsonResponse(400, { error: "Escribe una pregunta." });
  if (question.length > MAX_QUESTION_LENGTH) {
    return jsonResponse(400, { error: "Tu pregunta es demasiado larga. Intenta resumirla." });
  }

  const user = await verifySupabaseUser(accessToken);
  if (!user) {
    return jsonResponse(401, {
      error: "Inicia sesión para usar el asistente con IA.",
      requiresLogin: true,
    });
  }

  const trimmedHistory = history.slice(-MAX_HISTORY_TURNS).map((turn) => ({
    role: turn.role === "assistant" ? "assistant" : "user",
    content: String(turn.content || "").slice(0, MAX_QUESTION_LENGTH),
  }));

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [...trimmedHistory, { role: "user", content: question }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("[coach] error de Anthropic:", anthropicRes.status, errText);
      return jsonResponse(502, { error: "El asistente con IA no está disponible en este momento." });
    }

    const data = await anthropicRes.json();
    const answer = (data.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!answer) return jsonResponse(502, { error: "No se pudo generar una respuesta. Intenta de nuevo." });

    return jsonResponse(200, { answer });
  } catch (err) {
    console.error("[coach] error inesperado:", err);
    return jsonResponse(500, { error: "Ocurrió un error inesperado. Intenta de nuevo." });
  }
};
