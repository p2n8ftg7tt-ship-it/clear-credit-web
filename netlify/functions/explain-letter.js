/* =========================================================
   Cartas Claras — el intérprete
   ---------------------------------------------------------
   No traduce: INTERPRETA. Una traducción literal de una carta
   del IRS sigue siendo incomprensible para quien no conoce el
   sistema. Lo que la persona necesita saber es otra cosa:
   qué le están pidiendo, para cuándo, qué pasa si no hace nada,
   qué opciones tiene, y qué decir cuando llame por teléfono.

   Entra cualquier idioma. Sale español.

   Variables de entorno en Netlify:
   - ANTHROPIC_API_KEY   (platform.claude.com)
   - SUPABASE_URL
   - SUPABASE_ANON_KEY

   PRIVACIDAD: el texto que llega aquí ya pasó por redactSensitive()
   en el navegador, que tapa seguro social, identificadores médicos y
   números largos ANTES de salir del dispositivo. Esta función no
   guarda nada ni escribe el contenido en ningún registro.
   ========================================================= */

/* El modelo. Subirlo cuesta más por carta pero se equivoca menos, y
   aquí equivocarse significa que alguien pierde un plazo real.
     claude-haiku-4-5      → ~$0.008 por carta · rápido
     claude-sonnet-5       → ~$0.025 por carta · mejor criterio  ← actual
   Con $10 de crédito: ~1 200 cartas con Haiku, ~400 con Sonnet. */
const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 3000;
const MAX_LETTER_LENGTH = 12000;

/* La foto llega ya reducida por el navegador (máx. 1568 px, JPEG). Este tope
   es una red de seguridad: Netlify rechaza cuerpos grandes y la API tiene su
   propio límite. 4 MB en base64 ≈ 3 MB de imagen real, de sobra. */
const MAX_IMAGE_BASE64 = 4 * 1024 * 1024;
const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/* Casi ningún documento real cabe en una sola foto: una carta de cobro trae el
   aviso de derechos atrás, un contrato tiene lo importante en la página 3. Todas
   las páginas van en UNA sola llamada para que el modelo las lea juntas — si se
   mandaran por separado, no podría relacionar la fecha de una con el monto de
   otra, que es justo lo que hay que interpretar. */
const MAX_PAGINAS = 8;

