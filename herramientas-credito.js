/* ===========================================================================
   Herramientas de cálculo del agente de crédito (spec 016, Fase 1)

   Funciones puras sobre el Reporte normalizado de la spec 013. Calculan datos
   verificables sin interpretarlos. No toca el DOM, no hace llamadas de red,
   no lee el reloj ni guarda nada.
   =========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------ utilidades de valores */
  const tieneValor = (v) => !!(v && v.estado !== 'no_reportado' && v.valor !== undefined && v.valor !== null && v.valor !== '');
  const isoDe = (v) => (tieneValor(v) && v.valor && typeof v.valor.iso === 'string' ? v.valor.iso : '');
  const textoDe = (v) => (tieneValor(v) ? String(v.texto !== undefined ? v.texto : v.valor) : '');
  function refDe(cuenta, campo) {
    const dato = cuenta[campo];
    return { campo, valor: isoDe(dato) || (tieneValor(dato) ? dato.valor : null), origen: dato && dato.origen ? dato.origen : null };
  }

  /* ------------------------------------------------------------ calendario */
  const dos = (n) => String(n).padStart(2, '0');
  const esBisiesto = (a) => a % 4 === 0 && (a % 100 !== 0 || a % 400 === 0);
  function ultimoDiaDelMes(a, m) { return [31, esBisiesto(a) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1] || 0; }
  function parsearIso(iso) {
    if (typeof iso !== 'string') return null;
    const m = iso.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
    if (!m) return null;
    const f = { anio: Number(m[1]), mes: m[2] ? Number(m[2]) : null, dia: m[3] ? Number(m[3]) : null };
    if (f.anio < 1 || (f.mes !== null && (f.mes < 1 || f.mes > 12))) return null;
    if (f.dia !== null && (f.dia < 1 || f.dia > ultimoDiaDelMes(f.anio, f.mes))) return null;
    return f;
  }
  function diasDesdeCivil(a, m, d) {
    a -= m <= 2 ? 1 : 0;
    const era = Math.floor(a / 400), ya = a - era * 400, mp = m + (m > 2 ? -3 : 9);
    const da = Math.floor((153 * mp + 2) / 5) + d - 1;
    return era * 146097 + ya * 365 + Math.floor(ya / 4) - Math.floor(ya / 100) + da - 719468;
  }
  function civilDesdeDias(n) {
    const z = n + 719468, era = Math.floor(z / 146097), de = z - era * 146097;
    const ya = Math.floor((de - Math.floor(de / 1460) + Math.floor(de / 36524) - Math.floor(de / 146096)) / 365);
    let a = ya + era * 400;
    const da = de - (365 * ya + Math.floor(ya / 4) - Math.floor(ya / 100)), mp = Math.floor((5 * da + 2) / 153);
    const d = da - Math.floor((153 * mp + 2) / 5) + 1, m = mp + (mp < 10 ? 3 : -9);
    a += m <= 2 ? 1 : 0;
    return { anio: a, mes: m, dia: d };
  }
  const sumarDias = (f, n) => civilDesdeDias(diasDesdeCivil(f.anio, f.mes, f.dia) + n);
  function sumarMeses(f, n) {
    const indice = f.anio * 12 + f.mes - 1 + n, anio = Math.floor(indice / 12), mes = indice - anio * 12 + 1;
    return { anio, mes, dia: Math.min(f.dia, ultimoDiaDelMes(anio, mes)) };
  }
  const sumarAnios = (f, n) => sumarMeses(f, 12 * n);
  const formatearIso = (f, precision) => String(f.anio).padStart(4, '0') + '-' + dos(f.mes) + (precision === 'dia' ? '-' + dos(f.dia) : '');
  const compararIso = (a, b) => a === b ? 0 : (a < b ? -1 : 1);

  /* ------------------------------------------------------------ validación de uso */
  function exigirHoy(hoy) {
    const f = parsearIso(hoy);
    if (!f || f.mes === null || f.dia === null || hoy.length !== 10) throw new TypeError('hoy_invalido');
    return f;
  }
  function exigirArreglo(x, nombre) { if (!Array.isArray(x)) throw new TypeError(nombre + '_invalido'); }
  function exigirCuenta(c) { if (!c || typeof c !== 'object' || typeof c.id !== 'string' || !c.id) throw new TypeError('cuenta_invalida'); }
  function exigirMeses(m) { if (!Number.isInteger(m) || m < 1 || m > 120) throw new TypeError('meses_invalidos'); }

  /* ------------------------------------------------------------ clasificación de hechos */
  const PATRON_CHARGE_OFF = /charge[\s-]?off|charged[\s-]?off|cargad[ao] a p[eé]rdida/i;
  function esCobranzaOChargeOff(c) {
    return c.esCobranza === true || (c.historial || []).some((h) => h.codigo === 'charge_off') || tieneValor(c.fechaChargeOff) ||
      tieneValor(c.montoChargeOff) || [c.estado, c.estadoPago, c.designadorActividad].some((v) => PATRON_CHARGE_OFF.test(textoDe(v)));
  }
  function normalizarNombre(s) { return String(s == null ? '' : s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function buscarMarcaVendida(c) {
    const candidatos = [];
    (c.comentarios || []).forEach((v) => candidatos.push({ texto: textoDe(v), origen: v.origen || null }));
    [c.estado, c.estadoPago].forEach((v) => { if (v) candidatos.push({ texto: textoDe(v), origen: v.origen || null }); });
    (c.codigosNarrativos || []).forEach((v) => candidatos.push({ texto: String(v.descripcion || ''), origen: v.origen || null }));
    const x = candidatos.find((v) => /\bsold\b|\btransferred\b|vendid[ao]|transferid[ao]/i.test(v.texto));
    return x ? { encontrada: true, texto: x.texto, origen: x.origen } : { encontrada: false, texto: null, origen: null };
  }

  /* ------------------------------------------------------------ fecha de salida */
  const resultadoBase = (id, regla, estado, motivo) => ({ cuentaId: id, regla, estado, motivo, caracter: 'calculo_informativo', fechas: [], omitidos: [], avisos: [] });
  function pasoDeRango(rango, hoy) {
    const mesHoy = hoy.slice(0, 7);
    if (compararIso(rango.hasta, mesHoy) < 0) return true;
    if (compararIso(rango.desde, mesHoy) > 0) return false;
    return 'incierto';
  }
  function calcularFechaSalida(c, opciones) {
    exigirCuenta(c); const hoy = opciones && opciones.hoy; exigirHoy(hoy);
    if (esCobranzaOChargeOff(c)) {
      const iso = isoDe(c.dofd), f = parsearIso(iso);
      if (!f) return resultadoBase(c.id, 'cobranza_o_chargeoff', 'no_calculable', 'falta_dofd');
      if (f.mes === null) return resultadoBase(c.id, 'cobranza_o_chargeoff', 'no_calculable', 'dofd_imprecisa');
      const r = resultadoBase(c.id, 'cobranza_o_chargeoff', 'calculado', null);
      const dofdComparable = f.dia !== null ? iso : iso.slice(0, 7);
      const hoyComparable = f.dia !== null ? hoy : hoy.slice(0, 7);
      if (compararIso(dofdComparable, hoyComparable) > 0) r.avisos.push('dofd_futura');
      const apertura = isoDe(c.fechaApertura);
      if (apertura && compararIso(iso.slice(0, 7), apertura.slice(0, 7)) < 0) r.avisos.push('dofd_antes_de_apertura');
      if (f.dia !== null) {
        const salida = formatearIso(sumarAnios(sumarDias(f, 180), 7), 'dia');
        r.fechas.push({ reglaBase: '7_anos_mas_180_dias', base: refDe(c, 'dofd'), salida, precision: 'dia', estimada: false, motivoEstimacion: null, rango: null, yaPaso: compararIso(salida, hoy) < 0 });
      } else {
        const salida = formatearIso(sumarMeses({ anio: f.anio, mes: f.mes, dia: 1 }, 90), 'mes');
        const desde = formatearIso(sumarAnios(sumarDias({ anio: f.anio, mes: f.mes, dia: 1 }, 180), 7), 'mes');
        const hasta = formatearIso(sumarAnios(sumarDias({ anio: f.anio, mes: f.mes, dia: ultimoDiaDelMes(f.anio, f.mes) }, 180), 7), 'mes');
        const rango = { desde, hasta };
        r.fechas.push({ reglaBase: '7_anos_mas_180_dias', base: refDe(c, 'dofd'), salida, precision: 'mes', estimada: true, motivoEstimacion: 'dofd_sin_dia_exacto', rango, yaPaso: pasoDeRango(rango, hoy) });
      }
      return r;
    }
    const verificables = new Map(), omitidos = [];
    (c.historial || []).filter((h) => /^atraso_\d+$/.test(h.codigo || '')).forEach((h) => {
      if (!h.anio || !h.mes) return;
      const iso = String(h.anio).padStart(4, '0') + '-' + dos(h.mes), referencia = { campo: 'atraso', valor: iso, origen: h.origen || null };
      if (h.mesVerificable === true) verificables.set(iso, referencia); else omitidos.push({ referencia, motivo: 'mes_no_verificable' });
    });
    (c.atrasosListados || []).forEach((v) => { const iso = isoDe(v), f = parsearIso(iso); if (f && f.mes !== null) verificables.set(iso.slice(0, 7), { campo: 'atraso', valor: iso.slice(0, 7), origen: v.origen || null }); });
    if (!verificables.size && !omitidos.length) return resultadoBase(c.id, 'no_aplica', 'no_aplica', null);
    if (!verificables.size) { const r = resultadoBase(c.id, 'atrasos', 'no_calculable', 'sin_atrasos_verificables'); r.omitidos = omitidos; return r; }
    const r = resultadoBase(c.id, 'atrasos', 'calculado', null); r.omitidos = omitidos;
    [...verificables].sort(([a], [b]) => a.localeCompare(b)).forEach(([iso, base]) => {
      const f = parsearIso(iso), salida = formatearIso(sumarMeses({ anio: f.anio, mes: f.mes, dia: 1 }, 84), 'mes'), rango = { desde: salida, hasta: salida };
      r.fechas.push({ reglaBase: '7_anos_desde_atraso', base, salida, precision: 'mes', estimada: true, motivoEstimacion: 'atraso_sin_dia_exacto', rango, yaPaso: pasoDeRango(rango, hoy) });
    });
    return r;
  }

  /* ------------------------------------------------------------ utilización */
  const porcentaje = (saldo, limite) => Math.floor((200 * saldo + limite) / (2 * limite));
  function calcularUtilizacion(cuentas) {
    exigirArreglo(cuentas, 'cuentas'); cuentas.forEach(exigirCuenta);
    const porCuenta = [], excluidas = [];
    cuentas.filter((c) => tieneValor(c.tipo) && c.tipo.valor === 'rotativa').sort((a, b) => a.id.localeCompare(b.id)).forEach((c) => {
      let motivo = null;
      if (c.esCobranza === true) motivo = 'cobranza'; else if (esCobranzaOChargeOff(c)) motivo = 'cargada_a_perdida'; else if (c.cerrada === true) motivo = 'cerrada';
      else if (!tieneValor(c.saldo)) motivo = 'sin_saldo'; else if (c.saldo.valor < 0) motivo = 'saldo_negativo'; else if (!tieneValor(c.limite)) motivo = 'sin_limite'; else if (c.limite.valor === 0) motivo = 'limite_cero';
      if (motivo) { excluidas.push({ cuentaId: c.id, motivo }); return; }
      const saldoC = Math.round(c.saldo.valor * 100), limiteC = Math.round(c.limite.valor * 100);
      porCuenta.push({ cuentaId: c.id, saldo: saldoC / 100, limite: limiteC / 100, porcentaje: porcentaje(saldoC, limiteC), sobreLimite: saldoC > limiteC, responsabilidad: tieneValor(c.responsabilidad) ? c.responsabilidad.valor : null, referencias: { saldo: refDe(c, 'saldo'), limite: refDe(c, 'limite') } });
    });
    if (!porCuenta.length) return { porCuenta, total: null, excluidas };
    const saldoC = porCuenta.reduce((s, c) => s + Math.round(c.saldo * 100), 0), limiteC = porCuenta.reduce((s, c) => s + Math.round(c.limite * 100), 0);
    return { porCuenta, total: { saldo: saldoC / 100, limite: limiteC / 100, porcentaje: porcentaje(saldoC, limiteC), cuentas: porCuenta.length }, excluidas };
  }

  /* ------------------------------------------------------------ posibles duplicados */
  function datoSimple(c, campo) {
    if (campo === 'dofd' || campo === 'fecha_apertura') { const iso = isoDe(c[campo === 'fecha_apertura' ? 'fechaApertura' : campo]); return iso ? iso.slice(0, 7) : null; }
    return campo === 'saldo' && tieneValor(c.saldo) ? c.saldo.valor : null;
  }
  function buscarPosiblesDuplicados(cuentas) {
    exigirArreglo(cuentas, 'cuentas'); cuentas.forEach(exigirCuenta);
    const ordenadas = cuentas.slice().sort((a, b) => a.id.localeCompare(b.id)), resultado = [];
    for (let i = 0; i < ordenadas.length; i++) for (let j = i + 1; j < ordenadas.length; j++) {
      const x = ordenadas[i], y = ordenadas[j], xc = x.esCobranza === true, yc = y.esCobranza === true;
      let tipo = null, a = x, b = y, nombre = '', campoNombre = '';
      if (xc !== yc) {
        a = xc ? y : x; b = xc ? x : y;
        const na = normalizarNombre(textoDe(a.acreedor)), nb = normalizarNombre(textoDe(b.acreedorOriginal));
        if (na && na === nb) { tipo = 'original_y_cobranza'; nombre = na; campoNombre = 'acreedor_original'; }
      } else if (xc && yc) {
        const na = normalizarNombre(textoDe(x.acreedorOriginal)), nb = normalizarNombre(textoDe(y.acreedorOriginal));
        if (na && na === nb) { tipo = 'dos_cobranzas_mismo_original'; nombre = na; campoNombre = 'acreedor_original'; }
      } else {
        const na = normalizarNombre(textoDe(x.acreedor)), nb = normalizarNombre(textoDe(y.acreedor));
        const aa = isoDe(x.fechaApertura).slice(0, 7), ab = isoDe(y.fechaApertura).slice(0, 7);
        if (na && na === nb && aa && aa === ab) { tipo = 'mismo_acreedor_misma_apertura'; nombre = na; campoNombre = 'acreedor'; }
      }
      if (!tipo) continue;
      const coinciden = [campoNombre], difieren = [];
      ['saldo', 'dofd', 'fecha_apertura'].forEach((campo) => { const va = datoSimple(a, campo), vb = datoSimple(b, campo); if (va !== null && vb !== null && va === vb) coinciden.push(campo); else difieren.push({ campo, a: va, b: vb }); });
      resultado.push({ tipo, cuentas: [a.id, b.id], nombreComparado: nombre, coinciden, difieren, ambosConSaldo: datoSimple(a, 'saldo') > 0 && datoSimple(b, 'saldo') > 0, marcaVendida: tipo === 'original_y_cobranza' ? buscarMarcaVendida(a) : null });
    }
    return resultado.sort((a, b) => a.cuentas[0].localeCompare(b.cuentas[0]) || a.cuentas[1].localeCompare(b.cuentas[1]) || a.tipo.localeCompare(b.tipo));
  }

  /* ------------------------------------------------------------ consultas duras */
  function contarConsultasDuras(consultas, opciones) {
    exigirArreglo(consultas, 'consultas');
    const hoy = opciones && opciones.hoy, hoyF = exigirHoy(hoy), meses = opciones && opciones.meses !== undefined ? opciones.meses : 12; exigirMeses(meses);
    const desde = formatearIso(sumarMeses(hoyF, -meses), 'dia');
    const r = { ventana: { desde, hasta: hoy, incluyeDesde: false, incluyeHasta: true }, total: 0, dentro: [], inciertas: [], futuras: [], sinFecha: 0, desconocidas: 0 };
    consultas.forEach((c) => {
      if (!c || c.tipo === 'blanda' || c.tipo === 'promocional' || c.tipo === 'revision_cuenta') return;
      if (c.tipo === 'desconocida') { r.desconocidas++; return; } if (c.tipo !== 'dura') return;
      const iso = isoDe(c.fecha), f = parsearIso(iso); if (!f || f.mes === null) { r.sinFecha++; return; }
      const item = { empresa: tieneValor(c.empresa) ? c.empresa.valor : null, fecha: iso, origen: c.fecha && c.fecha.origen ? c.fecha.origen : null };
      if (f.dia !== null) { if (compararIso(iso, hoy) > 0) r.futuras.push(item); else if (compararIso(iso, desde) > 0) r.dentro.push(item); return; }
      const primero = iso + '-01', ultimo = iso + '-' + dos(ultimoDiaDelMes(f.anio, f.mes));
      if (compararIso(primero, hoy) > 0) r.futuras.push(item); else if (compararIso(primero, desde) > 0 && compararIso(ultimo, hoy) <= 0) r.dentro.push(item);
      else if (compararIso(ultimo, desde) > 0) r.inciertas.push(item);
    });
    const ordenar = (a, b) => b.fecha.localeCompare(a.fecha) || String(a.empresa || '').localeCompare(String(b.empresa || ''));
    r.dentro.sort(ordenar); r.inciertas.sort(ordenar); r.futuras.sort(ordenar); r.total = r.dentro.length; return r;
  }

  /* ------------------------------------------------------------ catálogo y ejecución */
  const CATALOGO = Object.freeze([
    Object.freeze({ nombre: 'calcularFechaSalida', version: '1.0.0', alcance: 'cuenta' }),
    Object.freeze({ nombre: 'calcularUtilizacion', version: '1.0.0', alcance: 'reporte' }),
    Object.freeze({ nombre: 'buscarPosiblesDuplicados', version: '1.0.0', alcance: 'reporte' }),
    Object.freeze({ nombre: 'contarConsultasDuras', version: '1.0.0', alcance: 'reporte' })
  ]);
  function ejecutar(nombre, reporte, opciones) {
    if (!CATALOGO.some((x) => x.nombre === nombre)) throw new TypeError('herramienta_desconocida');
    if (!reporte || typeof reporte !== 'object') throw new TypeError('reporte_invalido');
    const opts = opciones || {};
    if (nombre === 'calcularFechaSalida') {
      exigirArreglo(reporte.cuentas, 'cuentas'); reporte.cuentas.forEach(exigirCuenta);
      if (opts.cuentaId !== undefined) { const c = reporte.cuentas.find((x) => x.id === opts.cuentaId); if (!c) throw new TypeError('cuenta_no_encontrada'); return calcularFechaSalida(c, opts); }
      return reporte.cuentas.slice().sort((a, b) => a.id.localeCompare(b.id)).map((c) => calcularFechaSalida(c, opts));
    }
    if (nombre === 'calcularUtilizacion') return calcularUtilizacion(reporte.cuentas);
    if (nombre === 'buscarPosiblesDuplicados') return buscarPosiblesDuplicados(reporte.cuentas);
    return contarConsultasDuras(reporte.consultas, opts);
  }
  const api = { CATALOGO, ejecutar, calcularFechaSalida, calcularUtilizacion, buscarPosiblesDuplicados, contarConsultasDuras };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ThemoraHerramientas = api;
}());
