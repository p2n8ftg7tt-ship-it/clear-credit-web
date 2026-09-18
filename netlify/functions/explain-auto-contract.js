/* =========================================================
   Contrato del dealer — el lector
   ---------------------------------------------------------
   DECISIÓN DE DISEÑO, y es la más importante de este archivo:

   Esta función SOLO LEE NÚMEROS. No calcula nada, no opina,
   no dice si el trato es bueno. Devuelve las cifras que están
   impresas en el contrato y ya.

   Toda la aritmética —pagos, intereses, costo real de los
   extras— la hace la página en el teléfono de la persona, con
   una fórmula fija y verificada contra una tabla de
   amortización mes a mes.

   ¿Por qué? Porque un modelo de lenguaje puede equivocarse en
   una multiplicación y aquí una multiplicación mal hecha son
   miles de dólares en una decisión de treinta mil. Leer texto
   de una foto sí es trabajo para el modelo; multiplicar no.

   Además, la persona SIEMPRE revisa y corrige los números
   antes de que se calcule nada. La foto llena el formulario;
   no lo sustituye.

   PRIVACIDAD: la foto se manda solo con permiso explícito y no
   se guarda en ningún lado. Esta función no escribe registros.

   Variables de entorno en Netlify:
   - ANTHROPIC_API_KEY   (platform.claude.com)
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   ========================================================= */

const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 1500;
const MAX_IMAGE_BASE64 = 4 * 1024 * 1024;
const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/* Un contrato de dealer nunca cabe en una foto. El precio está en la primera
   página, el recuadro federal de la tasa en otra, y los productos agregados
   —que es donde está el dinero— casi siempre en una hoja aparte. Todas las
   páginas van en UNA llamada para que se lean juntas. */
const MAX_PAGINAS = 8;

const SYSTEM_PROMPT = `Eres un lector de contratos de compra de autos en Estados Unidos. Trabajas para
"Themora", una herramienta en español para personas hispanohablantes.

TU ÚNICO TRABAJO ES LEER NÚMEROS DE LA FOTO. No calcules nada. No opines sobre si el trato es bueno o
malo. No des consejos. No sumes, no restes, no multipliques: solo copia lo que está impreso.

El contrato puede llamarse "Retail Installment Sale Contract", "Buyer's Order", "Purchase Agreement" o
parecido, y puede estar en inglés o en español.

REGLA QUE NO SE ROMPE: si un dato no se ve, no se lee bien, o no estás seguro, escribe exactamente
"no aparece". NUNCA inventes ni estimes una cifra. Un número inventado aquí le puede costar miles de
dólares a una familia. Es infinitamente mejor dejar el campo vacío para que la persona lo escriba
mirando su papel.

Responde ÚNICAMENTE con este formato exacto, sin texto antes ni después, sin markdown, sin asteriscos.
Los montos van solo con dígitos y punto decimal, sin signo de dólar y sin comas: 24000.00

ES_CONTRATO_AUTO: [si o no. "no" si la foto no es un contrato de compra de auto]
QUE_ES: [una oración diciendo qué documento es. Se llena siempre, aunque no sea un contrato de auto]
PRECIO_VEHICULO: [Cash Price of Vehicle / Selling Price / Precio del vehículo]
ENGANCHE: [Cash Down Payment / Enganche en efectivo. Solo el efectivo, sin contar el carro entregado]
TRADE_NETO: [Net Trade-In. Si el comprador debe más de lo que vale su carro (negative equity), ponlo
NEGATIVO. Ej: -1800.00]
DOC_FEE: [Documentary Fee / Processing Fee / Dealer Fee]
IMPUESTOS: [la suma de Sales Tax + Title + License + Registration, si vienen separados súmalos SOLO si
son claramente esos renglones; si no puedes, escribe "no aparece"]
TASA: [ANNUAL PERCENTAGE RATE, solo el número. Ej: 12.9]
PLAZO: [Number of Payments, en meses. Solo el número entero]
PAGO_MENSUAL: [Amount of Each Payment / Monthly Payment]
MONTO_FINANCIADO: [Amount Financed, tal como lo imprime el contrato]
EXTRAS: [cada producto agregado que NO sea el vehículo, los impuestos, las placas ni el cargo del
dealer, uno por línea empezando con "- ", en formato "- Nombre | monto". Usa el nombre en español
cuando lo reconozcas, con el término en inglés entre paréntesis. Ejemplos:
"- Garantía extendida (Service Contract) | 2795.00"
"- GAP | 895.00"
"- Protección de pintura (Paint Protection) | 1195.00"
"- Grabado de vidrios (VIN Etching) | 299.00"
Si no hay ninguno, escribe exactamente: ninguno]
NO_PUDE_LEER: [lista de los campos que quedaron en "no aparece" y por qué (borroso, cortado, no está en
esta página). Si leíste todo, escribe exactamente: ninguno]`;

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}

