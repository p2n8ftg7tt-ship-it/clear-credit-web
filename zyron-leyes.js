/* =========================================================================
   Zyron — leyes federales que conoce a fondo
   =========================================================================

   Este archivo es la memoria legal de Zyron. Se carga ANTES de
   zyron-brain.js, que lo suma a sus temas (window.ZyronLeyes).

   Leyes cargadas y de dónde salen (texto federal publicado por el personal
   de la FTC; es una conveniencia pública, no sustituye al U.S. Code):
   - FDCPA  15 U.S.C. §§ 1692–1692p   texto con reformas hasta julio de 2010
   - FCRA   15 U.S.C. § 1681 y ss.    revisión de mayo de 2023

   Cada ficha lleva la sección de donde sale (`cita`) y está escrita en
   español, inglés, portugués y criollo haitiano. Reglas que valen aquí igual
   que en el resto de Zyron (las revisa zyron-leyes.test.js):
   - Se DESCRIBE lo que dice la ley; nunca se dice qué debe hacer la persona,
     ni que alguien cometió una infracción, ni se promete un resultado.
   - Cada cifra y plazo sale del texto de la ley. Lo que no está en estos dos
     textos (Regulación F de la CFPB, leyes de cada estado, cambios
     posteriores a las fechas de arriba) NO se afirma: se dice que no está
     cargado. Ver la ficha `leyes_alcance`.
   - Las redacciones en portugués y criollo deben revisarlas hablantes
     nativos antes de darlas por definitivas.

   Cómo agregar otra ley: una ficha por pregunta que la gente haría, con
   `claves` (3 puntos; las de varias palabras, 5) y `pistas` (1 punto) ya
   NORMALIZADAS: minúsculas y sin acentos, porque Zyron compara contra el
   texto normalizado. Poner `prioridad: 2` para que gane a los temas anchos.
   Actualizar también netlify/functions/leyes-digest.js, que es lo que lee la
   IA de coach.js.
   ========================================================================= */

