# Data Model — Agente de crédito con IA (017)

Entradas de otras specs, sin cambios: `Reporte` y `Cuenta` (spec 013) y los resultados de las herramientas (spec 016, `data-model.md`).

## ReporteEtiquetado (lo único del reporte que sale del dispositivo)

| Campo | Tipo | Regla |
|---|---|---|
| `buro` | `'equifax' \| 'experian' \| 'transunion' \| 'desconocido'` | |
| `fechaReporte` | string iso \| null | |
| `identidad.nombres` | `{ etiqueta: 'Nombre N', diferencias: string[] }[]` | `diferencias` ∈ `igual`, `solo_inicial_o_tilde`, `nombre_de_pila_distinto`, `apellido_distinto` (respecto a Nombre 1; Nombre 1 lleva `[]`) |
| `identidad.direcciones` | `{ etiqueta: 'Dirección N', diferencias: string[] }[]` | `actual` \| `anterior` + `mismo_estado` \| `otro_estado` \| `estado_desconocido` |
| `identidad.telefonos` | `{ etiqueta: 'Teléfono N', diferencias: string[] }[]` | `mismo_codigo_de_area` \| `otro_codigo_de_area` |
| `identidad.ssnDistintos` | 0 \| 1 | Del lector (`ssnMostrado`); nunca el número |
| `identidad.fechasNacimientoDistintas` | 0 \| 1 | Del lector (`fechaNacimientoMostrada`); nunca la fecha |
| `cuentas` | `CuentaEtiquetada[]` | En el orden del reporte; letras A, B, … Z, AA, AB… |
| `consultas` | `{ empresa, fecha, tipo }[]` | `fecha` iso o null |
| `registrosPublicos` | `{ tipo, fechaPresentacion, estado }[]` | Sin tribunal ni número de caso |
| `avisos` | `{ tipo }[]` | Sin texto |

### CuentaEtiquetada

`{ letra, acreedor, acreedorOriginal, tipo, estado, estadoPago, responsabilidad, cerrada, esCobranza, saldo, limite, saldoMasAlto, montoOriginal, limiteOMontoOriginal, vencido, montoChargeOff, fechaApertura, fechaCierre, dofd, ultimoPago, fechaReportada, fechaChargeOff, fechaCobranza, historial: { mes: 'AAAA-MM', codigo }[], atrasosListados: string[], comentarios: string[] }`

- Valores simples: los montos son números, las fechas son iso y los textos son strings. Un dato que falta es `null` («no aparece en el reporte»).
- `comentarios`: máximo 5, de hasta 300 caracteres cada uno.
- Nunca incluye `id`, `numero`, `contacto`, `origen`, `declaracionConsumidor` ni `historial24`.

## Pase

`base64url(JSON).base64url(HMAC-SHA256)`. Contenido del JSON:

| Campo | Tipo | Regla |
|---|---|---|
| `v` | 1 | Versión del formato |
| `a` | string | Id del análisis, 16 bytes aleatorios en base64url |
| `u` | string | Id de usuario de Supabase; debe coincidir con la sesión |
| `d` | `AAAA-MM-DD` | «Hoy» en hora del Este, fijado en la vuelta 1 (FR-010) |
| `n` | 2–6 | Número de la próxima vuelta |
| `e` | entero | Vencimiento (epoch en segundos) = emisión + 900 |
| `h` | string | HMAC de `messages` en JSON canónico (claves ordenadas): hasta la última respuesta del asistente si `c` = 0, o la conversación completa (incluido el mensaje de corrección) si `c` = 1 |
| `c` | 0 \| 1 | 1 = la próxima vuelta es la corrección pedida por el servidor; el navegador no agrega mensajes |
| `k` | 0 \| 1 | Ya hubo una corrección en este análisis (máximo una, FR-021) |

**Estados del análisis**: `vuelta 1` → (`herramientas` → `vuelta n+1`)* → `terminado` | `respaldo`. No hay estado guardado en el servidor: todo vive en el pase y en la conversación que el navegador reenvía.