async function verifySupabaseUser(accessToken) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey || !accessToken) return null;
  try {
    const res = await fetch(url.replace(/\/$/, "") + "/auth/v1/user", {
      headers: { Authorization: "Bearer " + accessToken, apikey: anonKey },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.id ? data : null;
  } catch (err) {
    console.error("[explain-auto-contract] error verificando sesión:", err);
    return null;
  }
}

const CAMPOS_TEXTO = [
  "es_contrato_auto", "que_es", "precio_vehiculo", "enganche", "trade_neto",
  "doc_fee", "impuestos", "tasa", "plazo", "pago_mensual", "monto_financiado",
  "no_pude_leer",
];
const CAMPOS_LISTA = ["extras"];
const ETIQUETAS = [...CAMPOS_TEXTO, ...CAMPOS_LISTA].map((c) => c.toUpperCase());

function parseStructuredReply(raw) {
  const fields = {};
  CAMPOS_TEXTO.forEach((c) => (fields[c] = ""));
  CAMPOS_LISTA.forEach((c) => (fields[c] = []));

  const pattern = new RegExp("^(" + ETIQUETAS.join("|") + "):\\s*(.*)$", "i");
  let clave = null;

  raw.split(/\r?\n/).forEach((linea) => {
    const m = linea.match(pattern);
    if (m) {
      clave = m[1].toLowerCase();
      const valor = m[2].trim();
      if (CAMPOS_LISTA.includes(clave)) {
        if (valor && !/^(ninguno|ninguna)$/i.test(valor)) fields[clave].push(valor.replace(/^[-•*]\s*/, ""));
      } else {
        fields[clave] = valor;
      }
      return;
    }
    if (!clave || !linea.trim()) return;
    const texto = linea.trim();
    if (CAMPOS_LISTA.includes(clave)) {
      if (/^[-•*]\s+/.test(texto)) fields[clave].push(texto.replace(/^[-•*]\s*/, ""));
    } else {
      fields[clave] += (fields[clave] ? " " : "") + texto;
    }
  });

  return fields;
}

/* Convierte a número o a null. "no aparece", vacío o basura → null, y la
   página deja ese campo en blanco para que la persona lo escriba. */
function aNumero(v) {
  if (v === null || v === undefined) return null;
  const limpio = String(v).replace(/[$,\s]/g, "").replace(/[^0-9.\-]/g, "");
  if (!limpio || limpio === "-" || limpio === ".") return null;
  const n = parseFloat(limpio);
  return isFinite(n) ? n : null;
}

/* Topes de cordura. No son opiniones: son rangos fuera de los cuales el dato
   casi seguro se leyó mal, y preferimos un campo vacío a un número absurdo. */
function enRango(n, min, max) {
  return n === null ? null : n >= min && n <= max ? n : null;
}

function normalizar(f) {
  const extras = f.extras
    .map((linea) => {
      const partes = String(linea).split("|");
      const nombre = (partes[0] || "").trim();
      const monto = aNumero(partes[1]);
      return nombre && monto !== null && monto > 0 && monto < 100000 ? { nombre, monto } : null;
    })
    .filter(Boolean)
    .slice(0, 12);

  return {
    es_contrato_auto: /^si$/i.test(String(f.es_contrato_auto).trim()) ? "si" : "no",
    que_es: f.que_es || "No se pudo determinar qué documento es.",
    precio_vehiculo: enRango(aNumero(f.precio_vehiculo), 500, 500000),
    enganche: enRango(aNumero(f.enganche), 0, 500000),
    trade_neto: enRango(aNumero(f.trade_neto), -200000, 200000),
    doc_fee: enRango(aNumero(f.doc_fee), 0, 5000),
    impuestos: enRango(aNumero(f.impuestos), 0, 50000),
    tasa: enRango(aNumero(f.tasa), 0, 40),
    plazo: enRango(aNumero(f.plazo), 6, 120),
    pago_mensual: enRango(aNumero(f.pago_mensual), 0, 20000),
    monto_financiado: enRango(aNumero(f.monto_financiado), 0, 500000),
    extras,
    no_pude_leer: /^(ninguno|ninguna)$/i.test(String(f.no_pude_leer).trim()) ? "" : f.no_pude_leer,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Método no permitido." });

  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonResponse(503, {
      error: "La lectura de la foto todavía no está activada en este sitio. Puedes escribir los números a mano — la calculadora funciona igual.",
      notConfigured: true,
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return jsonResponse(400, { error: "Solicitud inválida." });
  }

  const imageBase64 = String(payload.imageBase64 || "");
  const mediaType = String(payload.mediaType || "");
  const accessToken = String(payload.accessToken || "");

  let paginas = Array.isArray(payload.paginas) ? payload.paginas : [];
  if (!paginas.length && imageBase64) paginas = [{ base64: imageBase64, mediaType }];

  if (!paginas.length) return jsonResponse(400, { error: "No se recibió ninguna página del contrato." });
  if (paginas.length > MAX_PAGINAS) {
    return jsonResponse(400, { error: "Son demasiadas páginas de una vez. Sube hasta " + MAX_PAGINAS + "." });
  }
  let pesoTotal = 0;
  for (const p of paginas) {
    const tipo = String((p && p.mediaType) || "");
    const datos = String((p && p.base64) || "");
    if (!TIPOS_IMAGEN.includes(tipo)) {
      return jsonResponse(400, { error: "Ese formato de imagen no se puede leer. Usa fotos JPG o PNG." });
    }
    if (!datos) return jsonResponse(400, { error: "Una de las páginas llegó vacía. Inténtalo de nuevo." });
    pesoTotal += datos.length;
  }
  if (pesoTotal > MAX_IMAGE_BASE64) {
    return jsonResponse(400, { error: "Las fotos pesan demasiado juntas. Sube menos páginas a la vez." });
  }

  const user = await verifySupabaseUser(accessToken);
  if (!user) {
    return jsonResponse(401, { error: "Inicia sesión para leer la foto del contrato.", requiresLogin: true });
  }

  /* Cada imagen con su etiqueta de página: sin eso el modelo no sabe que son
     partes del mismo contrato y las lee como documentos sueltos. */
  const bloquesDeImagen = [];
  paginas.forEach((p, i) => {
    bloquesDeImagen.push({ type: "text", text: "--- Página " + (i + 1) + " de " + paginas.length + " ---" });
    bloquesDeImagen.push({
      type: "image",
      source: { type: "base64", media_type: p.mediaType, data: p.base64 },
    });
  });

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
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              ...bloquesDeImagen,
              {
                type: "text",
                text:
                  "Las " + paginas.length + " imágenes de arriba son las páginas de UN SOLO contrato de " +
                  "compra de auto, en orden, que una persona tiene enfrente en un concesionario a punto de " +
                  "firmar. " +
                  (paginas.length > 1
                    ? "Léelas TODAS antes de responder. En estos contratos el precio suele estar en la " +
                      "primera página, el recuadro federal con la tasa y el plazo en otra, y los productos " +
                      "agregados (garantía, GAP, protección de pintura) en una hoja aparte que muchas veces " +
                      "se firma por separado. Junta todo en UNA sola respuesta. "
                    : "") +
                  "Lee los números tal como están impresos y sigue el formato exacto. Si algo no se ve con " +
                  "claridad, escribe 'no aparece' — no lo adivines. Si un mismo dato aparece distinto en dos " +
                  "páginas, usa el del recuadro federal (Truth in Lending) y dilo en NO_PUDE_LEER.",
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("[explain-auto-contract] error de Anthropic:", anthropicRes.status, errText);
      return jsonResponse(502, {
        error: "No se pudo leer la foto en este momento. Puedes escribir los números a mano — la calculadora funciona igual.",
      });
    }

    const data = await anthropicRes.json();
    const raw = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!raw) {
      return jsonResponse(502, { error: "No se pudo leer la foto. Intenta con mejor luz, o escribe los números a mano." });
    }

    const result = normalizar(parseStructuredReply(raw));
    return jsonResponse(200, { result, source: "ai", version: 1 });
  } catch (err) {
    console.error("[explain-auto-contract] error inesperado:", err);
    return jsonResponse(500, { error: "Ocurrió un error inesperado. Escribe los números a mano mientras tanto." });
  }
};
