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

  /* ===== Mapa geográfico con relieve =====
     Cada estado es una pieza independiente: varias copias del contorno
     desplazadas hacia abajo hacen de "grosor" (las capas del costado) y
     encima va la cara superior con su etiqueta. Los estados se dibujan de
     norte a sur para que el grosor de uno nunca tape al vecino de abajo. */

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const DEPTH = [3, 6, 9, 12, 15];                // capas del costado, en unidades del lienzo
  const SHADE = [0.88, 0.79, 0.70, 0.61, 0.52];   // qué tan oscura va cada capa

  // Estados demasiado angostos para llevar la etiqueta encima:
  // el rótulo va afuera, en el Atlántico, con una línea guía.
  const OUTSIDE_LABELS = {
    RI: { x: 1000, y: 176 },
    NJ: { x: 1000, y: 226 },
    DE: { x: 1000, y: 272 }
  };

  /* Oscurece bajando la luminosidad y subiendo un poco la saturación, en vez
     de multiplicar el RGB hacia el negro: así el costado de cada estado
     conserva SU color en vez de volverse gris. */
  function darken(hex, factor) {
    const n = parseInt(hex.slice(1), 16);
    const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    const newL = Math.max(0.12, l * factor);
    const newS = Math.min(1, s * 1.18);
    return `hsl(${Math.round(h)} ${Math.round(newS * 100)}% ${Math.round(newL * 100)}%)`;
  }

  function svgEl(name, attrs) {
    const node = document.createElementNS(SVG_NS, name);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    return node;
  }

  function renderMap() {
    const shapes = window.US_STATE_SHAPES;
    const map = el('usMap');
    const tip = el('mapTooltip');
    map.innerHTML = '';

    if (!shapes) { el('mapLoading').textContent = 'No se pudo cargar el mapa.'; return; }

    const svg = svgEl('svg', {
      class: 'us-geo-svg',
      viewBox: '-10 -10 1065 645',
      role: 'group',
      'aria-label': 'Mapa de Estados Unidos con la tasa promedio de préstamo de auto nuevo por estado'
    });

    // De norte a sur: así el relieve de cada estado queda detrás del de abajo.
    const drawable = Object.entries(activeData.states)
      .filter(([id, state]) => shapes[id] && state)
      .sort((a, b) => shapes[a[0]].y - shapes[b[0]].y);

    drawable.forEach(([id, state]) => {
      const shape = shapes[id];
      const fill = colorFor(state.new);
      const used = state.used ?? activeData.national.used;

      const group = svgEl('g', {
        class: 'geo-state',
        tabindex: '0',
        role: 'button',
        'aria-label': `${state.name}: nuevo ${pct(state.new)}, usado ${pct(used)}`
      });
      group.dataset.abbr = state.abbr;

      // grosor: copias desplazadas hacia abajo, cada vez más oscuras
      DEPTH.forEach((offset, index) => {
        group.appendChild(svgEl('path', {
          class: 'geo-side',
          d: shape.d,
          fill: darken(fill, SHADE[index]),
          transform: `translate(0 ${offset})`
        }));
      });

      // cara superior + etiqueta (esto es lo que se levanta al pasar el cursor)
      const face = svgEl('g', { class: 'geo-face' });
      face.appendChild(svgEl('path', { class: 'geo-top', d: shape.d, fill }));

      const outside = OUTSIDE_LABELS[state.abbr];
      if (outside) {
        face.appendChild(svgEl('line', {
          class: 'geo-leader',
          x1: shape.x + shape.w / 2 + 2, y1: shape.y,
          x2: outside.x - 5, y2: outside.y - 4
        }));
      }
      const label = svgEl('text', {
        class: outside ? 'geo-label geo-label-out' : 'geo-label',
        x: outside ? outside.x : shape.x,
        y: outside ? outside.y : shape.y
      });
      label.textContent = state.abbr;
      face.appendChild(label);
      group.appendChild(face);

      group.addEventListener('mouseenter', event => {
        tip.innerHTML = tooltipHtml(state);
        tip.hidden = false;
        moveTooltip(event);
      });
      group.addEventListener('mousemove', moveTooltip);
      group.addEventListener('mouseleave', () => { tip.hidden = true; });
      group.addEventListener('focus', () => {
        const rect = group.getBoundingClientRect();
        tip.innerHTML = tooltipHtml(state);
        tip.hidden = false;
        moveTooltip({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
      });
      group.addEventListener('blur', () => { tip.hidden = true; });
      group.addEventListener('click', () => {
        svg.querySelectorAll('.geo-state.is-selected').forEach(node => node.classList.remove('is-selected'));
        group.classList.add('is-selected');
        selectState(state);
      });
      group.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); group.click(); }
      });

      svg.appendChild(group);
    });

    map.appendChild(svg);
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
