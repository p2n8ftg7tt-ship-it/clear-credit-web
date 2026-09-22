/* Prueba del script del navegador (tasas-hipoteca.js) con un DOM falso mínimo.
   El archivo real trae TASAS_LANZADO = false; en las pruebas de "ya lanzado" se
   cambia esa línea SOLO en el texto que se ejecuta aquí (nunca en el archivo).
   Correr con:  node --test tests/*.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const T = require('../tasas-texto.js');
const codigoReal = fs.readFileSync(path.join(__dirname, '..', 'tasas-hipoteca.js'), 'utf8');
const conLanzamiento = codigoReal.replace('const TASAS_LANZADO = false;', 'const TASAS_LANZADO = true;');

/* ---------------- DOM falso ---------------- */
class El {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.hidden = false; this.className = ''; this._texto = ''; this.parentNode = null; }
  set textContent(v) { this._texto = String(v); this.children = []; }
  get textContent() { return this._texto + this.children.map(c => c.textContent).join(''); }
  get firstChild() { return this.children[0] || null; }
  get nextSibling() { const h = this.parentNode ? this.parentNode.children : []; return h[h.indexOf(this) + 1] || null; }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  removeChild(c) { this.children = this.children.filter(x => x !== c); c.parentNode = null; return c; }
  insertBefore(nuevo, ref) {
    nuevo.parentNode = this;
    const i = ref ? this.children.indexOf(ref) : -1;
    if (i < 0) this.children.push(nuevo); else this.children.splice(i, 0, nuevo);
    return nuevo;
  }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
  click() { (this.listeners.click || []).forEach(f => f({ target: this, preventDefault() {} })); }
  descendientes() { return this.children.flatMap(c => [c, ...c.descendientes()]); }
  get tagName() { return String(this.tag).toUpperCase(); }
  contains(x) { return x === this || this.children.some(c => c.contains(x)); }
  removeAttribute(k) { delete this.attrs[k]; }
  focus() { this.enfocado = (this.enfocado || 0) + 1; }
}

const IDS_BLOQUE = ['tasas', 'tasasContenido', 'tasasMensaje', 'tasasPill', 'tasas30Etiqueta', 'tasas30Valor', 'tasas30Cambio', 'tasas30Fecha',
  'tasas15Etiqueta', 'tasas15Valor', 'tasas15Cambio', 'tasas15Fecha', 'tasasObsoleto', 'tasasAlertas', 'tasasRevisado', 'tasasProxima',
  'tasasSoloUna', 'tasasFuentes'];

async function correr({
  codigo, conBloque, respuesta, respuestas, falla = false, almacenamiento = {}, almacenamientoRoto = false,
  sesion = {}, sesionRota = false, dialogos = [], visibilidad = 'visible', observador = false,
}) {
  const porId = {};
  if (conBloque) {
    for (const id of IDS_BLOQUE) porId[id] = new El(id === 'tasasFuentes' ? 'ul' : 'div');
    porId.tasas.hidden = true;     // como en comprar-casa.html
  }
  const body = new El('body');
  const eventos = [];
  const pedidos = [];
  const oyentesDoc = {};
  const intervalos = [];       // { fn, ms } de cada setInterval, para disparar a mano la actualización
  const observadores = [];     // MutationObserver falso (solo si observador: true)
  const doc = {
    body, readyState: 'complete', visibilityState: visibilidad,
    getElementById: id => porId[id] || null,
    createElement: tag => new El(tag),
    querySelector: () => null,
    querySelectorAll: sel => (sel === '.fha-world' ? dialogos : []),
    addEventListener: (tipo, fn) => { (oyentesDoc[tipo] = oyentesDoc[tipo] || []).push(fn); },
  };
  const disparar = (tipo, ev = {}) => (oyentesDoc[tipo] || []).forEach(f => f(ev));
  const win = {
    TasasTexto: T,
    ThemoraStats: { evento: (n, d) => eventos.push([n, d]) },
    localStorage: almacenamientoRoto
      ? { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } }
      : { getItem: k => (k in almacenamiento ? almacenamiento[k] : null), setItem: (k, v) => { almacenamiento[k] = v; } },
    sessionStorage: sesionRota
      ? { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } }
      : { getItem: k => (k in sesion ? sesion[k] : null), setItem: (k, v) => { sesion[k] = v; } },
  };
  let turno = 0;
  const fetchFalso = async (url) => {
    pedidos.push(url);
    if (falla) throw new Error('sin red');
    const cuerpo = respuestas ? respuestas[Math.min(turno++, respuestas.length - 1)] : respuesta;
    if (cuerpo === 'FALLA') throw new Error('sin red');
    return { ok: true, status: 200, json: async () => cuerpo };
  };
  const contexto = {
    window: win, document: doc, fetch: fetchFalso, AbortController, setTimeout, clearTimeout, Date,
    setInterval: (fn, ms) => { intervalos.push({ fn, ms }); return intervalos.length; },
    clearInterval: () => {},
  };
  if (observador) {
    contexto.MutationObserver = class {
      constructor(cb) { this.cb = cb; this.nodos = []; observadores.push(this); }
      observe(nodo, opciones) { this.nodos.push([nodo, opciones]); }
      disconnect() {}
    };
  }
  // El código es el archivo del propio repositorio (nunca texto de fuera); se ejecuta en un contexto aislado.
  vm.runInNewContext(codigo, contexto);
  const esperar = async () => { for (let i = 0; i < 6; i++) await new Promise(r => setImmediate(r)); };
  await esperar();
  return { porId, body, eventos, pedidos, almacenamiento, sesion, intervalos, observadores, doc, disparar, esperar };
}

