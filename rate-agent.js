(() => {
  'use strict';

  const stateRows = [
    ['01','Alabama','AL',5.657],['02','Alaska','AK',5.832],['04','Arizona','AZ',5.683],['05','Arkansas','AR',5.434],
    ['06','California','CA',5.613],['08','Colorado','CO',5.682],['09','Connecticut','CT',5.471],['10','Delaware','DE',5.570],
    ['11','Distrito de Columbia','DC',5.832],['12','Florida','FL',5.419],['13','Georgia','GA',5.166],['15','Hawái','HI',5.064],
    ['16','Idaho','ID',5.731],['17','Illinois','IL',5.499],['18','Indiana','IN',5.802],['19','Iowa','IA',5.232],
    ['20','Kansas','KS',6.683],['21','Kentucky','KY',6.130],['22','Luisiana','LA',6.373],['23','Maine','ME',5.094],
    ['24','Maryland','MD',5.500],['25','Massachusetts','MA',6.255],['26','Michigan','MI',5.565],['27','Minnesota','MN',5.275],
    ['28','Misisipi','MS',5.225],['29','Misuri','MO',5.434],['30','Montana','MT',4.938],['31','Nebraska','NE',5.199],
    ['32','Nevada','NV',5.443],['33','Nuevo Hampshire','NH',5.675],['34','Nueva Jersey','NJ',5.562],['35','Nuevo México','NM',5.791],
    ['36','Nueva York','NY',5.941],['37','Carolina del Norte','NC',4.973],['38','Dakota del Norte','ND',5.403],['39','Ohio','OH',5.797],
    ['40','Oklahoma','OK',5.647],['41','Oregón','OR',6.001],['42','Pensilvania','PA',6.123],['44','Rhode Island','RI',5.539],
    ['45','Carolina del Sur','SC',5.452],['46','Dakota del Sur','SD',4.985],['47','Tennessee','TN',6.486],['48','Texas','TX',5.654],
    ['49','Utah','UT',6.391],['50','Vermont','VT',6.878],['51','Virginia','VA',5.252],['53','Washington','WA',5.595],
    ['54','Virginia Occidental','WV',5.512],['55','Wisconsin','WI',6.204],['56','Wyoming','WY',5.279]
  ];

  const embeddedData = {
    lastUpdated: '2026-08-14',
    national: { new: 5.832, used: 6.677 },
    states: Object.fromEntries(stateRows.map(([id,name,abbr,newRate]) => [id,{name,abbr,new:newRate,used:null}]))
  };
  const fallbackData = window.AUTO_RATES_DATA || embeddedData;

  const terms = {
    apr: {
      step: '1 · Empieza aquí', title: 'APR',
      text: 'Es el costo anual del crédito e incorpora la tasa de interés y ciertos cargos obligatorios. Para comparar ofertas, compara APR con APR.',
      question: '¿Este APR incluye todos los cargos obligatorios y coincide con la aprobación final del prestamista?'
    },
    finance: {
      step: '2 · Mira los dólares', title: 'Finance Charge',
      text: 'Es el total de intereses y ciertos cargos que pagarías durante toda la vida del préstamo si cumples cada pago a tiempo.',
      question: '¿Cuánto de este cargo puedo reducir con un plazo más corto, mayor enganche o mejor APR?'
    },
    amount: {
      step: '3 · Reconstruye la compra', title: 'Amount Financed',
      text: 'Es la cantidad que realmente estás financiando. Verifica que precio, impuestos, trade-in, enganche y productos adicionales produzcan este total.',
      question: '¿Me puede mostrar la itemización completa que llega exactamente a este amount financed?'
    },
    payments: {
      step: '4 · Ve hasta el final', title: 'Total of Payments',
      text: 'Es la suma de todos los pagos programados. Compárala con el amount financed para ver el peso del crédito en el costo final.',
      question: '¿Cuánto baja este total si elijo menos meses o elimino productos opcionales?'
    }
  };

  const el = id => document.getElementById(id);
  const pct = value => `${Number(value).toFixed(3)}%`;
  const longDate = iso => new Intl.DateTimeFormat('es-US',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${iso}T12:00:00Z`));
  const shortDate = iso => new Intl.DateTimeFormat('es-US',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(`${iso}T12:00:00Z`)).replace('.','');
  let activeData = fallbackData;

  const navToggle = el('navToggle');
  const navLinks = el('navLinks');
  navToggle?.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });

  document.querySelectorAll('.tila-field').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tila-field').forEach(item => item.classList.remove('is-active'));
      button.classList.add('is-active');
      const item = terms[button.dataset.term];
      document.querySelector('.reader-card .eyebrow').textContent = item.step;
      el('readerTitle').textContent = item.title;
      el('readerText').textContent = item.text;
      el('readerQuestion').textContent = item.question;
    });
  });

  function colorFor(rate) {
    if (rate < 5.4) return '#d7edf5';
    if (rate < 5.8) return '#8dccdf';
    if (rate < 6.2) return '#3a96b6';
    return '#075985';
  }

  function selectState(entry, isNational = false) {
    const used = entry.used ?? activeData.national.used;
    el('selectedState').textContent = entry.name || 'Estados Unidos';
    el('selectedNew').textContent = pct(entry.new);
    el('selectedUsed').textContent = pct(used);
    el('selectedUsedNote').textContent = !isNational && entry.used == null ? 'APR promedio nacional de referencia' : 'APR promedio';
    el('selectedDate').textContent = longDate(activeData.lastUpdated);
  }

  function tooltipHtml(entry) {
    const used = entry.used ?? activeData.national.used;
    return `<strong>${entry.name}</strong><span>Nuevo <b>${pct(entry.new)}</b></span><span>Usado <b>${pct(used)}</b></span>`;
  }

  function moveTooltip(event) {
    const tip = el('mapTooltip');
    tip.style.left = `${Math.min(event.clientX, window.innerWidth - 220)}px`;
    tip.style.top = `${Math.max(70,event.clientY)}px`;
  }

  function renderMap() {
    const positions = {
      AK:[1,1],ME:[12,1],VT:[10,2],NH:[11,2],
      WA:[1,3],ID:[2,3],MT:[3,3],ND:[4,3],MN:[5,3],WI:[6,3],MI:[7,3],NY:[9,3],MA:[10,3],RI:[11,3],CT:[12,3],
      OR:[1,4],NV:[2,4],WY:[3,4],SD:[4,4],IA:[5,4],IL:[6,4],IN:[7,4],OH:[8,4],PA:[9,4],NJ:[10,4],
      CA:[1,5],UT:[2,5],CO:[3,5],NE:[4,5],MO:[5,5],KY:[6,5],WV:[7,5],VA:[8,5],MD:[9,5],DE:[10,5],
      AZ:[2,6],NM:[3,6],KS:[4,6],AR:[5,6],TN:[6,6],NC:[8,6],SC:[9,6],
      OK:[4,7],LA:[5,7],MS:[6,7],AL:[7,7],GA:[8,7],
      HI:[1,8],TX:[4,8],FL:[9,8]
    };
    const map = el('usMap');
    const tip = el('mapTooltip');
    map.innerHTML = '';

    Object.values(activeData.states).filter(state => positions[state.abbr]).forEach(state => {
      const [column,row] = positions[state.abbr];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'state-tile';
      button.style.gridColumn = column;
      button.style.gridRow = row;
      button.style.background = colorFor(state.new);
      button.dataset.dark = String(state.new >= 5.8);
      button.innerHTML = `<span>${state.abbr}</span>`;
      button.setAttribute('aria-label', `${state.name}: nuevo ${pct(state.new)}, usado ${pct(state.used ?? activeData.national.used)}`);
      button.addEventListener('mouseenter', event => {
        tip.innerHTML = tooltipHtml(state);
        tip.hidden = false;
        moveTooltip(event);
      });
      button.addEventListener('mousemove', moveTooltip);
      button.addEventListener('mouseleave', () => { tip.hidden = true; });
      button.addEventListener('focus', () => {
        const rect = button.getBoundingClientRect();
        tip.innerHTML = tooltipHtml(state);
        tip.hidden = false;
        moveTooltip({clientX:rect.left + rect.width/2,clientY:rect.top + rect.height/2});
      });
      button.addEventListener('blur', () => { tip.hidden = true; });
      button.addEventListener('click', () => selectState(state));
      map.appendChild(button);
    });
    el('mapLoading').hidden = true;
  }

  function applyData(data, fromFile) {
    activeData = data;
    el('heroNew').textContent = pct(data.national.new);
    el('heroUsed').textContent = pct(data.national.used);
    el('heroDate').textContent = shortDate(data.lastUpdated);
    selectState({name:'Estados Unidos',new:data.national.new,used:data.national.used},true);
    const mode = fromFile ? 'Archivo de tasas sincronizado' : 'Datos locales cargados';
    const cadence = window.location.protocol === 'file:' ? 'Usa “Comprobar ahora” para recargar la actualización diaria.' : 'Nueva comprobación cada 15 minutos.';
    el('agentMessage').textContent = `${mode}. Publicación: ${longDate(data.lastUpdated)}. ${cadence}`;
    renderMap();
  }

  async function loadRates(force = false) {
    const button = el('refreshRates');
    button.disabled = true;
    button.textContent = 'Comprobando…';
    try {
      if (window.location.protocol === 'file:') throw new Error('Modo local');
      const response = await fetch(`auto-rates.json?v=${force ? Date.now() : Math.floor(Date.now()/900000)}`,{cache:'no-store'});
      if (!response.ok) throw new Error('Archivo no disponible');
      const data = await response.json();
      if (!data.national || !data.states) throw new Error('Formato inválido');
      applyData(data,true);
    } catch (error) {
      applyData(fallbackData,false);
    } finally {
      button.disabled = false;
      button.textContent = 'Comprobar ahora';
    }
  }

  el('refreshRates')?.addEventListener('click', () => {
    if (window.location.protocol === 'file:') window.location.reload();
    else loadRates(true);
  });
  loadRates();
  if (window.location.protocol !== 'file:') window.setInterval(() => loadRates(), 15 * 60 * 1000);
})();
