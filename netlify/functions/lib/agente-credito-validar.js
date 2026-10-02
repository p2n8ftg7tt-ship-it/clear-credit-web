/* =========================================================
   Validación del agente de crédito (spec 017).
   - barreraDatosPersonales: segunda línea de defensa; si algo parece un dato
     personal, no se manda a la IA (FR-004).
   - validarResultado: el resultado de la IA se revisa antes de mostrarlo
     (FR-017 a FR-020). Funciones puras, sin red.
   ========================================================= */
'use strict';

const sinTildes = (s) => String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/* ------------------------------------------------ barrera de datos personales */
const CLAVES_PROHIBIDAS = new Set(['numero', 'contacto', 'ssn', 'ssnUltimos4', 'fechaNacimiento']);

function revisarTexto(s) {
  if (/\b\d{3}[-\s.]\d{2}[-\s.]\d{4}\b/.test(s)) return 'ssn';
  if (/\d{9,}/.test(s)) return 'numero_largo';
  if (/[^\s@"]+@[^\s@"]+\.[a-z]{2,}/i.test(s)) return 'correo';
  if (/(date of birth|\bdob\b|fecha de nacimiento|nacimiento)\W{0,5}\d/i.test(s)) return 'fecha_nacimiento';
  return null;
}

function barreraDatosPersonales(valor) {
  let texto;
  try { texto = JSON.stringify(valor); } catch (_) { return { ok: false, motivo: 'no_serializable' }; }
  if (texto === undefined) return { ok: false, motivo: 'no_serializable' };
  if (texto.length > 60 * 1024) return { ok: false, motivo: 'muy_grande' };
  let motivo = null;
  (function recorrer(v) {
    if (motivo) return;
    if (typeof v === 'string') { motivo = revisarTexto(v); return; }
    if (Array.isArray(v)) { v.forEach(recorrer); return; }
    if (v && typeof v === 'object') {
      Object.keys(v).forEach((k) => {
        if (!motivo && CLAVES_PROHIBIDAS.has(k)) motivo = 'clave_prohibida';
        recorrer(v[k]);
      });
    }
  })(valor);
  return motivo ? { ok: false, motivo } : { ok: true };
}

/* ------------------------------------------------ palabras prohibidas (FR-020) */
const PROHIBIDAS = [
  ['ilegal', /\bilegal(es)?\b/],
  ['violacion', /\bviolacion(es)?\b/],
  ['debe_eliminarse', /\bdeben? (eliminarse|borrarse|eliminarla|eliminarlo|borrarla|borrarlo)\b/],
  ['tienen_que_borrar', /\btienen que (borrar|eliminar)\b/],
  ['garantiza', /\bgarantiz\w*/],
  ['promesa_puntaje', /\b(subir|aumentar|mejorar)a\w* (tu|su|el) (puntaje|score)\b/],
  ['debes', /\bdebes\b/],
  ['tienes_que', /\btienes que\b/],
  ['fraude', /\bfraude\b/]
];

function palabrasProhibidas(texto) {
  const t = sinTildes(texto).replace(/\balertas? de fraude\b/g, ' ');
  const halladas = PROHIBIDAS.filter(([, re]) => re.test(t)).map(([codigo]) => codigo);
  const m = /(puntaje|score)\D{0,20}\b(\d{3})\b|\b(\d{3})\b\D{0,20}(puntaje|score)/.exec(t);
  if (m) {
    const n = Number(m[2] || m[3]);
    if (n >= 300 && n <= 850) halladas.push('numero_de_puntaje');
  }
  return halladas;
}

/* ------------------------------------------------ números con fuente (FR-019d) */
const ISO = /^\d{4}-\d{2}(-\d{2})?$/;
const normalNumero = (n) => String(Math.round(Number(n) * 100) / 100);

function numerosDelDato(dato) {
  const halla = [];
  let t = String(dato);
  let m;
  const montos = /\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/g;
  while ((m = montos.exec(t))) halla.push({ tipo: 'numero', valor: normalNumero(m[1].replace(/,/g, '') + (m[2] ? '.' + m[2] : '')), texto: m[0] });
  const pct = /(\d+(?:[.,]\d+)?)\s?%/g;
  while ((m = pct.exec(t))) halla.push({ tipo: 'numero', valor: normalNumero(m[1].replace(',', '.')), texto: m[0] });
  const iso = /\b\d{4}-\d{2}(?:-\d{2})?\b/g;
  while ((m = iso.exec(t))) halla.push({ tipo: 'fecha', valor: m[0], texto: m[0] });
  t = t.replace(/\b(\d{2})\/(\d{2})\/(\d{4})\b/g, (x, mm, dd, aaaa) => { halla.push({ tipo: 'fecha', valor: aaaa + '-' + mm + '-' + dd, texto: x }); return ' '; });
  const mesAnio = /\b(\d{2})\/(\d{4})\b/g;
  while ((m = mesAnio.exec(t))) halla.push({ tipo: 'fecha', valor: m[2] + '-' + m[1], texto: m[0] });
  return halla;
}

