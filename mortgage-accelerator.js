/* ===========================================================================
   Acelerador de hipoteca — calcula en los dos sentidos:

   · Si la persona elige la FECHA en que quiere terminar, calcula cuánto tiene
     que poner de más cada mes y cada semana.
   · Si escribe cuánto puede poner de más (al mes o a la semana), calcula en
     qué fecha terminaría.

   Todo lo que se calcula aquí es ADICIONAL al pago normal de la hipoteca, y
   solo sobre capital e interés: el escrow (impuestos y seguro) no se toca.
   =========================================================================== */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  if (!$('accBalance')) return; // esta página no tiene la herramienta

  const SEMANAS_POR_MES = 52 / 12;
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio',
                 'agosto','septiembre','octubre','noviembre','diciembre'];

  /* ---------- matemática (validada contra casos conocidos) ---------- */

  // Pago mensual de capital e interés para saldar B en n meses a tasa mensual i
  function pagoMensual(B, i, n) {
    if (n <= 0) return B;
    if (i === 0) return B / n;
    return (B * i) / (1 - Math.pow(1 + i, -n));
  }

  // Meses que toma saldar B pagando P al mes.
  // null si el pago no alcanza ni para cubrir el interés (nunca terminaría).
  function mesesPara(B, i, P) {
    if (P <= 0) return null;
    if (i === 0) return B / P;
    if (P <= B * i) return null;
    return -Math.log(1 - (B * i) / P) / Math.log(1 + i);
  }

  /* ---------- formato ---------- */

  const dinero = v => '$' + Math.round(v).toLocaleString('en-US');
  const dineroExacto = v => '$' + v.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});

  function textoMeses(n) {
    const total = Math.round(n);
    const años = Math.floor(total / 12), meses = total % 12;
    const partes = [];
    if (años) partes.push(años + (años === 1 ? ' año' : ' años'));
    if (meses) partes.push(meses + (meses === 1 ? ' mes' : ' meses'));
    return partes.length ? partes.join(' y ') : 'menos de un mes';
  }

  const nombreFecha = d => MESES[d.getMonth()] + ' de ' + d.getFullYear();

  // Meses entre dos fechas contando solo mes y año
  const mesesEntre = (desde, hasta) =>
    (hasta.getFullYear() - desde.getFullYear()) * 12 + (hasta.getMonth() - desde.getMonth());

  function sumarMeses(fecha, n) {
    const d = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
    d.setMonth(d.getMonth() + Math.round(n));
    return d;
  }

  /* ---------- armar los menús de mes y año ---------- */

  const hoy = new Date();
  const mesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  function llenarSelectores(selMes, selAño, añoDesde, añoHasta) {
    selMes.innerHTML = MESES.map((m, idx) =>
      `<option value="${idx}">${m.charAt(0).toUpperCase() + m.slice(1)}</option>`).join('');
    let html = '';
    for (let a = añoDesde; a <= añoHasta; a++) html += `<option value="${a}">${a}</option>`;
    selAño.innerHTML = html;
  }

  const endMonth = $('accEndMonth'), endYear = $('accEndYear');
  const targetMonth = $('accTargetMonth'), targetYear = $('accTargetYear');

  llenarSelectores(endMonth, endYear, hoy.getFullYear(), hoy.getFullYear() + 45);
  llenarSelectores(targetMonth, targetYear, hoy.getFullYear(), hoy.getFullYear() + 45);
  // Sin elegir nada, ambas fechas arrancan en blanco para no sugerir un dato falso
  endMonth.insertAdjacentHTML('afterbegin', '<option value="" selected>Mes</option>');
  endYear.insertAdjacentHTML('afterbegin', '<option value="" selected>Año</option>');
  targetMonth.insertAdjacentHTML('afterbegin', '<option value="" selected>Mes</option>');
  targetYear.insertAdjacentHTML('afterbegin', '<option value="" selected>Año</option>');

  const leerFecha = (selMes, selAño) => {
    const m = selMes.value, a = selAño.value;
    if (m === '' || a === '') return null;
    return new Date(Number(a), Number(m), 1);
  };

  /* ---------- elementos ---------- */

  const balanceInput = $('accBalance'), aprInput = $('accApr');
  const extraMensual = $('accExtraMonthly'), extraSemanal = $('accExtraWeekly');
  const aviso = $('accWarning');
  const campos = {
    fecha: $('accFieldTarget'),
    mensual: $('accFieldMonthly'),
    semanal: $('accFieldWeekly')
  };

  let origen = null;        // cuál de los tres escribió la persona
  let actualizando = false; // evita que un cambio nuestro dispare otro cálculo

  function marcarCalculados() {
    Object.keys(campos).forEach(k => {
      campos[k].classList.toggle('is-calculated', origen !== null && k !== origen);
    });
  }

  function mostrarAviso(texto) {
    aviso.textContent = texto || '';
    aviso.hidden = !texto;
  }

  function limpiarSalida(mensaje) {
    $('accOutput').hidden = true;
    $('accEmpty').hidden = false;
    if (mensaje) $('accEmpty').textContent = mensaje;
  }

  function limpiarCalculados() {
    actualizando = true;
    if (origen !== 'mensual') extraMensual.value = '';
    if (origen !== 'semanal') extraSemanal.value = '';
    if (origen !== 'fecha') { targetMonth.value = ''; targetYear.value = ''; }
    actualizando = false;
  }

  /* ---------- el cálculo ---------- */

  function calcular() {
    if (actualizando) return;

    const B = parseFloat(balanceInput.value);
    const apr = parseFloat(aprInput.value);
    const fechaFin = leerFecha(endMonth, endYear);

    // ¿Están los tres datos base?
    if (!(B > 0) || isNaN(apr) || apr < 0 || !fechaFin) {
      $('accCurrent').hidden = true;
      mostrarAviso('');
      limpiarSalida('Llena tus datos arriba y elige una de las tres opciones. Aquí verás cuánto tiempo te ahorras y cuánto interés dejas de pagar.');
      return;
    }

    const i = apr / 100 / 12;
    const nRestantes = mesesEntre(mesActual, fechaFin);

    if (nRestantes <= 0) {
      $('accCurrent').hidden = true;
      mostrarAviso('La fecha de terminación que pusiste ya pasó o es este mes. Revisa el año.');
      limpiarSalida('Revisa la fecha de terminación.');
      return;
    }

    const P = pagoMensual(B, i, nRestantes);
    $('accPayment').textContent = dinero(P);
    $('accRemaining').textContent = textoMeses(nRestantes);
    $('accCurrent').hidden = false;

    // ── Según lo que escribió la persona, sacamos el extra mensual ──
    let extra = null;

    if (origen === 'fecha') {
      const objetivo = leerFecha(targetMonth, targetYear);
      if (!objetivo) { mostrarAviso(''); limpiarSalida(); return; }
      const nObjetivo = mesesEntre(mesActual, objetivo);
      if (nObjetivo <= 0) {
        mostrarAviso('Esa fecha ya pasó o es este mes. Elige una fecha futura.');
        limpiarSalida('Elige una fecha futura.');
        return;
      }
      if (nObjetivo >= nRestantes) {
        mostrarAviso('Esa fecha es igual o posterior a la que ya tienes, así que no haría falta pagar de más. Elige una fecha más cercana para ver cuánto tendrías que poner.');
        limpiarSalida('Elige una fecha anterior a tu fecha de terminación actual.');
        return;
      }
      extra = pagoMensual(B, i, nObjetivo) - P;
      actualizando = true;
      extraMensual.value = Math.ceil(extra);
      extraSemanal.value = Math.ceil(extra / SEMANAS_POR_MES);
      actualizando = false;

    } else if (origen === 'mensual' || origen === 'semanal') {
      const escrito = parseFloat(origen === 'mensual' ? extraMensual.value : extraSemanal.value);
      if (!(escrito > 0)) { mostrarAviso(''); limpiarSalida(); limpiarCalculados(); return; }
      extra = origen === 'mensual' ? escrito : escrito * SEMANAS_POR_MES;
      actualizando = true;
      if (origen === 'mensual') extraSemanal.value = (extra / SEMANAS_POR_MES).toFixed(2);
      else extraMensual.value = extra.toFixed(2);
      actualizando = false;

    } else {
      mostrarAviso('');
      limpiarSalida();
      return;
    }

    // ── Con el extra ya conocido, calculamos la fecha nueva ──
    const nNuevo = mesesPara(B, i, P + extra);
    if (nNuevo === null || !isFinite(nNuevo)) {
      mostrarAviso('Con esos números no se puede calcular. Revisa el balance y la tasa.');
      limpiarSalida('Revisa los datos.');
      return;
    }

    const mesesAhorrados = nRestantes - nNuevo;
    if (mesesAhorrados < 0.5) {
      mostrarAviso('Ese monto es tan pequeño que no alcanza a adelantar ni un mes. Prueba con un poco más.');
      limpiarSalida('Prueba con un monto un poco mayor.');
      return;
    }

    const fechaNueva = sumarMeses(mesActual, nNuevo);
    if (origen !== 'fecha') {
      actualizando = true;
      targetMonth.value = String(fechaNueva.getMonth());
      targetYear.value = String(fechaNueva.getFullYear());
      actualizando = false;
    }

    const interesOriginal = P * nRestantes - B;
    const interesNuevo = (P + extra) * nNuevo - B;

    $('accSaved').innerHTML = textoMeses(mesesAhorrados) + '<span>menos de hipoteca</span>';
    $('accNewDate').textContent = nombreFecha(origen === 'fecha' ? leerFecha(targetMonth, targetYear) : fechaNueva);
    $('accOldDate').textContent = nombreFecha(fechaFin);
    $('accTotalMonthly').textContent = dinero(P + extra);
    $('accInterestSaved').textContent = dinero(Math.max(0, interesOriginal - interesNuevo));
    $('accNote').textContent = 'Son ' + dineroExacto(extra) + ' extra al mes, o ' +
      dineroExacto(extra / SEMANAS_POR_MES) + ' a la semana — la misma cantidad al año, repartida distinto. ' +
      'Si pagas semanal, el dinero entra antes y en la práctica terminarías un poquito más rápido de lo que dice aquí.';

    $('accOutput').hidden = false;
    $('accEmpty').hidden = true;
    mostrarAviso('');
  }

  /* ---------- qué escuchar ---------- */

  function marcarOrigen(cual) {
    return () => {
      if (actualizando) return;
      origen = cual;
      marcarCalculados();
      limpiarCalculados();
      calcular();
    };
  }

  [balanceInput, aprInput].forEach(el => el.addEventListener('input', calcular));
  [endMonth, endYear].forEach(el => el.addEventListener('change', calcular));

  [targetMonth, targetYear].forEach(el => el.addEventListener('change', marcarOrigen('fecha')));
  extraMensual.addEventListener('input', marcarOrigen('mensual'));
  extraSemanal.addEventListener('input', marcarOrigen('semanal'));

  $('accReset').addEventListener('click', () => {
    actualizando = true;
    [balanceInput, aprInput, extraMensual, extraSemanal].forEach(el => { el.value = ''; });
    [endMonth, endYear, targetMonth, targetYear].forEach(el => { el.value = ''; });
    actualizando = false;
    origen = null;
    marcarCalculados();
    mostrarAviso('');
    $('accCurrent').hidden = true;
    limpiarSalida('Llena tus datos arriba y elige una de las tres opciones. Aquí verás cuánto tiempo te ahorras y cuánto interés dejas de pagar.');
    balanceInput.focus();
  });

  // Se expone para poder probarlo automáticamente
  window.AceleradorHipoteca = { pagoMensual, mesesPara, SEMANAS_POR_MES };
})();
