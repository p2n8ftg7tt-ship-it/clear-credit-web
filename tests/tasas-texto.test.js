/* Pruebas del texto que ve la gente (tasas-texto.js): formato de cifras, textos
   del bloque, avisos y banner, y —lo más importante— que ninguna frase generada
   dé un consejo, haga una predicción ni meta prisa (constitución, Principio I).
   Correr con:  node --test tests/*.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');

const T = require('../tasas-texto.js');
const L = require('../netlify/functions/tasas-hipoteca-logica.js');

// Junta todas las cadenas de un valor (objeto, lista o texto).
function cadenas(v, salida = []) {
  if (typeof v === 'string') salida.push(v);
  else if (Array.isArray(v)) v.forEach(x => cadenas(x, salida));
  else if (v && typeof v === 'object') Object.values(v).forEach(x => cadenas(x, salida));
  return salida;
}
function sinProhibidas(lista, etiqueta) {
  for (const s of lista) {
    assert.equal(T.contieneProhibida(s), null, `${etiqueta}: «${s}» contiene una palabra prohibida (${T.contieneProhibida(s)})`);
  }
}

/* ---------------- formato ---------------- */
test('formatoTasa usa dos decimales; formatoPp muestra hasta tres sin ceros de sobra', () => {
  assert.equal(T.formatoTasa(6.95), '6.95');
  assert.equal(T.formatoTasa(4), '4.00');
  assert.equal(T.formatoPp(0.125), '0.125');
  assert.equal(T.formatoPp(0.19), '0.19');
  assert.equal(T.formatoPp(0.1), '0.1');
  assert.equal(T.formatoPp(-0.17), '0.17', 'el tamaño siempre es positivo; la dirección va en palabras');
});

test('fechaCorta escribe día y mes abreviado sin desplazar por zona horaria', () => {
  assert.equal(T.fechaCorta('2026-09-17'), '17 sep');
  assert.equal(T.fechaCorta('2026-09-05T13:00:00Z'), '5 sep');
  assert.equal(T.fechaCorta('2026-01-31'), '31 ene');
  assert.equal(T.fechaCorta(null), '');
});

/* ---------------- bloque (US1) ---------------- */
test('textoCifra da la etiqueta del plazo y el valor tal cual', () => {
  assert.deepEqual(T.textoCifra('30', { valor: 6.95 }), { etiqueta: 'Hipoteca fija a 30 años', valor: '6.95 %' });
  assert.deepEqual(T.textoCifra('15', { valor: 6.26 }), { etiqueta: 'Hipoteca fija a 15 años', valor: '6.26 %' });
});

test('textoCambio: sube / baja / sin cambio, con puntos porcentuales', () => {
  assert.equal(T.textoCambio(0.19), '▲ sube 0.19 puntos porcentuales');
  assert.equal(T.textoCambio(-0.17), '▼ baja 0.17 puntos porcentuales');
  assert.equal(T.textoCambio(0), '= sin cambio');
});

test('textoFechaFuente dice que lo publicó Freddie Mac y cuándo', () => {
  assert.equal(T.textoFechaFuente('2026-09-17'), 'publicado por Freddie Mac el 17 sep');
});

test('el aviso legal está completo y dice que no es oferta ni aprobación', () => {
  assert.equal(T.TEXTOS.avisoLegal,
    'Promedios nacionales de referencia para fines educativos. No son una oferta, una aprobación ni la tasa que te darían a ti.');
});

test('los textos fijos tienen etiquetas para las tres frescuras', () => {
  assert.equal(T.pillTexto('al_dia'), 'Al día');
  assert.equal(T.pillTexto('sin_actualizar'), 'Sin actualizar');
  assert.equal(T.pillTexto('sin_datos'), 'Aún sin datos');
});

/* ---------------- frescura (US2) ---------------- */
test('el aviso de "sin actualizar" aparece solo cuando toca y nombra la fecha original', () => {
  const t = T.textoFrescura('sin_actualizar', { fechaFuente: '2026-09-17' });
  assert.match(t, /No pudimos actualizar/);
  assert.match(t, /17 sep/);
  assert.equal(T.textoFrescura('al_dia', {}), '');
});

test('el estado vacío no contiene ninguna cifra', () => {
  const t = T.textoFrescura('sin_datos', {});
  assert.match(t, /Todavía no está disponible/);
  assert.doesNotMatch(t, /\d/);
});

test('próxima revisión y revisado nombran el día', () => {
  assert.equal(T.textoProximaRevision('2026-09-22T13:00:00.000Z'), 'Próxima revisión: martes 22 sep');
  assert.equal(T.textoRevisado('2026-09-21T13:00:05Z'), 'Revisado: lunes 21 sep');
});