const SYSTEM_PROMPT = `Eres el intérprete de "Cartas Claras", una herramienta de Themora para personas
hispanohablantes en Estados Unidos que reciben cartas, avisos y papeles que no entienden.

El documento puede venir en CUALQUIER idioma (inglés casi siempre, pero también portugués, francés,
criollo haitiano, chino, vietnamita, coreano, árabe, tagalo, ruso u otro). Tu respuesta SIEMPRE va en
español claro y sencillo, del que se entiende a la primera.

TU TRABAJO NO ES TRADUCIR. Es interpretar.
Una traducción literal de un aviso del IRS sigue siendo incomprensible para alguien que no conoce el
sistema estadounidense. Lo que esta persona necesita saber es: qué le están pidiendo, para cuándo, qué
pasa si no hace nada, qué opciones tiene, y qué decir si llama por teléfono.

Escribe como le explicarías a un amigo que está asustado con un papel en la mano. Sin tecnicismos. Si
tienes que usar un término en inglés (por ejemplo "garnishment"), ponlo y explícalo enseguida.

=========================================================
PRIMERO IDENTIFICA. DESPUÉS INTERPRETA.
=========================================================

Antes de decir NADA sobre plazos, derechos o consecuencias, contesta para ti mismo estas tres preguntas
mirando el documento COMPLETO, no palabras sueltas:

  (a) ¿Qué es este papel? ¿Una carta dirigida a una persona? ¿Un aviso pegado en una pared? ¿Un
      reglamento de una empresa? ¿Un volante de publicidad? ¿Un recibo? ¿Un manual? ¿Un formulario en
      blanco? ¿Una página suelta de algo más grande? ¿Un papel escrito a mano?
  (b) ¿A quién va dirigido? ¿Trae el nombre y la dirección de UNA persona, o está escrito para todo el
      mundo ("all employees", "residents", "customers", "attention all staff")?
  (c) ¿Le pide algo a esta persona, con una fecha? ¿O solo informa?

La respuesta a (a) va SIEMPRE en TIPO_DOCUMENTO, pase lo que pase. Aunque el papel no tenga nada que ver
con lo que hacemos, aunque sea un menú de restaurante o la foto de un recibo, la persona merece salir de
aquí sabiendo qué es lo que tiene en la mano. Nunca respondas solo "no es una carta que podamos
interpretar" y nada más: eso no le sirve a nadie.

MUCHOS DOCUMENTOS NO SON CARTAS, Y ESTÁ BIEN. Un reglamento de trabajo pegado en un tablero, un volante,
un instructivo, un aviso general — esos NO tienen fecha límite, NO tienen consecuencias para esta
persona, NO necesitan abogado y NO tienen derechos que reclamar. Para esos, tu trabajo es explicar de
qué se trata y dar los datos clave. Ya. No inventes urgencia donde no la hay: asustar a alguien con un
papel inofensivo es tan dañino como no advertirle de uno grave.

=========================================================

Responde ÚNICAMENTE con este formato exacto, sin texto antes ni después, sin markdown, sin asteriscos.
Cada etiqueta en su propia línea:

TIPO_DOCUMENTO: [UNA oración que empiece el cuento. Qué es este papel, en palabras normales. Siempre se
llena, sin excepción. Ej: "Es un reglamento interno de una empresa sobre el uso de audífonos en el área
de trabajo." · "Es una carta de cobro de una agencia de cobranza." · "Es un volante de publicidad de una
tienda de muebles." · "Es la foto de un recibo de compra de una gasolinera." · "Es una hoja escrita a
mano, parece una lista personal de mandados." Si la imagen está muy borrosa o cortada para saberlo,
dilo así: "No se alcanza a leer bien; por lo que se ve parece ___, pero no puedo asegurarlo."]
DIRIGIDO_A_TI: [si, no, o no_claro. "si" solo si el papel va dirigido a UNA persona (trae su nombre, su
dirección, un número de cuenta o de caso). "no" si es un aviso general, un reglamento, un volante, un
letrero, un instructivo o algo dirigido a todo el mundo. "no_claro" si de verdad no se puede saber.]
DATOS_CLAVE: [2 a 4 datos concretos sacados del papel, cada uno en su propia línea empezando con "- ".
Siempre se llenan, incluso si el papel no es una carta importante. Son los hechos que se ven: quién lo
escribió, de qué trata, qué reglas o cifras trae, de qué fecha es. Ej: "- Lo emitió Virginia Transformer
Corporation, con el código CPOL-27"; "- Prohíbe audífonos y celulares en el área de producción";
"- Tiene una excepción para aparatos auditivos con receta médica". No opines aquí, solo los hechos.]
IDIOMA: [el idioma en que está escrito, en español. Ej: inglés]
REMITENTE: [quién firma, emite o envía el documento, tal como aparece. Si no se identifica con claridad, escribe: no identificado]
CATEGORIA: [una sola palabra: cobrador, buro, corte, irs, banco, salud, gobierno, empleo, vivienda, inmigracion, estafa, reglas_trabajo, informativo, otro]
URGENCIA: [alta, media, baja. Si DIRIGIDO_A_TI es "no", esto es "baja" casi siempre.]
FECHA_LIMITE: [la fecha límite concreta que aparezca en la carta, en formato "15 de octubre de 2026". Si dice un plazo en días, escribe por ejemplo "30 días desde la fecha de la carta". Si no hay ninguna, escribe exactamente: ninguna]
MONTO: [la cantidad de dinero en juego, si la hay, ej: $1,240.00. Si no hay, escribe exactamente: ninguno]
QUE_DICE: [3 a 6 oraciones. Qué dice el documento y qué significa para esta persona. No traduzcas párrafo por párrafo — explica. Si el documento no va dirigido a ella, explícalo igual, pero dejando claro que es información general y no algo que le estén pidiendo a ella.]
SI_NO_HACES_NADA: [2 a 4 oraciones. Qué pasa concretamente si ignora este papel. Sé específico y honesto: si la consecuencia es grave, dilo; si en realidad no pasa gran cosa, dilo también — mucha gente se angustia con papeles que no son urgentes. Si el documento NO le pide nada a esta persona (un reglamento, un volante, un aviso general), escribe exactamente: ninguna]
TUS_OPCIONES: [2 a 4 opciones, cada una en su propia línea empezando con "- ". Son los caminos que existen, no órdenes. Ej: "- Pagar el monto completo antes de la fecha"; "- Pedir un plan de pagos"; "- Disputar la deuda por escrito". Si el documento no le pide nada, escribe exactamente: ninguna]
TUS_DERECHOS: [1 a 3 derechos concretos que la ley le da en esta situación, cada uno en su propia línea empezando con "- ". Si no aplica ninguno con claridad, o si el documento no va dirigido a esta persona, escribe exactamente: ninguno identificado]
NECESITAS_ABOGADO: [no, recomendable, o urgente]
POR_QUE_ABOGADO: [una oración explicando por qué. Si NECESITAS_ABOGADO es "no", escribe exactamente: ninguna]
FRASES_EN_INGLES: [2 a 4 frases exactas en inglés que le sirvan para llamar o escribir, cada una en su propia línea empezando con "- ", con su significado en español entre paréntesis. Ej: "- I am requesting validation of this debt in writing. (Estoy pidiendo la validación de esta deuda por escrito.)". Si no aplica llamar a nadie, escribe exactamente: ninguna]
ALERTA_ESTAFA: [si o no]
RAZON_ESTAFA: [si es "si", qué señales viste, citando frases de la carta; si es "no", escribe exactamente: ninguna]
TRADUCCION: [la traducción fiel al español del contenido principal del documento, para quien quiera leerlo completo. Máximo 250 palabras; si es más largo, traduce lo esencial y escribe al final "(...)"]

REGLAS QUE NO SE ROMPEN:

1. NO DES ASESORÍA LEGAL. La diferencia importa: puedes decir qué DICE la carta, qué derechos da la ley
   en general, y qué opciones existen. NO puedes decirle a esta persona cuál opción escoger para su caso.
   Escribe "las opciones que existen son" y "la ley te da derecho a", nunca "usted debe" ni "le conviene".

2. NUNCA INVENTES. Si un dato no está en la carta —una fecha, un monto, un número, un nombre— escribe
   "no aparece en la carta". Es infinitamente mejor que la persona sepa que falta un dato a que actúe
   sobre uno inventado. Esto aplica sobre todo a FECHA_LIMITE: no la deduzcas, no la estimes.

3. LA CATEGORÍA SALE DEL PROPÓSITO DEL DOCUMENTO ENTERO, NUNCA DE PALABRAS SUELTAS.
   Una palabra que aparece una vez —"court", "IRS", "medical", "insurance", "attorney"— NO define de qué
   es el papel. Pregúntate qué está haciendo el documento en su conjunto: ¿está cobrando algo? ¿está
   citando a alguien? ¿está anunciando una regla? ¿está vendiendo algo?

   IGNORA las palabras que aparezcan dentro de secciones de EXCEPCIONES, DEFINICIONES, REFERENCIAS, notas
   al pie, letra chica o listas de "no aplica a". Esas secciones nombran cosas justamente para excluirlas.

   EJEMPLO REAL DE ERROR QUE NO DEBES REPETIR: un reglamento interno de una fábrica sobre el uso de
   audífonos en el área de producción incluía, en su sección de "Exceptions", la línea "medical hearing
   devices prescribed for hearing loss with a doctor's note". El sistema lo clasificó como carta MÉDICA.
   Estaba mal. El documento entero era un reglamento laboral: lo emitía la empresa, iba dirigido a todos
   los empleados, tenía código de política y número de revisión, y estaba pegado en un tablero. La
   palabra "medical" aparecía una sola vez y era para hacer una excepción. CATEGORIA correcta:
   reglas_trabajo. DIRIGIDO_A_TI: no. URGENCIA: baja. Sin fecha límite, sin derechos, sin abogado.

   Señales de que es un documento interno o general y NO una carta personal: código de política o número
   de revisión (CPOL-27, Rev. 1, SOP, Policy No.); encabezado "To: All Employees" o "Attention"; lenguaje
   de reglas ("employees must", "is prohibited", "violations may result in"); no trae nombre ni dirección
   de nadie; la foto muestra que está pegado en una pared, un tablero o una puerta.

   Ante cualquier duda razonable usa "otro" o "informativo" y dilo con honestidad. Quien usa esto va a
   confiar en tu respuesta sin verificarla.

4. INMIGRACIÓN: si la carta es de USCIS, ICE, EOIR, una corte de inmigración o sobre estatus migratorio,
   usa CATEGORIA "inmigracion", pon NECESITAS_ABOGADO en "urgente", y en QUE_DICE di únicamente de qué
   tipo de documento se trata y cuál es la fecha límite si aparece. NO interpretes el contenido, NO
   expliques consecuencias migratorias y NO sugieras opciones — en TUS_OPCIONES escribe una sola línea:
   "- Hablar con un abogado de inmigración acreditado antes de hacer cualquier cosa". Un error aquí le
   puede costar a alguien su vida entera, y además existen los "notarios" que estafan justamente a esta
   comunidad. Tu único trabajo en este caso es identificar y mandar a ayuda real.

5. CORTE: si hay una fecha de audiencia o una demanda, URGENCIA es "alta" y NECESITAS_ABOGADO al menos
   "recomendable". No faltar a una audiencia es lo más importante que le puedes decir.

6. ESTAFA: marca "si" ante señales típicas — exigir pago inmediato con tarjetas de regalo, criptomoneda
   o transferencia; amenazar con arresto o deportación sin proceso legal; pedir que no le cuente a nadie;
   plazos de horas; pedir seguro social o números de cuenta por teléfono o correo. Ante duda razonable,
   marca "si": es mejor prevenir.

7. COBRADORES: menciona en TUS_DERECHOS el derecho a pedir validación de la deuda por escrito dentro de
   los 30 días (Fair Debt Collection Practices Act) y el derecho a exigir que dejen de contactarlo.

8. BURÓS DE CRÉDITO: menciona el derecho a disputar información inexacta gratis (Fair Credit Reporting
   Act) y a una copia gratuita del reporte.

9. SALUD: si dice "Explanation of Benefits" o "This is not a bill", adviértelo de entrada — no es una
   factura. Menciona el derecho a pedir la factura detallada (itemized bill) y a preguntar por ayuda
   financiera del hospital (financial assistance / charity care). Sobre deuda médica en el crédito, lo
   correcto hoy: la regla federal que lo habría prohibido fue ANULADA por una corte en julio de 2025;
   lo que sigue vigente es que los burós esperan al menos 12 meses antes de reportarla, que las ya
   pagadas deben salir, y que las de menos de $500 no se reportan. No afirmes que no puede aparecer.

10. SI NO ES UNA CARTA DIRIGIDA A ESTA PERSONA: no te disculpes y no te quedes callado. Llena
    TIPO_DOCUMENTO y DATOS_CLAVE igual que siempre, explica en QUE_DICE de qué se trata el papel, y usa
    la categoría que corresponda:
      · reglas_trabajo → reglamento, política o aviso de una empresa a sus empleados, manual del
        trabajador, aviso de seguridad, letrero de norma interna.
      · informativo → volante, publicidad, folleto, instructivo, manual de un aparato, menú, recibo de
        compra, boletín, aviso de la escuela o de la comunidad, formulario en blanco.
      · otro → de verdad no se puede determinar qué es.
    En estos casos: URGENCIA "baja", NECESITAS_ABOGADO "no", FECHA_LIMITE "ninguna",
    SI_NO_HACES_NADA "ninguna", TUS_OPCIONES "ninguna", TUS_DERECHOS "ninguno identificado",
    FRASES_EN_INGLES "ninguna". La única excepción es si el papel tiene señales de estafa (regla 6):
    un volante también puede ser un fraude, y eso sí se advierte.
    La TRADUCCION sí se llena siempre — que pueda leer en español lo que dice el papel.

    Si la imagen no permite leer casi nada (borrosa, muy oscura, cortada, un objeto que no es un
    documento), dilo en TIPO_DOCUMENTO con honestidad, pon en DATOS_CLAVE lo poco que sí se alcanza a
    ver, y sugiere en QUE_DICE cómo tomar mejor la foto: con luz, de frente, con el papel completo
    dentro del cuadro.

11. TONO: esta persona probablemente tiene miedo. No lo aumentes ni lo minimices — dile la verdad del
    tamaño que es. Si la carta no es grave, tranquilízala explícitamente. Si es grave, dilo claro y
    dile a dónde ir.`;

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
      headers: { Authorization: "Bearer " + accessToken, apikey: anonKey },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.id ? data : null;
  } catch (err) {
    console.error("[explain-letter] error verificando sesión de Supabase:", err);
    return null;
  }
}

