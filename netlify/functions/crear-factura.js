/* =========================================================
   Themora — crear una factura de Stripe (borrador)
   ---------------------------------------------------------
   PARA QUÉ SIRVE
   Desde el panel de administración, con el correo del cliente
   y su número de referencia, esto crea en Stripe una factura
   EN BORRADOR. Tú la abres, la revisas y la mandas tú mismo
   desde Stripe.

   POR QUÉ BORRADOR Y NO ENVIADA
   Una factura enviada es un correo que sale a nombre tuyo y
   no se puede "des-enviar". Un borrador te deja mirar el
   importe y el correo antes de que nadie lo reciba. El día
   que te equivoques de tecla, esa pantalla intermedia es la
   diferencia entre un susto y una disculpa.

   POR QUÉ EL IMPORTE NO VIENE DEL NAVEGADOR
   El catálogo de precios vive AQUÍ, en el servidor. El panel
   solo dice QUÉ servicio es, no cuánto cuesta. Así, ni un
   error de tecleo ni un navegador manipulado pueden crear una
   factura de $10,000. Lo único que se puede añadir a mano son
   las tasas oficiales (la cuota del estado), y con tope.

   QUIÉN PUEDE LLAMARLA
   Solo una sesión con is_admin = true, igual que admin-data.js.
   Se verifica el token en cada llamada; el correo del cliente
   se toma del cuerpo, pero quien la crea tiene que ser admin.

   VARIABLES DE ENTORNO EN NETLIFY
     STRIPE_SECRET_KEY    ← empieza por sk_live_ o sk_test_
     SUPABASE_URL         (la misma de auth.js)
     SUPABASE_ANON_KEY    (la misma de auth.js)

   La llave de Stripe la pones TÚ en Netlify. No me la mandes
   a mí ni la escribas en ningún archivo del sitio: quien la
   tenga puede mover dinero de tu cuenta.

   Sin STRIPE_SECRET_KEY, esto responde "noConfigurado" y el
   panel lo dice en pantalla. No se rompe nada.
   ========================================================= */

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

/* Catálogo autoritativo. Debe coincidir con PRECIOS en pago.js.
   Los importes van en CENTAVOS: Stripe no acepta decimales, y
   trabajar en centavos evita los errores de redondeo que aparecen
   cuando 49.99 * 100 da 4998.9999999. */
const SERVICIOS = {
  listar: {
    centavos: 4999,
    descripcion: "Ficha de negocio en Google Maps y Apple Maps — configuración y verificación",
  },
  formar: {
    centavos: 14900,
    descripcion: "Formación de LLC y trámite del EIN — honorarios de Themora",
  },
};

/* Tope para las tasas oficiales que se añaden a mano. Ninguna cuota
   estatal de formación se acerca a esto; el tope está para que un
   error de tecleo no se convierta en una factura absurda. */
const MAX_TASAS_CENTAVOS = 100000; // $1,000

function respuesta(statusCode, body) {
  return { statusCode, headers: HEADERS, body: JSON.stringify(body) };
}

/* Stripe habla formularios, no JSON. */
function formEncode(obj, prefijo) {
  const partes = [];
  for (const clave of Object.keys(obj)) {
    const valor = obj[clave];
    if (valor === undefined || valor === null) continue;
    const nombre = prefijo ? prefijo + "[" + clave + "]" : clave;
    if (typeof valor === "object") {
      partes.push(formEncode(valor, nombre));
    } else {
      partes.push(encodeURIComponent(nombre) + "=" + encodeURIComponent(String(valor)));
    }
  }
  return partes.join("&");
}

async function stripe(ruta, cuerpo, metodo) {
  const res = await fetch("https://api.stripe.com/v1/" + ruta, {
    method: metodo || "POST",
    headers: {
      Authorization: "Bearer " + process.env.STRIPE_SECRET_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: cuerpo ? formEncode(cuerpo) : undefined,
  });
  const datos = await res.json();
  if (!res.ok) {
    const msg = (datos && datos.error && datos.error.message) || "Stripe devolvió un error.";
    const err = new Error(msg);
    err.stripe = true;
    throw err;
  }
  return datos;
}

async function esAdmin(accessToken) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey || !accessToken) return false;
  try {
    const res = await fetch(url.replace(/\/$/, "") + "/auth/v1/user", {
      headers: { Authorization: "Bearer " + accessToken, apikey: anonKey },
    });
    if (!res.ok) return false;
    const u = await res.json();
    return !!(u && u.app_metadata && u.app_metadata.is_admin);
  } catch (err) {
    console.error("[crear-factura] no se pudo verificar la sesión:", err);
    return false;
  }
}

