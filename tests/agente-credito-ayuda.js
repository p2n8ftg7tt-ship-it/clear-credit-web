/* Entorno simulado para las pruebas del agente de crédito (spec 017).
   Simula Supabase (sesión y contador) y Anthropic con respuestas guionizadas.
   No termina en .test.js: node --test no lo ejecuta solo. */
const fs = require('node:fs');
const path = require('node:path');
const { crearHandler } = require('../netlify/functions/agente-credito.js');
const C = require('../agente-credito-cliente.js');
const H = require('../herramientas-credito.js');

const ENV = {
  ANTHROPIC_API_KEY: 'k', AGENTE_CREDITO_SECRETO: 'secreto-de-prueba',
  SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'srv'
};
const AHORA = Date.UTC(2026, 9, 1, 15, 0, 0); // 2026-10-01 11:00 hora del Este

const respuesta = (status, datos) => ({ ok: status >= 200 && status < 300, status, json: async () => datos });

function crearEntorno(opc) {
  const o = opc || {};
  const llamadas = { anthropic: [], rpc: 0, llamar: 0, logs: [] };
  const guion = (o.respuestasIA || []).slice();
  let reloj = o.ahora || AHORA;
  const fetch = async (url, init) => {
    init = init || {};
    if (url.endsWith('/auth/v1/user')) {
      const token = String(init.headers.Authorization).replace('Bearer ', '');
      if (token === 'malo') return respuesta(401, {});
      return respuesta(200, { id: token === 'otra' ? 'u2' : 'u1' });
    }
    if (url.endsWith('/rest/v1/rpc/credito_agente_consumir')) {
      llamadas.rpc++;
      if (o.rpc === 'error') return respuesta(500, {});
      return respuesta(200, o.rpc === false ? false : true);
    }
    if (url.endsWith('/rest/v1/rpc/credito_agente_llamar')) {
      llamadas.llamar++;
      if (o.llamar === 'error') return respuesta(500, {});
      return respuesta(200, llamadas.llamar <= (o.limiteLlamadas || 24));
    }
    if (url === 'https://api.anthropic.com/v1/messages') {
      llamadas.anthropic.push({ headers: init.headers, body: JSON.parse(init.body) });
      const siguiente = guion.shift();
      if (typeof siguiente === 'function') return siguiente();
      if (!siguiente) throw new Error('guion de IA agotado');
      return respuesta(200, siguiente);
    }
    throw new Error('url inesperada: ' + url);
  };
  const handler = crearHandler({ fetch, ahora: () => reloj, entorno: Object.assign({}, ENV, o.entorno || {}), log: (...a) => llamadas.logs.push(a.join(' ')) });
  return { handler, llamadas, mover: (ms) => { reloj += ms; } };
}

const post = (handler, cuerpo) => handler({ httpMethod: 'POST', body: JSON.stringify(cuerpo) })
  .then((r) => ({ status: r.statusCode, cuerpo: JSON.parse(r.body) }));

const pideHerramientas = (pedidos) => ({
  stop_reason: 'tool_use',
  content: [{ type: 'thinking', thinking: '', signature: 'firma-1' }]
    .concat(pedidos.map((p, i) => ({ type: 'tool_use', id: 'toolu_' + i, name: p[0], input: p[1] || {} })))
});
const termina = (resultado) => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: typeof resultado === 'string' ? resultado : JSON.stringify(resultado) }] });

const PEDIDOS_ACME = [['calcularFechaSalida', { cuenta: 'A' }], ['calcularFechaSalida', { cuenta: 'B' }], ['calcularUtilizacion'], ['buscarPosiblesDuplicados'], ['contarConsultasDuras', { meses: 12 }]];

const RESULTADO_VALIDO = {
  diagnostico: 'Tu reporte tiene dos puntos importantes. La deuda de ACME BANK parece aparecer dos veces con saldo. Tu tarjeta NOVA CARD usa casi todo su límite.',
  plan: [
    { tipo: 'disputar', cuentas: ['A'], hechos: [{ cuenta: 'A', dato: 'saldo $1,284', fuente: 'reporte' }, { cuenta: 'A', dato: 'comentario: Account sold to another lender', fuente: 'reporte' }], interpretacion: 'Una cuenta vendida normalmente muestra saldo cero.', accion: 'Puedes pedirle al buró que revise el saldo de la cuenta A.' },
    { tipo: 'pagar', cuentas: ['C'], hechos: [{ cuenta: 'C', dato: 'utilización 89%', fuente: 'herramienta' }], interpretacion: 'Usar casi todo el límite suele pesar en el perfil.', accion: 'Bajar el saldo de la cuenta C puede ayudar.' },
    { tipo: 'esperar', cuentas: ['B'], hechos: [{ cuenta: 'B', dato: 'salida estimada 2028-09', fuente: 'herramienta' }], interpretacion: 'Es una estimación mensual porque el DOFD no trae día.', accion: 'Antes de pagarla, consulta el plazo de prescripción de tu estado.' }
  ],
  despues: [],
  preguntasParaTi: ['¿Recibiste una carta de ZETA COLLECTIONS en los últimos 30 días?'],
  verificar: ['Confirma en tu reporte original que las cuentas A y B son la misma deuda.'],
  datosPersonales: [],
  cartas: [{ tipo: 'bureau-dispute', cuentas: [{ letra: 'A', motivo: 'wrong-amount' }], subtipo: 'no_aplica', etiquetas: [] }]
};

function acme() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'credito', 'agente', 'acme-zeta.json'), 'utf8'));
}

/* Los tool_result que mandaría el navegador para unos pedidos. */
function resultadosPara(pedidos, paraHerramientas, hoy) {
  return pedidos.map((p) => {
    const opciones = p.nombre === 'calcularFechaSalida' ? { hoy, cuentaId: p.entrada.cuenta }
      : p.nombre === 'contarConsultasDuras' ? { hoy, meses: p.entrada.meses } : {};
    return { type: 'tool_result', tool_use_id: p.id, content: JSON.stringify(H.ejecutar(p.nombre, paraHerramientas, opciones)) };
  });
}

module.exports = { ENV, AHORA, crearEntorno, post, pideHerramientas, termina, PEDIDOS_ACME, RESULTADO_VALIDO, acme, resultadosPara, C };