const snapshot = (extra = {}) => Object.assign({
  version: 1, activo: true, frescura: 'al_dia',
  publicadoEn: '2026-09-21T13:00:05.000Z', proximaActualizacion: '2026-09-22T13:00:00.000Z',
  fuente: { id: 'freddie-pmms', nombre: 'Freddie Mac · Primary Mortgage Market Survey', url: 'https://www.freddiemac.com/pmms', frecuencia: 'Semanal, los jueves', mide: 'Promedio nacional semanal' },
  terminos: {
    '30': { valor: 6.95, previo: 6.76, cambioPp: 0.19, fechaFuente: '2026-09-17' },
    '15': { valor: 6.26, previo: 6.09, cambioPp: 0.17, fechaFuente: '2026-09-17' },
  },
  alertas: [],
  fuentesSenal: [{ id: 'tesoro-10a', nombre: 'Tesoro de EE. UU.', mide: 'Rendimiento diario', frecuencia: 'Diaria', url: 'https://home.treasury.gov/' }],
}, extra);
const alerta = (id = 41, extra = {}) => Object.assign({
  id, tipo: 'movimiento_semanal', termino: '30', direccion: 'sube', magnitudPp: 0.19,
  detectadaEn: '2026-09-18T13:00:07Z', fechaFuente: '2026-09-17',
  fuente: { id: 'freddie-pmms', nombre: 'Freddie Mac PMMS', url: 'https://www.freddiemac.com/pmms' }, semanalPendiente: false, datos: null,
}, extra);
const banner = body => body.children.find(c => c.className === 'tasas-aviso');

/* ---------------- antes del lanzamiento ---------------- */
test('con TASAS_LANZADO = false (como está en el repositorio) no pide nada ni pinta nada', async () => {
  const r = await correr({ codigo: codigoReal, conBloque: true, respuesta: snapshot() });
  assert.equal(r.pedidos.length, 0);
  assert.equal(r.porId.tasas.hidden, true);
  assert.equal(r.eventos.length, 0);
  const r2 = await correr({ codigo: codigoReal, conBloque: false, respuesta: snapshot({ alertas: [alerta()] }) });
  assert.equal(r2.pedidos.length, 0);
  assert.equal(banner(r2.body), undefined);
});

