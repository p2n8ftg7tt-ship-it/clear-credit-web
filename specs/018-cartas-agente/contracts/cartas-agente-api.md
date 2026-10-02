# Contratos — Cartas del agente (018)

## Propuesta (en el resultado del agente)

```
cartas: [{
  tipo: 'bureau-dispute' | 'debt-validation' | 'identity',
  cuentas: [{ letra: string, motivo: 'not-mine'|'wrong-amount'|'wrong-date'|'already-resolved'|'wrong-status'|'other'|'no_aplica' }],
  subtipo: 'identity-names'|'identity-phones'|'identity-addresses'|'identity-mixed'|'no_aplica',
  etiquetas: string[]
}]
```

**Reglas de `validarCartas(cartas, { etiquetado, plan })`** → `{ validas, problemas }`. Cada problema es `carta[i]:<codigo>`:

| Regla | Código |
|---|---|
| Más de 3 cartas: las que sobran (de la 4 en adelante) | `sobra` |
| `tipo` fuera de la lista | `tipo` |
| `bureau-dispute`: 1 a 10 cuentas, todas existen, motivo de la lista y ≠ `no_aplica`, `subtipo` = `no_aplica`, `etiquetas` vacías | `forma` |
| `bureau-dispute`: cada cuenta está en `cuentas` de algún paso del plan con `tipo: 'disputar'` | `sin_paso_disputar:<letra>` |
| `not-mine` sobre una cuenta que no está en `etiquetado.marcadas.cuentas` | `no_marcada:<letra>` |
| `debt-validation`: exactamente 1 cuenta, existe, `esCobranza: true`, motivo `no_aplica`, `subtipo` = `no_aplica`, `etiquetas` vacías | `forma` / `no_es_cobranza:<letra>` |
| `identity`: `cuentas` vacías, `subtipo` ≠ `no_aplica`, al menos 1 etiqueta, todas existen en `identidad` y en `etiquetado.marcadas.datos` | `forma` / `no_marcada:<etiqueta>` |
| Mismo `tipo` y mismo destinatario que una carta anterior (buró para disputa e identidad; la cuenta para validación) | `repetida` |
| Cuenta inexistente | `cuenta_inexistente:<letra>` |

Una carta con cualquier problema no va en `validas`. `validas` conserva el orden original.

## `ThemoraCartas` (cambios en `cartas-bilingues.js`)

- `BUROS`: `{ equifax: { nombre: 'Equifax', destinatario: 'Equifax Information Services LLC', direccion: ['P.O. Box 740241', 'Atlanta, GA 30374'] }, experian: { nombre: 'Experian', destinatario: 'Experian — Dispute by Mail', direccion: ['P.O. Box 4500', 'Allen, TX 75013'] }, transunion: { nombre: 'TransUnion', destinatario: 'TransUnion Consumer Solutions', direccion: ['P.O. Box 2000', 'Chester, PA 19016-2000'] } }`, congelado.
- `armar('bureau-dispute', { …, cuentas: [{ acreedor, ultimos4, motivo }] })` agrega, después del bloque `motivo`, el bloque `cuentas-disputadas`:
  - es: `['CUENTAS QUE DISPUTO:', '1. ACME BANK — cuenta terminada en 0123 — ' + MOTIVOS[m].es, …]`
  - en: `['ACCOUNTS I AM DISPUTING:', '1. ACME BANK — account ending in 0123 — ' + MOTIVOS[m].en, …]`
  - Si `ultimos4` es `null`: `'— número no visible en el reporte —'` / `'— account number not shown on the report —'`.
  - Sin `cuentas` (o con una lista vacía), la salida es idéntica a la de hoy.

## `ThemoraCartasAgente` (`cartas-agente.js`, nuevo, UMD)

```js
crearBorradores(resultado, preparado, { buro }) → Borrador[]   // resultado.modo === 'ia'; si no, []
actualizarDatos(borrador, { remitente?, cobrador? }) → Borrador
confirmar(borrador, { inexacta?: boolean, yoEnvio?: boolean }) → Borrador
textoFinal(borrador, { fecha? }) → { textoEn, textoEs, bloques, guia }   // TypeError('carta_no_aprobada') si no está aprobada
GUIA_ENVIO: { 'bureau-dispute': string[], 'identity': string[], 'debt-validation': string[] }   // congelado
```

**Borrador** (objeto congelado):

```
{ id: 'carta-1', tipo, propuesta,                       // propuesta tal como la validó el servidor
  cuentas: [{ letra, acreedor, ultimos4, motivo }],     // desde preparado.privado (solo en el dispositivo)
  etiquetas: [{ etiqueta, tipo, valor }],               // identity
  destino: { nombre, destinatario, direccion } | null,  // BUROS[buro] o null; en debt-validation, desde datos.cobrador
  datos: { remitente: {...}, cobrador: {...} },
  confirmaciones: { inexacta: false, yoEnvio: false },
  estado: 'incompleto' | 'borrador' | 'aprobada',
  faltan: string[] }                                    // falta_nombre, falta_direccion, falta_destinatario, falta_cobrador
```

- **Completo** si: `remitente.givenNames`, `remitente.firstSurname`, `street`, `city`, `state` y `postalCode` no están vacíos; en `bureau-dispute` e `identity`, `destino` existe; en `debt-validation`, `cobrador.nombre`, `calle`, `ciudad`, `estado` y `cp` no están vacíos.
- **Estado**: `incompleto` si falta algo; `aprobada` si está completo y las dos confirmaciones son true; si no, `borrador`.
- `actualizarDatos` reinicia las dos confirmaciones (FR-013).
- `textoFinal` llama a `ThemoraCartas.armar` con:
  - `bureau-dispute`: `{ remitente, buro: destino, motivo, cuentas, hallazgo: null, fecha }`;
  - `debt-validation`: `{ remitente, cobrador, referencia: ultimos4 ? '****' + ultimos4 : '', hallazgo: { clave: 'collection' }, fecha }`;
  - `identity`: tipo = `subtipo`, `{ remitente, buro: destino, valoresDisputados: [{ type, value }], fecha }`.
