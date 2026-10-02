/* ===========================================================================
   Perfiles de lectura de reportes de crédito (spec 013, Fase 1)

   Un perfil por buró: cómo se llaman sus secciones, sus etiquetas de campo y
   sus códigos de pago. Son DATOS, no lógica: el motor (lector-credito.js) es
   uno solo y se alimenta de aquí, para que cada buró se pueda revisar y fechar
   sin tocar el código (Principio IV, research R2).

   Reglas:
     - Cada perfil dice de dónde salen sus etiquetas (`fuente`) y cuándo se
       verificaron (`verificadoEl`).
     - Ningún perfil contiene datos de una persona: ni nombres, ni direcciones,
       ni números. Solo etiquetas y códigos públicos de los burós.
     - `etiquetas[].ambito` dice en qué parte del reporte vale la etiqueta:
       reporte, identidad, aviso, cuenta, consulta o registro. Las de ámbito
       `ignorar` no llenan ningún campo: solo marcan dónde termina el valor de
       la etiqueta anterior en la misma línea.
     - `codigosPago` traduce lo impreso al vocabulario común (research R11).

   Lo usan credito.html (navegador) y las pruebas de tests/ (Node).
   =========================================================================== */
(function () {
  'use strict';

  /* Atajos para escribir etiquetas sin repetir la forma completa. */
  const et = (ambito, campo, tipo, patron, extra) => Object.assign({ patron, campo, tipo, ambito }, extra || {});
  const cuenta = (campo, tipo, patron, extra) => et('cuenta', campo, tipo, patron, extra);
  const ident = (campo, tipo, patron, extra) => et('identidad', campo, tipo, patron, extra);
  const consulta = (campo, tipo, patron) => et('consulta', campo, tipo, patron);
  const registro = (campo, tipo, patron) => et('registro', campo, tipo, patron);
  const aviso = (patron, avisoTipo) => et('aviso', 'texto', 'texto', patron, { avisoTipo });
  const ignorar = (patron) => et('ignorar', null, 'texto', patron);

  /* Vocabulario común de códigos de pago (R11), compartido por todos los perfiles. */
  const CODIGOS_BASE = {
    'OK': 'al_dia', '30': 'atraso_30', '60': 'atraso_60', '90': 'atraso_90', '120': 'atraso_120',
    '150': 'atraso_150', '180': 'atraso_180', 'CO': 'charge_off', 'C': 'cobranza', 'R': 'reposesion',
    'V': 'entrega_voluntaria', 'VS': 'entrega_voluntaria', 'F': 'ejecucion_hipotecaria',
    'FS': 'ejecucion_iniciada', 'B': 'bancarrota', 'BK': 'bancarrota', 'TN': 'muy_nueva',
    'ND': 'sin_datos', '-': 'sin_datos', 'PBC': 'pagada_por_acreedor', 'G': 'reclamo_gobierno',
    'IC': 'reclamo_seguro', 'D': 'incumplimiento', 'CLS': 'cerrada'
  };

  const FIN_DERECHOS = [
    /a summary of your rights under the fair credit reporting act/i,
    /resumen de sus derechos (?:conforme|bajo) (?:a )?la ley/i
  ];

  const PAGINA = /^page \d+ of \d+$/i;
  const PAGINA_ES = /^p[aá]gina \d+ de \d+$/i;

  /* ---------------------------------------------------------------- Equifax */
  const equifax = {
    id: 'equifax',
    nombre: 'Equifax',
    fuente: 'Formato observado en un reporte de Equifax, mayo 2026 (sin datos personales)',
    verificadoEl: '2026-09-30',
    detectar: {
      fuertes: [
        /\bequifax (?:credit )?report\b/,
        /\b(?:report (?:provided|prepared|issued) by|provided by) equifax\b/,
        /\bequifax information services\b/,
        /\befx-acr\b/,
        /equifax\.com\/personal\/disputes/
      ],
      menciones: /\bequifax\b/g
    },
    ruido: [
      /^prepared for:/i, /^date: /i, /^confirmation #/i, PAGINA, PAGINA_ES, /^efx-acr\b/i,
      /^paid on time\b.*days past due/i, /^an overview of your credit report\b/i,
      /^company name\s+inquiry type/i, /^payment history$/i, /^24[- ]month history$/i
    ],
    finDeDatos: FIN_DERECHOS,
    secciones: [
      { patron: /^summary$/i, seccion: 'resumen' },
      { patron: /^personal information$/i, seccion: 'personal' },
      { patron: /^consumer file notices$/i, seccion: 'avisos' },
      { patron: /^credit accounts$/i, seccion: 'cuentas' },
      { patron: /^collections$/i, seccion: 'cobranzas' },
      { patron: /^public records$/i, seccion: 'registros_publicos' },
      { patron: /^inquiries$/i, seccion: 'consultas' }
    ],
    inicioCuenta: {
      tipo: 'linea_siguiente',
      patron: /^[A-Z0-9][A-Z0-9 &.,'\/()-]{1,60}?(?: - Closed)?$/,
      siguiente: /^Date Reported:/i
    },
    etiquetas: [
      et('reporte', 'fechaReporte', 'fecha', /^Date:/i),
      ignorar(/Confirmation #/i),
      ident('nombres', 'texto', /(?<![A-Za-z] )\bName:/i),
      ident('nombres', 'texto', /Former Name\(s\):/i),
      ident('ssnMostrado', 'texto', /Social Security Number:/i),
      ident('fechaNacimientoMostrada', 'texto', /Date of Birth:/i),
      ident('direcciones', 'texto', /Current Address:/i, { direccion: 'actual' }),
      ident('direcciones', 'texto', /Former Address(?:\(es\)|es)?:/i, { direccion: 'anterior' }),
      ident('telefonos', 'texto', /Phone Number\(s\):/i),
      ident('empleadores', 'texto', /Employment Information:/i),
      aviso(/Consumer File Notices:/i, 'otro'),
      aviso(/Consumer Statement:/i, 'declaracion'),
      cuenta('fechaReportada', 'fecha', /Date Reported:/i),
      cuenta('saldo', 'monto', /Balance:/i),
      cuenta('numero', 'cuenta', /Account Number:/i),
      cuenta('responsabilidad', 'texto', /Owner:/i),
      cuenta('limite', 'monto', /Credit Limit:/i),
      cuenta('saldoMasAlto', 'monto', /High Credit:/i),
      cuenta('tipo', 'texto', /Loan\/Account Type:/i),
      cuenta('estado', 'texto', /Status:/i),
      cuenta('fechaApertura', 'fecha', /Date Opened:/i),
      cuenta('dofd', 'fecha', /Date of 1st Delinquency:/i),
      cuenta('frecuencia', 'texto', /Terms Frequency:/i),
      cuenta('ultimaActividad', 'fecha', /Date of Last Activity:/i),
      cuenta('fechaMorosidadGraveReportada', 'fecha', /Date Major Delinquency 1st Reported:/i),
      cuenta('mesesRevisados', 'numero', /Months Reviewed:/i),
      cuenta('pagoProgramado', 'monto', /Scheduled Payment Amount:/i),
      cuenta('vencido', 'monto', /Amount Past Due:/i),
      ignorar(/Deferred Payment Start Date:/i),
      cuenta('pagoReal', 'monto', /Actual Payment Amount:/i),
      cuenta('montoChargeOff', 'monto', /Charge Off Amount:/i),
      ignorar(/Balloon Payment Amount:/i),
      cuenta('ultimoPago', 'fecha', /Date of Last Payment:/i),
      cuenta('fechaCierre', 'fecha', /Date Closed:/i),
      ignorar(/Balloon Payment Date:/i),
      cuenta('plazo', 'texto', /Term Duration:/i),
      cuenta('designadorActividad', 'texto', /Activity Designator:/i),
      cuenta('acreedorOriginal', 'texto', /Original Creditor(?: Name)?:/i),
      cuenta('codigosNarrativos', 'texto', /Narrative Code\(s\):/i),
      cuenta('comentarios', 'texto', /Comments?:/i),
      cuenta('contacto', 'texto', /Contact:/i)
    ],
    /* Tabla de 24 meses: columnas ubicadas por la posición de su encabezado (R6). */
    historial24: {
      encabezado: /\bBalance\b.*\b(?:Scheduled Payment|Past Due)\b/i,
      columnas: [
        { patron: /^Balance$/i, campo: 'saldo', tipo: 'monto' },
        { patron: /^Scheduled Payment$/i, campo: 'pagoProgramado', tipo: 'monto' },
        { patron: /^Actual Payment$/i, campo: 'pagoReal', tipo: 'monto' },
        { patron: /^Last Payment Date$/i, campo: 'fechaUltimoPago', tipo: 'fecha' },
        { patron: /^Past Due$/i, campo: 'vencido', tipo: 'monto' },
        { patron: /^High Credit$/i, campo: 'saldoMasAlto', tipo: 'monto' },
        { patron: /^Credit Limit$/i, campo: 'limite', tipo: 'monto' },
        { patron: /^Narrative Codes?$/i, campo: 'codigosNarrativos', tipo: 'texto' }
      ]
    },
    codigosPago: {
      'OK': 'al_dia', '30': 'atraso_30', '60': 'atraso_60', '90': 'atraso_90', '120': 'atraso_120',
      '150': 'atraso_150', '180': 'atraso_180', 'V': 'entrega_voluntaria', 'F': 'ejecucion_hipotecaria',
      'CO': 'charge_off', 'B': 'bancarrota', 'R': 'reposesion', 'TN': 'muy_nueva', 'C': 'cobranza',
      'ND': 'sin_datos', '-': 'sin_datos'
    },
    /* Solo se escribe la descripción que está verificada; el resto se lee del reporte. */
    codigosNarrativos: {
      '002': '', '093': '', '132': '', '156': '', '158': '', '214': '',
      '233': 'Amount in High Credit Column is Credit Limit',
      '244': ''
    },
    reglas: ['equifax-233-high-credit-es-limite']
  };

  /* --------------------------------------------------------------- Experian */
  const experian = {
    id: 'experian',
    nombre: 'Experian',
    fuente: 'EXPERIAN_CR.md (guía pública de Experian)',
    verificadoEl: '2026-09-30',
    detectar: {
      fuertes: [
        /\bexperian (?:credit )?report\b/,
        /\b(?:report (?:provided|prepared|issued) by|provided by) experian\b/,
        /\bexperian national consumer assistance center\b/
      ],
      menciones: /\bexperian\b/g
    },
    ruido: [
      /^prepared for:/i, PAGINA, PAGINA_ES,
      /^(?:account|payment|additional) information$/i, /^payment history$/i
    ],
    finDeDatos: FIN_DERECHOS,
    secciones: [
      { patron: /^personal information$/i, seccion: 'personal' },
      { patron: /^(?:credit )?accounts$/i, seccion: 'cuentas' },
      { patron: /^collections$/i, seccion: 'cobranzas' },
      { patron: /^public records$/i, seccion: 'registros_publicos' },
      { patron: /^credit inquiries$/i, seccion: 'consultas' },
      { patron: /^hard inquiries$/i, seccion: 'consultas', tipoConsulta: 'dura' },
      { patron: /^soft inquiries$/i, seccion: 'consultas', tipoConsulta: 'blanda' }
    ],
    inicioCuenta: { tipo: 'etiqueta', patron: /Account Name:?/i },
    marcaNegativa: /^potentially negative$/i, // 014: aviso del buró sobre la cuenta que sigue
    etiquetas: [
      et('reporte', 'fechaReporte', 'fecha', /(?:Report Date|Date generated):/i),
      ignorar(/Report number:/i),
      ident('nombres', 'texto', /Name\(s\) Associated With Your Credit:/i),
      ident('nombres', 'texto', /(?<![A-Za-z] )\bName:/i),
      ident('nombres', 'texto', /(?:Also Known As|AKA):/i),
      ident('ssnMostrado', 'texto', /Social Security Number:/i),
      ident('fechaNacimientoMostrada', 'texto', /(?:Year|Date) of Birth:/i),
      ident('direcciones', 'texto', /Address\(es\) Associated With Your Credit:/i, { direccion: 'actual' }),
      ident('direcciones', 'texto', /(?<![A-Za-z] )\bAddress:/i, { direccion: 'actual' }),
      ident('direcciones', 'texto', /Previous Address(?:es)?:/i, { direccion: 'anterior' }),
      ident('telefonos', 'texto', /Phone Numbers?:/i),
      ident('empleadores', 'texto', /Employers?:/i),
      ignorar(/Address ID:/i),
      ignorar(/Spouse or Co-Applicant:/i),
      aviso(/Personal Statements?:/i, 'declaracion'),
      cuenta('acreedor', 'texto', /Account Name:/i),
      cuenta('numero', 'cuenta', /Account Number:/i),
      cuenta('tipo', 'texto', /Account Type:/i),
      cuenta('responsabilidad', 'texto', /Responsibility:/i),
      cuenta('fechaApertura', 'fecha', /Date Opened:/i),
      cuenta('estado', 'texto', /Account Status:/i),
      cuenta('estado', 'texto', /Status:/i),
      cuenta('fechaReportada', 'fecha', /Payment Status Date:/i),
      cuenta('fechaReportada', 'fecha', /Status (?:Updated|Date):/i),
      cuenta('saldo', 'monto', /Balance:/i),
      ignorar(/Balance Updated:/i),
      cuenta('limiteOMontoOriginal', 'monto', /Credit Limit \/ Original Balance:/i),
      cuenta('saldoMasAlto', 'monto', /Highest Balance:/i),
      cuenta('pagoProgramado', 'monto', /Monthly Payment:/i),
      cuenta('pagoReal', 'monto', /Recent Payment:/i),
      cuenta('vencido', 'monto', /Past-Due Amount:/i),
      cuenta('vencido', 'monto', /Past Due Amount:/i),
      cuenta('plazo', 'texto', /Terms:/i),
      ignorar(/On Record Until:/i),
      cuenta('estadoPago', 'texto', /Payment Status:/i),
      cuenta('dofd', 'fecha', /Date of First Delinquency:/i),
      cuenta('atrasosListados', 'texto', /Late Payments:/i),
      cuenta('acreedorOriginal', 'texto', /Original Creditor:/i),
      cuenta('fechaCobranza', 'fecha', /Collection Opened:/i),
      cuenta('montoOriginal', 'monto', /Original Loan Amount:/i),
      ignorar(/Company Sold To:/i),
      cuenta('fechaCierre', 'fecha', /Date Closed:/i),
      cuenta('ultimoPago', 'fecha', /Last Payment Date:/i),
      cuenta('comentarios', 'texto', /(?:Comments?|Remarks?):/i),
      cuenta('declaracionConsumidor', 'texto', /Your Statements?:/i),
      cuenta('contacto', 'texto', /Contact Information:/i),
      consulta('empresa', 'texto', /Business Name:/i),
      consulta('empresa', 'texto', /Company Name:/i),
      consulta('fecha', 'fecha', /Inquiry Date:/i),
      consulta('fecha', 'fecha', /Inquired on:/i),
      consulta('fechaSalida', 'fecha', /Removal Date:/i),
      consulta('tipoNegocio', 'texto', /Business Type:/i),
      consulta('contacto', 'texto', /Contact Info(?:rmation)?:/i),
      cuenta('contacto', 'texto', /Contact:/i),
      registro('tribunal', 'texto', /Court:/i),
      registro('numeroCaso', 'cuenta', /(?:Case|Reference) Number:/i),
      registro('fechaPresentacion', 'fecha', /Date Filed:/i),
      registro('fechaResolucion', 'fecha', /Date Resolved:/i),
      registro('estado', 'texto', /Status:/i)
    ],
    codigosPago: Object.assign({}, CODIGOS_BASE),
    reglas: ['experian-limite-o-monto-original']
  };

  /* ------------------------------------------------------------- TransUnion */
  const transunion = {
    id: 'transunion',
    nombre: 'TransUnion',
    fuente: 'TRANSUNION_CR.md (guía pública de TransUnion)',
    verificadoEl: '2026-09-30',
    detectar: {
      fuertes: [
        /\b(?:transunion|trans union) (?:credit )?report\b/,
        /\b(?:report (?:provided|prepared|issued) by|provided by) (?:transunion|trans union)\b/,
        /\btransunion consumer solutions\b/
      ],
      menciones: /\b(?:transunion|trans union)\b/g
    },
    ruido: [PAGINA, PAGINA_ES, /^payment history$/i],
    finDeDatos: FIN_DERECHOS,
    secciones: [
      { patron: /^personal information$/i, seccion: 'personal' },
      { patron: /^public records$/i, seccion: 'registros_publicos' },
      { patron: /^account information$/i, seccion: 'cuentas' },
      { patron: /^accounts with adverse information$/i, seccion: 'adversas' },
      { patron: /^satisfactory accounts$/i, seccion: 'satisfactorias' },
      { patron: /^collections$/i, seccion: 'cobranzas' },
      { patron: /^regular inquiries$/i, seccion: 'consultas', tipoConsulta: 'dura' },
      { patron: /^promotional inquiries$/i, seccion: 'consultas', tipoConsulta: 'promocional' },
      { patron: /^account review inquiries$/i, seccion: 'consultas', tipoConsulta: 'revision_cuenta' },
      { patron: /^consumer statement$/i, seccion: 'avisos', avisoTipo: 'declaracion' }
    ],
    /* El bloque de una cuenta empieza con el acreedor y su número: «BANCO #1234****». */
    inicioCuenta: { tipo: 'linea_siguiente', patron: /^[A-Z0-9][A-Z0-9 &.,'\/()-]{1,60}? #[0-9*X]{4,}$/ },
    etiquetas: [
      et('reporte', 'fechaReporte', 'fecha', /(?:Report Date|Date Created):/i),
      ignorar(/File Number:/i),
      ident('nombres', 'texto', /(?<![A-Za-z] )\bName:/i),
      ident('nombres', 'texto', /Also Known As:/i),
      ident('ssnMostrado', 'texto', /Social Security Number:/i),
      ident('fechaNacimientoMostrada', 'texto', /Date of Birth:/i),
      ident('direcciones', 'texto', /Current Address:/i, { direccion: 'actual' }),
      ident('direcciones', 'texto', /Other Address(?:es)?:/i, { direccion: 'anterior' }),
      ident('telefonos', 'texto', /Telephone Numbers?:/i),
      ident('empleadores', 'texto', /Employer(?: Name)?:/i),
      cuenta('numero', 'cuenta', /Account Number:/i),
      cuenta('fechaApertura', 'fecha', /Date Opened:/i),
      cuenta('responsabilidad', 'texto', /Responsibility:/i),
      cuenta('tipo', 'texto', /Account Type:/i),
      cuenta('tipo', 'texto', /Loan Type:/i),
      cuenta('saldo', 'monto', /Balance:/i),
      cuenta('fechaReportada', 'fecha', /Date Updated:/i),
      cuenta('pagoReal', 'monto', /Payment Received:/i),
      cuenta('ultimoPago', 'fecha', /Last Payment Made:/i),
      cuenta('saldoMasAlto', 'monto', /High Balance:/i),
      cuenta('limite', 'monto', /Credit Limit:/i),
      cuenta('vencido', 'monto', /Past Due:/i),
      cuenta('estadoPago', 'texto', /Pay Status:/i),
      cuenta('plazo', 'texto', /Terms:/i),
      cuenta('fechaCierre', 'fecha', /Date Closed:/i),
      cuenta('acreedorOriginal', 'texto', /Original Creditor:/i),
      cuenta('montoOriginal', 'monto', /Original Amount:/i),
      cuenta('fechaCobranza', 'fecha', /Date Placed for Collection:/i),
      ignorar(/Estimated month and year this item will be removed:/i),
      cuenta('comentarios', 'texto', /Remarks:/i),
      consulta('fecha', 'fecha', /Requested On:/i),
      ignorar(/Permissible Purpose:/i),
      registro('tribunal', 'texto', /Court:/i),
      registro('numeroCaso', 'cuenta', /Docket Number:/i),
      registro('fechaPresentacion', 'fecha', /Date Filed:/i),
      registro('fechaResolucion', 'fecha', /(?:Date Paid|Date Resolved):/i)
    ],
    codigosPago: Object.assign({}, CODIGOS_BASE),
    reglas: ['transunion-cobranzas-en-adversas']
  };

  /* --------------------------------------------------------------- Genérico */
  const generico = {
    id: 'generico',
    nombre: 'Formato no reconocido',
    fuente: 'Etiquetas comunes en inglés y español',
    verificadoEl: '2026-09-30',
    detectar: { menciones: null },
    ruido: [PAGINA, PAGINA_ES],
    finDeDatos: FIN_DERECHOS,
    secciones: [
      { patron: /^(?:personal information|informaci[oó]n personal|datos personales)$/i, seccion: 'personal' },
      { patron: /^(?:accounts|credit accounts|cuentas|cuentas de cr[eé]dito)$/i, seccion: 'cuentas' },
      { patron: /^(?:collections|cobranzas|cuentas en cobranza)$/i, seccion: 'cobranzas' },
      { patron: /^(?:inquiries|consultas)$/i, seccion: 'consultas' },
      { patron: /^(?:public records|registros p[uú]blicos)$/i, seccion: 'registros_publicos' }
    ],
    inicioCuenta: { tipo: 'etiqueta', patron: /(?:Account Name|Creditor|Acreedor|Account Number|N[uú]mero de cuenta):/i },
    etiquetas: [
      et('reporte', 'fechaReporte', 'fecha', /(?:Report Date|Fecha del reporte):/i),
      ident('nombres', 'texto', /(?<![A-Za-z] )\b(?:Name|Nombre):/i),
      ident('ssnMostrado', 'texto', /(?:Social Security Number|SSN|Seguro Social):/i),
      ident('fechaNacimientoMostrada', 'texto', /(?:Date of Birth|Fecha de nacimiento):/i),
      ident('direcciones', 'texto', /(?<![A-Za-z] )\b(?:Address|Direcci[oó]n):/i),
      ident('telefonos', 'texto', /(?:Phone|Tel[eé]fono):/i),
      ident('empleadores', 'texto', /(?:Employer|Empleador):/i),
      cuenta('acreedor', 'texto', /(?<![A-Za-z] )(?:Account Name|Creditor|Acreedor):/i),
      cuenta('acreedorOriginal', 'texto', /(?:Original Creditor|Acreedor original):/i),
      cuenta('numero', 'cuenta', /(?:Account Number|N[uú]mero de cuenta):/i),
      cuenta('tipo', 'texto', /(?:Account Type|Tipo de cuenta):/i),
      cuenta('responsabilidad', 'texto', /(?:Responsibility|Responsabilidad):/i),
      cuenta('fechaApertura', 'fecha', /(?:Date Opened|Fecha de apertura):/i),
      cuenta('fechaCierre', 'fecha', /(?:Date Closed|Fecha de cierre):/i),
      cuenta('saldo', 'monto', /(?<![A-Za-z] )(?:Balance|Saldo):/i),
      cuenta('limite', 'monto', /(?:Credit Limit|L[ií]mite de cr[eé]dito):/i),
      cuenta('vencido', 'monto', /(?:Past Due|Monto vencido):/i),
      cuenta('pagoProgramado', 'monto', /(?:Monthly Payment|Pago mensual):/i),
      cuenta('estado', 'texto', /(?<![A-Za-z] )(?:Status|Estado):/i),
      cuenta('dofd', 'fecha', /(?:Date of (?:First|1st) Delinquency|Fecha del primer atraso):/i),
      cuenta('ultimoPago', 'fecha', /(?:Last Payment|[UÚ]ltimo pago):/i),
      cuenta('fechaReportada', 'fecha', /(?:Date Reported|Fecha reportada):/i),
      cuenta('comentarios', 'texto', /(?:Comments|Comentarios):/i),
      consulta('fecha', 'fecha', /(?:Inquiry Date|Fecha de (?:la )?consulta):/i)
    ],
    codigosPago: Object.assign({}, CODIGOS_BASE),
    reglas: []
  };

  const API = { equifax, experian, transunion, generico, version: '2026-09-30' };
  if (typeof window !== 'undefined') window.ThemoraLectorPerfiles = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