/* ---------------- bloque de Comprar casa ---------------- */
test('bloque al día: cifras, cambio, fecha de Freddie Mac, revisión, fuentes y solo eventos categóricos', async () => {
  const r = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: snapshot({ alertas: [alerta()] }) });
  assert.deepEqual(r.pedidos, ['/.netlify/functions/tasas-hipoteca']);
  const $ = id => r.porId[id];
  assert.equal($('tasas').hidden, false);
  assert.equal($('tasas30Valor').textContent, '6.95 %');
  assert.equal($('tasas30Etiqueta').textContent, 'Hipoteca fija a 30 años');
  assert.equal($('tasas30Cambio').textContent, '▲ sube 0.19 puntos porcentuales');
  assert.equal($('tasas30Fecha').textContent, 'publicado por Freddie Mac el 17 sep');
  assert.equal($('tasas15Valor').textContent, '6.26 %');
  assert.equal($('tasasPill').textContent, 'Al día');
  assert.equal($('tasasRevisado').textContent, 'Revisado: lunes 21 sep');
  assert.equal($('tasasProxima').textContent, 'Próxima revisión: martes 22 sep');
  assert.equal($('tasasContenido').hidden, false);
  assert.equal($('tasasMensaje').hidden, true);
  assert.equal($('tasasObsoleto').hidden, true);
  // Avisos y fuentes.
  assert.equal($('tasasAlertas').hidden, false);
  assert.match($('tasasAlertas').textContent, /30 años sube 0\.19 puntos porcentuales/);
  assert.equal($('tasasFuentes').children.length, 2);
  assert.match($('tasasFuentes').textContent, /Freddie Mac/);
  assert.ok($('tasasSoloUna').textContent.length > 20);
  const enlaces = $('tasasFuentes').descendientes().filter(e => e.tag === 'a');
  assert.equal(enlaces.length, 2);
  for (const a of enlaces) {
    assert.equal(a.rel, 'noopener noreferrer');
    assert.equal(a.target, '_blank');
    assert.equal(a.getAttribute('data-umami-event'), 'tasas-fuente-abierta');
  }
  // Ningún banner en la página del bloque.
  assert.equal(banner(r.body), undefined);
  // Analítica: solo nombres de la lista y, como mucho, { tipo } (avisos) o { termino } (casas).
  const nombres = r.eventos.map(e => e[0]);
  assert.ok(nombres.includes('tasas-bloque-visto') && nombres.includes('tasas-alerta-vista'));
  for (const [nombre, datos] of r.eventos) {
    assert.match(nombre, /^tasas-/);
    if (datos) assert.deepEqual(Object.keys(datos), /^tasas-casa/.test(nombre) ? ['termino'] : ['tipo']);
  }
});

test('bloque apagado por el dueño (activo:false): se queda oculto', async () => {
  const r = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: { version: 1, activo: false } });
  assert.equal(r.porId.tasas.hidden, true);
});

test('bloque sin datos: mensaje honesto y ninguna cifra', async () => {
  const r = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: snapshot({ frescura: 'sin_datos', terminos: null, publicadoEn: null }) });
  assert.equal(r.porId.tasas.hidden, false);
  assert.equal(r.porId.tasasContenido.hidden, true);
  assert.equal(r.porId.tasasMensaje.hidden, false);
  assert.match(r.porId.tasasMensaje.textContent, /Todavía no está disponible/);
  assert.doesNotMatch(r.porId.tasasMensaje.textContent, /\d/);
  assert.equal(r.porId.tasasPill.textContent, 'Aún sin datos');
});

test('bloque sin actualizar: conserva las cifras y sus fechas y muestra el aviso', async () => {
  const r = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: snapshot({ frescura: 'sin_actualizar' }) });
  assert.equal(r.porId.tasas30Valor.textContent, '6.95 %');
  assert.equal(r.porId.tasasObsoleto.hidden, false);
  assert.match(r.porId.tasasObsoleto.textContent, /No pudimos actualizar/);
  assert.match(r.porId.tasasObsoleto.textContent, /17 sep/);
  assert.equal(r.porId.tasasPill.textContent, 'Sin actualizar');
});

test('ya lanzado y la función no responde: el bloque se muestra con el mensaje honesto (no un hueco en blanco)', async () => {
  const r = await correr({ codigo: conLanzamiento, conBloque: true, falla: true });
  assert.equal(r.porId.tasas.hidden, false);
  assert.equal(r.porId.tasasContenido.hidden, true);
  assert.equal(r.porId.tasasMensaje.hidden, false);
  assert.equal(r.porId.tasasMensaje.textContent, T.TEXTOS.noDisponible);
});

