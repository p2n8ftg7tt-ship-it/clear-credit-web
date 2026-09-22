/* =========================================================================
   Cartas en español e inglés (credito.html → analizador de reporte)
   =========================================================================

   La persona ve cada carta en DOS columnas: español, para que la entienda, e
   inglés, que es la que se envía al buró o a la agencia de cobranza.

   Cómo se evita que las dos se desalineen (Principio IV de la constitución):
   cada carta es UNA lista de bloques, y cada bloque trae su versión en español
   (es) y en inglés (en) lado a lado. Los datos de la persona se meten una sola
   vez, por el mismo camino, en las dos. tests/cartas-bilingues.test.js comprueba
   que los mismos datos, la misma ley y los mismos plazos salgan en las dos.

   Lo que NO hace: no usa IA, no traduce, no sale a la red y no guarda nada.
   - Lo que la persona escribe (nombres, direcciones, «Detalle adicional») y lo
     que dice su reporte (cuentas, valores) se copian TAL CUAL en las dos.
   - Solo el texto que genera el sitio existe en los dos idiomas.

   El español es la fuente de verdad: es el texto que el sitio ya tenía, sin
   cambios. El inglés es su equivalente en un tono formal de carta de negocios;
   no agrega ni quita ninguna petición ni cita legal.

   TODO(NATIVE_REVIEW): el inglés lo escribió Claude (IA). Falta la revisión de una
   persona que lo hable con fluidez (Principio V de la constitución) y, de
   preferencia, una revisión legal de ambos idiomas. Mientras tanto, la página
   dice que el borrador en inglés lo revisa la persona antes de enviarlo.
   Ver INSTRUCCIONES-CARTAS-BILINGUES.md.

   Uso:  ThemoraCartas.armar('identity' | 'bureau-dispute' | 'debt-validation', datos)
         → { bloques: [{ id, es: [líneas], en: [líneas], libre }], textoEs, textoEn, hayTextoLibre }
   Contrato: specs/003-address-autocomplete-bilingual-letters/contracts/bilingual-letter.md

   Este archivo también guarda las reglas de los datos personales del reporte y del
   teléfono, para que se puedan probar con Node y para que haya UNA sola fuente
   (Principio IV): formato del teléfono (XXX-XXX-XXXX), agrupar los datos detectados,
   qué tarjetas de identidad se ofrecen y en qué orden se listan los datos disputados.
   Contrato: specs/005-credit-letter-fixes/contracts/letters-module.md
   ========================================================================= */

