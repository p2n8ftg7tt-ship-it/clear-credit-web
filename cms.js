/* =========================================================
   Contenido editable — Themora
   Lee la tabla "contenido_sitio" en Supabase y aplica los valores
   guardados a los elementos marcados con data-cms="clave" en esta
   página (más los marcados como "global", que aparecen en varias
   páginas, como el bloque de contacto del pie de página).

   Si no hay conexión, no hay ninguna fila guardada todavía, o algo
   falla, cada elemento simplemente se queda con el texto o imagen
   que ya tenía escrito en el HTML — esta parte del sitio nunca se
   rompe por esto, solo deja de "personalizarse".

   Para que nada "salte" al cargar: solo se escribe lo que de verdad
   cambia, y los colores de marca se guardan en este navegador para que
   el script corto del <head> los ponga antes de dibujar la página.

   Requiere que auth.js ya haya corrido antes (usa el mismo cliente
   de Supabase, así no duplicamos la conexión).
   ========================================================= */
(function () {
  "use strict";

  var CLAVE_COLORES = "themora_colores";
  var colorValido = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i;

  function applyRow(row, colores) {
    if (row.valor == null || row.valor === "") return;

    // Los colores de marca no están "atados" a un elemento con
    // data-cms="--gold" — se aplican directo a :root (la variable CSS)
    // para que todo el sitio los herede al instante, en cualquier página.
    if (row.tipo === "color") {
      if (!/^--[\w-]+$/.test(row.id) || !colorValido.test(String(row.valor).trim())) return;
      colores[row.id] = row.valor;
      var raiz = document.documentElement;
      if (raiz.style.getPropertyValue(row.id).trim() !== row.valor) raiz.style.setProperty(row.id, row.valor);
      return;
    }

    var els = document.querySelectorAll('[data-cms="' + row.id + '"]');
    els.forEach(function (el) {
      if (row.tipo === "imagen") {
        if (el.tagName === "IMG") {
          if (el.getAttribute("src") !== row.valor) el.src = row.valor;
        } else {
          var fondo = "url(" + row.valor + ")";
          if (el.style.backgroundImage !== fondo && el.style.backgroundImage !== 'url("' + row.valor + '")') el.style.backgroundImage = fondo;
        }
      } else if (el.textContent !== row.valor) {
        el.textContent = row.valor;
      }
      var revealParent = el.closest("[data-cms-reveal]");
      if (revealParent) revealParent.hidden = false;
    });
  }

  // Guarda los colores vigentes para la próxima visita (o los borra si ya no
  // hay ninguno guardado en el panel). Si el navegador no deja guardar, no pasa nada.
  function recordarColores(colores) {
    try {
      if (Object.keys(colores).length) localStorage.setItem(CLAVE_COLORES, JSON.stringify(colores));
      else localStorage.removeItem(CLAVE_COLORES);
    } catch (e) { /* almacenamiento bloqueado: se aplican igual en esta visita */ }
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
        var colores = {};
        data.forEach(function (row) { applyRow(row, colores); });
        recordarColores(colores);
      })
      .catch(function (err) {
        console.warn("[Themora] No se pudo cargar el contenido editable de esta página.", err);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
