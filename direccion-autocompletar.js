/* =========================================================================
   Autocompletado de direcciones — lado del navegador
   =========================================================================

   Está activo desde que la persona escribe en un campo de calle marcado,
   sin casilla: aparecen sugerencias de Google. Un aviso de texto, siempre
   visible junto al campo, dice qué se consulta. Reglas que no se pueden romper:

   1. NO SALE NINGUNA PETICIÓN hasta que la persona escribe en el campo de la
      calle. Ni al cargar la página, ni al enfocar el campo, ni al escribir en
      otro. (Conectar un campo tampoco pide nada.)
   2. Lo escrito en el campo de la calle va a
      /.netlify/functions/autocompletar-direccion (nuestro servidor), nunca
      directo a Google. La llave de Google no está en el navegador.
   3. Solo la calle viaja. Nombre, teléfono, ciudad, estado y código postal
      nunca se envían: esos se RECIBEN al elegir una sugerencia.
   4. Si algo falla (sin llave, sin cuota, sin conexión, servicio sin publicar),
      el autocompletado se apaga solo y la persona sigue escribiendo a mano.
      El formulario nunca depende de esto, y escribir a mano funciona siempre.

   CÓMO SE CONECTA UN FORMULARIO (solo marcar los campos, sin JavaScript propio):

     <input name="street"  data-dir-calle="persona" data-dir-tipo="persona">
     <input name="city"    data-dir-ciudad="persona">
     <input name="state"   data-dir-estado="persona">
     <input name="zip"     data-dir-cp="persona">

   - data-dir-calle="<grupo>"  marca el campo de la calle (o el de la dirección
     completa) y le pone nombre al grupo; el grupo debe ser único dentro del
     formulario. Con dos direcciones en el mismo formulario (la de la persona y la
     de la agencia) se usan dos grupos y cada uno se rellena por separado.
   - data-dir-tipo="persona" | "cobrador" | "negocio"  cambia el texto del aviso.
   - Los demás campos del grupo llevan data-dir-ciudad / data-dir-estado /
     data-dir-cp con el mismo nombre de grupo, o data-dir-estado-cp si estado y
     código postal comparten un solo campo. Los que falten se omiten.
   - Forma que se deduce: con data-dir-estado-cp → "estado-cp"; con ciudad,
     estado o cp → "separado"; sin ninguno → "unico" (la dirección completa va
     en el mismo campo de la calle: «123 Main St, Roanoke, VA 24016»).
   - La búsqueda de los campos hermanos se hace dentro del [data-dir-scope] más
     cercano, o del <form>, o del contenedor directo del campo.

   Se conecta la primera vez que la persona enfoca un campo marcado (un solo
   escuchador en document), así que también funciona con formularios que se
   dibujan después. Compatibilidad: ThemoraDireccion.conectar(formulario) sigue
   funcionando con campos llamados street, city, state y postalCode.

   Detalle completo en specs/003-address-autocomplete-bilingual-letters/
   ========================================================================= */

