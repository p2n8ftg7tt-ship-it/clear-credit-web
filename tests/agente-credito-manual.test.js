/* Manual del agente de crédito (spec 017). Ejecutar: node --test tests/agente-credito-manual.test.js */
const test = require('node:test');
const assert = require('node:assert');
const M = require('../netlify/functions/lib/agente-credito-manual.js');
const H = require('../herramientas-credito.js');

test('las herramientas del agente son exactamente las del catálogo de la spec 016 (Principio IV)', () => {
  assert.deepStrictEqual(M.HERRAMIENTAS.map((h) => h.name), H.CATALOGO.map((c) => c.nombre));
});

test('cada herramienta es estricta y su esquema está cerrado', () => {
  M.HERRAMIENTAS.forEach((h) => {
    assert.strictEqual(h.strict, true, h.name);
    assert.strictEqual(h.input_schema.additionalProperties, false, h.name);
    assert.deepStrictEqual(h.input_schema.required.slice().sort(), Object.keys(h.input_schema.properties).sort(), h.name);
    assert.ok(h.description.length > 40, h.name);
  });
});

test('el esquema del resultado exige los seis campos y cierra todos los objetos', () => {
  const E = M.ESQUEMA_RESULTADO;
  assert.deepStrictEqual(E.required, ['diagnostico', 'plan', 'despues', 'preguntasParaTi', 'verificar', 'datosPersonales']);
  (function cerrado(s) {
    if (s && s.type === 'object') { assert.strictEqual(s.additionalProperties, false); Object.values(s.properties).forEach(cerrado); }
    if (s && s.type === 'array') cerrado(s.items);
  })(E);
  assert.deepStrictEqual(E.properties.plan.items.properties.tipo.enum, ['disputar', 'pagar', 'esperar', 'proteger', 'revisar']);
});

test('el manual trae las correcciones de FR-012 y no las reglas viejas', () => {
  assert.match(M.MANUAL, /180 días/);
  assert.match(M.MANUAL, /estimación/);
  assert.match(M.MANUAL, /política del buró/);
  assert.doesNotMatch(M.MANUAL, /menos de 30\s?%/);
  assert.doesNotMatch(M.MANUAL, /\d{2}\/\d{2}\/\d{4}|202\d-\d{2}-\d{2}/, 'sin fechas variables: el manual va en caché');
  ['calcularFechaSalida', 'calcularUtilizacion', 'buscarPosiblesDuplicados', 'contarConsultasDuras', '<reporte>'].forEach((x) => assert.ok(M.MANUAL.includes(x), x));
});
const fs = require('node:fs');
const path = require('node:path');
const RAIZ = path.join(__dirname, '..');

test('configuración: SQL del contador, instrucciones y redirección 404 (FR-027)', () => {
  const sql = fs.readFileSync(path.join(RAIZ, 'supabase-schema.sql'), 'utf8');
  assert.match(sql, /create table if not exists public\.credito_agente_uso/);
  assert.match(sql, /primary key \(user_id, dia\)/);
  assert.match(sql, /alter table public\.credito_agente_uso enable row level security/);
  assert.match(sql, /create or replace function public\.credito_agente_consumir\(p_user uuid, p_dia date, p_limite integer\)/);
  assert.match(sql, /on conflict \(user_id, dia\) do update set veces = u\.veces \+ 1 where u\.veces < p_limite/);
  assert.match(sql, /revoke all on function public\.credito_agente_consumir\(uuid, date, integer\) from public, anon, authenticated/);
  assert.match(sql, /llamadas integer not null default 0/);
  assert.match(sql, /create or replace function public\.credito_agente_llamar\(p_user uuid, p_dia date, p_limite integer\)/);
  assert.match(sql, /set llamadas = llamadas \+ 1\s+where user_id = p_user and dia = p_dia and llamadas < p_limite/);
  assert.match(sql, /revoke all on function public\.credito_agente_llamar\(uuid, date, integer\) from public, anon, authenticated/);
  const toml = fs.readFileSync(path.join(RAIZ, 'netlify.toml'), 'utf8');
  assert.match(toml, /from = "\/INSTRUCCIONES-AGENTE-CREDITO\.md"\s+to = "\/index\.html"\s+status = 404\s+force = true/);
  const ins = fs.readFileSync(path.join(RAIZ, 'INSTRUCCIONES-AGENTE-CREDITO.md'), 'utf8');
  ['AGENTE_CREDITO_SECRETO', 'credito_agente_consumir', 'tests/manual/agente-credito-real.js', 'límite de gasto'].forEach((x) => assert.ok(ins.includes(x), x));
});