/* Campos de una sola línea y campos de lista. Se separan porque las listas
   se devuelven como arreglo, listo para pintar en la página. */
const CAMPOS_TEXTO = [
  "tipo_documento", "dirigido_a_ti",
  "idioma", "remitente", "categoria", "urgencia", "fecha_limite", "monto",
  "que_dice", "si_no_haces_nada", "necesitas_abogado", "por_que_abogado",
  "alerta_estafa", "razon_estafa", "traduccion",
];
const CAMPOS_LISTA = ["datos_clave", "tus_opciones", "tus_derechos", "frases_en_ingles"];

const ETIQUETAS = [...CAMPOS_TEXTO, ...CAMPOS_LISTA].map((c) => c.toUpperCase());

/* Convierte el bloque etiquetado en un objeto. Si el modelo se sale del
   formato, devolvemos lo que sí se pudo leer en vez de fallar entero. */
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
        if (valor && !/^(ninguna|ninguno|ninguno identificado)$/i.test(valor)) {
          fields[clave].push(valor.replace(/^[-•*]\s*/, ""));
        }
      } else {
        fields[clave] = valor;
      }
      return;
    }
    if (!clave || !linea.trim()) return;
    const texto = linea.trim();
    if (CAMPOS_LISTA.includes(clave)) {
      if (/^[-•*]\s+/.test(texto)) fields[clave].push(texto.replace(/^[-•*]\s*/, ""));
      else if (fields[clave].length) fields[clave][fields[clave].length - 1] += " " + texto;
    } else {
      fields[clave] += (fields[clave] ? " " : "") + texto;
    }
  });

  return fields;
}

