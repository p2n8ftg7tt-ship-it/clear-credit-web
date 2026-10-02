# Data Model — Herramientas de cálculo del agente de crédito (016)

**Entrada**: el `Reporte`, la `Cuenta` y la `Consulta` de `specs/013-lector-credito-metodologia/data-model.md`, sin cambios. Se repiten aquí solo los campos que usan las herramientas.

**Convenciones de salida**:

- Todos los códigos (`estado`, `motivo`, `regla`, `tipo`) son cadenas en `snake_case`, sin espacios, sin acentos y sin frases.
- Las fechas de salida son cadenas ISO: `'AAAA-MM'` con `precision: 'mes'` y `'AAAA-MM-DD'` con `precision: 'dia'`.
- Los montos se devuelven en dólares (número). Los cálculos internos se hacen en centavos (research R6).
- Un `Origen` es el mismo objeto de la spec 013 (`{ pagina, seccion, etiqueta, linea }`), copiado del dato usado.
- `Referencia` = `{ campo, valor, origen }`: el dato exacto del reporte en que se apoya un resultado.
- Los arreglos de salida van en orden estable (por `cuentaId`, después por fecha).

## Campos de entrada que se usan

| Herramienta | Campos de `Cuenta` / `Consulta` |
|---|---|
| Fecha de salida | `id`, `esCobranza`, `estado`, `estadoPago`, `designadorActividad`, `fechaChargeOff`, `montoChargeOff`, `dofd`, `fechaApertura`, `historial[]` (`anio`, `mes`, `codigo`, `mesVerificable`, `origen`), `atrasosListados[]` |
| Utilización | `id`, `tipo`, `cerrada`, `esCobranza`, (detección de charge-off de R4), `saldo`, `limite`, `responsabilidad` |
| Posibles duplicados | `id`, `acreedor`, `acreedorOriginal`, `esCobranza`, `saldo`, `dofd`, `fechaApertura`, `comentarios[]`, `estado`, `estadoPago`, `codigosNarrativos[]` |
| Consultas duras | `tipo`, `fecha`, `empresa` |

Ninguna herramienta lee `identidad`, `numero` ni `contacto` (FR-008).

## ResultadoFechaSalida

Uno por cuenta.

| Campo | Tipo | Regla |
|---|---|---|
| `cuentaId` | string | `Cuenta.id` |
| `regla` | `'cobranza_o_chargeoff' \| 'atrasos' \| 'no_aplica'` | R4 / R5 |
| `estado` | `'calculado' \| 'no_calculable' \| 'no_aplica'` | |
| `motivo` | `'falta_dofd' \| 'dofd_imprecisa' \| 'sin_atrasos_verificables' \| null` | Solo con `no_calculable` |
| `caracter` | `'calculo_informativo'` | Siempre (FR-019) |
| `fechas` | `FechaCalculada[]` | Una con `cobranza_o_chargeoff`; una por mes con `atrasos`; vacío en los demás casos |
| `omitidos` | `{ referencia: Referencia, motivo: 'mes_no_verificable' }[]` | Solo con `atrasos` |
| `avisos` | `('dofd_futura' \| 'dofd_antes_de_apertura')[]` | Hechos, sin conclusión |

### FechaCalculada

| Campo | Tipo | Regla |
|---|---|---|
| `reglaBase` | `'7_anos_mas_180_dias' \| '7_anos_desde_atraso'` | FR-010 / FR-015 |
| `base` | `Referencia` | `dofd` o el mes del atraso, con su origen |
| `salida` | string ISO | Valor calculado o estimado |
| `precision` | `'dia' \| 'mes'` | |
| `estimada` | booleano | `true` si `precision === 'mes'` |
| `motivoEstimacion` | `'dofd_sin_dia_exacto' \| 'atraso_sin_dia_exacto' \| null` | |
| `rango` | `{ desde, hasta } \| null` | Solo con `7_anos_mas_180_dias` estimada (FR-012). `null` si es exacta. Con `7_anos_desde_atraso` es `{ desde: salida, hasta: salida }` |
| `yaPaso` | `true \| false \| 'incierto'` | Comparado con `hoy`: `true` si `hasta` < hoy, `false` si `desde` > hoy y `'incierto'` en otro caso. Con precisión de día compara la fecha exacta (FR-018) |

