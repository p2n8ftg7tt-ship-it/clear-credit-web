/* ===========================================================================
   Lector de reportes de crédito (spec 013, Fase 1: lectura cuenta por cuenta)

   Convierte las páginas de un reporte de Equifax, Experian, TransUnion o de
   formato desconocido en un registro ordenado (data-model.md): identidad,
   avisos del archivo, cuentas con sus campos y su historial, consultas y
   registros públicos. Cada dato guarda de dónde salió (página, sección y
   etiqueta). Esta fase solo LEE: no juzga ni recomienda nada.

   Reglas de honestidad y privacidad:
     - Un campo impreso vacío queda «no reportado», nunca cero (FR-013).
     - Un código de historial que no se puede ubicar en su mes conserva el año
       y la marca «mes no verificable»; el mes no se adivina (R6).
     - Nunca se completa un día que el reporte no trae (R7).
     - El número de Seguro Social y la fecha de nacimiento no se guardan: solo
       se anota si el reporte los mostraba (FR-017). Los números de cuenta se
       enmascaran (R9).
     - Sin DOM, sin red y sin localStorage: el documento no sale del navegador.
     - Determinista: la misma entrada da siempre la misma salida.

   Cómo se lee cada buró está en lector-credito-perfiles.js (datos).
   Lo usan credito.html y las pruebas de tests/lector-credito*.test.js.
   =========================================================================== */
