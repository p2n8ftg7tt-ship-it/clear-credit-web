/* =========================================================
   Agente de tasas hipotecarias — lo que se ve en las páginas
   (specs/004-mortgage-rate-agent · contracts/ui-block-and-banner.md)

   - En Comprar casa (donde existe <section id="tasas">): llena el bloque con las
     tasas a 30 y 15 años, los avisos y las fuentes.
   - En las otras páginas acordadas: muestra un aviso corto y cerrable cuando hay
     un cambio importante.

   Todos los textos salen de tasas-texto.js (window.TasasTexto). Los datos vienen
   de la función pública /.netlify/functions/tasas-hipoteca.

   INTERRUPTOR DE LANZAMIENTO
   Mientras TASAS_LANZADO sea false este archivo no hace NADA: no pide datos, no
   pinta nada, no muestra ningún aviso. Se cambia a true solo en el commit de
   lanzamiento (tarea T059 de specs/004-mortgage-rate-agent), junto con la línea de
   privacidad y la entrada del buscador. Después de lanzar, el interruptor de
   "apagado" del dueño es tasas_config.activo en la base de datos.

   Si algo falla, nada se rompe: el bloque avisa con honestidad que no está
   disponible y el aviso simplemente no aparece. Nunca se lanza un error.

   CASAS FLOTANTES (specs/006-floating-rate-houses)
   En Comprar casa, además del bloque, se dibujan dos casas flotantes (30 y 15 años) con la
   tasa visible. Salen del MISMO objeto de datos que el bloque (una sola petición, una sola
   verdad) y del MISMO interruptor TASAS_LANZADO: no hay un segundo interruptor.

   Analítica: solo eventos categóricos (sin cifras, fechas, ids ni texto libre).
   ========================================================= */
