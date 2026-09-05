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
    'cartas-claras.html':['Entender una carta','Analizar mi reporte']
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
  launcher.setAttribute('aria-label','Abrir Kairon, el asistente de Themora');
  launcher.innerHTML=`<span class="credit-coach-avatar" aria-hidden="true">${SPARK_ICON}</span><span class="credit-coach-online" aria-hidden="true"></span><span class="credit-coach-tooltip" aria-hidden="true">Pregúntale a Kairon</span>`;

  const panel=document.createElement('section');
  panel.id='creditCoachPanel';
  panel.className='credit-coach-panel';
  panel.hidden=true;
  panel.setAttribute('aria-label','Asistente Kairon');
  panel.innerHTML=`
    <div class="credit-coach-header">
      <span class="credit-coach-avatar" aria-hidden="true">${SPARK_ICON}</span>
      <div class="credit-coach-title"><strong>Kairon</strong><small>Asistente inteligente · en línea</small></div>
      <button class="credit-coach-close" type="button" aria-label="Cerrar asistente">×</button>
    </div>
    <div class="credit-coach-messages" role="log" aria-live="polite" aria-relevant="additions">
      <div class="coach-message bot">¡Hola! Soy Kairon. Puedo orientarte sobre crédito, reportes, compra de casa o auto, y buscar la sección exacta del sitio que necesitas. ¿Qué quieres lograr?</div>
    </div>
    <div class="credit-coach-suggestions" aria-label="Preguntas sugeridas">
      ${currentPageSuggestions().map(s=>`<button class="coach-suggestion" type="button">${s}</button>`).join('')}
    </div>
    <form class="credit-coach-form">
      <label class="sr-only" for="creditCoachInput">Escribe tu pregunta</label>
      <input class="credit-coach-input" id="creditCoachInput" maxlength="300" autocomplete="off" placeholder="Escribe tu pregunta…">
      <button class="credit-coach-send" type="submit" aria-label="Enviar pregunta">➜</button>
    </form>
    <p class="credit-coach-legal">Orientación educativa; no sustituye asesoría financiera, legal o crediticia profesional.</p>`;

  document.body.append(launcher,panel);

  const close=panel.querySelector('.credit-coach-close');
  const messages=panel.querySelector('.credit-coach-messages');
  const form=panel.querySelector('.credit-coach-form');
  const input=panel.querySelector('.credit-coach-input');

  function toggle(open){
    panel.hidden=!open;
    launcher.setAttribute('aria-expanded',String(open));
    launcher.setAttribute('aria-label',open?'Cerrar Kairon':'Abrir Kairon, el asistente de Themora');
    if(open)setTimeout(()=>input.focus(),80);
  }

  const conversationHistory=[];

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
    bubble.setAttribute('aria-label','Kairon está escribiendo');
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
        body:JSON.stringify({question,accessToken:token,history:conversationHistory})
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

  function answer(raw){
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
    if(/disput|error|incorrect|fraude|robo/.test(question)){
      return {text:'Si ves información incorrecta, guarda evidencia, disputa directamente con el buró y el proveedor de la cuenta, y conserva números de confirmación. En casos de identidad, coloca alertas o congela tu crédito.'};
    }
    if(/hola|hello|buenos|ayuda|que puedes/.test(question)){
      return {text:'Puedo ayudarte a entender tu puntaje, priorizar mejoras, leer señales de un reporte, preparar la compra de casa o auto y calcular una hipoteca. Cuéntame cuál es tu meta.'};
    }
    return null;
  }

  async function submitQuestion(value){
    const clean=String(value||'').trim();
    if(!clean)return;
    addMessage(clean,'user');
    conversationHistory.push({role:'user',content:clean});
    input.value='';

    const typingBubble=addTyping();
    const aiAnswer=await askAI(clean);
    typingBubble.remove();

    if(aiAnswer){
      const links=searchSiteSuggestions(clean,null,2);
      addMessage(aiAnswer,'bot',links);
      conversationHistory.push({role:'assistant',content:aiAnswer});
      return;
    }

    const matched=answer(clean);
    if(matched){
      const links=searchSiteSuggestions(clean,matched.link?[matched.link]:null,2);
      const allLinks=matched.link?[matched.link,...links]:links;
      addMessage(matched.text,'bot',allLinks);
      conversationHistory.push({role:'assistant',content:matched.text});
      return;
    }

    const suggestions=searchSiteSuggestions(clean,null,3);
    if(suggestions.length){
      const text='No tengo una respuesta exacta preparada para eso, pero esto del sitio podría ayudarte:';
      addMessage(text,'bot',suggestions);
      conversationHistory.push({role:'assistant',content:text});
      return;
    }

    const fallback='Para darte una orientación útil, dime si tu pregunta es sobre puntaje, reporte de crédito, deudas, compra de casa, compra de auto o cálculo de mortgage. No incluyas números de cuenta ni información sensible.';
    addMessage(fallback,'bot');
    conversationHistory.push({role:'assistant',content:fallback});
  }

  launcher.addEventListener('click',()=>toggle(panel.hidden));
  close.addEventListener('click',()=>{toggle(false);launcher.focus();});
  form.addEventListener('submit',event=>{event.preventDefault();submitQuestion(input.value);});
  panel.querySelectorAll('.coach-suggestion').forEach(button=>button.addEventListener('click',()=>submitQuestion(button.textContent)));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){toggle(false);launcher.focus();}});
})();