(function () {
  'use strict';

  function perfiles() {
    if (typeof window !== 'undefined' && window.ThemoraLectorPerfiles) return window.ThemoraLectorPerfiles;
    if (typeof require === 'function') return require('./lector-credito-perfiles.js');
    throw new Error('No se cargó lector-credito-perfiles.js');
  }

  const MAX_PAGINAS = 150;
  const SECCIONES_DE_CUENTAS = ['cuentas', 'adversas', 'satisfactorias', 'cobranzas'];

  /* Vocabulario común de los códigos de pago (research R11). */
  const CODIGOS_COMUNES = [
    'al_dia', 'atraso_30', 'atraso_60', 'atraso_90', 'atraso_120', 'atraso_150', 'atraso_180',
    'cobranza', 'charge_off', 'reposesion', 'entrega_voluntaria', 'ejecucion_hipotecaria',
    'ejecucion_iniciada', 'bancarrota', 'cerrada', 'muy_nueva', 'sin_datos', 'pagada_por_acreedor',
    'reclamo_gobierno', 'reclamo_seguro', 'incumplimiento', 'desconocido'
  ];
  const CODIGOS_EN_PALABRAS = {
    'PAID ON TIME': 'al_dia', 'PAYS AS AGREED': 'al_dia', '✓': 'al_dia', '✔': 'al_dia',
    'NO DATA AVAILABLE': 'sin_datos', '—': 'sin_datos', '–': 'sin_datos'
  };

  const VACIO = /^(?:|-|—|–)$/;
  const NINGUNO = /^(?:none|no statement on file|n\/a|not reported|ninguno|ninguna|no hay|no public records(?: reported)?|no records(?: found)?)\.?$/i;

  const MESES = {
    jan: 1, january: 1, ene: 1, enero: 1,
    feb: 2, february: 2, febrero: 2,
    mar: 3, march: 3, marzo: 3,
    apr: 4, april: 4, abr: 4, abril: 4,
    may: 5, mayo: 5,
    jun: 6, june: 6, junio: 6,
    jul: 7, july: 7, julio: 7,
    aug: 8, august: 8, ago: 8, agosto: 8,
    sep: 9, sept: 9, september: 9, set: 9, septiembre: 9, setiembre: 9,
    oct: 10, october: 10, octubre: 10,
    nov: 11, november: 11, noviembre: 11,
    dec: 12, december: 12, dic: 12, diciembre: 12
  };
  const NOMBRE_MES = '(?:' + Object.keys(MESES).sort((a, b) => b.length - a.length).join('|') + ')';

  const sinAcentos = (v) => String(v).normalize('NFD').replace(/[̀-ͯ]/g, '');
  const espacios = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const dos = (n) => String(n).padStart(2, '0');
  function mesDe(palabra) {
    const clave = sinAcentos(String(palabra).toLowerCase()).replace(/\.$/, '');
    return MESES[clave] || null;
  }

  /* ------------------------------------------------------------ utilidades */

  /* R7: devuelve {texto, iso} con iso parcial ('2025', '2025-05' o '2025-05-19'), o null. */
  function normalizarFecha(texto) {
    if (texto == null) return null;
    const t = espacios(texto);
    if (VACIO.test(t) || NINGUNO.test(t)) return null;
    const conMes = (anio, mes, dia) => {
      if (!(mes >= 1 && mes <= 12)) return null;
      if (dia != null && !(dia >= 1 && dia <= 31)) return null;
      return { texto: t, iso: anio + '-' + dos(mes) + (dia != null ? '-' + dos(dia) : '') };
    };
    let m;
    if ((m = t.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/))) return conMes(+m[1], +m[2], m[3] ? +m[3] : null);
    if ((m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return conMes(+m[3], +m[1], +m[2]);
    if ((m = t.match(/^(\d{1,2})\/(\d{4})$/))) return conMes(+m[2], +m[1], null);
    if ((m = t.match(/^(\d{1,2})\/(\d{2})$/))) return conMes((+m[2] <= 50 ? 2000 : 1900) + +m[2], +m[1], null);
    if ((m = t.match(/^([A-Za-zÁÉÍÓÚáéíóúñ]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/)) && mesDe(m[1])) return conMes(+m[3], mesDe(m[1]), +m[2]);
    if ((m = t.match(/^([A-Za-zÁÉÍÓÚáéíóúñ]+)\.?,?\s+(?:de\s+)?(\d{4})$/i)) && mesDe(m[1])) return conMes(+m[2], mesDe(m[1]), null);
    if ((m = t.match(/^(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚáéíóúñ]+)\s+(?:de|del)\s+(\d{4})$/i)) && mesDe(m[2])) return conMes(+m[3], mesDe(m[2]), +m[1]);
    if ((m = t.match(/^(\d{4})$/))) return { texto: t, iso: m[1] };
    return null;
  }

  /* R8: «$1,500» → 1500; «$0» → 0; vacío, «-» o «—» → null. */
  function normalizarMonto(texto) {
    if (texto == null) return null;
    const t = espacios(texto);
    if (VACIO.test(t)) return null;
    const limpio = t.replace(/[$,\s]/g, '').replace(/USD$/i, '');
    if (!/^-?\d+(?:\.\d+)?$/.test(limpio)) return null;
    return Number(limpio);
  }

  /* R9: solo los últimos 4 dígitos quedan visibles; el resto de los dígitos pasa a «X». */
  function enmascararCuenta(texto) {
    const t = espacios(texto);
    const total = (t.match(/\d/g) || []).length;
    let vistos = 0;
    return t.replace(/\d/g, (d) => (++vistos > total - 4 ? d : 'X'));
  }
  const enmascararLargos = (t) => String(t).replace(/\d{9,}/g, enmascararCuenta);

  /* R11: el código impreso, traducido al vocabulario común. */
  function codigoPago(texto, buro) {
    const clave = espacios(texto).toUpperCase();
    const p = perfiles();
    const tabla = (buro && p[buro] && p[buro].codigosPago) || p.generico.codigosPago;
    return tabla[clave] || p.generico.codigosPago[clave] || CODIGOS_EN_PALABRAS[clave] || 'desconocido';
  }

  /* Forma Valor<T> de data-model.md. */
  const origen = (pagina, seccion, etiqueta, linea) => ({ pagina, seccion, etiqueta, linea });
  const valor = (v, texto, org) => ({ valor: v, texto, origen: org });
  const noReportado = (org) => ({ estado: 'no_reportado', origen: org });
  const tieneValor = (v) => !!v && v.estado !== 'no_reportado' && v.valor != null;

  function hacerValor(tipo, texto, org) {
    const t = espacios(texto).replace(/^\|\s*|\s*\|$/g, '');
    if (VACIO.test(t)) return noReportado(org);
    switch (tipo) {
      case 'fecha': {
        if (NINGUNO.test(t)) return noReportado(org);
        return valor(normalizarFecha(t) || { texto: t, iso: null }, t, org);
      }
      case 'monto': {
        if (NINGUNO.test(t)) return noReportado(org);
        return valor(normalizarMonto(t), t, org);
      }
      case 'numero': {
        const n = parseInt(t.replace(/[^\d]/g, ''), 10);
        return valor(Number.isNaN(n) ? null : n, t, org);
      }
      case 'cuenta': {
        const m = enmascararCuenta(t);
        return valor(m, m, org);
      }
      default: {
        const limpio = enmascararLargos(t);
        return valor(limpio, limpio, org);
      }
    }
  }

  /* Todas las fechas de un texto, en orden («05/10/2026, 05/12/2026», «April 2023 Jan 2023»). */
  const FECHAS_EN_TEXTO = new RegExp(
    '\\b\\d{1,2}\\/\\d{1,2}\\/\\d{4}\\b|\\b\\d{1,2}\\/\\d{4}\\b|\\b' + NOMBRE_MES + '\\.?\\s+\\d{1,2},\\s+\\d{4}\\b|\\b' + NOMBRE_MES + '\\.?\\s+\\d{4}\\b',
    'gi'
  );
  function encontrarFechas(texto) {
    const salida = [];
    const re = new RegExp(FECHAS_EN_TEXTO.source, 'gi');
    let m;
    while ((m = re.exec(texto))) {
      const f = normalizarFecha(m[0]);
      if (f) salida.push({ fecha: f, inicio: m.index });
    }
    return salida;
  }

  /* -------------------------------------------------------------- etiquetas */

  const compiladas = new WeakMap();
  function etiquetasDe(perfil) {
    if (!compiladas.has(perfil)) {
      compiladas.set(perfil, perfil.etiquetas.map((def) => ({
        def,
        // Los PDFs tabulares de los burós suelen omitir los dos puntos.  Una
        // etiqueta sigue teniendo que terminar en el lugar declarado por el
        // perfil; solo se vuelve opcional su separador final.
        re: new RegExp(def.patron.source.replace(/:$/, '(?:\\s*:\\s*|\\s+(?=\\S)|$)'), def.patron.flags.replace('g', '') + 'g')
      })));
    }
    return compiladas.get(perfil);
  }

  /* R5: busca las etiquetas del perfil en una línea. El valor de cada una llega hasta la siguiente
     etiqueta conocida o hasta el final de la línea. Si dos etiquetas se pisan, gana la más larga
     («Credit Limit / Original Balance:» sobre «Balance:»). */
  function leerEtiquetas(texto, perfil, ambitos) {
    const hits = [];
    etiquetasDe(perfil).forEach(({ def, re }) => {
      if (def.ambito !== 'ignorar' && !ambitos.includes(def.ambito)) return;
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(texto))) {
        if (!m[0].length) { re.lastIndex++; continue; }
        // Sin dos puntos, una palabra al final de un valor ("Tribunal
        // Ejemplo") no es una etiqueta. Las etiquetas tabulares llevan valor
        // después, salvo que sean la primera celda de una fila.
        if (!m[0].includes(':') && m.index > 0 && m.index + m[0].length === texto.length) continue;
        if (!m[0].includes(':') && def.ambito === 'registro' && m.index > 0) continue;
        hits.push({ inicio: m.index, fin: m.index + m[0].length, def, etiqueta: m[0].replace(/:\s*$/, '').trim(), conDosPuntos: m[0].includes(':') });
      }
    });
    hits.sort((a, b) => a.inicio - b.inicio || (b.fin - b.inicio) - (a.fin - a.inicio));
    const elegidas = [];
    let hasta = -1;
    hits.forEach((h) => { if (h.inicio >= hasta) { elegidas.push(h); hasta = h.fin; } });
    elegidas.forEach((h, i) => {
      const siguiente = elegidas[i + 1];
      h.valor = texto.slice(h.fin, siguiente ? siguiente.inicio : texto.length).trim();
    });
    return { prefijo: texto.slice(0, elegidas.length ? elegidas[0].inicio : texto.length).trim(), hits: elegidas };
  }

  /* -------------------------------------------------------- detección (R3) */

  function textoDe(paginas) {
    return paginas.map((p) => (p && p.lineas || []).map((l) => (l && l.texto) || '').join('\n')).join('\n');
  }

  function detectarBuro(paginas) {
    const p = perfiles();
    const cabecera = sinAcentos(textoDe(paginas || []).toLowerCase()).replace(/\s+/g, ' ').slice(0, 6000);
    const puntajes = ['equifax', 'experian', 'transunion'].map((buro) => {
      const det = p[buro].detectar;
      const re = new RegExp(det.menciones.source, 'g');
      const m = re.exec(cabecera);
      const primera = m ? m.index : -1;
      let puntaje = primera < 0 ? 0 : primera < 600 ? 40 : primera < 2500 ? 20 : 5;
      det.fuertes.forEach((f) => { if (f.test(cabecera)) puntaje += 100; });
      return { buro, puntaje, primera };
    }).sort((a, b) => b.puntaje - a.puntaje || (a.primera < 0 ? 99999 : a.primera) - (b.primera < 0 ? 99999 : b.primera));
    const [primero, segundo] = puntajes;
    if (!primero.puntaje || (segundo && segundo.puntaje === primero.puntaje)) {
      return { buro: 'desconocido', puntaje: primero.puntaje, formatoVerificado: false };
    }
    return { buro: primero.buro, puntaje: primero.puntaje, formatoVerificado: true };
  }

  /* ------------------------------------------------ preparación (R4, R13) */

  /* Quita el ruido del perfil, corta en el texto de derechos y marca la sección de cada línea. */
  function prepararPaginas(paginas, perfil) {
    const salida = [];
    let seccion = 'desconocida';
    let extra = {};
    for (let pi = 0; pi < paginas.length; pi++) {
      const pagina = paginas[pi] || {};
      const numero = pagina.numero || pi + 1;
      const lineas = pagina.lineas || [];
      for (let li = 0; li < lineas.length; li++) {
        const linea = lineas[li] || {};
        const texto = espacios(linea.texto);
        if (!texto) continue;
        if (perfil.finDeDatos.some((re) => re.test(texto))) return salida;
        if (perfil.ruido.some((re) => re.test(texto))) continue;
        const sec = perfil.secciones.find((s) => s.patron.test(texto));
        if (sec) { seccion = sec.seccion; extra = { tipoConsulta: sec.tipoConsulta, avisoTipo: sec.avisoTipo }; }
        salida.push({
          texto, piezas: Array.isArray(linea.piezas) && linea.piezas.length ? linea.piezas : null,
          pagina: numero, indice: li, seccion, encabezado: !!sec,
          tipoConsulta: extra.tipoConsulta, avisoTipo: extra.avisoTipo
        });
      }
    }
    return salida;
  }

  /* ------------------------------------------------------------- identidad */

  const LISTAS_IDENTIDAD = ['nombres', 'direcciones', 'telefonos', 'empleadores'];

  function clasificarAviso(texto, defecto) {
    const t = texto.toLowerCase();
    if (/fraud|fraude/.test(t)) return 'alerta_fraude';
    if (/active duty|servicio activo/.test(t)) return 'alerta_servicio_activo';
    if (/freeze|congel/.test(t)) return 'congelamiento';
    if (/\block|bloque/.test(t)) return 'bloqueo';
    if (/opt(?:ed)?[- ]?out|preselect|prescreen|ofertas/.test(t)) return 'exclusion_ofertas';
    return defecto || 'otro';
  }

  function leerIdentidadYAvisos(lineas, perfil, reporte) {
    const id = reporte.identidad;
    let lista = null;
    let avisoAbierto = null;
    lineas.forEach((l) => {
      if (l.encabezado || (l.seccion !== 'personal' && l.seccion !== 'avisos')) { avisoAbierto = null; return; }
      const { hits } = leerEtiquetas(l.texto, perfil, ['identidad', 'aviso']);
      if (!hits.length) {
        if (NINGUNO.test(l.texto)) { lista = null; return; }
        if (l.seccion === 'avisos' || avisoAbierto) {
          if (avisoAbierto) {
            avisoAbierto.texto.valor += ' ' + l.texto;
            avisoAbierto.texto.texto = avisoAbierto.texto.valor;
          } else {
            const org = origen(l.pagina, l.seccion, '', l.indice);
            avisoAbierto = { tipo: clasificarAviso(l.texto, l.avisoTipo || 'otro'), texto: valor(l.texto, l.texto, org) };
            reporte.avisos.push(avisoAbierto);
          }
          return;
        }
        if (lista) agregarIdentidad(id, lista, l.texto, origen(l.pagina, l.seccion, lista.etiqueta, l.indice));
        return;
      }
      avisoAbierto = null;
      hits.forEach((h) => {
        if (h.def.ambito === 'ignorar') { lista = null; return; }
        const org = origen(l.pagina, l.seccion, h.etiqueta, l.indice);
        const v = espacios(h.valor);
        if (h.def.ambito === 'aviso') {
          lista = null;
          if (VACIO.test(v) || NINGUNO.test(v)) return;
          avisoAbierto = { tipo: clasificarAviso(v, h.def.avisoTipo), texto: valor(v, v, org) };
          reporte.avisos.push(avisoAbierto);
          return;
        }
        if (h.def.campo === 'ssnMostrado' || h.def.campo === 'fechaNacimientoMostrada') {
          // FR-017 (enmienda 014): se anota que el dato aparece y, del SSN, solo los últimos 4 dígitos;
          // el resto del valor se descarta aquí mismo y nunca llega al reporte.
          lista = null;
          if (!VACIO.test(v) && !NINGUNO.test(v)) {
            id[h.def.campo] = true;
            const digitos = h.def.campo === 'ssnMostrado' ? v.replace(/\D/g, '') : '';
            if (digitos.length >= 4) id.ssnUltimos4 = digitos.slice(-4);
          }
          return;
        }
        if (!LISTAS_IDENTIDAD.includes(h.def.campo)) return;
        lista = { campo: h.def.campo, etiqueta: h.etiqueta, direccion: h.def.direccion };
        if (VACIO.test(v)) return;
        if (NINGUNO.test(v)) { lista = null; return; }
        const partes = h.def.campo === 'telefonos' ? v.split(/[,;]/).map(espacios).filter(Boolean) : [v];
        partes.forEach((parte) => agregarIdentidad(id, lista, parte, org));
      });
    });
  }

  /* 014: «Name ID #14081» (Experian) o un número suelto no son nombres de la persona. */
  const IDENTIFICADOR = /^(?:(?:name|address)\s*)?id\b|^#?\s*\d[\d\s#-]*$/i;
  function agregarIdentidad(id, lista, texto, org) {
    if (lista.campo === 'nombres' && IDENTIFICADOR.test(espacios(texto))) return;
    id[lista.campo].push(itemIdentidad(lista, texto, org));
  }

  function itemIdentidad(lista, texto, org) {
    const item = valor(texto, texto, org);
    if (lista.campo === 'direcciones' && lista.direccion) item.tipo = lista.direccion;
    return item;
  }

  /* ---------------------------------------------------------------- cuentas */

  const ORDEN_CUENTA = [
    'id', 'acreedor', 'acreedorOriginal', 'numero', 'tipo', 'responsabilidad', 'cerrada', 'esCobranza', 'marcaNegativaBuro',
    'estado', 'estadoPago', 'designadorActividad', 'saldo', 'limite', 'saldoMasAlto', 'montoOriginal',
    'limiteOMontoOriginal', 'vencido', 'pagoProgramado', 'pagoReal', 'montoChargeOff', 'plazo', 'frecuencia',
    'mesesRevisados', 'fechaApertura', 'fechaCierre', 'dofd', 'fechaMorosidadGraveReportada', 'ultimoPago',
    'ultimaActividad', 'fechaReportada', 'fechaChargeOff', 'fechaCobranza', 'historial', 'historial24',
    'atrasosListados', 'codigosNarrativos', 'comentarios', 'declaracionConsumidor', 'contacto', 'reglasAplicadas'
  ];

  function clasificarTipo(texto) {
    const t = sinAcentos(texto.toLowerCase());
    if (/collection|cobranza/.test(t)) return 'cobranza';
    if (/mortgage|hipotec|home equity/.test(t)) return 'hipoteca';
    if (/\bauto\b|vehicle|vehiculo|automobile/.test(t)) return 'auto';
    if (/student|educat|estudiant/.test(t)) return 'estudiantil';
    if (/credit card|revolving|charge account|line of credit|tarjeta|rotativ|flexible spending/.test(t)) return 'rotativa';
    if (/deposit/.test(t)) return 'deposito';
    if (/open account|cuenta abierta/.test(t)) return 'abierta';
    if (/installment|personal loan|loan|plazos|prestamo/.test(t)) return 'plazos';
    return 'otra';
  }

  function esEncabezadoMeses(l) {
    const palabras = l.texto.split(' ');
    const meses = palabras.filter((p) => /^[A-Za-zÁÉÍÓÚáéíóú]{3,10}\.?$/.test(p) && mesDe(p));
    return meses.length >= 6 && meses.length >= palabras.length - 1;
  }

  function columnasConX(piezas, prueba) {
    if (!piezas) return null;
    const cols = [];
    piezas.forEach((pz) => { const r = prueba(espacios(pz.texto)); if (r) cols.push(Object.assign({ x: pz.x }, r)); });
    return cols;
  }

  function anchoColumna(cols) {
    const xs = cols.map((c) => c.x).sort((a, b) => a - b);
    const difs = [];
    for (let i = 1; i < xs.length; i++) difs.push(xs[i] - xs[i - 1]);
    difs.sort((a, b) => a - b);
    return difs.length ? difs[Math.floor(difs.length / 2)] : 0;
  }

  function masCercana(cols, x) {
    let mejor = null;
    cols.forEach((c) => { if (!mejor || Math.abs(c.x - x) < Math.abs(mejor.x - x)) mejor = c; });
    return mejor;
  }

  function nuevaCuenta(l, perfil) {
    return { _seccion: l.seccion, _inicio: origen(l.pagina, l.seccion, '', l.indice), _modo: null, _cerradaPorNombre: false,
      historial: [], historial24: [], atrasosListados: [], codigosNarrativos: [], comentarios: [], reglasAplicadas: [], _perfil: perfil };
  }

  function asignarCampo(c, h, l, perfil) {
    const org = origen(l.pagina, l.seccion, h.etiqueta, l.indice);
    const campo = h.def.campo;
    if (campo === 'comentarios') {
      if (!VACIO.test(espacios(h.valor)) && !NINGUNO.test(espacios(h.valor))) c.comentarios.push(hacerValor('texto', h.valor, org));
      return;
    }
    if (campo === 'atrasosListados') {
      encontrarFechas(h.valor).forEach(({ fecha }) => c.atrasosListados.push(valor(fecha, fecha.texto, org)));
      return;
    }
    if (campo === 'codigosNarrativos') {
      agregarCodigos(c.codigosNarrativos, h.valor, perfil);
      return;
    }
    if (campo === 'tipo') {
      // TransUnion imprime dos tipos («Installment Account» y «Auto Loan»): gana el más específico.
      const v = hacerValor('texto', h.valor, org);
      const nuevo = tieneValor(v) ? valor(clasificarTipo(v.texto), v.texto, org) : v;
      const generico = c.tipo && ['plazos', 'abierta', 'otra'].includes(c.tipo.valor);
      if (c.tipo === undefined || (generico && ['auto', 'hipoteca', 'estudiantil', 'cobranza'].includes(nuevo.valor))) c.tipo = nuevo;
      return;
    }
    if (c[campo] !== undefined) return;
    c[campo] = hacerValor(h.def.tipo, h.valor, org);
  }

  function agregarCodigos(lista, texto, perfil) {
    const tabla = perfil.codigosNarrativos || {};
    const re = /\b(\d{3})\b(?:\s*[-–:]\s*([^,;]*?))?(?=\s*(?:[,;]|\b\d{3}\b|$))/g;
    let m;
    while ((m = re.exec(texto))) {
      const codigo = m[1];
      if (lista.some((x) => x.codigo === codigo)) continue;
      lista.push({ codigo, descripcion: tabla[codigo] || espacios(m[2] || '') });
    }
  }

  function leerFilaHistorial(c, l, buro, reporte) {
    const anio = +l.texto.slice(0, 4);
    const org = origen(l.pagina, l.seccion, 'Payment History', l.indice);
    const meses = c._columnasMeses;
    const agregar = (texto, mes) => {
      const codigo = codigoPago(texto, buro);
      const verificable = mes != null;
      c.historial.push({ anio, mes: verificable ? mes : null, codigo, texto, mesVerificable: verificable, origen: org });
      if (!verificable && codigo !== 'al_dia' && codigo !== 'sin_datos') {
        reporte.advertencias.push({ codigo: 'mes_no_verificable', detalle: nombreCuenta(c) + ': ' + anio + ', código ' + texto, origen: org });
      }
    };
    if (l.piezas && meses && meses.length) {
      const ancho = anchoColumna(meses);
      l.piezas.forEach((pz, i) => {
        const texto = espacios(pz.texto);
        if (!texto || (i === 0 && /^\d{4}$/.test(texto))) return;
        const col = masCercana(meses, pz.x);
        agregar(texto, col && ancho && Math.abs(col.x - pz.x) < ancho / 2 ? col.mes : null);
      });
    } else {
      l.texto.split(' ').slice(1).forEach((texto) => agregar(texto, null));
    }
  }

  function leerFila24(c, l, perfil) {
    const org = origen(l.pagina, l.seccion, '24-Month History', l.indice);
    const cols = c._columnas24;
    const fila = { mes: normalizarFecha(l.texto.slice(0, 5)) };
    let verificables = !!(l.piezas && cols && cols.length);
    if (verificables) {
      const ancho = anchoColumna(cols);
      l.piezas.forEach((pz, i) => {
        const texto = espacios(pz.texto);
        if (!texto || i === 0) return;
        const col = masCercana(cols, pz.x);
        if (!col || !ancho || Math.abs(col.x - pz.x) >= ancho / 2) { verificables = false; return; }
        if (col.campo === 'codigosNarrativos') {
          fila.codigosNarrativos = fila.codigosNarrativos || [];
          agregarCodigos(fila.codigosNarrativos, texto, perfil);
        } else if (fila[col.campo] === undefined) {
          fila[col.campo] = hacerValor(col.tipo, texto, org);
        }
      });
    } else {
      const monto = l.texto.split(' ').slice(1).find((t) => normalizarMonto(t) !== null);
      if (monto) fila.saldo = hacerValor('monto', monto, org);
    }
    const ordenada = { mes: fila.mes };
    ['saldo', 'pagoProgramado', 'pagoReal', 'fechaUltimoPago', 'vencido', 'saldoMasAlto', 'limite'].forEach((k) => { if (fila[k]) ordenada[k] = fila[k]; });
    ordenada.codigosNarrativos = (fila.codigosNarrativos || []).map((x) => x.codigo);
    ordenada.columnasVerificables = verificables;
    ordenada.origen = org;
    c.historial24.push(ordenada);
  }

  function nombreCuenta(c) {
    return c.acreedor && c.acreedor.valor ? c.acreedor.valor : 'Cuenta sin acreedor legible';
  }

  function cerrarCuenta(c, reporte, usados) {
    const perfil = c._perfil;
    const buro = reporte.buro;
    if (!c.acreedor) c.acreedor = noReportado(c._inicio);
    if (c.numero && tieneValor(c.numero)) c.numero = valor(enmascararCuenta(c.numero.valor), enmascararCuenta(c.numero.valor), c.numero.origen);

    const textoEstado = [c.estado, c.estadoPago, c.designadorActividad].filter(tieneValor).map((v) => v.texto).join(' ');
    // 014: «Paid, Closed. $144 written off.» (Experian) es una pérdida del acreedor: se registra como charge-off.
    const cancelado = textoEstado.match(/\$\s?([\d,]+(?:\.\d{2})?)\s+written off/i);
    if (cancelado && c.montoChargeOff === undefined) {
      const fuente = [c.estado, c.estadoPago, c.designadorActividad].find((v) => tieneValor(v) && /written off/i.test(v.texto));
      c.montoChargeOff = valor(normalizarMonto(cancelado[1]), '$' + cancelado[1], fuente.origen);
    }
    c.cerrada = c._cerradaPorNombre || tieneValor(c.fechaCierre) || /\bclosed\b|cerrad/i.test(textoEstado);
    c.esCobranza = c._seccion === 'cobranzas'
      || (tieneValor(c.tipo) && c.tipo.valor === 'cobranza')
      || /collection|cobranza/i.test(textoEstado)
      || (c._seccion === 'adversas' && tieneValor(c.acreedorOriginal));
    if (c.esCobranza && c._seccion === 'adversas' && perfil.reglas.includes('transunion-cobranzas-en-adversas')) {
      c.reglasAplicadas.push('transunion-cobranzas-en-adversas');
    }
    if (c._seccion === 'adversas') c.reglasAplicadas.push('cuenta-en-adversas');

    // R10, Equifax: con el código narrativo 233, «High Credit» es el límite de crédito.
    if (perfil.reglas.includes('equifax-233-high-credit-es-limite')) {
      const filas233 = c.historial24.filter((f) => f.codigosNarrativos.includes('233'));
      const cuenta233 = c.codigosNarrativos.some((x) => x.codigo === '233') || filas233.length > 0;
      if (cuenta233) {
        if (tieneValor(c.saldoMasAlto)) {
          if (!tieneValor(c.limite)) c.limite = valor(c.saldoMasAlto.valor, c.saldoMasAlto.texto, c.saldoMasAlto.origen);
          c.saldoMasAlto = noReportado(c.saldoMasAlto.origen);
        }
        filas233.forEach((f) => {
          if (f.saldoMasAlto && tieneValor(f.saldoMasAlto) && !f.limite) {
            const fila = {};
            Object.keys(f).forEach((k) => { if (k === 'saldoMasAlto') fila.limite = f.saldoMasAlto; else if (k !== 'limite') fila[k] = f[k]; });
            Object.keys(f).forEach((k) => delete f[k]);
            Object.assign(f, fila);
          }
        });
        c.reglasAplicadas.push('equifax-233-high-credit-es-limite');
      }
    }

    // R10, Experian: «Credit Limit / Original Balance» depende del tipo de cuenta.
    if (perfil.reglas.includes('experian-limite-o-monto-original') && c.limiteOMontoOriginal !== undefined) {
      const tipo = tieneValor(c.tipo) ? c.tipo.valor : null;
      if (tipo === 'rotativa' && c.limite === undefined) { c.limite = c.limiteOMontoOriginal; delete c.limiteOMontoOriginal; }
      else if (['plazos', 'auto', 'hipoteca', 'estudiantil'].includes(tipo) && c.montoOriginal === undefined) { c.montoOriginal = c.limiteOMontoOriginal; delete c.limiteOMontoOriginal; }
      c.reglasAplicadas.push('experian-limite-o-monto-original');
    }

    const slug = sinAcentos(nombreCuenta(c).toLowerCase()).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sin-acreedor';
    const digitos = tieneValor(c.numero) ? c.numero.valor.replace(/\D/g, '') : '';
    const ultimos = digitos ? digitos.slice(-4) : 'xxxx';
    const apertura = tieneValor(c.fechaApertura) && c.fechaApertura.valor.iso ? c.fechaApertura.valor.iso : 'sf';
    let id = buro + '-' + slug + '-' + ultimos + '-' + apertura;
    const base = id;
    let n = 1;
    while (usados.has(id)) id = base + '-' + (++n);
    usados.add(id);
    c.id = id;

    const final = {};
    ORDEN_CUENTA.forEach((k) => { if (c[k] !== undefined) final[k] = c[k]; });
    reporte.cuentas.push(final);
  }

  function leerCuentas(lineas, perfil, reporte) {
    const usados = new Set();
    const inicio = perfil.inicioCuenta;
    let actual = null;
    let marcaPendiente = false;
    const cerrar = () => { if (actual) cerrarCuenta(actual, reporte, usados); actual = null; };
    const abrir = (l) => {
      actual = nuevaCuenta(l, perfil);
      if (marcaPendiente) { actual.marcaNegativaBuro = true; marcaPendiente = false; }
    };

    for (let i = 0; i < lineas.length; i++) {
      const l = lineas[i];
      if (!SECCIONES_DE_CUENTAS.includes(l.seccion) || l.encabezado) { cerrar(); marcaPendiente = false; continue; }
      // 014: Experian imprime «POTENTIALLY NEGATIVE» antes del bloque de la cuenta que marca.
      if (perfil.marcaNegativa && perfil.marcaNegativa.test(l.texto)) { marcaPendiente = true; continue; }

      // ¿Empieza una cuenta nueva?
      if (inicio.tipo === 'linea_siguiente' && inicio.patron.test(l.texto)) {
        const siguiente = lineas[i + 1];
        if (!inicio.siguiente || (siguiente && inicio.siguiente.test(siguiente.texto))) {
          cerrar();
          abrir(l);
          let nombre = l.texto;
          if (/ - Closed$/i.test(nombre)) { actual._cerradaPorNombre = true; nombre = nombre.replace(/ - Closed$/i, ''); }
          const conNumero = nombre.match(/^(.*?) #([0-9*X]{4,})$/);
          const org = origen(l.pagina, l.seccion, 'Nombre del acreedor', l.indice);
          if (conNumero) {
            nombre = conNumero[1];
            actual.numero = hacerValor('cuenta', conNumero[2], origen(l.pagina, l.seccion, 'Número junto al acreedor', l.indice));
          }
          actual.acreedor = valor(espacios(nombre), espacios(nombre), org);
          continue;
        }
      }
      const lectura = leerEtiquetas(l.texto, perfil, ['cuenta']);
      if (inicio.tipo === 'etiqueta') {
        const ancla = lectura.hits.find((h) => h.def.ambito === 'cuenta' && inicio.patron.test(h.etiqueta + ':'));
        if (ancla && (!actual || actual[ancla.def.campo] !== undefined)) { cerrar(); abrir(l); }
      }
      if (!actual) continue;

      // En una tabla extraída de PDF la celda de etiqueta puede caer sola y
      // el valor en el renglón siguiente. Nunca tomamos encabezados ni otra
      // etiqueta como valor, para no convertir texto explicativo en datos.
      if (actual._pendiente && !lectura.hits.length && !l.encabezado && l.texto) {
        const pendiente = actual._pendiente;
        pendiente.valor = l.texto;
        asignarCampo(actual, pendiente, l, perfil);
        actual._pendiente = null;
        continue;
      }

      // Historial de pagos: encabezado de meses, filas por año y tabla de 24 meses (R6).
      if (esEncabezadoMeses(l)) {
        actual._modo = 'meses';
        actual._columnasMeses = columnasConX(l.piezas, (t) => (mesDe(t) ? { mes: mesDe(t) } : null));
        continue;
      }
      if (actual._modo === 'meses' && /^(?:19|20)\d{2}(?: |$)/.test(l.texto)) {
        leerFilaHistorial(actual, l, reporte.buro, reporte);
        continue;
      }
      if (perfil.historial24 && perfil.historial24.encabezado.test(l.texto)) {
        actual._modo = 't24';
        actual._columnas24 = columnasConX(l.piezas, (t) => {
          const col = perfil.historial24.columnas.find((c) => c.patron.test(t));
          return col ? { campo: col.campo, tipo: col.tipo } : null;
        });
        continue;
      }
      if (actual._modo === 't24' && /^\d{2}\/\d{2}\b/.test(l.texto)) {
        leerFila24(actual, l, perfil);
        continue;
      }
      if (!lectura.hits.length) continue;
      actual._modo = null;
      lectura.hits.forEach((h) => {
        if (h.def.ambito !== 'cuenta') return;
        if (!espacios(h.valor) && !h.conDosPuntos) { actual._pendiente = h; return; }
        asignarCampo(actual, h, l, perfil);
      });
    }
    cerrar();
  }

  /* --------------------------------------------------------------- consultas */

  function leerConsultas(lineas, perfil, reporte) {
    let empresaPendiente = null;
    let grupo = [];
    lineas.forEach((l) => {
      if (l.seccion !== 'consultas') return;
      if (l.encabezado) { empresaPendiente = null; grupo = []; return; }
      if (NINGUNO.test(l.texto)) return;
      const lectura = leerEtiquetas(l.texto, perfil, ['consulta']);
      const empresaHit = lectura.hits.find((h) => h.def.campo === 'empresa');
      if (empresaHit && espacios(empresaHit.valor)) empresaPendiente = hacerValor('texto', empresaHit.valor, origen(l.pagina, l.seccion, empresaHit.etiqueta, l.indice));
      const fechaHit = lectura.hits.find((h) => h.def.campo === 'fecha');
      const fechas = fechaHit ? encontrarFechas(fechaHit.valor) : (lectura.hits.length ? [] : encontrarFechas(l.texto));
      const org = (etiqueta) => origen(l.pagina, l.seccion, etiqueta, l.indice);

      if (fechas.length) {
        let prefijo = fechaHit ? lectura.prefijo : l.texto.slice(0, fechas[0].inicio).trim();
        let tipo = null;
        const palabra = prefijo.match(/\s*\b(hard|soft|dura|blanda)\b\s*/i);
        if (palabra) {
          tipo = /hard|dura/i.test(palabra[1]) ? 'dura' : 'blanda';
          prefijo = espacios(prefijo.replace(palabra[0], ' '));
        }
        prefijo = prefijo.replace(/[|,;:-]+$/, '').trim();
        const empresa = empresaHit ? empresaPendiente : (prefijo ? valor(prefijo, prefijo, org('Empresa')) : (empresaPendiente || noReportado(org('Empresa'))));
        const etiquetaFecha = fechaHit ? fechaHit.etiqueta : 'Fecha';
        grupo = fechas.map(({ fecha }) => ({
          empresa, tipo: tipo || l.tipoConsulta || 'desconocida', fecha: valor(fecha, fecha.texto, org(etiquetaFecha))
        }));
        grupo.forEach((c) => reporte.consultas.push(c));
        return;
      }
      if (lectura.hits.length) {
        lectura.hits.forEach((h) => {
          if (h.def.ambito !== 'consulta') return;
          const v = hacerValor(h.def.tipo, h.valor, org(h.etiqueta));
          grupo.forEach((c) => { if (c[h.def.campo] === undefined) c[h.def.campo] = v; });
        });
        return;
      }
      empresaPendiente = valor(l.texto, l.texto, org('Empresa'));
      grupo = [];
    });
  }

  /* ----------------------------------------------------- registros públicos */

  function tipoRegistro(texto) {
    const m = String(texto).match(/(?:chapter|cap[ií]tulo)\s*(7|11|12|13)\b/i);
    return m ? 'bancarrota_' + m[1] : 'otro';
  }

  function leerRegistros(lineas, perfil, reporte) {
    let actual = null;
    const cerrar = () => {
      if (!actual) return;
      if (!actual.tipo) actual.tipo = valor('otro', '', actual._inicio);
      delete actual._inicio;
      reporte.registrosPublicos.push(actual);
      actual = null;
    };
    lineas.forEach((l) => {
      if (l.seccion !== 'registros_publicos' || l.encabezado) { cerrar(); return; }
      if (NINGUNO.test(l.texto)) return;
      const org = (etiqueta) => origen(l.pagina, l.seccion, etiqueta, l.indice);
      const { hits } = leerEtiquetas(l.texto, perfil, ['registro']);
      if (!hits.length) {
        if (/bankruptcy|quiebra|bancarrota|chapter|cap[ií]tulo/i.test(l.texto)) {
          cerrar();
          actual = { _inicio: org(''), tipo: valor(tipoRegistro(l.texto), l.texto, org('Tipo')) };
        }
        return;
      }
      hits.forEach((h) => {
        if (h.def.ambito !== 'registro') return;
        if (!actual || actual[h.def.campo] !== undefined) { cerrar(); actual = { _inicio: org(h.etiqueta) }; }
        actual[h.def.campo] = hacerValor(h.def.tipo, h.valor, org(h.etiqueta));
      });
    });
    cerrar();
  }

  /* ---------------------------------------------------------- leerReporte */

  function buscarNombrePersonalSinEtiqueta(lineas) {
    const intro = /creditors use your personal information|this section includes|your credit report provides|esta secci[oó]n incluye/i;
    const stop = /^(?:addresses?|direcciones?|phones?|telefonos?|employers?|empleadores?|social security|seguro social|date of birth|fecha de nacimiento)\b/i;
    for (let i = 0; i < lineas.length; i++) {
      const l = lineas[i];
      if (l.seccion !== 'personal' || l.encabezado) continue;
      const txt = espacios(l.texto);
      if (!txt || txt.includes(':') || intro.test(txt) || stop.test(txt)) continue;
      const palabras = txt.split(' ').filter(Boolean);
      if (txt.length >= 3 && txt.length <= 60 && palabras.length >= 2 && palabras.length <= 6 && !/\d/.test(txt) && /^[a-zA-Z .,'-]+$/.test(txt)) {
        return valor(txt, txt, origen(l.pagina, l.seccion, 'nombre', l.indice));
      }
    }
    return null;
  }

  function leerNombrePreparado(paginas) {
    for (let pi = 0; pi < Math.min(paginas.length, 3); pi++) {
      const pagina = paginas[pi] || {};
      const lineas = pagina.lineas || [];
      for (let li = 0; li < lineas.length; li++) {
        const texto = espacios(lineas[li] && lineas[li].texto);
        const m = texto.match(/^prepared for:?\s*(.*)$/i) || texto.match(/^preparado para:?\s*(.*)$/i);
        if (m) {
          let nombre = espacios(m[1]);
          let linIndice = li;
          if (!nombre && li + 1 < lineas.length) {
            const sig = espacios(lineas[li + 1] && lineas[li + 1].texto);
            if (sig && !/^date:/i.test(sig) && !/^confirmation/i.test(sig) && !/^report\b/i.test(sig)) {
              nombre = sig;
              linIndice = li + 1;
            }
          }
          if (nombre && nombre.length >= 3 && nombre.length <= 60 && !/\d/.test(nombre)) {
            return valor(nombre, nombre, origen(pagina.numero || pi + 1, 'resumen', 'Prepared for:', linIndice));
          }
        }
      }
    }
    return null;
  }

  function leerFechaReporte(paginas, perfil) {
    for (let pi = 0; pi < Math.min(paginas.length, 2); pi++) {
      const pagina = paginas[pi] || {};
      const lineas = pagina.lineas || [];
      for (let li = 0; li < lineas.length; li++) {
        const texto = espacios(lineas[li] && lineas[li].texto);
        const hit = leerEtiquetas(texto, perfil, ['reporte']).hits.find((h) => h.def.campo === 'fechaReporte' && normalizarFecha(h.valor));
        if (hit) return hacerValor('fecha', hit.valor, origen(pagina.numero || pi + 1, 'desconocida', hit.etiqueta, li));
      }
    }
    return undefined;
  }

  function leerReporte(paginas, opciones) {
    if (!Array.isArray(paginas)) throw new TypeError('leerReporte espera un arreglo de páginas');
    const ops = opciones || {};
    const p = perfiles();
    const usadas = paginas.slice(0, MAX_PAGINAS);
    const paginasTotales = Math.max(ops.paginasTotales || 0, paginas.length);
    const conTexto = usadas.some((pg) => (pg && pg.lineas || []).some((l) => espacios(l && l.texto)));

    const forzado = ops.buro && (p[ops.buro] || ops.buro === 'desconocido');
    const det = forzado
      ? { buro: ops.buro, formatoVerificado: ops.buro !== 'desconocido' }
      : (conTexto ? detectarBuro(usadas) : { buro: 'desconocido', formatoVerificado: false });
    const perfil = det.buro === 'desconocido' ? p.generico : p[det.buro];

    const reporte = {
      buro: det.buro,
      perfil: { id: perfil.id, verificadoEl: perfil.verificadoEl, formatoVerificado: det.formatoVerificado },
      paginasLeidas: usadas.length,
      paginasTotales,
      identidad: { nombres: [], direcciones: [], telefonos: [], empleadores: [], ssnMostrado: false, ssnUltimos4: null, fechaNacimientoMostrada: false },
      avisos: [],
      cuentas: [],
      consultas: [],
      registrosPublicos: [],
      advertencias: []
    };
    if (paginasTotales > usadas.length) {
      reporte.advertencias.push({ codigo: 'paginas_truncadas', detalle: 'Se leyeron ' + usadas.length + ' de ' + paginasTotales + ' páginas.' });
    }
    if (!conTexto) {
      reporte.advertencias.push({ codigo: 'sin_texto', detalle: 'El archivo no tiene texto que se pueda leer; puede ser una imagen escaneada.' });
      return reporte;
    }
    if (!det.formatoVerificado) {
      reporte.advertencias.push({ codigo: 'formato_no_verificado', detalle: 'No reconocimos el buró; se usó la lectura genérica.' });
    }

    const fechaReporte = leerFechaReporte(usadas, perfil);
    if (fechaReporte) {
      const ordenado = { buro: reporte.buro, perfil: reporte.perfil, fechaReporte };
      Object.keys(reporte).forEach((k) => { if (!(k in ordenado)) ordenado[k] = reporte[k]; });
      Object.keys(reporte).forEach((k) => delete reporte[k]);
      Object.assign(reporte, ordenado);
    }

    const lineas = prepararPaginas(usadas, perfil);
    leerIdentidadYAvisos(lineas, perfil, reporte);
    if (!reporte.identidad.nombres.length) {
      const nombrePers = buscarNombrePersonalSinEtiqueta(lineas);
      const nombrePrep = leerNombrePreparado(usadas);
      const candidato = nombrePers || nombrePrep;
      if (candidato) reporte.identidad.nombres.push(candidato);
    }
    leerCuentas(lineas, perfil, reporte);
    leerConsultas(lineas, perfil, reporte);
    leerRegistros(lineas, perfil, reporte);
    const textoLeido = lineas.map((l) => l.texto).join('\n');
    if (!reporte.cuentas.length && /\b(?:Account Name|Account Number|Date Opened|Accounts|Credit Accounts|Satisfactory Accounts|Accounts with Adverse Information|Cuentas)\b/i.test(textoLeido)) {
      reporte.advertencias.push({ codigo: 'cuentas_no_leidas', detalle: 'El reporte muestra señales de cuentas que no pudimos estructurar.' });
    }
    if (!reporte.consultas.length && /\b(?:Credit Inquiries|Hard Inquiries|Soft Inquiries|Regular Inquiries|Promotional Inquiries|Account Review Inquiries|Inquiries|Consultas)\b/i.test(textoLeido)) {
      reporte.advertencias.push({ codigo: 'consultas_no_leidas', detalle: 'El reporte muestra señales de consultas que no pudimos estructurar.' });
    }
    reporte.cuentas.forEach((c) => { delete c._perfil; });
    return reporte;
  }

  /* Totales para el resumen de la página; sustituye a extractAccountsSummary y extractInquiriesSummary. */
  function resumen(reporte) {
    const cuentas = (reporte && reporte.cuentas) || [];
    const consultas = (reporte && reporte.consultas) || [];
    return {
      cuentas: cuentas.length,
      abiertas: cuentas.filter((c) => !c.cerrada).length,
      cerradas: cuentas.filter((c) => c.cerrada).length,
      rotativas: cuentas.filter((c) => c.tipo && c.tipo.valor === 'rotativa').length,
      cobranzas: cuentas.filter((c) => c.esCobranza).length,
      consultasDuras: consultas.filter((c) => c.tipo === 'dura').length,
      consultasBlandas: consultas.filter((c) => ['blanda', 'promocional', 'revision_cuenta'].includes(c.tipo)).length,
      registrosPublicos: ((reporte && reporte.registrosPublicos) || []).length
    };
  }

  const API = {
    leerReporte, detectarBuro, prepararPaginas, normalizarFecha, normalizarMonto, enmascararCuenta,
    codigoPago, resumen, CODIGOS_COMUNES
  };
  if (typeof window !== 'undefined') window.ThemoraLector = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