/* ---------------- banner en las otras páginas ---------------- */
test('con un aviso activo aparece el banner con el texto, el enlace al bloque y el botón de cerrar', async () => {
  const r = await correr({ codigo: conLanzamiento, conBloque: false, respuesta: snapshot({ alertas: [alerta(41)] }) });
  const b = banner(r.body);
  assert.ok(b, 'debe haber banner');
  assert.equal(b.getAttribute('role'), 'status');
  const [texto, enlace, cerrar] = b.children;
  assert.equal(texto.textContent, T.textoBanner(alerta(41)));
  assert.equal(enlace.href, 'comprar-casa.html#tasas');
  assert.equal(cerrar.getAttribute('aria-label'), 'Cerrar aviso');
  assert.ok(r.eventos.some(e => e[0] === 'tasas-aviso-visto'));
});

test('cerrar el banner lo quita y lo recuerda solo en este navegador; un aviso NUEVO vuelve a mostrarse', async () => {
  const almacenamiento = {};
  const r = await correr({ codigo: conLanzamiento, conBloque: false, respuesta: snapshot({ alertas: [alerta(41)] }), almacenamiento });
  banner(r.body).children[2].click();
  assert.equal(banner(r.body), undefined, 'el banner desaparece');
  assert.equal(almacenamiento.themora_tasas_aviso_cerrado, '41');
  assert.ok(r.eventos.some(e => e[0] === 'tasas-aviso-cerrado'));

  const otraPagina = await correr({ codigo: conLanzamiento, conBloque: false, respuesta: snapshot({ alertas: [alerta(41)] }), almacenamiento });
  assert.equal(banner(otraPagina.body), undefined, 'cerrado: no vuelve con la misma alerta');

  const nueva = await correr({ codigo: conLanzamiento, conBloque: false, respuesta: snapshot({ alertas: [alerta(42)] }), almacenamiento });
  assert.ok(banner(nueva.body), 'una alerta nueva sí se muestra');
});

test('sin alertas, apagado o con la función caída: no hay banner y no se lanza ningún error', async () => {
  for (const opciones of [
    { respuesta: snapshot({ alertas: [] }) },
    { respuesta: { version: 1, activo: false } },
    { falla: true },
  ]) {
    const r = await correr({ codigo: conLanzamiento, conBloque: false, ...opciones });
    assert.equal(banner(r.body), undefined);
  }
});

test('si el almacenamiento del navegador está bloqueado, el banner igual se muestra', async () => {
  const r = await correr({ codigo: conLanzamiento, conBloque: false, respuesta: snapshot({ alertas: [alerta(41)] }), almacenamientoRoto: true });
  const b = banner(r.body);
  assert.ok(b);
  assert.doesNotThrow(() => b.children[2].click());
  assert.equal(banner(r.body), undefined, 'cerrar funciona en esta visita aunque no se pueda recordar');
});

test('el banner va en el flujo de la página, después del enlace de saltar al contenido cuando existe', async () => {
  const r = await correr({ codigo: conLanzamiento, conBloque: false, respuesta: snapshot({ alertas: [alerta(41)] }) });
  assert.equal(r.body.children[0].className, 'tasas-aviso', 'sin skip-link va primero');
});

/* =========================================================
   Casas flotantes (specs/006-floating-rate-houses) — US1
   ========================================================= */
const grupoCasas = body => body.children.find(c => c.className === 'casas-flotantes');
const hijoClase = (el, clase) => el.descendientes().find(c => c.className === clase);
const casasDe = body => { const g = grupoCasas(body); return g ? g.children.filter(c => c.className === 'casa') : []; };
const visibles = g => !!g && !g.hidden && !!g.parentNode;

test('casas: antes del lanzamiento no se dibuja nada y no se pide nada', async () => {
  const r = await correr({ codigo: codigoReal, conBloque: true, respuesta: snapshot() });
  assert.equal(grupoCasas(r.body), undefined);
  assert.equal(r.pedidos.length, 0);
});

