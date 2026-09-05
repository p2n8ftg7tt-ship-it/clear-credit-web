/* =========================================================
   Cartas Claras — explicación con IA real (Claude, de Anthropic)
   Netlify Function. Solo responde a usuarios con sesión activa
   de Supabase (se verifica el token en cada llamada) — igual
   patrón que netlify/functions/coach.js.

   Variables de entorno requeridas en Netlify (las mismas que
   coach.js — si ya configuraste Mr. Credit Coach, esta función
   ya tiene todo lo que necesita):
   - ANTHROPIC_API_KEY   (console.anthropic.com)
   - SUPABASE_URL        (igual que en auth.js)
   - SUPABASE_ANON_KEY   (igual que en auth.js)

   Ver INSTRUCCIONES-IA.md para el paso a paso completo.

   IMPORTANTE sobre privacidad: el texto que llega aquí ya pasó
   por redactSensitive() en el navegador (cartas-claras.html),
   que enmascara números de seguro social y números de cuenta
   largos ANTES de salir del dispositivo del cliente. Esta función
   nunca guarda el texto recibido — solo lo reenvía a Anthropic
   para obtener una respuesta y la devuelve.
   ========================================================= */

const MODEL = "claude-3-5-haiku-20241022";
const MAX_LETTER_LENGTH = 6000;

const SYSTEM_PROMPT = `Eres el motor de análisis de "Cartas Claras", una herramienta del sitio Themora que
ayuda a personas hispanohablantes en Estados Unidos a entender cartas y avisos financieros que reciben
en inglés (de cobradores de deuda, burós de crédito, bancos, el IRS, cortes, o posibles estafas).

Recibes el texto extraído de una carta (puede venir con errores de OCR si se leyó de una foto) y debes
responder ÚNICAMENTE con este formato exacto, en español claro, sin texto antes ni después, sin markdown:

CATEGORIA: [una sola palabra de esta lista: cobrador, buro, corte, irs, banco, estafa, otro]
URGENCIA: [alta, media, o baja]
EXPLICACION: [2 a 4 oraciones explicando en español sencillo qué dice la carta y qué significa]
ACCION: [1 a 3 oraciones con pasos concretos y específicos que la persona puede tomar]
ALERTA_ESTAFA: [si o no]
RAZON_ESTAFA: [si ALERTA_ESTAFA es "si", explica brevemente qué señales de estafa notaste citando frases de la carta si es posible; si es "no", escribe exactamente: ninguna]

Reglas estrictas:
- CATEGORIA "estafa" y URGENCIA "alta" cuando el texto tenga señales típicas de fraude: exige pago
  inmediato con tarjetas de regalo o transferencia, amenaza arresto sin proceso legal, pide que no le
  digas a nadie, presiona con plazos de horas, o pide número de seguro social/cuenta por teléfono o
  correo sin verificación. Ante la duda razonable, marca ALERTA_ESTAFA como "si" — es mejor prevenir.
- Si es un cobrador de deuda legítimo, menciona en ACCION el derecho a pedir validación de la deuda por
  escrito dentro de 30 días (Fair Debt Collection Practices Act).
- Si es de un buró de crédito, menciona el derecho a disputar información inexacta (Fair Credit
  Reporting Act) cuando aplique.
- Nunca des asesoría legal específica ni garantices resultados. Si la situación es grave (demanda,
  posible fraude de identidad, amenaza de embargo), recomienda además consultar a un abogado o
  reportarlo al CFPB/FTC, según corresponda.
- Si el texto no parece ser una carta o aviso financiero/legal reconocible, usa CATEGORIA "otro" y
  explica honestamente que no pudiste identificar de qué se trata.
- IMPORTANTE sobre precisión: las personas que usan esta herramienta van a confiar plenamente en tu
  respuesta, muchas veces sin verificarla. Por eso, NUNCA elijas una categoría solo porque el texto
  menciona una palabra suelta relacionada (por ejemplo, que aparezca la palabra "banco", "corte" o
  "IRS" una sola vez, de forma incidental o ambigua, sin que el resto del contenido respalde esa
  categoría). Antes de responder, pregúntate: ¿el conjunto del texto realmente describe una carta de
  este tipo (remitente, propósito, lenguaje típico de ese tipo de aviso), o solo aparece una palabra
  aislada? Si tienes cualquier duda razonable sobre la categoría, usa CATEGORIA "otro" en vez de
  adivinar — es mucho mejor decir honestamente que no estamos seguros que darle a alguien información
  incorrecta con aparente autoridad.
- Cartas Claras SOLO cubre estos cinco tipos: cobrador de deuda, buró de crédito, banco, IRS y corte
  (además de la detección de estafas, que aplica a cualquiera de ellos). Si la carta trata sobre un
  tema fuera de este alcance — en particular inmigración, USCIS, estatus migratorio, o un aviso de
  desalojo/landlord — usa CATEGORIA "otro", NO intentes explicar el contenido ni dar pasos a seguir
  sobre ese tema, y en ACCION indica claramente que ese tipo de carta está fuera del alcance de esta
  herramienta y que la persona debe consultar a un profesional especializado en esa área (por ejemplo,
  un abogado de inmigración o una organización de asistencia legal local). Esto es una regla estricta,
  no una sugerencia.
- No inventes números de cuenta, nombres o montos que no estén en el texto recibido.`;

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
    console.error("[explain-letter] error verificando sesión de Supabase:", err);
    return null;
  }
}

