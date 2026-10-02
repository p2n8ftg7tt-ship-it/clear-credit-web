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

  function analizar(reporte, opciones) {
    if (!reporte || typeof reporte !== 'object' || !Array.isArray(reporte.cuentas)) {
      throw new TypeError('analizar: se esperaba un Reporte de ThemoraLector');
    }
    return {
      resumen: resumenGeneral(reporte),
      abiertas: cuentasAbiertas(reporte),
      problemas: [],
      consultas: { duras: grupoConsultas(reporte, TIPOS_CONSULTA.duras), blandas: grupoConsultas(reporte, TIPOS_CONSULTA.blandas) },
      pasos: [],
      conclusion: '',
      advertencias: advertenciasDe(reporte)
    };
  }

  const API = { analizar, REGLAS: [] };
  if (typeof window !== 'undefined') window.ThemoraAnalista = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
