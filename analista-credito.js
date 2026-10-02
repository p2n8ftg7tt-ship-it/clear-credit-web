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
        /* Se muestra cuándo entró a cobranza; la fecha «as of» del saldo solo sirve para ordenar (hallazgo 3). */
        const fecha = isoDe(c.fechaCobranza) || isoDe(c.dofd) || mesAsOf(c);
        return { fecha, orden: mesAsOf(c) || fecha, dato: conFecha('En cobranza', fecha), origen: origenDe(c.estado) || origenDe(c.acreedor) };
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


  /* Textos y citas por regla (014 research R3/R4). Solo secciones cargadas en zyron-leyes.js.
     Opciones en orden: verificar, disputa al buró (correo certificado), disputa a quien reporta,
     validación con el cobrador. Sin órdenes ni promesas. */
  const C_FCRA_7 = { ley: 'FCRA', seccion: '§ 1681c(a)(4)', texto: 'Una cuenta enviada a cobranza o dada por perdida puede aparecer hasta 7 años.' };
  const C_FCRA_180 = { ley: 'FCRA', seccion: '§ 1681c(c)', texto: 'Ese plazo empieza 180 días después del primer atraso que llevó a esa situación, y no vuelve a empezar si la deuda se vende o se paga.' };
  const C_FCRA_OTRA = { ley: 'FCRA', seccion: '§ 1681c(a)(5)', texto: 'Otra información negativa, como atrasos, puede aparecer hasta 7 años.' };
  const C_FCRA_DISPUTA = { ley: 'FCRA', seccion: '§ 1681i(a)', texto: 'Si lo disputas, el buró debe investigarlo gratis en 30 días (hasta 45 si aportas información nueva) y corregir o borrar lo que no pueda verificar.' };
  const C_FCRA_FURNISHER = { ley: 'FCRA', seccion: '§ 1681s-2(b)', texto: 'Quien reporta la cuenta debe investigar cuando el buró le pasa tu disputa.' };
  const OP_VERIFICAR = 'Compara el monto, las fechas y el número de cuenta con tus estados de cuenta.';
  const OP_BURO = 'Si algún dato no es correcto, puedes disputarlo directamente con el buró por correo certificado con acuse de recibo, y guardar la copia y el comprobante. Una queja a la CFPB no reemplaza esa disputa.';
  const OP_ACREEDOR = 'También puedes disputarlo con quien reporta la cuenta; esa disputa lo obliga a investigar.';
  const PRESCRIPCION = 'La prescripción de la deuda depende de las leyes de tu estado, que este sitio todavía no tiene cargadas.';
  const TEXTOS = {
    cobranza: { textos: { queSignifica: 'Una agencia de cobranza o un comprador de deudas reporta esta cuenta. Pesa en tu historial mientras aparezca, aunque la pagues.',
      opciones: [OP_VERIFICAR, 'Si recibiste un aviso del cobrador hace menos de 30 días, puedes pedirle por escrito que valide la deuda; mientras lo hace, debe pausar el cobro.', OP_BURO,
        'Pagarla no la borra del reporte; antes de pagar o reconocer una deuda vieja, consulta el plazo de prescripción de tu estado.'], noCubierto: PRESCRIPCION },
      citas: [{ ley: 'FDCPA', seccion: '§ 1692g(b)', texto: 'Puedes pedir por escrito la validación dentro de los 30 días del aviso; mientras tanto el cobrador debe pausar el cobro.' },
        { ley: 'FDCPA', seccion: '§ 1692e(8)', texto: 'Comunicar información de crédito sobre una deuda sin indicar que está disputada, cuando se sabe que lo está, es una práctica prohibida.' }, C_FCRA_7] },
    charge_off: { textos: { queSignifica: 'El acreedor dio esta deuda por perdida en su contabilidad. Para tu historial cuenta como una de las marcas más pesadas, aunque la cuenta ya esté cerrada o pagada.',
      opciones: [OP_VERIFICAR, OP_BURO, OP_ACREEDOR, 'Si el dato es correcto, la ley no obliga a borrarlo antes de su plazo; pagarlo no lo elimina, pero el reporte puede mostrarlo como pagado.'], noCubierto: PRESCRIPCION },
      citas: [C_FCRA_7, C_FCRA_180, C_FCRA_DISPUTA] },
    reposesion: { textos: { queSignifica: 'El acreedor recuperó el bien (por ejemplo, el carro) por falta de pago. Es una marca negativa importante.',
      opciones: [OP_VERIFICAR, OP_BURO, OP_ACREEDOR] }, citas: [C_FCRA_OTRA, C_FCRA_DISPUTA] },
    ejecucion_hipotecaria: { textos: { queSignifica: 'El reporte indica una ejecución hipotecaria: el prestamista tomó o intentó tomar la vivienda por falta de pago.',
      opciones: [OP_VERIFICAR, OP_BURO, OP_ACREEDOR] }, citas: [C_FCRA_OTRA, C_FCRA_DISPUTA] },
    atraso: { textos: { queSignifica: 'La cuenta muestra un pago que llegó tarde. Los atrasos recientes pesan más que los viejos.',
      opciones: [OP_VERIFICAR, 'Si la cuenta tiene un saldo vencido hoy, ponerla al día evita un atraso nuevo.', OP_BURO, OP_ACREEDOR] },
      citas: [C_FCRA_OTRA, C_FCRA_DISPUTA, C_FCRA_FURNISHER] },
    saldo_vencido: { textos: { queSignifica: 'La cuenta tiene un monto vencido: pagos que todavía no se han cubierto.',
      opciones: [OP_VERIFICAR, 'Ponerla al día evita que se reporte un atraso nuevo.', OP_BURO] }, citas: [C_FCRA_DISPUTA] },
    marcada_por_buro: { textos: { queSignifica: 'El buró la señala como posiblemente negativa, aunque no vimos atrasos ni cobranza en sus datos.',
      opciones: [OP_VERIFICAR, 'Revisa en tu reporte original por qué aparece marcada.'] }, citas: [] },
    registro_publico: { textos: { queSignifica: 'El reporte incluye un registro público, como una bancarrota. Es de las marcas que más pesan.',
      opciones: [OP_VERIFICAR, OP_BURO] },
      citas: [{ ley: 'FCRA', seccion: '§ 1681c(a)(1)', texto: 'Una bancarrota puede aparecer hasta 10 años desde la orden.' }, C_FCRA_DISPUTA] },
    obsoleta: { textos: { queSignifica: 'Por sus fechas, este dato negativo ya pasó el plazo en que la ley permite reportarlo (7 años desde 180 días después del primer atraso).',
      opciones: ['Confirma la fecha del primer atraso en tu reporte original.', 'Si ya pasó el plazo, puedes disputarlo con el buró por correo certificado con acuse de recibo, pidiendo que lo quite por ser información desactualizada.'] },
      citas: [{ ley: 'FCRA', seccion: '§ 1681c(a)', texto: 'La información negativa más antigua que el plazo no debería aparecer en el reporte.' }] }
  };

  /* Inicio = DOFD o, si falta, el atraso verificable MÁS RECIENTE: un atraso nuevo todavía se puede
     reportar 7 años (§ 1681c(a)(5)), así que la cuenta solo es «más de 7 años» si hasta el último lo es.
     Obsoleta si inicio + 180 días + 7 años < fecha del reporte. (Revisión final de la 019, hallazgo 2.) */
  function esObsoleta(cuenta, fechaReporte) {
    const atrasos = hist(cuenta, /^atraso_\d+$/).map((x) => x.iso).sort();
    const inicio = isoDe(cuenta.dofd) || atrasos[atrasos.length - 1] || '';
    const ref = String(fechaReporte || '');
    if (!/^\d{4}-\d{2}/.test(inicio) || !/^\d{4}-\d{2}/.test(ref)) return false;
    const [a, m] = inicio.split('-').map(Number);
    const total = a * 12 + (m - 1) + 6 + 84;
    const fin = Math.floor(total / 12) + '-' + String(total % 12 + 1).padStart(2, '0');
    return fin < ref.slice(0, 7);
  }

  const ETIQUETA_REGISTRO = { bancarrota_7: 'Bancarrota (capítulo 7)', bancarrota_13: 'Bancarrota (capítulo 13)', bancarrota_11: 'Bancarrota (capítulo 11)', bancarrota_12: 'Bancarrota (capítulo 12)' };

  function hallazgo(regla, d) {
    const t = TEXTOS[regla.id] || { textos: { queSignifica: '', opciones: [] }, citas: [] };
    return { regla: regla.id, gravedad: regla.gravedad, queVimos: d.dato + (d.origen && d.origen.pagina ? ' (página ' + d.origen.pagina + ')' : ''),
      queSignifica: t.textos.queSignifica, queDiceLaLey: t.citas.slice(), opciones: t.textos.opciones.slice(), noCubierto: t.textos.noCubierto || null };
  }

  function problemasDe(reporte, opciones) {
    const lista = [];
    reporte.cuentas.forEach((c) => {
      const halla = [];
      REGLAS.forEach((r) => {
        if (r.id === 'marcada_por_buro' && halla.length) return;
        const d = r.detecta(c, reporte);
        if (d) halla.push({ regla: r, d });
      });
      if (!halla.length) return;
      const fechaRef = (opciones && opciones.hoy) || isoDe(reporte.fechaReporte);
      if (esObsoleta(c, fechaRef)) {
        const inicio = isoDe(c.dofd);
        halla.push({ regla: { id: 'obsoleta', gravedad: halla[0].regla.gravedad, carta: 'bureau-dispute' },
          d: { fecha: inicio, dato: 'Información con más de 7 años' + (inicio ? ' (primer atraso: ' + mesCorto(inicio) + ')' : ''), origen: origenDe(c.dofd) } });
      }
      const principal = halla.slice().sort((a, b) => RANGO[a.regla.gravedad] - RANGO[b.regla.gravedad])[0];
      const acreedor = textoDe(c.acreedor) || 'Acreedor no legible';
      lista.push({
        id: c.id, acreedor, nombreCorto: nombreCorto(acreedor), iniciales: iniciales(acreedor),
        gravedad: principal.regla.gravedad, gravedadTexto: GRAVEDAD_TEXTO[principal.regla.gravedad],
        frase: principal.d.dato, fechaProblema: principal.d.fecha ? { iso: principal.d.fecha } : null, _orden: principal.d.orden || principal.d.fecha || '',
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
    const orden = (x) => (x._orden !== undefined ? x._orden : (x.fechaProblema && x.fechaProblema.iso) || '');
    lista.sort((a, b) => RANGO[a.gravedad] - RANGO[b.gravedad] || orden(b).localeCompare(orden(a)));
    lista.forEach((x) => { delete x._orden; });
    return lista;
  }

  /* Pasos del análisis local con datos reales (014 US4). Un solo número de problemas: problemas.length. */
  function pasosDe(reporte, resumen, problemas, consultas) {
    const plural = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);
    const observar = [resumen.buro.id !== 'desconocido' ? resumen.buro.nombre : 'Buró no reconocido']
      .concat(resumen.fecha ? [resumen.fecha.texto] : [])
      .concat(resumen.paginas ? [plural(resumen.paginas.totales, 'página', 'páginas')] : []).join(', ');
    const n = problemas.length;
    return [
      { id: 'observar', estado: 'hecho', texto: observar },
      { id: 'leer', estado: 'hecho', texto: 'Leí ' + plural(resumen.cuentas.total, 'cuenta', 'cuentas') + ' y ' + plural(consultas.duras.total, 'consulta dura', 'consultas duras') },
      { id: 'revisar', estado: 'hecho', texto: 'Revisé cada cuenta contra la FCRA y la FDCPA' },
      { id: 'concluir', estado: 'hecho', texto: n ? 'Encontré ' + plural(n, 'cuenta', 'cuentas') + ' con problemas' : 'No encontré cuentas con problemas' }
    ];
  }

  function analizar(reporte, opciones) {
    if (!reporte || typeof reporte !== 'object' || !Array.isArray(reporte.cuentas)) {
      throw new TypeError('analizar: se esperaba un Reporte de ThemoraLector');
    }
    const resumen = resumenGeneral(reporte);
    const problemas = problemasDe(reporte, opciones);
    const consultas = { duras: grupoConsultas(reporte, TIPOS_CONSULTA.duras), blandas: grupoConsultas(reporte, TIPOS_CONSULTA.blandas) };
    return {
      resumen,
      abiertas: cuentasAbiertas(reporte),
      problemas,
      consultas,
      pasos: pasosDe(reporte, resumen, problemas, consultas),
      totales: totalesDe(reporte),
      conclusion: '',
      advertencias: advertenciasDe(reporte)
    };
  }

  /* Lo que se guarda en la cuenta (CCAuth.saveAnalysis): solo números y frases genéricas, nunca datos de la persona. */
  function paraGuardar(analisis) {
    const p = analisis.problemas;
    const roja = p.some((x) => x.gravedad === 'roja');
    const t = analisis.totales;
    return {
      health: roja ? 'Atención prioritaria' : (p.length ? 'Hay margen de mejora' : 'Perfil sin alertas obvias'),
      tone: roja ? 'critical' : (p.length ? 'attention' : 'stable'),
      conclusion: analisis.conclusion || '',
      score: null,
      utilization: null,
      negatives: p.map((x) => ({ title: x.frase, priority: x.gravedadTexto })),
      positives: [],
      accountsSummary: { count: t.cuentas, cardCount: t.rotativas, byType: t.porTipo },
      inquiriesSummary: { hard: analisis.consultas.duras.total, soft: analisis.consultas.blandas.total, total: t.consultas }
    };
  }

  function totalesDe(reporte) {
    const etiqueta = Object.fromEntries(TIPOS_ABIERTAS);
    const porTipo = new Map();
    reporte.cuentas.forEach((c) => {
      const tipo = tieneValor(c.tipo) ? (etiqueta[c.tipo.valor] || (c.tipo.valor === 'cobranza' ? 'Cobranzas' : 'Otras')) : 'Sin tipo reportado';
      porTipo.set(tipo, (porTipo.get(tipo) || 0) + 1);
    });
    return {
      cuentas: reporte.cuentas.length,
      rotativas: reporte.cuentas.filter((c) => tieneValor(c.tipo) && c.tipo.valor === 'rotativa').length,
      porTipo: [...porTipo.entries()].map(([type, count]) => ({ type, count })),
      consultas: (reporte.consultas || []).length
    };
  }

  /* REGLAS completa (contrato analista-api): detección, textos y citas; registro_publico y obsoleta no detectan por cuenta. */
  REGLAS.push({ id: 'registro_publico', gravedad: 'roja', carta: 'bureau-dispute', detecta: () => null },
    { id: 'obsoleta', gravedad: null, carta: 'bureau-dispute', detecta: () => null });
  REGLAS.forEach((r) => { r.textos = TEXTOS[r.id].textos; r.citas = TEXTOS[r.id].citas; });

  const API = { analizar, REGLAS, iniciales, nombreCorto, esObsoleta, paraGuardar };
  if (typeof window !== 'undefined') window.ThemoraAnalista = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
