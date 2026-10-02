/* ===========================================================================
   Agente de crédito con IA — lado del navegador (spec 017)

   1. etiquetarReporte: convierte el Reporte normalizado (spec 013) en una
      versión SIN datos personales (FR-001 a FR-003). Es lo único que sale
      del dispositivo.
   2. analizarConAgente (Task 6): dirige el ciclo con la función de Netlify y
      corre aquí las herramientas de la spec 016.
   3. analisisLocal (Task 6): el respaldo sin IA (Principio III).

   No toca el DOM, no guarda nada y no envía analítica.
   =========================================================================== */
(function () {
  'use strict';

  const H = (typeof window !== 'undefined' && window.ThemoraHerramientas) ? window.ThemoraHerramientas
    : (typeof require === 'function' ? require('./herramientas-credito.js') : null);
  const URL_FUNCION = '/.netlify/functions/agente-credito';
  const MAX_VUELTAS = 6;

  /* ------------------------------------------------------------ utilidades */
  const tieneValor = (v) => !!(v && v.estado !== 'no_reportado' && v.valor !== undefined && v.valor !== null && v.valor !== '');
  function simple(v) {
    if (!tieneValor(v)) return null;
    if (v.valor && typeof v.valor === 'object' && typeof v.valor.iso === 'string') return v.valor.iso;
    return v.valor;
  }

  /* Correos, teléfonos y series de números (cuentas, SSN) nunca salen. */
  function limpiarTexto(s) {
    return String(s)
      .replace(/[^\s@]+@[^\s@]+\.[a-z]{2,}/gi, '[correo]')
      .replace(/\(?\b\d{3}\)?[-\s.]?\d{3}[-\s.]\d{4}\b/g, '[teléfono]')
      .replace(/\b\d{3}[-\s.]?\d{2}[-\s.]?\d{4}\b/g, '[número]')
      .replace(/\d{5,}/g, '[número]');
  }
  function limpiarProfundo(x) {
    if (typeof x === 'string') return limpiarTexto(x);
    if (Array.isArray(x)) return x.map(limpiarProfundo);
    if (x && typeof x === 'object') {
      const copia = {};
      Object.keys(x).forEach((k) => { copia[k] = limpiarProfundo(x[k]); });
      return copia;
    }
    return x;
  }

  /* A, B, … Z, AA, AB, … */
  function letra(i) {
    let n = i + 1, s = '';
    while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
    return s;
  }

  /* ------------------------------------------------------------ identidad (FR-003) */
  const normal = (s) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

  function difNombre(base, otro) {
    if (normal(base) === normal(otro)) {
      return String(base).trim().toUpperCase() === String(otro).trim().toUpperCase() ? ['igual'] : ['solo_inicial_o_tilde'];
    }
    const a = normal(base).split(' '), b = normal(otro).split(' ');
    const dif = [];
    if (a[0] !== b[0]) dif.push('nombre_de_pila_distinto');
    if (a[a.length - 1] !== b[b.length - 1]) dif.push('apellido_distinto');
    return dif.length ? dif : ['solo_inicial_o_tilde'];
  }

  const estadoDe = (dir) => { const m = normal(dir).match(/\b([A-Z]{2}) \d{5}\b/); return m ? m[1] : null; };
  const soloDigitos = (t) => String(t).replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');

  function etiquetarIdentidad(id) {
    id = id || {};
    const nombres = (id.nombres || []).filter(tieneValor).map((v) => String(v.valor));
    const dirs = (id.direcciones || []).filter(tieneValor);
    const tels = (id.telefonos || []).filter(tieneValor).map((v) => soloDigitos(v.valor));
    const estado1 = dirs.length ? estadoDe(dirs[0].valor) : null;
    return {
      nombres: nombres.map((n, i) => ({ etiqueta: 'Nombre ' + (i + 1), diferencias: i === 0 ? [] : difNombre(nombres[0], n) })),
      direcciones: dirs.map((d, i) => {
        const dif = [];
        if (d.tipo === 'actual' || d.tipo === 'anterior') dif.push(d.tipo);
        if (i > 0) {
          const e = estadoDe(d.valor);
          dif.push(!e || !estado1 ? 'estado_desconocido' : (e === estado1 ? 'mismo_estado' : 'otro_estado'));
        }
        return { etiqueta: 'Dirección ' + (i + 1), diferencias: dif };
      }),
      telefonos: tels.map((t, i) => ({
        etiqueta: 'Teléfono ' + (i + 1),
        diferencias: i === 0 ? [] : [t.slice(0, 3) === tels[0].slice(0, 3) ? 'mismo_codigo_de_area' : 'otro_codigo_de_area']
      })),
      ssnDistintos: id.ssnMostrado ? 1 : 0,
      fechasNacimientoDistintas: id.fechaNacimientoMostrada ? 1 : 0
    };
  }

  /* ------------------------------------------------------------ cuentas (FR-002) */
  const CAMPOS_CUENTA = ['acreedor', 'acreedorOriginal', 'tipo', 'estado', 'estadoPago', 'responsabilidad', 'saldo', 'limite',
    'saldoMasAlto', 'montoOriginal', 'limiteOMontoOriginal', 'vencido', 'montoChargeOff', 'fechaApertura', 'fechaCierre', 'dofd',
    'ultimoPago', 'fechaReportada', 'fechaChargeOff', 'fechaCobranza'];

  function etiquetarCuenta(c, letraCuenta) {
    const e = { letra: letraCuenta, cerrada: c.cerrada === true, esCobranza: c.esCobranza === true };
    CAMPOS_CUENTA.forEach((k) => { e[k] = simple(c[k]); });
    e.historial = (c.historial || []).filter((h) => h && h.mesVerificable && h.anio && h.mes)
      .map((h) => ({ mes: h.anio + '-' + String(h.mes).padStart(2, '0'), codigo: h.codigo }));
    e.atrasosListados = (c.atrasosListados || []).map(simple).filter(Boolean);
    e.comentarios = (c.comentarios || []).map(simple).filter(Boolean).slice(0, 5).map((t) => String(t).slice(0, 300));
    return limpiarProfundo(e);
  }

  function etiquetarReporte(reporte, opciones) {
    if (!reporte || typeof reporte !== 'object' || !Array.isArray(reporte.cuentas)) throw new TypeError('reporte_invalido');
    const o = opciones || {}, seleccion = o.marcadas || {};
    const letras = reporte.cuentas.map((_, i) => letra(i));
    const consultas = Array.isArray(reporte.consultas) ? reporte.consultas : [];
    const etiquetado = {
      buro: reporte.buro || 'desconocido',
      fechaReporte: simple(reporte.fechaReporte),
      identidad: etiquetarIdentidad(reporte.identidad),
      cuentas: reporte.cuentas.map((c, i) => etiquetarCuenta(c, letras[i])),
      consultas: consultas.map((q) => limpiarProfundo({ empresa: simple(q.empresa), fecha: simple(q.fecha), tipo: q.tipo || 'desconocida' })),
      registrosPublicos: (reporte.registrosPublicos || []).map((r) => {
        const estado = simple(r.estado);
        return { tipo: typeof r.tipo === 'string' ? r.tipo : (simple(r.tipo) || 'otro'), fechaPresentacion: simple(r.fechaPresentacion), estado: estado === null ? null : limpiarTexto(estado) };
      }),
      avisos: (reporte.avisos || []).map((a) => ({ tipo: a.tipo || 'otro' })),
      marcadas: { cuentas: [], datos: [] }
    };
    const porId = new Map(reporte.cuentas.map((c, i) => [String(c.id), letras[i]]));
    etiquetado.marcadas.cuentas = (seleccion.cuentaIds || []).map((id) => porId.get(String(id))).filter(Boolean);
    const identidadCruda = reporte.identidad || {};
    const privadosIdentidad = {};
    [['nombres', 'Nombre'], ['direcciones', 'Dirección'], ['telefonos', 'Teléfono']].forEach(([grupo, tipo]) => {
      (identidadCruda[grupo] || []).filter(tieneValor).forEach((v, i) => { privadosIdentidad[tipo + ' ' + (i + 1)] = { tipo, valor: simple(v) }; });
    });
    const etiquetasValidas = new Set(Object.keys(privadosIdentidad));
    etiquetado.marcadas.datos = (seleccion.datos || []).filter((x) => etiquetasValidas.has(x));
    const privado = { cuentas: {}, identidad: privadosIdentidad };
    reporte.cuentas.forEach((c, i) => {
      const numero = simple(c.numero), grupos = numero === null ? [] : String(numero).match(/\d{4}/g);
      privado.cuentas[letras[i]] = { acreedor: simple(c.acreedor), ultimos4: grupos && grupos.length ? grupos[grupos.length - 1] : null, apertura: simple(c.fechaApertura) };
    });
    const paraHerramientas = {
      cuentas: reporte.cuentas.map((c, i) => {
        const copia = Object.assign({}, c, { id: letras[i] });
        delete copia.numero;
        delete copia.contacto;
        return copia;
      }),
      consultas: consultas.slice()
    };
    return { etiquetado, paraHerramientas, privado };
  }

  /* Mapa id de cuenta → letra, el mismo orden que usa el etiquetador (spec 019, D3). */
  function letrasDe(reporte) {
    const mapa = {};
    ((reporte && reporte.cuentas) || []).forEach((c, i) => { mapa[c.id] = letra(i); });
    return mapa;
  }

  /* ------------------------------------------------------------ respaldo local (FR-023) */
  function hoyDispositivo() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function analisisLocal(paraHerramientas, opciones) {
    const o = opciones || {};
    const hoy = o.hoy || hoyDispositivo();
    const correr = (nombre, extra) => {
      if (!paraHerramientas || !H) return null;
      try { return limpiarProfundo(H.ejecutar(nombre, paraHerramientas, extra)); } catch (_) { return null; }
    };
    return {
      modo: 'local',
      motivo: o.motivo || 'ia_no_disponible',
      reintentable: !!o.reintentable,
      hoy,
      herramientas: {
        fechasSalida: correr('calcularFechaSalida', { hoy }),
        utilizacion: correr('calcularUtilizacion', {}),
        duplicados: correr('buscarPosiblesDuplicados', {}),
        consultasDuras: correr('contarConsultasDuras', { hoy })
      }
    };
  }

  /* ------------------------------------------------------------ ciclo con el servidor */
  /* El «hoy» de las herramientas lo fija el servidor en el pase (FR-010). */
  function leerHoyDelPase(pase) {
    try {
      const b64 = String(pase).split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
      const d = JSON.parse(atob(b64)).d;
      return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
    } catch (_) { return null; }
  }

  function ejecutarPedido(p, paraHerramientas, hoy, emitir) {
    const entrada = (p && p.entrada) || {};
    const cuenta = typeof entrada.cuenta === 'string' && /^[A-Z]{1,3}$/.test(entrada.cuenta) ? entrada.cuenta : null;
    emitir('herramienta:' + String(p.nombre).replace(/[^A-Za-z]/g, '') + (cuenta ? ':' + cuenta : ''));
    const opciones = p.nombre === 'calcularFechaSalida' ? { hoy, cuentaId: entrada.cuenta }
      : p.nombre === 'contarConsultasDuras' ? { hoy, meses: entrada.meses } : {};
    try {
      return { type: 'tool_result', tool_use_id: p.id, content: JSON.stringify(limpiarProfundo(H.ejecutar(p.nombre, paraHerramientas, opciones))) };
    } catch (err) {
      return { type: 'tool_result', tool_use_id: p.id, is_error: true, content: 'error:' + (err && err.message ? err.message : 'herramienta') };
    }
  }

  async function enviar(fetchFn, url, cuerpo) {
    try {
      const res = await fetchFn(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
      const datos = await res.json();
      if (datos && typeof datos.estado === 'string') return datos;
    } catch (_) { /* red caída o respuesta que no es JSON */ }
    return { estado: 'respaldo', motivo: 'ia_no_disponible', reintentable: true };
  }

  async function analizarConAgente(reporte, opciones) {
    const o = opciones || {};
    const emitir = (codigo) => { try { if (typeof o.onEvento === 'function') o.onEvento(codigo); } catch (_) { /* la pantalla no rompe el análisis */ } };
    const fetchFn = o.fetch || (typeof fetch === 'function' ? fetch : null);
    const url = o.url || URL_FUNCION;
    let preparado;
    try {
      emitir('etiquetando');
      preparado = etiquetarReporte(reporte, { marcadas: o.marcadas });
    } catch (_) {
      emitir('respaldo:datos_rechazados');
      return analisisLocal(null, { motivo: 'datos_rechazados' });
    }
    const local = (motivo, reintentable, hoy) => {
      emitir('respaldo:' + motivo);
      return analisisLocal(preparado.paraHerramientas, { motivo, reintentable, hoy: hoy || undefined });
    };
    if (!o.accessToken) return local('sin_sesion', false);
    if (!fetchFn || !H) return local('ia_no_disponible', true);

    let cuerpo = { accessToken: o.accessToken, etiquetado: preparado.etiquetado };
    let hoy = null;
    for (let vuelta = 1; vuelta <= MAX_VUELTAS; vuelta++) {
      emitir('enviando:' + vuelta);
      let resp = await enviar(fetchFn, url, cuerpo);
      if (resp.estado === 'respaldo' && resp.motivo === 'ia_no_disponible' && resp.reintentable) {
        emitir('reintentando:' + vuelta);
        // Con el pase de reintento del servidor no se suma otro uso (FR-024).
        const reintento = resp.pase && Array.isArray(resp.messages)
          ? { accessToken: o.accessToken, pase: resp.pase, messages: resp.messages }
          : cuerpo;
        resp = await enviar(fetchFn, url, reintento);
      }
      if (resp.estado === 'terminado' && resp.resultado) {
        emitir('terminado');
        return Object.assign({ modo: 'ia', hoy: hoy || leerHoyDelPase(resp.pase) || null }, resp.resultado);
      }
      if (resp.estado !== 'herramientas' || !resp.pase || !Array.isArray(resp.messages)) {
        return local(typeof resp.motivo === 'string' ? resp.motivo : 'ia_no_disponible', !!resp.reintentable, hoy);
      }
      hoy = leerHoyDelPase(resp.pase) || hoy;
      if (!hoy) return local('respuesta_no_valida', false);
      const pedidos = Array.isArray(resp.pedidos) ? resp.pedidos : [];
      const resultados = pedidos.map((p) => ejecutarPedido(p, preparado.paraHerramientas, hoy, emitir));
      cuerpo = {
        accessToken: o.accessToken,
        pase: resp.pase,
        messages: resultados.length ? resp.messages.concat([{ role: 'user', content: resultados }]) : resp.messages
      };
    }
    return local('demasiadas_vueltas', false, hoy);
  }
  const API = { etiquetarReporte, analisisLocal, analizarConAgente, letrasDe, _limpiarTexto: limpiarTexto, _limpiarProfundo: limpiarProfundo };
  if (typeof window !== 'undefined') window.ThemoraAgenteCredito = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
