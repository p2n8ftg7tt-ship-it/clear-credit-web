/* ===========================================================================
   Themora Digital Score (TDS 0.1 – metodología en validación)

   Traducción a JavaScript del motor corregido de G:\My Drive\TDS
   (src/tds_engine, spec 001-tds-scoring-engine). Netlify no corre Python, así
   que el motor vive aquí y da EXACTAMENTE los mismos números: las pruebas de
   tests/tds.test.js comparan cada ejemplo con la salida del motor Python.

   Lo usan dos lados con la misma fórmula (una sola verdad):
     - netlify/functions/revisar-negocio.js, que calcula el resultado oficial
     - aparezco.html, para el simulador ("¿y si…?") sin volver a buscar

   Los pesos y parámetros NO están aquí: vienen de models/tds-<versión>.json.
   Para cambiarlos se crea una versión nueva del modelo (Principio VII).

     TDS = G · Σ (wᵢ/κ)·Cᵢ   sobre los componentes observados
     V 0,30 · R 0,25 · I 0,20 · C 0,15 · A 0,10;  κ = cobertura;
     G = 1 (ficha reclamada) o 0,85 (no reclamada)

   Reglas de honestidad:
     - Un dato desconocido (null) nunca cuenta como cero: se excluye y se
       informa la cobertura. Con cobertura < 0,80 la evaluación es incompleta.
     - Todo dato lleva evidencia (fuente y fecha); sin ella es desconocido.
     - Contratar servicios de Themora nunca otorga puntos.

   Única diferencia con el motor Python: en ¿Aparezco? la persona puede
   responder "No sé" a si reclamó su ficha. Entonces `listing.claimed` llega
   null, la compuerta es la de ficha reclamada (no castiga) y se añade la
   bandera `claimed_unknown`. El motor Python rechaza esa entrada.
   =========================================================================== */
