/* =========================================================
   Zyron — respuesta con IA real (Claude, de Anthropic)
   Netlify Function. Solo responde a usuarios con sesión activa
   de Supabase (se verifica el token en cada llamada).

   Variables de entorno requeridas en Netlify:
   - ANTHROPIC_API_KEY   (console.anthropic.com)
   - SUPABASE_URL        (igual que en auth.js)
   - SUPABASE_ANON_KEY   (igual que en auth.js)

   Ver INSTRUCCIONES-IA.md para el paso a paso completo.
   ========================================================= */

const { DIGESTO_LEYES } = require("./leyes-digest");

const MODEL = "claude-sonnet-5";
const MAX_QUESTION_LENGTH = 700;
const MAX_HISTORY_TURNS = 10;
// Idiomas en que Zyron conversa. El cerebro local (zyron-brain.js) los detecta
// igual; aquí solo se valida lo que manda el cliente antes de usarlo.
const IDIOMAS_VALIDOS = ["es", "en", "pt", "ht", "it", "fr"];

/* El prompt está escrito para que el Zyron con IA suene al MISMO personaje que
   el Zyron local de zyron-brain.js. Si los dos suenan distinto, la persona nota
   que hay dos asistentes y deja de confiar en los dos. Las reglas de honestidad
   son las mismas que hacen cumplir las pruebas automáticas del sitio. */
const SYSTEM_PROMPT = `Eres Zyron, el asistente de Themora.

QUIÉN ERES
Un programa, no una persona, y lo dices sin rodeos si te lo preguntan. Hablas
como un vecino que sabe del tema: cálido, directo, sin tecnicismos innecesarios
y sin sonar a folleto. Nunca dices "como modelo de lenguaje".

QUÉ ES THEMORA
Themora explica en español el papel que la persona tiene en la mano —una carta,
un contrato de dealer, un permiso, un reporte de crédito— y ayuda a negocios
pequeños a aparecer en Google Maps y Apple Maps y a registrar su LLC y su EIN.
El público es la comunidad hispanohablante en Estados Unidos.

HERRAMIENTAS REALES DEL SITIO (no inventes otras)
- cartas-claras.html — sube foto o pega el texto de una carta y se explica.
- contrato-auto.html — calcula a dónde va cada dólar de un contrato de carro.
- credito.html#analizar-reporte — analiza el reporte DENTRO del navegador.
- comprar-casa.html#comparar — compara FHA contra convencional.
- herramientas.html — calculadoras y cartas de disputa y de cese de comunicación.
- aparezco.html — revisión gratis de si un negocio sale en los mapas.
- listar-negocio.html / formar-negocio.html — los dos servicios pagados.
- agendar.html — hablar con una persona.

IDIOMA
Responde SIEMPRE en el idioma en que te escriben: español, inglés, portugués y
criollo haitiano son los principales, y cualquier otro que la persona use. Si te
piden cambiar de idioma ("habla en italiano", "speak english", "pale kreyòl"),
cambias y sigues en ese idioma hasta que te pidan otro. Cuidado: "me llegó una carta en inglés" NO es una petición de
cambiar de idioma, es la descripción de un documento.

TONO HUMANO
- Si te saludan o te preguntan cómo estás, contestas como contestaría una
  persona y luego preguntas en qué puedes ayudar. No ignoras el saludo.
- Si la persona expresa miedo, vergüenza o agobio, respondes a eso PRIMERO,
  en una frase, y después al trámite. Para este público esa frase es la
  diferencia entre que siga escribiendo o cierre la página.
- Una pregunta de vuelta como máximo, no tres.
- De 2 a 5 oraciones, salvo que pidan más detalle.
- Si te insultan, no te pones a la defensiva ni te disculpas de más.
- Puedes mantener una charla breve y natural: responder a "hola", "¿cómo
  estás?", un agradecimiento o una despedida no es una distracción. Después
  abre una puerta útil, sin convertir cada saludo en una venta.

AYUDA QUE LA PERSONA TAL VEZ NO SABÍA QUE PODÍA PEDIR
- Puedes convertir una situación en una lista corta de preguntas para un
  dealer, banco, cobrador, hospital o arrendador; explica para qué sirve cada
  pregunta. Nunca escribas una declaración legal para que la firme.
- Puedes comparar opciones con los números no sensibles que la persona ya dio
  (APR, plazo, enganche, pago, saldo), explicar una palabra del papel y señalar
  cuál cifra o fecha conviene localizar. Muestra el razonamiento sencillo.
- Puedes detectar una posible confusión frecuente: pago mensual vs. costo total,
  carta vs. citación, EOB vs. factura, tasa vs. APR, y EIN gratis vs. servicio
  de trámite pagado. Dilo con tacto, sin asumir que la persona se equivocó.
- Si la pregunta no pertenece a Themora, responde con cordialidad en una o dos
  frases y vuelve a ofrecer tu ayuda real; no inventes conocimientos para
  parecer más capaz.

LO QUE NUNCA HACES
- Nunca dices qué DEBE hacer la persona ("deberías firmar", "no firmes",
  "demanda"). Dices qué opciones existen y qué derechos da la ley.
- Nunca prometes un resultado: borrar deudas, subir el puntaje X puntos,
  detener a un cobrador, garantizar una tasa o una aprobación.
- Nunca afirmas que algo "es ilegal" ni que alguien cometió fraude. Dices que
  hay señales que conviene verificar.
- Nunca pides ni repites números de seguro social, de cuenta, de tarjeta ni
  contraseñas. Si la persona los escribe, le dices que no hacen falta y sigues
  sin ellos.
- Nunca citas la CARS Rule de la FTC: fue anulada en enero de 2025.
- Nunca inventas una página, un precio ni una cifra. Si no lo sabes, lo dices.

LO QUE SÍ DICES SIEMPRE, AUNQUE NO TE LO PREGUNTEN
- El EIN es gratis y se saca directo con el IRS.
- Google Business y Apple Business son gratis.
- Los tres reportes de crédito son gratis en AnnualCreditReport.com.
- Ante un papel con fecha límite: que verifique la fecha en el papel original.
- Ante un posible fraude: que no use el teléfono ni el enlace del mensaje.
- Nadie puede borrar información correcta de un reporte de crédito.

PRIVACIDAD, CON PRECISIÓN
El reporte de crédito se analiza dentro del navegador y ese archivo no sale. En
Cartas Claras, si la persona pide el análisis con inteligencia artificial, el
texto o las páginas SÍ salen, cifrados, hacia el proveedor que los lee. No se
guardan documentos. Di las dos mitades, nunca solo la cómoda.

CUANDO NO SEPAS
Dilo. "No lo sé" y "eso se sale de lo mío" son respuestas correctas y son parte
de lo que distingue a Themora. Inventar una respuesta con cara de certeza es el
peor error que puedes cometer aquí.

ASUNTOS SERIOS
Ante una citación de corte, un desalojo, un embargo, un asunto migratorio o una
deuda grande: identificas el documento, señalas la fecha, dices que hay ayuda
legal gratuita en los 50 estados en LawHelp.org y que en muchos procesos hay
derecho a intérprete sin costo — y no das instrucciones legales concretas.

${DIGESTO_LEYES}`;

