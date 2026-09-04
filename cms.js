/* =========================================================
   Contenido editable — Clear Credit
   Lee la tabla "contenido_sitio" en Supabase y aplica los valores
   guardados a los elementos marcados con data-cms="clave" en esta
   página (más los marcados como "global", que aparecen en varias
   páginas, como el bloque de contacto del pie de página).

   Si no hay conexión, no hay ninguna fila guardada todavía, o algo
   falla, cada elemento simplemente se queda con el texto o imagen
   que ya tenía escrito en el HTML — esta parte del sitio nunca se
   rompe por esto, solo deja de "personalizarse".

   Requiere que auth.js ya haya corrido antes (usa el mismo cliente
   de Supabase, así no duplicamos la conexión).
   ========================================================= */
(function () {
  "use strict";

  function applyRow(row) {
    if (row.valor == null || row.valor === "") return;

    // Los colores de marca no están "atados" a un elemento con
    // data-cms="--gold" — se aplican directo a :root (la variable CSS)
    // para que todo el sitio los herede al instante, en cualquier página.
    if (row.tipo === "color") {
      document.documentElement.style.setProperty(row.id, row.valor);
      return;
    }

    var els = document.querySelectorAll('[data-cms="' + row.id + '"]');
    els.forEach(function (el) {
      if (row.tipo === "imagen") {
        if (el.tagName === "IMG") el.src = row.valor;
        else el.style.backgroundImage = "url(" + row.valor + ")";
      } else {
        el.textContent = row.valor;
      }
      var revealParent = el.closest("[data-cms-reveal]");
      if (revealParent) revealParent.hidden = false;
    });
  }

  function run() {
    if (!window.CCAuth || !window.CCAuth.client) return;
    var page = document.body.getAttribute("data-cms-page") || "";

    window.CCAuth.client
      .from("contenido_sitio")
      .select("id,tipo,valor")
      .in("pagina", [page, "global"])
      .then(function (res) {
        var data = res && res.data;
        if (!data) return;
        data.forEach(applyRow);
      })
      .catch(function (err) {
        console.warn("[Clear Credit] No se pudo cargar el contenido editable de esta página.", err);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
