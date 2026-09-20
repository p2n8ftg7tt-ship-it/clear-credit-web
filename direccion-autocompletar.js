/* =========================================================================
   Autocompletado de direcciones — lado del navegador
   =========================================================================

   Se conecta a un formulario de carta (credito.html). Está activo desde que
   la persona entra al formulario, sin casilla: al escribir en «Calle y número»
   aparecen sugerencias de Google. Un aviso de texto, siempre visible junto al
   campo, dice qué se consulta. Reglas que no se pueden romper:

   1. NO SALE NINGUNA PETICIÓN hasta que la persona escribe en «Calle y número».
      Ni al cargar la página, ni al enfocar el campo, ni al escribir en otro.
   2. Lo escrito en «Calle y número» va a
      /.netlify/functions/autocompletar-direccion (nuestro servidor), nunca
      directo a Google. La llave de Google no está en el navegador.
   3. Solo la calle viaja. Nombre, teléfono, ciudad, estado y código postal
      nunca se envían: esos se RECIBEN al elegir una sugerencia.
   4. Si algo falla (sin llave, sin cuota, sin conexión), el autocompletado se
      apaga solo y la persona sigue escribiendo a mano. El formulario nunca
      depende de esto, y escribir a mano funciona siempre.

   Uso:  ThemoraDireccion.conectar(formulario)
   El formulario debe tener campos name="street", "city", "state" y
   "postalCode" (o pasar otros nombres en opciones.campos).
   ========================================================================= */

