/* =========================================================
   Índice de búsqueda del contenido del sitio (Themora)
   Usado por Zyron (credit-coach.js) para sugerir secciones
   reales del sitio según lo que la persona escribe.
   Cada entrada apunta a una sección que existe de verdad en
   el sitio — nada de anclas inventadas.
   ========================================================= */
(function(){
  'use strict';

  const INDEX=[
    {title:'¿Qué es el crédito y el historial crediticio?',url:'credito.html#basicos',
      keywords:['que es el credito','que es el historial','credito','historial crediticio','conceptos basicos','empezar de cero']},
    {title:'Los rangos del puntaje FICO',url:'credito.html#como-funciona',
      keywords:['puntaje','score','fico','rangos','buen puntaje','mal puntaje','vantagescore']},
    {title:'Los tres burós de crédito',url:'credito.html#burós',
      keywords:['buro','buros','equifax','experian','transunion','reportes de credito']},
    {title:'FICO y VantageScore según el crédito que solicitas',url:'credito.html#modelos-prestamos',
      keywords:['fico','vantagescore','modelo de puntaje','que puntaje usan','hipoteca puntaje','auto puntaje']},
    {title:'Cómo puede influir la categoría de crédito',url:'credito.html#impacto-puntaje',
      keywords:['impacto del puntaje','tasas de interes','categoria de credito','cuanto cambia la tasa']},
    {title:'Qué pasa después de que envías una disputa a un buró',url:'credito.html#proceso-disputa-fcra',
      keywords:['disputa','disputar','error en mi reporte','fcra','corregir informacion','informacion incorrecta']},
    {title:'Tus derechos frente a cobradores de deuda',url:'credito.html#derechos-cobradores',
      keywords:['cobrador','cobradores','fdcpa','me llaman mucho','deuda vieja','acoso de cobranza','derechos']},
    {title:'Sube tu reporte y conviértelo en un plan',url:'credito.html#analizar-reporte',
      keywords:['analizar reporte','subir reporte','pdf de credito','analizador','estrategia para mi credito']},
    {title:'Los 8 pasos para comprar tu casa en Estados Unidos',url:'comprar-casa.html#pasos',
      keywords:['pasos para comprar casa','como comprar casa','proceso de compra de casa','primeros pasos casa']},
    {title:'Tipos de préstamo hipotecario por perfil',url:'comprar-casa.html#casa',
      keywords:['fha','va loan','usda','convencional','tipos de hipoteca','prestamo hipotecario','que hipoteca me conviene']},
    {title:'¿Necesitas número de seguro social para comprar tu auto?',url:'comprar-auto.html#sin-ssn',
      keywords:['sin ssn','sin seguro social','itin','comprar auto sin ssn','indocumentado auto']},
    {title:'Mapa de tasas de auto por estado',url:'comprar-auto.html#mapa',
      keywords:['tasas de auto','apr auto','mapa de tasas','tasa por estado','interes de auto']},
    {title:'La misma compra puede recibir tasas muy distintas',url:'comprar-auto.html#credito-auto',
      keywords:['tasa de auto','apr','financiar auto','credito para auto','comparar ofertas de auto']},
    {title:'Lee el contrato del dealer en este orden',url:'comprar-auto.html#contrato',
      keywords:['contrato del dealer','letra pequeña auto','que firmar en el dealer','revisar contrato de auto']},
    {title:'Tres pasos para entender tu carta',url:'cartas-claras.html#analizar-carta',
      keywords:['carta','aviso','entender una carta','carta del irs','carta de cobranza','que dice esta carta']},
    {title:'El sistema de crédito en EE. UU. no fue diseñado en español',url:'index.html#por-que',
      keywords:['por que existe este sitio','para que sirve themora','sistema de credito en ingles']},
    {title:'Calculadora hipotecaria',url:'herramientas.html#calculadora-hipoteca',
      keywords:['calculadora hipotecaria','calcular hipoteca','pago mensual de casa','mortgage','calcular mortgage']},
    {title:'Simulador de utilización de crédito',url:'herramientas.html#simulador-utilizacion',
      keywords:['utilizacion','uso de mis tarjetas','bajar utilizacion','simulador de utilizacion']},
    {title:'Calculadora de deuda a ingreso (DTI)',url:'herramientas.html#simulador-dti',
      keywords:['deuda a ingreso','dti','califico para hipoteca','cuanta deuda tengo']},
    {title:'Calculadora para pagar tu tarjeta de crédito',url:'herramientas.html#simulador-pago-tarjeta',
      keywords:['pagar tarjeta','cuanto tiempo en pagar','interes de tarjeta','salir de deuda de tarjeta']},
    {title:'Carta para exigir que un cobrador deje de contactarte',url:'herramientas.html#carta-cese-comunicacion',
      keywords:['carta de cese','que dejen de llamarme','cobrador me llama mucho','cese de comunicacion']},
    {title:'Pon tu negocio en Google Maps y Apple Maps',url:'listar-negocio.html',
      keywords:['listar mi negocio','google maps','apple maps','negocio no aparece','aparecer en mapas']},
    {title:'¿Quieres abrir tu negocio pero no sabes por dónde empezar?',url:'formar-negocio.html',
      keywords:['formar negocio','abrir negocio','registrar negocio','llc','ein','empezar mi negocio']},
    {title:'Quiénes somos',url:'quienes-somos.html',
      keywords:['quienes son','quien hizo esta pagina','sobre themora','mision']},
    {title:'Contacto',url:'contacto.html',
      keywords:['contacto','hablar con alguien','tengo una pregunta','escribir un mensaje']}
  ];

  function normalize(str){
    return String(str||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
  }

  function score(entry,normQuestion,queryTokens){
    let s=0;
    const normTitle=normalize(entry.title);
    if(normQuestion.length>3&&normTitle.includes(normQuestion))s+=6;
    entry.keywords.forEach(k=>{
      const nk=normalize(k);
      if(normQuestion.includes(nk))s+=5;
      else if(nk.includes(normQuestion)&&normQuestion.length>3)s+=2;
    });
    queryTokens.forEach(tok=>{
      if(tok.length<3)return;
      if(normTitle.includes(tok))s+=1;
      entry.keywords.forEach(k=>{ if(normalize(k).includes(tok))s+=1; });
    });
    return s;
  }

  function search(question,limit){
    const normQuestion=normalize(question);
    if(!normQuestion)return [];
    const queryTokens=normQuestion.split(/\s+/).filter(Boolean);
    const results=INDEX.map(entry=>({entry,s:score(entry,normQuestion,queryTokens)}))
      .filter(r=>r.s>0)
      .sort((a,b)=>b.s-a.s)
      .slice(0,limit||3)
      .map(r=>r.entry);
    return results;
  }

  window.ThemoraSearch={search:search,INDEX:INDEX};
})();