function valoresPermitidos(etiquetado, resultados) {
  const numeros = new Set(), fechas = new Set();
  (function recorrer(v) {
    if (typeof v === 'number' && isFinite(v)) numeros.add(normalNumero(v));
    else if (typeof v === 'string' && ISO.test(v)) { fechas.add(v); fechas.add(v.slice(0, 7)); }
    else if (Array.isArray(v)) v.forEach(recorrer);
    else if (v && typeof v === 'object') Object.keys(v).forEach((k) => recorrer(v[k]));
  })([etiquetado, resultados]);
  return { numeros, fechas };
}

/* ------------------------------------------------ forma del resultado (FR-017, FR-018) */
const TIPOS_PASO = new Set(['disputar', 'pagar', 'esperar', 'proteger', 'revisar']);
const esTexto = (x) => typeof x === 'string' && x.trim().length > 0;
const esListaDeTextos = (x) => Array.isArray(x) && x.every((s) => typeof s === 'string');
const mismasClaves = (o, claves) => !!o && typeof o === 'object' && !Array.isArray(o) &&
  Object.keys(o).sort().join(',') === claves.slice().sort().join(',');

function revisarForma(r) {
  if (!mismasClaves(r, ['diagnostico', 'plan', 'despues', 'preguntasParaTi', 'verificar', 'datosPersonales'])) return ['forma:campos'];
  const p = [];
  if (!esTexto(r.diagnostico)) p.push('forma:diagnostico');
  if (!Array.isArray(r.plan)) p.push('forma:plan');
  ['despues', 'preguntasParaTi', 'verificar'].forEach((k) => { if (!esListaDeTextos(r[k])) p.push('forma:' + k); });
  if (!Array.isArray(r.datosPersonales) || !r.datosPersonales.every((d) => mismasClaves(d, ['etiqueta', 'razon']) && esTexto(d.etiqueta) && esTexto(d.razon))) p.push('forma:datosPersonales');
  (Array.isArray(r.plan) ? r.plan : []).forEach((paso, i) => {
    const bien = mismasClaves(paso, ['tipo', 'cuentas', 'hechos', 'interpretacion', 'accion']) && TIPOS_PASO.has(paso.tipo) &&
      esListaDeTextos(paso.cuentas) && esTexto(paso.interpretacion) && esTexto(paso.accion) && Array.isArray(paso.hechos) &&
      paso.hechos.every((h) => mismasClaves(h, ['cuenta', 'dato', 'fuente']) && typeof h.cuenta === 'string' && esTexto(h.dato) && (h.fuente === 'reporte' || h.fuente === 'herramienta'));
    if (!bien) p.push('forma:plan[' + i + ']');
  });
  return p;
}

const contarOraciones = (t) => String(t).split(/[.!?]+(?=\s|$)/).map((s) => s.trim()).filter(Boolean).length;

function validarResultado(resultado, contexto) {
  const forma = revisarForma(resultado);
  if (forma.length) return { ok: false, problemas: forma };
  const problemas = [];
  const etiquetado = (contexto && contexto.etiquetado) || { cuentas: [], identidad: {} };
  const letras = new Set((etiquetado.cuentas || []).map((c) => c.letra));
  const id = etiquetado.identidad || {};
  const etiquetas = new Set([].concat(id.nombres || [], id.direcciones || [], id.telefonos || []).map((x) => x.etiqueta));
  const oraciones = contarOraciones(resultado.diagnostico);
  if (oraciones < 3 || oraciones > 5) problemas.push('diagnostico_oraciones:' + oraciones);
  if (resultado.plan.length > 3) problemas.push('plan_mas_de_3');
  const { numeros, fechas } = valoresPermitidos(etiquetado, (contexto && contexto.resultadosHerramientas) || []);
  resultado.plan.forEach((paso) => {
    paso.cuentas.concat(paso.hechos.map((h) => h.cuenta).filter(Boolean)).forEach((l) => {
      if (!letras.has(l)) problemas.push('cuenta_inexistente:' + l);
    });
    paso.hechos.forEach((h) => numerosDelDato(h.dato).forEach((x) => {
      const conFuente = x.tipo === 'numero' ? numeros.has(x.valor) : fechas.has(x.valor);
      if (!conFuente) problemas.push('numero_sin_fuente:' + x.texto);
    }));
  });
  resultado.datosPersonales.forEach((d) => { if (!etiquetas.has(d.etiqueta)) problemas.push('etiqueta_inexistente:' + d.etiqueta); });
  const textos = [resultado.diagnostico].concat(
    resultado.despues, resultado.preguntasParaTi, resultado.verificar,
    resultado.plan.reduce((a, p) => a.concat([p.interpretacion, p.accion], p.hechos.map((h) => h.dato)), []),
    resultado.datosPersonales.map((d) => d.razon));
  textos.forEach((t) => palabrasProhibidas(t).forEach((c) => problemas.push('palabra_prohibida:' + c)));
  const unicos = Array.from(new Set(problemas));
  return { ok: unicos.length === 0, problemas: unicos };
}

module.exports = { barreraDatosPersonales, palabrasProhibidas, numerosDelDato, validarResultado };