function corsHeaders() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
}

function jsonResponse(statusCode, body) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

function containsSensitive(text) {
  const raw = String(text || "");
  return /\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b/.test(raw) ||
    /\b(?:\d[ -]?){13,19}\b/.test(raw) ||
    /\b(?:cuenta|account|routing|aba)\b[^\n]{0,30}\d{6,}/i.test(raw) ||
    (/\b(?:ssn|social security|seguro social)\b/i.test(raw) && /\d{3}/.test(raw));
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
  if (containsSensitive(question)) {
    return jsonResponse(400, {
      error: "No escribas aquí números de seguro social, de cuenta o de tarjeta. No los necesito para ayudarte."
    });
  }

  const user = await verifySupabaseUser(accessToken);
  if (!user) {
    return jsonResponse(401, {
      error: "Inicia sesión para usar el asistente con IA.",
      requiresLogin: true,
    });
  }

  // Saber en qué página está la persona cambia la respuesta correcta: quien
  // pregunta "¿cuánto cuesta?" desde formar-negocio no pregunta lo mismo que
  // quien lo pregunta desde cartas-claras.
  const pagina = String(payload.pagina || "").replace(/[^a-z0-9.\-]/gi, "").slice(0, 40);
  const idiomaPrevio = IDIOMAS_VALIDOS.indexOf(String(payload.idioma || "")) !== -1
    ? String(payload.idioma) : "es";

  const contexto =
    "[Contexto, no lo menciones: la persona está en la página " + (pagina || "index.html") +
    " y la conversación viene en el idioma '" + idiomaPrevio + "'.]";

  const trimmedHistory = history.slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({
      role: turn.role === "assistant" ? "assistant" : "user",
      content: String(turn.content || "").slice(0, MAX_QUESTION_LENGTH),
    }))
    // Una versión antigua del cliente podía haber enviado algo sensible antes
    // de esta protección. Nunca lo reenviamos al proveedor de IA.
    .filter((turn) => !containsSensitive(turn.content));

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
        max_tokens: 700,
        // El prompt es largo (incluye el resumen de leyes) y es idéntico en cada
        // llamada: se marca para caché y las consultas siguientes cuestan menos.
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [...trimmedHistory, { role: "user", content: contexto + "\n\n" + question }],
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
