/* ===========================================================================
   Analista de reportes de crédito (spec 014: resumen del consumidor)

   Recibe el Reporte que arma lector-credito.js y decide qué ve el consumidor:
   sus datos generales, sus cuentas abiertas, sus consultas, las cuentas con
   problemas (con su gravedad) y, para cada problema, qué dice la ley y qué
   puede hacer. Todos los números de la pantalla salen de aquí, para que nunca
   se contradigan (Principio IV).

   Reglas de honestidad y privacidad:
     - Describe derechos y opciones; nunca ordena ni promete (Principio I).
     - Solo cita secciones de leyes cargadas en el sitio (las de zyron-leyes.js).
     - Del SSN solo usa los últimos 4 dígitos, y paraGuardar() no los incluye.

   No toca el DOM, no hace llamadas de red y no guarda nada.
   =========================================================================== */
(function () {
  'use strict';

  const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const BUROS = { equifax: 'Equifax', experian: 'Experian', transunion: 'TransUnion' };
  /* Orden fijo del cuadro de cuentas abiertas (data-model.md). */
  const TIPOS_ABIERTAS = [
    ['rotativa', 'Tarjetas'], ['auto', 'Préstamos de auto'], ['hipoteca', 'Hipotecas'],
    ['estudiantil', 'Préstamos estudiantiles'], ['plazos', 'Otros préstamos'], ['otra', 'Otras']
  ];
  const TIPOS_CONSULTA = { duras: ['dura'], blandas: ['blanda', 'promocional', 'revision_cuenta'] };

  const tieneValor = (v) => !!(v && v.estado !== 'no_reportado' && v.valor !== undefined && v.valor !== null && v.valor !== '');
  const texto = (v) => (tieneValor(v) ? String(v.texto || v.valor) : '');
  const isoDe = (v) => (tieneValor(v) && v.valor && v.valor.iso ? v.valor.iso : '');

  function fechaLarga(iso) {
    if (!iso) return '';
    const [a, m, d] = iso.split('-').map(Number);
    if (!m) return String(a);
    return (d ? d + ' de ' : '') + MESES_ES[m - 1] + ' de ' + a;
  }

  /* Una cobranza no es una cuenta que el consumidor esté usando: se cuenta aparte, no como abierta. */
  const esAbierta = (c) => !c.cerrada && !c.esCobranza;
  function contarResumen(reporte) {
    const enCobranza = reporte.cuentas.filter((c) => c.esCobranza).length;
    const abiertas = reporte.cuentas.filter(esAbierta).length;
    return { total: reporte.cuentas.length, abiertas, cerradas: reporte.cuentas.length - abiertas - enCobranza, enCobranza };
  }

  /* ------------------------------------------------------------ datos generales (US1) */

  function resumenGeneral(reporte) {
    const id = reporte.identidad || {};
    const nombres = (id.nombres || []).filter(tieneValor);
    const direcciones = (id.direcciones || []).filter(tieneValor);
    const telefonos = (id.telefonos || []).filter(tieneValor);
    const actual = direcciones.find((d) => d.tipo === 'actual') || direcciones[0];
    const iso = isoDe(reporte.fechaReporte);
    const paginas = reporte.paginasTotales ? { leidas: reporte.paginasLeidas, totales: reporte.paginasTotales } : null;
    return {
      buro: { id: reporte.buro || 'desconocido', nombre: BUROS[reporte.buro] || 'Buró no reconocido' },
      fecha: iso ? { texto: fechaLarga(iso), iso } : null,
      nombre: nombres.length ? texto(nombres[0]) : 'Nombre no legible en el reporte',
      ssn: { mostrado: !!id.ssnMostrado, ultimos4: id.ssnUltimos4 || null },
      direccion: { actual: actual ? texto(actual) : null, otras: Math.max(0, direcciones.length - 1) },
      telefono: { actual: telefonos.length ? texto(telefonos[0]) : null, otros: Math.max(0, telefonos.length - 1) },
      cuentas: contarResumen(reporte),
      registrosPublicos: (reporte.registrosPublicos || []).length,
      paginas
    };
  }

  function cuentasAbiertas(reporte) {
    const abiertas = reporte.cuentas.filter(esAbierta);
    const tipoDe = (c) => {
      const t = tieneValor(c.tipo) ? c.tipo.valor : 'otra';
      return TIPOS_ABIERTAS.some(([k]) => k === t) ? t : 'otra';
    };
    const porTipo = TIPOS_ABIERTAS
      .map(([tipo, etiqueta]) => ({ tipo, etiqueta, cantidad: abiertas.filter((c) => tipoDe(c) === tipo).length }))
      .filter((t) => t.cantidad > 0);
    return { total: abiertas.length, porTipo };
  }

  function grupoConsultas(reporte, tipos) {
    const lista = (reporte.consultas || []).filter((c) => tipos.includes(c.tipo));
    const ordenadas = lista.slice().sort((a, b) => isoDe(b.fecha).localeCompare(isoDe(a.fecha)));
    const grupos = new Map();
    ordenadas.forEach((c) => {
      const empresa = texto(c.empresa) || 'Empresa no legible';
      if (!grupos.has(empresa)) grupos.set(empresa, []);
      grupos.get(empresa).push(c.fecha && c.fecha.texto ? c.fecha.texto : 'fecha no legible');
    });
    return { total: lista.length, porEmpresa: [...grupos.entries()].map(([empresa, fechas]) => ({ empresa, fechas })) };
  }

  function advertenciasDe(reporte) {
    const codigos = (reporte.advertencias || []).map((a) => a.codigo);
    const lista = [];
    if (codigos.includes('sin_texto')) lista.push('No pudimos leer texto en este archivo.');
    if (codigos.includes('cuentas_no_leidas')) lista.push('No pudimos leer las cuentas de este reporte.');
    if (codigos.includes('consultas_no_leidas')) lista.push('No pudimos leer las consultas de este reporte.');
    if (codigos.includes('formato_no_verificado')) lista.push('No reconocimos el formato de este buró; revisa cada dato contra tu reporte.');
    if (codigos.includes('paginas_truncadas')) lista.push('Leímos las primeras ' + reporte.paginasLeidas + ' de ' + reporte.paginasTotales + ' páginas.');
    if (codigos.includes('mes_no_verificable')) lista.push('En algunas cuentas hay atrasos cuyo mes no pudimos ubicar.');
    return lista;
  }

  /* ------------------------------------------------------------ cuentas con problemas (US2) */

  const MESES_CORTOS = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.'];
  const MESES_EN = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const RANGO = { roja: 0, naranja: 1, amarilla: 2 };
  const GRAVEDAD_TEXTO = { roja: 'Grave', naranja: 'Atención', amarilla: 'Para revisar' };
  const SUFIJOS_INICIALES = new Set(['BANK', 'NA', 'N', 'A', 'CARD', 'CREDIT', 'UNION', 'FINANCIAL', 'SERVICES', 'SERVICE', 'INC', 'LLC', 'CORP', 'CO', 'THE', 'OF', 'FSB', 'USA']);

  function iniciales(acreedor) {
    const palabras = String(acreedor || '').toUpperCase().split(/[\s\/&,.-]+/)
      .map((p) => p.replace(/[^A-ZÁÉÍÓÚÑÜ]/g, '')).filter((p) => p && !SUFIJOS_INICIALES.has(p));
    if (!palabras.length) return '?';
    return palabras.length >= 2 ? palabras[0][0] + palabras[1][0] : palabras[0].slice(0, 2);
  }

  function nombreCorto(acreedor) {
    let s = String(acreedor || '').trim().replace(/\s+(BANK NA|N\.A\.|NA|INC|LLC|CORP)\.?$/i, '').replace(/\s+(BANK NA|N\.A\.|NA|INC|LLC|CORP)\.?$/i, '');
    s = s.toLowerCase().replace(/(^|[\s\/-])(\S)/g, (m, sep, letra) => sep + letra.toUpperCase());
    return s.length > 22 ? s.slice(0, 21) + '…' : s;
  }

  const mesCorto = (iso) => {
    if (!iso) return '';
    const [a, m] = iso.split('-').map(Number);
    return m ? MESES_CORTOS[m - 1] + ' ' + a : String(a);
  };
  const conFecha = (texto, iso) => texto + (iso ? ', ' + mesCorto(iso) : '');
  const textoDe = (v) => (tieneValor(v) ? String(v.texto || v.valor) : '');
  const origenDe = (v) => (v && v.origen) || null;
  const hist = (c, re) => (c.historial || []).filter((h) => h && h.mesVerificable && h.anio && h.mes && re.test(h.codigo || ''))
    .map((h) => ({ iso: h.anio + '-' + String(h.mes).padStart(2, '0'), h })).sort((a, b) => b.iso.localeCompare(a.iso));
  const textoEstado = (c) => [c.estado, c.estadoPago, c.designadorActividad].map(textoDe).join(' ');

  /* «$800 past due as of Apr 2026» → '2026-04': la fecha que el propio reporte da como vigente. */
  function mesAsOf(c) {
    const m = textoEstado(c).match(/as of\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4})/i);
    const n = m && MESES_EN[m[1].toLowerCase()];
    return n ? m[2] + '-' + String(n).padStart(2, '0') : '';
  }

  /* Cada regla: detecta(cuenta, reporte) → { fecha, dato, origen } o null. Textos y citas: ver T026. */
  const REGLAS = [
    { id: 'cobranza', gravedad: 'roja', carta: 'debt-validation',
      detecta: (c) => {
        if (!c.esCobranza && !(tieneValor(c.tipo) && c.tipo.valor === 'cobranza')) return null;
        const fecha = mesAsOf(c) || isoDe(c.fechaCobranza) || isoDe(c.dofd);
        return { fecha, dato: conFecha('En cobranza', fecha), origen: origenDe(c.estado) || origenDe(c.acreedor) };
      } },
    { id: 'charge_off', gravedad: 'roja', carta: 'bureau-dispute',
      detecta: (c) => {
        const enHist = hist(c, /^charge_off$/);
        const porTexto = /charge[\s-]?off|charged[\s-]off|written off|profit and loss/i.test(textoEstado(c));
        if (!tieneValor(c.montoChargeOff) && !tieneValor(c.fechaChargeOff) && !enHist.length && !porTexto) return null;
        const fecha = isoDe(c.fechaChargeOff) || (enHist[0] && enHist[0].iso) || isoDe(c.fechaReportada);
        return { fecha, dato: conFecha('Charge-off', fecha), origen: origenDe(c.montoChargeOff) || origenDe(c.estado) || (enHist[0] && enHist[0].h.origen) };
      } },
    { id: 'reposesion', gravedad: 'roja', carta: 'bureau-dispute',
      detecta: (c) => {
        const enHist = hist(c, /^reposesion$/);
        if (!enHist.length && !/repossess/i.test(textoEstado(c) + ' ' + (c.comentarios || []).map(textoDe).join(' '))) return null;
        const fecha = (enHist[0] && enHist[0].iso) || isoDe(c.fechaReportada);
        return { fecha, dato: conFecha('Reposesión', fecha), origen: origenDe(c.estado) };
      } },
    { id: 'ejecucion_hipotecaria', gravedad: 'roja', carta: 'bureau-dispute',
      detecta: (c) => {
        const enHist = hist(c, /^ejecucion/);
        if (!enHist.length && !/foreclos/i.test(textoEstado(c) + ' ' + (c.comentarios || []).map(textoDe).join(' '))) return null;
        const fecha = (enHist[0] && enHist[0].iso) || isoDe(c.fechaReportada);
        return { fecha, dato: conFecha('Ejecución hipotecaria', fecha), origen: origenDe(c.estado) };
      } },
    { id: 'atraso', gravedad: 'naranja', carta: 'bureau-dispute',
      detecta: (c) => {
        const enHist = hist(c, /^atraso_\d+$/);
        const listados = (c.atrasosListados || []).map(isoDe).filter(Boolean).sort().reverse();
        if (!enHist.length && !listados.length) return null;
        if (enHist.length && (!listados.length || enHist[0].iso >= listados[0].slice(0, 7))) {
          const dias = enHist[0].h.codigo.split('_')[1];
          return { fecha: enHist[0].iso, dato: conFecha('Atraso de ' + dias + ' días', enHist[0].iso), origen: enHist[0].h.origen };
        }
        return { fecha: listados[0].slice(0, 7), dato: conFecha('Pago atrasado', listados[0].slice(0, 7)), origen: null };
      } },
    { id: 'saldo_vencido', gravedad: 'naranja', carta: 'bureau-dispute',
      detecta: (c) => (tieneValor(c.vencido) && Number(c.vencido.valor) > 0
        ? { fecha: isoDe(c.fechaReportada), dato: 'Saldo vencido de $' + Number(c.vencido.valor).toLocaleString('en-US'), origen: origenDe(c.vencido) } : null) },
    { id: 'marcada_por_buro', gravedad: 'amarilla', carta: null,
      detecta: (c) => (c.marcaNegativaBuro || (c.reglasAplicadas || []).includes('cuenta-en-adversas')
        ? { fecha: isoDe(c.fechaReportada), dato: 'Marcada como posible negativa por el buró', origen: origenDe(c.acreedor) } : null) }
  ];

  const ETIQUETA_REGISTRO = { bancarrota_7: 'Bancarrota (capítulo 7)', bancarrota_13: 'Bancarrota (capítulo 13)', bancarrota_11: 'Bancarrota (capítulo 11)', bancarrota_12: 'Bancarrota (capítulo 12)' };

  function hallazgo(regla, d) {
    return { regla: regla.id, gravedad: regla.gravedad, queVimos: d.dato + (d.origen && d.origen.pagina ? ' (página ' + d.origen.pagina + ')' : ''),
      queSignifica: '', queDiceLaLey: [], opciones: [], noCubierto: null };
  }

  function problemasDe(reporte) {
    const lista = [];
    reporte.cuentas.forEach((c) => {
      const halla = [];
      REGLAS.forEach((r) => {
        if (r.id === 'marcada_por_buro' && halla.length) return;
        const d = r.detecta(c, reporte);
        if (d) halla.push({ regla: r, d });
      });
      if (!halla.length) return;
      const principal = halla.slice().sort((a, b) => RANGO[a.regla.gravedad] - RANGO[b.regla.gravedad])[0];
      const acreedor = textoDe(c.acreedor) || 'Acreedor no legible';
      lista.push({
        id: c.id, acreedor, nombreCorto: nombreCorto(acreedor), iniciales: iniciales(acreedor),
        gravedad: principal.regla.gravedad, gravedadTexto: GRAVEDAD_TEXTO[principal.regla.gravedad],
        frase: principal.d.dato, fechaProblema: principal.d.fecha ? { iso: principal.d.fecha } : null,
        hallazgos: halla.map((x) => hallazgo(x.regla, x.d)),
        carta: principal.regla.carta,
        datosCarta: { acreedor, numero: textoDe(c.numero), buro: reporte.buro || 'desconocido' }
      });
    });
    (reporte.registrosPublicos || []).forEach((r, i) => {
      const fecha = isoDe(r.fechaPresentacion);
      const nombre = ETIQUETA_REGISTRO[r.tipo] || 'Registro público';
      const d = { fecha, dato: conFecha(nombre, fecha), origen: origenDe(r.fechaPresentacion) };
      lista.push({ id: 'rp-' + i, acreedor: nombre, nombreCorto: nombreCorto(nombre), iniciales: 'RP', gravedad: 'roja', gravedadTexto: GRAVEDAD_TEXTO.roja,
        frase: d.dato, fechaProblema: fecha ? { iso: fecha } : null,
        hallazgos: [hallazgo({ id: 'registro_publico', gravedad: 'roja' }, d)], carta: 'bureau-dispute',
        datosCarta: { acreedor: nombre, numero: '', buro: reporte.buro || 'desconocido' } });
    });
    return lista.sort((a, b) => RANGO[a.gravedad] - RANGO[b.gravedad] ||
      ((b.fechaProblema && b.fechaProblema.iso) || '').localeCompare((a.fechaProblema && a.fechaProblema.iso) || ''));
  }

  function analizar(reporte, opciones) {
    if (!reporte || typeof reporte !== 'object' || !Array.isArray(reporte.cuentas)) {
      throw new TypeError('analizar: se esperaba un Reporte de ThemoraLector');
    }
    return {
      resumen: resumenGeneral(reporte),
      abiertas: cuentasAbiertas(reporte),
      problemas: problemasDe(reporte),
      consultas: { duras: grupoConsultas(reporte, TIPOS_CONSULTA.duras), blandas: grupoConsultas(reporte, TIPOS_CONSULTA.blandas) },
      pasos: [],
      conclusion: '',
      advertencias: advertenciasDe(reporte)
    };
  }

  const API = { analizar, REGLAS, iniciales, nombreCorto };
  if (typeof window !== 'undefined') window.ThemoraAnalista = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