(function () {
  'use strict';

  function L(href, label) { return { href: href, label: label }; }

  var LEYES = [

    /* ================= ALCANCE: qué sabe y qué no ================= */
    {
      id: 'leyes_alcance',
      ley: 'ALCANCE',
      cita: 'FDCPA (jul. 2010) · FCRA (may. 2023)',
      prioridad: 3,
      claves: ['que leyes', 'cuales leyes', 'que leyes conoces', 'que leyes sabes', 'what laws', 'which laws', 'laws do you know',
        'quais leis', 'que leis', 'ki lwa', 'ki lwa ou konnen', 'leyes federales'],
      pistas: ['conoces', 'sabes', 'know', 'conhece', 'konnen'],
      es: ['A fondo tengo dos leyes federales: la FDCPA (cobradores de deudas, texto con reformas hasta julio de 2010) y la FCRA (reportes de crédito, revisión de mayo de 2023). Lo que NO tengo cargado todavía: las reglas de la CFPB que las desarrollan (como la Regulación F sobre cobranza), las leyes de cada estado y cualquier cambio posterior a esas fechas. Cuando algo dependa de eso, te lo digo en vez de adivinar.'],
      en: ['I know two federal laws in depth: the FDCPA (debt collectors, text as amended through July 2010) and the FCRA (credit reporting, May 2023 revision). What I do NOT have loaded yet: the CFPB rules that build on them (like Regulation F on debt collection), each state\'s laws, and any change after those dates. When something depends on that, I\'ll say so instead of guessing.'],
      pt: ['Conheço a fundo duas leis federais: a FDCPA (cobradores de dívidas, texto com alterações até julho de 2010) e a FCRA (relatórios de crédito, revisão de maio de 2023). O que AINDA não tenho carregado: as regras da CFPB que as detalham (como a Regulação F sobre cobrança), as leis de cada estado e qualquer mudança posterior a essas datas. Quando algo depender disso, eu aviso em vez de chutar.'],
      ht: ['Mwen konnen de lwa federal an detay: FDCPA (kolektè dèt, tèks ak amannman jiska jiyè 2010) ak FCRA (rapò kredi, revizyon mwa me 2023). Sa mwen poko gen chaje: règ CFPB ki devlope yo (tankou Règleman F sou koleksyon dèt), lwa chak eta, ak nenpòt chanjman apre dat sa yo. Lè yon bagay depann de sa, mwen di w olye m devine.'],
      enlace: L('cartas-claras.html', 'Explicar mi carta →'),
      enlaceEtiqueta: { en: 'Explain my letter →', pt: 'Explicar minha carta →', ht: 'Eksplike lèt mwen an →' }
    },

    /* ============================ FDCPA ============================ */
    {
      id: 'fdcpa_general',
      ley: 'FDCPA',
      cita: '§ 801–802 · 15 U.S.C. § 1692',
      prioridad: 2,
      claves: ['fdcpa', 'fair debt collection', 'reglas de los cobradores', 'que reglas tienen los cobradores', 'que reglas tiene un cobrador',
        'que reglas tiene que seguir un cobrador', 'que reglas deben seguir los cobradores', 'reglas de cobranza', 'derechos con los cobradores',
        'derechos frente a un cobrador', 'que derechos tengo con un cobrador', 'debt collector rules', 'rules for debt collectors',
        'what rules do debt collectors', 'what rules must debt collectors', 'debt collector rights', 'regras dos cobradores',
        'que regras os cobradores', 'règ kolektè yo', 'reg kolekte yo', 'ki reg kolekte yo',
        'ley de cobranza', 'ley de cobradores', 'ley de cobro', 'debt collection law',
        'debt collection act', 'lei de cobranca', 'lei dos cobradores', 'lwa kolektè', 'lwa kolekte', 'lwa koleksyon',
        'lwa sou kolekte'],
      pistas: ['ley', 'law', 'lei', 'lwa', 'federal', 'derechos', 'rights', 'direitos', 'dwa'],
      es: ['La FDCPA es la ley federal que regula a los cobradores de deudas (15 U.S.C. §§ 1692 a 1692p): les prohíbe acosar, engañar o usar prácticas injustas para cobrar deudas personales o del hogar. Tengo el texto federal completo (última reforma: julio de 2010). Pregúntame, por ejemplo, a qué horas pueden llamarte, si pueden contarle tu deuda a otra persona, cómo pedir que dejen de contactarte o cómo pedir que te validen la deuda.'],
      en: ['The FDCPA is the federal law that regulates debt collectors (15 U.S.C. §§ 1692–1692p): it bars them from harassing, deceiving or using unfair practices to collect personal or household debts. I have the full federal text (last amended July 2010). Ask me, for example, what hours they can call, whether they can tell someone else about your debt, how to ask them to stop contacting you, or how to ask them to validate the debt.'],
      pt: ['A FDCPA é a lei federal que regula os cobradores de dívidas (15 U.S.C. §§ 1692 a 1692p): ela proíbe assédio, engano e práticas injustas na cobrança de dívidas pessoais ou domésticas. Tenho o texto federal completo (última alteração: julho de 2010). Pergunte, por exemplo, em que horários podem ligar, se podem contar sua dívida a outra pessoa, como pedir que parem de te contatar ou como pedir a validação da dívida.'],
      ht: ['FDCPA se lwa federal ki reglemante kolektè dèt yo (15 U.S.C. §§ 1692 rive 1692p): li entèdi yo anmède moun, twonpe moun oswa itilize pratik enjis pou kolekte dèt pèsonèl oswa dèt lakay. Mwen gen tèks federal la an antye (dènye amannman: jiyè 2010). Mande m, pa egzanp, ki lè yo ka rele w, si yo ka di yon lòt moun ou dwe, kijan pou mande yo sispann kontakte w, oswa kijan pou mande yo valide dèt la.'],
      enlace: L('herramientas.html', 'Ver herramientas →'),
      enlaceEtiqueta: { en: 'See the tools →', pt: 'Ver as ferramentas →', ht: 'Gade zouti yo →' }
    },
    {
      id: 'fdcpa_aplica',
      ley: 'FDCPA',
      cita: '§ 803 · 15 U.S.C. § 1692a',
      prioridad: 2,
      claves: ['a quien aplica', 'quien es cobrador', 'que es un cobrador', 'acreedor original', 'original creditor', 'credor original',
        'kreditè orijinal', 'kredite orijinal', 'who is a debt collector', 'what counts as a debt', 'que cuenta como deuda',
        'deuda de negocio', 'business debt', 'divida de negocio', 'dèt biznis', 'det biznis', 'quem e cobrador',
        'ki moun ki kolekte', 'agencia de cobranza'],
      pistas: ['cubre', 'aplica', 'covered', 'cover', 'applies', 'cobre', 'aplica', 'kouvri', 'banco', 'bank', 'debe', 'personal'],
      es: ['La FDCPA cubre deudas personales, familiares o del hogar —una tarjeta, el préstamo del carro, una cuenta médica— y a quienes cobran deudas de otros como negocio. En general no cubre a la empresa a la que le debes cuando cobra ella misma con su propio nombre; eso cambia si usa otro nombre que haga parecer que cobra un tercero. Una deuda de negocio tampoco entra, porque la ley habla de deudas para fines personales, familiares o del hogar. Y hay excluidos, como los empleados del gobierno que cobran como parte de su trabajo oficial.'],
      en: ['The FDCPA covers personal, family or household debts —a credit card, a car loan, a medical bill— and people who collect other people\'s debts as a business. In general it doesn\'t cover the company you owe when it collects on its own under its own name; that changes if it uses another name that makes it look like a third party is collecting. A business debt isn\'t covered either, since the law speaks of debts for personal, family or household purposes. And some are excluded, like government employees collecting as part of their official duties.'],
      pt: ['A FDCPA cobre dívidas pessoais, familiares ou domésticas — um cartão, o financiamento do carro, uma conta médica — e quem cobra dívidas de outras pessoas como negócio. Em geral, não cobre a empresa a quem você deve quando ela mesma cobra com o próprio nome; isso muda se ela usa outro nome que faça parecer que um terceiro está cobrando. Dívida de negócio também não entra, pois a lei fala de dívidas para fins pessoais, familiares ou domésticos. E há exclusões, como funcionários do governo que cobram como parte do trabalho oficial.'],
      ht: ['FDCPA kouvri dèt pèsonèl, dèt fanmi oswa dèt lakay — yon kat kredi, prè machin nan, yon bòdwo medikal — ak moun ki kolekte dèt lòt moun kòm biznis. An jeneral li pa kouvri konpayi ou dwe a lè li menm ap kolekte ak pwòp non li; sa chanje si li sèvi ak yon lòt non ki fè l sanble se yon twazyèm moun k ap kolekte. Yon dèt biznis pa antre tou, paske lwa a pale de dèt pou rezon pèsonèl, fanmi oswa lakay. Epi gen eksepsyon, tankou anplwaye gouvènman ki kolekte kòm yon pati nan travay ofisyèl yo.']
    },
    {
      id: 'fdcpa_horarios',
      ley: 'FDCPA',
      cita: '§ 805(a) · 15 U.S.C. § 1692c(a)',
      prioridad: 2,
      claves: ['a que hora', 'que horas pueden', 'horario de cobranza', 'horarios de cobranza', 'llamar de noche', 'llaman de madrugada',
        'llaman muy temprano', 'llaman tarde', 'llamar al trabajo', 'llaman a mi trabajo', 'no me llamen al trabajo',
        'llamar en el trabajo', 'llaman al trabajo', 'llamando al trabajo', 'llamen al trabajo', 'llamar al trabajo',
        'call me at my job', 'ligam para o meu trabalho', 'ligam no meu trabalho', 'ki le kolekte', 'yo ka rele m', 'yo ka rele mwen',
        'what time can', 'what hours can', 'call me at work', 'calling me at work', 'calling at night',
        'call before 8', 'call after 9', 'a que horas', 'em que horario', 'em que horas', 'ligam no trabalho', 'ligar no trabalho',
        'ki le yo ka rele', 'rele m nan travay', 'rele mwen nan travay', 'nan mitan lannwit', 'lè yo ka rele', 'le yo ka rele'],
      pistas: ['horas', 'hora', 'llamadas', 'llaman', 'noche', 'temprano', 'trabajo', 'hours', 'calls', 'night', 'work', 'horario',
        'ligacoes', 'trabalho', 'rele', 'travay', 'abogado', 'attorney', 'advogado', 'avoka'],
      es: ['Sin tu permiso, un cobrador no puede contactarte en horas o lugares inconvenientes. Si no sabe otra cosa, la ley presume que lo conveniente es después de las 8 de la mañana y antes de las 9 de la noche, hora de donde estás tú. Tampoco puede contactarte en el trabajo si sabe que tu empleador lo prohíbe, ni hablar directamente contigo si sabe que un abogado te representa por esa deuda (salvo que el abogado no responda en un tiempo razonable o lo autorice). Ojo: la CFPB agregó reglas más nuevas sobre el número de llamadas (Regulación F) que todavía no tengo cargadas en detalle.'],
      en: ['Without your permission, a collector can\'t contact you at unusual times or places. If it knows nothing else, the law assumes the convenient time is after 8 a.m. and before 9 p.m., local time where you are. It also can\'t contact you at work if it knows your employer prohibits it, or deal with you directly if it knows an attorney represents you on that debt (unless the attorney doesn\'t respond within a reasonable time or agrees). Note: the CFPB added newer rules on the number of calls (Regulation F) that I don\'t have loaded in detail yet.'],
      pt: ['Sem a sua permissão, um cobrador não pode te contatar em horários ou lugares inconvenientes. Se não souber de outra coisa, a lei presume que o horário conveniente é depois das 8 da manhã e antes das 9 da noite, no horário local de onde você está. Também não pode te contatar no trabalho se souber que seu empregador proíbe, nem falar direto com você se souber que um advogado te representa naquela dívida (salvo se o advogado não responder em prazo razoável ou concordar). Atenção: a CFPB criou regras mais novas sobre o número de ligações (Regulação F) que ainda não tenho carregadas em detalhe.'],
      ht: ['San pèmisyon w, yon kolektè pa ka kontakte w nan lè oswa kote ki pa konvenab. Si li pa konnen lòt bagay, lwa a sipoze lè ki konvenab la se apre 8 è nan maten ak anvan 9 è nan aswè, lè lokal kote ou ye a. Li pa ka kontakte w nan travay tou si li konnen anplwayè w entèdi l, ni pale dirèkteman ak ou si li konnen yon avoka reprezante w pou dèt sa a (sof si avoka a pa reponn nan yon delè rezonab oswa li dakò). Atansyon: CFPB ajoute règ ki pi resan sou kantite apèl (Règleman F) ke mwen poko gen chaje an detay.']
    },
    {
      id: 'fdcpa_terceros',
      ley: 'FDCPA',
      cita: '§ 804 y § 805(b) · 15 U.S.C. §§ 1692b, 1692c(b)',
      prioridad: 2,
      claves: ['a mi empleador', 'llamaron a mi empleador', 'call my family', 'call my boss', 'call my employer', 'call my neighbors',
        'contact my family', 'contact my employer', 'llamar a mi familia', 'llamen a mi familia', 'llamar a mi jefe', 'llamen a mi jefe',
        'called my employer', 'ligar para minha familia', 'ligar para meu chefe', 'ligar para meu empregador', 'ligaram para meu empregador',
        'rele fanmi m', 'rele patwon m', 'kontakte fanmi m', 'kontakte patwon m',
        'le dicen a mis vecinos', 'llamo a mi familia', 'llaman a mi familia', 'llamaron a mi jefe', 'llamo a mi jefe',
        'llamaron a mi mama', 'llamaron a mis vecinos', 'llaman a mi jefe', 'contarle mi deuda', 'contar mi deuda',
        'saben que debo', 'hablar con mi familia', 'sobre mi deuda a mi familia', 'postal', 'tarjeta postal', 'postcard',
        'called my family', 'called my boss', 'called my neighbors', 'tell my employer', 'tell my family', 'tell my neighbors',
        'third party', 'third parties', 'tercero', 'terceros', 'ligou para minha familia', 'ligaram para meu chefe',
        'ligaram para minha familia', 'rele fanmi mwen', 'rele patwon mwen', 'rele vwazen mwen', 'di fanmi mwen',
        'di patwon mwen', 'di vwazen mwen'],
      pistas: ['familia', 'vecinos', 'jefe', 'empleador', 'family', 'neighbors', 'boss', 'employer', 'familiares', 'chefe', 'vizinhos',
        'fanmi', 'vwazen', 'patwon', 'sobre', 'envelope'],
      es: ['Un cobrador no puede contarle tu deuda a tus vecinos, familiares o empleador. Puede contactar a otras personas solo para ubicarte, y ahí debe identificarse, no decir que debes dinero y, en general, no llamar a la misma persona más de una vez. Sí puede hablar con tu abogado, con la agencia de reportes de crédito, con el acreedor y con los abogados de ellos. Tampoco puede mandarte postales ni poner en el sobre nada que revele que es cobranza. (Para estas reglas, tu cónyuge cuenta como tú.)'],
      en: ['A collector can\'t tell your neighbors, relatives or employer about your debt. It may contact other people only to locate you, and then it must identify itself, not say you owe money and, in general, not contact the same person more than once. It can talk to your attorney, to the credit reporting agency, to the creditor and to their attorneys. It also can\'t send you postcards or put anything on the envelope that reveals it\'s debt collection. (For these rules, your spouse counts as you.)'],
      pt: ['Um cobrador não pode contar sua dívida a vizinhos, familiares ou ao seu empregador. Ele só pode contatar outras pessoas para te localizar e, nesse caso, deve se identificar, não dizer que você deve dinheiro e, em geral, não contatar a mesma pessoa mais de uma vez. Pode falar com seu advogado, com a agência de relatórios de crédito, com o credor e com os advogados deles. Também não pode enviar cartões-postais nem colocar no envelope nada que revele que é cobrança. (Para essas regras, seu cônjuge conta como você.)'],
      ht: ['Yon kolektè pa ka di vwazen w, fanmi w oswa patwon w ou dwe. Li ka kontakte lòt moun sèlman pou jwenn ou, epi lè sa a li dwe idantifye tèt li, pa di ou dwe lajan, epi an jeneral pa kontakte menm moun nan plis pase yon fwa. Li ka pale ak avoka w, ak ajans rapò kredi a, ak kreditè a ak avoka yo. Li pa ka voye kat postal ba ou tou, ni mete sou anvlòp la anyen ki montre se koleksyon dèt. (Pou règ sa yo, mari oswa madanm ou konte kòm ou menm.)']
    },
    {
      id: 'fdcpa_cese',
      ley: 'FDCPA',
      cita: '§ 805(c) · 15 U.S.C. § 1692c(c)',
      prioridad: 3,
      claves: ['deje de llamarme', 'deje de llamar', 'deje de contactarme', 'pare de llamarme', 'no me llamen', 'dejen de llamarme', 'que dejen de llamar', 'dejen de contactarme', 'que dejen de contactarme', 'que no me llamen mas',
        'no quiero que me llamen', 'no me llamen mas', 'cese de comunicacion', 'carta de cese', 'cese y desista', 'cease and desist',
        'stop calling me', 'stop contacting me', 'stop the calls', 'stop collectors', 'cease communication', 'stop communication',
        'parem de ligar', 'parem de me ligar', 'parem de me contatar', 'carta de cessacao', 'pare de ligar',
        'sispann rele m', 'sispann rele mwen', 'sispann kontakte m', 'sispann kontakte mwen', 'lèt pou sispann', 'let pou sispann'],
      pistas: ['dejar', 'parar', 'basta', 'stop', 'cease', 'parar', 'sispann', 'escrito', 'writing', 'escrita', 'ekri', 'carta', 'letter', 'let'],
      es: ['Puedes avisarle por escrito al cobrador que quieres que deje de contactarte, o que te niegas a pagar la deuda. Desde que lo recibe (si lo mandas por correo, cuenta desde que llega), solo puede escribirte para decirte que termina sus gestiones o para avisarte que él o el acreedor pueden tomar medidas específicas de las que suelen tomar. Dos cosas que conviene saber: dejar de contactarte no borra la deuda, y el acreedor puede seguir por otras vías. En Herramientas hay una carta de cese de comunicación para preparar.'],
      en: ['You can notify the collector in writing that you want it to stop contacting you, or that you refuse to pay the debt. From when it receives it (if you mail it, that\'s when it arrives), the collector can only write to tell you it\'s ending its efforts, or to notify you that it or the creditor may take specific actions they ordinarily take. Two things worth knowing: stopping contact doesn\'t erase the debt, and the creditor may proceed by other routes. There\'s a cease-communication letter you can prepare in Tools.'],
      pt: ['Você pode avisar o cobrador por escrito que quer que ele pare de te contatar, ou que se recusa a pagar a dívida. A partir do momento em que ele recebe (se você enviar pelo correio, conta desde a chegada), o cobrador só pode escrever para dizer que está encerrando as tentativas ou para avisar que ele ou o credor podem tomar medidas específicas, das que costumam tomar. Duas coisas importantes: parar o contato não apaga a dívida, e o credor pode seguir por outros caminhos. Em Ferramentas há uma carta de cessação de contato para preparar.'],
      ht: ['Ou ka avèti kolektè a alekri ou vle l sispann kontakte w, oswa ou refize peye dèt la. Depi li resevwa l (si w voye l pa lapòs, sa konte depi l rive), kolektè a ka ekri w sèlman pou di w li fini ak efò li yo, oswa pou avèti w li menm oswa kreditè a ka pran mezi espesifik yo abitye pran. De bagay ki bon pou konnen: sispann kontak la pa efase dèt la, epi kreditè a ka kontinye pa lòt chemen. Gen yon lèt pou sispann kominikasyon ou ka prepare nan Zouti yo.'],
      enlace: L('herramientas.html#carta-cese-comunicacion', 'Preparar mi carta →'),
      enlaceEtiqueta: { en: 'Prepare my letter →', pt: 'Preparar minha carta →', ht: 'Prepare lèt mwen an →' }
    },
    {
      id: 'fdcpa_acoso',
      ley: 'FDCPA',
      cita: '§ 806 · 15 U.S.C. § 1692d',
      prioridad: 2,
      claves: ['me insultan', 'me insulto', 'me gritan', 'me grito', 'me amenazan con', 'lenguaje obsceno', 'malas palabras',
        'llaman sin parar', 'llaman todos los dias', 'llaman muchas veces', 'llamadas repetidas', 'llamadas constantes',
        'publicar una lista', 'lista de deudores', 'sin identificarse', 'no se identifican', 'colgaron sin decir', 'llamada sin identificar',
        'repeated calls', 'calls all day', 'calling nonstop', 'calling constantly', 'obscene language', 'they yell', 'yelled at me',
        'threatened me', 'harassment', 'harassing', 'abusive language', 'list of debtors', 'nao se identificam', 'ligacoes repetidas',
        'ligam o tempo todo', 'ligam sem parar', 'me xingam', 'me ameacam', 'linguagem ofensiva',
        'rele san rete', 'rele tout tan', 'rele tout jou', 'rele anpil fwa', 'yo joure m', 'yo joure mwen', 'yo menase m', 'yo menase mwen',
        'lang ki ofansan', 'anmède m', 'anmede m', 'anmède mwen', 'anmede mwen'],
      pistas: ['amenazas', 'violencia', 'acoso', 'acosan', 'abuso', 'threats', 'violence', 'abuse', 'ameacas', 'assedio', 'arasman', 'menas',
        'llamadas', 'calls', 'ligacoes', 'apel', 'apèl', 'rele'],
      es: ['La ley federal no permite que un cobrador acose, oprima o abuse de nadie al cobrar. Eso incluye: amenazar con violencia o con dañar tu persona, tu reputación o tus bienes; usar lenguaje obsceno o abusivo; publicar listas de quienes «no pagan» (salvo a agencias de reportes de crédito); hacer sonar el teléfono repetida o continuamente para molestar; y llamar sin identificarse de verdad. Si algo así te pasó, guarda fecha, hora, nombre y qué dijeron; se puede presentar una queja ante la CFPB o la FTC.'],
      en: ['Federal law doesn\'t allow a collector to harass, oppress or abuse anyone while collecting. That includes: threatening violence or harm to your person, reputation or property; using obscene or abusive language; publishing lists of people who supposedly «don\'t pay» (except to credit reporting agencies); making the phone ring repeatedly or continuously to annoy; and calling without truly identifying who is calling. If something like that happened to you, keep the date, time, name and what they said; a complaint can be filed with the CFPB or the FTC.'],
      pt: ['A lei federal não permite que um cobrador assedie, oprima ou abuse de ninguém ao cobrar. Isso inclui: ameaçar com violência ou dano à sua pessoa, reputação ou bens; usar linguagem obscena ou abusiva; publicar listas de quem supostamente «não paga» (exceto para agências de relatórios de crédito); fazer o telefone tocar repetida ou continuamente para incomodar; e ligar sem se identificar de verdade. Se algo assim aconteceu, guarde data, hora, nome e o que disseram; dá para registrar uma reclamação na CFPB ou na FTC.'],
      ht: ['Lwa federal la pa pèmèt yon kolektè anmède, oprime oswa abize pèsonn lè l ap kolekte. Sa gen ladan l: menase ak vyolans oswa ak fè mal a pèsonn ou, repitasyon w oswa byen ou; sèvi ak lang obsèn oswa abizif; pibliye lis moun ki swadizan «pa peye» (eksepte bay ajans rapò kredi); fè telefòn nan sonnen plizyè fwa oswa san rete pou anmède; ak rele san idantifye tèt li vre. Si yon bagay konsa te rive w, kenbe dat, lè, non ak sa yo te di; ou ka depoze yon plent bay CFPB oswa FTC.']
    },
    {
      id: 'fdcpa_mentiras',
      ley: 'FDCPA',
      cita: '§ 807 · 15 U.S.C. § 1692e',
      prioridad: 2,
      claves: ['se hacen pasar por abogado', 'dicen que son abogados', 'dicen que son del gobierno', 'se hacen pasar por',
        'papel que parece de la corte', 'documento falso', 'me amenazan con embargo', 'me amenazan con arresto',
        'amenaza con embargar', 'monto falso', 'no me dijeron que era cobranza', 'mini miranda', 'pretend to be a lawyer',
        'pretending to be an attorney', 'pretend to be government', 'threaten to garnish', 'threatening to garnish',
        'fake court', 'looks like a court', 'false amount', 'misleading', 'deceptive', 'finge ser advogado', 'fingem ser advogados',
        'dizem que sao do governo', 'ameacam penhorar', 'papel falso', 'yo fè kwè yo se avoka', 'yo di yo se avoka',
        'yo di se gouvènman', 'yo di se gouvenman', 'papye ki sanble ak tribinal', 'yo menase saisi', 'yo menase pran salè'],
      pistas: ['mienten', 'mentira', 'falso', 'engano', 'lie', 'lying', 'false', 'fake', 'mentem', 'mentira', 'falso', 'manti', 'twonpe',
        'abogado', 'attorney', 'lawyer', 'advogado', 'avoka', 'embargo', 'garnish', 'penhora', 'saisi'],
      es: ['El cobrador no puede usar información falsa o engañosa. Por ejemplo: decir que es del gobierno, hacerse pasar por abogado, inventar el monto o el estado legal de la deuda, amenazar con arresto o con embargar tu salario o bienes si eso no se puede hacer legalmente o no piensa hacerlo, usar papeles que parecen de una corte, o cobrar bajo un nombre que no es el de su empresa. En su primera comunicación debe decir que está tratando de cobrar una deuda y que lo que averigüe se usará para eso, y en las siguientes debe decir que es un cobrador. Si algo de esto te pasó, guárdalo con fecha; se puede quejar ante la CFPB o la FTC.'],
      en: ['A collector can\'t use false or misleading information. For example: claiming to be from the government, posing as an attorney, making up the amount or legal status of the debt, threatening arrest or garnishment or seizure of your wages or property when that can\'t lawfully be done or isn\'t intended, using papers that look like they come from a court, or collecting under a name other than its true business name. In its first communication it must say it is trying to collect a debt and that any information obtained will be used for that purpose, and in later ones that it is a debt collector. If any of this happened to you, keep it with the date; a complaint can go to the CFPB or the FTC.'],
      pt: ['O cobrador não pode usar informação falsa ou enganosa. Por exemplo: dizer que é do governo, se passar por advogado, inventar o valor ou a situação legal da dívida, ameaçar com prisão ou penhora do seu salário ou bens quando isso não pode ser feito legalmente ou não é a intenção, usar papéis que parecem de um tribunal, ou cobrar com um nome que não é o da sua empresa. Na primeira comunicação, deve dizer que está tentando cobrar uma dívida e que a informação obtida será usada para isso; nas seguintes, deve dizer que é cobrador. Se algo assim aconteceu, guarde com a data; dá para reclamar na CFPB ou na FTC.'],
      ht: ['Kolektè a pa ka sèvi ak enfòmasyon ki fo oswa ki twonpe. Pa egzanp: di li se nan gouvènman an, pase pou yon avoka, envante montan an oswa sitiyasyon legal dèt la, menase ak arestasyon oswa ak saizi salè w oswa byen ou lè sa pa ka fèt legalman oswa li pa gen entansyon fè l, itilize papye ki sanble ak yo soti nan yon tribinal, oswa kolekte anba yon non ki pa non vre konpayi li. Nan premye kominikasyon li, li dwe di l ap eseye kolekte yon dèt epi tout enfòmasyon li jwenn ap sèvi pou sa; nan lòt yo, li dwe di li se yon kolektè. Si yon bagay konsa te rive w, kenbe l ak dat la; ou ka fè plent bay CFPB oswa FTC.']
    },
    {
      id: 'fdcpa_cargos',
      ley: 'FDCPA',
      cita: '§ 808 · 15 U.S.C. § 1692f',
      prioridad: 2,
      claves: ['cargos extra', 'cobran de mas', 'me cobran de mas', 'cargo que no estaba en el contrato', 'intereses de mas',
        'cheque posfechado', 'cheques posfechados', 'cheque a futuro', 'llamada por cobrar', 'llamadas por cobrar',
        'postdated check', 'post dated check', 'postdated checks', 'collect call', 'extra fees', 'added fees', 'fees not in the contract',
        'charging too much', 'cheque pre datado', 'cheques pre datados', 'taxas extras', 'cobram a mais', 'chèk pòs date', 'chek pos date',
        'yo chaje m twòp', 'yo chaje m twop', 'frè siplemantè', 'fre siplemante', 'frè ki pa nan kontra a'],
      pistas: ['cargos', 'fees', 'taxas', 'frè', 'intereses', 'interest', 'juros', 'enterè', 'contrato', 'contract', 'kontra', 'cheque', 'check'],
      es: ['El cobrador solo puede cobrar montos —incluidos intereses, cargos y gastos— que autorice el contrato original o que permita la ley. Tampoco puede: aceptar un cheque posfechado con más de 5 días de adelanto sin avisarte por escrito cuándo lo va a depositar (entre 3 y 10 días hábiles antes), depositar un cheque posfechado antes de su fecha, hacerte pagar por llamadas por cobrar u otros cargos por ocultar el propósito de la comunicación, escribirte por postal ni poner en el sobre nada más que su dirección (o un nombre de empresa que no delate que es cobranza). Si ves un cargo que no reconoces, puedes pedir por escrito el desglose.'],
      en: ['A collector may only collect amounts —including interest, fees and expenses— that the original agreement authorizes or that the law permits. It also can\'t: accept a check postdated by more than 5 days without notifying you in writing when it will deposit it (between 3 and 10 business days beforehand), deposit a postdated check before its date, make you pay for collect calls or other charges by hiding the purpose of the communication, write to you by postcard, or put anything on the envelope other than its address (or a business name that doesn\'t reveal it\'s collection). If you see a charge you don\'t recognize, you can ask in writing for the breakdown.'],
      pt: ['O cobrador só pode cobrar valores — inclusive juros, taxas e despesas — que o contrato original autorize ou que a lei permita. Também não pode: aceitar cheque pré-datado com mais de 5 dias de antecedência sem te avisar por escrito quando vai depositar (entre 3 e 10 dias úteis antes), depositar cheque pré-datado antes da data, te fazer pagar por ligações a cobrar ou outras cobranças escondendo a finalidade da comunicação, escrever por cartão-postal, nem colocar no envelope nada além do endereço (ou um nome de empresa que não revele que é cobrança). Se vir uma cobrança que não reconhece, dá para pedir o detalhamento por escrito.'],
      ht: ['Kolektè a ka kolekte sèlman montan —ansanm ak enterè, frè ak depans— kontra orijinal la otorize oswa lwa a pèmèt. Li pa ka: aksepte yon chèk pòs-date ki gen plis pase 5 jou davans san l pa avèti w alekri kilè l pral depoze l (ant 3 ak 10 jou ouvrab anvan), depoze yon chèk pòs-date anvan dat li, fè w peye pou apèl kolekte oswa lòt chaj lè l kache rezon kominikasyon an, ekri w sou kat postal, ni mete sou anvlòp la anyen si se pa adrès li (oswa yon non konpayi ki pa montre se koleksyon). Si w wè yon chaj ou pa rekonèt, ou ka mande detay li alekri.']
    },
    {
      id: 'fdcpa_validacion',
      ley: 'FDCPA',
      cita: '§ 809 · 15 U.S.C. § 1692g',
      prioridad: 3,
      claves: ['dispute a collection', 'dispute collection', 'dispute a collector', 'disputar cobranza', 'disputar una cobranza',
        'disputar uma cobranca', 'kontèste koleksyon', 'validar la deuda', 'validacion de deuda', 'validacion de la deuda', 'validen la deuda', 'que me validen', 'pedir validacion',
        'verificar la deuda', 'verificacion de deuda', 'disputar una deuda', 'disputar la deuda', 'disputar deuda', 'no reconozco esta deuda',
        'no es mi deuda', 'esta deuda no es mia', 'treinta dias', '30 dias', 'aviso de validacion', 'debt validation', 'validate the debt',
        'validate this debt', 'validation notice', 'validation letter', 'verify the debt', 'dispute the debt', 'dispute a debt',
        'dispute this debt', 'not my debt', 'i don t recognize this debt', 'i do not recognize this debt', '30 days', 'thirty days', 'validacao da divida',
        'validar a divida', 'validem a divida', 'contestar a divida', 'disputar a divida', 'nao e minha divida', 'nao reconheco essa divida',
        '30 dias', 'valide dèt la', 'valide det la', 'validasyon dèt', 'validasyon det', 'kontèste dèt la', 'konteste det la',
        'dèt sa a pa pou mwen', 'det sa a pa pou mwen', 'mwen pa rekonèt dèt sa', 'mwen pa rekonet det sa', '30 jou', 'trant jou'],
      pistas: ['validar', 'validacion', 'disputar', 'verificar', 'validate', 'validation', 'dispute', 'verify', 'validacao', 'contestar',
        'valide', 'kontèste', 'konteste', 'cobrador', 'collector', 'cobranza', 'deuda'],
      es: ['Dentro de los 5 días siguientes a su primer contacto, el cobrador debe mandarte por escrito el monto de la deuda, el nombre del acreedor y tus derechos (salvo que ya vengan en ese primer contacto). Tienes 30 días desde que recibes ese aviso para disputar la deuda. Si la disputas por escrito dentro de ese plazo, el cobrador debe dejar de cobrar —esa deuda o la parte disputada— hasta mandarte una verificación o copia de una sentencia. También puedes pedir por escrito el nombre y la dirección del acreedor original. Mientras no disputes por escrito, pueden seguir cobrando durante esos 30 días, pero sin contradecir ese derecho. Y no disputar a tiempo no puede tomarse en un tribunal como admitir que debes.'],
      en: ['Within 5 days after its first contact, the collector must send you in writing the amount of the debt, the creditor\'s name and your rights (unless they were already in that first contact). You have 30 days from receiving that notice to dispute the debt. If you dispute it in writing within that period, the collector must stop collecting —that debt or the disputed part— until it sends you verification or a copy of a judgment. You can also ask in writing for the original creditor\'s name and address. While you haven\'t disputed in writing, collection may continue during those 30 days, but not in a way that overshadows that right. And not disputing in time can\'t be treated by a court as admitting you owe it.'],
      pt: ['Dentro de 5 dias após o primeiro contato, o cobrador deve te enviar por escrito o valor da dívida, o nome do credor e seus direitos (a menos que já estivessem no primeiro contato). Você tem 30 dias, a partir do recebimento desse aviso, para contestar a dívida. Se contestar por escrito nesse prazo, o cobrador deve parar de cobrar — essa dívida ou a parte contestada — até te enviar uma verificação ou cópia de uma sentença. Você também pode pedir por escrito o nome e o endereço do credor original. Enquanto você não contestar por escrito, a cobrança pode continuar nesses 30 dias, mas sem contradizer esse direito. E não contestar a tempo não pode ser tratado por um tribunal como admissão de que você deve.'],
      ht: ['Nan 5 jou apre premye kontak li, kolektè a dwe voye ba w alekri montan dèt la, non kreditè a ak dwa ou (sof si yo te deja nan premye kontak la). Ou gen 30 jou depi w resevwa avi sa a pou kontèste dèt la. Si w kontèste l alekri nan delè sa a, kolektè a dwe sispann kolekte —dèt sa a oswa pati ou kontèste a— jiskaske l voye ba w yon verifikasyon oswa yon kopi yon jijman. Ou ka mande tou alekri non ak adrès kreditè orijinal la. Toutotan ou pa kontèste alekri, yo ka kontinye kolekte pandan 30 jou sa yo, men san yo pa kontredi dwa sa a. Epi si w pa kontèste a tan, yon tribinal pa ka konsidere sa kòm yon admisyon ou dwe.'],
      enlace: L('herramientas.html', 'Preparar mi carta →'),
      enlaceEtiqueta: { en: 'Prepare my letter →', pt: 'Preparar minha carta →', ht: 'Prepare lèt mwen an →' }
    },
    {
      id: 'fdcpa_pagos',
      ley: 'FDCPA',
      cita: '§ 810 · 15 U.S.C. § 1692h',
      prioridad: 2,
      claves: ['varias deudas', 'debo varias cuentas', 'aplicar mi pago', 'aplicar el pago', 'a cual deuda se aplica', 'a que deuda se aplica',
        'pago a una deuda', 'multiple debts', 'several debts', 'apply my payment', 'apply the payment', 'which debt does my payment',
        'varias dividas', 'aplicar meu pagamento', 'aplicar o pagamento', 'plizyè dèt', 'plizye det', 'aplike peman an', 'aplike peman mwen'],
      pistas: ['pago', 'payment', 'pagamento', 'peman', 'disputa', 'dispute', 'disputada', 'kontèste'],
      es: ['Si le debes varias cuentas al mismo cobrador y haces un solo pago, la ley no le permite aplicarlo a una deuda que estás disputando. Y cuando corresponda, debe aplicarlo según tus instrucciones. Por eso ayuda decir por escrito a qué cuenta va cada pago.'],
      en: ['If you owe several accounts to the same collector and make a single payment, the law doesn\'t let it apply that payment to a debt you\'re disputing. And where applicable, it must apply it according to your directions. That\'s why it helps to say in writing which account each payment goes to.'],
      pt: ['Se você deve várias contas ao mesmo cobrador e faz um único pagamento, a lei não permite que ele o aplique a uma dívida que você está contestando. E, quando cabível, deve aplicá-lo conforme suas instruções. Por isso ajuda dizer por escrito a qual conta vai cada pagamento.'],
      ht: ['Si w dwe menm kolektè a plizyè kont epi w fè yon sèl peman, lwa a pa pèmèt li aplike l sou yon dèt ou ap kontèste. Epi lè sa aplike, li dwe aplike l dapre enstriksyon w yo. Se poutèt sa li itil pou di alekri sou ki kont chak peman ale.']
    },
    {
      id: 'fdcpa_demanda',
      ley: 'FDCPA',
      cita: '§ 811 · 15 U.S.C. § 1692i',
      prioridad: 2,
      claves: ['donde me pueden demandar', 'en que corte me pueden demandar', 'me demandaron en otro estado', 'me demandan en otro estado',
        'lejos de donde vivo', 'where can they sue me', 'where can a collector sue', 'sued me in another state', 'sued in another county',
        'venue', 'onde podem me processar', 'me processaram em outro estado', 'kote yo ka mennen m nan tribinal',
        'yo mennen mwen nan tribinal nan yon lòt eta', 'yo mennen mwen nan tribinal nan yon lot eta'],
      pistas: ['demandar', 'demandaron', 'corte', 'sue', 'sued', 'court', 'processar', 'tribunal', 'tribinal', 'mennen'],
      es: ['Un cobrador que te demanda por una deuda solo puede hacerlo en el distrito judicial donde firmaste el contrato o donde vives al momento de comenzar la demanda. Si la demanda es para hacer valer un derecho sobre una propiedad que garantiza la deuda, solo puede hacerse donde esa propiedad está. Ojo: una citación de corte no es una carta de cobro; trae un plazo corto para responder y no responder suele ser peor. LawHelp.org tiene ayuda legal gratuita en los 50 estados, y en muchos procesos tienes derecho a intérprete sin costo.'],
      en: ['A collector that sues you over a debt may only do so in the judicial district where you signed the contract or where you live when the suit begins. If the suit is to enforce a right in property that secures the debt, it can only be brought where that property is located. Note: a court summons isn\'t a collection letter; it carries a short deadline to respond and not responding is usually worse. LawHelp.org has free legal help in all 50 states, and in many proceedings you have the right to an interpreter at no cost.'],
      pt: ['Um cobrador que processa você por uma dívida só pode fazê-lo no distrito judicial onde você assinou o contrato ou onde mora quando o processo começa. Se a ação é para fazer valer um direito sobre um bem que garante a dívida, só pode ser proposta onde esse bem está. Atenção: uma intimação do tribunal não é uma carta de cobrança; tem prazo curto para responder e não responder costuma ser pior. O LawHelp.org tem ajuda jurídica gratuita nos 50 estados, e em muitos processos você tem direito a intérprete sem custo.'],
      ht: ['Yon kolektè ki mennen w nan tribinal pou yon dèt ka fè sa sèlman nan distri jidisyè kote w te siyen kontra a oswa kote w rete lè pwosè a kòmanse. Si pwosè a se pou fè valè yon dwa sou yon pwopriyete ki garanti dèt la, li ka fèt sèlman kote pwopriyete a ye. Atansyon: yon konvokasyon tribinal se pa yon lèt koleksyon; li gen yon ti delè pou reponn epi pa reponn anjeneral pi mal. LawHelp.org gen èd legal gratis nan 50 eta yo, epi nan anpil pwosedi ou gen dwa a yon entèprèt gratis.']
    },
    {
      id: 'fdcpa_derechos',
      ley: 'FDCPA',
      cita: '§ 813–814 · 15 U.S.C. §§ 1692k, 1692l',
      prioridad: 3,
      claves: ['puedo demandar', 'can i sue', 'posso processar', 'mwen ka mennen', 'puedo demandar al cobrador', 'demandar a un cobrador', 'demandar a la agencia de cobranza', 'cuanto puedo recibir',
        'daños y perjuicios', 'donde me quejo', 'donde presento una queja', 'quejarme del cobrador', 'reportar a un cobrador',
        'reportar al cobrador', 'sue a debt collector', 'sue the collector', 'sue a collector', 'damages under the fdcpa',
        'report a debt collector', 'complain about a collector', 'file a complaint about a collector', 'one year to sue',
        'processar o cobrador', 'processar um cobrador', 'reclamar do cobrador', 'denunciar cobrador', 'mennen kolektè a nan tribinal',
        'plent kont kolektè', 'fè plent kont kolektè', 'pote plent kont kolektè'],
      pistas: ['demandar', 'queja', 'reportar', 'denuncia', 'sue', 'complaint', 'report', 'processar', 'reclamar', 'plent', 'ftc', 'cfpb'],
      es: ['Si un cobrador incumple la FDCPA, la ley dice que responde por tus daños reales, más los daños adicionales que decida el tribunal —hasta $1,000 en una demanda individual— y, si ganas, los costos y honorarios razonables de abogado. El plazo para demandar es de 1 año desde la violación. Si un tribunal concluye que la demanda se hizo de mala fe y para acosar, puede ordenar pagar los honorarios del cobrador. El cobrador puede defenderse mostrando que fue un error genuino a pesar de tener procedimientos razonables. También se puede presentar una queja ante la CFPB o la FTC, que hacen cumplir la ley. Si conviene o no demandar es una decisión para un abogado; LawHelp.org tiene ayuda legal gratuita.'],
      en: ['If a collector violates the FDCPA, the law says it is liable for your actual damages, plus additional damages the court allows —up to $1,000 in an individual action— and, if you win, court costs and reasonable attorney\'s fees. The deadline to sue is 1 year from the violation. If a court finds the suit was brought in bad faith to harass, it may order you to pay the collector\'s fees. A collector can defend itself by showing the violation was an unintentional bona fide error despite reasonable procedures. A complaint can also be filed with the CFPB or the FTC, which enforce the law. Whether to sue is a decision for an attorney; LawHelp.org has free legal help.'],
      pt: ['Se um cobrador descumpre a FDCPA, a lei diz que ele responde pelos seus danos reais, mais danos adicionais que o tribunal decidir — até $1,000 em ação individual — e, se você ganhar, pelas custas e honorários razoáveis de advogado. O prazo para processar é de 1 ano a partir da violação. Se um tribunal concluir que a ação foi de má-fé e para assediar, pode mandar você pagar os honorários do cobrador. O cobrador pode se defender mostrando que foi um erro genuíno apesar de ter procedimentos razoáveis. Também dá para registrar reclamação na CFPB ou na FTC, que fazem cumprir a lei. Se vale processar ou não é decisão para um advogado; o LawHelp.org tem ajuda jurídica gratuita.'],
      ht: ['Si yon kolektè vyole FDCPA, lwa a di li reponn pou domaj reyèl ou yo, plis domaj adisyonèl tribinal la deside —jiska $1,000 nan yon pwosè endividyèl— epi, si w genyen, pou depans tribinal ak onorè avoka rezonab. Delè pou fè pwosè a se 1 ane apre vyolasyon an. Si yon tribinal konkli pwosè a te fèt ak move lafwa pou anmède, li ka òdone w peye onorè kolektè a. Kolektè a ka defann tèt li lè l montre se te yon erè san entansyon malgre l te gen pwosedi rezonab. Ou ka fè yon plent tou bay CFPB oswa FTC, ki fè lwa a respekte. Si sa vo lapenn pou fè pwosè oswa non se yon desizyon pou yon avoka; LawHelp.org gen èd legal gratis.']
    },

    /* ============================ FCRA ============================ */
    {
      id: 'fcra_general',
      ley: 'FCRA',
      cita: '§ 601–602 · 15 U.S.C. § 1681',
      prioridad: 2,
      claves: ['fcra', 'fair credit reporting', 'ley de reportes de credito', 'ley de reporte de credito', 'ley de credito', 'credit reporting act',
        'credit reporting law', 'lei de relatorios de credito', 'lei do relatorio de credito', 'lwa rapo kredi', 'lwa sou rapo kredi',
        'agencia de reportes de credito', 'credit reporting agency', 'credit bureau', 'buro de credito', 'agencia de relatorios de credito',
        'ajans rapo kredi', 'biwo kredi'],
      pistas: ['ley', 'law', 'lei', 'lwa', 'federal', 'equifax', 'experian', 'transunion', 'reporte', 'report', 'relatorio', 'rapo'],
      es: ['La FCRA es la ley federal de reportes de crédito (15 U.S.C. § 1681 y siguientes). Su propósito es que las agencias de reportes de crédito manejen tu información con exactitud, justicia y respeto a tu privacidad. Tengo el texto federal completo (revisión de mayo de 2023). Pregúntame, por ejemplo: cuánto tiempo puede salir algo negativo, cómo disputar un error, cuándo el reporte es gratis, quién puede ver tu reporte, qué hacer ante un robo de identidad o qué te deben decir si te niegan un crédito.'],
      en: ['The FCRA is the federal credit reporting law (15 U.S.C. § 1681 and following). Its purpose is for credit reporting agencies to handle your information with accuracy, fairness and respect for your privacy. I have the full federal text (May 2023 revision). Ask me, for example: how long negative items can stay, how to dispute an error, when the report is free, who can see your report, what to do about identity theft, or what you must be told if you\'re denied credit.'],
      pt: ['A FCRA é a lei federal de relatórios de crédito (15 U.S.C. § 1681 e seguintes). Seu propósito é que as agências de relatórios de crédito tratem suas informações com exatidão, justiça e respeito à sua privacidade. Tenho o texto federal completo (revisão de maio de 2023). Pergunte, por exemplo: por quanto tempo um item negativo pode aparecer, como contestar um erro, quando o relatório é grátis, quem pode ver seu relatório, o que fazer em caso de roubo de identidade ou o que devem te informar se negarem um crédito.'],
      ht: ['FCRA se lwa federal sou rapò kredi (15 U.S.C. § 1681 ak sa ki vin apre yo). Objektif li se pou ajans rapò kredi yo trete enfòmasyon w ak egzaktitid, jistis ak respè pou lavi prive w. Mwen gen tèks federal la an antye (revizyon mwa me 2023). Mande m, pa egzanp: konbyen tan yon bagay negatif ka rete, kijan pou kontèste yon erè, kilè rapò a gratis, ki moun ki ka wè rapò w, kisa pou fè si yo vòlè idantite w, oswa sa yo dwe di w si yo refize w kredi.'],
      enlace: L('credito.html', 'Ver crédito →'),
      enlaceEtiqueta: { en: 'See credit →', pt: 'Ver crédito →', ht: 'Gade kredi →' }
    },
    {
      id: 'fcra_contenido',
      ley: 'FCRA',
      cita: '§ 609 · 15 U.S.C. § 1681g',
      prioridad: 2,
      claves: ['que hay en mi archivo', 'que contiene mi reporte', 'que trae mi reporte', 'quien pidio mi reporte', 'quien consulto mi credito',
        'quien ha visto mi reporte', 'quien vio mi credito', 'fuentes de la informacion', 'consultas en mi reporte', 'ocultar mi seguro social',
        'ocultar los primeros digitos', 'what is in my file', 'what is in my credit file', 'who pulled my credit', 'who checked my credit',
        'who requested my report', 'who has seen my report', 'inquiries on my report', 'sources of the information', 'truncate my ssn',
        'o que tem no meu arquivo', 'quem consultou meu credito', 'quem pediu meu relatorio', 'consultas no meu relatorio',
        'kisa ki nan dosye m', 'kisa ki nan dosye mwen', 'ki moun ki mande rapo m', 'ki moun ki mande rapo mwen',
        'ki moun ki gade kredi m', 'ki moun ki gade kredi mwen'],
      pistas: ['archivo', 'file', 'arquivo', 'dosye', 'consultas', 'inquiries', 'consultas', 'fuentes', 'sources', 'fontes', 'sous'],
      es: ['Si lo pides, la agencia de reportes debe mostrarte toda la información de tu archivo y las fuentes de donde salió. También debe decirte quién pidió tu reporte: en los últimos 2 años si fue por un trabajo, y en el último año para cualquier otro fin. Debe incluir un registro de las consultas del último año hechas por crédito o seguro que tú no iniciaste. Puedes pedir que en lo que te entreguen se oculten los primeros 5 dígitos de tu número de seguro social. Si pides el archivo sin el puntaje, debe avisarte que puedes pedir el puntaje aparte.'],
      en: ['If you ask, the reporting agency must show you all the information in your file and the sources it came from. It must also tell you who requested your report: within the past 2 years if it was for employment, and within the past year for any other purpose. It must include a record of inquiries from the past year for credit or insurance transactions you didn\'t initiate. You can ask that the first 5 digits of your Social Security number be left out of what they give you. If you ask for the file without the score, it must tell you that you can request the score separately.'],
      pt: ['Se você pedir, a agência de relatórios deve te mostrar todas as informações do seu arquivo e as fontes de onde vieram. Também deve dizer quem pediu seu relatório: nos últimos 2 anos, se foi para emprego, e no último ano, para qualquer outra finalidade. Deve incluir um registro das consultas do último ano feitas por crédito ou seguro que você não iniciou. Você pode pedir que os primeiros 5 dígitos do seu número de seguro social sejam omitidos do que te entregarem. Se você pedir o arquivo sem a pontuação, ela deve avisar que você pode pedir a pontuação separadamente.'],
      ht: ['Si w mande, ajans rapò kredi a dwe montre w tout enfòmasyon ki nan dosye w la ak sous kote yo soti. Li dwe di w tou ki moun ki te mande rapò w: nan 2 dènye ane yo si se te pou yon travay, epi nan dènye ane a pou nenpòt lòt rezon. Li dwe enkli yon dosye konsiltasyon dènye ane a ki fèt pou kredi oswa asirans ou pa t inisye. Ou ka mande pou 5 premye chif nimewo sekirite sosyal ou yo pa parèt nan sa yo ba w. Si w mande dosye a san nòt la, li dwe di w ou ka mande nòt la separeman.']
    },
    {
      id: 'fcra_quien_ve',
      ley: 'FCRA',
      cita: '§ 604(a) · 15 U.S.C. § 1681b(a)',
      prioridad: 2,
      claves: ['quien puede ver mi reporte', 'quien puede ver mi credito', 'quien puede pedir mi reporte', 'quien puede consultar mi credito',
        'pueden ver mi credito', 'pueden revisar mi credito', 'sin mi permiso', 'sin mi autorizacion', 'propietario ver mi credito',
        'casero ver mi credito', 'motivos permitidos', 'permissible purpose', 'who can see my credit', 'who can pull my credit',
        'who can access my credit', 'who can view my report', 'without my permission', 'without my consent', 'landlord check my credit',
        'quem pode ver meu credito', 'quem pode consultar meu credito', 'sem minha permissao', 'sem minha autorizacao',
        'ki moun ki ka wè kredi m', 'ki moun ki ka we kredi m', 'ki moun ki ka gade kredi mwen', 'san pèmisyon m', 'san pemisyon m',
        'san pèmisyon mwen', 'san pemisyon mwen'],
      pistas: ['permiso', 'autorizacion', 'permission', 'consent', 'permissao', 'pèmisyon', 'pemisyon', 'landlord', 'propietario', 'casero',
        'ver', 'pueden', 'consultar'],
      es: ['La agencia de reportes solo puede entregar tu reporte por los motivos que enumera la ley, «y ningún otro». Entre ellos: una orden judicial; tu instrucción por escrito; alguien que lo usa para darte crédito o para revisar o cobrar una cuenta tuya; para un empleo; para asegurarte; para ciertos permisos o beneficios del gobierno; o una necesidad legítima de negocio en una transacción que tú iniciaste o para revisar si sigues cumpliendo las condiciones de una cuenta. Fuera de esos casos no puede dárselo a nadie. Y si alguien lo obtiene con pretextos falsos o sin un motivo permitido, puede tener que responder por ello.'],
      en: ['The reporting agency may only hand over your report for the reasons the law lists, «and no other». Among them: a court order; your written instruction; someone using it to extend you credit or to review or collect one of your accounts; for employment; for insurance underwriting; for certain government licenses or benefits; or a legitimate business need in a transaction you initiated or to review whether you still meet an account\'s terms. Outside those cases it can\'t give it to anyone. And someone who obtains it under false pretenses or without a permitted purpose may be held liable.'],
      pt: ['A agência de relatórios só pode entregar seu relatório pelos motivos que a lei enumera, «e nenhum outro». Entre eles: ordem judicial; sua instrução por escrito; alguém que o use para te conceder crédito ou para revisar ou cobrar uma conta sua; para emprego; para seguro; para certas licenças ou benefícios do governo; ou uma necessidade legítima de negócio numa transação que você iniciou ou para revisar se você continua cumprindo as condições de uma conta. Fora desses casos, não pode entregá-lo a ninguém. E quem o obtém com pretextos falsos ou sem um motivo permitido pode ter que responder por isso.'],
      ht: ['Ajans rapò kredi a ka bay rapò w sèlman pou rezon lwa a site yo, «epi okenn lòt». Pami yo: yon lòd tribinal; enstriksyon alekri ou; yon moun ki itilize l pou ba w kredi oswa pou revize oswa kolekte yon kont ou; pou yon travay; pou asirans; pou sèten lisans oswa benefis gouvènman; oswa yon vrè bezwen biznis nan yon tranzaksyon ou te inisye oswa pou verifye si w toujou respekte kondisyon yon kont. Deyò ka sa yo, li pa ka bay li bay pèsonn. Epi yon moun ki jwenn li ak fo pretèks oswa san yon rezon ki pèmèt ka gen pou reponn pou sa.']
    },
    {
      id: 'fcra_plazos',
      ley: 'FCRA',
      cita: '§ 605(a)–(c) · 15 U.S.C. § 1681c',
      prioridad: 3,
      claves: ['cuantos anos', 'cuanto tiempo sale', 'cuanto tiempo dura', 'cuanto tiempo permanece', 'cuando sale de mi reporte',
        'cuando se borra', 'cuando desaparece', 'siete anos', '7 anos', 'diez anos', '10 anos', 'quiebra', 'bancarrota',
        'capitulo 7', 'capitulo 13', 'cuentas en cobranza', 'gravamen de impuestos', 'how long does it stay', 'how long can it stay',
        'how long will it stay', 'how long do collections', 'how long does a', 'when does it fall off', 'fall off my report',
        'drop off my report', 'seven years', '7 years', 'ten years', '10 years', 'bankruptcy', 'chapter 7', 'chapter 13', 'tax lien',
        'por quanto tempo', 'quanto tempo fica', 'quantos anos', 'sete anos', 'dez anos', 'falencia', 'quanto tan', 'konbyen tan',
        'konbyen tan li rete', 'konbyen ane', 'sèt ane', 'set ane', 'dis ane', 'fayit', 'bankrout', 'bankwout'],
      pistas: ['anos', 'years', 'anos', 'ane', 'negativo', 'negative', 'negativa', 'negatif', 'reporte', 'report', 'relatorio', 'rapo',
        'cobranza', 'collection', 'cobranca', 'koleksyon', 'borrar', 'remove', 'sale', 'salir', 'stay', 'rete'],
      es: ['La regla general de la FCRA: una quiebra (bancarrota) puede aparecer hasta 10 años desde la orden de protección; casi todo lo demás de tipo negativo, hasta 7 años. En concreto, hasta 7 años: cuentas enviadas a cobranza o dadas por pérdida, gravámenes de impuestos ya pagados (desde el pago) y cualquier otro dato adverso (salvo condenas penales). Demandas civiles, sentencias y arrestos: 7 años desde su registro o hasta que venza el plazo legal de prescripción, lo que sea más largo. Para cuentas en cobranza o dadas por pérdida, los 7 años cuentan desde 180 días después del inicio del atraso que llevó a eso. Excepciones: los límites no aplican en créditos o seguros de vida de $150,000 o más, ni en empleos con sueldo anual de $75,000 o más; y ciertos préstamos estudiantiles federales tienen plazos más largos por otras leyes. Ojo: que un dato salga del reporte no significa que la deuda desaparezca, y el plazo para que te demanden es otro reloj distinto que cambia por estado.'],
      en: ['The FCRA\'s general rule: a bankruptcy can appear up to 10 years from the order for relief; almost everything else negative, up to 7 years. Specifically, up to 7 years: accounts placed for collection or charged off, paid tax liens (from payment) and any other adverse item (except criminal convictions). Civil suits, judgments and arrest records: 7 years from entry or until the statute of limitations expires, whichever is longer. For accounts placed for collection or charged off, the 7 years run from 180 days after the start of the delinquency that led to it. Exceptions: the limits don\'t apply to credit or life insurance of $150,000 or more, or jobs paying $75,000 a year or more; and some federal student loans have longer periods under other laws. Careful: an item falling off the report doesn\'t mean the debt disappears, and the time limit for being sued is a different clock that varies by state.'],
      pt: ['A regra geral da FCRA: uma falência pode aparecer por até 10 anos a partir da ordem de proteção; quase todo o resto de tipo negativo, por até 7 anos. Especificamente, até 7 anos: contas enviadas para cobrança ou baixadas como prejuízo, penhoras fiscais já pagas (a partir do pagamento) e qualquer outro dado adverso (exceto condenações criminais). Ações civis, sentenças e prisões: 7 anos desde o registro ou até vencer o prazo de prescrição, o que for mais longo. Para contas em cobrança ou baixadas, os 7 anos contam a partir de 180 dias após o início do atraso que levou a isso. Exceções: os limites não valem para crédito ou seguro de vida de $150,000 ou mais, nem para empregos com salário anual de $75,000 ou mais; e alguns empréstimos estudantis federais têm prazos maiores por outras leis. Atenção: um item sair do relatório não significa que a dívida desapareça, e o prazo para te processarem é outro relógio, que varia por estado.'],
      ht: ['Règ jeneral FCRA: yon fayit ka parèt jiska 10 an apre òdonans pwoteksyon an; prèske tout lòt bagay negatif, jiska 7 an. An patikilye, jiska 7 an: kont yo voye nan koleksyon oswa yo pase pou pèt, gaj taks ki deja peye (depi peman an) ak nenpòt lòt done negatif (eksepte kondanasyon kriminèl). Pwosè sivil, jijman ak arestasyon: 7 an depi anrejistreman yo oswa jiskaske delè prèskripsyon an fini, selon sa ki pi long. Pou kont nan koleksyon oswa ki pase pou pèt, 7 an yo konte depi 180 jou apre kòmansman reta ki te lakòz sa a. Eksepsyon: limit yo pa aplike pou kredi oswa asirans lavi $150,000 oswa plis, ni pou travay ki peye $75,000 pa ane oswa plis; epi kèk prè etidyan federal gen delè ki pi long selon lòt lwa. Atansyon: yon done ki soti nan rapò a pa vle di dèt la disparèt, epi delè pou yo mennen w nan tribinal se yon lòt revèy ki chanje selon eta a.']
    },
    {
      id: 'fcra_medico',
      ley: 'FCRA',
      cita: '§ 605(a)(6)–(8) · 15 U.S.C. § 1681c(a)',
      prioridad: 2,
      claves: ['deuda medica en mi reporte', 'deudas medicas en mi reporte', 'cuenta medica en mi reporte', 'cuentas medicas en mi reporte',
        'deuda medica de veterano', 'deuda medica de un veterano', 'veterano deuda medica', 'medical debt on my report',
        'medical debt on my credit', 'medical collections on my credit', 'veteran medical debt', 'veterans medical debt',
        'divida medica no meu relatorio', 'divida medica de veterano', 'dèt medikal nan rapò m', 'det medikal nan rapo m',
        'dèt medikal nan rapò mwen', 'det medikal nan rapo mwen'],
      pistas: ['medica', 'medical', 'medico', 'medikal', 'veterano', 'veteran', 'veterano', 'veteran', 'hospital', 'doctor'],
      es: ['El texto federal de la FCRA que tengo dice, sobre deudas médicas, tres cosas. Primera: en los reportes no puede aparecer el nombre, dirección y teléfono de quien te dio un servicio médico si avisó a la agencia, salvo que vayan codificados de forma que no identifique al proveedor ni la naturaleza del servicio. Segunda: para las agencias nacionales, una deuda médica de un veterano no se informa antes de que pase 1 año desde el servicio. Tercera: una deuda médica de veterano ya pagada o arreglada no debe seguir como atrasada, dada por pérdida o en cobranza. Otras reglas sobre deudas médicas pueden haber cambiado después de mayo de 2023 y no las tengo cargadas.'],
      en: ['The federal FCRA text I have says three things about medical debt. First: reports can\'t show the name, address and phone of a medical provider that notified the agency of its status, unless they are restricted or coded so they don\'t identify the specific provider or the nature of the service. Second: for the nationwide agencies, a veteran\'s medical debt can\'t be reported before 1 year has passed since the service. Third: a veteran\'s medical debt that is fully paid or settled can\'t stay characterized as delinquent, charged off or in collection. Other medical-debt rules may have changed after May 2023 and I don\'t have them loaded.'],
      pt: ['O texto federal da FCRA que tenho diz três coisas sobre dívidas médicas. Primeira: os relatórios não podem mostrar nome, endereço e telefone de quem prestou um serviço médico se avisou a agência, exceto se forem codificados de modo que não identifiquem o prestador nem a natureza do serviço. Segunda: para as agências nacionais, uma dívida médica de veterano não é informada antes de passar 1 ano do serviço. Terceira: uma dívida médica de veterano totalmente paga ou acertada não pode continuar como atrasada, baixada ou em cobrança. Outras regras sobre dívidas médicas podem ter mudado depois de maio de 2023 e não as tenho carregadas.'],
      ht: ['Tèks federal FCRA mwen genyen an di twa bagay sou dèt medikal. Premye: rapò yo pa ka montre non, adrès ak telefòn moun ki te ba w yon sèvis medikal si li te avèti ajans lan sou estati li, sof si yo kode yo pou yo pa idantifye founisè a espesifik ni nati sèvis la. Dezyèm: pou ajans nasyonal yo, yon dèt medikal yon veteran pa rapòte anvan 1 an pase depi sèvis la. Twazyèm: yon dèt medikal yon veteran ki peye oswa regle nèt pa ka rete kòm an reta, pase pou pèt oswa nan koleksyon. Lòt règ sou dèt medikal ka chanje apre mwa me 2023 epi mwen pa gen yo chaje.']
    },
    {
      id: 'fcra_gratis',
      ley: 'FCRA',
      cita: '§ 612 · 15 U.S.C. § 1681j',
      prioridad: 3,
      claves: ['free to get my credit report', 'free to get my report', 'get my credit report for free', 'get my free credit report',
        'my credit report for free', 'credit report for free', 'get my report for free', 'sacar mi reporte de credito',
        'pedir mi reporte de credito', 'obtener mi reporte de credito', 'reporte de credito es gratis', 'es gratis mi reporte',
        'gratis meu relatorio', 'meu relatorio de credito gratis', 'jwenn rapo kredi mwen',
        'reporte gratis', 'reporte de credito gratis', 'reporte de credito gratuito', 'reportes gratis', 'reportes gratuitos',
        'reporte gratuito', 'mi reporte gratis', 'annualcreditreport', 'annual credit report', 'annualcreditreport com',
        'cuantas veces puedo pedir mi reporte', 'una vez al ano', 'cada 12 meses', 'me negaron el credito reporte gratis',
        'free credit report', 'free credit reports', 'free report', 'free copy of my report', 'free copy of my credit',
        'how often can i get my credit report', 'once a year', 'every 12 months', 'relatorio gratis', 'relatorio de credito gratis',
        'relatorio gratuito', 'relatorios gratis', 'uma vez por ano', 'a cada 12 meses', 'rapo kredi gratis', 'rapo gratis',
        'rapò kredi gratis', 'rapò gratis', 'yon fwa pa ane', 'chak 12 mwa', 'kijan pou m jwenn rapo m gratis'],
      pistas: ['gratis', 'gratuito', 'free', 'gratuito', 'gratis', 'pedir', 'request', 'pedido', 'mande', 'ano', 'year', 'ane', 'reporte',
        'report', 'relatorio', 'rapo'],
      es: ['Según la FCRA, cada agencia nacional debe darte tu reporte una vez cada 12 meses sin costo, si lo pides por la fuente centralizada: AnnualCreditReport.com, el único sitio autorizado por ley. Debe entregarlo a más tardar 15 días después de recibir tu solicitud. También es gratis: si lo pides dentro de los 60 días de recibir un aviso de que te negaron o empeoraron algo por tu reporte; una vez cada 12 meses si certificas por escrito que estás desempleado y vas a buscar empleo en los próximos 60 días, que recibes asistencia pública o que crees que tu archivo tiene datos inexactos por fraude; y con una alerta de fraude (1 reporte con la inicial, 2 en 12 meses con la extendida). Fuera de esos casos pueden cobrar un cargo razonable que la ley limita, y lo deben decir antes. Desconfía de cualquier sitio que te cobre por «tu reporte gratis».'],
      en: ['Under the FCRA, each nationwide agency must give you your report once every 12 months at no charge, if you ask through the centralized source: AnnualCreditReport.com, the only site authorized by law. It must deliver within 15 days of receiving your request. It\'s also free: if you ask within 60 days of receiving a notice that something was denied or made worse because of your report; once every 12 months if you certify in writing that you\'re unemployed and will apply for jobs in the next 60 days, that you receive public assistance, or that you believe your file has inaccurate information due to fraud; and with a fraud alert (1 report with the initial alert, 2 within 12 months with the extended one). Outside those cases they may charge a reasonable fee the law caps, and must tell you beforehand. Be wary of any site that charges for «your free report».'],
      pt: ['Pela FCRA, cada agência nacional deve te dar seu relatório uma vez a cada 12 meses sem custo, se você pedir pela fonte centralizada: AnnualCreditReport.com, o único site autorizado por lei. Deve entregá-lo em no máximo 15 dias após receber o pedido. Também é grátis: se você pedir dentro de 60 dias após receber um aviso de que algo foi negado ou piorou por causa do seu relatório; uma vez a cada 12 meses se você certificar por escrito que está desempregado e vai procurar emprego nos próximos 60 dias, que recebe assistência pública, ou que acredita que seu arquivo tem dados incorretos por fraude; e com um alerta de fraude (1 relatório com o inicial, 2 em 12 meses com o estendido). Fora desses casos, podem cobrar uma taxa razoável que a lei limita, e devem avisar antes. Desconfie de qualquer site que cobre pelo «seu relatório grátis».'],
      ht: ['Dapre FCRA, chak ajans nasyonal dwe ba w rapò w yon fwa chak 12 mwa gratis, si w mande l atravè sous santralize a: AnnualCreditReport.com, sèl sit lwa a otorize. Li dwe livre l nan pi lwen 15 jou apre l resevwa demann ou. Li gratis tou: si w mande l nan 60 jou apre w resevwa yon avi ki di yo refize w oswa yo fè yon bagay vin pi mal akòz rapò w; yon fwa chak 12 mwa si w sètifye alekri ou nan chomaj epi w pral chèche travay nan 60 jou k ap vini yo, ou resevwa asistans piblik, oswa ou kwè dosye w gen enfòmasyon ki pa egzat akòz fwod; epi ak yon alèt fwod (1 rapò ak alèt inisyal la, 2 nan 12 mwa ak alèt pwolonje a). Deyò ka sa yo, yo ka chaje yon frè rezonab lwa a limite, epi yo dwe di w sa anvan. Pran prekosyon ak nenpòt sit ki chaje w pou «rapò gratis ou a».'],
      enlace: L('credito.html#analizar-reporte', 'Analizar mi reporte →'),
      enlaceEtiqueta: { en: 'Analyze my report →', pt: 'Analisar meu relatório →', ht: 'Analize rapò mwen an →' }
    },
    {
      id: 'fcra_disputa',
      ley: 'FCRA',
      cita: '§ 611 · 15 U.S.C. § 1681i',
      prioridad: 3,
      claves: ['disputar un error', 'disputar un error en mi reporte', 'disputar mi reporte', 'error en mi reporte', 'errores en mi reporte',
        'dato incorrecto', 'informacion incorrecta', 'informacion equivocada', 'corregir mi reporte', 'corregir un error',
        'quitar un error', 'como disputo', 'como disputar', 'reinvestigacion', 'investigacion de mi disputa', 'declaracion de disputa',
        'mi disputa', 'dispute an error', 'dispute my report', 'dispute my credit report', 'error on my report', 'error on my credit report',
        'errors on my credit', 'incorrect information', 'wrong information', 'inaccurate information', 'inaccurate item', 'fix my report',
        'fix an error', 'how do i dispute', 'how to dispute', 'reinvestigation', 'statement of dispute', 'my dispute',
        'erro no meu relatorio', 'erros no meu relatorio', 'informacao incorreta', 'informacao errada', 'como contesto', 'como contestar',
        'contestar erro', 'corrigir meu relatorio', 'reinvestigacao', 'meu pedido de contestacao', 'erè nan rapò m', 'ere nan rapo m',
        'erè nan rapò mwen', 'ere nan rapo mwen', 'enfòmasyon ki pa bon', 'enfomasyon ki pa bon', 'enfòmasyon ki pa egzat',
        'enfomasyon ki pa egzat', 'kijan pou m kontèste', 'kijan pou m konteste', 'kijan pou mwen kontèste', 'korije rapò m',
        'korije rapo m', 'rapò m gen yon erè', 'rapo m gen yon ere'],
      pistas: ['disputar', 'disputa', 'error', 'incorrecto', 'dispute', 'wrong', 'incorrect', 'contestar', 'erro', 'incorreto', 'kontèste',
        'konteste', 'erè', 'ere', 'reporte', 'report', 'relatorio', 'rapo', 'rapò'],
      es: ['Si algo en tu reporte es inexacto o incompleto, puedes disputarlo con la agencia de reportes, sin costo. Tiene 30 días desde que recibe tu disputa para investigar (hasta 45 si durante esos 30 días le mandas información relevante; y 45 si la disputa viene después de un reporte gratis anual). En 5 días hábiles debe avisar de la disputa a quien reportó el dato, con lo que tú mandaste, y debe considerar todo lo relevante que envíes. Si el dato es inexacto, incompleto o no se puede verificar, debe borrarlo o corregirlo y avisarte por escrito el resultado en 5 días hábiles tras terminar. Si no se resuelve, puedes agregar una declaración breve de disputa (la agencia puede limitarla a 100 palabras, ayudándote a redactarla) que irá en tus reportes futuros. Si un dato borrado vuelve a aparecer, deben avisarte por escrito en 5 días hábiles. La agencia puede rechazar una disputa que considere frívola o sin información suficiente, pero debe avisarte los motivos. Y cuando el dato es correcto y verificable, puede mantenerse: nadie puede borrar información correcta.'],
      en: ['If something on your report is inaccurate or incomplete, you can dispute it with the reporting agency, free of charge. It has 30 days from receiving your dispute to investigate (up to 45 if you send relevant information during those 30 days; and 45 if the dispute comes after a free annual report). Within 5 business days it must notify whoever reported the item of the dispute, with what you sent, and must consider all relevant information you submit. If the item is inaccurate, incomplete or can\'t be verified, it must delete or correct it and tell you the result in writing within 5 business days after finishing. If it isn\'t resolved, you can add a brief statement of dispute (the agency may limit it to 100 words, helping you write it) that goes in your future reports. If a deleted item is reinserted, they must notify you in writing within 5 business days. The agency may reject a dispute it finds frivolous or lacking enough information, but must tell you why. And when the item is correct and verifiable it can stay: nobody can erase correct information.'],
      pt: ['Se algo no seu relatório está incorreto ou incompleto, você pode contestar junto à agência de relatórios, sem custo. Ela tem 30 dias a partir do recebimento da contestação para investigar (até 45 se, nesses 30 dias, você enviar informação relevante; e 45 se a contestação vier depois de um relatório grátis anual). Em 5 dias úteis, deve avisar da contestação quem informou o dado, com o que você enviou, e deve considerar tudo o que for relevante. Se o dado estiver incorreto, incompleto ou não puder ser verificado, deve apagá-lo ou corrigi-lo e te avisar o resultado por escrito em 5 dias úteis após terminar. Se não for resolvido, você pode acrescentar uma breve declaração de contestação (a agência pode limitá-la a 100 palavras, ajudando você a redigi-la), que irá nos seus relatórios futuros. Se um dado apagado reaparecer, devem te avisar por escrito em 5 dias úteis. A agência pode rejeitar uma contestação que considere frívola ou sem informação suficiente, mas deve informar os motivos. E quando o dado é correto e verificável, ele pode permanecer: ninguém pode apagar informação correta.'],
      ht: ['Si yon bagay nan rapò w pa egzat oswa li pa konplè, ou ka kontèste l ak ajans rapò a, gratis. Li gen 30 jou depi l resevwa kontestasyon w pou envestige (jiska 45 si pandan 30 jou sa yo w voye enfòmasyon ki enpòtan; epi 45 si kontestasyon an vini apre yon rapò anyèl gratis). Nan 5 jou ouvrab, li dwe avèti moun ki rapòte done a sou kontestasyon an, ak sa w voye a, epi li dwe konsidere tout enfòmasyon ki enpòtan w voye. Si done a pa egzat, li pa konplè oswa yo pa ka verifye l, li dwe efase l oswa korije l epi di w rezilta a alekri nan 5 jou ouvrab apre l fini. Si sa pa rezoud, ou ka ajoute yon kout deklarasyon kontestasyon (ajans lan ka limite l a 100 mo, epi ede w ekri l) ki pral nan rapò w yo alavni. Si yon done ki te efase reparèt, yo dwe avèti w alekri nan 5 jou ouvrab. Ajans lan ka rejte yon kontestasyon li jwenn frivòl oswa ki pa gen ase enfòmasyon, men li dwe di w poukisa. Epi lè done a kòrèk epi ka verifye, li ka rete: pèsonn pa ka efase enfòmasyon kòrèk.'],
      enlace: L('herramientas.html', 'Preparar mi carta de disputa →'),
      enlaceEtiqueta: { en: 'Prepare my dispute letter →', pt: 'Preparar minha carta de contestação →', ht: 'Prepare lèt kontestasyon mwen an →' }
    },
    {
      id: 'fcra_disputa_directa',
      ley: 'FCRA',
      cita: '§ 623(a)(8), (b), (c) · 15 U.S.C. § 1681s-2',
      prioridad: 3,
      claves: ['disputar directamente', 'disputar con el banco', 'disputar con el acreedor', 'disputar con quien reporta',
        'disputar con el prestamista', 'disputa directa', 'quien reporto el dato', 'quien reporta el dato', 'furnisher',
        'dispute directly', 'dispute with the bank', 'dispute with the creditor', 'dispute with the lender', 'direct dispute',
        'contestar diretamente', 'contestar com o banco', 'contestar com o credor', 'kontèste dirèkteman', 'konteste direkteman',
        'kontèste ak bank la', 'konteste ak bank la', 'kontèste ak kreditè a', 'konteste ak krediter a'],
      pistas: ['directamente', 'directly', 'diretamente', 'dirèkteman', 'direkteman', 'banco', 'bank', 'acreedor', 'creditor', 'prestamista',
        'lender', 'credor', 'kreditè', 'krediter', 'bank'],
      es: ['Además de disputar con la agencia de reportes, puedes disputar directamente con quien reportó el dato (el banco, el prestamista, el cobrador), enviándolo a la dirección que esa empresa indique para disputas: identificas el dato exacto, explicas por qué es inexacto y mandas los documentos que lo respaldan. Esa empresa debe investigar, revisar lo que mandaste, informarte el resultado dentro del mismo plazo que tendría la agencia y, si el dato era inexacto, corregirlo ante cada agencia a la que se lo reportó. Si la disputa le llega por medio de la agencia, además debe investigar, informar el resultado y, si es inexacto, incompleto o no verificable, modificar, borrar o bloquear el dato. Un detalle importante: los deberes generales de exactitud de quien reporta (sección 623(a), incluida la disputa directa) los hacen cumplir agencias del gobierno, no demandas privadas; en cambio, los deberes que nacen cuando disputas a través de la agencia (623(b)) sí admiten demandas. Por eso disputar también por la agencia deja un rastro que cuenta.'],
      en: ['Besides disputing with the reporting agency, you can dispute directly with whoever reported the item (the bank, the lender, the collector), sending it to the address that company specifies for disputes: you identify the exact item, explain why it\'s inaccurate and include the supporting documents. That company must investigate, review what you sent, report the result to you within the same period the agency would have, and, if the item was inaccurate, correct it with every agency it reported it to. If the dispute reaches it through the agency, it must also investigate, report the result and, if the item is inaccurate, incomplete or unverifiable, modify, delete or permanently block it. An important detail: a reporter\'s general accuracy duties (section 623(a), including the direct dispute) are enforced by government agencies, not private lawsuits; the duties that arise when you dispute through the agency (623(b)) do allow lawsuits. That\'s why also disputing through the agency leaves a record that counts.'],
      pt: ['Além de contestar junto à agência de relatórios, você pode contestar diretamente com quem informou o dado (o banco, o credor, o cobrador), enviando ao endereço que essa empresa indica para contestações: você identifica o dado exato, explica por que está incorreto e inclui os documentos que o comprovam. Essa empresa deve investigar, revisar o que você enviou, informar o resultado dentro do mesmo prazo que a agência teria e, se o dado estava incorreto, corrigi-lo perante cada agência a que o informou. Se a contestação chegar por meio da agência, também deve investigar, informar o resultado e, se o dado for incorreto, incompleto ou não verificável, modificá-lo, apagá-lo ou bloqueá-lo. Um detalhe importante: os deveres gerais de exatidão de quem informa (seção 623(a), incluindo a contestação direta) são aplicados por órgãos do governo, não por ações privadas; já os deveres que surgem quando você contesta pela agência (623(b)) admitem ações. Por isso contestar também pela agência deixa um registro que conta.'],
      ht: ['Anplis de kontèste ak ajans rapò a, ou ka kontèste dirèkteman ak moun ki rapòte done a (bank la, prèteur la, kolektè a), lè w voye l nan adrès konpayi sa a endike pou kontestasyon: ou idantifye done egzak la, ou eksplike poukisa li pa egzat epi ou mete dokiman ki apiye l yo. Konpayi sa a dwe envestige, revize sa w voye, di w rezilta a nan menm delè ajans lan ta genyen, epi, si done a pa te egzat, korije l bay chak ajans li te rapòte l ba li. Si kontestasyon an rive jwenn li atravè ajans lan, li dwe envestige tou, rapòte rezilta a epi, si done a pa egzat, pa konplè oswa pa ka verifye, modifye l, efase l oswa bloke l. Yon detay enpòtan: devwa jeneral egzaktitid moun ki rapòte a (seksyon 623(a), ansanm ak kontestasyon dirèk la) se ajans gouvènman ki fè yo respekte, se pa pwosè prive; men devwa ki fèt lè w kontèste atravè ajans lan (623(b)) pèmèt pwosè. Se poutèt sa kontèste tou atravè ajans lan kite yon tras ki konte.']
    },
    {
      id: 'fcra_robo_id',
      ley: 'FCRA',
      cita: '§ 605A–605B · 15 U.S.C. §§ 1681c-1, 1681c-2',
      prioridad: 3,
      claves: ['robo de identidad', 'me robaron la identidad', 'robaron mi identidad', 'alerta de fraude', 'alerta de fraude en mi credito',
        'congelar mi credito', 'bloquear informacion', 'bloqueo por robo de identidad', 'informe de robo de identidad',
        'alerta de servicio activo', 'militar en servicio activo alerta', 'abrieron una cuenta a mi nombre',
        'abrieron una tarjeta a mi nombre', 'cuenta que no abri', 'identity theft', 'identity theft report', 'fraud alert',
        'extended fraud alert', 'active duty alert', 'block information', 'block the information', 'someone opened an account in my name',
        'account i didn t open', 'account i did not open', 'victim of fraud', 'roubo de identidade', 'alerta de fraude no meu credito',
        'bloquear informacoes', 'abriram uma conta no meu nome', 'conta que eu nao abri', 'alerta de servico ativo', 'vòl idantite',
        'vol idantite', 'yo vòlè idantite m', 'yo vole idantite m', 'yo vòlè idantite mwen', 'yo vole idantite mwen', 'alèt fwod',
        'alet fwod', 'yo louvri yon kont sou non mwen', 'yo louvri yon kont sou non m', 'kont mwen pa t louvri'],
      pistas: ['identidad', 'fraude', 'robo', 'identity', 'fraud', 'theft', 'identidade', 'fraude', 'roubo', 'idantite', 'fwod', 'vòl', 'vol',
        'estafa', 'scam'],
      es: ['Si sospechas que eres víctima de fraude o robo de identidad, la FCRA te da varias herramientas. Puedes pedir una alerta de fraude inicial a una agencia (esa avisa a las otras): dura al menos 1 año y te da derecho a un reporte gratis. Con un informe de robo de identidad, puedes pedir una alerta extendida de 7 años, quedar fuera por 5 años de las listas de ofertas de crédito o seguro que no pediste, y recibir 2 reportes gratis en 12 meses. Quien está en servicio militar activo puede pedir una alerta de servicio activo de al menos 12 meses y quedar fuera de esas listas por 2 años. Además, si le mandas a la agencia prueba de tu identidad, copia del informe de robo de identidad, qué dato es y una declaración de que no corresponde a una transacción tuya, debe bloquear ese dato a más tardar 4 días hábiles después; puede negarse o revertir el bloqueo en ciertos casos, por ejemplo si se comprueba una declaración falsa o si obtuviste dinero, bienes o servicios de esa transacción. El informe de robo de identidad se hace en IdentityTheft.gov, de la FTC.'],
      en: ['If you suspect you\'re a victim of fraud or identity theft, the FCRA gives you several tools. You can request an initial fraud alert from one agency (it tells the others): it lasts at least 1 year and entitles you to a free report. With an identity theft report, you can request an extended alert of 7 years, be left off lists of credit or insurance offers you didn\'t ask for for 5 years, and get 2 free reports within 12 months. Someone on active military duty can request an active duty alert of at least 12 months and be left off those lists for 2 years. Also, if you send the agency proof of your identity, a copy of the identity theft report, which item it is and a statement that it isn\'t from a transaction of yours, it must block that item no later than 4 business days afterward; it may decline or reverse the block in certain cases, for example a proven false statement or if you got money, goods or services from that transaction. The identity theft report is made at IdentityTheft.gov, from the FTC.'],
      pt: ['Se você suspeita ser vítima de fraude ou roubo de identidade, a FCRA oferece várias ferramentas. Você pode pedir um alerta de fraude inicial a uma agência (ela avisa as outras): dura pelo menos 1 ano e dá direito a um relatório grátis. Com um relatório de roubo de identidade, pode pedir um alerta estendido de 7 anos, ficar 5 anos fora das listas de ofertas de crédito ou seguro que você não pediu e receber 2 relatórios grátis em 12 meses. Quem está em serviço militar ativo pode pedir um alerta de serviço ativo de pelo menos 12 meses e ficar fora dessas listas por 2 anos. Além disso, se você enviar à agência prova de identidade, cópia do relatório de roubo de identidade, qual é o dado e uma declaração de que não corresponde a uma transação sua, ela deve bloquear o dado em no máximo 4 dias úteis; pode recusar ou reverter o bloqueio em certos casos, por exemplo se for comprovada uma declaração falsa ou se você obteve dinheiro, bens ou serviços daquela transação. O relatório de roubo de identidade é feito em IdentityTheft.gov, da FTC.'],
      ht: ['Si w sispèkte w viktim fwod oswa vòl idantite, FCRA ba w plizyè zouti. Ou ka mande yon alèt fwod inisyal bay yon ajans (li avèti lòt yo): li dire omwen 1 an epi li ba w dwa pou yon rapò gratis. Ak yon rapò vòl idantite, ou ka mande yon alèt pwolonje 7 an, rete deyò pandan 5 an lis ofri kredi oswa asirans ou pa t mande, epi jwenn 2 rapò gratis nan 12 mwa. Moun ki nan sèvis militè aktif ka mande yon alèt sèvis aktif omwen 12 mwa epi rete deyò lis sa yo pandan 2 an. Anplis, si w voye ajans lan prèv idantite w, yon kopi rapò vòl idantite a, ki done a ye ak yon deklarasyon ki di li pa soti nan yon tranzaksyon pa w, li dwe bloke done sa a nan pi lwen 4 jou ouvrab apre; li ka refize oswa anile blokaj la nan sèten ka, pa egzanp si yo pwouve yon fo deklarasyon oswa si w te jwenn lajan, byen oswa sèvis nan tranzaksyon sa a. Rapò vòl idantite a fèt sou IdentityTheft.gov, nan FTC.']
    },
    {
      id: 'fcra_accion_adversa',
      ley: 'FCRA',
      cita: '§ 615(a), (b), (h) · 15 U.S.C. § 1681m',
      prioridad: 3,
      claves: ['me negaron el credito', 'me negaron el prestamo', 'me negaron la tarjeta', 'me negaron el apartamento', 'me rechazaron el credito',
        'me subieron la tasa por mi credito', 'me subieron la tasa por mi reporte', 'tasa mas alta por mi credito', 'aviso de accion adversa', 'accion adversa', 'por que me negaron',
        'razones de la negativa', 'me denegaron', 'denied credit', 'denied a loan', 'denied for a loan', 'denied the loan',
        'was denied credit', 'i was denied', 'adverse action', 'adverse action notice', 'why was i denied', 'why i was denied',
        'higher interest rate because', 'risk based pricing', 'risk-based pricing', 'credit denial', 'me negaram o credito',
        'me negaram o emprestimo', 'me negaram o cartao', 'acao adversa', 'por que me negaram', 'taxa mais alta por causa',
        'yo refize m kredi', 'yo refize mwen kredi', 'yo refize m prè', 'yo refize mwen pre', 'yo refize m yon kat', 'avi aksyon negatif',
        'poukisa yo refize m', 'poukisa yo refize mwen'],
      pistas: ['negaron', 'rechazaron', 'denied', 'rejected', 'turned down', 'negaram', 'recusaram', 'refize', 'refuse', 'tasa', 'rate', 'taxa',
        'credito', 'credit', 'prestamo', 'loan', 'emprestimo', 'prè', 'pre'],
      es: ['Si te niegan un crédito, un empleo o un seguro —o te suben el costo— por algo que aparece en tu reporte, quien tomó la decisión debe avisarte (de forma oral, escrita o electrónica) y darte: el puntaje de crédito que usó y datos sobre él; el nombre, dirección y teléfono de la agencia que dio el reporte; una explicación de que la agencia no tomó la decisión y no puede decirte los motivos; y el aviso de tu derecho a un reporte gratis de esa agencia si lo pides dentro de 60 días, y a disputar lo que sea inexacto. Si la decisión se basó en información de alguien que no es una agencia de reportes, puedes pedir por escrito, dentro de 60 días, que te digan la naturaleza de esa información. Y si te dan condiciones materialmente peores que las mejores que ofrecen, basadas en tu reporte, deben avisártelo. Lo que no significa que la decisión sea inválida: tú decides si pides el reporte y revisas si hay algo por corregir.'],
      en: ['If you\'re denied credit, a job or insurance —or the cost goes up— because of something on your report, whoever made the decision must notify you (orally, in writing or electronically) and give you: the credit score used and information about it; the name, address and phone of the agency that supplied the report; a statement that the agency didn\'t make the decision and can\'t tell you why; and notice of your right to a free report from that agency if you ask within 60 days, and to dispute anything inaccurate. If the decision was based on information from someone other than a reporting agency, you can ask in writing, within 60 days, to be told the nature of that information. And if you get materially less favorable terms than the best ones offered, based on your report, they must notify you. That doesn\'t mean the decision is invalid: it\'s up to you whether to request the report and check for anything to correct.'],
      pt: ['Se te negam crédito, emprego ou seguro — ou o custo sobe — por algo que aparece no seu relatório, quem tomou a decisão deve te avisar (oralmente, por escrito ou eletronicamente) e te dar: a pontuação de crédito usada e informações sobre ela; o nome, endereço e telefone da agência que forneceu o relatório; uma declaração de que a agência não tomou a decisão e não pode dizer os motivos; e o aviso do seu direito a um relatório grátis dessa agência se você pedir em 60 dias, e a contestar o que estiver incorreto. Se a decisão se baseou em informação de alguém que não é agência de relatórios, você pode pedir por escrito, em 60 dias, que digam a natureza dessa informação. E se te derem condições materialmente piores que as melhores oferecidas, com base no seu relatório, devem te avisar. Isso não significa que a decisão seja inválida: cabe a você decidir se pede o relatório e confere se há algo a corrigir.'],
      ht: ['Si yo refize w yon kredi, yon travay oswa yon asirans —oswa pri a monte— akòz yon bagay ki nan rapò w, moun ki te pran desizyon an dwe avèti w (oralman, alekri oswa elektwonikman) epi ba w: nòt kredi li te itilize a ak enfòmasyon sou li; non, adrès ak telefòn ajans ki te bay rapò a; yon deklarasyon ki di ajans lan pa t pran desizyon an epi li pa ka di w poukisa; ak avi sou dwa w pou yon rapò gratis nan ajans sa a si w mande l nan 60 jou, ak dwa pou kontèste sa ki pa egzat. Si desizyon an te baze sou enfòmasyon ki soti nan yon moun ki pa yon ajans rapò kredi, ou ka mande alekri, nan 60 jou, pou yo di w nati enfòmasyon sa a. Epi si yo ba w kondisyon ki materyèlman mwens bon pase pi bon yo yo ofri, dapre rapò w, yo dwe avèti w. Sa pa vle di desizyon an envalid: se ou k ap deside si w mande rapò a epi w tcheke si gen yon bagay pou korije.'],
      enlace: L('credito.html#analizar-reporte', 'Analizar mi reporte →'),
      enlaceEtiqueta: { en: 'Analyze my report →', pt: 'Analisar meu relatório →', ht: 'Analize rapò mwen an →' }
    },
    {
      id: 'fcra_empleo',
      ley: 'FCRA',
      cita: '§ 604(b) · 15 U.S.C. § 1681b(b)',
      prioridad: 2,
      claves: ['para el trabajo', 'para un trabajo', 'para un empleo', 'para el empleo', 'empleador me pidio', 'empleador pidio',
        'for a job', 'for the job', 'for employment', 'para o trabalho', 'para um emprego', 'para emprego', 'pou travay', 'pou yon travay',
        'reporte de credito para trabajo', 'reporte de credito para un empleo', 'revisan mi credito para el trabajo',
        'revisar mi credito para un trabajo', 'empleador revisa mi credito', 'empleador pide mi reporte', 'antecedentes para el trabajo',
        'verificacion de antecedentes', 'background check', 'employer credit check', 'employer pulled my credit',
        'credit check for a job', 'credit check for employment', 'job credit check', 'employer background check',
        'relatorio de credito para emprego', 'verificacao de antecedentes', 'empregador consulta meu credito',
        'rapo kredi pou travay', 'rapò kredi pou travay', 'patwon an gade kredi m', 'patwon an gade kredi mwen',
        'verifikasyon background'],
      pistas: ['trabajo', 'empleo', 'empleador', 'job', 'employer', 'employment', 'emprego', 'empregador', 'travay', 'patwon', 'antecedentes',
        'background'],
      es: ['Para que un empleador pida tu reporte de crédito para una decisión de empleo, la FCRA exige que antes te dé por escrito un aviso claro, en un documento aparte que contenga solo eso, y que tú lo autorices por escrito. Y si va a tomar una decisión en tu contra basada en ese reporte, antes debe darte una copia del reporte y un resumen de tus derechos. Hay reglas especiales para ciertos puestos de transporte cuando aplicas por correo, teléfono o computadora. Y recuerda: los límites de 7 años del reporte no aplican en empleos con sueldo anual de $75,000 o más.'],
      en: ['For an employer to get your credit report for an employment decision, the FCRA requires that beforehand it give you a clear written notice, in a standalone document containing only that, and that you authorize it in writing. And if it\'s going to take action against you based on that report, before doing so it must give you a copy of the report and a summary of your rights. There are special rules for certain transportation positions when you apply by mail, phone or computer. And remember: the report\'s 7-year limits don\'t apply to jobs paying $75,000 a year or more.'],
      pt: ['Para que um empregador peça seu relatório de crédito para uma decisão de emprego, a FCRA exige que antes ele te dê por escrito um aviso claro, em documento separado que contenha só isso, e que você autorize por escrito. E se for tomar uma decisão contra você com base nesse relatório, antes deve te dar uma cópia do relatório e um resumo dos seus direitos. Há regras especiais para certos cargos de transporte quando você se candidata por correio, telefone ou computador. E lembre-se: os limites de 7 anos do relatório não valem para empregos com salário anual de $75,000 ou mais.'],
      ht: ['Pou yon patwon jwenn rapò kredi w pou yon desizyon anbochaj, FCRA egzije anvan sa li ba w yon avi klè alekri, nan yon dokiman apa ki genyen sèlman sa a, epi ou otorize l alekri. Epi si l pral pran yon desizyon kont ou dapre rapò sa a, anvan sa li dwe ba w yon kopi rapò a ak yon rezime dwa ou. Gen règ espesyal pou sèten pòs transpò lè w aplike pa lapòs, pa telefòn oswa pa òdinatè. Epi sonje: limit 7 an rapò a pa aplike pou travay ki peye $75,000 pa ane oswa plis.']
    },
    {
      id: 'fcra_preaprobadas',
      ley: 'FCRA',
      cita: '§ 604(c), (e) y § 615(d) · 15 U.S.C. §§ 1681b, 1681m',
      prioridad: 2,
      claves: ['ofertas preaprobadas', 'ofertas pre aprobadas', 'tarjetas preaprobadas', 'me llegan ofertas de tarjetas',
        'dejar de recibir ofertas de credito', 'no quiero ofertas de credito', 'salir de las listas de ofertas', 'ofertas de credito por correo',
        'optoutprescreen', 'opt out prescreen', 'prescreened offers', 'prescreened offer', 'pre approved offers', 'preapproved offers',
        'credit card offers in the mail', 'stop credit offers', 'stop receiving credit offers', 'opt out of credit offers',
        'ofertas pre aprovadas', 'ofertas preaprovadas', 'ofertas de cartao pelo correio', 'parar de receber ofertas de credito',
        'ofri pre apwouve', 'ofri preapwouve', 'ofri kat kredi nan lapòs', 'ofri kat kredi nan lapos', 'sispann resevwa ofri kredi'],
      pistas: ['ofertas', 'offers', 'ofertas', 'ofri', 'correo', 'mail', 'correio', 'lapòs', 'lapos', 'tarjetas', 'cards', 'cartoes', 'kat'],
      es: ['Las ofertas «preaprobadas» de tarjetas o seguros que llegan sin que las pidas salen de listas armadas con datos de tu reporte. La FCRA exige que cada oferta por escrito diga con claridad que se usó tu reporte, que la recibiste por cumplir ciertos criterios, y que puedes pedir que tu información no se use para ese tipo de ofertas, con un teléfono y dirección del sistema para excluirte. Ese sistema es OptOutPrescreen.com o el 1-888-567-8688. Si te excluyes, tu nombre sale de las listas para ofertas que tú no iniciaste.'],
      en: ['«Prescreened» credit card or insurance offers that arrive without your asking come from lists built with data from your report. The FCRA requires each written offer to say clearly that your report was used, that you received it because you met certain criteria, and that you can ask that your information not be used for that kind of offer, with a phone number and address for the opt-out system. That system is OptOutPrescreen.com or 1-888-567-8688. If you opt out, your name comes off the lists for offers you didn\'t initiate.'],
      pt: ['As ofertas «pré-aprovadas» de cartões ou seguros que chegam sem você pedir saem de listas montadas com dados do seu relatório. A FCRA exige que cada oferta por escrito diga com clareza que seu relatório foi usado, que você a recebeu por cumprir certos critérios, e que você pode pedir que suas informações não sejam usadas para esse tipo de oferta, com telefone e endereço do sistema de exclusão. Esse sistema é OptOutPrescreen.com ou 1-888-567-8688. Se você se excluir, seu nome sai das listas de ofertas que você não iniciou.'],
      ht: ['Ofri «preapwouve» pou kat kredi oswa asirans ki rive san w pa mande yo soti nan lis ki fèt ak done nan rapò w. FCRA egzije chak ofri alekri di klèman yo te itilize rapò w, ou resevwa l paske w te satisfè sèten kritè, epi ou ka mande pou enfòmasyon w pa itilize pou kalite ofri sa a, ak yon nimewo telefòn ak adrès sistèm ekskli a. Sistèm sa a se OptOutPrescreen.com oswa 1-888-567-8688. Si w chwazi ekskli tèt ou, non w soti nan lis pou ofri ou pa t inisye yo.']
    },
    {
      id: 'fcra_demanda',
      ley: 'FCRA',
      cita: '§ 616–618 · 15 U.S.C. §§ 1681n, 1681o, 1681p',
      prioridad: 3,
      claves: ['puedo demandar', 'can i sue', 'posso processar', 'mwen ka mennen', 'demandar a equifax',
        'puedo demandar a la agencia de credito', 'demandar a equifax', 'demandar a experian', 'demandar a transunion',
        'demandar por un error en mi reporte', 'demandar por mi reporte', 'demandar por mi credito', 'cuanto tiempo tengo para demandar',
        'plazo para demandar por mi reporte', 'danos por un error en mi reporte', 'sue equifax', 'sue experian', 'sue transunion',
        'sue the credit bureau', 'sue a credit bureau', 'sue over my credit report', 'lawsuit over my credit report',
        'damages under the fcra', 'how long do i have to sue', 'processar a equifax', 'processar a experian', 'processar a transunion',
        'processar o bureau de credito', 'processar por erro no relatorio', 'mennen equifax nan tribinal', 'mennen experian nan tribinal',
        'mennen transunion nan tribinal', 'pwosè kont ajans kredi', 'pwoze kont ajans kredi'],
      pistas: ['demandar', 'demanda', 'sue', 'lawsuit', 'processar', 'acao', 'pwosè', 'pwoze', 'tribunal', 'tribinal', 'court'],
      es: ['Según la FCRA, si una empresa incumple a propósito (de forma intencional o temeraria), responde por tus daños reales o entre $100 y $1,000, más daños punitivos que decida el tribunal y, si ganas, costos y honorarios razonables de abogado. Si incumple por negligencia, responde por tus daños reales y, si ganas, costos y honorarios. El plazo para demandar es el que llegue primero: 2 años desde que descubres la violación, o 5 años desde que ocurrió. Se puede hacer en un tribunal federal de distrito o en otro tribunal competente. Y quien obtenga un reporte con pretextos falsos o sin un motivo permitido puede responder por tus daños reales o $1,000, lo que sea mayor. Recuerda que los deberes generales de exactitud de quien reporta (623(a)) los hacen cumplir agencias del gobierno, no demandas privadas. Si conviene o no demandar es decisión para un abogado; LawHelp.org tiene ayuda legal gratuita.'],
      en: ['Under the FCRA, if a company fails to comply willfully, it is liable for your actual damages or between $100 and $1,000, plus punitive damages the court allows and, if you win, court costs and reasonable attorney\'s fees. If it fails to comply through negligence, it is liable for your actual damages and, if you win, costs and fees. The deadline to sue is whichever comes first: 2 years from when you discover the violation, or 5 years from when it occurred. It can be filed in a federal district court or another competent court. And someone who obtains a report under false pretenses or without a permitted purpose may be liable for your actual damages or $1,000, whichever is greater. Keep in mind that a reporter\'s general accuracy duties (623(a)) are enforced by government agencies, not private lawsuits. Whether to sue is a decision for an attorney; LawHelp.org has free legal help.'],
      pt: ['Pela FCRA, se uma empresa descumpre de propósito (intencionalmente), ela responde pelos seus danos reais ou entre $100 e $1,000, mais danos punitivos que o tribunal decidir e, se você ganhar, custas e honorários razoáveis de advogado. Se descumpre por negligência, responde pelos seus danos reais e, se você ganhar, custas e honorários. O prazo para processar é o que vencer primeiro: 2 anos desde que você descobre a violação, ou 5 anos desde que ela ocorreu. Pode ser feito em tribunal federal distrital ou em outro tribunal competente. E quem obtém um relatório com pretextos falsos ou sem motivo permitido pode responder pelos seus danos reais ou $1,000, o que for maior. Lembre-se de que os deveres gerais de exatidão de quem informa (623(a)) são aplicados por órgãos do governo, não por ações privadas. Se vale processar ou não é decisão para um advogado; o LawHelp.org tem ajuda jurídica gratuita.'],
      ht: ['Dapre FCRA, si yon konpayi vyole lwa a ekspre, li reponn pou domaj reyèl ou yo oswa ant $100 ak $1,000, plis domaj pinitif tribinal la deside epi, si w genyen, depans tribinal ak onorè avoka rezonab. Si li vyole l pa neglijans, li reponn pou domaj reyèl ou yo epi, si w genyen, depans ak onorè. Delè pou fè pwosè a se sa ki vini an premye: 2 an depi w dekouvri vyolasyon an, oswa 5 an depi li rive. Yo ka fè l nan yon tribinal distri federal oswa nan yon lòt tribinal konpetan. Epi yon moun ki jwenn yon rapò ak fo pretèks oswa san yon rezon ki pèmèt ka reponn pou domaj reyèl ou yo oswa $1,000, selon sa ki pi gran. Sonje devwa jeneral egzaktitid moun ki rapòte a (623(a)) se ajans gouvènman ki fè yo respekte, se pa pwosè prive. Si sa vo lapenn pou fè pwosè oswa non se yon desizyon pou yon avoka; LawHelp.org gen èd legal gratis.']
    }
  ];

  /* Zyron compara contra texto normalizado (minúsculas, sin acentos, sin
     puntuación ni apóstrofes). Se normalizan aquí las claves y pistas para
     que quien agregue una ficha pueda escribirlas con acentos naturales. */
  function normalizar(t) {
    return String(t || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿?¡!.,;:()"']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function unicas(lista) {
    var vistas = {}, salida = [];
    (lista || []).forEach(function (x) {
      var n = normalizar(x);
      if (n && !vistas[n]) { vistas[n] = true; salida.push(n); }
    });
    return salida;
  }
  LEYES.forEach(function (f) {
    f.claves = unicas(f.claves);
    f.pistas = unicas(f.pistas);
  });

  window.ZyronLeyes = LEYES;
  if (typeof module !== 'undefined' && module.exports) module.exports = LEYES;
})();