## Vuelta (pedido del navegador)

| Campo | Vuelta 1 | Vueltas 2–6 |
|---|---|---|
| `accessToken` | ✔ | ✔ |
| `etiquetado` | ✔ | — |
| `pase` | — | ✔ |
| `messages` | — | ✔ La conversación que devolvió el servidor, sin cambios, más un mensaje `user` final con exactamente los `tool_result` pedidos |

## Respuesta del servidor

| Caso | HTTP | Cuerpo |
|---|---|---|
| Claude pide herramientas | 200 | `{ estado: 'herramientas', pase, messages, pedidos: [{ id, nombre, entrada }] }` |
| Claude terminó y el resultado es válido | 200 | `{ estado: 'terminado', resultado: ResultadoAgente, uso: { vueltas } }` |
| Respaldo necesario | 401 / 429 / 403 / 400 / 502 / 504 / 503 | `{ estado: 'respaldo', motivo, reintentable: boolean }`. Si `reintentable` es true, también trae `pase` (de reintento: `c` = 1, mismo `n`) y `messages` (la conversación que se le envió a Claude), para reintentar sin sumar uso |

`motivo` ∈ `sin_sesion` (401), `limite_diario` (429), `pase_invalido` (403), `datos_rechazados` (400), `demasiadas_vueltas` (200 con estado respaldo), `respuesta_no_valida` (200 con estado respaldo), `ia_no_disponible` (502/504, reintentable), `no_configurado` (503).

## ResultadoAgente (JSON Schema del resultado, `additionalProperties: false` en todo)

```
{
  diagnostico: string,
  plan: [ {
    tipo: 'disputar' | 'pagar' | 'esperar' | 'proteger' | 'revisar',
    cuentas: string[],
    hechos: [ { cuenta: string, dato: string, fuente: 'reporte' | 'herramienta' } ],
    interpretacion: string,
    accion: string
  } ],
  despues: string[],
  preguntasParaTi: string[],
  verificar: string[],
  datosPersonales: [ { etiqueta: string, razon: string } ]
}
```

Reglas que el esquema no puede expresar y que valida el servidor (research R8): `plan` tiene 3 pasos como máximo, `diagnostico` tiene de 3 a 5 oraciones, las cuentas y etiquetas existen, los números tienen fuente y no hay palabras prohibidas.

El navegador entrega al consumidor `{ modo: 'ia', ...ResultadoAgente }`.

## AnalisisLocal

`{ modo: 'local', motivo, reintentable, hoy, herramientas: { fechasSalida: ResultadoFechaSalida[], utilizacion, duplicados, consultasDuras } }`. Son los resultados de la spec 016 sobre `paraHerramientas`. `hoy` es el del pase si existe y, si no, la fecha del dispositivo (el análisis local no depende del servidor).

## EventoProgreso

Una cadena de códigos, sin datos del reporte:

`etiquetando` · `enviando:1` · `herramienta:calcularFechaSalida:B` · `herramienta:calcularUtilizacion` · `reintentando:2` · `terminado` · `respaldo:<motivo>`

Strings sueltos (por ejemplo, comentarios) se limpian antes de salir del dispositivo: correos → `[correo]`, teléfonos → `[teléfono]`, y forma de SSN o cualquier serie de 5 dígitos o más → `[número]`. Se aplica al etiquetado y a los resultados de las herramientas.

## UsoDiario (Supabase)

`credito_agente_uso (user_id uuid, dia date, veces int, llamadas int)`, con clave primaria `(user_id, dia)`. Funciones atómicas (research R6): `credito_agente_consumir(p_user, p_dia, p_limite) → boolean` (análisis, límite 3) y `credito_agente_llamar(p_user, p_dia, p_limite) → boolean` (llamadas a Claude, límite 24). RLS activado y sin políticas.
