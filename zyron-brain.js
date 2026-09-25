/* =========================================================================
   Zyron — cerebro conversacional local de Themora
   =========================================================================

   Este archivo es el asistente que responde HOY, sin inteligencia artificial,
   sin sesión y sin costo. Importa entenderlo bien: el camino con IA real
   (netlify/functions/coach.js) exige que el visitante inicie sesión Y que la
   llave de la IA esté puesta en Netlify. Mientras falte cualquiera de las
   dos, el 100% de las personas que escriben en el chat llegan aquí.

   Qué hace distinto a un chatbot de palabras clave normal:

   1. PUNTUACIÓN, NO PRIMERA COINCIDENCIA. Se miden todas las intenciones y
      gana la de mayor puntaje, con un mínimo. Si nadie llega al mínimo, se
      dice honestamente que no se entendió, en vez de contestar lo primero que
      hizo "match" — que es como un reglamento de trabajo terminó clasificado
      como carta médica en Cartas Claras.
   2. IDIOMA. Detecta español, inglés, portugués, criollo haitiano, italiano y
      francés, y obedece "habla en italiano". La conversación y las leyes de
      zyron-leyes.js (cobranza y reportes de crédito) están escritas a fondo en
      español, inglés, portugués y criollo. El resto de los temas está a fondo
      en español e inglés; en los demás idiomas se contesta corto y se dice con
      franqueza que el detalle está en esos dos.
   3. VARIACIÓN. Cada intención tiene varias redacciones y no repite la misma
      dos veces seguidas. Un asistente que contesta idéntico se siente máquina.
   4. LA EMOCIÓN VA PRIMERO. Si alguien escribe "me van a quitar la casa", se
      responde al miedo antes que al trámite. Para este público eso no es
      adorno: es la diferencia entre que siga escribiendo o cierre la página.

   Reglas que este archivo NO puede romper (están probadas en zyron.test.js):
   - Nunca decir qué DEBE hacer la persona. Se dicen las opciones.
   - Nunca prometer un resultado ("borramos", "detenemos", "garantizamos").
   - Nunca decir que algo "es ilegal" ni afirmar que alguien cometió fraude.
   - Nunca pedir SSN, número de cuenta, contraseñas ni tarjeta.
   - Decir siempre que el EIN, Google Business y Apple Business son gratis.
   ========================================================================= */