// Convierte el bloque de texto con etiquetas (CATEGORIA:, URGENCIA:, etc.) en un objeto.
// Si Claude no sigue el formato exactamente, devolvemos lo que se pudo leer en vez de fallar.
function parseStructuredReply(raw) {
  const fields = { categoria: "", urgencia: "", explicacion: "", accion: "", alerta_estafa: "", razon_estafa: "" };
  const pattern = /^(CATEGORIA|URGENCIA|EXPLICACION|ACCION|ALERTA_ESTAFA|RAZON_ESTAFA):\s*(.*)$/i;
  let currentKey = null;
  raw.split(/\r?\n/).forEach((line) => {
    const match = line.match(pattern);
    if (match) {
      currentKey = match[1].toLowerCase();
      fields[currentKey] = match[2].trim();
    } else if (currentKey && line.trim()) {
      fields[currentKey] += " " + line.trim();
    }
  });
  return fields;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Método no permitido." });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonResponse(503, {
      error: "El análisis con IA todavía no está configurado en este sitio.",
      notConfigured: true,
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return jsonResponse(400, { error: "Solicitud inválida." });
  }

  const letterText = String(payload.letterText || "").trim();
  const accessToken = String(payload.accessToken || "");

  if (!letterText) return jsonResponse(400, { error: "No se recibió texto de la carta." });
  if (letterText.length > MAX_LETTER_LENGTH) {
    return jsonResponse(400, { error: "El texto es demasiado largo. Intenta con un documento más corto." });
  }

  const user = await verifySupabaseUser(accessToken);
  if (!user) {
    return jsonResponse(401, {
      error: "Inicia sesión para usar el análisis con IA.",
      requiresLogin: true,
    });
  }

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
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: "Texto de la carta:\n\n" + letterText }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("[explain-letter] error de Anthropic:", anthropicRes.status, errText);
      return jsonResponse(502, { error: "El análisis con IA no está disponible en este momento." });
    }

    const data = await anthropicRes.json();
    const raw = (data.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!raw) return jsonResponse(502, { error: "No se pudo generar una respuesta. Intenta de nuevo." });

    const parsed = parseStructuredReply(raw);
    if (!parsed.explicacion) {
      // Claude no siguió el formato esperado — devolvemos el texto crudo como explicación
      // para que el usuario reciba algo útil en vez de un error.
      parsed.categoria = parsed.categoria || "otro";
      parsed.urgencia = parsed.urgencia || "media";
      parsed.explicacion = raw;
      parsed.accion = parsed.accion || "Revisa el documento original y, si tienes dudas, consulta a un profesional.";
      parsed.alerta_estafa = parsed.alerta_estafa || "no";
      parsed.razon_estafa = parsed.razon_estafa || "ninguna";
    }

    return jsonResponse(200, { result: parsed, source: "ai" });
  } catch (err) {
    console.error("[explain-letter] error inesperado:", err);
    return jsonResponse(500, { error: "Ocurrió un error inesperado. Intenta de nuevo." });
  }
};
