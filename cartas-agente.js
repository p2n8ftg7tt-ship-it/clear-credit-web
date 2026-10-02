/* ===========================================================================
   Cartas del agente de crédito (spec 018) — lado del navegador

   El agente PROPONE cartas (tipo, cuentas, motivo de una lista cerrada); este
   módulo las convierte en BORRADORES con las plantillas bilingües de
   cartas-bilingues.js y controla la APROBACIÓN. Solo el consumidor aprueba, y
   el sitio nunca envía una carta: entrega el texto para que él la mande.

   Los datos del consumidor (nombre, dirección, teléfono, dirección del
   cobrador) y los últimos 4 dígitos de las cuentas se quedan en el
   dispositivo. No usa IA, no hace llamadas de red y no guarda nada.

   Uso:  ThemoraCartasAgente.crearBorradores(resultado, preparado, { buro })
         → actualizarDatos / confirmar → textoFinal (solo si está aprobada)
   Contrato: specs/018-cartas-agente/contracts/cartas-agente-api.md
   =========================================================================== */
(function () {
  'use strict';

  const CARTAS = (typeof window !== 'undefined' && window.ThemoraCartas) ? window.ThemoraCartas
    : (typeof require === 'function' ? require('./cartas-bilingues.js') : null);

  /* Guía fija de envío (FR-014): sin promesas de resultado. */
  const PASOS_COMUNES = [
    'Envíala por correo certificado con acuse de recibo (Certified Mail, Return Receipt Requested).',
    'Manda copias, nunca originales, de tu identificación, comprobante de domicilio y las páginas del reporte.',
    'Guarda una copia de la carta firmada y el recibo del correo: son tu prueba de que la enviaste.'
  ];
  const GUIA_ENVIO = Object.freeze({
    'bureau-dispute': Object.freeze(PASOS_COMUNES.concat(['El buró tiene normalmente 30 días (a veces 45) para investigar y responderte por escrito.'])),
    'identity': Object.freeze(PASOS_COMUNES.concat(['El buró tiene normalmente 30 días (a veces 45) para investigar y responderte por escrito.'])),
    'debt-validation': Object.freeze(PASOS_COMUNES.concat(['Mientras el cobrador no responda con la validación, debe pausar el cobro. Envíala dentro de los 30 días desde que recibiste su aviso.']))
  });

  const texto = (x) => String(x == null ? '' : x).trim();

  function congelar(b) {
    b.cuentas.forEach((x) => Object.freeze(x));
    b.etiquetas.forEach((x) => Object.freeze(x));
    Object.freeze(b.cuentas);
    Object.freeze(b.etiquetas);
    if (b.destino) { Object.freeze(b.destino.direccion); Object.freeze(b.destino); }
    Object.freeze(b.datos.remitente);
    Object.freeze(b.datos.cobrador);
    Object.freeze(b.datos);
    Object.freeze(b.confirmaciones);
    Object.freeze(b.faltan);
    return Object.freeze(b);
  }

  /* Qué falta para poder aprobar (FR-010), siempre en este orden. */
  function calcularFaltan(b) {
    const r = b.datos.remitente, c = b.datos.cobrador;
    const faltan = [];
    if (!texto(r.givenNames) || !texto(r.firstSurname)) faltan.push('falta_nombre');
    if (!texto(r.street) || !texto(r.city) || !texto(r.state) || !texto(r.postalCode)) faltan.push('falta_direccion');
    if (b.tipo !== 'debt-validation' && !b.destino) faltan.push('falta_destinatario');
    if (b.tipo === 'debt-validation' && ['nombre', 'calle', 'ciudad', 'estado', 'cp'].some((k) => !texto(c[k]))) faltan.push('falta_cobrador');
    return faltan;
  }

  /* Arma un borrador nuevo (nunca muta el anterior) y le calcula estado y faltantes. */
  function rehacer(base, cambios) {
    const b = Object.assign({}, base, cambios, {
      cuentas: base.cuentas.map((x) => Object.assign({}, x)),
      etiquetas: base.etiquetas.map((x) => Object.assign({}, x)),
      destino: base.destino ? { nombre: base.destino.nombre, destinatario: base.destino.destinatario, direccion: base.destino.direccion.slice() } : null
    });
    b.datos = {
      remitente: Object.assign({}, base.datos.remitente, cambios && cambios.datos ? cambios.datos.remitente : null),
      cobrador: Object.assign({}, base.datos.cobrador, cambios && cambios.datos ? cambios.datos.cobrador : null)
    };
    b.confirmaciones = Object.assign({}, base.confirmaciones, cambios && cambios.confirmaciones);
    b.faltan = calcularFaltan(b);
    b.estado = b.faltan.length ? 'incompleto'
      : (b.confirmaciones.inexacta && b.confirmaciones.yoEnvio ? 'aprobada' : 'borrador');
    return congelar(b);
  }

  function crearBorradores(resultado, preparado, opciones) {
    if (!resultado || resultado.modo !== 'ia' || !Array.isArray(resultado.cartas) || !resultado.cartas.length) return [];
    const privado = (preparado && preparado.privado) || { cuentas: {}, identidad: {} };
    const buroBase = CARTAS && CARTAS.BUROS ? CARTAS.BUROS[opciones && opciones.buro] : null;
    return resultado.cartas.map((propuesta, i) => {
      const destino = propuesta.tipo === 'debt-validation' || !buroBase ? null : buroBase;
      return rehacer({
        id: 'carta-' + (i + 1),
        tipo: propuesta.tipo,
        propuesta,
        cuentas: (propuesta.cuentas || []).map((c) => {
          const p = privado.cuentas[c.letra] || {};
          return { letra: c.letra, acreedor: p.acreedor || null, ultimos4: p.ultimos4 || null, motivo: c.motivo };
        }),
        etiquetas: (propuesta.etiquetas || []).map((etiqueta) => {
          const p = privado.identidad[etiqueta] || {};
          return { etiqueta, tipo: p.tipo || null, valor: p.valor || null };
        }),
        destino,
        datos: { remitente: {}, cobrador: {} },
        confirmaciones: { inexacta: false, yoEnvio: false }
      });
    });
  }

  /* Cambiar datos reinicia las confirmaciones: una carta aprobada vuelve a borrador (FR-013). */
  function actualizarDatos(borrador, datos) {
    const d = datos || {};
    return rehacer(borrador, {
      datos: { remitente: d.remitente || {}, cobrador: d.cobrador || {} },
      confirmaciones: { inexacta: false, yoEnvio: false }
    });
  }

  function confirmar(borrador, confirmaciones) {
    const c = confirmaciones || {};
    const cambios = {};
    if (typeof c.inexacta === 'boolean') cambios.inexacta = c.inexacta;
    if (typeof c.yoEnvio === 'boolean') cambios.yoEnvio = c.yoEnvio;
    return rehacer(borrador, { confirmaciones: cambios });
  }

  /* Solo una carta aprobada entrega su texto final (FR-012). */
  function textoFinal(borrador, opciones) {
    if (!borrador || borrador.estado !== 'aprobada') throw new TypeError('carta_no_aprobada');
    const fecha = (opciones && opciones.fecha) || new Date();
    const remitente = borrador.datos.remitente;
    let carta;
    if (borrador.tipo === 'bureau-dispute') {
      carta = CARTAS.armar('bureau-dispute', {
        remitente,
        buro: borrador.destino,
        motivo: borrador.cuentas.length === 1 ? borrador.cuentas[0].motivo : 'other',
        cuentas: borrador.cuentas.map((c) => ({ acreedor: c.acreedor, ultimos4: c.ultimos4, motivo: c.motivo })),
        hallazgo: null,
        fecha
      });
    } else if (borrador.tipo === 'debt-validation') {
      const ultimos4 = borrador.cuentas[0] && borrador.cuentas[0].ultimos4;
      carta = CARTAS.armar('debt-validation', {
        remitente,
        cobrador: borrador.datos.cobrador,
        referencia: ultimos4 ? '****' + ultimos4 : '',
        hallazgo: { clave: 'collection' },
        fecha
      });
    } else {
      carta = CARTAS.armar(borrador.propuesta.subtipo, {
        remitente,
        buro: borrador.destino,
        valoresDisputados: borrador.etiquetas.map((e) => ({ type: e.tipo, value: e.valor })),
        fecha
      });
    }
    return { textoEn: carta.textoEn, textoEs: carta.textoEs, bloques: carta.bloques, guia: GUIA_ENVIO[borrador.tipo] };
  }

  const API = { crearBorradores, actualizarDatos, confirmar, textoFinal, GUIA_ENVIO };
  if (typeof window !== 'undefined') window.ThemoraCartasAgente = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