(function () {
  'use strict';

  /* ---------- utilidades ---------- */

  function normalizar(t) {
    return String(t || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[¿?¡!.,;:()"']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tienePalabra(texto, palabra) {
    // Coincidencia por palabra completa. Sin esto, "irs" aparece dentro de
    // "first" — el error exacto que tuvo Cartas Claras en producción.
    var p = palabra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(^|\\s)' + p + '($|\\s)').test(texto);
  }

  function cuenta(texto, lista) {
    var n = 0;
    for (var i = 0; i < lista.length; i++) if (tienePalabra(texto, lista[i])) n++;
    return n;
  }

  /* ---------- idioma ---------- */

  var MARCAS = {
    es: ['que', 'como', 'para', 'porque', 'mi', 'me', 'tengo', 'quiero', 'esto', 'una', 'del', 'con', 'muy', 'pero', 'donde', 'cuanto', 'gracias', 'hola', 'si', 'no', 'y', 'es'],
    en: ['the', 'what', 'how', 'my', 'i', 'do', 'can', 'is', 'about', 'help', 'need', 'want', 'you', 'with', 'and', 'for', 'thanks', 'hello', 'hi'],
    pt: ['nao', 'voce', 'voces', 'obrigado', 'obrigada', 'como', 'para', 'meu', 'minha', 'quero', 'preciso', 'ola', 'sim', 'muito', 'esta',
      'uma', 'um', 'os', 'em', 'dos', 'das', 'ao', 'pelo', 'pela', 'seu', 'sua', 'tem', 'tenho', 'pode', 'podem', 'fica', 'quem', 'quanto', 'tempo'],
    ht: ['mwen', 'ou', 'nou', 'pa', 'sa', 'ki', 'nan', 'pou', 'gen', 'ak', 'se', 'ap', 'te', 'kote', 'kijan', 'poukisa', 'tanpri', 'lajan', 'lwa', 'yo', 'm', 'w'],
    it: ['non', 'sono', 'grazie', 'come', 'per', 'mio', 'mia', 'voglio', 'ciao', 'che', 'una', 'questo', 'bene', 'dove', 'quanto'],
    fr: ['pas', 'je', 'vous', 'merci', 'comment', 'pour', 'mon', 'ma', 'veux', 'bonjour', 'oui', 'est', 'une', 'avec', 'ou']
  };

  // Palabras que existen igual en varios idiomas y no deben decidir nada.
  var AMBIGUAS = ['como', 'para', 'una', 'no', 'si', 'que', 'mi', 'ma', 'ou', 'pa', 'sa', 'se', 'te', 'le', 'nan', 'ak', 'yo', 'm', 'w', 'um', 'em', 'os', 'ao'];

  // Palabras que pertenecen a un solo idioma sin discusión. Bastan ellas
  // solas: alguien que escribe "hola" después de dos mensajes en italiano
  // está volviendo al español, y si no lo detectáramos le seguiríamos
  // contestando en italiano.
  var UNIVOCAS = {
    es: ['hola', 'buenas', 'gracias', 'adios', 'oye', 'disculpe', 'necesito', 'quiero'],
    en: ['hello', 'hi', 'hey', 'thanks', 'goodbye', 'please', 'sorry'],
    pt: ['oi', 'obrigado', 'obrigada', 'tchau', 'preciso', 'nao', 'voce', 'voces', 'relatorio', 'divida', 'dividas', 'pelo', 'pela', 'quero', 'tenho', 'minha', 'meu', 'podem', 'ligar', 'ligam'],
    ht: ['bonjou', 'bonswa', 'mesi', 'alo', 'mwen', 'tanpri', 'kijan', 'poukisa', 'konprann', 'kredi', 'det', 'kolekte', 'rapo', 'ede', 'lajan', 'lwa', 'nou', 'kote', 'idantite', 'vole', 'fwod', 'dwa', 'peye', 'avoka', 'kolekte', 'sispann', 'rele', 'ajans'],
    it: ['ciao', 'grazie', 'buongiorno', 'arrivederci', 'scusi'],
    fr: ['bonjour', 'merci', 'salut', 'bonsoir', 'excusez']
  };

  function detectarIdioma(texto, porDefecto) {
    var puntos = {}, mejor = porDefecto || 'es', max = 0;
    Object.keys(MARCAS).forEach(function (idioma) {
      var n = 0;
      MARCAS[idioma].forEach(function (p) {
        if (!tienePalabra(texto, p)) return;
        n += AMBIGUAS.indexOf(p) === -1 ? 2 : 1;
      });
      (UNIVOCAS[idioma] || []).forEach(function (p) {
        if (tienePalabra(texto, p)) n += 4;
      });
      puntos[idioma] = n;
      if (n > max) { max = n; mejor = idioma; }
    });
    // Con menos de 4 puntos no hay evidencia suficiente: se conserva el idioma
    // que ya se venía hablando en vez de saltar por una palabra suelta.
    return max >= 4 ? mejor : (porDefecto || 'es');
  }

  var NOMBRES_IDIOMA = {
    es: ['espanol', 'castellano', 'spanish', 'spagnolo', 'espanhol', 'espagnol'],
    en: ['ingles', 'english', 'inglese', 'anglais', 'inglês'],
    pt: ['portugues', 'portuguese', 'portoghese', 'portugais', 'brasileiro'],
    ht: ['criollo', 'kreyol', 'creole', 'haitiano', 'haitian', 'haitien'],
    it: ['italiano', 'italian', 'italien'],
    fr: ['frances', 'french', 'francese', 'francais']
  };

  // Solo verbos de petición de verdad. Las preposiciones sueltas ("en", "in",
  // "a") NO pueden contar: con ellas, "me llegó una carta en inglés" se leía
  // como "contéstame en inglés" y el asistente se cambiaba de idioma en la
  // frase más común que va a recibir este sitio.
  var VERBOS_IDIOMA = ['habla', 'hablame', 'hablas', 'hablar', 'escribe', 'escribeme', 'escribir',
    'responde', 'respondeme', 'responder', 'contesta', 'contestame', 'contestar', 'dime',
    'speak', 'talk', 'write', 'answer', 'reply', 'say',
    'parla', 'parlare', 'scrivi', 'rispondi',
    'fale', 'falar', 'escreva', 'responda',
    'pale', 'ekri', 'reponn', 'chanje',
    'parle', 'parler', 'ecris', 'repond', 'repondez',
    'cambia', 'cambiar', 'change', 'switch', 'traduce', 'traducir'];

  // Frases que hablan de un documento: si aparecen, "inglés" describe el papel,
  // no es una petición de idioma.
  var SOBRE_DOCUMENTO = ['carta', 'papel', 'documento', 'contrato', 'aviso', 'reporte', 'factura',
    'sobre', 'notificacion', 'letter', 'document', 'contract', 'notice', 'bill', 'lettera',
    'papye', 'dokiman', 'kontra', 'avi', 'fakti'];

  function pedidoDeIdioma(texto) {
    var encontrado = null;
    Object.keys(NOMBRES_IDIOMA).forEach(function (idioma) {
      NOMBRES_IDIOMA[idioma].forEach(function (nombre) {
        if (tienePalabra(texto, nombre)) encontrado = idioma;
      });
    });
    if (!encontrado) return null;

    var hayVerbo = VERBOS_IDIOMA.some(function (v) { return tienePalabra(texto, v); });
    if (!hayVerbo) return null;

    // "traduce esta carta al inglés" pide una traducción de un documento, no
    // que cambiemos el idioma de la conversación.
    var hablaDeDocumento = SOBRE_DOCUMENTO.some(function (d) { return tienePalabra(texto, d); });
    if (hablaDeDocumento) return null;

    return encontrado;
  }

  window.ZyronIdioma = {
    normalizar: normalizar,
    tienePalabra: tienePalabra,
    cuenta: cuenta,
    detectar: detectarIdioma,
    pedido: pedidoDeIdioma,
    NOMBRES: NOMBRES_IDIOMA
  };
})();

/* =========================================================================
   Parte 2 — la capa humana: saludos, identidad, emoción, glosario y frases
   ========================================================================= */

(function () {
  'use strict';

  /* ---------- la conversación, en cinco idiomas ----------
     Español e inglés están escritos completos. Portugués, italiano y francés
     cubren la conversación (saludar, presentarse, despedirse, no entender) y
     una versión corta de cada tema. No fingimos tener el contenido a fondo en
     cinco idiomas: se dice de frente. */

  var SHELL = {
    es: {
      saludo: [
        'Hola. Soy Zyron, el asistente de Themora. ¿En qué andas?',
        'Hola, qué gusto. Soy Zyron. Dime qué necesitas y vemos por dónde empezar.',
        'Hola. Aquí Zyron. ¿Te llegó algún papel, o andas averiguando algo?'
      ],
      comoEstas: [
        'Bien, gracias por preguntar — aquí, listo para lo que necesites. ¿Y tú, cómo vas?',
        'Todo tranquilo por aquí. Más importante: ¿cómo vas tú? ¿Te llegó algo que no entiendes?',
        'Bien. Es raro que alguien le pregunte eso a un asistente, y se agradece. ¿Qué te trae por aquí?'
      ],
      eresRobot: [
        'Soy un programa, no una persona — te lo digo de frente porque prefiero que lo sepas. Lo que sí soy es útil para explicarte papeles en español. Si necesitas hablar con alguien de carne y hueso, se puede agendar una cita.',
        'No soy una persona. Soy el asistente del sitio. Te puedo explicar cosas y llevarte a la herramienta correcta, pero cuando haga falta alguien de verdad, te lo digo y te paso el enlace para agendar.'
      ],
      quienEres: [
        'Soy Zyron, el asistente de Themora. Themora explica en español el papel que tienes en la mano —una carta, un contrato, un permiso, tu reporte de crédito— y ayuda a los negocios pequeños a aparecer en el mapa y estar en regla.',
        'Zyron, para servirte. Soy la parte del sitio que contesta preguntas. Themora se dedica a explicar papeles en español y a ayudar a negocios pequeños con sus trámites.'
      ],
      queHaces: [
        'Te puedo explicar: una carta en inglés, un contrato de dealer antes de firmarlo, tu reporte de crédito, cómo funciona una hipoteca, y todo lo de poner un negocio en el mapa o registrar una LLC. Dime cuál es tu caso y te llevo directo.',
        'Lo mío es: cartas y papeles en inglés, contratos de carro, reportes de crédito, comprar casa, y trámites de negocio. También te digo qué cosas son gratis para que nadie te cobre de más.'
      ],
      gratis: [
        'Entender un papel no cuesta nada aquí, y no va a costar nada. Lo único que se cobra son los servicios de negocio —poner tu ficha en el mapa y registrar tu LLC— y el precio está escrito en su página antes de que llenes nada.',
        'Las herramientas son gratis y sin cuenta: la carta, el contrato, el reporte, las calculadoras. Se cobra solo el trabajo de los trámites de negocio, con el precio a la vista.'
      ],
      privacidad: [
        'Buena pregunta, y te la contesto completa. El reporte de crédito se analiza dentro de tu propio teléfono: ese archivo no sale. En Cartas Claras, si pides el análisis con inteligencia artificial, el texto o las páginas sí salen —cifrados— hacia el proveedor que los lee. No guardamos tu carta ni tu reporte, y nunca te voy a pedir tu número de seguro social ni de cuenta.',
        'Te lo digo claro: no guardamos tus documentos. El reporte se procesa en tu navegador y no sale de ahí; una carta enviada al análisis con IA sí viaja, cifrada, y te avisamos antes de mandarla. Y aquí en el chat, nunca escribas números de cuenta ni tu seguro social — no los necesito.'
      ],
      gracias: [
        'Con gusto. Aquí ando si sale otra duda.',
        'De nada. Si te llega otro papel, ya sabes dónde estoy.',
        'Para eso estoy. Suerte con eso.'
      ],
      adios: [
        'Hasta luego. Cuídate.',
        'Nos vemos. Si te llega algo que no entiendes, vuelve.',
        'Que te vaya bien.'
      ],
      noEntiendo: [
        'Esa no la entendí bien, y prefiero decírtelo a inventarte una respuesta. ¿Me la cuentas con otras palabras? Si es sobre un papel que te llegó, dime de quién viene.',
        'No te voy a adivinar la respuesta. Dímelo de otra forma: ¿es sobre una carta, un contrato, tu crédito, una casa, un carro o tu negocio?',
        'Ahí me perdí. ¿De qué se trata — un papel que te llegó, algo de crédito, o tu negocio?'
      ],
      fuera: [
        'Eso se sale de lo mío, y prefiero no inventarte. Lo que sí manejo: papeles en inglés, crédito, casa, carro y trámites de negocio. ¿Algo de eso?',
        'De eso no sé, con honestidad. Pregúntame de cartas, contratos, crédito o tu negocio y ahí sí te sirvo.'
      ],
      groseria: [
        'Entiendo la frustración — estos temas sacan de quicio. Dime qué pasó y vemos si te puedo ayudar con algo concreto.',
        'Tranquilo, no me lo tomo a mal. ¿Qué es lo que te tiene así? A lo mejor te puedo destrabar algo.'
      ],
      cambio: 'Listo, seguimos en español.',
      soloDos: 'Te aviso con honestidad: lo tengo escrito a fondo en español e inglés. En otros idiomas te doy lo esencial y te llevo a la página correcta.',
      sensible: 'Un momento — no escribas aquí tu número de seguro social, de cuenta ni de tarjeta. No los necesito para ayudarte, y en el chat no deberían quedar. Cuéntamelo sin esos datos.',
      humano: 'Si prefieres hablar con una persona, se puede agendar una cita sin compromiso.'
    },
    en: {
      saludo: [
        'Hi. I\'m Zyron, the Themora assistant. What\'s going on?',
        'Hello. Zyron here. Tell me what you need and we\'ll start there.',
        'Hi there. Did a letter show up, or are you just looking into something?'
      ],
      comoEstas: [
        'Doing fine, thanks for asking. More to the point — how are you doing? Did something show up you don\'t understand?',
        'All good here. What brings you by?'
      ],
      eresRobot: [
        'I\'m a program, not a person — I\'d rather you know that up front. What I am good at is explaining paperwork in plain language. If you need a real human, you can book a call.',
        'Not a person. I\'m the site\'s assistant. I can explain things and point you to the right tool, and when you need an actual human I\'ll say so.'
      ],
      quienEres: [
        'I\'m Zyron, Themora\'s assistant. Themora explains the paper in your hand —a letter, a contract, a permit, your credit report— in Spanish, and helps small businesses show up on the map and stay in good standing.',
        'Zyron. I\'m the part of the site that answers questions. Themora explains paperwork in Spanish and helps small businesses with their filings.'
      ],
      queHaces: [
        'I can help with: a letter in English, a dealer contract before you sign it, your credit report, how a mortgage works, and everything about listing a business or registering an LLC. Tell me your situation.',
        'My areas: letters and paperwork, car contracts, credit reports, buying a house, and business filings. I\'ll also tell you which things are free so nobody overcharges you.'
      ],
      gratis: [
        'Understanding a document costs nothing here, and it never will. The only paid things are the business services —listing you on the map and registering your LLC— and the price is written on the page before you fill anything in.',
        'The tools are free and need no account. Only the business filings are paid, with the price in plain sight.'
      ],
      privacidad: [
        'Fair question, and here\'s the full answer. Your credit report is analyzed inside your own browser — that file never leaves. In Cartas Claras, if you ask for the AI analysis, the text or the pages do leave, encrypted, to the provider that reads them. We don\'t store your letter or your report, and I will never ask for your Social Security or account number.',
        'Straight answer: we don\'t keep your documents. The report is processed in your browser. A letter sent for AI analysis does travel, encrypted, and we tell you before sending it. And never type account numbers here — I don\'t need them.'
      ],
      gracias: ['Anytime. I\'m here if something else comes up.', 'You\'re welcome. Come back if another letter shows up.'],
      adios: ['Take care.', 'See you. Come back if something shows up you can\'t read.'],
      noEntiendo: [
        'I didn\'t catch that, and I\'d rather say so than make something up. Can you put it another way? If it\'s about a document, tell me who it came from.',
        'I won\'t guess at that one. Is it about a letter, a contract, your credit, a house, a car, or your business?'
      ],
      fuera: [
        'That\'s outside what I do, and I won\'t invent an answer. What I handle: paperwork in English, credit, houses, cars and business filings.',
        'Honestly, I don\'t know that one. Ask me about letters, contracts, credit or your business and I\'ll be useful.'
      ],
      groseria: [
        'I get the frustration — this stuff is maddening. Tell me what happened and let\'s see if I can help with something concrete.',
        'No offense taken. What\'s got you there? Maybe I can unstick something.'
      ],
      cambio: 'Got it, we\'ll continue in English.',
      soloDos: 'Being upfront: I have the detailed content in Spanish and English. In other languages I\'ll give you the essentials and point you to the right page.',
      sensible: 'Hold on — don\'t type your Social Security, account or card number here. I don\'t need them, and they shouldn\'t sit in a chat. Tell me without those.',
      humano: 'If you\'d rather talk to a person, you can book a call, no commitment.'
    },
    pt: {
      saludo: ['Olá. Sou o Zyron, o assistente da Themora. Como posso ajudar?', 'Oi. Aqui é o Zyron. Me conta o que você precisa.'],
      comoEstas: ['Tudo bem por aqui, obrigado por perguntar. E você, como vai? Chegou algum papel que não entendeu?'],
      eresRobot: ['Sou um programa, não uma pessoa — prefiro dizer isso logo. Se precisar falar com alguém de verdade, dá para marcar uma conversa.'],
      quienEres: ['Sou o Zyron, da Themora. A Themora explica em espanhol o papel que você tem na mão — uma carta, um contrato, uma licença, seu relatório de crédito — e ajuda pequenos negócios a aparecer no mapa e ficar em dia.'],
      queHaces: ['Posso ajudar com: carta em inglês, contrato de carro, relatório de crédito, financiamento de casa e trâmites de negócio.'],
      gratis: ['Entender um papel não custa nada aqui. Só os serviços de negócio são pagos, e o preço está escrito na página.'],
      privacidad: ['Não guardamos seus documentos. O relatório de crédito é analisado dentro do seu próprio navegador. E nunca escreva aqui número de conta ou documento.'],
      gracias: ['Por nada. Estou aqui se surgir outra dúvida.'],
      adios: ['Até logo. Se cuida.'],
      noEntiendo: ['Não entendi bem, e prefiro dizer isso a inventar. Pode explicar de outro jeito?'],
      fuera: ['Isso está fora do que eu faço. Pergunte sobre cartas, crédito, casa, carro ou negócio.'],
      groseria: ['Entendo a frustração. Me conta o que aconteceu.'],
      cambio: 'Certo, seguimos em português.',
      soloDos: 'Sendo sincero: as leis de cobrança de dívidas (FDCPA) e de relatórios de crédito (FCRA) eu tenho em detalhe em português. Nos outros assuntos, o conteúdo detalhado está em espanhol e inglês, e aqui te dou o essencial.',
      sensible: 'Um momento — não escreva aqui seu número de documento, conta ou cartão. Não preciso deles.',
      humano: 'Se preferir falar com uma pessoa, dá para marcar uma conversa.'
    },
    ht: {
      saludo: ['Bonjou. Mwen se Zyron, asistan Themora a. Kijan mwen ka ede w?', 'Alo. Se Zyron. Di m sa w bezwen epi n ap kòmanse la.', 'Bonjou. Zyron isit la. Èske yon papye rive lakay ou, oswa w ap chèche konnen yon bagay?'],
      comoEstas: ['Mwen byen, mèsi paske w mande. E ou menm, kijan w ye? Èske gen yon papye ki rive ou pa konprann?'],
      eresRobot: ['Mwen se yon pwogram, se pa yon moun — mwen pito di w sa dirèkteman. Si w bezwen pale ak yon moun vre, ou ka pran yon randevou.'],
      quienEres: ['Mwen se Zyron, nan Themora. Themora eksplike nan lang ou papye ki nan men w — yon lèt, yon kontra, yon rapò kredi — epi li ede ti biznis parèt sou kat la epi rete alafwa.'],
      queHaces: ['Mwen ka ede w ak: yon lèt ann anglè, yon kontra machin anvan w siyen l, rapò kredi w, dèt ak kolektè, ak fòmalite pou yon biznis. Di m ka w la.'],
      gratis: ['Konprann yon papye pa koute anyen isit la. Se sèlman sèvis pou biznis yo ki peye, epi pri a ekri sou paj la anvan w ranpli anyen.'],
      privacidad: ['Nou pa kenbe dokiman ou yo. Rapò kredi a analize andedan navigatè pa w la. Epi pa janm ekri isit la nimewo kont ou, kat ou, ni nimewo sekirite sosyal ou.'],
      gracias: ['Pa dekwa. Mwen la si w gen yon lòt kesyon.', 'Avèk plezi. Retounen si yon lòt papye rive.'],
      adios: ['Ale ak Bondye. Pran swen tèt ou.', 'N ap wè. Retounen si gen yon bagay ou pa konprann.'],
      noEntiendo: ['Mwen pa byen konprann, epi mwen pito di w sa pase m envante yon repons. Ou ka di l yon lòt jan? Si se sou yon papye, di m ki moun ki voye l.'],
      fuera: ['Sa a pa nan sa mwen fè, epi mwen p ap envante yon repons. Mande m sou lèt, kontra, kredi, kolektè, oswa biznis ou.'],
      groseria: ['Mwen konprann fristrasyon w — bagay sa yo ka fè moun fache. Di m sa ki pase epi n ap wè si mwen ka ede w.'],
      cambio: 'Dakò, n ap kontinye an kreyòl.',
      soloDos: 'Kite m di w franchman: mwen gen lwa sou kolektè dèt (FDCPA) ak rapò kredi (FCRA) an detay an kreyòl. Sou lòt sijè yo, mwen ba w sèlman sa ki esansyèl, epi detay yo pi konplè an panyòl ak anglè.',
      sensible: 'Yon ti moman — pa ekri isit la nimewo sekirite sosyal ou, nimewo kont ou, ni nimewo kat ou. Mwen pa bezwen yo pou ede w.',
      humano: 'Si w pito pale ak yon moun, ou ka pran yon randevou san okenn angajman.'
    },
    it: {
      saludo: ['Ciao. Sono Zyron, l\'assistente di Themora. Di cosa hai bisogno?', 'Ciao. Qui Zyron. Dimmi pure.'],
      comoEstas: ['Tutto bene, grazie per averlo chiesto. E tu come stai? Ti è arrivato qualcosa che non capisci?'],
      eresRobot: ['Sono un programma, non una persona — preferisco dirtelo subito. Se ti serve parlare con qualcuno in carne e ossa, si può fissare un appuntamento.'],
      quienEres: ['Sono Zyron, di Themora. Themora spiega in spagnolo il documento che hai in mano — una lettera, un contratto, un permesso, il tuo rapporto di credito — e aiuta le piccole imprese ad apparire sulla mappa e a essere in regola.'],
      queHaces: ['Posso aiutarti con: una lettera in inglese, un contratto dal concessionario, il rapporto di credito, il mutuo e le pratiche per un\'attività.'],
      gratis: ['Capire un documento qui non costa nulla. Si pagano solo i servizi per le attività, e il prezzo è scritto sulla pagina.'],
      privacidad: ['Non conserviamo i tuoi documenti. Il rapporto di credito viene analizzato dentro il tuo browser. E non scrivere mai qui numeri di conto o documenti.'],
      gracias: ['Di nulla. Sono qui se ti serve altro.'],
      adios: ['A presto. Stammi bene.'],
      noEntiendo: ['Non ho capito bene, e preferisco dirtelo invece di inventare. Puoi spiegarmelo in altro modo?'],
      fuera: ['Questo è fuori dal mio campo. Chiedimi di lettere, credito, casa, auto o della tua attività.'],
      groseria: ['Capisco la frustrazione. Raccontami cosa è successo.'],
      cambio: 'Va bene, continuiamo in italiano.',
      soloDos: 'Te lo dico con franchezza: il contenuto dettagliato ce l\'ho in spagnolo e in inglese. In italiano ti do l\'essenziale e ti porto alla pagina giusta.',
      sensible: 'Un momento — non scrivere qui il numero di conto, di carta o del documento. Non mi servono.',
      humano: 'Se preferisci parlare con una persona, si può fissare un appuntamento.'
    },
    fr: {
      saludo: ['Bonjour. Je suis Zyron, l\'assistant de Themora. Que puis-je faire ?', 'Bonjour. Zyron à votre service. Dites-moi.'],
      comoEstas: ['Ça va bien, merci de demander. Et vous ? Vous avez reçu un courrier que vous ne comprenez pas ?'],
      eresRobot: ['Je suis un programme, pas une personne — autant le dire tout de suite. Si vous voulez parler à quelqu\'un de réel, on peut prendre rendez-vous.'],
      quienEres: ['Je suis Zyron, de Themora. Themora explique en espagnol le document que vous avez en main — une lettre, un contrat, un permis, votre dossier de crédit — et aide les petites entreprises à apparaître sur la carte et à être en règle.'],
      queHaces: ['Je peux aider avec : une lettre en anglais, un contrat de concessionnaire, votre dossier de crédit, un prêt immobilier et les démarches d\'entreprise.'],
      gratis: ['Comprendre un document ne coûte rien ici. Seuls les services aux entreprises sont payants, et le prix est écrit sur la page.'],
      privacidad: ['Nous ne conservons pas vos documents. Le dossier de crédit est analysé dans votre propre navigateur. Et n\'écrivez jamais ici un numéro de compte.'],
      gracias: ['Je vous en prie. Je reste là si besoin.'],
      adios: ['Au revoir. Prenez soin de vous.'],
      noEntiendo: ['Je n\'ai pas bien compris, et je préfère le dire plutôt que d\'inventer. Vous pouvez reformuler ?'],
      fuera: ['Cela sort de mon domaine. Demandez-moi des lettres, du crédit, du logement, de la voiture ou de votre entreprise.'],
      groseria: ['Je comprends la frustration. Racontez-moi ce qui s\'est passé.'],
      cambio: 'D\'accord, on continue en français.',
      soloDos: 'En toute franchise : le contenu détaillé est en espagnol et en anglais. En français je vous donne l\'essentiel et je vous oriente vers la bonne page.',
      sensible: 'Un instant — n\'écrivez pas ici votre numéro de compte ou de carte. Je n\'en ai pas besoin.',
      humano: 'Si vous préférez parler à quelqu\'un, on peut prendre rendez-vous.'
    }
  };

  window.ZyronShell = SHELL;
})();

/* =========================================================================
   Parte 3 — temas, glosario, frases para el teléfono, y el motor
   ========================================================================= */

(function () {
  'use strict';

  var U = window.ZyronIdioma;
  var SHELL = window.ZyronShell;
  var norm = U.normalizar, tiene = U.tienePalabra, cuenta = U.cuenta;

  /* ---------- capa emocional ----------
     Va ANTES del tema. Alguien que escribe "me van a quitar la casa" no
     necesita primero una definición de foreclosure: necesita que le bajen el
     susto y le den el siguiente paso. Esta capa no sustituye la respuesta,
     la antecede. */

  var EMOCIONES = [
    {
      id: 'miedo',
      claves: ['asustado', 'asustada', 'miedo', 'panico', 'nervioso', 'nerviosa', 'angustiado', 'angustia',
        'preocupado', 'preocupada', 'desesperado', 'desesperada', 'scared', 'afraid', 'panic', 'worried', 'anxious',
        'assustado', 'assustada', 'medo', 'nervoso', 'nervosa',
        'mwen pe', 'm pe', 'pe anpil', 'enkyet', 'enkyete', 'estrese', 'panike'],
      prefijo: {
        es: 'Respira. Que dé miedo es normal — casi todo lo que llega en un sobre está escrito para que dé miedo. Vamos por partes.',
        en: 'Take a breath. Being scared is normal — most of what arrives in an envelope is written to be scary. Let\'s go step by step.',
        pt: 'Respira. É normal ficar assustado. Vamos por partes.',
        it: 'Respira. È normale avere paura. Andiamo con ordine.',
        ht: 'Respire. Nòmal pou w pè — prèske tout sa ki rive nan yon anvlòp ekri pou fè w pè. Ann ale etap pa etap.',
        fr: 'Respirez. Avoir peur est normal. Allons-y étape par étape.'
      }
    },
    {
      id: 'perder',
      claves: ['quitar', 'quitarme', 'perder', 'perdiendo', 'embargo', 'embargar', 'desalojo', 'desalojar',
        'sacar', 'lose', 'losing', 'evict', 'eviction', 'foreclosure', 'repossess', 'garnish',
        'despejo', 'penhora', 'perder a casa', 'perder o carro',
        'degepi', 'saisi', 'pran kay', 'pran machin'],
      prefijo: {
        es: 'Eso es serio y lo trato como serio. Lo primero es la fecha: casi todos estos procesos tienen un plazo, y mientras el plazo no venza hay opciones. Busca la fecha en el papel.',
        en: 'That\'s serious and I\'ll treat it as serious. First thing is the date: almost all of these have a deadline, and while it hasn\'t passed there are options. Find the date on the document.',
        pt: 'Isso é sério. A primeira coisa é a data: enquanto o prazo não vence, existem opções.',
        it: 'È una cosa seria. La prima cosa è la data: finché non scade, ci sono opzioni.',
        ht: 'Sa a serye, epi mwen pran l an seryè. Premye bagay la se dat la: pandan delè a poko pase, gen opsyon. Chèche dat la sou papye a.',
        fr: 'C\'est sérieux. La première chose est la date : tant que le délai n\'est pas passé, il y a des options.'
      }
    },
    {
      id: 'acoso',
      claves: ['llaman', 'llamando', 'llamadas', 'acosan', 'acoso', 'molestan', 'amenazan', 'amenaza',
        'calling', 'harass', 'harassing', 'threaten', 'threatening',
        'ligam', 'ligando', 'ameacam', 'assedio',
        'rele m', 'rele mwen', 'rele san rete', 'anmede', 'menase'],
      prefijo: {
        es: 'Que te llamen sin parar no es algo que tengas que aguantar en silencio — la ley federal de cobranza pone límites a cuándo y cómo pueden contactarte.',
        en: 'Constant calls are not something you just have to endure — federal collection law limits when and how they can contact you.',
        pt: 'Ligações constantes não são algo que você tenha que aguentar calado: a lei federal de cobrança tem limites.',
        it: 'Le chiamate continue non sono qualcosa da subire in silenzio: la legge federale pone dei limiti.',
        ht: 'Apèl ki pa janm sispann se pa yon bagay ou dwe sipòte an silans — lwa federal sou koleksyon dèt mete limit sou lè ak fason yo ka kontakte w.',
        fr: 'Les appels incessants ne sont pas une fatalité : la loi fédérale encadre les contacts.'
      }
    },
    {
      id: 'verguenza',
      claves: ['pena', 'verguenza', 'apenado', 'apenada', 'tonto', 'tonta', 'bruto', 'ignorante',
        'embarrassed', 'ashamed', 'stupid', 'dumb',
        'vergonha', 'wont', 'mwen wont'],
      prefijo: {
        es: 'No hay nada de qué apenarse. Estos papeles están escritos en un inglés que muchas personas nacidas aquí tampoco entienden — no es cosa tuya, es cosa del papel.',
        en: 'Nothing to be embarrassed about. These documents are written in English that plenty of people born here don\'t understand either — it\'s the paper\'s fault, not yours.',
        pt: 'Não há do que se envergonhar. Esses papéis são escritos de um jeito que muita gente daqui também não entende.',
        it: 'Non c\'è nulla di cui vergognarsi. Questi documenti non li capiscono nemmeno molti madrelingua.',
        ht: 'Pa gen okenn wont ladan l. Papye sa yo ekri nan yon anglè ke anpil moun ki fèt isit la pa konprann tou — se pa fòt ou, se fòt papye a.',
        fr: 'Il n\'y a pas de honte à avoir. Beaucoup de natifs ne comprennent pas ces documents non plus.'
      }
    },
    {
      id: 'sin_ingles',
      claves: ['no hablo ingles', 'no entiendo ingles', 'no se ingles', 'mi ingles', 'poco ingles',
        'nao falo ingles', 'meu ingles', 'mwen pa pale angle', 'mwen pa konn angle', 'pa pale angle'],
      prefijo: {
        es: 'Para eso existe este sitio. Y algo que casi nadie sabe: en muchos trámites tienes derecho a que te atiendan en tu idioma o con intérprete, sin costo.',
        en: 'That\'s exactly why this site exists. And something few people know: in many proceedings you have the right to be served in your language or with an interpreter, at no cost.',
        pt: 'É para isso que este site existe. E em muitos processos você tem direito a intérprete sem custo.',
        it: 'È esattamente per questo che esiste questo sito. In molte procedure hai diritto a un interprete gratuito.',
        ht: 'Se pou sa sit sa a egziste. Epi anpil moun pa konnen: nan anpil pwosedi ou gen dwa a yon entèprèt gratis.',
        fr: 'C\'est précisément pour cela que ce site existe. Dans beaucoup de démarches, vous avez droit à un interprète gratuit.'
      }
    }
  ];

  /* ---------- glosario: la pregunta que nadie espera que un chat conteste ----------
     "¿Qué quiere decir esta palabra?" es la duda más frecuente de alguien
     leyendo un papel en inglés, y la que menos se atiende. */

  var GLOSARIO = {
    'escrow': 'La cuenta donde el banco guarda tu dinero de impuestos y seguro de la casa, y paga esas cuentas por ti. Va aparte del pago del préstamo.',
    'down payment': 'El enganche — el dinero que pones de tu bolsillo al comprar. Se dice "down payment".',
    'closing costs': 'Los gastos de cierre: tasación, título, trámites. Aparte del enganche, suelen ser entre 2% y 5% del precio.',
    'apr': 'La tasa anual total del préstamo, incluyendo cargos. Es el número que sirve para comparar ofertas — no el pago mensual.',
    'charge off': 'Cuando el acreedor da la cuenta por perdida en sus libros. Ojo: NO significa que ya no debas nada, y sigue apareciendo en tu reporte.',
    'collection': 'Una cuenta que pasó a manos de un cobrador. Tienes derecho a pedir por escrito que te validen esa deuda.',
    'hard inquiry': 'Una consulta que baja un poco tu puntaje, la que hacen cuando pides crédito. La "soft" no lo baja.',
    'utilization': 'El porcentaje de tu límite de tarjeta que estás usando. Es el segundo factor más pesado de tu puntaje.',
    'pmi': 'El seguro hipotecario de un préstamo convencional, cuando pones menos de 20%. Se puede cancelar al llegar al 80%.',
    'mip': 'El seguro de un préstamo FHA. A diferencia del PMI, si pones menos de 10% dura toda la vida del préstamo.',
    'underwriting': 'La revisión final del banco antes de aprobar. Es cuando te piden papeles otra vez.',
    'pre-approval': 'La carta del banco que dice cuánto te prestaría. Sin ella, muchos vendedores ni consideran tu oferta.',
    'earnest money': 'El depósito de buena fe que pones al hacer una oferta por una casa. Normalmente del 1% al 3%.',
    'title': 'El documento que prueba quién es dueño de la propiedad. La "title search" busca deudas escondidas sobre esa casa.',
    'lien': 'Un derecho que alguien tiene sobre tu propiedad por una deuda. Hay que quitarlo antes de vender.',
    'ein': 'El número federal de tu negocio para impuestos y para abrir cuenta de banco. Es GRATIS y se saca directo con el IRS.',
    'llc': 'Una forma de registrar tu negocio que separa tus cosas personales de las del negocio. Se registra ante el estado.',
    'itin': 'Un número de identificación para impuestos, para quien no tiene número de seguro social. Lo da el IRS.',
    'summons': 'Una citación: te están llamando a corte y casi siempre hay un plazo corto para responder. No es lo mismo que una carta de cobro.',
    'garnishment': 'Cuando descuentan dinero directo de tu salario o tu cuenta por orden de una corte.',
    'deductible': 'Lo que pagas de tu bolsillo antes de que el seguro empiece a pagar.',
    'copay': 'La cantidad fija que pagas por una visita o medicina, aparte del deducible.',
    'eob': 'Explanation of Benefits — el resumen que manda tu seguro. NO es una factura, aunque traiga cifras. Dice "this is not a bill".',
    'gap insurance': 'Cubre la diferencia si chocas el carro y debes más de lo que vale. En el dealer suele costar mucho más que en tu aseguradora.',
    'balloon payment': 'Un pago final gigante al terminar el plazo. Si tu contrato lo tiene, el pago mensual bajo es engañoso.',
    'repossession': 'Cuando el banco se lleva el carro por falta de pagos. Queda en tu reporte.',
    'foreclosure': 'El proceso por el que el banco se queda con la casa por falta de pagos.'
  };

  /* ---------- frases para el teléfono ----------
     Nadie espera que un asistente de crédito le dé la frase exacta que hay
     que decir en inglés. Es de lo más útil que puede hacer. */

  var FRASES = {
    cobrador: {
      titulo: 'Si te llama un cobrador',
      lineas: [
        ['"I am requesting validation of this debt in writing."', 'Pido que me validen esta deuda por escrito.'],
        ['"Please do not call me at work."', 'Por favor no me llame al trabajo.'],
        ['"Please send all future communication by mail."', 'Mándeme todo por correo de ahora en adelante.'],
        ['"What is the name of the original creditor?"', '¿Cuál es el nombre del acreedor original?']
      ]
    },
    dealer: {
      titulo: 'En el concesionario',
      lineas: [
        ['"Could you show me the numbers without the add-ons?"', '¿Me enseña los números sin los productos agregados?'],
        ['"I want to see the out-the-door price."', 'Quiero ver el precio total, ya con todo incluido.'],
        ['"Is this product optional?"', '¿Este producto es opcional?'],
        ['"I have my own financing. What is your best rate?"', 'Traigo mi propio financiamiento. ¿Cuál es su mejor tasa?']
      ]
    },
    banco: {
      titulo: 'En el banco o con el prestamista',
      lineas: [
        ['"Can I get a pre-approval letter?"', '¿Me puede dar una carta de preaprobación?'],
        ['"Apply this extra payment to the principal, please."', 'Aplique este pago extra al capital, por favor.'],
        ['"Is there a prepayment penalty?"', '¿Hay penalidad por pagar antes de tiempo?'],
        ['"Can you explain this fee?"', '¿Me puede explicar este cargo?']
      ]
    },
    corte: {
      titulo: 'En una corte o una oficina de gobierno',
      lineas: [
        ['"I need an interpreter, please."', 'Necesito un intérprete, por favor.'],
        ['"I don\'t understand. Could you repeat that more slowly?"', 'No entiendo. ¿Puede repetirlo más despacio?'],
        ['"Where can I get free legal help?"', '¿Dónde puedo conseguir ayuda legal gratuita?']
      ]
    }
  };

  window.ZyronDatos = { EMOCIONES: EMOCIONES, GLOSARIO: GLOSARIO, FRASES: FRASES };
})();

/* =========================================================================
   Parte 4 — los temas del sitio y el motor que decide
   ========================================================================= */

(function () {
  'use strict';

  var U = window.ZyronIdioma;
  var SHELL = window.ZyronShell;
  var D = window.ZyronDatos;
  var norm = U.normalizar, tiene = U.tienePalabra;

  function L(href, label) { return { href: href, label: label }; }

  /* Cada tema: `claves` valen 3 puntos, `pistas` valen 1. Hace falta un
     mínimo de 3 para contestar — así una palabra suelta y ambigua nunca
     decide sola. `es` y `en` van completos; `pt`, `it` y `fr` van cortos y
     acompañados del aviso de que el detalle está en los otros dos. */
  var TEMAS = [
    {
      id: 'carta',
      claves: ['carta', 'sobre', 'notificacion', 'aviso', 'papel', 'documento', 'letter', 'notice', 'mail'],
      pistas: ['ingles', 'english', 'llego', 'recibi', 'traduce', 'traducir', 'entiendo', 'dice', 'leer'],
      es: ['Súbele una foto a Cartas Claras —o pega el texto— y te digo qué es, qué fecha trae y qué opciones existen. Si tiene varias páginas, súbelas todas: en las cartas de cobro el aviso de tus derechos suele ir al reverso.',
        'Eso lo resuelve Cartas Claras: una foto del papel y te lo explico en español. Ojo con las páginas de atrás — ahí es donde suelen ir la fecha y los derechos.'],
      en: ['Upload a photo to Cartas Claras —or paste the text— and I\'ll tell you what it is, what date it carries and what options exist. If it has several pages, upload them all: on collection letters the rights notice is usually on the back.'],
      pt: 'Mande uma foto do papel em Cartas Claras e te explico o que é e qual é o prazo.',
      it: 'Carica una foto del documento su Cartas Claras e ti dico di cosa si tratta e qual è la scadenza.',
      fr: 'Envoyez une photo du document sur Cartas Claras et je vous dis ce que c\'est et quel délai il porte.',
      enlace: L('cartas-claras.html', 'Explicar mi carta →')
    },
    {
      id: 'cobrador',
      claves: ['cobrador', 'cobranza', 'coleccion', 'collection', 'collector', 'debt', 'deuda'],
      pistas: ['llaman', 'validacion', 'validar', 'fdcpa', 'cobrar', 'pagar', 'debo'],
      es: ['Dos derechos que casi nadie usa: puedes pedir por escrito que te validen la deuda —monto, acreedor original y prueba de que es tuya—, y puedes pedir por escrito que dejen de contactarte. La ley federal de cobranza te da los dos. Lo que no puedo decirte es si conviene pagar o no: eso depende de tu caso.',
        'Antes de pagar nada, vale la pena pedir la validación por escrito. Si la disputas por escrito dentro de los 30 días de recibir el aviso, el cobrador debe dejar de cobrar esa deuda hasta mandarte la verificación. Y si las llamadas son el problema, existe la carta de cese de comunicación.'],
      en: ['Two rights almost nobody uses: you can request written validation of the debt —amount, original creditor, proof it\'s yours— and you can request in writing that they stop contacting you. Federal collection law gives you both.'],
      pt: 'Você pode pedir por escrito a validação da dívida e também que parem de te contatar.',
      it: 'Puoi chiedere per iscritto la validazione del debito e che smettano di contattarti.',
      fr: 'Vous pouvez demander par écrit la validation de la dette et l\'arrêt des contacts.',
      enlace: L('herramientas.html#carta-cese-comunicacion', 'Preparar mi carta →')
    },
    {
      id: 'estafa',
      prioridad: 3,
      claves: ['estafa', 'fraude', 'estafador', 'scam', 'fraud', 'timo', 'engano',
        'tarjetas de regalo', 'tarjeta de regalo', 'gift card', 'gift cards', 'western union', 'bitcoin', 'cripto'],
      pistas: ['arresto', 'arrestar', 'deportar', 'zelle', 'llamaron', 'urgente', 'hoy mismo', 'wire',
        'no le digas', 'sospechoso', 'raro'],
      es: ['Hay señales que casi siempre aparecen juntas en un fraude: te exigen pagar con tarjetas de regalo, cripto o transferencia; te presionan para que lo hagas hoy; te amenazan con arresto o deportación; y te piden que no le digas a nadie. Ninguna agencia real de gobierno cobra con tarjetas de regalo. Antes de pagar o dar datos, verifica al remitente por tu cuenta — nunca con el teléfono que viene en el mensaje.',
        'La regla que más sirve: no uses el número ni el enlace que trae el mensaje. Si es falso, ese número contesta igual. Busca tú el sitio oficial, o usa el número del reverso de tu tarjeta.'],
      en: ['Signals that almost always appear together in a scam: they demand gift cards, crypto or a wire; they pressure you to do it today; they threaten arrest or deportation; and they ask you not to tell anyone. No real government agency collects with gift cards. Verify the sender yourself — never with the number in the message.'],
      pt: 'Nunca use o telefone que vem na mensagem. Nenhuma agência do governo cobra com cartão-presente.',
      it: 'Non usare mai il numero che arriva nel messaggio. Nessun ente pubblico chiede buoni regalo.',
      fr: 'N\'utilisez jamais le numéro du message. Aucune administration ne demande de cartes cadeaux.',
      enlace: L('cartas-claras.html', 'Revisar el mensaje →')
    },
    {
      id: 'contrato_auto',
      claves: ['contrato', 'dealer', 'concesionario', 'carro', 'auto', 'vehiculo', 'camioneta', 'troca', 'car'],
      pistas: ['firmar', 'firme', 'financiar', 'financiamiento', 'mensualidad', 'apr', 'tasa', 'extras',
        'garantia', 'gap', 'comprar'],
      es: ['Antes de firmar, mete los números del contrato en la herramienta y te muestro a dónde va cada dólar: el precio, los impuestos, el cargo del dealer y —lo más caro y lo que menos se mira— cada producto agregado con sus intereses. En un caso típico, $5,184 en extras terminan costando $7,577 a lo largo del préstamo. La decisión de firmar es tuya; mi trabajo es que la tomes viendo el número completo.',
        'El número que importa no es el pago mensual, es el total. Escribe los datos del contrato y te separo cuánto es el carro, cuánto son intereses y cuánto son productos que casi siempre son opcionales.'],
      en: ['Before you sign, put the contract numbers in the tool and I\'ll show you where every dollar goes: price, taxes, dealer fee, and —the most expensive and least examined part— each add-on with its interest. In a typical case, $5,184 in add-ons ends up costing $7,577 over the loan.'],
      pt: 'Antes de assinar, coloque os números do contrato e eu mostro para onde vai cada dólar.',
      it: 'Prima di firmare, inserisci i numeri del contratto e ti mostro dove va ogni dollaro.',
      fr: 'Avant de signer, entrez les chiffres du contrat et je vous montre où va chaque dollar.',
      enlace: L('contrato-auto.html', 'Revisar mi contrato →')
    },
    {
      id: 'reporte',
      claves: ['reporte', 'report', 'buro', 'bureau', 'equifax', 'experian', 'transunion'],
      pistas: ['analizar', 'subir', 'revisar', 'credito', 'gratis', 'errores', 'disputar'],
      es: ['Súbelo y te digo qué encontramos, qué se puede disputar y qué no. Ese análisis ocurre entero dentro de tu propio teléfono: el archivo no sale de ahí. Y tus tres reportes son gratis en AnnualCreditReport.com, que es el único sitio autorizado por ley — desconfía de cualquiera que te los cobre.',
        'El reporte se analiza dentro de tu navegador, no se sube a ningún lado. Si no lo tienes, sácalo gratis en AnnualCreditReport.com — es el sitio oficial, no cuesta nada.'],
      en: ['Upload it and I\'ll tell you what we found, what can be disputed and what can\'t. That analysis happens entirely inside your own phone: the file never leaves. And your three reports are free at AnnualCreditReport.com, the only site authorized by law.'],
      pt: 'Envie o relatório: a análise acontece dentro do seu próprio navegador, o arquivo não sai dali.',
      it: 'Carica il rapporto: l\'analisi avviene dentro il tuo browser, il file non esce da lì.',
      fr: 'Envoyez le dossier : l\'analyse se fait dans votre navigateur, le fichier n\'en sort pas.',
      enlace: L('credito.html#analizar-reporte', 'Analizar mi reporte →')
    },
    {
      id: 'puntaje',
      claves: ['puntaje', 'score', 'fico', 'vantagescore', 'punto', 'puntos'],
      pistas: ['subir', 'mejorar', 'bajar', 'bajo', 'alto', 'cuanto', 'utilizacion', 'tarjeta', 'rapido'],
      es: ['Lo que más pesa, en orden: pagar a tiempo (35%) y cuánto usas de tu límite (30%). Bajar la tarjeta de 80% a 30% de uso suele moverse rápido, en uno o dos ciclos, porque el saldo se reporta cada mes. Lo que no se puede es borrar información correcta — quien te prometa eso te está mintiendo.',
        'Tres cosas mueven la aguja de verdad: nunca faltar a un pago, bajar el uso de las tarjetas por debajo del 30%, y corregir errores reales del reporte. No hay atajo, y el que te venda uno te está cobrando por nada.'],
      en: ['What weighs most, in order: paying on time (35%) and how much of your limit you use (30%). Dropping a card from 80% to 30% usage tends to move fast, within a cycle or two. What cannot be done is erasing correct information — anyone promising that is lying to you.'],
      pt: 'O que mais pesa: pagar em dia (35%) e o quanto você usa do limite (30%). Ninguém apaga informação correta.',
      it: 'Ciò che pesa di più: pagare puntuale (35%) e quanto usi del limite (30%). Nessuno cancella informazioni corrette.',
      fr: 'Ce qui compte le plus : payer à temps (35%) et le taux d\'utilisation (30%). Personne n\'efface une information exacte.',
      enlace: L('credito.html', 'Ver los fundamentos →')
    },
    {
      id: 'tiempo_reporte',
      prioridad: 3,
      claves: ['cuanto tiempo', 'cuantos anos', 'how long', 'se borra', 'se quita', 'desaparece', 'caduca'],
      pistas: ['reporte', 'deuda', 'bancarrota', 'colección', 'coleccion', 'negativo', 'report'],
      es: ['La regla general de la ley de reportes de crédito: la mayoría de la información negativa sale a los 7 años, y una bancarrota del capítulo 7 a los 10. Ojo con una confusión cara: que salga del reporte no significa que la deuda deje de existir, y que la deuda prescriba para demandarte es un plazo distinto que cambia por estado.',
        'Siete años para casi todo lo negativo, diez para una bancarrota del capítulo 7. Pero son dos relojes distintos: el del reporte y el del plazo para demandarte, que varía por estado.'],
      en: ['General rule under the credit reporting law: most negative information drops off at 7 years, a chapter 7 bankruptcy at 10. Careful with an expensive confusion: falling off the report doesn\'t mean the debt stopped existing.'],
      pt: 'Em geral, informação negativa sai em 7 anos. Mas sair do relatório não significa que a dívida acabou.',
      it: 'In genere le informazioni negative escono dopo 7 anni. Ma uscire dal rapporto non cancella il debito.',
      fr: 'En général, l\'information négative disparaît au bout de 7 ans. Mais cela n\'efface pas la dette.',
      enlace: L('credito.html', 'Ver los fundamentos →')
    },
    {
      id: 'arresto',
      prioridad: 3,
      claves: ['arrestar', 'arresto', 'carcel', 'preso', 'detener', 'jail', 'arrest', 'deportar', 'deportacion'],
      pistas: ['deuda', 'debo', 'pagar', 'cobrador', 'debt', 'owe'],
      es: ['Una cosa importante: en Estados Unidos no existe la cárcel por deudas de consumo. Un cobrador que te amenaza con arresto o con deportación por no pagar está usando una de las señales más claras de fraude. Distinto es una orden de una corte que ignoras — eso sí tiene consecuencias, y por eso una citación nunca se deja sin responder.',
        'No hay cárcel por deber una tarjeta o una factura médica. Si alguien te amenaza con arresto por una deuda, trátalo como señal de estafa. Lo que sí hay que responder siempre es una citación de corte.'],
      en: ['Important: there is no debtors\' prison for consumer debt in the United States. A collector threatening arrest or deportation over a bill is using one of the clearest fraud signals. A court order you ignore is a different matter.'],
      pt: 'Não existe prisão por dívida de consumo nos EUA. Ameaça de prisão é sinal de golpe.',
      it: 'Negli Stati Uniti non esiste il carcere per debiti di consumo. La minaccia di arresto è segnale di truffa.',
      fr: 'Il n\'y a pas de prison pour dettes de consommation aux États-Unis. Une menace d\'arrestation est un signe d\'arnaque.',
      enlace: L('cartas-claras.html', 'Revisar el mensaje →')
    },
    {
      id: 'casa',
      claves: ['casa', 'hipoteca', 'mortgage', 'fha', 'vivienda', 'house', 'home', 'comprar casa'],
      pistas: ['enganche', 'pronto', 'pago mensual', 'pmi', 'mip', 'convencional', 'va', 'usda',
        'prestamo', 'tasa', 'califico'],
      es: ['El dato que más se ignora es el seguro hipotecario. En un FHA con menos del 10% de enganche, el seguro dura toda la vida del préstamo; en un convencional, el PMI se cancela al llegar al 80%. En un ejemplo de $300,000 esa diferencia fue de unos $36,856 contra $12,023. Hay un comparador en la página que lo calcula con tus números.',
        'FHA contra convencional depende sobre todo de tu puntaje y del enganche, y la diferencia real no está en la tasa sino en el seguro hipotecario. El comparador te lo pone lado a lado con tus propias cifras.'],
      en: ['The most ignored number is mortgage insurance. On an FHA with under 10% down it lasts the life of the loan; on a conventional, PMI cancels at 80%. On a $300,000 example that was about $36,856 versus $12,023.'],
      pt: 'A diferença real entre FHA e convencional não está na taxa, está no seguro hipotecário.',
      it: 'La vera differenza tra FHA e convenzionale non è il tasso, è l\'assicurazione sul mutuo.',
      fr: 'La vraie différence entre FHA et conventionnel n\'est pas le taux, c\'est l\'assurance du prêt.',
      enlace: L('comprar-casa.html#comparar', 'Comparar FHA y convencional →')
    },
    {
      id: 'sin_ssn',
      prioridad: 3,
      claves: ['itin', 'sin seguro social', 'no tengo seguro social', 'sin ssn', 'sin papeles', 'indocumentado',
        'sin numero', 'no tengo papeles'],
      pistas: ['casa', 'carro', 'comprar', 'credito', 'prestamo', 'negocio', 'puedo'],
      es: ['No hace falta ser ciudadano ni residente para comprar una propiedad en Estados Unidos, y existen préstamos con ITIN que usan declaraciones de impuestos, historial de trabajo y recibos en vez del historial de crédito tradicional. Para el carro pasa algo parecido. Dos advertencias honestas: el FHA sí cerró desde el 25 de mayo de 2025 para quien no es residente permanente, y los requisitos cambian por prestamista.',
        'Comprar no depende de tener papeles: depende del prestamista. Los préstamos con ITIN son un producto real y establecido. Lo que sí cambió es el FHA, que desde mayo de 2025 dejó de aceptar a quienes no son residentes permanentes.'],
      en: ['You don\'t need citizenship or residency to buy property in the United States, and ITIN loans exist that use tax returns, work history and receipts instead of traditional credit. Two honest warnings: FHA did close as of May 25, 2025 to non-permanent residents, and requirements vary by lender.'],
      pt: 'Não é preciso ser cidadão para comprar um imóvel nos EUA. Existem empréstimos com ITIN.',
      it: 'Non serve la cittadinanza per comprare casa negli Stati Uniti. Esistono i prestiti con ITIN.',
      fr: 'Il n\'est pas nécessaire d\'être citoyen pour acheter aux États-Unis. Les prêts ITIN existent.',
      enlace: L('comprar-casa.html', 'Ver los caminos según tu estatus →')
    },
    {
      id: 'negocio_mapa',
      claves: ['google maps', 'apple maps', 'mapa', 'ficha', 'aparecer', 'aparezco', 'listar', 'directorio', 'maps'],
      pistas: ['negocio', 'clientes', 'encuentran', 'buscan', 'business', 'local', 'verificar'],
      es: ['Empieza por ver cómo estás hoy: hay una revisión gratis de cuatro pasos donde compruebas con tus propios ojos si sales en Google Maps y en Apple Maps. Y te lo digo antes de que preguntes: las dos plataformas son gratis, nadie tiene que pagarle a nadie por tenerlas. Lo que se cobra aquí es el trabajo de hacerlo bien; si prefieres hacerlo tú, los pasos completos están en la página.',
        'Si alguien te recomienda y no te encuentra, esa venta no llega. Revisa gratis cómo apareces hoy — y ojo, Google Business y Apple Business no cuestan nada: lo que se cobra es el trabajo.'],
      en: ['Start by seeing where you stand: there\'s a free four-step check where you see with your own eyes whether you show up on Google Maps and Apple Maps. And before you ask: both platforms are free — what\'s charged here is the work of doing it right.'],
      pt: 'Google Business e Apple Business são gratuitos. Comece pela revisão gratuita de como você aparece hoje.',
      it: 'Google Business e Apple Business sono gratuiti. Inizia dal controllo gratuito di come appari oggi.',
      fr: 'Google Business et Apple Business sont gratuits. Commencez par la vérification gratuite.',
      enlace: L('aparezco.html', 'Revisar mi negocio gratis →')
    },
    {
      id: 'negocio_llc',
      claves: ['llc', 'ein', 'incorporar', 'registrar', 'formar', 'licencia', 'permiso', 'corporacion'],
      pistas: ['negocio', 'empresa', 'abrir', 'impuestos', 'banco', 'estado', 'virginia', 'business'],
      es: ['Son dos trámites distintos: registrar la empresa ante el estado —en Virginia son $100 ante la SCC, y $50 al año de reporte— y sacar el EIN, que es el número federal con el que el negocio paga impuestos y abre cuenta de banco. El EIN es GRATIS y se saca directo con el IRS: desconfía de quien te lo cobre como si fuera un permiso especial.',
        'Registrar la LLC y sacar el EIN son cosas separadas. El EIN no cuesta nada — lo da el IRS directo. Lo que cuesta es la cuota del estado y, si quieres, el trabajo de que alguien te lo haga.'],
      en: ['Two separate filings: registering the company with the state —in Virginia that\'s $100 with the SCC, plus $50 a year— and getting the EIN, the federal number the business uses for taxes and to open a bank account. The EIN is FREE, straight from the IRS.'],
      pt: 'São dois trâmites: registrar a empresa no estado e tirar o EIN. O EIN é GRÁTIS, direto com o IRS.',
      it: 'Sono due pratiche: registrare l\'azienda presso lo stato e ottenere l\'EIN. L\'EIN è GRATIS, direttamente dall\'IRS.',
      fr: 'Deux démarches : enregistrer l\'entreprise auprès de l\'État et obtenir l\'EIN. L\'EIN est GRATUIT, directement auprès de l\'IRS.',
      enlace: L('formar-negocio.html', 'Ver cómo formar tu negocio →')
    },
    {
      id: 'corte',
      claves: ['corte', 'court', 'citacion', 'summons', 'demanda', 'demandaron', 'juez', 'audiencia', 'juicio'],
      pistas: ['fecha', 'responder', 'abogado', 'papel', 'llego', 'plazo'],
      es: ['Una citación no es una carta de cobro: trae un plazo corto para responder y no responder suele ser peor que responder mal. Busca la fecha en el papel, verifícala ahí mismo y no en una pantalla. Hay ayuda legal gratuita en los 50 estados en LawHelp.org, y en muchos procesos tienes derecho a intérprete sin costo. Lo que no puedo hacer es decirte qué contestar — eso sí necesita a alguien con licencia.',
        'Con un papel de corte, lo primero es la fecha y lo segundo es hablar con alguien pronto. LawHelp.org es un directorio gratuito de asistencia legal en los 50 estados.'],
      en: ['A summons is not a collection letter: it carries a short deadline, and not responding is usually worse than responding imperfectly. Free legal help exists in all 50 states at LawHelp.org, and in many proceedings you have the right to a free interpreter.'],
      pt: 'Uma intimação tem prazo curto. Existe ajuda legal gratuita em LawHelp.org, nos 50 estados.',
      it: 'Una citazione ha una scadenza breve. C\'è assistenza legale gratuita su LawHelp.org.',
      fr: 'Une assignation a un délai court. Il existe une aide juridique gratuite sur LawHelp.org.',
      enlace: L('cartas-claras.html', 'Explicar el papel →')
    },
    {
      id: 'irs',
      claves: ['irs', 'taxes', 'impuestos', 'declaracion', 'w2', 'w-2', '1099', 'refund', 'reembolso'],
      pistas: ['carta', 'aviso', 'debo', 'notice', 'pago'],
      es: ['El IRS se comunica primero por correo postal, nunca empieza por una llamada amenazante ni pide pagos con tarjetas de regalo. Casi todos sus avisos traen un código arriba a la derecha (por ejemplo CP2000) y una fecha límite. Súbelo a Cartas Claras y te digo qué tipo de aviso es y qué plazo trae.',
        'Si alguien te llama diciendo que es del IRS y te presiona, desconfía: el IRS empieza por carta. Si la carta ya la tienes, súbela y te digo qué código y qué fecha trae.'],
      en: ['The IRS contacts you by mail first — it never starts with a threatening call or asks for gift cards. Most of its notices carry a code in the upper right (like CP2000) and a deadline.'],
      pt: 'O IRS entra em contato primeiro por carta. Nunca começa com uma ligação ameaçadora.',
      it: 'L\'IRS contatta prima per posta. Non inizia mai con una telefonata minacciosa.',
      fr: 'L\'IRS écrit d\'abord par courrier. Il ne commence jamais par un appel menaçant.',
      enlace: L('cartas-claras.html', 'Explicar el aviso del IRS →')
    },
    {
      id: 'medico',
      claves: ['medico', 'hospital', 'doctor', 'seguro medico', 'factura medica', 'eob', 'medicaid', 'medicare'],
      pistas: ['cuenta', 'factura', 'cobro', 'deducible', 'copago', 'aseguranza', 'bill'],
      es: ['Dos cosas que ahorran dinero de verdad. Primera: un "Explanation of Benefits" NO es una factura, aunque traiga cifras — lo dice en el propio papel. Segunda: casi todos los hospitales tienen programas de ayuda financiera que no anuncian, y se piden preguntando. Antes de pagar, vale pedir la factura detallada, línea por línea.',
        'Pide siempre la factura detallada antes de pagar, y pregunta por el programa de ayuda financiera del hospital — existe casi siempre y casi nunca lo ofrecen solos.'],
      en: ['Two things that actually save money. First: an Explanation of Benefits is NOT a bill, even with numbers on it. Second: nearly every hospital has a financial assistance program they don\'t advertise. Ask for the itemized bill before paying.'],
      pt: 'Um "Explanation of Benefits" NÃO é uma fatura. E quase todo hospital tem programa de ajuda financeira.',
      it: 'Un "Explanation of Benefits" NON è una fattura. E quasi ogni ospedale ha un programma di aiuto economico.',
      fr: 'Un « Explanation of Benefits » n\'est PAS une facture. Presque tous les hôpitaux ont une aide financière.',
      enlace: L('cartas-claras.html', 'Explicar la factura →')
    },
    {
      id: 'agendar',
      claves: ['persona', 'humano', 'hablar con alguien', 'cita', 'agendar', 'llamar', 'telefono', 'contacto',
        'appointment', 'human', 'someone'],
      pistas: ['quiero', 'necesito', 'puedo', 'como'],
      es: ['Claro. Se puede agendar una cita sin compromiso — dices qué días y a qué horas te sirven y te buscan. Es orientación educativa, no asesoría hipotecaria ni legal, y eso está escrito en la página para que no haya sorpresas.',
        'Sí, se puede hablar con una persona. La cita es gratis y sin compromiso; en la página eliges tus días y horarios.'],
      en: ['Of course. You can book a call, no commitment — you say which days and times work and someone reaches out. It\'s educational guidance, not mortgage or legal advice, and the page says so plainly.'],
      pt: 'Claro. Dá para marcar uma conversa sem compromisso.',
      it: 'Certo. Si può fissare un appuntamento senza impegno.',
      fr: 'Bien sûr. Vous pouvez prendre rendez-vous, sans engagement.',
      enlace: L('agendar.html', 'Agendar una cita →')
    }
  ];

  window.ZyronTemas = TEMAS;
})();

/* =========================================================================
   Parte 5 — el motor
   ========================================================================= */

(function () {
  'use strict';

  var U = window.ZyronIdioma, SHELL = window.ZyronShell,
      D = window.ZyronDatos;
  // zyron-leyes.js (opcional) aporta los temas de leyes federales. Si el
  // archivo no carga, Zyron sigue funcionando con los temas del sitio.
  var TEMAS = window.ZyronTemas.concat(Array.isArray(window.ZyronLeyes) ? window.ZyronLeyes : []);
  var norm = U.normalizar, tiene = U.tienePalabra;

  var MINIMO = 3;           // puntaje mínimo para comprometerse con un tema
  var IDIOMAS_COMPLETOS = ['es', 'en'];

  /* Elige una redacción que no se haya usado hace poco. Un asistente que
     contesta siempre igual se siente máquina aunque la respuesta sea buena. */
  function variar(lista, clave, estado) {
    if (!lista || !lista.length) return '';
    if (lista.length === 1) return lista[0];
    estado.usadas = estado.usadas || {};
    var ultimo = estado.usadas[clave];
    var opciones = lista.filter(function (_, i) { return i !== ultimo; });
    var elegido = Math.floor(Math.random() * opciones.length);
    var real = lista.indexOf(opciones[elegido]);
    estado.usadas[clave] = real;
    return lista[real];
  }

  function txt(idioma, clave, estado) {
    var paquete = SHELL[idioma] || SHELL.es;
    var v = paquete[clave];
    if (v === undefined) { paquete = SHELL.es; v = paquete[clave]; }
    return Array.isArray(v) ? variar(v, idioma + ':' + clave, estado) : v;
  }

  /* ---------- detectores de la capa humana ---------- */

  var SALUDOS = ['hola', 'holaa', 'ola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches',
    'hello', 'hi', 'hey', 'good morning', 'ciao', 'bonjour', 'bonjou', 'bonswa', 'alo', 'oi', 'ola', 'saludos', 'que tal', 'qué onda', 'que onda'];
  var COMO_ESTAS = ['como estas', 'como esta', 'como te va', 'como andas', 'que tal estas', 'how are you',
    'how are u', 'how you doing', 'come stai', 'comment allez vous', 'ca va', 'tudo bem', 'como vai', 'kijan ou ye', 'kijan w ye', 'sak pase', 'kouman ou ye'];
  var ES_ROBOT = ['eres un robot', 'eres robot', 'eres una maquina', 'eres humano', 'eres una persona',
    'eres real', 'eres un bot', 'are you a robot', 'are you human', 'are you real', 'are you a bot',
    'sei un robot', 'es tu un robot', 'eres ia', 'eres inteligencia artificial', 'ou se yon robo', 'ou se yon moun'];
  var QUIEN_ERES = ['quien eres', 'como te llamas', 'que es themora', 'quien te hizo', 'quien te creo',
    'who are you', 'what is themora', 'what\'s your name', 'chi sei', 'qui es tu', 'quem e voce', 'tu nombre', 'ki moun ou ye', 'kisa themora ye'];
  var QUE_HACES = ['que haces', 'que puedes hacer', 'en que me ayudas', 'para que sirves', 'que sabes',
    'what can you do', 'what do you do', 'how can you help', 'cosa sai fare', 'ayuda', 'help', 'aiuto', 'ede m', 'kisa ou ka fe'];
  var ES_GRATIS = ['es gratis', 'cuesta', 'cuanto cuesta', 'tengo que pagar', 'me van a cobrar', 'precio',
    'is it free', 'how much', 'do i pay', 'e gratis', 'c\'est gratuit', 'gratuito', 'cobran', 'konbyen li koute', 'li koute'];
  // Nada de palabras sueltas y ambiguas aquí: "seguro" a secas hacía que
  // "¿puedo comprar casa sin seguro social?" se contestara como privacidad.
  var PRIVACIDAD = ['guardan mis datos', 'guardan mi informacion', 'guardan mis documentos', 'mis datos',
    'privacidad', 'es seguro', 'me graban', 'me estas grabando', 'grabando', 'venden mi informacion',
    'quien ve mis', 'que hacen con mi', 'privacy', 'do you store', 'is it safe', 'my data', 'recording me', 'done m yo', 'enfomasyon mwen'];
  var GRACIAS = ['gracias', 'muchas gracias', 'thank you', 'thanks', 'grazie', 'merci', 'mesi', 'obrigado', 'obrigada', 'ty'];
  var ADIOS = ['adios', 'bye', 'hasta luego', 'nos vemos', 'chao', 'chau', 'goodbye', 'arrivederci',
    'au revoir', 'tchau', 'me voy', 'orevwa', 'babay', 'n ap we'];
  var GROSERIAS = ['mierda', 'estupido', 'estupida', 'inutil', 'pendejo', 'idiota', 'basura', 'porqueria',
    'no sirves', 'stupid', 'useless', 'garbage', 'you suck', 'damn', 'shit'];
  var FUERA_TEMA = ['chiste', 'chistes', 'clima', 'tiempo hace', 'que hora', 'futbol', 'receta', 'pelicula',
    'cancion', 'joke', 'weather', 'what time', 'recipe', 'movie', 'song', 'poema'];

  function coincideFrase(texto, lista) {
    for (var i = 0; i < lista.length; i++) {
      if (texto.indexOf(lista[i]) !== -1) return true;
    }
    return false;
  }

  function coincidePalabra(texto, lista) {
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].indexOf(' ') === -1) { if (tiene(texto, lista[i])) return true; }
      else if (texto.indexOf(lista[i]) !== -1) return true;
    }
    return false;
  }

  /* ---------- datos sensibles ----------
     Si alguien escribe su seguro social en el chat, lo primero es frenarlo. */
  function pareceSensible(bruto) {
    var t = String(bruto || '');
    if (/\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b/.test(t)) return true;          // SSN
    if (/\b(?:\d[ -]?){13,19}\b/.test(t)) return true;                     // tarjeta
    if (/\b(ssn|social security|seguro social)\b/i.test(t) && /\d{3}/.test(t)) return true;
    return false;
  }

  /* ---------- glosario ---------- */
  function buscarGlosario(texto) {
    var pide = /que (significa|quiere decir|es)|what (does|is)|significa|traduce|traduccion|cosa significa|que vale decir/.test(texto);
    var mejor = null;
    Object.keys(D.GLOSARIO).forEach(function (termino) {
      if (texto.indexOf(termino) === -1) return;
      if (!mejor || termino.length > mejor.length) mejor = termino;
    });
    if (!mejor) return null;
    // Un término suelto sin pregunta explícita puede ser parte de otro tema.
    // Solo contestamos el glosario si de verdad están preguntando qué es.
    if (!pide && mejor.length < 6) return null;
    return { termino: mejor, texto: D.GLOSARIO[mejor], explicito: pide };
  }

  /* ---------- frases para el teléfono ---------- */
  function buscarFrases(texto) {
    var pide = /como (le |les )?(digo|pido|solicito|pregunto)|como se dice|que (le |les )?digo|frases|como explico|how do i (say|ask)|what do i say|que decir|palabras exactas/.test(texto);
    if (!pide) return null;
    if (/cobrador|cobranza|collector|deuda|llaman/.test(texto)) return D.FRASES.cobrador;
    if (/dealer|concesionario|carro|auto|vendedor/.test(texto)) return D.FRASES.dealer;
    if (/banco|prestamista|prestamo|lender|bank/.test(texto)) return D.FRASES.banco;
    if (/corte|court|juez|gobierno|oficina/.test(texto)) return D.FRASES.corte;
    return D.FRASES.cobrador;
  }

  function pintarFrases(bloque, idioma) {
    var cabeza = idioma === 'en'
      ? 'Here are the exact words, with what they mean:'
      : 'Aquí van las palabras exactas, con lo que significan:';
    var lineas = bloque.lineas.map(function (l) { return '• ' + l[0] + '\n  → ' + l[1]; }).join('\n');
    return bloque.titulo + '. ' + cabeza + '\n\n' + lineas;
  }

  /* ---------- puntuación de temas ---------- */
  function puntuarTemas(texto) {
    var res = [];
    TEMAS.forEach(function (tema) {
      var p = 0, porClaves = 0;
      tema.claves.forEach(function (k) {
        // Una clave de varias palabras es mucho más específica que una suelta
        // y pesa más. Sin esto, "¿puedo comprar casa sin seguro social?"
        // empataba entre "casa" y "sin seguro social", y ganaba la genérica.
        if (k.indexOf(' ') === -1) { if (tiene(texto, k)) { p += 3; porClaves += 3; } }
        else if (texto.indexOf(k) !== -1) { p += 5; porClaves += 5; }
      });
      (tema.pistas || []).forEach(function (k) {
        if (k.indexOf(' ') === -1 ? tiene(texto, k) : texto.indexOf(k) !== -1) p += 1;
      });
      // Desempate por especificidad: un tema que responde una situación
      // concreta le gana al tema ancho que la contendría. El bono solo cuenta
      // si hubo una clave real: con una sola pista suelta ("carta", "gratis")
      // el bono bastaba para llegar al mínimo y el tema contestaba sin razón.
      if (porClaves > 0 && tema.prioridad) p += tema.prioridad;
      if (p > 0) res.push({ tema: tema, puntos: p });
    });
    res.sort(function (a, b) { return b.puntos - a.puntos; });
    return res;
  }

  /* Un tema está "completo" en un idioma cuando ahí trae una lista de
     redacciones (arreglo); si trae una sola línea corta (texto), se contesta
     corto y se avisa. Así las leyes de zyron-leyes.js, escritas a fondo en
     portugués y criollo, se dicen completas sin que el resto de los temas
     finja tener un detalle que no tiene. */
  function respuestaDeTema(tema, idioma, estado) {
    var v = tema[idioma];
    if (Array.isArray(v) && v.length) {
      return { texto: variar(v, idioma + ':' + tema.id, estado), completo: true };
    }
    if (typeof v === 'string' && v) return { texto: v, completo: false };
    return { texto: tema.es[0], completo: false };
  }

  function etiquetaEnlace(tema, idioma) {
    var e = tema.enlace;
    if (!e) return null;
    var etiquetas = tema.enlaceEtiqueta || {};
    return { href: e.href, label: etiquetas[idioma] || e.label };
  }

  /* =======================================================================
     responder() — la única puerta de entrada
     estado: { idioma, saludado, ultimoTema, usadas }
     devuelve { texto, enlaces, idioma, tema, estado }
     ======================================================================= */
  function responder(bruto, estadoPrevio) {
    var estado = estadoPrevio || {};
    estado.usadas = estado.usadas || {};
    var texto = norm(bruto);
    var enlaces = [];

    if (!texto) {
      return { texto: txt(estado.idioma || 'es', 'noEntiendo', estado), enlaces: [], idioma: estado.idioma || 'es', tema: 'vacio', estado: estado };
    }

    // 1. Datos sensibles — antes que cualquier otra cosa.
    if (pareceSensible(bruto)) {
      var id0 = estado.idioma || U.detectar(texto, 'es');
      estado.idioma = id0;
      return { texto: txt(id0, 'sensible', estado), enlaces: [], idioma: id0, tema: 'sensible', estado: estado };
    }

    // 2. ¿Pidió cambiar de idioma? Se obedece y se confirma EN ese idioma.
    var pedido = U.pedido(texto);
    if (pedido) {
      estado.idioma = pedido;
      var confirma = txt(pedido, 'cambio', estado);
      if (IDIOMAS_COMPLETOS.indexOf(pedido) === -1) confirma += ' ' + txt(pedido, 'soloDos', estado);
      confirma += ' ' + txt(pedido, 'queHaces', estado);
      return { texto: confirma, enlaces: [], idioma: pedido, tema: 'idioma', estado: estado };
    }

    // 3. Idioma por detección, conservando el anterior si no hay evidencia.
    var idioma = U.detectar(texto, estado.idioma || 'es');
    estado.idioma = idioma;

    // 4. Se puntúan los temas ANTES de las intenciones blandas. "¿cuánto
    //    cuesta el EIN?" debe contestarse con el EIN (que es gratis), no con
    //    la respuesta genérica de precios del sitio.
    var marcadores = puntuarTemas(texto);
    var ganador = marcadores.length && marcadores[0].puntos >= MINIMO ? marcadores[0].tema : null;

    // 5. Conversación humana: identidad y cortesía. Estas no son ambiguas y
    //    van primero aunque haya un tema en la frase.
    if (coincideFrase(texto, ES_ROBOT)) {
      return { texto: txt(idioma, 'eresRobot', estado), enlaces: [{ href: 'agendar.html', label: idioma === 'en' ? 'Book a call →' : 'Agendar una cita →' }], idioma: idioma, tema: 'robot', estado: estado };
    }
    if (coincideFrase(texto, COMO_ESTAS)) {
      estado.saludado = true;
      return { texto: txt(idioma, 'comoEstas', estado), enlaces: [], idioma: idioma, tema: 'comoEstas', estado: estado };
    }
    if (coincideFrase(texto, QUIEN_ERES)) {
      return { texto: txt(idioma, 'quienEres', estado), enlaces: [], idioma: idioma, tema: 'quienEres', estado: estado };
    }
    // Blandas: solo si ningún tema del sitio alcanzó el mínimo.
    if (!ganador && coincideFrase(texto, PRIVACIDAD)) {
      return { texto: txt(idioma, 'privacidad', estado), enlaces: [{ href: 'privacidad.html', label: idioma === 'en' ? 'Read the privacy page →' : 'Ver la política de privacidad →' }], idioma: idioma, tema: 'privacidad', estado: estado };
    }
    if (!ganador && coincideFrase(texto, ES_GRATIS)) {
      return { texto: txt(idioma, 'gratis', estado), enlaces: [], idioma: idioma, tema: 'gratis', estado: estado };
    }
    if (coincidePalabra(texto, GROSERIAS)) {
      return { texto: txt(idioma, 'groseria', estado), enlaces: [], idioma: idioma, tema: 'groseria', estado: estado };
    }
    if (coincidePalabra(texto, ADIOS) && texto.split(' ').length <= 4) {
      return { texto: txt(idioma, 'adios', estado), enlaces: [], idioma: idioma, tema: 'adios', estado: estado };
    }
    if (coincidePalabra(texto, GRACIAS) && texto.split(' ').length <= 4) {
      return { texto: txt(idioma, 'gracias', estado), enlaces: [], idioma: idioma, tema: 'gracias', estado: estado };
    }

    // 6. Glosario y frases — las dos cosas que nadie espera de un chat así.
    var frases = buscarFrases(texto);
    var frasesSeSuman = !!(frases && ganador && ganador.ley && IDIOMAS_COMPLETOS.indexOf(idioma) !== -1);
    if (frases && !(ganador && ganador.ley)) {
      return { texto: pintarFrases(frases, idioma), enlaces: [], idioma: idioma, tema: 'frases', estado: estado };
    }
    var glo = buscarGlosario(texto);
    if (glo && glo.explicito) {
      // El glosario traduce términos del inglés AL ESPAÑOL — es para lo que
      // existe el sitio. Si la conversación va en otro idioma, se avisa en vez
      // de soltar un párrafo en español sin explicación.
      var aviso = { es: '', en: '(This glossary explains English paperwork terms in Spanish — that\'s what the site is for.) ',
        pt: '(Este glossário explica termos em inglês, em espanhol.) ',
        ht: '(Glosè sa a eksplike tèm anglè yo an panyòl.) ',
        it: '(Questo glossario spiega i termini inglesi in spagnolo.) ',
        fr: '(Ce glossaire explique les termes anglais en espagnol.) ' };
      return { texto: (aviso[idioma] || '') + '"' + glo.termino.toUpperCase() + '": ' + glo.texto, enlaces: [], idioma: idioma, tema: 'glosario', estado: estado };
    }

    // 7. Emoción: va delante de la respuesta, no en lugar de ella.
    var emocion = null;
    for (var i = 0; i < D.EMOCIONES.length; i++) {
      if (coincidePalabra(texto, D.EMOCIONES[i].claves)) { emocion = D.EMOCIONES[i]; break; }
    }

    if (ganador) {
      var r = respuestaDeTema(ganador, idioma, estado);
      var partes = [];
      // Si además pidió "cómo se lo digo", después de la respuesta legal van
      // las palabras exactas para el teléfono (solo en español e inglés).
      if (frasesSeSuman) r.texto += '\n\n' + pintarFrases(frases, idioma);
      if (emocion) partes.push(emocion.prefijo[idioma] || emocion.prefijo.es);
      if (!r.completo) partes.push(txt(idioma, 'soloDos', estado));
      partes.push(r.texto);
      if (ganador.enlace) enlaces.push(etiquetaEnlace(ganador, idioma));
      estado.ultimoTema = ganador.id;
      return { texto: partes.join(' '), enlaces: enlaces, idioma: idioma, tema: ganador.id, estado: estado };
    }

    // 8. Emoción sin tema claro: se responde a la emoción y se pregunta.
    if (emocion) {
      var cierre = idioma === 'en'
        ? 'Tell me what the document says or who it came from, and we\'ll take it from there.'
        : 'Cuéntame qué dice el papel o de quién viene, y seguimos desde ahí.';
      return { texto: (emocion.prefijo[idioma] || emocion.prefijo.es) + ' ' + cierre, enlaces: [{ href: 'cartas-claras.html', label: idioma === 'en' ? 'Explain my letter →' : 'Explicar mi carta →' }], idioma: idioma, tema: 'emocion:' + emocion.id, estado: estado };
    }

    // 9. Saludo suelto, o petición de ayuda general.
    if (coincidePalabra(texto, SALUDOS) && texto.split(' ').length <= 5) {
      var s = estado.saludado ? txt(idioma, 'queHaces', estado) : txt(idioma, 'saludo', estado);
      estado.saludado = true;
      return { texto: s, enlaces: [], idioma: idioma, tema: 'saludo', estado: estado };
    }
    if (coincideFrase(texto, QUE_HACES)) {
      return { texto: txt(idioma, 'queHaces', estado), enlaces: [], idioma: idioma, tema: 'queHaces', estado: estado };
    }

    // 10. Claramente fuera de tema: se dice, con ligereza, y se reencauza.
    if (coincidePalabra(texto, FUERA_TEMA)) {
      return { texto: txt(idioma, 'fuera', estado), enlaces: [], idioma: idioma, tema: 'fuera', estado: estado };
    }

    // 11. Un tema rozó el tema pero no llegó al mínimo: se ofrece, no se afirma.
    if (marcadores.length) {
      var t2 = marcadores[0].tema;
      var duda = idioma === 'en'
        ? 'I\'m not sure I understood. Were you asking about this?'
        : 'No estoy seguro de haber entendido. ¿Era por esto?';
      if (t2.enlace) enlaces.push(t2.enlace);
      return { texto: duda, enlaces: enlaces, idioma: idioma, tema: 'duda:' + t2.id, estado: estado };
    }

    // 12. No se entendió. Se dice, que es la regla de la casa.
    return { texto: txt(idioma, 'noEntiendo', estado), enlaces: [], idioma: idioma, tema: 'noEntiendo', estado: estado };
  }

  window.ZyronBrain = {
    responder: responder,
    TEMAS: TEMAS,
    GLOSARIO: D.GLOSARIO,
    FRASES: D.FRASES,
    detectarIdioma: U.detectar,
    normalizar: norm
  };
})();
