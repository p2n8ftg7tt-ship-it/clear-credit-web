(()=>{
  'use strict';
  const byId=id=>document.getElementById(id);
  const numeric=input=>Math.max(0,Number(input.value)||0);
  const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number.isFinite(value)?value:0);
  const pct=value=>`${(Number.isFinite(value)?value:0).toFixed(0)}%`;

  // ---- Simulador de utilización de crédito ----
  (function(){
    const balance=byId('utilBalance'),limit=byId('utilLimit'),payment=byId('utilPayment');
    if(!balance||!limit||!payment)return;
    const box=byId('utilResultBox'),big=byId('utilCurrentPct'),note=byId('utilNote');

    function band(p){return p<10?'green':p<=30?'amber':'red';}
    function guidance(p){
      if(p<10)return 'Excelente — tu utilización está en un rango que ayuda a tu puntaje.';
      if(p<=30)return 'Aceptable, pero bajarla por debajo de 10% suele mejorar tu puntaje más rápido.';
      return 'Alta — una utilización por encima de 30% suele bajar tu puntaje. Intenta pagar más antes de la fecha de corte.';
    }
    function calc(){
      const b=numeric(balance),l=Math.max(1,numeric(limit)),extraPay=numeric(payment);
      const pay=Math.min(extraPay,b);
      const currentPct=(b/l)*100;
      const projectedPct=((b-pay)/l)*100;
      const showProjected=extraPay>0;
      const activePct=showProjected?projectedPct:currentPct;
      box.className='qc-result band-'+band(activePct);
      big.innerHTML=showProjected
        ? `${pct(projectedPct)}<span>uso después de pagar (hoy: ${pct(currentPct)})</span>`
        : `${pct(currentPct)}<span>uso actual</span>`;
      note.textContent=guidance(activePct);
    }
    [balance,limit,payment].forEach(el=>{el.addEventListener('input',calc);el.addEventListener('change',calc);});
    calc();
  })();

  // ---- Deuda a ingreso (DTI) ----
  (function(){
    const income=byId('dtiIncome'),debts=byId('dtiDebts');
    if(!income||!debts)return;
    const box=byId('dtiResultBox'),big=byId('dtiPct'),note=byId('dtiNote');

    function band(p){return p<=36?'green':p<=43?'amber':'red';}
    function guidance(p){
      if(p<=36)return 'En un rango saludable — la mayoría de los prestamistas ven esto con buenos ojos.';
      if(p<=43)return 'Está en el límite — muchos préstamos hipotecarios aceptan hasta 43%, pero con menos opciones.';
      return 'Alta — por encima de 43% es difícil calificar para una hipoteca convencional. Bajar deuda ayuda antes de solicitar.';
    }
    function calc(){
      const inc=Math.max(1,numeric(income)),debt=numeric(debts);
      const ratio=(debt/inc)*100;
      box.className='qc-result band-'+band(ratio);
      big.innerHTML=`${pct(ratio)}<span>deuda-a-ingreso</span>`;
      note.textContent=guidance(ratio);
    }
    [income,debts].forEach(el=>{el.addEventListener('input',calc);el.addEventListener('change',calc);});
    calc();
  })();

  // ---- Pagar tarjeta de crédito ----
  (function(){
    const balanceInput=byId('payoffBalance'),aprInput=byId('payoffApr'),paymentInput=byId('payoffPayment');
    if(!balanceInput||!aprInput||!paymentInput)return;
    const monthsEl=byId('payoffMonths'),interestEl=byId('payoffInterest'),warning=byId('payoffWarning'),box=byId('payoffResultBox');

    function calc(){
      let bal=numeric(balanceInput);
      const rate=numeric(aprInput)/100/12;
      const pay=numeric(paymentInput);
      const monthlyInterestOnStart=bal*rate;

      if(bal>0&&pay<=monthlyInterestOnStart){
        warning.hidden=false;
        box.className='qc-result band-red';
        monthsEl.innerHTML='—<span>meses para pagarla</span>';
        interestEl.textContent='—';
        return;
      }
      warning.hidden=true;
      let months=0,totalInterest=0;
      while(bal>0&&months<1200){
        const interest=bal*rate;
        totalInterest+=interest;
        bal=bal+interest-pay;
        months++;
        if(bal<0)bal=0;
      }
      box.className='qc-result band-'+(months<=18?'green':months<=36?'amber':'red');
      monthsEl.innerHTML=`${months}<span>meses para pagarla</span>`;
      interestEl.textContent=money(totalInterest);
    }
    [balanceInput,aprInput,paymentInput].forEach(el=>{el.addEventListener('input',calc);el.addEventListener('change',calc);});
    calc();
  })();
})();