(() => {
  'use strict';

  const TASAS_LANZADO = false;   // ← cambiar a true SOLO en el commit de lanzamiento (T059)
  if (TASAS_LANZADO !== true) return;

  const T = window.TasasTexto;
  if (!T) return;

  const ENDPOINT = '/.netlify/functions/tasas-hipoteca';
  const CLAVE_CERRADO = 'themora_tasas_aviso_cerrado';
  const ENLACE_BLOQUE = 'comprar-casa.html#tasas';
  const CLAVE_CASAS_CERRADAS = 'themora_casas_cerradas';
  const CAMPOS_DE_FORMULARIO = ['INPUT', 'SELECT', 'TEXTAREA'];

  const $ = id => document.getElementById(id);

  // Analítica segura: jamás rompe la página ni manda datos personales.
  function evento(nombre, datos) {
    try {
      if (window.ThemoraStats && typeof window.ThemoraStats.evento === 'function') {
        datos ? window.ThemoraStats.evento(nombre, datos) : window.ThemoraStats.evento(nombre);
      }
    } catch (_) { /* la analítica nunca debe romper el sitio */ }
  }

  /* ---------- Datos ---------- */
  async function pedir() {
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), 8000);
    try {
      const res = await fetch(ENDPOINT, { headers: { Accept: 'application/json' }, signal: control.signal });
      if (!res.ok) throw new Error('no disponible');
      return await res.json();
    } finally {
      clearTimeout(reloj);
    }
  }

  /* ---------- Memoria del aviso cerrado (solo en este navegador) ---------- */
  function leerCerrado() {
    try { return window.localStorage.getItem(CLAVE_CERRADO); } catch (_) { return null; }
  }
  function guardarCerrado(id) {
    try { window.localStorage.setItem(CLAVE_CERRADO, String(id)); } catch (_) { /* sin almacenamiento: el aviso volverá en la próxima visita */ }
  }

  /* ---------- Memoria de las casas ocultas (solo esta visita, solo este navegador) ---------- */
  function leerCasasCerradas() {
    try { return window.sessionStorage.getItem(CLAVE_CASAS_CERRADAS) === '1'; } catch (_) { return false; }
  }
  function guardarCasasCerradas() {
    try { window.sessionStorage.setItem(CLAVE_CASAS_CERRADAS, '1'); } catch (_) { /* sin almacenamiento: se ocultan solo en esta página */ }
  }

  /* ---------- Pequeñas ayudas de DOM (siempre textContent: nunca HTML de datos) ---------- */
  function poner(id, texto) {
    const el = $(id);
    if (el) el.textContent = texto;
  }
  function vaciar(el) {
    while (el && el.firstChild) el.removeChild(el.firstChild);
  }
  function enlaceExterno(url, texto, evento) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = texto;
    if (evento) a.setAttribute('data-umami-event', evento);
    return a;
  }

  /* =========================================================
     Bloque de Comprar casa
     ========================================================= */
  function mostrarNoDisponible(seccion) {
    seccion.hidden = false;
    const contenido = $('tasasContenido');
    const mensaje = $('tasasMensaje');
    const pill = $('tasasPill');
    if (contenido) contenido.hidden = true;
    if (pill) pill.hidden = true;
    if (mensaje) {
      mensaje.textContent = T.TEXTOS.noDisponible;
      mensaje.hidden = false;
    }
  }

  function pintarFuentes(datos) {
    const lista = $('tasasFuentes');
    if (!lista) return;
    vaciar(lista);
    const fuentes = T.textoFuentes([datos.fuente].concat(datos.fuentesSenal || []));
    fuentes.forEach(f => {
      const li = document.createElement('li');
      const nombre = document.createElement('strong');
      nombre.textContent = f.nombre;
      li.appendChild(nombre);
      if (f.mide) {
        const mide = document.createElement('span');
        mide.textContent = f.mide;
        li.appendChild(mide);
      }
      const frecuencia = document.createElement('small');
      frecuencia.textContent = f.frecuencia;
      li.appendChild(frecuencia);
      li.appendChild(enlaceExterno(f.url, 'Ver la fuente ↗', 'tasas-fuente-abierta'));
      lista.appendChild(li);
    });
    poner('tasasSoloUna', T.TEXTOS.soloUnaFuente);
  }

  function pintarAlertas(alertas) {
    const zona = $('tasasAlertas');
    if (!zona) return;
    vaciar(zona);
    (alertas || []).forEach(a => {
      const caja = document.createElement('div');
      caja.className = 'tasas-alerta';
      const texto = document.createElement('p');
      texto.textContent = T.textoAlerta(a);
      caja.appendChild(texto);
      if (a.fuente && a.fuente.url) {
        const fuente = document.createElement('small');
        fuente.appendChild(enlaceExterno(a.fuente.url, `Fuente: ${a.fuente.nombre} ↗`, 'tasas-fuente-abierta'));
        caja.appendChild(fuente);
      }
      zona.appendChild(caja);
      evento('tasas-alerta-vista', { tipo: a.tipo });
    });
    zona.hidden = !(alertas && alertas.length);
  }

  function pintarBloque(seccion, datos) {
    // Apagado por el dueño (o respuesta rara): el bloque no se muestra.
    if (!datos || datos.activo !== true) { seccion.hidden = true; return; }

    seccion.hidden = false;
    const contenido = $('tasasContenido');
    const mensaje = $('tasasMensaje');
    const pill = $('tasasPill');
    const frescura = datos.frescura;

    if (pill) {
      pill.hidden = false;
      pill.textContent = T.pillTexto(frescura);
      pill.setAttribute('data-estado', frescura);
    }
    pintarFuentes(datos);

    // Todavía no hay ninguna lectura verificada: se dice tal cual, sin números.
    if (frescura === 'sin_datos' || !datos.terminos) {
      if (contenido) contenido.hidden = true;
      if (mensaje) { mensaje.textContent = T.textoFrescura('sin_datos', {}); mensaje.hidden = false; }
      poner('tasasRevisado', '');
      poner('tasasProxima', datos.proximaActualizacion ? T.textoProximaRevision(datos.proximaActualizacion) : '');
      evento('tasas-bloque-visto');
      return;
    }

    if (mensaje) mensaje.hidden = true;
    if (contenido) contenido.hidden = false;

    ['30', '15'].forEach(termino => {
      const dato = datos.terminos[termino];
      if (!dato) return;
      const cifra = T.textoCifra(termino, dato);
      poner(`tasas${termino}Etiqueta`, cifra.etiqueta);
      poner(`tasas${termino}Valor`, cifra.valor);
      poner(`tasas${termino}Cambio`, T.textoCambio(dato.cambioPp));
      poner(`tasas${termino}Fecha`, T.textoFechaFuente(dato.fechaFuente));
    });

    const aviso = $('tasasObsoleto');
    if (aviso) {
      const fecha = datos.terminos['30'] ? datos.terminos['30'].fechaFuente : null;
      const texto = T.textoFrescura(frescura, { fechaFuente: fecha });
      aviso.textContent = texto;
      aviso.hidden = !texto;
    }

    poner('tasasRevisado', datos.publicadoEn ? T.textoRevisado(datos.publicadoEn) : '');
    poner('tasasProxima', datos.proximaActualizacion ? T.textoProximaRevision(datos.proximaActualizacion) : '');
    pintarAlertas(datos.alertas);
    evento('tasas-bloque-visto');
  }

  // Un solo camino: el bloque y las casas se dibujan siempre juntos, con el mismo objeto de datos.
  function mostrar(seccion, datos) {
    pintarBloque(seccion, datos);
    pintarCasas(datos);
  }

  function iniciarBloque(seccion) {
    pedir()
      .then(datos => mostrar(seccion, datos))
      .catch(() => { mostrarNoDisponible(seccion); quitarCasas(); });   // ya lanzado: mejor decirlo que dejar un hueco en blanco
  }

  /* =========================================================
     Casas flotantes (30 y 15 años)
     ========================================================= */
  let casas = null;              // { grupo, botones: { '30': el, '15': el } } mientras estén dibujadas
  let casasCerradas = false;     // el visitante las ocultó en esta visita
  let campoConFoco = false;      // hay un campo de formulario con foco
  let vigilanciaLista = false;   // ya se registraron los oyentes de foco y de herramientas a pantalla completa
  const casasVistas = new Set(); // plazos de los que ya se mandó tasas-casa-vista en esta página

  function hayHerramientaAbierta() {
    if (typeof document.querySelectorAll !== 'function') return false;
    return Array.prototype.slice.call(document.querySelectorAll('.fha-world')).some(d => d.hidden === false);
  }

  // Oculta las casas de forma TEMPORAL (no es cerrarlas): mientras se escribe en un campo o hay una herramienta abierta.
  function actualizarVisibilidadCasas() {
    if (casas) casas.grupo.hidden = campoConFoco || hayHerramientaAbierta();
  }

  function vigilarEstorbos() {
    if (vigilanciaLista) return;
    vigilanciaLista = true;
    document.addEventListener('focusin', e => {
      campoConFoco = !!(e && e.target && CAMPOS_DE_FORMULARIO.indexOf(e.target.tagName) >= 0);
      actualizarVisibilidadCasas();
    });
    document.addEventListener('focusout', () => {
      campoConFoco = false;
      actualizarVisibilidadCasas();
    });
    if (typeof MutationObserver === 'function' && typeof document.querySelectorAll === 'function') {
      const observador = new MutationObserver(actualizarVisibilidadCasas);
      Array.prototype.slice.call(document.querySelectorAll('.fha-world')).forEach(d => {
        observador.observe(d, { attributes: true, attributeFilter: ['hidden'] });
      });
    }
  }

  function quitarCasas() {
    if (!casas) return;
    if (casas.grupo.parentNode) casas.grupo.parentNode.removeChild(casas.grupo);
    if (document.body && typeof document.body.removeAttribute === 'function') document.body.removeAttribute('data-casas');
    casas = null;
  }

  function cerrarCasas() {
    casasCerradas = true;
    guardarCasasCerradas();
    evento('tasas-casas-cerradas');
    quitarCasas();
  }

  function crearCasas(plazos) {
    const grupo = document.createElement('div');
    grupo.className = 'casas-flotantes';
    grupo.setAttribute('role', 'group');
    grupo.setAttribute('aria-label', T.TEXTOS.casa.grupo);
    const botones = {};
    plazos.forEach(termino => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'casa';
      boton.setAttribute('data-termino', termino);
      boton.setAttribute('aria-controls', 'casasPanel');
      boton.setAttribute('aria-expanded', 'false');
      const plazo = document.createElement('span');
      plazo.className = 'casa-plazo';
      const valor = document.createElement('strong');
      valor.className = 'casa-valor';
      boton.appendChild(plazo);
      boton.appendChild(valor);
      grupo.appendChild(boton);
      botones[termino] = boton;
    });
    const cerrar = document.createElement('button');
    cerrar.type = 'button';
    cerrar.className = 'casas-cerrar';
    cerrar.setAttribute('aria-label', T.TEXTOS.casa.cerrar);
    cerrar.textContent = '×';
    cerrar.addEventListener('click', cerrarCasas);
    grupo.appendChild(cerrar);
    document.body.appendChild(grupo);
    document.body.setAttribute('data-casas', '1');
    casas = { grupo, botones };
    vigilarEstorbos();
  }

  // Dibuja o actualiza las casas a partir del MISMO objeto de datos que el bloque.
  function pintarCasas(datos) {
    try {
      if (!$('tasas')) return;   // solo en Comprar casa
      const hay = datos && datos.activo === true && datos.frescura !== 'sin_datos' && datos.terminos;
      const plazos = hay ? ['30', '15'].filter(t => datos.terminos[t]) : [];
      if (casasCerradas || !plazos.length) { quitarCasas(); return; }
      if (casas && Object.keys(casas.botones).join() !== plazos.join()) quitarCasas();   // cambió el conjunto de plazos
      if (!casas) crearCasas(plazos);
      plazos.forEach(termino => {
        const boton = casas.botones[termino];
        const texto = T.textoCasa(termino, datos.terminos[termino]);
        boton.children[0].textContent = texto.plazo;
        boton.children[1].textContent = texto.valor;
        boton.setAttribute('aria-label', texto.nombreAccesible);
        if (!casasVistas.has(termino)) {
          casasVistas.add(termino);
          evento('tasas-casa-vista', { termino });
        }
      });
      actualizarVisibilidadCasas();
    } catch (_) { /* las casas nunca deben romper la página */ }
  }

  /* =========================================================
     Aviso (banner) en las demás páginas
     ========================================================= */
  function crearBanner(alerta) {
    const barra = document.createElement('div');
    barra.className = 'tasas-aviso';
    barra.setAttribute('role', 'status');

    const texto = document.createElement('span');
    texto.className = 'tasas-aviso-texto';
    texto.textContent = T.textoBanner(alerta);

    const detalle = document.createElement('a');
    detalle.className = 'tasas-aviso-enlace';
    detalle.href = ENLACE_BLOQUE;
    detalle.textContent = T.TEXTOS.verDetalle;
    detalle.addEventListener('click', () => evento('tasas-aviso-enlace'));

    const cerrar = document.createElement('button');
    cerrar.type = 'button';
    cerrar.className = 'tasas-aviso-cerrar';
    cerrar.setAttribute('aria-label', T.TEXTOS.cerrar);
    cerrar.textContent = '×';
    cerrar.addEventListener('click', () => {
      guardarCerrado(alerta.id);
      if (barra.parentNode) barra.parentNode.removeChild(barra);
      evento('tasas-aviso-cerrado');
    });

    barra.appendChild(texto);
    barra.appendChild(detalle);
    barra.appendChild(cerrar);

    // En el flujo normal de la página (nunca fijo ni encima del contenido). Va después
    // del enlace "Saltar al contenido" para que ese siga siendo lo primero con el teclado.
    const salto = document.querySelector('.skip-link');
    if (salto && salto.parentNode === document.body) salto.parentNode.insertBefore(barra, salto.nextSibling);
    else document.body.insertBefore(barra, document.body.firstChild);
    evento('tasas-aviso-visto');
  }

  function iniciarBanner() {
    pedir()
      .then(datos => {
        if (!datos || datos.activo !== true || !Array.isArray(datos.alertas) || !datos.alertas.length) return;
        const alerta = datos.alertas[0];               // ya vienen ordenadas por prioridad
        if (String(leerCerrado()) === String(alerta.id)) return;   // cerrado: hasta que haya un aviso NUEVO
        crearBanner(alerta);
      })
      .catch(() => { /* un aviso que falla no muestra nada */ });
  }

  /* ---------- Arranque ---------- */
  function iniciar() {
    try {
      const seccion = $('tasas');
      casasCerradas = leerCasasCerradas();
      if (seccion) iniciarBloque(seccion);
      else iniciarBanner();
    } catch (_) { /* nunca romper la página */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