(function () {
  'use strict';

  /* ---------- textos que genera el sitio, en los dos idiomas ---------- */

  // Qué se está corrigiendo en la carta de identidad (antes: identityCorrectionSubject en credito.html).
  var ASUNTO_IDENTIDAD = {
    'identity-names': {
      es: 'los nombres o alias que no corresponden a mi identidad',
      en: 'names or aliases that do not correspond to my identity'
    },
    'identity-phones': {
      es: 'los números de teléfono incorrectos o desactualizados',
      en: 'incorrect or outdated phone numbers'
    },
    'identity-addresses': {
      es: 'las direcciones que no corresponden a mi historial personal',
      en: 'addresses that do not correspond to my personal history'
    },
    'identity-mixed': {
      es: 'la información personal que no me pertenece o está desactualizada',
      en: 'personal information that does not belong to me or is outdated'
    }
  };
  var ASUNTO_IDENTIDAD_OTRO = { es: 'la información personal incorrecta', en: 'incorrect personal information' };

  // Motivos de la disputa (antes: DISPUTE_REASON_TEXT en credito.html).
  var MOTIVOS = {
    'not-mine': {
      es: 'Esta cuenta no es mía y no la reconozco como una obligación que yo haya contraído.',
      en: 'This account is not mine and I do not recognize it as an obligation that I incurred.'
    },
    'wrong-amount': {
      es: 'El monto reportado para esta cuenta es incorrecto.',
      en: 'The amount reported for this account is incorrect.'
    },
    'wrong-date': {
      es: 'La fecha del atraso, del evento o de apertura de esta cuenta es incorrecta.',
      en: 'The date of the delinquency, event, or opening of this account is incorrect.'
    },
    'already-resolved': {
      es: 'Esta cuenta ya fue pagada o resuelta y no debería seguir apareciendo con este estatus.',
      en: 'This account has already been paid or resolved and should no longer appear with this status.'
    },
    'wrong-status': {
      es: 'El estatus actual de esta cuenta, tal como aparece en el reporte, es incorrecto.',
      en: 'The current status of this account, as it appears on the report, is incorrect.'
    },
    'other': {
      es: 'La información reportada sobre esta cuenta es inexacta.',
      en: 'The information reported about this account is inaccurate.'
    }
  };

  // Hallazgos del analizador que pueden dar una carta. La clave la pone el analizador
  // (data-issue-key); el título en español que ve la persona sigue siendo el del analizador.
  var ETIQUETAS_HALLAZGO = {
    'bankruptcy': { es: 'Bancarrota reportada', en: 'Bankruptcy reported' },
    'foreclosure': { es: 'Ejecución hipotecaria detectada', en: 'Foreclosure reported' },
    'repossession': { es: 'Reposesión detectada', en: 'Repossession reported' },
    'charge-off': { es: 'Cuenta castigada o charge-off', en: 'Charged-off account' },
    'collection': { es: 'Cuenta en cobranza', en: 'Collection account' },
    'late-payments': { es: 'Pagos atrasados o saldo vencido', en: 'Late payments or past-due balance' },
    'past-due-amount': { es: 'Monto vencido visible', en: 'Past-due amount shown' },
    'inquiries': { es: 'Muchas consultas recientes', en: 'Multiple recent inquiries' }
  };
  var HALLAZGO_DESCONOCIDO = {
    es: 'esta cuenta',
    en: 'the account or information identified in my credit report'
  };

  // Tipo de dato personal detectado en el reporte (la etiqueta se traduce; el valor, nunca).
  var ETIQUETAS_TIPO_DATO = { 'Nombre': 'Name', 'Nombre o alias': 'Name or alias', 'Teléfono': 'Phone', 'Dirección': 'Address' };
  var TIPO_DATO_DESCONOCIDO = 'Information';

  /* ---------- utilidades ---------- */

  function texto(x) { return String(x == null ? '' : x).trim(); }

  // Como texto(), pero además junta los espacios repetidos. Solo para partes de la dirección: el
  // «Detalle adicional» de la persona sigue usando texto() y se copia sin tocar.
  function limpio(x) { return texto(x).replace(/\s+/g, ' '); }

  /* ---------- datos personales del reporte y teléfono ---------- */
  // (las funciones de esta sección se agregan aquí y se exportan en API, al final)

  /* Teléfono de EE. UU.: XXX-XXX-XXXX. Un 1 inicial se descarta solo cuando hay 11 dígitos
     (código de país); con otra cantidad de dígitos nunca se inventa ni se recorta nada. */
  function digitosTelefono(valor) {
    var d = String(valor == null ? '' : valor).replace(/\D/g, '');
    if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
    return d;
  }

  // Para el campo mientras la persona teclea, pega o autocompleta: parcial, con guiones y tope de 10 dígitos.
  function telefonoEscribiendo(valor) {
    var d = digitosTelefono(valor).slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return d.slice(0, 3) + '-' + d.slice(3);
    return d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
  }

  // Para lo que se muestra o se imprime: XXX-XXX-XXXX con 10 dígitos; si no, el texto tal cual (recortado).
  function formatearTelefono(valor) {
    var d = digitosTelefono(valor);
    return d.length === 10 ? telefonoEscribiendo(d) : texto(valor);
  }

  function telefonoValido(valor) { return digitosTelefono(valor).length === 10; }

  // Un dato disputado se copia tal cual, salvo el teléfono, que sale siempre como XXX-XXX-XXXX.
  function valorDisputado(v) {
    return texto(v.type) === 'Teléfono' ? formatearTelefono(v.value) : texto(v.value);
  }

  /* Datos personales que el analizador encontró en el reporte: {type, value}. Se muestran agrupados
     por tipo (nombres, direcciones, teléfonos) y la carta los lista en ese mismo orden. */
  var GRUPO_DE_TIPO = { 'Nombre': 'nombres', 'Nombre o alias': 'nombres', 'Dirección': 'direcciones', 'Teléfono': 'telefonos' };
  var GRUPOS = [
    { clave: 'nombres', titulo: 'Nombres' },
    { clave: 'direcciones', titulo: 'Direcciones' },
    { clave: 'telefonos', titulo: 'Teléfonos' },
    { clave: 'otros', titulo: 'Otros datos' }
  ];
  var RANGO_DE_GRUPO = { nombres: 0, direcciones: 1, telefonos: 2, otros: 3 };

  function claveDeGrupo(tipo) { return GRUPO_DE_TIPO[texto(tipo)] || 'otros'; }

  // Mismo dato = misma clave: nombres y direcciones sin importar mayúsculas ni espacios; teléfonos por sus dígitos.
  function claveDeDato(grupo, v) {
    if (grupo === 'telefonos') return digitosTelefono(v.value) || texto(v.value).toLowerCase();
    var base = limpio(v.value).toLowerCase();
    return grupo === 'otros' ? limpio(v.type).toLowerCase() + '|' + base : base;
  }

  // Sin repetidos, en orden de aparición, teléfonos con guiones; no toca la lista que recibe.
  function agruparDetectados(valores) {
    var lista = Array.isArray(valores) ? valores : [];
    var porGrupo = {}, vistos = {};
    GRUPOS.forEach(function (g) { porGrupo[g.clave] = []; vistos[g.clave] = Object.create(null); });
    lista.forEach(function (v) {
      if (!v) return;
      var grupo = claveDeGrupo(v.type);
      var clave = claveDeDato(grupo, v);
      if (!texto(v.value) || vistos[grupo][clave]) return;
      vistos[grupo][clave] = true;
      porGrupo[grupo].push({ type: texto(v.type), value: grupo === 'telefonos' ? formatearTelefono(v.value) : texto(v.value) });
    });
    return GRUPOS
      .filter(function (g) { return porGrupo[g.clave].length > 0; })
      .map(function (g) { return { clave: g.clave, titulo: g.titulo, valores: porGrupo[g.clave] }; });
  }

  // Qué tarjetas de identidad ofrece el analizador (mismos umbrales de siempre), en el orden en que se agregan.
  function tiposDeTarjeta(conteos) {
    var c = conteos || {};
    var nombres = Number(c.nombres) || 0, direcciones = Number(c.direcciones) || 0, telefonos = Number(c.telefonos) || 0;
    var tipos = [];
    if (nombres >= 2) tipos.push('identity-names');
    if (telefonos >= 2) tipos.push('identity-phones');
    if (direcciones >= 2) tipos.push('identity-addresses');
    if (nombres >= 2 && telefonos >= 2 && direcciones >= 2) tipos.push('identity-mixed');
    return tipos;
  }

  // Los datos marcados salen nombres → direcciones → teléfonos, y en su orden original dentro de cada grupo.
  function ordenarDisputados(valores) {
    var lista = Array.isArray(valores) ? valores : [];
    return lista
      .filter(function (v) { return !!v; })
      .map(function (v, i) { return { v: v, i: i, r: RANGO_DE_GRUPO[claveDeGrupo(v.type)] }; })
      .sort(function (a, b) { return a.r - b.r || a.i - b.i; })
      .map(function (x) { return x.v; });
  }

  function formatearFecha(fecha, idioma) {
    var d = fecha instanceof Date ? fecha : new Date();
    return new Intl.DateTimeFormat(idioma === 'en' ? 'en-US' : 'es-US', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  }

  function remitente(datos) {
    var r = datos.remitente || {};
    var nombres = texto(r.givenNames), a1 = texto(r.firstSurname), a2 = texto(r.secondSurname);
    var calle = limpio(r.street), ciudad = limpio(r.city), estado = limpio(r.state), cp = limpio(r.postalCode);
    return {
      givenNames: nombres, firstSurname: a1, secondSurname: a2,
      street: calle, city: ciudad, state: estado, postalCode: cp,
      phone: formatearTelefono(r.currentPhone),
      legalName: [nombres, a1, a2].filter(Boolean).join(' '),
      // La dirección se arma UNA vez aquí y las cartas la imprimen en una sola línea.
      address: [calle, ciudad, (estado + ' ' + cp).trim()].filter(Boolean).join(', ')
    };
  }

  function buro(datos) {
    var b = datos.buro || {};
    return { nombre: texto(b.nombre), destinatario: texto(b.destinatario), direccion: Array.isArray(b.direccion) ? b.direccion.map(texto) : [] };
  }

  // Etiqueta del hallazgo en cada idioma. En español se respeta el título que ya ve la persona.
  function etiquetaHallazgo(h) {
    var hallazgo = h || {};
    var base = ETIQUETAS_HALLAZGO[hallazgo.clave];
    var arg = texto(hallazgo.arg);
    var titulo = texto(hallazgo.titulo);
    if (!base) return { es: titulo || HALLAZGO_DESCONOCIDO.es, en: HALLAZGO_DESCONOCIDO.en };
    return {
      es: titulo || (base.es + (arg ? ': ' + arg : '')),
      en: base.en + (arg ? ': ' + arg : '')
    };
  }

  // Bloque con su versión en español y en inglés. libre = lleva texto que escribió la persona.
  function bloque(id, es, en, libre) {
    return { id: id, es: es, en: en, libre: !!libre };
  }

  /* ---------- las tres cartas ---------- */

  function cartaIdentidad(datos) {
    var r = remitente(datos), b = buro(datos);
    var subtipo = ASUNTO_IDENTIDAD[datos.subtipo] || ASUNTO_IDENTIDAD_OTRO;
    var valores = ordenarDisputados(datos.valoresDisputados);
    return [
      bloque('remitente',
        [r.legalName, r.address, 'Teléfono: ' + r.phone],
        [r.legalName, r.address, 'Phone: ' + r.phone]),
      bloque('fecha', [formatearFecha(datos.fecha, 'es')], [formatearFecha(datos.fecha, 'en')]),
      bloque('destinatario',
        [b.destinatario].concat(b.direccion),
        [b.destinatario].concat(b.direccion)),
      bloque('asunto',
        ['Asunto: Solicitud formal de corrección de información personal en mi reporte de ' + b.nombre],
        ['Subject: Formal request to correct personal information in my ' + b.nombre + ' credit report']),
      bloque('saludo',
        ['Estimado equipo de disputas de ' + b.nombre + ':'],
        ['Dear ' + b.nombre + ' Dispute Team:']),
      bloque('apertura',
        ['Al revisar el reporte de crédito emitido por ' + b.nombre + ', detecté ' + subtipo.es + '. Solicito formalmente que investiguen los datos indicados a continuación y que eliminen o corrijan toda información que sea inexacta, esté desactualizada o no me pertenezca.'],
        ['While reviewing the credit report issued by ' + b.nombre + ', I found ' + subtipo.en + '. I formally request that you investigate the information listed below and delete or correct any information that is inaccurate, outdated, or does not belong to me.']),
      bloque('disputados',
        ['INFORMACIÓN QUE DISPUTO:'].concat(valores.map(function (v) { return '- ' + texto(v.type) + ': ' + valorDisputado(v); })),
        ['INFORMATION I AM DISPUTING:'].concat(valores.map(function (v) { return '- ' + (ETIQUETAS_TIPO_DATO[texto(v.type)] || TIPO_DATO_DESCONOCIDO) + ': ' + valorDisputado(v); }))),
      bloque('correcta',
        ['MI INFORMACIÓN CORRECTA:',
          'Nombre legal: ' + r.legalName,
          'Nombre(s): ' + r.givenNames,
          'Primer apellido: ' + r.firstSurname,
          'Segundo apellido: ' + (r.secondSurname || 'No aplica'),
          'Dirección actual: ' + r.address,
          'Teléfono actual: ' + r.phone],
        ['MY CORRECT INFORMATION:',
          'Legal name: ' + r.legalName,
          'Given name(s): ' + r.givenNames,
          'First surname: ' + r.firstSurname,
          'Second surname: ' + (r.secondSurname || 'N/A'),
          'Current address: ' + r.address,
          'Current phone: ' + r.phone]),
      bloque('adjuntos',
        ['Adjunto copias de mi identificación, comprobante de domicilio y las páginas del reporte donde aparece la información cuestionada. Solicito que me envíen por escrito el resultado de la investigación y una copia actualizada de mi reporte de crédito a la dirección indicada arriba.'],
        ['I am enclosing copies of my identification, proof of address, and the pages of the report where the questioned information appears. I request that you send me the result of the investigation in writing, along with an updated copy of my credit report, to the address shown above.']),
      bloque('declaracion',
        ['Declaro que esta solicitud se refiere únicamente a información que considero incorrecta o que no me pertenece.'],
        ['I declare that this request refers only to information that I believe is incorrect or does not belong to me.']),
      bloque('firma',
        ['Atentamente,', '', 'Firma: ______________________________', r.legalName],
        ['Sincerely,', '', 'Signature: ______________________________', r.legalName])
    ];
  }

  function cartaDisputaBuro(datos) {
    var r = remitente(datos), b = buro(datos);
    var motivo = MOTIVOS[datos.motivo] || MOTIVOS.other;
    var detalle = texto(datos.detalle);
    var h = etiquetaHallazgo(datos.hallazgo);
    return [
      bloque('remitente',
        [r.legalName, r.address, 'Teléfono: ' + r.phone],
        [r.legalName, r.address, 'Phone: ' + r.phone]),
      bloque('fecha', [formatearFecha(datos.fecha, 'es')], [formatearFecha(datos.fecha, 'en')]),
      bloque('destinatario', [b.destinatario].concat(b.direccion), [b.destinatario].concat(b.direccion)),
      bloque('asunto',
        ['Asunto: Solicitud formal de investigación de información inexacta en mi reporte de ' + b.nombre],
        ['Subject: Formal request to investigate inaccurate information in my ' + b.nombre + ' credit report']),
      bloque('saludo',
        ['Estimado equipo de disputas de ' + b.nombre + ':'],
        ['Dear ' + b.nombre + ' Dispute Team:']),
      bloque('apertura',
        ['Al revisar mi reporte de crédito emitido por ' + b.nombre + ', identifiqué la siguiente cuenta o información que considero inexacta: "' + h.es + '".'],
        ['While reviewing my credit report issued by ' + b.nombre + ', I identified the following account or information that I believe is inaccurate: "' + h.en + '".']),
      // «Detalle adicional» lo escribe la persona: va tal cual en los dos idiomas y marca el bloque como libre.
      bloque('motivo',
        ['Motivo de la disputa: ' + motivo.es].concat(detalle ? ['Detalle adicional: ' + detalle] : []),
        ['Reason for the dispute: ' + motivo.en].concat(detalle ? ['Additional detail: ' + detalle] : []),
        !!detalle),
      bloque('fcra-investigacion',
        ['De acuerdo con la Fair Credit Reporting Act (15 U.S.C. § 1681i, § 611 de la ley), solicito formalmente que reinvestiguen esta información con el acreedor o la fuente que la reportó, dentro del plazo de 30 días que exige la ley. Si no pueden verificar que la información es exacta y completa dentro de ese plazo, están obligados a eliminarla o corregirla de mi reporte. Les pido que me envíen por escrito, dentro de los 5 días hábiles posteriores a que terminen la investigación, el resultado y una copia actualizada y gratuita de mi reporte de crédito.'],
        ['Under the Fair Credit Reporting Act (15 U.S.C. § 1681i, § 611 of the Act), I formally request that you reinvestigate this information with the creditor or source that reported it, within the 30-day period the law requires. If you cannot verify that the information is accurate and complete within that period, you are required to delete it or correct it in my report. Please send me in writing, within 5 business days after you complete the investigation, the result and a free, updated copy of my credit report.']),
      bloque('fcra-notificacion',
        ['Si la información se corrige o se elimina, también solicito, conforme a la § 611(d) de la misma ley, que notifiquen de este cambio a cualquier persona o empresa a la que le hayan entregado mi reporte en los últimos 6 meses — o en los últimos 2 años, si fue para fines de empleo.'],
        ['If the information is corrected or deleted, I also request, under § 611(d) of the same Act, that you notify of this change any person or company to whom you have provided my report in the last 6 months — or in the last 2 years, if it was for employment purposes.']),
      bloque('mi-informacion',
        ['MI INFORMACIÓN:', 'Nombre legal: ' + r.legalName, 'Dirección actual: ' + r.address, 'Teléfono actual: ' + r.phone],
        ['MY INFORMATION:', 'Legal name: ' + r.legalName, 'Current address: ' + r.address, 'Current phone: ' + r.phone]),
      bloque('adjuntos',
        ['Adjunto copia de mi identificación, comprobante de domicilio y las páginas del reporte donde aparece la información cuestionada.'],
        ['I am enclosing a copy of my identification, proof of address, and the pages of the report where the questioned information appears.']),
      bloque('declaracion',
        ['Declaro que esta solicitud se refiere únicamente a información que considero inexacta.'],
        ['I declare that this request refers only to information that I believe is inaccurate.']),
      bloque('firma',
        ['Atentamente,', '', 'Firma: ______________________________', r.legalName],
        ['Sincerely,', '', 'Signature: ______________________________', r.legalName])
    ];
  }

  function cartaValidacionDeuda(datos) {
    var r = remitente(datos);
    var c = datos.cobrador || {};
    var nombre = texto(c.nombre), calle = texto(c.calle), ciudad = texto(c.ciudad), estado = texto(c.estado), cp = texto(c.cp);
    var ref = texto(datos.referencia);
    var h = etiquetaHallazgo(datos.hallazgo);
    return [
      bloque('remitente',
        [r.legalName, r.address, 'Teléfono: ' + r.phone],
        [r.legalName, r.address, 'Phone: ' + r.phone]),
      bloque('fecha', [formatearFecha(datos.fecha, 'es')], [formatearFecha(datos.fecha, 'en')]),
      bloque('cobrador',
        [nombre, calle, ciudad + ', ' + estado + ' ' + cp],
        [nombre, calle, ciudad + ', ' + estado + ' ' + cp]),
      bloque('asunto',
        ['Asunto: Solicitud de validación de deuda — ' + h.es + (ref ? ' (referencia de cuenta: ' + ref + ')' : '')],
        ['Subject: Debt validation request — ' + h.en + (ref ? ' (account reference: ' + ref + ')' : '')]),
      bloque('saludo', ['Estimado(a) ' + nombre + ':'], ['Dear ' + nombre + ':']),
      bloque('apertura',
        ['Recibí información de que su empresa está intentando cobrarme una deuda' + (ref ? ' con referencia de cuenta ' + ref : '') + '. De acuerdo con la Fair Debt Collection Practices Act (15 U.S.C. § 1692g), solicito formalmente que me envíen validación por escrito de esta deuda, incluyendo:'],
        ['I have received information that your company is attempting to collect a debt from me' + (ref ? ' with account reference ' + ref : '') + '. Under the Fair Debt Collection Practices Act (15 U.S.C. § 1692g), I formally request that you send me written validation of this debt, including:']),
      bloque('lista-validacion',
        ['- El monto exacto que alegan que debo y cómo se calculó.',
          '- El nombre del acreedor original.',
          '- Prueba de que soy la persona legalmente obligada a pagar esta deuda.',
          '- Confirmación de que su empresa tiene derecho a cobrarla.'],
        ['- The exact amount you claim I owe and how it was calculated.',
          '- The name of the original creditor.',
          '- Proof that I am the person legally obligated to pay this debt.',
          '- Confirmation that your company has the right to collect it.']),
      bloque('no-reconocimiento',
        ['Esta carta no es un reconocimiento de que la deuda es válida ni una promesa de pago. Mientras espero esta validación, les solicito que suspendan todo intento de cobro, incluyendo llamadas y reportes adicionales a las agencias de crédito, tal como exige la ley mientras la deuda está en disputa.'],
        ['This letter is not an acknowledgment that the debt is valid, nor a promise to pay. While I await this validation, I ask that you suspend all collection efforts, including calls and any additional reports to the credit bureaus, as the law requires while a debt is in dispute.']),
      bloque('mi-informacion',
        ['MI INFORMACIÓN:', 'Nombre legal: ' + r.legalName, 'Dirección actual: ' + r.address, 'Teléfono actual: ' + r.phone],
        ['MY INFORMATION:', 'Legal name: ' + r.legalName, 'Current address: ' + r.address, 'Current phone: ' + r.phone]),
      bloque('firma',
        ['Atentamente,', '', 'Firma: ______________________________', r.legalName],
        ['Sincerely,', '', 'Signature: ______________________________', r.legalName])
    ];
  }

  /* ---------- API ---------- */

  function armar(tipo, datos) {
    var d = datos || {};
    var bloques;
    if (tipo === 'identity' || String(tipo).indexOf('identity-') === 0) {
      if (String(tipo).indexOf('identity-') === 0) d = Object.assign({}, d, { subtipo: tipo });
      bloques = cartaIdentidad(d);
    } else if (tipo === 'bureau-dispute') {
      bloques = cartaDisputaBuro(d);
    } else if (tipo === 'debt-validation') {
      bloques = cartaValidacionDeuda(d);
    } else {
      throw new Error('ThemoraCartas: tipo de carta desconocido: ' + tipo);
    }
    return {
      bloques: bloques,
      textoEs: bloques.map(function (b) { return b.es.join('\n'); }).join('\n\n'),
      textoEn: bloques.map(function (b) { return b.en.join('\n'); }).join('\n\n'),
      hayTextoLibre: bloques.some(function (b) { return b.libre; })
    };
  }

  var API = {
    armar: armar,
    telefonoEscribiendo: telefonoEscribiendo,
    formatearTelefono: formatearTelefono,
    telefonoValido: telefonoValido,
    agruparDetectados: agruparDetectados,
    tiposDeTarjeta: tiposDeTarjeta,
    ordenarDisputados: ordenarDisputados,
    formatearFecha: formatearFecha,
    ETIQUETAS_HALLAZGO: ETIQUETAS_HALLAZGO,
    ETIQUETAS_TIPO_DATO: ETIQUETAS_TIPO_DATO,
    MOTIVOS: MOTIVOS
  };
  if (typeof window !== 'undefined') window.ThemoraCartas = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