test('casas: lanzado, dos casas (30 y 15 años) con plazo y tasa visibles, en el grupo accesible', async () => {
  const r = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: snapshot() });
  const g = grupoCasas(r.body);
  assert.ok(g, 'debe existir el grupo .casas-flotantes');
  assert.equal(g.getAttribute('role'), 'group');
  assert.equal(g.getAttribute('aria-label'), T.TEXTOS.casa.grupo);
  const casas = casasDe(r.body);
  assert.deepEqual(casas.map(c => c.getAttribute('data-termino')), ['30', '15']);
  assert.deepEqual(casas.map(c => hijoClase(c, 'casa-plazo').textContent), ['30 años', '15 años']);
  assert.deepEqual(casas.map(c => hijoClase(c, 'casa-valor').textContent), ['6.95 %', '6.26 %']);
  assert.equal(r.body.getAttribute('data-casas'), '1');
  assert.equal(casas[0].getAttribute('aria-controls'), 'casasPanel');
  assert.equal(casas[0].getAttribute('aria-expanded'), 'false');
  assert.ok(casas[0].getAttribute('aria-label').startsWith('Hipoteca fija a 30 años: 6.95 %'));
  assert.ok(g.children.some(c => c.className === 'casas-cerrar'));
});

test('casas: las cifras de las casas son las mismas que las del bloque', async () => {
  const r = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: snapshot() });
  const casas = casasDe(r.body);
  assert.equal(hijoClase(casas[0], 'casa-valor').textContent, r.porId.tasas30Valor.textContent);
  assert.equal(hijoClase(casas[1], 'casa-valor').textContent, r.porId.tasas15Valor.textContent);
});

test('casas: sin la sección #tasas (otra página) no hay casas', async () => {
  const r = await correr({ codigo: conLanzamiento, conBloque: false, respuesta: snapshot() });
  assert.equal(grupoCasas(r.body), undefined);
});

test('casas: activo=false, sin_datos, un solo plazo, red caída', async () => {
  let r = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: { version: 1, activo: false } });
  assert.equal(grupoCasas(r.body), undefined, 'activo=false');
  r = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: snapshot({ frescura: 'sin_datos', terminos: null }) });
  assert.equal(grupoCasas(r.body), undefined, 'sin_datos');
  r = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: snapshot({ terminos: { '30': { valor: 6.95, previo: 6.76, cambioPp: 0.19, fechaFuente: '2026-09-17' } } }) });
  assert.deepEqual(casasDe(r.body).map(c => c.getAttribute('data-termino')), ['30'], 'solo el plazo que tiene lectura');
  r = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: snapshot(), falla: true });
  assert.equal(grupoCasas(r.body), undefined, 'red caída: sin casas y sin excepción');
});

test('casas: se ocultan mientras hay un campo con foco y vuelven al salir', async () => {
  const r = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: snapshot() });
  const g = grupoCasas(r.body);
  assert.equal(visibles(g), true);
  r.disparar('focusin', { target: { tagName: 'INPUT' } });
  assert.equal(g.hidden, true);
  r.disparar('focusout', { target: { tagName: 'INPUT' } });
  assert.equal(g.hidden, false);
  r.disparar('focusin', { target: { tagName: 'SELECT' } });
  assert.equal(g.hidden, true);
  r.disparar('focusout', { target: { tagName: 'SELECT' } });
  r.disparar('focusin', { target: { tagName: 'BUTTON' } });
  assert.equal(g.hidden, false, 'un botón con foco no las oculta');
});

test('casas: se ocultan mientras hay una herramienta a pantalla completa abierta', async () => {
  const dialogo = new El('div');
  dialogo.hidden = false;
  const r = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: snapshot(), dialogos: [dialogo], observador: true });
  const g = grupoCasas(r.body);
  assert.equal(g.hidden, true, 'arranca oculta porque el diálogo está abierto');
  assert.equal(r.observadores.length, 1);
  assert.equal(r.observadores[0].nodos[0][0], dialogo);
  dialogo.hidden = true;
  r.observadores[0].cb();
  assert.equal(g.hidden, false, 'vuelve al cerrarse el diálogo');
});