/* ---------------- alertas y banner (US3) ---------------- */
const alerta = (o) => Object.assign({
  id: 1, tipo: 'movimiento_semanal', termino: '30', direccion: 'sube', magnitudPp: 0.19,
  detectadaEn: '2026-09-18T13:00:07Z', fechaFuente: '2026-09-17',
  fuente: { id: 'freddie-pmms', nombre: 'Freddie Mac PMMS', url: 'https://www.freddiemac.com/pmms' },
  semanalPendiente: false, datos: null,
}, o);

test('alerta semanal: plazo, dirección, tamaño, fecha y fuente', () => {
  const t = T.textoAlerta(alerta({}));
  assert.match(t, /30 años/);
  assert.match(t, /sube/);
  assert.match(t, /0\.19 puntos porcentuales/);
  assert.match(t, /Freddie Mac/);
  assert.match(t, /17 sep/);
  assert.match(t, /18 sep/, 'la fecha de detección');
  assert.match(T.textoBanner(alerta({ direccion: 'baja', termino: '15', magnitudPp: 0.26 })), /15 años.*baja.*0\.26/);
});

test('alerta del Tesoro: dice que el promedio semanal de Freddie Mac aún no se republicó', () => {
  const a = alerta({ tipo: 'tesoro_10a', termino: null, magnitudPp: 0.13, semanalPendiente: true,
    fuente: { id: 'tesoro-10a', nombre: 'Tesoro de EE. UU.', url: 'https://home.treasury.gov/' } });
  for (const t of [T.textoAlerta(a), T.textoBanner(a)]) {
    assert.match(t, /Tesoro a 10 años/);
    assert.match(t, /0\.13 puntos porcentuales/);
    assert.match(t, /todavía no se ha vuelto a publicar/);
    assert.match(t, /Freddie Mac/);
  }
});

test('alerta de la Fed: hecho, rango anterior y nuevo, y aclara que la Fed no fija las tasas hipotecarias', () => {
  const a = alerta({ tipo: 'fed_objetivo', termino: null, direccion: 'sube', magnitudPp: 0.25, semanalPendiente: true,
    datos: { desde: '3.50–3.75', hasta: '3.75–4.00' },
    fuente: { id: 'nyfed-objetivo', nombre: 'Reserva Federal', url: 'https://www.federalreserve.gov/' } });
  for (const t of [T.textoAlerta(a), T.textoBanner(a)]) {
    assert.match(t, /Reserva Federal/);
    assert.match(t, /3\.50–3\.75/);
    assert.match(t, /3\.75–4\.00/);
    assert.match(t, /no las fija directamente la Reserva Federal/);
    assert.match(t, /todavía no se ha vuelto a publicar/);
  }
});

test('el banner es de una sola línea y corto', () => {
  const variantes = [];
  for (const tipo of ['movimiento_semanal', 'tesoro_10a', 'fed_objetivo']) {
    for (const direccion of ['sube', 'baja']) {
      for (const termino of tipo === 'movimiento_semanal' ? ['30', '15'] : [null]) {
        variantes.push(alerta({ tipo, direccion, termino, semanalPendiente: tipo !== 'movimiento_semanal',
          datos: tipo === 'fed_objetivo' ? { desde: '3.50–3.75', hasta: '3.75–4.00' } : null }));
      }
    }
  }
  for (const a of variantes) {
    const b = T.textoBanner(a);
    assert.ok(!/\n/.test(b), 'sin saltos de línea');
    assert.ok(b.length < 240, `banner de ${b.length} caracteres: ${b}`);
  }
});

test('ninguna frase generada da consejos, predicciones ni prisa (SC-006)', () => {
  const todas = [];
  for (const tipo of ['movimiento_semanal', 'tesoro_10a', 'fed_objetivo']) {
    for (const direccion of ['sube', 'baja']) {
      for (const termino of tipo === 'movimiento_semanal' ? ['30', '15'] : [null]) {
        const a = alerta({ tipo, direccion, termino, semanalPendiente: tipo !== 'movimiento_semanal',
          datos: tipo === 'fed_objetivo' ? { desde: '3.50–3.75', hasta: '3.75–4.00' } : null });
        todas.push(T.textoAlerta(a), T.textoBanner(a));
      }
    }
  }
  sinProhibidas(todas, 'alertas');
  sinProhibidas(cadenas(T.TEXTOS), 'TEXTOS');
  sinProhibidas([T.textoCambio(0.19), T.textoCambio(-0.1), T.textoCambio(0), T.textoFechaFuente('2026-09-17'),
    T.textoFrescura('sin_actualizar', { fechaFuente: '2026-09-17' }), T.textoFrescura('sin_datos', {}),
    T.textoProximaRevision('2026-09-22T13:00:00Z'), T.textoRevisado('2026-09-21T13:00:00Z'),
    T.pillTexto('al_dia'), T.pillTexto('sin_actualizar'), T.pillTexto('sin_datos')], 'bloque');
});

