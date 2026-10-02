/* ===========================================================================
   Vista del agente de crédito en credito.html (spec 019)

   Funciones puras: reciben datos y devuelven HTML en el que todo texto variable
   pasa por escapar(). La página solo conecta eventos. No toca el DOM, no hace
   llamadas de red y no guarda nada. Contrato: specs/019-agente-en-credito/contracts/vista-api.md
   =========================================================================== */
(function () {
  'use strict';

  const AVISO = 'Esto es información educativa, no asesoría legal ni financiera. Revisa tu reporte original antes de actuar.';
  const TIPO_PASO = { disputar: 'Disputar', pagar: 'Pagar', esperar: 'Esperar', proteger: 'Proteger', revisar: 'Revisar' };
  const MOTIVO_RESPALDO = {
    sin_sesion: 'Inicia sesión para usar el análisis con IA. Mientras tanto, aquí tienes los cálculos de tu reporte.',
    limite_diario: 'Ya usaste tus 3 análisis con IA de hoy. Puedes volver a usarlo mañana. Aquí tienes los cálculos de tu reporte.',
    ia_no_disponible: 'El análisis con IA no está disponible en este momento. Aquí tienes los cálculos de tu reporte.',
    demasiadas_vueltas: 'El análisis con IA no terminó a tiempo. Aquí tienes los cálculos de tu reporte.',
    respuesta_no_valida: 'El análisis con IA no pasó nuestras revisiones de calidad. Aquí tienes los cálculos de tu reporte.',
    datos_rechazados: 'Para proteger tus datos, no enviamos este reporte a la IA. Aquí tienes los cálculos de tu reporte.',
    no_configurado: 'El análisis con IA todavía no está activado en este sitio. Aquí tienes los cálculos de tu reporte.'
  };
  const FALTA = { falta_nombre: 'tu nombre', falta_direccion: 'tu dirección', falta_destinatario: 'a quién va dirigida (no reconocimos el buró)', falta_cobrador: 'los datos del cobrador' };
  const HERRAMIENTA = {
    calcularUtilizacion: 'Calculando cuánto usas de tus tarjetas',
    buscarPosiblesDuplicados: 'Buscando deudas que podrían estar dos veces',
    contarConsultasDuras: 'Contando las consultas duras del último año'
  };
  const MOTIVO_NO_CALCULABLE = { falta_dofd: 'falta la fecha del primer atraso', dofd_imprecisa: 'la fecha del primer atraso no trae el mes', sin_atrasos_verificables: 'no se pudo ubicar el mes de los atrasos' };

  function escapar(x) {
    return String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* «Cuenta A (ACME BANK)»: el acreedor sale de los datos privados del dispositivo. */
  function nombreCuenta(letra, privado, mayuscula) {
    const p = privado && privado.cuentas && privado.cuentas[letra];
    return (mayuscula === false ? 'cuenta ' : 'Cuenta ') + escapar(letra) + (p && p.acreedor ? ' (' + escapar(p.acreedor) + ')' : '');
  }

  function textoEvento(codigo, privado) {
    const c = String(codigo || '');
    if (c === 'etiquetando') return 'Quitando tus datos personales antes de enviar';
    if (c === 'terminado') return 'Listo';
    let m = /^enviando:(\d+)$/.exec(c);
    if (m) return m[1] === '1' ? 'Enviando tu reporte sin datos personales al agente' : 'El agente sigue revisando (paso ' + m[1] + ')';
    if (/^reintentando:\d+$/.test(c)) return 'Volviendo a intentar';
    m = /^herramienta:calcularFechaSalida:([A-Z]{1,3})$/.exec(c);
    if (m) {
      const p = privado && privado.cuentas && privado.cuentas[m[1]];
      return 'Calculando hasta cuándo puede aparecer la cuenta ' + m[1] + (p && p.acreedor ? ' (' + p.acreedor + ')' : '');
    }
    m = /^herramienta:(\w+)$/.exec(c);
    if (m && HERRAMIENTA[m[1]]) return HERRAMIENTA[m[1]];
    m = /^respaldo:(\w+)$/.exec(c);
    if (m && MOTIVO_RESPALDO[m[1]]) return MOTIVO_RESPALDO[m[1]];
    return 'Trabajando…';
  }

  function renderMarcar(datos) {
    const d = datos || {};
    const cuentas = (d.cuentas || []).map((c) => '<label><input type="checkbox" name="marca-cuenta" value="' + escapar(c.id) + '"> ' +
      escapar(c.acreedor) + (c.frase ? ' — ' + escapar(c.frase) : '') + '</label>').join('');
    const personales = (d.datos || []).map((x) => '<label><input type="checkbox" name="marca-dato" value="' + escapar(x.etiqueta) + '"> ' +
      escapar(x.tipo) + ': ' + escapar(x.valor) + '</label>').join('');
    return '<form class="cr-marcar" id="crMarcarForm">' +
      '<h4>¿Hay algo que no reconoces?</h4>' +
      '<p>Marca solo lo que no es tuyo. El agente lo tendrá en cuenta. Tus datos se quedan en este dispositivo.</p>' +
      (cuentas ? '<fieldset><legend>Cuentas</legend>' + cuentas + '</fieldset>' : '') +
      (personales ? '<fieldset><legend>Tus datos personales</legend>' + personales + '</fieldset>' : '') +
      '<div class="cr-marcar-acciones"><button type="submit">Analizar</button> <button type="button" data-accion="cancelar-marcar">Cancelar</button></div>' +
      '</form>';
  }

  function pasoHtml(paso, privado) {
    const cuentas = (paso.cuentas || []).map((l) => nombreCuenta(l, privado)).join(', ');
    const hechos = (paso.hechos || []).map((h) => '<li>' + escapar(h.dato) + ' <span class="cr-fuente" data-fuente="' + (h.fuente === 'herramienta' ? 'herramienta' : 'reporte') + '">' +
      (h.fuente === 'herramienta' ? 'calculado' : 'del reporte') + '</span></li>').join('');
    return '<li data-tipo="' + escapar(paso.tipo) + '"><span class="cr-agente-tipo">' + escapar(TIPO_PASO[paso.tipo] || paso.tipo) + '</span>' +
      (cuentas ? ' <span class="cr-agente-cuentas">' + cuentas + '</span>' : '') +
      (hechos ? '<ul class="cr-agente-hechos">' + hechos + '</ul>' : '') +
      '<p class="cr-agente-interpretacion">' + escapar(paso.interpretacion) + '</p>' +
      '<p class="cr-agente-accion">' + escapar(paso.accion) + '</p></li>';
  }

  const lista = (titulo, items, fn) => (items && items.length
    ? '<h4>' + titulo + '</h4><ul>' + items.map((x) => '<li>' + (fn ? fn(x) : escapar(x)) + '</li>').join('') + '</ul>' : '');

  function renderLocal(r, privado) {
    const h = r.herramientas || {};
    const noSe = '<p>No se pudo calcular.</p>';
    let fechas = noSe;
    if (Array.isArray(h.fechasSalida)) {
      const filas = h.fechasSalida.filter((f) => f.estado !== 'no_aplica').map((f) => {
        if (f.estado === 'calculado') {
          return '<li>' + nombreCuenta(f.cuentaId, privado) + ': ' + f.fechas.map((x) => escapar(x.salida) + (x.estimada ? ' (estimada)' : '')).join(', ') + '</li>';
        }
        return '<li>' + nombreCuenta(f.cuentaId, privado) + ': no se puede calcular (' + escapar(MOTIVO_NO_CALCULABLE[f.motivo] || f.motivo) + ')</li>';
      });
      fechas = filas.length ? '<ul>' + filas.join('') + '</ul>' : '<p>Ninguna cuenta tiene datos negativos con fecha de salida.</p>';
    }
    let uso = noSe;
    if (h.utilizacion) {
      const u = h.utilizacion;
      uso = u.total ? '<ul>' + u.porCuenta.map((c) => '<li>' + nombreCuenta(c.cuentaId, privado) + ': ' + escapar(c.porcentaje) + '%</li>').join('') +
        '<li><strong>Total: ' + escapar(u.total.porcentaje) + '%</strong></li></ul>' : '<p>Sin dato: no hay tarjetas abiertas con límite.</p>';
    }
    let dup = noSe;
    if (Array.isArray(h.duplicados)) {
      dup = h.duplicados.length ? '<ul>' + h.duplicados.map((d) => '<li>' + nombreCuenta(d.cuentas[0], privado) + ' y ' + nombreCuenta(d.cuentas[1], privado, false) + '</li>').join('') + '</ul>'
        : '<p>No encontramos deudas que parezcan repetidas.</p>';
    }
    let consultas = noSe;
    if (h.consultasDuras) {
      const q = h.consultasDuras;
      consultas = '<p>' + escapar(q.total) + (q.total === 1 ? ' consulta dura' : ' consultas duras') +
        (q.inciertas && q.inciertas.length ? ' (y ' + q.inciertas.length + ' con fecha incompleta en el borde)' : '') + '</p>';
    }
    return '<section class="cr-agente-resultado" data-modo="local">' +
      '<p class="cr-agente-motivo">' + escapar(MOTIVO_RESPALDO[r.motivo] || MOTIVO_RESPALDO.ia_no_disponible) + '</p>' +
      '<h4>Fechas de salida</h4>' + fechas +
      '<h4>Uso de tus tarjetas</h4>' + uso +
      '<h4>Posibles deudas repetidas</h4>' + dup +
      '<h4>Consultas duras en 12 meses</h4>' + consultas +
      '<p class="cr-aviso">' + AVISO + '</p></section>';
  }

  function renderResultado(resultado, privado) {
    const r = resultado || {};
    if (r.modo !== 'ia') return renderLocal(r, privado);
    return '<section class="cr-agente-resultado">' +
      '<h3>Lo que encontró el agente</h3>' +
      '<p class="cr-agente-diagnostico">' + escapar(r.diagnostico) + '</p>' +
      ((r.plan || []).length ? '<ol class="cr-agente-plan">' + r.plan.map((p) => pasoHtml(p, privado)).join('') + '</ol>' : '') +
      lista('Después', r.despues) +
      lista('Preguntas para ti', r.preguntasParaTi) +
      lista('Para verificar', r.verificar) +
      lista('Datos personales para revisar', r.datosPersonales, (d) => '<strong>' + escapar(d.etiqueta) + '</strong>: ' + escapar(d.razon)) +
      '<p class="cr-aviso">' + AVISO + '</p></section>';
  }

  function renderAgenteEnCirculo(resultado, letra, privado) {
    if (!resultado || resultado.modo !== 'ia' || !letra) return '';
    const pasos = (resultado.plan || []).filter((p) => (p.cuentas || []).includes(letra));
    if (!pasos.length) return '';
    return '<section class="cr-agente-circulo"><h5>Lo que dice el agente</h5><ol class="cr-agente-plan">' + pasos.map((p) => pasoHtml(p, privado)).join('') + '</ol></section>';
  }

  /* ------------------------------------------------------------ tarjetas de cartas (FR-012 a FR-016) */

  const TITULO_CARTA = { 'bureau-dispute': 'Disputa al buró', 'debt-validation': 'Validación de deuda', identity: 'Corrección de datos personales' };
  const CAMPOS_REMITENTE = [['givenNames', 'Nombre o nombres'], ['firstSurname', 'Primer apellido'], ['secondSurname', 'Segundo apellido (si aplica)'],
    ['street', 'Calle y número'], ['city', 'Ciudad'], ['state', 'Estado'], ['postalCode', 'Código postal'], ['currentPhone', 'Teléfono']];
  const CAMPOS_COBRADOR = [['nombre', 'Nombre de la agencia de cobranza'], ['calle', 'Calle y número'], ['ciudad', 'Ciudad'], ['estado', 'Estado'], ['cp', 'Código postal']];

  function campos(grupo, lista, valores, id) {
    return lista.map(([campo, etiqueta]) => '<label class="cr-carta-campo">' + escapar(etiqueta) +
      '<input type="text" data-id="' + escapar(id) + '" data-campo="' + grupo + '.' + campo + '" value="' + escapar((valores || {})[campo] || '') + '"></label>').join('');
  }

  function renderCarta(borrador, textoFinal) {
    const b = borrador || {};
    const validacion = b.tipo === 'debt-validation';
    const destinatario = validacion ? 'el cobrador' : (b.destino ? b.destino.destinatario : 'buró no reconocido');
    const cuentas = (b.cuentas || []).map((c) => escapar(c.acreedor || ('Cuenta ' + c.letra)) + (c.ultimos4 ? ' (termina en ' + escapar(c.ultimos4) + ')' : '')).join(', ');
    const estado = b.estado === 'incompleto' ? 'Falta: ' + (b.faltan || []).map((f) => FALTA[f] || f).join(', ')
      : b.estado === 'aprobada' ? 'Aprobada: lista para que la envíes tú' : 'Marca las dos confirmaciones para aprobarla';
    const conf = b.confirmaciones || {};
    const casilla = (clave, texto) => '<label class="cr-carta-confirmacion"><input type="checkbox" data-id="' + escapar(b.id) + '" data-confirmacion="' + clave + '"' + (conf[clave] ? ' checked' : '') + '> ' + texto + '</label>';
    let final = '';
    if (b.estado === 'aprobada' && textoFinal) {
      const celda = (clase, lang, lineas) => '<div class="cr-letter-cell ' + clase + '" lang="' + lang + '">' + (lineas || []).map((l) => '<p>' + escapar(l) + '</p>').join('') + '</div>';
      final = '<div class="cr-letter-pair" role="group" aria-label="Carta en español y en inglés">' +
        (textoFinal.bloques || []).map((bl) => '<div class="cr-letter-row">' + celda('es', 'es', bl.es) + celda('en', 'en', bl.en) + '</div>').join('') + '</div>' +
        '<button type="button" class="cr-outline-btn" data-accion="copiar-carta" data-id="' + escapar(b.id) + '">Copiar carta en inglés</button>' +
        '<ol class="cr-carta-guia">' + (textoFinal.guia || []).map((g) => '<li>' + escapar(g) + '</li>').join('') + '</ol>';
    }
    return '<article class="cr-carta-agente" data-id="' + escapar(b.id) + '" data-estado="' + escapar(b.estado) + '">' +
      '<h4>' + escapar(TITULO_CARTA[b.tipo] || 'Carta') + '</h4>' +
      '<p class="cr-carta-para">Para: ' + escapar(destinatario) + (cuentas ? '. Cuentas: ' + cuentas : '') + '</p>' +
      '<fieldset><legend>Tus datos</legend>' + campos('remitente', CAMPOS_REMITENTE, (b.datos || {}).remitente, b.id) + '</fieldset>' +
      (validacion ? '<fieldset><legend>Datos del cobrador</legend>' + campos('cobrador', CAMPOS_COBRADOR, (b.datos || {}).cobrador, b.id) + '</fieldset>' : '') +
      casilla('inexacta', validacion ? 'Quiero pedir la validación de esta deuda' : 'Revisé que esta información es inexacta') +
      casilla('yoEnvio', 'Yo envío esta carta') +
      '<p class="cr-carta-estado" role="status">' + escapar(estado) + '</p>' + final + '</article>';
  }

  const API = { AVISO, TIPO_PASO, MOTIVO_RESPALDO, FALTA, escapar, textoEvento, renderMarcar, renderResultado, renderAgenteEnCirculo, renderCarta };
  if (typeof window !== 'undefined') window.ThemoraAgenteVista = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