const REFERENCIA_VALIDA = /^TH-\d{6}-[A-Z2-9]{4}$/;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return respuesta(405, { error: "Método no permitido." });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return respuesta(503, {
      noConfigurado: true,
      error: "El cobro con tarjeta todavía no está configurado en este sitio.",
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return respuesta(400, { error: "Solicitud inválida." });
  }

  if (!(await esAdmin(String(payload.accessToken || "")))) {
    return respuesta(403, { error: "Solo el administrador puede crear facturas." });
  }

  /* ---- Validación de lo que viene del panel ---- */
  const correo = String(payload.correo || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
    return respuesta(400, { error: "El correo del cliente no parece válido." });
  }

  const servicio = SERVICIOS[String(payload.servicio || "")];
  if (!servicio) {
    return respuesta(400, { error: "Servicio desconocido." });
  }

  const referencia = String(payload.referencia || "").trim().toUpperCase();
  if (referencia && !REFERENCIA_VALIDA.test(referencia)) {
    return respuesta(400, { error: "La referencia no tiene el formato TH-AAMMDD-XXXX." });
  }

  const tasas = Math.round(Number(payload.tasasCentavos || 0));
  if (!Number.isFinite(tasas) || tasas < 0 || tasas > MAX_TASAS_CENTAVOS) {
    return respuesta(400, { error: "Las tasas oficiales están fuera del rango permitido." });
  }
  const tasasConcepto = String(payload.tasasConcepto || "").trim().slice(0, 120);
  if (tasas > 0 && !tasasConcepto) {
    return respuesta(400, { error: "Di de qué son las tasas (por ejemplo, 'Cuota de formación de Virginia')." });
  }

  const nombre = String(payload.nombre || "").trim().slice(0, 120);
  const dias = [7, 14, 30].indexOf(Number(payload.diasParaPagar)) !== -1
    ? Number(payload.diasParaPagar) : 7;

  try {
    /* 1. El cliente. Si ya existe con ese correo, se reutiliza: crear un
          cliente nuevo cada vez llena Stripe de duplicados y rompe el
          historial de quien vuelve a contratar. */
    const encontrados = await stripe(
      "customers?limit=1&email=" + encodeURIComponent(correo), null, "GET"
    );
    let cliente = encontrados.data && encontrados.data[0];
    if (!cliente) {
      cliente = await stripe("customers", {
        email: correo,
        name: nombre || undefined,
        metadata: { origen: "themora", referencia: referencia || "" },
      });
    }

    /* 2. La factura, en borrador. collection_method 'send_invoice' es la que
          manda un enlace de pago por correo en vez de cobrar una tarjeta
          guardada — que es justo lo que queremos: el cliente elige su tarjeta,
          nosotros nunca vemos el número. */
    const factura = await stripe("invoices", {
      customer: cliente.id,
      collection_method: "send_invoice",
      days_until_due: dias,
      auto_advance: false,
      currency: "usd",
      description: referencia
        ? "Referencia " + referencia + ". El precio acordado por escrito es el que manda."
        : "El precio acordado por escrito es el que manda.",
      footer:
        "Si algo no coincide con lo que acordamos, escríbenos antes de pagar. " +
        "Las etapas de entrega y la fórmula de reembolso están en mithemora.com/terminos#etapas",
      metadata: { referencia: referencia || "", servicio: String(payload.servicio) },
    });

    /* 3. Las líneas. El trabajo y las tasas oficiales van SEPARADAS, siempre.
          Meterlas en una sola línea es lo que hace que un cliente crea que
          los $249 son todos nuestros. */
    await stripe("invoiceitems", {
      customer: cliente.id,
      invoice: factura.id,
      amount: servicio.centavos,
      currency: "usd",
      description: servicio.descripcion,
    });

    if (tasas > 0) {
      await stripe("invoiceitems", {
        customer: cliente.id,
        invoice: factura.id,
        amount: tasas,
        currency: "usd",
        description: tasasConcepto + " (tasa oficial — la cobra el gobierno, no Themora)",
      });
    }

    /* 4. Volver a leerla para devolver el total ya calculado. */
    const final = await stripe("invoices/" + factura.id, null, "GET");

    console.log("[crear-factura] borrador creado", factura.id);

    return respuesta(200, {
      ok: true,
      id: final.id,
      totalCentavos: final.amount_due,
      panel: "https://dashboard.stripe.com/invoices/" + final.id,
      aviso: "Está EN BORRADOR. Revísala en Stripe y mándala tú desde ahí.",
    });
  } catch (err) {
    console.error("[crear-factura] error:", err.message);
    return respuesta(err.stripe ? 502 : 500, {
      error: err.stripe
        ? "Stripe no aceptó la factura: " + err.message
        : "Ocurrió un error inesperado al crear la factura.",
    });
  }
};