test('el detector de palabras prohibidas funciona (positivos y falsos positivos)', () => {
  assert.notEqual(T.contieneProhibida('Es un buen momento para comprar'), null);
  assert.notEqual(T.contieneProhibida('Las tasas bajarán pronto'), null);
  assert.notEqual(T.contieneProhibida('Te garantizamos la mejor tasa'), null);
  assert.notEqual(T.contieneProhibida('Espera a que baje'), null);
  assert.notEqual(T.contieneProhibida('Lock now before it is too late'), null);
  assert.equal(T.contieneProhibida('La tasa a 30 años sube 0.19 puntos porcentuales'), null);
  assert.equal(T.contieneProhibida('La esperanza de vida no es una palabra prohibida'), null, 'espera ≠ esperanza');
  assert.equal(T.contieneProhibida('No pudimos actualizar las tasas'), null);
});

/* ---------------- fuentes (US4) ---------------- */
test('textoFuentes da una entrada por fuente con lo que mide y cada cuánto sale', () => {
  const f = T.textoFuentes(L.FUENTES);
  assert.equal(f.length, L.FUENTES.length);
  for (const x of f) {
    for (const campo of ['nombre', 'mide', 'frecuencia', 'url']) assert.ok(x[campo] && x[campo].length > 3, campo);
  }
  sinProhibidas(cadenas(f), 'fuentes');
  assert.ok(T.TEXTOS.soloUnaFuente.length > 20);
  sinProhibidas([T.TEXTOS.soloUnaFuente], 'soloUnaFuente');
});

/* ---------------- casas flotantes: base (specs/006-floating-rate-houses) ---------------- */
test('las cifras semanales nunca se presentan «en vivo»: la lista prohibida trae las cuatro expresiones', () => {
  for (const p of ['en vivo', 'en tiempo real', 'live', 'real time']) {
    assert.ok(T.PALABRAS_PROHIBIDAS.includes(p), `falta «${p}» en PALABRAS_PROHIBIDAS`);
  }
  assert.notEqual(T.contieneProhibida('la tasa en vivo'), null);
  assert.notEqual(T.contieneProhibida('tasa en tiempo real'), null);
  assert.notEqual(T.contieneProhibida('live'), null);
  assert.notEqual(T.contieneProhibida('real time'), null);
  assert.equal(T.contieneProhibida('deliver alive'), null, 'no debe confundir palabras que solo contienen «live»');
});

test('los textos fijos de las casas están limpios y REVISION_ATRASADA_HORAS es 48', () => {
  assert.equal(T.REVISION_ATRASADA_HORAS, 48);
  assert.ok(T.TEXTOS.casa && typeof T.TEXTOS.casa === 'object');
  const textos = cadenas(T.TEXTOS.casa);
  assert.ok(textos.length >= 14, 'deben existir los textos fijos de las casas');
  sinProhibidas(textos, 'TEXTOS.casa');
  assert.equal(T.TEXTOS.casa.cerrar, 'Ocultar las casas de tasas');
});

/* ---------------- casas flotantes: textoCasa (US1) ---------------- */
test('textoCasa: plazo, tasa, cambio y fecha son EXACTAMENTE los del bloque (una sola verdad)', () => {
  const dato = { valor: 6.95, previo: 6.76, cambioPp: 0.19, fechaFuente: '2026-09-17' };
  const c = T.textoCasa('30', dato);
  assert.equal(c.plazo, '30 años');
  assert.equal(c.valor, '6.95 %');
  assert.equal(c.cambio, '▲ sube 0.19 puntos porcentuales');
  assert.equal(c.fecha, 'publicado por Freddie Mac el 17 sep');
  assert.equal(c.valor, T.textoCifra('30', dato).valor);
  assert.equal(c.cambio, T.textoCambio(dato.cambioPp));
  assert.equal(c.fecha, T.textoFechaFuente(dato.fechaFuente));
  assert.ok(c.nombreAccesible.startsWith('Hipoteca fija a 30 años: 6.95 %,'), c.nombreAccesible);
  assert.ok(c.nombreAccesible.endsWith('Abrir detalles.'), c.nombreAccesible);
  sinProhibidas(cadenas(c), 'textoCasa 30');
});

test('textoCasa para 15 años y para «sin cambio»', () => {
  const c = T.textoCasa('15', { valor: 6.26, previo: 6.26, cambioPp: 0, fechaFuente: '2026-09-17' });
  assert.equal(c.plazo, '15 años');
  assert.equal(c.valor, '6.26 %');
  assert.equal(c.cambio, '= sin cambio');
  assert.ok(c.nombreAccesible.startsWith('Hipoteca fija a 15 años: 6.26 %,'));
  sinProhibidas(cadenas(c), 'textoCasa 15');
});