test('casas: sin MutationObserver no falla', async () => {
  const dialogo = new El('div');
  dialogo.hidden = true;
  const r = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: snapshot(), dialogos: [dialogo] });
  assert.ok(grupoCasas(r.body));
});

test('casas: cerrarlas las oculta, guarda la memoria de la visita y no vuelven en esa visita', async () => {
  const sesion = {};
  const r = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: snapshot(), sesion });
  const g = grupoCasas(r.body);
  g.children.find(c => c.className === 'casas-cerrar').click();
  assert.equal(visibles(g), false);
  assert.equal(sesion.themora_casas_cerradas, '1');
  assert.equal(r.body.getAttribute('data-casas'), undefined);
  const cerradas = r.eventos.filter(e => e[0] === 'tasas-casas-cerradas');
  assert.equal(cerradas.length, 1);
  assert.equal(cerradas[0][1], undefined, 'sin propiedades');
  const r2 = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: snapshot(), sesion });
  assert.equal(grupoCasas(r2.body), undefined, 'con la memoria guardada no se dibujan');
  assert.equal(r2.porId.tasas.hidden, false, 'el bloque fijo sigue mostrando las tasas');
});

test('casas: con el almacenamiento bloqueado cerrar funciona en esa página y nada lanza error', async () => {
  const r = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: snapshot(), sesionRota: true });
  const g = grupoCasas(r.body);
  assert.ok(g);
  g.children.find(c => c.className === 'casas-cerrar').click();
  assert.equal(visibles(g), false);
});

test('casas: tasas-casa-vista se manda una vez por plazo y solo con { termino }', async () => {
  const r = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: snapshot() });
  // Los objetos vienen de otro contexto de vm: se comparan como JSON.
  assert.deepEqual(JSON.parse(JSON.stringify(r.eventos.filter(e => e[0] === 'tasas-casa-vista'))),
    [['tasas-casa-vista', { termino: '30' }], ['tasas-casa-vista', { termino: '15' }]]);
});

/* =========================================================
   Casas flotantes — US2: estado, marca y actualización
   ========================================================= */
const horasAtras = h => new Date(Date.now() - h * 3600 * 1000).toISOString();
const estadoDe = c => hijoClase(c, 'casa-estado');
const marcaDe = c => hijoClase(c, 'casa-marca');

test('casas activas: «Activo» y sin marca cuando la cifra está al día y el agente revisó hace poco', async () => {
  const r = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: snapshot({ ultimaRevisionEn: horasAtras(2) }) });
  const casas = casasDe(r.body);
  assert.deepEqual(casas.map(c => estadoDe(c).textContent), ['Activo', 'Activo']);
  assert.deepEqual(casas.map(c => estadoDe(c).getAttribute('data-estado')), ['activo', 'activo']);
  assert.deepEqual(casas.map(c => marcaDe(c).hidden), [true, true]);
});

test('casas sin actualizar: conservan la cifra y su fecha y dicen «Sin actualizar»', async () => {
  const r = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: snapshot({ frescura: 'sin_actualizar', ultimaRevisionEn: horasAtras(2) }) });
  const casas = casasDe(r.body);
  assert.deepEqual(casas.map(c => estadoDe(c).textContent), ['Sin actualizar', 'Sin actualizar']);
  assert.deepEqual(casas.map(c => hijoClase(c, 'casa-valor').textContent), ['6.95 %', '6.26 %'], 'nunca una cifra inventada');
  assert.ok(casas[0].getAttribute('aria-label').includes('publicado por Freddie Mac el 17 sep'));
});

test('casas: una revisión del agente de hace 72 h las deja «Sin actualizar» aunque la cifra esté al día', async () => {
  const r = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: snapshot({ ultimaRevisionEn: horasAtras(72) }) });
  assert.deepEqual(casasDe(r.body).map(c => estadoDe(c).textContent), ['Sin actualizar', 'Sin actualizar']);
});