## ResultadoUtilizacion

| Campo | Tipo | Regla |
|---|---|---|
| `porCuenta` | `{ cuentaId, saldo, limite, porcentaje, sobreLimite, responsabilidad: string \| null, referencias: { saldo: Referencia, limite: Referencia } }[]` | Solo las incluidas |
| `total` | `{ saldo, limite, porcentaje, cuentas: number } \| null` | `null` si no hay ninguna incluida (FR-023) |
| `excluidas` | `{ cuentaId, motivo }[]` | `motivo` ∈ `cobranza`, `cargada_a_perdida`, `cerrada`, `sin_saldo`, `saldo_negativo`, `sin_limite`, `limite_cero` (R6) |

## PosibleDuplicado

| Campo | Tipo | Regla |
|---|---|---|
| `tipo` | `'original_y_cobranza' \| 'dos_cobranzas_mismo_original' \| 'mismo_acreedor_misma_apertura'` | FR-027 |
| `cuentas` | `[string, string]` | Con `original_y_cobranza`: `[original, cobranza]`. En los otros dos tipos, en orden por id |
| `nombreComparado` | string | Nombre normalizado que coincidió (R7) |
| `coinciden` | string[] | Del conjunto `acreedor_original` (o `acreedor`), `saldo`, `dofd`, `fecha_apertura`, en ese orden |
| `difieren` | `{ campo, a, b }[]` | `a` y `b` son los valores de cada cuenta (o `null` si falta) |
| `ambosConSaldo` | booleano | Saldo de las dos cuentas > 0 |
| `marcaVendida` | `{ encontrada: boolean, texto: string \| null, origen: Origen \| null } \| null` | Solo con `original_y_cobranza` (FR-030) |

Un campo que falta en una de las dos cuentas va en `difieren` con `null` de ese lado; nunca va en `coinciden`.

## ConteoConsultasDuras

| Campo | Tipo | Regla |
|---|---|---|
| `ventana` | `{ desde, hasta, incluyeDesde: false, incluyeHasta: true }` | FR-033 |
| `total` | number | Solo las de `dentro` |
| `dentro` | `{ empresa: string \| null, fecha, origen }[]` | Ordenadas por fecha, de la más reciente a la más antigua |
| `inciertas` | igual que `dentro` | Fecha con solo el mes, cruzando el borde |
| `futuras` | igual que `dentro` | Fecha > hoy |
| `sinFecha` | number | |
| `desconocidas` | number | `tipo === 'desconocida'` |

## Catálogo

`CATALOGO`: arreglo congelado de `{ nombre, version: '1.0.0', alcance: 'cuenta' | 'reporte' }` más su función `ejecutar(reporte, opciones)`.

| `nombre` | `alcance` | `opciones` |
|---|---|---|
| `calcularFechaSalida` | `cuenta` | `{ hoy, cuentaId }`; sin `cuentaId` devuelve todas las cuentas |
| `calcularUtilizacion` | `reporte` | `{}` |
| `buscarPosiblesDuplicados` | `reporte` | `{}` |
| `contarConsultasDuras` | `reporte` | `{ hoy, meses? }` |

## Errores de uso (`TypeError`) frente a datos faltantes

| Situación | Resultado |
|---|---|
| `hoy` falta o no es `AAAA-MM-DD` válido | `TypeError` |
| `meses` no es un entero entre 1 y 120 | `TypeError` |
| `cuentas` o `consultas` no son arreglos; una cuenta sin `id` | `TypeError` |
| `cuentaId` que no existe en el reporte | `TypeError` |
| Nombre de herramienta desconocido en `ejecutar` | `TypeError` |
| Falta DOFD, límite, saldo, fecha o tipo en el reporte | Resultado normal con estado y motivo (FR-005, FR-007) |