/* ---------------- casas flotantes: estado y marca (US2) ---------------- */
const AHORA_CASA = new Date('2026-09-24T15:00:00Z');
const horasAntes = h => new Date(AHORA_CASA.getTime() - h * 3600 * 1000).toISOString();

test('estadoCasa: activo solo con cifra al día Y revisión reciente (< 48 h) o desconocida', () => {
  assert.equal(T.estadoCasa({ frescura: 'al_dia', ultimaRevisionEn: horasAntes(2) }, AHORA_CASA), 'activo');
  assert.equal(T.estadoCasa({ frescura: 'al_dia', ultimaRevisionEn: horasAntes(47.9) }, AHORA_CASA), 'activo');
  assert.equal(T.estadoCasa({ frescura: 'al_dia', ultimaRevisionEn: null }, AHORA_CASA), 'activo', 'sin dato de revisión: no se afirma más que frescura');
  assert.equal(T.estadoCasa({ frescura: 'al_dia' }, AHORA_CASA), 'activo');
});

test('estadoCasa: sin_actualizar con revisión vieja, en el límite de 48 h o con la cifra sin actualizar', () => {
  assert.equal(T.estadoCasa({ frescura: 'al_dia', ultimaRevisionEn: horasAntes(72) }, AHORA_CASA), 'sin_actualizar');
  assert.equal(T.estadoCasa({ frescura: 'al_dia', ultimaRevisionEn: horasAntes(48) }, AHORA_CASA), 'sin_actualizar', 'a las 48 h exactas ya no es activo');
  assert.equal(T.estadoCasa({ frescura: 'sin_actualizar', ultimaRevisionEn: horasAntes(1) }, AHORA_CASA), 'sin_actualizar');
  assert.equal(T.estadoCasa({ frescura: 'al_dia', ultimaRevisionEn: 'no es una fecha' }, AHORA_CASA), 'activo', 'una fecha ilegible equivale a desconocida');
});

test('marcaDeAlerta: por plazo, y ambos plazos con alertas del Tesoro o de la Fed', () => {
  const a30 = { tipo: 'movimiento_semanal', termino: '30' };
  const a15 = { tipo: 'movimiento_semanal', termino: '15' };
  const fed = { tipo: 'fed_objetivo', termino: null };
  const tes = { tipo: 'tesoro_10a', termino: null };
  assert.equal(T.marcaDeAlerta({ alertas: [a30] }, '30'), true);
  assert.equal(T.marcaDeAlerta({ alertas: [a30] }, '15'), false);
  assert.equal(T.marcaDeAlerta({ alertas: [a15] }, '15'), true);
  assert.equal(T.marcaDeAlerta({ alertas: [fed] }, '30'), true);
  assert.equal(T.marcaDeAlerta({ alertas: [fed] }, '15'), true);
  assert.equal(T.marcaDeAlerta({ alertas: [tes] }, '15'), true);
  assert.equal(T.marcaDeAlerta({ alertas: [] }, '30'), false);
  assert.equal(T.marcaDeAlerta({}, '30'), false);
  assert.equal(T.marcaDeAlerta(null, '30'), false);
});

test('textoCasa con contexto: texto del estado, marca y nombre accesible', () => {
  const dato = { valor: 6.95, previo: 6.76, cambioPp: 0.19, fechaFuente: '2026-09-17' };
  const activa = T.textoCasa('30', dato, { estado: 'activo', marca: false });
  assert.equal(activa.estado, 'Activo');
  assert.equal(activa.marca, '');
  assert.ok(activa.nombreAccesible.includes('Estado: activo.'), activa.nombreAccesible);
  assert.equal(activa.nombreAccesible.includes('Hay un aviso.'), false);
  const vieja = T.textoCasa('30', dato, { estado: 'sin_actualizar', marca: true });
  assert.equal(vieja.estado, 'Sin actualizar');
  assert.equal(vieja.marca, 'Aviso');
  assert.ok(vieja.nombreAccesible.includes('Estado: sin actualizar.'));
  assert.ok(vieja.nombreAccesible.includes('Hay un aviso.'));
  assert.ok(vieja.nombreAccesible.endsWith('Abrir detalles.'));
  assert.equal(vieja.valor, '6.95 %', 'estar sin actualizar no cambia la cifra');
  sinProhibidas(cadenas([activa, vieja]), 'textoCasa con contexto');
  const sola = T.textoCasa('30', dato);
  assert.equal(sola.estado, '');
  assert.equal(sola.marca, '');
});
