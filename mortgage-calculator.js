(()=>{
  'use strict';
  const form=document.getElementById('mortgageCalculator');
  if(!form)return;

  const byId=id=>document.getElementById(id);
  const fields={
    price:byId('mortgagePrice'),down:byId('mortgageDown'),rate:byId('mortgageRate'),term:byId('mortgageTerm'),
    tax:byId('mortgageTax'),insurance:byId('mortgageInsurance'),hoa:byId('mortgageHoa')
  };
  const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number.isFinite(value)?value:0);
  const numeric=input=>Math.max(0,Number(input.value)||0);
  const saveButton=byId('mortgageSaveButton');
  const saveHint=byId('mortgageSaveHint');

  function calculate(){
    const price=numeric(fields.price);
    const downPercent=Math.min(100,numeric(fields.down));
    const rate=numeric(fields.rate);
    const annualRate=rate/100;
    const years=numeric(fields.term)||30;
    const annualTax=numeric(fields.tax);
    const annualInsurance=numeric(fields.insurance);
    const hoa=numeric(fields.hoa);
    const downAmount=price*(downPercent/100);
    const loan=Math.max(0,price-downAmount);
    const payments=years*12;
    const monthlyRate=annualRate/12;
    const principalInterest=loan===0?0:monthlyRate===0?loan/payments:loan*(monthlyRate*Math.pow(1+monthlyRate,payments))/(Math.pow(1+monthlyRate,payments)-1);
    const monthlyTax=annualTax/12;
    const monthlyInsurance=annualInsurance/12;
    const totalMonthly=principalInterest+monthlyTax+monthlyInsurance+hoa;
    const totalInterest=Math.max(0,principalInterest*payments-loan);

    byId('mortgageMonthly').innerHTML=`${money(totalMonthly)} <span>/ mes</span>`;
    byId('mortgagePI').textContent=money(principalInterest);
    byId('mortgageMonthlyTax').textContent=money(monthlyTax);
    byId('mortgageMonthlyInsurance').textContent=money(monthlyInsurance);
    byId('mortgageMonthlyHoa').textContent=money(hoa);
    byId('mortgageLoan').textContent=money(loan);
    byId('mortgageDownAmount').textContent=money(downAmount);
    byId('mortgageInterestTotal').textContent=money(totalInterest);

    window.__ccLastMortgage={price,downPercent,rate,years,loan,totalMonthly};
  }

  form.addEventListener('input',calculate);
  form.addEventListener('change',calculate);
  calculate();

  if(saveButton&&window.CCAuth){
    window.CCAuth.onChange(function(user){
      const loggedIn=!!user;
      saveButton.hidden=!loggedIn;
      if(saveHint)saveHint.hidden=loggedIn;
    });

    saveButton.addEventListener('click',async function(){
      if(!window.__ccLastMortgage)return;
      saveButton.disabled=true;
      const originalText=saveButton.textContent;
      saveButton.textContent='Guardando…';
      try{
        await window.CCAuth.saveMortgage(window.__ccLastMortgage);
        saveButton.textContent='Guardado ✓';
        setTimeout(()=>{ saveButton.textContent=originalText; saveButton.disabled=false; },2200);
      }catch(err){
        alert('No pudimos guardar este cálculo. Intenta de nuevo.');
        saveButton.textContent=originalText;
        saveButton.disabled=false;
      }
    });
  }
})();