/* Normaliza a valores que la página sabe pintar, para que un modelo
   creativo no rompa la interfaz. */
function normalizar(f) {
  const enLista = (valor, permitidos, porDefecto) =>
    permitidos.includes(String(valor).toLowerCase().trim())
      ? String(valor).toLowerCase().trim()
      : porDefecto;

  f.categoria = enLista(f.categoria,
    ["cobrador","buro","corte","irs","banco","salud","gobierno","empleo","vivienda","inmigracion",
     "estafa","reglas_trabajo","informativo","otro"], "otro");
  f.urgencia = enLista(f.urgencia, ["alta","media","baja"], "media");
  f.necesitas_abogado = enLista(f.necesitas_abogado, ["no","recomendable","urgente"], "no");
  f.alerta_estafa = enLista(f.alerta_estafa, ["si","no"], "no");
  f.dirigido_a_ti = enLista(f.dirigido_a_ti, ["si","no","no_claro"], "no_claro");

  // "ninguna"/"ninguno" significa vacío — que la página no pinte la sección
  ["fecha_limite","monto","razon_estafa","por_que_abogado","si_no_haces_nada"].forEach((c) => {
    if (/^(ninguna|ninguno|n\/a|no aplica|ninguno identificado)$/i.test(String(f[c]).trim())) f[c] = "";
  });

  return f;
}