test('casas: sin dato de revisión solo se apoyan en la frescura de la cifra', async () => {
  let r = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: snapshot() });
  assert.deepEqual(casasDe(r.body).map(c => estadoDe(c).textContent), ['Activo', 'Activo']);
  r = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: snapshot({ frescura: 'sin_actualizar' }) });
  assert.deepEqual(casasDe(r.body).map(c => estadoDe(c).textContent), ['Sin actualizar', 'Sin actualizar']);
});

test('casas: un aviso del plazo 30 marca solo esa casa', async () => {
  const r = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: snapshot({ alertas: [alerta()] }) });
  const casas = casasDe(r.body);
  assert.equal(marcaDe(casas[0]).hidden, false);
  assert.equal(marcaDe(casas[0]).textContent, 'Aviso');
  assert.equal(marcaDe(casas[1]).hidden, true);
  assert.ok(casas[0].getAttribute('aria-label').includes('Hay un aviso.'));
  assert.equal(casas[1].getAttribute('aria-label').includes('Hay un aviso.'), false);
});

test('casas: una señal del Tesoro o de la Fed marca las dos y NO cambia ninguna cifra', async () => {
  const fed = alerta(42, { tipo: 'fed_objetivo', termino: null, semanalPendiente: true, datos: { desde: '3.75-4.00', hasta: '3.50-3.75' } });
  const r = await correr({ codigo: conLanzamiento, conBloque: true, respuesta: snapshot({ alertas: [fed] }) });
  const casas = casasDe(r.body);
  assert.deepEqual(casas.map(c => marcaDe(c).hidden), [false, false]);
  assert.deepEqual(casas.map(c => hijoClase(c, 'casa-valor').textContent), ['6.95 %', '6.26 %']);
});

test('casas: la actualización cada 15 minutos cambia casas y bloque juntos', async () => {
  const nuevo = snapshot({
    terminos: {
      '30': { valor: 6.81, previo: 6.95, cambioPp: -0.14, fechaFuente: '2026-09-24' },
      '15': { valor: 6.12, previo: 6.26, cambioPp: -0.14, fechaFuente: '2026-09-24' },
    },
  });
  const r = await correr({ codigo: conLanzamiento, conBloque: true, respuestas: [snapshot(), nuevo] });
  assert.equal(r.intervalos.length, 1, 'un solo temporizador');
  assert.equal(r.intervalos[0].ms, 15 * 60 * 1000);
  assert.equal(r.pedidos.length, 1);
  r.intervalos[0].fn();
  await r.esperar();
  assert.equal(r.pedidos.length, 2);
  assert.deepEqual(casasDe(r.body).map(c => hijoClase(c, 'casa-valor').textContent), ['6.81 %', '6.12 %']);
  assert.equal(r.porId.tasas30Valor.textContent, '6.81 %');
  assert.equal(r.porId.tasas15Valor.textContent, '6.12 %');
});

test('casas: si la actualización falla se queda lo último dibujado y no se lanza nada', async () => {
  const r = await correr({ codigo: conLanzamiento, conBloque: true, respuestas: [snapshot(), 'FALLA'] });
  r.intervalos[0].fn();
  await r.esperar();
  assert.equal(r.pedidos.length, 2);
  assert.deepEqual(casasDe(r.body).map(c => hijoClase(c, 'casa-valor').textContent), ['6.95 %', '6.26 %']);
});

test('casas: con la pestaña oculta no se pide nada; al volver tras más de 15 minutos se pide una vez', async () => {
  const r = await correr({ codigo: conLanzamiento, conBloque: true, respuestas: [snapshot(), snapshot()], visibilidad: 'hidden' });
  r.intervalos[0].fn();
  await r.esperar();
  assert.equal(r.pedidos.length, 1, 'oculta: sin petición');
  // Simula que pasó más de 15 minutos desde la última consulta buena.
  const realNow = Date.now;
  try {
    Date.now = () => realNow() + 16 * 60 * 1000;
    r.doc.visibilityState = 'visible';
    r.disparar('visibilitychange');
    await r.esperar();
  } finally { Date.now = realNow; }
  assert.equal(r.pedidos.length, 2, 'al volver, una petición');
});