(() => {
  'use strict';

  const COMPONENT_ORDER = ['V', 'R', 'I', 'C', 'A'];
  const INFO_CHECKS = ['name', 'phone', 'address_or_service_area', 'primary_category',
    'hours_7_days', 'website_linked', 'consistent_across_sources'];
  const CHANNELS = ['call', 'website_reachable', 'messaging', 'book_or_order'];
  const NOT_APPLICABLE = 'not_applicable';
  const COHORT_LEVELS = ['zone', 'metro', 'region', 'national'];
  const EVIDENCE_KEYS = new Set(['listing', 'reviews', 'photos', 'days_since_owner_activity']
    .concat(INFO_CHECKS.map(k => 'info_checks.' + k), CHANNELS.map(k => 'contact_channels.' + k)));
  const CHANGEABLE = new Set(['listing.claimed', 'reviews.rating', 'reviews.count', 'reviews.responded',
    'reviews.last_30d', 'photos', 'days_since_owner_activity']
    .concat(INFO_CHECKS.map(k => 'info_checks.' + k), CHANNELS.map(k => 'contact_channels.' + k)));
  const MAX_REASONS = 3;
  const SIMULATION_DISCLAIMER =
    'Estimación del puntaje calculada con el mismo motor y versión del modelo. ' +
    'No garantiza posiciones en buscadores ni nuevos clientes.';

  const NOMBRES = {
    V: 'Visibilidad', R: 'Reputación', I: 'Información', C: 'Facilidad de contacto', A: 'Actividad',
  };
  const CHECK_LABELS = {
    name: 'nombre', phone: 'teléfono', address_or_service_area: 'dirección o área de servicio',
    primary_category: 'categoría principal', hours_7_days: 'horario de los 7 días',
    website_linked: 'sitio web enlazado', consistent_across_sources: 'datos coherentes entre fuentes',
  };
  const CHANNEL_LABELS = {
    call: 'llamar', website_reachable: 'sitio web accesible', messaging: 'mensajería', book_or_order: 'reservar o pedir',
  };

  /* ---------------- Errores ---------------- */
  class TDSInputError extends Error {
    constructor(field, value, allowedRange) {
      super(field + ': valor ' + pyRepr(value) + ' no válido; permitido ' + fmtAllowed(allowedRange));
      this.name = 'TDSInputError';
      this.field = field;
      this.value = value;
      this.allowed_range = allowedRange;
    }
  }
  class TDSModelError extends Error {
    constructor(message) { super(message); this.name = 'TDSModelError'; }
  }
  const pyRepr = v => (v === null || v === undefined ? 'None' : typeof v === 'string' ? "'" + v + "'" : JSON.stringify(v));
  const fmtAllowed = a => (Array.isArray(a) ? JSON.stringify(a) : String(a));

  /* ---------------- Números (igual que numeric.py) ---------------- */
  // Dígitos más cortos que identifican al número, como repr() de Python.
  function shortest(x) {
    const [m, e] = Math.abs(x).toExponential().split('e');
    return { digits: m.replace('.', ''), exp: Number(e) };
  }

  // repr() de un float de Python: 1.0, 0.3, 1e-05, 1e+16.
  function pyFloatRepr(x) {
    if (x === 0) return Object.is(x, -0) ? '-0.0' : '0.0';
    const sign = x < 0 ? '-' : '';
    const { digits, exp } = shortest(x);
    if (exp < -4 || exp >= 16) {
      const mant = digits.length > 1 ? digits[0] + '.' + digits.slice(1) : digits;
      return sign + mant + 'e' + (exp < 0 ? '-' : '+') + String(Math.abs(exp)).padStart(2, '0');
    }
    let s;
    if (exp < 0) s = '0.' + '0'.repeat(-exp - 1) + digits;
    else if (digits.length > exp + 1) s = digits.slice(0, exp + 1) + '.' + digits.slice(exp + 1);
    else s = digits + '0'.repeat(exp + 1 - digits.length) + '.0';
    return sign + s;
  }

  // Decimal(str(x)).quantize(10^-places, ROUND_HALF_UP)
  function roundHalfUp(x, places = 0) {
    if (!Number.isFinite(x)) return x;
    if (x === 0) return 0;
    const neg = x < 0;
    const { digits, exp } = shortest(x);
    const keep = exp + places + 1;
    let n;
    if (keep < 0) n = 0n;
    else if (keep === 0) n = digits[0] >= '5' ? 1n : 0n;
    else {
      n = BigInt(digits.slice(0, keep).padEnd(keep, '0'));
      if ((digits[keep] || '0') >= '5') n += 1n;
    }
    const v = Number(n.toString() + 'e' + (-places));
    return neg ? -v : v;
  }

  const clamp = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));

  // f"{x:.{places}f}" de Python (mitades exactas al par) con coma decimal.
  function numEs(x, places) {
    const exact = Math.abs(x).toFixed(Math.min(100, places + 60));
    const [ent, dec] = exact.split('.');
    const head = ent + dec.slice(0, places);
    const rest = dec.slice(places);
    let n = BigInt(head);
    const first = rest[0];
    const tail = rest.slice(1);
    if (first > '5' || (first === '5' && /[1-9]/.test(tail))) n += 1n;
    else if (first === '5' && n % 2n === 1n) n += 1n;
    let s = n.toString().padStart(places + 1, '0');
    if (places > 0) s = s.slice(0, s.length - places) + ',' + s.slice(s.length - places);
    return (x < 0 && /[1-9]/.test(s) ? '-' : '') + s;
  }

  /* ---------------- JSON canónico y SHA-256 (igual que Python) ----------------
     json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(",", ":")).
     Python distingue 1.0 (float) de 1 (int) y JavaScript no; por eso, cuando
     hay texto JSON original, se conserva cómo venía escrito cada número. */
  const FLOAT = Symbol('float');

  function parseKeepingFloats(text) {
    let i = 0;
    const ws = () => { while (/\s/.test(text[i])) i++; };
    function value() {
      ws();
      const c = text[i];
      if (c === '{') {
        i++; const obj = {}; ws();
        if (text[i] === '}') { i++; return obj; }
        for (;;) {
          ws(); const k = string(); ws(); i++; // ':'
          obj[k] = value(); ws();
          if (text[i] === ',') { i++; continue; }
          i++; return obj; // '}'
        }
      }
      if (c === '[') {
        i++; const arr = []; ws();
        if (text[i] === ']') { i++; return arr; }
        for (;;) {
          arr.push(value()); ws();
          if (text[i] === ',') { i++; continue; }
          i++; return arr; // ']'
        }
      }
      if (c === '"') return string();
      if (text.startsWith('true', i)) { i += 4; return true; }
      if (text.startsWith('false', i)) { i += 5; return false; }
      if (text.startsWith('null', i)) { i += 4; return null; }
      const m = /^-?\d+(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i));
      if (!m) throw new SyntaxError('JSON inválido en la posición ' + i);
      i += m[0].length;
      return /[.eE]/.test(m[0]) ? { [FLOAT]: Number(m[0]) } : Number(m[0]);
    }
    function string() {
      const m = /^"(?:[^"\\]|\\.)*"/.exec(text.slice(i));
      if (!m) throw new SyntaxError('JSON inválido en la posición ' + i);
      i += m[0].length;
      return JSON.parse(m[0]);
    }
    const out = value(); ws();
    if (i < text.length) throw new SyntaxError('JSON inválido: sobra texto');
    return out;
  }

  function canonicalJson(obj) {
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj === 'boolean') return obj ? 'true' : 'false';
    if (typeof obj === 'number') return Number.isInteger(obj) ? String(obj) : pyFloatRepr(obj);
    if (typeof obj === 'string') return JSON.stringify(obj);
    if (typeof obj === 'object' && FLOAT in obj) return pyFloatRepr(obj[FLOAT]);
    if (Array.isArray(obj)) return '[' + obj.map(canonicalJson).join(',') + ']';
    return '{' + Object.keys(obj).sort().map(k => JSON.stringify(k) + ':' + canonicalJson(obj[k])).join(',') + '}';
  }

  function sha256Hex(str) {
    const bytes = new TextEncoder().encode(str);
    const K = new Uint32Array([
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ]);
    const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const len = bytes.length;
    const total = Math.ceil((len + 9) / 64) * 64;
    const buf = new Uint8Array(total);
    buf.set(bytes);
    buf[len] = 0x80;
    const view = new DataView(buf.buffer);
    view.setUint32(total - 8, Math.floor(len / 0x20000000));
    view.setUint32(total - 4, (len * 8) >>> 0);
    const W = new Uint32Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let off = 0; off < total; off += 64) {
      for (let t = 0; t < 16; t++) W[t] = view.getUint32(off + t * 4);
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
        const s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
        W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let t = 0; t < 64; t++) {
        const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + W[t]) >>> 0;
        const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    return Array.from(H, x => x.toString(16).padStart(8, '0')).join('');
  }

  const hashOf = obj => sha256Hex(canonicalJson(obj));

  // Objeto normal a partir de uno leído con parseKeepingFloats.
  function plain(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (FLOAT in obj) return obj[FLOAT];
    if (Array.isArray(obj)) return obj.map(plain);
    const out = {};
    for (const k of Object.keys(obj)) out[k] = plain(obj[k]);
    return out;
  }

  /* ---------------- Modelo (model_version.py) ---------------- */
  const close = (a, b) => Math.abs(a - b) <= 1e-9;
  const sum = arr => arr.reduce((s, v) => s + v, 0);
  function check(cond, message) { if (!cond) throw new TDSModelError(message); }

  function modelFromDict(d, parametersHash) {
    try {
      check(/^\d+\.\d+\.\d+$/.test(d.version), 'version debe ser MAJOR.MINOR.PATCH');
      const w = d.weights;
      check(Object.keys(w).sort().join() === [...COMPONENT_ORDER].sort().join(), 'weights debe tener V, R, I, C, A');
      check(Object.values(w).every(v => v > 0), 'cada peso debe ser > 0');
      check(close(sum(Object.values(w)), 1), 'los pesos deben sumar 1');
      for (const mix of ['info_mix', 'reputation_mix', 'activity_mix']) {
        check(Object.values(d[mix]).every(v => v >= 0), mix + ' no puede ser negativo');
        check(close(sum(Object.values(d[mix])), 1), mix + ' debe sumar 1');
      }
      for (const key of ['prior_strength_m', 'review_sd', 'response_prior_strength',
        'activity_half_life_days', 'photo_lambda', 'burst_factor']) check(d[key] > 0, key + ' debe ser > 0');
      check(Object.values(d.gate).every(v => v >= 0 && v <= 1), 'gate debe estar en [0, 1]');
      check(d.min_coverage > 0 && d.min_coverage <= 1, 'min_coverage debe estar en (0, 1]');
      check(Number.isInteger(d.min_cohort_size) && d.min_cohort_size >= 1, 'min_cohort_size inválido');
      const vis = d.visibility;
      check(['max_rank', 'min_queries', 'min_grid_points'].every(k => Number.isInteger(vis[k]) && vis[k] >= 1),
        'visibility debe tener enteros >= 1');
      const bands = d.bands;
      check(bands.length && bands[0].min === 0 && bands[bands.length - 1].max === 100, 'las bandas deben cubrir 0–100');
      for (let i = 1; i < bands.length; i++) check(bands[i].min === bands[i - 1].max + 1, 'bandas con huecos o solapes');
      check(bands.every(b => b.min <= b.max), 'banda con min > max');
      for (const key of ['rating_median', 'review_sd', 'response_rate_median', 'median_monthly_reviews', 'volume_target']) {
        check(key in d.default_references, 'falta default_references.' + key);
      }
      check('default' in d.contact_channels_by_sector, 'falta contact_channels_by_sector.default');
      const codes = d.reason_catalog.map(r => r.code);
      check(new Set(codes).size === codes.length, 'códigos de razón duplicados');
    } catch (err) {
      if (err instanceof TDSModelError) throw err;
      throw new TDSModelError('archivo de modelo inválido: ' + err.message);
    }
    return Object.freeze({
      ...d,
      parameters_hash: parametersHash || hashOf(d),
      band_for(value) {
        for (const b of d.bands) if (b.min <= value && value <= b.max) return b.name;
        throw new TDSModelError('sin banda para ' + value);
      },
    });
  }

  // Desde el texto del archivo: el parameters_hash coincide con el de Python.
  function modelFromText(text) {
    let raw;
    try { raw = parseKeepingFloats(text); } catch (err) { throw new TDSModelError('archivo de modelo inválido: ' + err.message); }
    return modelFromDict(plain(raw), hashOf(raw));
  }

  const modelCache = {};
  function loadModel(version = '0.1.0') {
    if (modelCache[version]) return modelCache[version];
    if (typeof require !== 'function') throw new TDSModelError('versión de modelo desconocida: ' + version);
    const fs = require('fs');
    const path = require('path');
    const file = path.join(__dirname, 'models', 'tds-' + version + '.json');
    if (!fs.existsSync(file)) throw new TDSModelError('versión de modelo desconocida: ' + version);
    return (modelCache[version] = modelFromText(fs.readFileSync(file, 'utf8')));
  }

  /* ---------------- Entrada (inputs.py) ---------------- */
  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const isInt = v => typeof v === 'number' && Number.isInteger(v);
  const isNum = v => typeof v === 'number' && Number.isFinite(v);

  function obj(value, path, allowed, required = []) {
    if (!isObj(value)) throw new TDSInputError(path, value, 'objeto');
    for (const key of Object.keys(value)) {
      if (!allowed.includes(key)) throw new TDSInputError(path + '.' + key, value[key], 'campo no permitido');
    }
    for (const key of required) if (!(key in value)) throw new TDSInputError(path + '.' + key, null, 'obligatorio');
    return value;
  }
  function int(value, path, lo = 0, hi = null, nullable = true) {
    if ((value === null || value === undefined) && nullable) return null;
    const rng = hi !== null ? '[' + lo + ', ' + hi + ']' : 'entero >= ' + lo;
    if (!isInt(value) || value < lo || (hi !== null && value > hi)) {
      throw new TDSInputError(path, value, rng + (nullable ? ' o null' : ''));
    }
    return value;
  }
  function num(value, path, lo, hi, nullable = true) {
    if ((value === null || value === undefined) && nullable) return null;
    if (!isNum(value) || value < lo || value > hi) throw new TDSInputError(path, value, '[' + lo + ', ' + hi + ']' + (nullable ? ' o null' : ''));
    return value;
  }
  function bool(value, path, nullable = true) {
    if ((value === null || value === undefined) && nullable) return null;
    if (typeof value !== 'boolean') throw new TDSInputError(path, value, 'true/false' + (nullable ? ' o null' : ''));
    return value;
  }
  function str(value, path) {
    if (typeof value !== 'string' || !value) throw new TDSInputError(path, value, 'texto no vacío');
    return value;
  }

  function evidenceKeys(items, path) {
    if (!Array.isArray(items) || !items.length) throw new TDSInputError(path, items, 'lista con al menos 1 elemento');
    const keys = new Set();
    items.forEach((item, i) => {
      const p = path + '[' + i + ']';
      obj(item, p, ['field', 'source', 'captured_at'], ['field', 'source', 'captured_at']);
      if (!EVIDENCE_KEYS.has(item.field)) throw new TDSInputError(p + '.field', item.field, [...EVIDENCE_KEYS].sort());
      str(item.source, p + '.source');
      str(item.captured_at, p + '.captured_at');
      keys.add(item.field);
    });
    if (!keys.has('listing')) throw new TDSInputError(path, null, "debe incluir evidencia para 'listing'");
    return keys;
  }

  function validateBusiness(b) {
    const p = 'business';
    obj(b, p, ['business_id', 'sector', 'zone', 'listing', 'reviews', 'visibility_observations',
      'info_checks', 'photos', 'contact_channels', 'days_since_owner_activity', 'evidence'],
    ['business_id', 'sector', 'zone', 'listing', 'evidence']);
    const evidence = evidenceKeys(b.evidence, p + '.evidence');
    const flags = new Set();
    // Un dato conocido sin evidencia se trata como desconocido (Principio I).
    const known = (key, value) => {
      if (value === null || evidence.has(key)) return value;
      flags.add('missing_evidence');
      return null;
    };

    const listing = obj(b.listing, p + '.listing', ['locatable', 'claimed'], ['locatable']);
    const locatable = bool(listing.locatable, p + '.listing.locatable', false);
    const claimed = bool(listing.claimed, p + '.listing.claimed');
    if (locatable && claimed === null) flags.add('claimed_unknown');

    const rv = obj(b.reviews || {}, p + '.reviews', ['rating', 'count', 'responded', 'last_30d']);
    let count = int(rv.count, p + '.reviews.count');
    let rating = num(rv.rating, p + '.reviews.rating', 1, 5);
    if (count === 0 && rating !== null) throw new TDSInputError(p + '.reviews.rating', rating, 'null cuando count = 0');
    let responded = int(rv.responded, p + '.reviews.responded', 0, count);
    let last30 = int(rv.last_30d, p + '.reviews.last_30d', 0, count);
    if (!evidence.has('reviews') && [count, rating, responded, last30].some(v => v !== null)) {
      flags.add('missing_evidence');
      count = rating = responded = last30 = null;
    }
    const reviews = { rating, count, responded, last_30d: last30 };

    const observations = (b.visibility_observations || []).map((o, i) => {
      const op = p + '.visibility_observations[' + i + ']';
      const campos = ['query', 'query_type', 'grid_point', 'rank', 'source', 'captured_at'];
      obj(o, op, campos, campos);
      if (!['name', 'category'].includes(o.query_type)) throw new TDSInputError(op + '.query_type', o.query_type, ['name', 'category']);
      for (const key of ['query', 'grid_point', 'source', 'captured_at']) str(o[key], op + '.' + key);
      return { query: o.query, query_type: o.query_type, grid_point: o.grid_point, rank: int(o.rank, op + '.rank', 1) };
    });

    const ic = obj(b.info_checks || {}, p + '.info_checks', INFO_CHECKS);
    const info = {};
    for (const k of INFO_CHECKS) info[k] = known('info_checks.' + k, bool(ic[k], p + '.info_checks.' + k));

    const cc = obj(b.contact_channels || {}, p + '.contact_channels', CHANNELS);
    const channels = {};
    for (const k of CHANNELS) {
      channels[k] = cc[k] === NOT_APPLICABLE ? NOT_APPLICABLE
        : known('contact_channels.' + k, bool(cc[k], p + '.contact_channels.' + k));
    }

    const photos = known('photos', int(b.photos, p + '.photos'));
    const days = known('days_since_owner_activity', int(b.days_since_owner_activity, p + '.days_since_owner_activity'));

    return {
      business: {
        business_id: str(b.business_id, p + '.business_id'),
        sector: str(b.sector, p + '.sector'),
        zone: str(b.zone, p + '.zone'),
        locatable, claimed, reviews, observations, info_checks: info, photos, contact_channels: channels,
        days_since_owner_activity: days,
      },
      flags,
    };
  }

  function validateCohort(c, path) {
    const campos = ['level', 'sector', 'rating_median', 'review_counts', 'response_rate_median', 'median_monthly_reviews'];
    obj(c, path, campos, campos);
    if (!COHORT_LEVELS.includes(c.level)) throw new TDSInputError(path + '.level', c.level, COHORT_LEVELS);
    if (!Array.isArray(c.review_counts)) throw new TDSInputError(path + '.review_counts', c.review_counts, 'lista de enteros >= 0');
    const counts = c.review_counts.map((v, i) => int(v, path + '.review_counts[' + i + ']', 0, null, false));
    const mm = c.median_monthly_reviews;
    if (!isNum(mm) || mm < 0) throw new TDSInputError(path + '.median_monthly_reviews', mm, 'número >= 0');
    return {
      level: c.level,
      sector: str(c.sector, path + '.sector'),
      rating_median: num(c.rating_median, path + '.rating_median', 1, 5, false),
      review_counts: counts,
      response_rate_median: num(c.response_rate_median, path + '.response_rate_median', 0, 1, false),
      median_monthly_reviews: mm,
    };
  }

  function validateInput(data) {
    obj(data, 'input', ['model_version', 'business', 'cohorts', 'changes'], ['business', 'cohorts']);
    const { business, flags } = validateBusiness(data.business);
    if (!Array.isArray(data.cohorts)) throw new TDSInputError('cohorts', data.cohorts, 'lista de cohortes');
    const version = 'model_version' in data ? data.model_version : '0.1.0';
    if (typeof version !== 'string') throw new TDSInputError('model_version', version, 'MAJOR.MINOR.PATCH');
    return {
      business,
      cohorts: data.cohorts.map((c, i) => validateCohort(c, 'cohorts[' + i + ']')),
      model_version: version,
      flags,
    };
  }

  /* ---------------- Cohorte (cohort.py) y ráfagas (anomalies.py) ---------------- */
  function median(values) {
    const s = [...values].sort((a, b) => a - b);
    const n = s.length;
    return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  }

  function makeRefs(r) {
    return {
      ...r,
      // Percentil empírico estricto de ln(n+1); sin cohorte, meta por defecto.
      volume_fraction(count) {
        if (r.review_counts === null) return Math.min(1, Math.log(count + 1) / Math.log(r.volume_target + 1));
        const below = r.review_counts.filter(y => Math.log(y + 1) < Math.log(count + 1)).length;
        return below / r.review_counts.length;
      },
      median_review_count() { return r.review_counts === null ? null : median(r.review_counts); },
      as_output() { return r.is_default ? 'default_references' : { level: r.level, size: r.size }; },
    };
  }

  function selectCohort(cohorts, model) {
    for (const c of cohorts) {
      if (c.review_counts.length >= model.min_cohort_size) {
        return makeRefs({
          level: c.level, size: c.review_counts.length, rating_median: c.rating_median, review_sd: model.review_sd,
          response_rate_median: c.response_rate_median, median_monthly_reviews: c.median_monthly_reviews,
          review_counts: c.review_counts, volume_target: model.default_references.volume_target, is_default: false,
        });
      }
    }
    const d = model.default_references;
    return makeRefs({
      level: null, size: 0, rating_median: d.rating_median, review_sd: d.review_sd,
      response_rate_median: d.response_rate_median, median_monthly_reviews: d.median_monthly_reviews,
      review_counts: null, volume_target: d.volume_target, is_default: true,
    });
  }

  function detectReviewBurst(reviews, refs, model) {
    if (reviews.last_30d === null) return false;
    return reviews.last_30d > model.burst_factor * Math.max(refs.median_monthly_reviews, 1);
  }

  /* ---------------- Componentes (components/*.py) ---------------- */
  const component = (code, observed, score, variance = 0, findings = []) => ({ code, observed, score, variance, findings });
  const unobserved = (code, finding) => component(code, false, null, 0, [finding]);

  function rankValue(rank, maxRank) {
    if (rank === null || rank > maxRank) return 0;
    return 1 / Math.log2(rank + 1);
  }

  function scoreVisibility(observations, model) {
    const params = model.visibility;
    const category = observations.filter(o => o.query_type === 'category');
    const queries = new Set(category.map(o => o.query)).size;
    const points = new Set(category.map(o => o.grid_point)).size;
    if (queries < params.min_queries || points < params.min_grid_points) {
      return unobserved('V', 'Visibilidad no evaluada: muestra insuficiente (' + queries + ' consultas, ' +
        points + ' puntos; mínimo ' + params.min_queries + ' × ' + params.min_grid_points + ').');
    }
    const values = category.map(o => rankValue(o.rank, params.max_rank));
    const mean = sum(values) / values.length;
    const score = 100 * mean;
    let variance = 0;
    if (values.length > 1) {
      const s2 = sum(values.map(v => (v - mean) ** 2)) / (values.length - 1);
      variance = 100 ** 2 * s2 / values.length;
    }
    const missing = values.filter(v => v === 0).length;
    return component('V', true, score, variance, ['No aparece en ' + missing + ' de ' + values.length +
      ' búsquedas de categoría examinadas (' + queries + ' consultas × ' + points + ' puntos).']);
  }

  function scoreReputation(reviews, refs, model, volumeCount = null) {
    const n = reviews.count;
    const r = reviews.rating;
    if (n === null || (n > 0 && r === null)) return unobserved('R', 'Reseñas no evaluadas: faltan datos verificados.');
    const m = model.prior_strength_m;
    const mu = refs.rating_median;
    const rAdj = n === 0 ? mu : (n * r + m * mu) / (n + m);
    const pc = 100 * (rAdj - 1) / 4;
    const pv = 100 * refs.volume_fraction(volumeCount === null ? n : volumeCount);
    const mix = model.reputation_mix;
    const score = mix.rating * pc + mix.volume * pv;
    const variance = mix.rating ** 2 * (100 / 4) ** 2 * refs.review_sd ** 2 / (n + m);
    const findings = [];
    if (n === 0) findings.push('Sin reseñas: la calificación se estima con la referencia de la cohorte.');
    else if (n < m) {
      findings.push(numEs(r, 1) + ' estrellas con ' + n + ' ' + (n === 1 ? 'reseña' : 'reseñas') +
        ': evidencia insuficiente; calificación ajustada ' + numEs(rAdj, 2) + '.');
    }
    findings.push('Volumen de reseñas en el percentil ' + roundHalfUp(pv, 0) + ' de la cohorte.');
    return component('R', true, score, variance, findings);
  }

  function scoreInformation(checks, photos, model) {
    const known = Object.values(checks).filter(v => v !== null);
    const parts = [];
    if (known.length) parts.push([model.info_mix.checks, known.filter(Boolean).length / known.length]);
    if (photos !== null) parts.push([model.info_mix.photos, 1 - Math.exp(-model.photo_lambda * photos)]);
    if (!parts.length) return unobserved('I', 'Información no evaluada: faltan datos verificados.');
    const total = sum(parts.map(([w]) => w));
    const score = 100 * sum(parts.map(([w, v]) => w * v)) / total;
    const failing = Object.keys(checks).filter(k => checks[k] === false).map(k => CHECK_LABELS[k]);
    const findings = [];
    if (failing.length) findings.push('Falta o no se pudo verificar: ' + failing.join(', ') + '.');
    if (photos !== null) findings.push(photos + ' fotos en la ficha.');
    return component('I', true, score, 0, findings);
  }

  function scoreContact(channels, sector, model) {
    const bySector = model.contact_channels_by_sector;
    const pertinent = bySector[sector] || bySector.default;
    const known = pertinent.filter(k => channels[k] === true || channels[k] === false);
    if (!known.length) return unobserved('C', 'Contacto no evaluado: faltan canales verificados.');
    const score = 100 * known.filter(k => channels[k]).length / known.length;
    const failing = known.filter(k => !channels[k]).map(k => CHANNEL_LABELS[k]);
    return component('C', true, score, 0, failing.length ? ['Canales que no funcionan: ' + failing.join(', ') + '.'] : []);
  }

  function scoreActivity(reviews, days, refs, model) {
    const mix = model.activity_mix;
    const parts = [];
    let varRho = null;
    if (reviews.count !== null && reviews.responded !== null) {
      const s = model.response_prior_strength;
      const rho0 = refs.response_rate_median;
      const alpha = reviews.responded + s * rho0;
      const beta = (reviews.count - reviews.responded) + s * (1 - rho0);
      varRho = alpha * beta / ((alpha + beta) ** 2 * (alpha + beta + 1));
      parts.push([mix.response, alpha / (alpha + beta)]);
    }
    if (days !== null) parts.push([mix.recency, 2 ** (-days / model.activity_half_life_days)]);
    if (!parts.length) return unobserved('A', 'Actividad no evaluada: faltan datos verificados.');
    const total = sum(parts.map(([w]) => w));
    const score = 100 * sum(parts.map(([w, v]) => w * v)) / total;
    const variance = varRho !== null ? (100 * mix.response / total) ** 2 * varRho : 0;
    const findings = [];
    if (reviews.count && reviews.responded !== null) findings.push(reviews.responded + ' de ' + reviews.count + ' reseñas respondidas.');
    if (days !== null) findings.push('Última actividad del propietario hace ' + days + ' días.');
    return component('A', true, score, variance, findings);
  }

  /* ---------------- Agregado (aggregate.py) ---------------- */
  // "No sé" (claimed null) no castiga: compuerta de ficha reclamada.
  const gateFor = (business, model) => (business.claimed === false ? model.gate.unclaimed : model.gate.claimed);

  function categoryFor(tdsExact, margin, model) {
    const names = [model.band_for(roundHalfUp(tdsExact, 0))];
    for (const bound of [clamp(tdsExact - margin), clamp(tdsExact + margin)]) {
      const name = model.band_for(roundHalfUp(bound, 0));
      if (!names.includes(name)) names.push(name);
    }
    return names.join('–');
  }

  function aggregate(components, gate, model) {
    const w = model.weights;
    const observed = components.filter(c => c.observed);
    const coverage = sum(observed.map(c => w[c.code]));
    if (!observed.length) return { status: 'incomplete', tds_exact: null, tds: null, margin: null, coverage: 0, category: null };
    const tdsExact = clamp(gate * sum(observed.map(c => w[c.code] / coverage * c.score)));
    const margin = gate * 1.96 * Math.sqrt(sum(observed.map(c => (w[c.code] / coverage) ** 2 * c.variance)));
    const tds = roundHalfUp(tdsExact, 0);
    if (coverage < model.min_coverage - 1e-12) return { status: 'incomplete', tds_exact: tdsExact, tds, margin, coverage, category: null };
    return { status: 'complete', tds_exact: tdsExact, tds, margin, coverage, category: categoryFor(tdsExact, margin, model) };
  }

  /* ---------------- Razones (reasons.py) ---------------- */
  function current(business, path) {
    const [group, key] = path.split('.');
    if (group === 'info_checks') return business.info_checks[key];
    if (group === 'contact_channels') return business.contact_channels[key];
    if (group === 'reviews') return business.reviews[key];
    if (group === 'listing') return business[key];
    return business[group];
  }

  function growReviews(business, refs) {
    const rv = business.reviews;
    const med = refs.median_review_count();
    if (med === null || rv.rating === null || rv.count === null || rv.count >= med) return {};
    const newCount = Math.ceil(med);
    const changes = { 'reviews.count': newCount };
    if (rv.responded !== null) changes['reviews.responded'] = roundHalfUp(rv.responded / rv.count * newCount, 0);
    return changes;
  }

  // Cambios concretos de una acción; {} si ya está cumplida o no es verificable.
  function targetsFor(entry, business, refs) {
    const changes = {};
    for (const [path, target] of Object.entries(entry.targets)) {
      const cur = current(business, path);
      if (cur === null || cur === undefined || cur === NOT_APPLICABLE) continue;
      if (target === true && cur === false) changes[path] = true;
      else if (isObj(target) && 'at_least' in target && cur < target.at_least) changes[path] = target.at_least;
      else if (target === 'all' && business.reviews.count !== null && cur < business.reviews.count) changes[path] = business.reviews.count;
      else if (target === 0 && cur > 0) changes[path] = 0;
      else if (target === 'cohort_median') Object.assign(changes, growReviews(business, refs));
    }
    return changes;
  }

  function buildReasons(base, business, refs, model, rescore) {
    if (base.tds_exact === null) return [];
    const candidates = [];
    for (const entry of model.reason_catalog) {
      const changes = targetsFor(entry, business, refs);
      if (!Object.keys(changes).length) continue;
      const gain = roundHalfUp(rescore(changes) - base.tds_exact, 1);
      if (gain > 0) {
        candidates.push({
          code: entry.code, component: entry.component, finding: entry.finding_es,
          action_es: entry.message_es, gain_points: gain,
        });
      }
    }
    const w = model.weights;
    candidates.sort((a, b) => b.gain_points - a.gain_points || w[b.component] - w[a.component] ||
      (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
    return candidates.slice(0, MAX_REASONS);
  }

  /* ---------------- score / simulate (__init__.py) ---------------- */
  const evidenceKey = path => {
    const group = path.split('.')[0];
    return ['reviews', 'listing', 'photos', 'days_since_owner_activity'].includes(group) ? group : path;
  };

  function deepCopy(v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }

  // Copia de la entrada con los campos cambiados (rutas con punto relativas a `business`).
  function applyChanges(data, changes) {
    const copy = deepCopy(data);
    delete copy.changes;
    const business = copy.business;
    if (!business.evidence) business.evidence = [];
    const evidence = business.evidence;
    const listingEv = evidence.find(e => e && e.field === 'listing');
    const stamp = listingEv ? listingEv.captured_at : '';
    for (const rawPath of Object.keys(changes).sort()) {
      const value = changes[rawPath];
      const path = rawPath.startsWith('business.') ? rawPath.slice('business.'.length) : rawPath;
      if (!CHANGEABLE.has(path)) throw new TDSInputError('changes.' + rawPath, value, [...CHANGEABLE].sort());
      const [group, key] = path.split('.');
      if (key) {
        if (!isObj(business[group])) business[group] = {};
        business[group][key] = value;
      } else business[group] = value;
      const evKey = evidenceKey(path);
      if (value !== null && !evidence.some(e => e.field === evKey)) {
        evidence.push({ field: evKey, source: 'simulation', captured_at: stamp });
      }
    }
    return copy;
  }

  // La entrada puede llegar como objeto o como texto JSON; con texto, el
  // input_hash sale idéntico al de Python aunque haya números como 5.0.
  function readInput(input) {
    if (typeof input === 'string') {
      const raw = parseKeepingFloats(input);
      const data = plain(raw);
      const hashable = isObj(raw) ? { ...raw } : raw;
      if (isObj(hashable)) delete hashable.changes;
      return { data, inputHash: hashOf(hashable) };
    }
    return { data: input, inputHash: null };
  }

  function evaluate(data, model, inputHash) {
    const validated = validateInput(data);
    model = model || loadModel(validated.model_version);
    const b = validated.business;
    const flags = new Set(validated.flags);
    const refs = selectCohort(validated.cohorts, model);
    if (refs.is_default) flags.add('default_references');
    let hash = inputHash;
    if (!hash) {
      const hashable = { ...data };
      delete hashable.changes;
      hash = hashOf(hashable);
    }
    const common = {
      model_version: model.version, model_label: model.label, parameters_hash: model.parameters_hash,
      input_hash: hash, cohort_used: refs.as_output(),
    };

    if (!b.locatable) {
      const components = COMPONENT_ORDER.map(c => unobserved(c, 'No evaluable: ficha no localizable.'));
      return {
        result: { status: 'not_evaluable', tds: null, tds_exact: null, margin: null, category: null, coverage: 0,
          gate: null, components, flags, reasons: [], ...common },
        business: b, refs, model,
      };
    }

    let volumeCount = null;
    if (detectReviewBurst(b.reviews, refs, model)) {
      flags.add('under_review');
      flags.add('review_burst');
      volumeCount = b.reviews.count - b.reviews.last_30d;
    }
    const components = [
      scoreVisibility(b.observations, model),
      scoreReputation(b.reviews, refs, model, volumeCount),
      scoreInformation(b.info_checks, b.photos, model),
      scoreContact(b.contact_channels, b.sector, model),
      scoreActivity(b.reviews, b.days_since_owner_activity, refs, model),
    ];
    const gate = gateFor(b, model);
    const agg = aggregate(components, gate, model);
    return { result: { ...agg, gate, components, flags, reasons: [], ...common }, business: b, refs, model };
  }

  function scoreResult(data, model, withReasons, inputHash) {
    const ev = evaluate(data, model, inputHash);
    if (withReasons && ev.result.status !== 'not_evaluable') {
      const rescore = changes => evaluate(applyChanges(data, changes), ev.model).result.tds_exact;
      ev.result.reasons = buildReasons(ev.result, ev.business, ev.refs, ev.model, rescore);
    }
    return { result: ev.result, model: ev.model };
  }

  // Igual que ScoreResult.to_dict(): números redondeados y en el orden del contrato.
  function toDict(r) {
    const byCode = {};
    for (const c of r.components) byCode[c.code] = c;
    return {
      status: r.status,
      tds: r.tds,
      margin: r.margin === null ? null : roundHalfUp(r.margin, 1),
      category: r.category,
      coverage: roundHalfUp(r.coverage, 4),
      gate: r.gate,
      components: COMPONENT_ORDER.map(code => {
        const c = byCode[code];
        return {
          code: c.code, observed: c.observed, score: c.score === null ? null : roundHalfUp(c.score, 2),
          variance: roundHalfUp(c.variance, 4), findings: [...c.findings],
        };
      }),
      reasons: r.reasons.map(x => ({ ...x })),
      cohort_used: r.cohort_used,
      model_version: r.model_version,
      model_label: r.model_label,
      parameters_hash: r.parameters_hash,
      input_hash: r.input_hash,
      flags: [...r.flags].sort(),
    };
  }

  /** Calcula el TDS de un negocio; devuelve un objeto conforme a score-output.schema.json. */
  function score(input, model) {
    const { data, inputHash } = readInput(input);
    return toDict(scoreResult(data, model, true, inputHash).result);
  }

  /** Recalcula con el mismo motor cambiando solo los campos indicados (FR-016). */
  function simulate(input, changes, model) {
    const { data, inputHash } = readInput(input);
    const base = scoreResult(data, model, false, inputHash);
    const simulated = scoreResult(applyChanges(data, changes), base.model, true).result;
    let delta = null;
    if (base.result.tds_exact !== null && simulated.tds_exact !== null) {
      delta = roundHalfUp(simulated.tds_exact - base.result.tds_exact, 1);
    }
    const out = toDict(simulated);
    out.simulation = { base_tds: base.result.tds, delta_points: delta, disclaimer_es: SIMULATION_DISCLAIMER };
    return out;
  }

  const API = {
    score, simulate, loadModel, modelFromText, modelFromDict, validateInput, applyChanges,
    roundHalfUp, canonicalJson, sha256Hex, numEs, pyFloatRepr,
    TDSInputError, TDSModelError,
    COMPONENT_ORDER, INFO_CHECKS, CHANNELS, NOMBRES, SIMULATION_DISCLAIMER,
  };
  if (typeof window !== 'undefined') window.ThemoraTDS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