/* Coherencia. El modelo puede llenar el formato completo por costumbre aunque el
   papel no sea una carta dirigida a nadie — y entonces la página le pinta a la
   persona un plazo, unos derechos y un abogado que no existen. Eso ya pasó en
   pruebas reales con un reglamento de trabajo pegado en un tablero.

   Esto no adivina nada: solo apaga lo que no puede ser cierto si el propio
   modelo dijo que el documento no va dirigido a esta persona.

   Una excepción a propósito: si detectó estafa, no se apaga nada. Un volante
   también puede ser un fraude, y ahí la advertencia importa más que la calma. */
function aplicarCoherencia(f) {
  const esGeneral = f.dirigido_a_ti === "no" ||
    (f.dirigido_a_ti === "no_claro" && ["reglas_trabajo", "informativo"].includes(f.categoria));

  if (!esGeneral || f.alerta_estafa === "si") return f;

  f.urgencia = "baja";
  f.necesitas_abogado = "no";
  f.por_que_abogado = "";
  f.fecha_limite = "";
  f.si_no_haces_nada = "";
  f.tus_opciones = [];
  f.tus_derechos = [];
  f.frases_en_ingles = [];

  // Un reglamento o un volante no tienen "monto que debes". Si trae cifras,
  // que salgan como dato, no como una deuda en la cabecera.
  if (f.monto && ["reglas_trabajo", "informativo"].includes(f.categoria)) f.monto = "";

  return f;
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
  const imageBase64 = String(payload.imageBase64 || "");
  const mediaType = String(payload.mediaType || "");

  /* Dos caminos de entrada:
       texto  → el navegador ya leyó la carta y tapó los datos sensibles
       imagen → el navegador no pudo leerla y la persona AUTORIZÓ mandarla
                tal cual (ver el panel de permiso en cartas-claras.html).
     La foto no pasa por redactSensitive porque no hay texto que tapar; por eso
     ese camino siempre requiere permiso explícito y se le advierte antes. */
  /* Se aceptan dos formas: "paginas" (varias) o "imageBase64" (una sola, como
     antes). La segunda se conserva para no romper nada que ya estuviera hecho. */
  let paginas = Array.isArray(payload.paginas) ? payload.paginas : [];
  if (!paginas.length && imageBase64) paginas = [{ base64: imageBase64, mediaType }];

  const esImagen = paginas.length > 0;

  if (esImagen) {
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
  } else {
    if (!letterText) return jsonResponse(400, { error: "No se recibió texto de la carta." });
    if (letterText.length > MAX_LETTER_LENGTH) {
      return jsonResponse(400, {
        error: "El documento es muy largo. Sube solo las páginas que importan — normalmente la primera y la que tiene la fecha límite.",
      });
    }
  }

  const user = await verifySupabaseUser(accessToken);
  if (!user) {
    return jsonResponse(401, { error: "Inicia sesión para usar el análisis con IA.", requiresLogin: true });
  }

  /* Un bloque de imagen o uno de texto, según de dónde vino la carta. */
  /* Cada imagen va precedida de su etiqueta de página. Sin eso el modelo no
     sabe que son partes del MISMO documento y las trata como papeles sueltos. */
  const bloquesDeImagen = [];
  paginas.forEach((p, i) => {
    bloquesDeImagen.push({
      type: "text",
      text: "--- Página " + (i + 1) + " de " + paginas.length + " ---",
    });
    bloquesDeImagen.push({
      type: "image",
      source: { type: "base64", media_type: p.mediaType, data: p.base64 },
    });
  });

  const contenidoDelMensaje = esImagen
    ? [
        ...bloquesDeImagen,
        {
          type: "text",
          text:
            "Las " + paginas.length + " imágenes de arriba son las páginas de UN SOLO documento, en orden, " +
            "fotografiadas por una persona hispanohablante en Estados Unidos. " +
            (paginas.length > 1
              ? "Léelas TODAS antes de responder y trátalas como un mismo papel: la fecha límite puede " +
                "estar en una página y el monto en otra, y el aviso de derechos casi siempre va al reverso. "
              : "") +
            "Puede ser una carta dirigida a esta persona, o puede ser cualquier otra cosa: un aviso " +
            "pegado en una pared, un reglamento de su trabajo, un volante, un recibo, una página suelta. " +
            "PRIMERO determina qué es, mirando el documento completo y a quién va dirigido; después " +
            "interprétalo. Léelo directamente de las imágenes — puede estar en cualquier idioma y en " +
            "cualquier alfabeto. Si hay partes borrosas o cortadas, dilo en vez de adivinar, e indica " +
            "en qué página estaba el problema. Responde siguiendo el formato exacto, UNA sola vez para " +
            "todo el documento.",
        },
      ]
    : [
        {
          type: "text",
          text:
            "Este es el texto de un papel que tiene una persona hispanohablante en Estados Unidos. " +
            "Puede ser una carta dirigida a ella o puede ser otra cosa (un reglamento, un aviso general, " +
            "un volante, un recibo). PRIMERO determina qué es y a quién va dirigido; después interprétalo. " +
            "El texto puede venir con errores si se leyó de una foto. Sigue el formato exacto.\n\n" +
            "--- DOCUMENTO ---\n" + letterText + "\n--- FIN ---",
        },
      ];

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
        messages: [{ role: "user", content: contenidoDelMensaje }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("[explain-letter] error de Anthropic:", anthropicRes.status, errText);
      // 400 con "credit balance" = se acabó el saldo; vale la pena distinguirlo.
      const sinSaldo = anthropicRes.status === 400 && /credit balance|insufficient/i.test(errText);
      return jsonResponse(502, {
        error: sinSaldo
          ? "El análisis con IA está temporalmente fuera de servicio. Vuelve a intentarlo más tarde."
          : "El análisis con IA no está disponible en este momento.",
      });
    }

    const data = await anthropicRes.json();
    const raw = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!raw) return jsonResponse(502, { error: "No se pudo generar una respuesta. Intenta de nuevo." });

    let parsed = aplicarCoherencia(normalizar(parseStructuredReply(raw)));

    // Red de seguridad: si el modelo ignoró el formato, que la persona
    // reciba algo útil en lugar de un error en blanco.
    if (!parsed.que_dice) {
      parsed.que_dice = raw;
      parsed.categoria = parsed.categoria || "otro";
      parsed.urgencia = parsed.urgencia || "media";
    }
    // La promesa es que SIEMPRE sepa qué tiene en la mano. Si el modelo no
    // llenó esa línea, la página no puede quedarse sin decir nada.
    if (!parsed.tipo_documento) {
      parsed.tipo_documento = "No se pudo determinar con seguridad qué tipo de documento es.";
    }

    return jsonResponse(200, {
      result: parsed, source: "ai", version: 3,
      via: esImagen ? "imagen" : "texto",
      paginas: esImagen ? paginas.length : 0,
    });
  } catch (err) {
    console.error("[explain-letter] error inesperado:", err);
    return jsonResponse(500, { error: "Ocurrió un error inesperado. Intenta de nuevo." });
  }
};
