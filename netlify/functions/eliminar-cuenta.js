/* =========================================================
   Themora — borrar la cuenta de verdad
   ---------------------------------------------------------
   El botón "Eliminar cuenta" ya borraba los análisis y los
   cálculos, pero el usuario de acceso (correo y contraseña)
   quedaba vivo, y la página remataba mandando a la persona a
   escribir a Contacto. Eso es pedirle a alguien que ruegue por
   algo que es su derecho.

   El problema real es técnico: el navegador NO puede borrar un
   usuario de Supabase. Solo la API de administrador puede, y
   esa API usa la llave de servicio, que jamás puede estar en el
   navegador — lee toda la base de datos sin restricciones.

   Por eso esto vive aquí, en el servidor:
     1. Recibe el token de sesión de la persona.
     2. Le pregunta a Supabase de quién es ese token.
     3. Borra ESE usuario, y solo ese. El id nunca viene del
        cliente: sale de la verificación del token. Así nadie
        puede mandar el id de otra persona y borrarle la cuenta.

   VARIABLES DE ENTORNO EN NETLIFY (Site settings → Environment):
     SUPABASE_URL                (la misma de auth.js)
     SUPABASE_ANON_KEY           (la misma de auth.js)
     SUPABASE_SERVICE_ROLE_KEY   ← esta es la delicada

   La llave de servicio la pones TÚ en Netlify. No me la mandes a
   mí ni se la des a nadie, y no la escribas en ningún archivo del
   sitio: cualquiera que la tenga puede leer y borrar toda tu base
   de datos.

   Mientras la llave no esté puesta, esta función responde
   "noConfigurado" y la página cae sola al camino manual de
   siempre. No se rompe nada.
   ========================================================= */

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function respuesta(statusCode, body) {
  return { statusCode, headers: HEADERS, body: JSON.stringify(body) };
}

/* Devuelve el usuario dueño del token, o null. Nunca confía en un
   id mandado por el cliente. */
async function usuarioDelToken(accessToken) {
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
    console.error("[eliminar-cuenta] no se pudo verificar la sesión:", err);
    return null;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return respuesta(405, { error: "Método no permitido." });
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return respuesta(503, {
      noConfigurado: true,
      error: "El borrado automático de cuenta todavía no está configurado en este sitio.",
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return respuesta(400, { error: "Solicitud inválida." });
  }

  const accessToken = String(payload.accessToken || "");
  const confirmacion = String(payload.confirmacion || "").trim().toUpperCase();

  /* Segunda barrera, además de la del navegador: si alguien llama a
     esta función a mano sin escribir la palabra, no borra nada. */
  if (confirmacion !== "ELIMINAR") {
    return respuesta(400, { error: "Falta la confirmación." });
  }

  const user = await usuarioDelToken(accessToken);
  if (!user) {
    return respuesta(401, { error: "Tu sesión venció. Vuelve a entrar e inténtalo otra vez." });
  }

  try {
    const del = await fetch(
      url.replace(/\/$/, "") + "/auth/v1/admin/users/" + encodeURIComponent(user.id),
      {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + serviceKey,
          apikey: serviceKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (!del.ok) {
      const texto = await del.text();
      console.error("[eliminar-cuenta] Supabase respondió", del.status, texto);
      return respuesta(502, {
        error: "No pudimos completar el borrado. Escríbenos desde Contacto y lo hacemos a mano.",
      });
    }

    /* No registramos el correo ni el id en los logs: borrar una cuenta y
       dejar constancia de quién era en otro lado es borrarla a medias. */
    console.log("[eliminar-cuenta] cuenta eliminada correctamente");
    return respuesta(200, { ok: true });
  } catch (err) {
    console.error("[eliminar-cuenta] error inesperado:", err);
    return respuesta(500, {
      error: "Ocurrió un error inesperado. Escríbenos desde Contacto y lo hacemos a mano.",
    });
  }
};