(function () {
  'use strict';

  var ENDPOINT = '/.netlify/functions/autocompletar-direccion';
  var MINIMO = 4;      // caracteres antes de pedir sugerencias (el servidor no acepta menos)
  var ESPERA = 350;    // ms sin teclear antes de pedir

  var CSS = [
    '.tda-optin{grid-column:1/-1;display:flex;flex-direction:column;gap:3px}',
    '.tda-optin small{color:rgba(27,27,24,.72);line-height:1.5;font-size:.82rem}',
    '.tda-estado{font-size:.82rem;line-height:1.45;color:var(--teal,#2f6f62);min-height:1.2em}',
    '.tda-lista{position:absolute;left:0;right:0;top:100%;z-index:30;margin:2px 0 0;padding:4px;list-style:none;background:#fff;border:1px solid rgba(11,39,72,.28);border-radius:6px;box-shadow:0 10px 26px rgba(11,39,72,.16);max-height:300px;overflow:auto}',
    '.tda-lista[hidden]{display:none}',
    '.tda-lista li{padding:10px 11px;border-radius:4px;cursor:pointer;line-height:1.35}',
    '.tda-lista li b{display:block;font-weight:700;color:var(--ink,#1b1b18);font-size:.93rem}',
    '.tda-lista li span{display:block;font-size:.8rem;color:rgba(27,27,24,.62)}',
    '.tda-lista li[aria-selected="true"],.tda-lista li[role="option"]:hover{background:rgba(47,111,98,.13)}',
    '.tda-lista .tda-pie{font-size:.7rem;color:rgba(27,27,24,.5);cursor:default;padding:6px 11px 3px;text-align:right}'
  ].join('\n');

  function inyectarCss() {
    if (document.getElementById('tda-css')) return;
    var s = document.createElement('style');
    s.id = 'tda-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function nuevaSesion() {
    var a = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  function evento(nombre) {
    // Solo la acción, nunca la dirección.
    if (window.ThemoraStats) window.ThemoraStats.evento(nombre);
  }

  function conectar(form, opciones) {
    if (!form || form.dataset.tdaListo === '1') return;
    var cfg = opciones || {};
    var nombres = { calle: 'street', ciudad: 'city', estado: 'state', cp: 'postalCode' };
    Object.keys(cfg.campos || {}).forEach(function (k) { nombres[k] = cfg.campos[k]; });
    var campos = {};
    Object.keys(nombres).forEach(function (k) { campos[k] = form.elements[nombres[k]]; });
    if (!campos.calle) return;

    form.dataset.tdaListo = '1';
    inyectarCss();

    var uid = 'tda' + Math.random().toString(36).slice(2, 8);
    var calle = campos.calle;
    var contenedorCalle = calle.closest('.cr-solution-field') || calle.parentNode;

    /* ---- aviso de qué se consulta (sin casilla: solo informa) ---- */
    var bloque = document.createElement('div');
    bloque.className = 'tda-optin';
    bloque.innerHTML =
      '<small id="' + uid + '-aviso">Al escribir tu calle y número te sugerimos direcciones con Google: ' +
      'solo eso que escribes se consulta, y también puedes escribir todo a mano.</small>' +
      '<span class="tda-estado" role="status" aria-live="polite"></span>';
    // Justo encima del campo de la calle, donde se escribe.
    contenedorCalle.parentNode.insertBefore(bloque, contenedorCalle);
    var aviso = bloque.querySelector('.tda-estado');

    /* ---- lista de sugerencias ---- */
    var lista = document.createElement('ul');
    lista.id = uid + '-lista';
    lista.className = 'tda-lista';
    lista.setAttribute('role', 'listbox');
    lista.setAttribute('aria-label', 'Direcciones sugeridas');
    lista.hidden = true;
    contenedorCalle.style.position = 'relative';
    contenedorCalle.appendChild(lista);

    var activo = false;
    var sesion = nuevaSesion();
    var control = null;          // AbortController de la petición en curso
    var temporizador = null;
    var turno = 0;               // descarta respuestas que llegan tarde
    var sugerencias = [];
    var indice = -1;
    var rellenando = false;      // el relleno programático no debe disparar otra búsqueda
    var autocompleteOriginal = calle.getAttribute('autocomplete');

    function decir(texto) { aviso.textContent = texto || ''; }

    function cerrar() {
      lista.hidden = true;
      lista.innerHTML = '';
      sugerencias = [];
      indice = -1;
      calle.setAttribute('aria-expanded', 'false');
      calle.removeAttribute('aria-activedescendant');
    }

    function marcar(i) {
      var ops = lista.querySelectorAll('[role="option"]');
      Array.prototype.forEach.call(ops, function (li, n) { li.setAttribute('aria-selected', n === i ? 'true' : 'false'); });
      indice = i;
      if (i >= 0 && ops[i]) {
        calle.setAttribute('aria-activedescendant', ops[i].id);
        if (ops[i].scrollIntoView) ops[i].scrollIntoView({ block: 'nearest' });
      } else {
        calle.removeAttribute('aria-activedescendant');
      }
    }

    function abrir(lista_) {
      cerrar();
      if (!lista_.length) { decir('No encontramos esa dirección. Sigue escribiendo o escríbela a mano.'); return; }
      sugerencias = lista_;
      lista_.forEach(function (s, i) {
        var li = document.createElement('li');
        li.id = uid + '-op' + i;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');
        var b = document.createElement('b'); b.textContent = s.principal;
        var sp = document.createElement('span'); sp.textContent = s.secundario;
        li.appendChild(b); li.appendChild(sp);
        li.addEventListener('mousedown', function (e) { e.preventDefault(); }); // no quitar el foco del campo
        li.addEventListener('click', function () { elegir(i); });
        lista.appendChild(li);
      });
      var pie = document.createElement('li');
      pie.className = 'tda-pie';
      pie.setAttribute('role', 'presentation');
      pie.textContent = 'Powered by Google';
      lista.appendChild(pie);
      lista.hidden = false;
      calle.setAttribute('aria-expanded', 'true');
      decir(lista_.length + (lista_.length === 1 ? ' sugerencia' : ' sugerencias') + '. Usa las flechas y Enter.');
    }

    // Sin llave, sin cuota o Google caído: se apaga para esta visita y la persona
    // sigue a mano. No se reintenta en cada tecla.
    function apagarPorFalla(mensaje) {
      desactivar();
      decir(mensaje);
    }

    function llamar(cuerpo) {
      if (control) control.abort();
      control = new AbortController();
      cuerpo.sesion = sesion;
      return fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
        signal: control.signal,
        credentials: 'omit'
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (d) { return { res: res, d: d }; });
      });
    }

    function pedir(texto) {
      var mio = ++turno;
      llamar({ accion: 'sugerir', texto: texto }).then(function (r) {
        if (mio !== turno || !activo) return;
        if (r.res.status === 429) { cerrar(); decir('Hiciste muchas búsquedas seguidas. Escribe la dirección a mano.'); return; }
        if (r.d.noConfigurado || r.d.noDisponible || r.res.status >= 500) {
          apagarPorFalla('El autocompletado no está disponible ahora. Escribe la dirección a mano.'); return;
        }
        if (!r.res.ok) { cerrar(); decir(r.d.error || 'Escribe la dirección a mano.'); return; }
        abrir(Array.isArray(r.d.sugerencias) ? r.d.sugerencias : []);
      }).catch(function (err) {
        if (err && err.name === 'AbortError') return;
        if (!activo) return;
        // Un corte de red puede ser pasajero: se avisa, pero sigue activo.
        cerrar();
        decir('No pudimos consultar las sugerencias. Escribe la dirección a mano.');
      });
    }

    function poner(campo, valor) {
      if (!campo || !valor) return;
      campo.value = valor;
      campo.dispatchEvent(new Event('input', { bubbles: true }));
      campo.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function elegir(i) {
      var s = sugerencias[i];
      if (!s) return;
      cerrar();
      decir('Completando la dirección…');
      var mio = ++turno;
      llamar({ accion: 'detalle', id: s.id }).then(function (r) {
        if (mio !== turno || !activo) return;
        var d = r.d && r.d.direccion;
        if (!r.res.ok || !d) { decir('No pudimos completar esa dirección. Escríbela a mano.'); return; }
        rellenando = true;
        poner(campos.calle, d.calle);
        poner(campos.ciudad, d.ciudad);
        poner(campos.estado, d.estado);
        poner(campos.cp, d.cp);
        rellenando = false;
        sesion = nuevaSesion(); // una sesión por dirección
        decir(d.completa
          ? 'Dirección completada. Revisa que sea la correcta y agrega apartamento o unidad si aplica.'
          : 'Completamos lo que Google tenía. Revisa y escribe lo que falte.');
        evento('autocompletar-direccion-usado');
        campos.calle.focus();
        var n = campos.calle.value.length;
        try { campos.calle.setSelectionRange(n, n); } catch (_) { /* tipo de campo sin selección */ }
      }).catch(function (err) {
        if (err && err.name === 'AbortError') return;
        decir('No pudimos completar esa dirección. Escríbela a mano.');
      });
    }

    function activar() {
      activo = true;
      calle.setAttribute('autocomplete', 'off'); // que no compita con el autocompletado del navegador
      calle.setAttribute('role', 'combobox');
      calle.setAttribute('aria-autocomplete', 'list');
      calle.setAttribute('aria-expanded', 'false');
      calle.setAttribute('aria-controls', lista.id);
    }

    function desactivar() {
      activo = false;
      turno++;
      clearTimeout(temporizador);
      if (control) control.abort();
      cerrar();
      if (autocompleteOriginal === null) calle.removeAttribute('autocomplete');
      else calle.setAttribute('autocomplete', autocompleteOriginal);
      ['role', 'aria-autocomplete', 'aria-expanded', 'aria-controls', 'aria-activedescendant'].forEach(function (a) { calle.removeAttribute(a); });
      sesion = nuevaSesion();
    }

    calle.addEventListener('input', function () {
      if (!activo || rellenando) return;          // regla 1: solo se pide al escribir en la calle
      clearTimeout(temporizador);
      turno++;
      if (control) control.abort();
      var texto = calle.value.trim();
      if (texto.length < MINIMO) { cerrar(); return; }
      temporizador = setTimeout(function () { pedir(texto); }, ESPERA);
    });

    calle.addEventListener('keydown', function (e) {
      if (!activo || lista.hidden || !sugerencias.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); marcar((indice + 1) % sugerencias.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); marcar((indice - 1 + sugerencias.length) % sugerencias.length); }
      else if (e.key === 'Enter' && indice >= 0) { e.preventDefault(); elegir(indice); }
      else if (e.key === 'Escape') { e.stopPropagation(); cerrar(); }
      else if (e.key === 'Tab') { cerrar(); }
    });

    // Margen para que el toque en una sugerencia (móvil) llegue antes de cerrar la lista.
    calle.addEventListener('blur', function () { setTimeout(cerrar, 250); });

    activar();
  }

  window.ThemoraDireccion = { conectar: conectar };
})();