(function () {
  'use strict';

  var ENDPOINT = '/.netlify/functions/autocompletar-direccion';
  var MINIMO = 4;      // caracteres antes de pedir sugerencias (el servidor no acepta menos)
  var ESPERA = 350;    // ms sin teclear antes de pedir
  var COMPLEMENTO = 'te sugerimos direcciones con Google: solo eso que escribes se consulta, y también puedes escribir todo a mano.';
  var AVISOS = {
    persona: 'Al escribir tu calle y número ' + COMPLEMENTO,
    cobrador: 'Al escribir la dirección de la agencia ' + COMPLEMENTO,
    negocio: 'Al escribir la dirección de tu negocio ' + COMPLEMENTO
  };

  var CSS = [
    '.tda-optin{grid-column:1/-1;display:flex;flex-direction:column;gap:3px}',
    '.tda-optin small{color:rgba(27,27,24,.72);line-height:1.5;font-size:.82rem}',
    '.tda-estado{font-size:.82rem;line-height:1.45;color:var(--teal,#2f6f62);min-height:1.2em}',
    '.tda-lista{position:absolute;left:0;right:0;top:100%;z-index:30;margin:2px 0 0;padding:4px;list-style:none;background:#fff;border:1px solid rgba(11,39,72,.28);border-radius:6px;box-shadow:0 10px 26px rgba(11,39,72,.16);max-height:300px;overflow:auto}',
    '.tda-lista[hidden]{display:none}',
    // Doble clase a propósito: en credito.html la lista vive dentro de un <li> de otra lista y heredaría su diseño de cuadrícula.
    '.tda-lista.tda-lista li{display:block;grid-template-columns:none;gap:0;margin:0;background:transparent;border:0;padding:10px 11px;border-radius:4px;cursor:pointer;line-height:1.35}',
    '.tda-lista li b{display:block;font-weight:700;color:var(--ink,#1b1b18);font-size:.93rem}',
    '.tda-lista li span{display:block;font-size:.8rem;color:rgba(27,27,24,.62)}',
    '.tda-lista li[aria-selected="true"],.tda-lista li[role="option"]:hover{background:rgba(47,111,98,.13)}',
    '.tda-lista.tda-lista .tda-pie{font-size:.7rem;color:rgba(27,27,24,.5);cursor:default;padding:6px 11px 3px;text-align:right}'
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

  function limpio(x) {
    return String(x == null ? '' : x).replace(/\s+/g, ' ').trim();
  }

  /* Qué valor va en cada campo cuando se elige una sugerencia. Función pura: la
     prueba está en tests/direccion-formas.test.js. Nunca devuelve valores vacíos,
     para no borrar lo que la persona ya escribió. */
  function valoresParaBloque(dir, forma) {
    var d = dir || {};
    var calle = limpio(d.calle), ciudad = limpio(d.ciudad), estado = limpio(d.estado), cp = limpio(d.cp);
    var estadoCp = [estado, cp].filter(Boolean).join(' ');
    var salida = {};
    function poner(clave, valor) { if (valor) salida[clave] = valor; }
    if (forma === 'unico') {
      poner('calle', [calle, ciudad, estadoCp].filter(Boolean).join(', '));
    } else if (forma === 'estado-cp') {
      poner('calle', calle);
      poner('ciudad', ciudad);
      poner('estadoCp', estadoCp);
    } else {
      poner('calle', calle);
      poner('ciudad', ciudad);
      poner('estado', estado);
      poner('cp', cp);
    }
    return salida;
  }

  /* campos: { calle, ciudad?, estado?, cp?, estadoCp? }  (elementos)
     cfg:    { tipo: 'persona' | 'cobrador' | 'negocio', forma: 'separado' | 'estado-cp' | 'unico' } */
  function montarBloque(campos, cfg) {
    var calle = campos.calle;
    if (!calle || calle.dataset.tdaListo === '1') return;
    calle.dataset.tdaListo = '1';
    inyectarCss();

    var forma = cfg.forma;
    var uid = 'tda' + Math.random().toString(36).slice(2, 8);
    var contenedorCalle = (calle.closest && calle.closest('.cr-solution-field, .cd-field, .form-group')) || calle.parentNode;

    /* ---- aviso de qué se consulta (sin casilla: solo informa) ---- */
    var bloque = document.createElement('div');
    bloque.className = 'tda-optin';
    var small = document.createElement('small');
    small.id = uid + '-aviso';
    small.textContent = AVISOS[cfg.tipo] || AVISOS.persona;
    var estadoEl = document.createElement('span');
    estadoEl.className = 'tda-estado';
    estadoEl.setAttribute('role', 'status');
    estadoEl.setAttribute('aria-live', 'polite');
    bloque.appendChild(small);
    bloque.appendChild(estadoEl);
    // Justo encima del campo de la calle, donde se escribe.
    contenedorCalle.parentNode.insertBefore(bloque, contenedorCalle);
    var aviso = estadoEl;

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
      lista.textContent = '';
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

    // Sin llave, sin cuota, servicio sin publicar o Google caído: se apaga para esta
    // visita y la persona sigue a mano. No se reintenta en cada tecla.
    function apagarPorFalla(mensaje) {
      desactivar();
      decir(mensaje);
    }

    var NO_DISPONIBLE = 'El autocompletado no está disponible ahora. Escribe la dirección a mano.';

    // 404 = la función no está publicada; 403 = origen no permitido; 405 = método.
    // Ninguno se arregla reintentando: se apaga para esta visita.
    function faltaElServicio(res, d) {
      var st = res.status;
      return st === 404 || st === 403 || st === 405 || st >= 500 || !!(d && (d.noConfigurado || d.noDisponible));
    }

    function avisarAlDueno(res) {
      // Mensaje fijo, nunca lo que la persona escribió.
      if (res.status === 404 && typeof console !== 'undefined' && console.warn) {
        console.warn('[direccion] El servicio de direcciones no está publicado (404). Ver INSTRUCCIONES-DIRECCIONES.md');
      }
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
        if (faltaElServicio(r.res, r.d)) { avisarAlDueno(r.res); apagarPorFalla(NO_DISPONIBLE); return; }
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
        if (faltaElServicio(r.res, r.d)) { avisarAlDueno(r.res); apagarPorFalla(NO_DISPONIBLE); return; }
        if (!r.res.ok || !d) { decir('No pudimos completar esa dirección. Escríbela a mano.'); return; }
        var v = valoresParaBloque(d, forma);
        rellenando = true;
        poner(campos.calle, v.calle);
        poner(campos.ciudad, v.ciudad);
        poner(campos.estado, v.estado);
        poner(campos.cp, v.cp);
        poner(campos.estadoCp, v.estadoCp);
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

  /* Busca los campos hermanos de un campo marcado con data-dir-calle y monta el bloque. */
  function conectarBloque(calle) {
    if (!calle || !calle.getAttribute || calle.dataset.tdaListo === '1') return;
    var grupo = calle.getAttribute('data-dir-calle') || 'persona';
    var tipo = calle.getAttribute('data-dir-tipo') || 'persona';
    if (!AVISOS[tipo]) tipo = 'persona';
    var raiz = (calle.closest && (calle.closest('[data-dir-scope]') || calle.closest('form'))) || calle.parentNode;
    var seguro = String(grupo).replace(/[^\w-]/g, '');
    function buscar(atributo) { return raiz.querySelector('[' + atributo + '="' + seguro + '"]') || undefined; }
    var campos = {
      calle: calle,
      ciudad: buscar('data-dir-ciudad'),
      estado: buscar('data-dir-estado'),
      cp: buscar('data-dir-cp'),
      estadoCp: buscar('data-dir-estado-cp')
    };
    var forma = campos.estadoCp ? 'estado-cp' : (campos.ciudad || campos.estado || campos.cp) ? 'separado' : 'unico';
    montarBloque(campos, { tipo: tipo, forma: forma });
  }

  /* Compatibilidad: formulario con campos llamados street, city, state y postalCode
     (o los nombres que se pasen en opciones.campos). */
  function conectar(form, opciones) {
    if (!form || !form.elements) return;
    var cfg = opciones || {};
    var nombres = { calle: 'street', ciudad: 'city', estado: 'state', cp: 'postalCode' };
    Object.keys(cfg.campos || {}).forEach(function (k) { nombres[k] = cfg.campos[k]; });
    var campos = {};
    Object.keys(nombres).forEach(function (k) { campos[k] = form.elements[nombres[k]] || undefined; });
    if (!campos.calle) return;
    montarBloque(campos, { tipo: 'persona', forma: 'separado' });
  }

  var API = {
    conectar: conectar,
    conectarBloque: conectarBloque,
    __prueba: { valoresParaBloque: valoresParaBloque }
  };
  window.ThemoraDireccion = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

  // Un solo escuchador: conecta el bloque la primera vez que se enfoca un campo marcado.
  if (typeof document !== 'undefined') {
    document.addEventListener('focusin', function (e) {
      var t = e.target;
      if (t && t.matches && t.matches('[data-dir-calle]')) conectarBloque(t);
    });
  }
})();
