(()=>{
  'use strict';

  const SPARK_ICON='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c.95 4.55 2.05 5.65 6.6 6.6-4.55.95-5.65 2.05-6.6 6.6-.95-4.55-2.05-5.65-6.6-6.6C9.95 7.65 11.05 6.55 12 2z"/><path d="M19 15.2c.42 1.95.98 2.51 2.9 2.9-1.92.42-2.48.98-2.9 2.9-.42-1.92-.98-2.48-2.9-2.9 1.92-.39 2.48-.95 2.9-2.9z"/></svg>';

  // Solo dos sugerencias rápidas, elegidas según la página donde está el
  // visitante — así el primer clic ya es relevante a lo que probablemente
  // vino a buscar, en vez de mostrar siempre la misma lista genérica.
  const PAGE_SUGGESTIONS={
    'comprar-casa.html':['Comprar una casa','Calcular mortgage'],
    'comprar-auto.html':['Comprar un auto','Mejorar mi crédito'],
    'herramientas.html':['Calcular mortgage','Analizar mi reporte'],
    'cartas-claras.html':['Entender una carta','Analizar mi reporte'],
    'listar-negocio.html':['Listar mi negocio','Aparecer en Google Maps'],
    'formar-negocio.html':['Formar una LLC','Sacar mi número EIN']
  };
  const DEFAULT_SUGGESTIONS=['Mejorar mi crédito','Analizar mi reporte'];

  function currentPageSuggestions(){
    const file=(window.location.pathname.split('/').pop()||'index.html').toLowerCase();
    return PAGE_SUGGESTIONS[file]||DEFAULT_SUGGESTIONS;
  }

  const launcher=document.createElement('button');
  launcher.type='button';
  launcher.className='credit-coach-launcher';
  launcher.setAttribute('aria-expanded','false');
  launcher.setAttribute('aria-controls','creditCoachPanel');
  launcher.setAttribute('aria-label','Abrir Zyron, el asistente de Themora');
  launcher.innerHTML=`<span class="credit-coach-avatar" aria-hidden="true">${SPARK_ICON}</span><span class="credit-coach-online" aria-hidden="true"></span><span class="credit-coach-tooltip" aria-hidden="true">Pregúntale a Zyron</span>`;

  const panel=document.createElement('section');
  panel.id='creditCoachPanel';
  panel.className='credit-coach-panel';
  panel.hidden=true;
  panel.setAttribute('aria-label','Asistente Zyron');
  panel.innerHTML=`
    <div class="credit-coach-header">
      <span class="credit-coach-avatar" aria-hidden="true">${SPARK_ICON}</span>
      <div class="credit-coach-title"><strong>Zyron</strong><small>Asistente inteligente · en línea</small></div>
      <button class="credit-coach-close" type="button" aria-label="Cerrar asistente">×</button>
    </div>
    <div class="credit-coach-messages" role="log" aria-live="polite" aria-relevant="additions">
      <div class="coach-message bot" id="coachSaludoInicial">Hola. Soy Zyron. Te explico cartas, contratos, crédito y trámites en palabras normales. También puedo ayudarte a preparar qué preguntarle a un banco, dealer o cobrador. Hablo inglés, portugués, italiano y francés — solo pídemelo. ¿En qué andas?</div>
    </div>
    <div class="credit-coach-suggestions" aria-label="Preguntas sugeridas">
      ${currentPageSuggestions().map(s=>`<button class="coach-suggestion" type="button">${s}</button>`).join('')}
    </div>
    <form class="credit-coach-form">
      <label class="sr-only" for="creditCoachInput">Escribe tu pregunta</label>
      <input class="credit-coach-input" id="creditCoachInput" maxlength="700" autocomplete="off" placeholder="Escribe tu pregunta…">
      <button class="credit-coach-send" type="submit" aria-label="Enviar pregunta">➜</button>
    </form>
    <p class="credit-coach-legal" id="coachLegal">Orientación educativa; no sustituye asesoría financiera, legal o crediticia profesional.</p>`;

  document.body.append(launcher,panel);

  /* Textos de la interfaz por idioma. Cuando la conversación cambia de idioma,
     los botones de sugerencia, el marcador de escritura y el aviso legal
     cambian con ella: un panel que responde en italiano con los botones en
     español se siente a medio hacer. */
  const UI={
    es:{sugerencias:['Explicar mi carta','Revisar mi negocio'],placeholder:'Escribe tu pregunta…',
        legal:'Orientación educativa; no sustituye asesoría financiera, legal o crediticia profesional.',
        estado:'Asistente · en línea'},
    en:{sugerencias:['Explain my letter','Check my business'],placeholder:'Type your question…',
        legal:'Educational guidance; not a substitute for professional financial, legal or credit advice.',
        estado:'Assistant · online'},
    pt:{sugerencias:['Explicar minha carta','Revisar meu negócio'],placeholder:'Escreva sua pergunta…',
        legal:'Orientação educativa; não substitui aconselhamento profissional.',
        estado:'Assistente · online'},
    ht:{sugerencias:['Eksplike lèt mwen an','Verifye biznis mwen'],placeholder:'Ekri kesyon w lan…',
        legal:'Oryantasyon edikatif; li pa ranplase konsèy pwofesyonèl.',
        estado:'Asistan · an liy'},
    it:{sugerencias:['Spiegami la lettera','Controlla la mia attività'],placeholder:'Scrivi la tua domanda…',
        legal:'Orientamento educativo; non sostituisce una consulenza professionale.',
        estado:'Assistente · online'},
    fr:{sugerencias:['Expliquer ma lettre','Vérifier mon entreprise'],placeholder:'Écrivez votre question…',
        legal:'Information éducative ; ne remplace pas un conseil professionnel.',
        estado:'Assistant · en ligne'}
  };

  function aplicarIdiomaUI(idioma){
    const t=UI[idioma]||UI.es;
    const chips=panel.querySelectorAll('.coach-suggestion');
    // Los chips específicos de la página solo existen en español; al cambiar
    // de idioma se usan los generales, que sí están traducidos.
    if(idioma!=='es'){
      chips.forEach((b,i)=>{ if(t.sugerencias[i]) b.textContent=t.sugerencias[i]; });
    }
    const legal=panel.querySelector('#coachLegal');
    if(legal)legal.textContent=t.legal;
    const campo=panel.querySelector('.credit-coach-input');
    if(campo)campo.placeholder=t.placeholder;
    const sub=panel.querySelector('.credit-coach-title small');
    if(sub)sub.textContent=t.estado;
  }

  const close=panel.querySelector('.credit-coach-close');
  const messages=panel.querySelector('.credit-coach-messages');
  const form=panel.querySelector('.credit-coach-form');
  const input=panel.querySelector('.credit-coach-input');

  function toggle(open){
    panel.hidden=!open;
    launcher.setAttribute('aria-expanded',String(open));
    launcher.setAttribute('aria-label',open?'Cerrar Zyron':'Abrir Zyron, el asistente de Themora');
    if(open)setTimeout(()=>input.focus(),80);
  }

  const conversationHistory=[];

  // zyron-brain.js no depende de ningún servicio externo: cargarlo aquí hace
  // que Zyron conserve su conversación, idiomas y respuestas humanas incluso
  // en páginas que solo incluyen credit-coach.js o cuando no hay sesión.
  let brainPromise=null;
  function loadScript(src){
    return new Promise(resolve=>{
      const script=document.createElement('script');
      script.src=src;
      script.async=true;
      script.onload=()=>resolve(true);
      script.onerror=()=>resolve(false);
      document.head.appendChild(script);
    });
  }
  function ensureBrain(){
    if(window.ZyronBrain)return Promise.resolve(true);
    if(brainPromise)return brainPromise;
    // Las leyes (FDCPA y FCRA) van primero: el cerebro las suma al cargar.
    // Si ese archivo falla, Zyron sigue funcionando con el resto de sus temas.
    brainPromise=loadScript('zyron-leyes.js').then(()=>loadScript('zyron-brain.js')).then(()=>!!window.ZyronBrain);
    return brainPromise;
  }

  function containsSensitive(text){
    const raw=String(text||'');
    return /\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b/.test(raw) ||
      /\b(?:\d[ -]?){13,19}\b/.test(raw) ||
      /\b(?:cuenta|account|routing|aba)\b[^\n]{0,30}\d{6,}/i.test(raw) ||
      /\b(?:ssn|social security|seguro social)\b/i.test(raw) && /\d{3}/.test(raw);
  }

  /* Estado de la conversación: idioma en curso, si ya saludamos, el último
     tema y qué redacciones se usaron. El cerebro lo lee y lo actualiza, y por
     eso Zyron no vuelve a presentarse en el tercer mensaje ni repite la misma
     frase dos veces. Vive solo en memoria: al recargar la página se olvida. */
  const estado={idioma:'es',saludado:false,ultimoTema:null,usadas:{}};

  function addMessage(text,who='bot',links=null){
    const bubble=document.createElement('div');
    bubble.className=`coach-message ${who}`;
    bubble.textContent=text;
    if(links&&links.length){
      const linkWrap=document.createElement('div');
      linkWrap.className='coach-message-links';
      links.forEach(link=>{
        const anchor=document.createElement('a');
        anchor.className='coach-message-link';
        anchor.href=link.href;
        anchor.textContent=link.label;
        linkWrap.appendChild(anchor);
      });
      bubble.appendChild(linkWrap);
    }
    messages.appendChild(bubble);
    messages.scrollTop=messages.scrollHeight;
    return bubble;
  }

  function addTyping(){
    const bubble=document.createElement('div');
    bubble.className='coach-message bot coach-typing';
    bubble.innerHTML='<span></span><span></span><span></span>';
    bubble.setAttribute('aria-label','Zyron está escribiendo');
    messages.appendChild(bubble);
    messages.scrollTop=messages.scrollHeight;
    return bubble;
  }

  // Si hay sesión activa de Supabase, intenta usar el asistente con IA real
  // (netlify/functions/coach.js). Si no hay sesión, no está configurado, o
  // la llamada falla por cualquier razón, se usa siempre el asistente local
  // de respaldo — el chat nunca se queda sin responder.
  async function askAI(question){
    if(!window.CCAuth||!window.CCAuth.isConfigured)return null;
    const user=window.CCAuth.getUser&&window.CCAuth.getUser();
    const token=window.CCAuth.getAccessToken&&window.CCAuth.getAccessToken();
    if(!user||!token)return null;
    try{
      const res=await fetch('/.netlify/functions/coach',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({question,accessToken:token,history:conversationHistory,
          pagina:(location.pathname.split('/').pop()||'index.html'),
          idioma:estado.idioma})
      });
      if(!res.ok)return null;
      const data=await res.json();
      return data&&data.answer?data.answer:null;
    }catch(error){
      return null;
    }
  }

  // Busca en el índice de contenido del sitio (site-search-index.js) y
  // regresa hasta `limit` sugerencias de secciones reales, sin repetir
  // un link que ya viene incluido en `existingLinks`.
  function searchSiteSuggestions(question,existingLinks,limit){
    if(!window.ThemoraSearch)return [];
    const already=new Set((existingLinks||[]).map(l=>l.href));
    return window.ThemoraSearch.search(question,(limit||3)+already.size)
      .map(entry=>({href:entry.url,label:entry.title}))
      .filter(link=>!already.has(link.href))
      .slice(0,limit||3);
  }

  /* El asistente local vive en zyron-brain.js. Si por alguna razón ese archivo
     no cargó, se usa el motor viejo de palabras clave que queda más abajo — el
     chat nunca se queda mudo. */
  function answerLocal(raw){
    if(window.ZyronBrain){
      const r=window.ZyronBrain.responder(raw,estado);
      return {text:r.texto,links:r.enlaces||[],tema:r.tema,idioma:r.idioma};
    }
    const viejo=answerFallback(raw);
    return viejo?{text:viejo.text,links:viejo.link?[viejo.link]:[],tema:'legacy'}:null;
  }

  function answerFallback(raw){
    const question=raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    if(/mortgage|hipoteca|pago mensual|cuota|casa/.test(question)){
      return {text:'Para estimar una hipoteca necesitas el precio, pronto inicial, interés, plazo, impuestos, seguro y HOA. La calculadora suma esos componentes y separa principal e interés.',link:{href:'herramientas.html#calculadora-hipoteca',label:'Abrir calculadora hipotecaria →'}};
    }
    if(/analiz|reporte|pdf|word|excel|negativ|coleccion|collection/.test(question)){
      return {text:'Puedes analizar tu reporte directamente en la sección Crédito. El archivo se procesa en tu navegador y recibirás fortalezas, señales negativas y una estrategia priorizada.',link:{href:'credito.html#analizar-reporte',label:'Ir al analizador →'}};
    }
    if(/mejor|subir|puntaje|score|utilizacion|tarjeta|pago tardio|late/.test(question)){
      return {text:'Empieza por tres acciones: paga siempre a tiempo, reduce la utilización de tarjetas —idealmente por debajo de 30%, y revisa los tres reportes para corregir errores. Evita abrir varias cuentas en poco tiempo.',link:{href:'credito.html',label:'Ver fundamentos del crédito →'}};
    }
    if(/auto|carro|dealer|vehiculo/.test(question)){
      return {text:'Antes de financiar un auto, compara ofertas, revisa el APR y calcula el costo total, no solo el pago mensual. Una mejor entrada y un plazo más corto suelen reducir los intereses.',link:{href:'comprar-auto.html',label:'Ver guía de compra de auto →'}};
    }
    if(/listar|google maps|apple maps|mapa|aparecer|ficha|directorio/.test(question)){
      return {text:'Para que tu negocio aparezca en Google Maps y en Apple Maps hay que crear la ficha y luego verificar que el negocio es tuyo — Google suele hacerlo con una llamada o un documento, y Apple pide dos comprobaciones distintas. En Themora te lo configuramos sin que compartas contraseñas.',link:{href:'listar-negocio.html',label:'Ver cómo listar tu negocio →'}};
    }
    if(/llc|ein|formar|registrar|incorporar|abrir un negocio|permiso/.test(question)){
      return {text:'Formar tu negocio son dos trámites distintos: registrar la empresa (por ejemplo una LLC) ante el estado, y sacar el EIN, que es el número federal con el que el negocio paga impuestos y abre cuenta de banco. El EIN es gratis y se saca directo con el IRS — desconfía de quien te lo cobre como si fuera un permiso especial.',link:{href:'formar-negocio.html',label:'Ver cómo formar tu negocio →'}};
    }
    if(/disput|error|incorrect|fraude|robo/.test(question)){
      return {text:'Si ves información incorrecta, guarda evidencia, disputa directamente con el buró y el proveedor de la cuenta, y conserva números de confirmación. En casos de identidad, coloca alertas o congela tu crédito.'};
    }
    if(/hola|hello|buenos|ayuda|que puedes/.test(question)){
      return {text:'Puedo ayudarte a entender tu puntaje, priorizar mejoras, leer señales de un reporte, preparar la compra de casa o auto y calcular una hipoteca. Cuéntame cuál es tu meta.'};
    }
    return null;
  }

  const dormir=ms=>new Promise(r=>setTimeout(r,ms));

  /* Una respuesta larga que aparece instantánea se siente a máquina; una
     pausa proporcional al largo se siente a alguien escribiendo. Se acota
     para que nadie espere de más. */
  function ritmoDeEscritura(texto){
    const ms=380+String(texto||'').length*11;
    return Math.min(ms,1900);
  }

  /* Hay respuestas donde NO se deben sugerir otras páginas: si alguien
     saluda, pregunta si eres un robot o te da las gracias, empapelarlo con
     tarjetas de secciones es exactamente lo que hace que un chat se sienta
     un folleto. */
  const SIN_SUGERENCIAS=['saludo','comoEstas','gracias','adios','robot','quienEres',
    'groseria','sensible','idioma','fuera','glosario','frases','noEntiendo','vacio'];

  async function submitQuestion(value){
    const clean=String(value||'').trim();
    if(!clean)return;
    const sensitive=containsSensitive(clean);
    // No dejamos un identificador sensible visible ni en el historial del
    // navegador. Zyron sí recibe el texto localmente para advertir a la persona.
    addMessage(sensitive?'[Dato sensible oculto]':clean,'user');
    if(!sensitive)conversationHistory.push({role:'user',content:clean});
    input.value='';

    const typingBubble=addTyping();
    await ensureBrain();
    // Primero dejamos que el cerebro local detecte idioma, emoción y datos
    // sensibles. Así un SSN o número de tarjeta jamás llega al proveedor de IA.
    const local=answerLocal(clean);
    if(local&&local.idioma)aplicarIdiomaUI(local.idioma);
    const aiAnswer=sensitive ? null : await askAI(clean);

    if(aiAnswer){
      await dormir(Math.max(0,ritmoDeEscritura(aiAnswer)-400));
      typingBubble.remove();
      const links=searchSiteSuggestions(clean,null,2);
      addMessage(aiAnswer,'bot',links);
      conversationHistory.push({role:'assistant',content:aiAnswer});
      return;
    }

    const texto=local?local.text:'';
    await dormir(ritmoDeEscritura(texto));
    typingBubble.remove();

    if(local){
      let links=local.links||[];
      if(SIN_SUGERENCIAS.indexOf(local.tema)===-1){
        links=links.concat(searchSiteSuggestions(clean,links,2));
      }
      addMessage(local.text,'bot',links);
      aplicarIdiomaUI(estado.idioma);
      conversationHistory.push({role:'assistant',content:local.text});
      return;
    }

    const suggestions=searchSiteSuggestions(clean,null,3);
    const texto2=suggestions.length
      ? 'No tengo una respuesta preparada para eso y prefiero no inventarte. Esto del sitio podría acercarse:'
      : 'Ahí me perdí, y prefiero decírtelo. ¿Me lo cuentas de otra forma? Si es por un papel que te llegó, dime de quién viene.';
    addMessage(texto2,'bot',suggestions.length?suggestions:null);
    conversationHistory.push({role:'assistant',content:texto2});
  }

  launcher.addEventListener('click',()=>toggle(panel.hidden));
  close.addEventListener('click',()=>{toggle(false);launcher.focus();});
  form.addEventListener('submit',event=>{event.preventDefault();submitQuestion(input.value);});
  panel.querySelectorAll('.coach-suggestion').forEach(button=>button.addEventListener('click',()=>submitQuestion(button.textContent)));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){toggle(false);launcher.focus();}});

  /* Permite abrir a Zyron desde cualquier parte de la página — por ejemplo,
     desde el botón "Preguntarle a Zyron" de la franja de citas. */
  window.Zyron={
    open(){toggle(true);},
    close(){toggle(false);launcher.focus();},
    ask(question){toggle(true);if(question)submitQuestion(question);}
  };

  /* Cualquier botón de la página con data-zyron-ask abre a Zyron y le hace
     esa pregunta. Así la franja de citas puede ofrecer respuesta inmediata. */
  document.querySelectorAll('[data-zyron-ask]').forEach(button=>{
    button.addEventListener('click',()=>window.Zyron.ask(button.dataset.zyronAsk));
  });
})();
