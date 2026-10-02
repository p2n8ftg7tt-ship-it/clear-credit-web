# Data Model — Resumen del consumidor (014)

Se apoya en el modelo de la especificación 013 (`Reporte`, `Cuenta`, `Consulta`, `RegistroPublico`, `Valor<T>`, `Origen`). Aquí solo se describe lo nuevo o lo que cambia.

## Cambios en `Identidad` (lector-credito.js)

| Campo | Tipo | Regla |
|---|---|---|
| `ssnUltimos4` | string de 4 dígitos o `null` | **Nuevo.** Solo los cuatro últimos dígitos impresos. El resto del número se descarta al leerlo. Enmienda FR-017 de la 013 |
| `ssnMostrado` | booleano | Se mantiene |
| `nombres` | `Valor<string>[]` | Se descartan los identificadores («Name ID #14081», números sueltos). En Experian se unen las piezas de un mismo nombre partidas en dos renglones de tabla |

## Analisis (nuevo, salida de `ThemoraAnalista.analizar(reporte, opciones?)`)

| Campo | Tipo | Regla |
|---|---|---|
| `resumen` | `ResumenGeneral` | Cuadro grande |
| `abiertas` | `{ total, porTipo: [{ tipo, etiqueta, cantidad }] }` | Cuadro pequeño; sin cobranzas; solo tipos con cantidad > 0, orden fijo: tarjetas, auto, hipoteca, estudiantil, otros préstamos, otras |
| `problemas` | `CuentaConProblema[]` | Ordenadas por gravedad (roja, naranja, amarilla) y luego por fecha del problema, más reciente primero |
| `consultas` | `{ duras: GrupoConsultas, blandas: GrupoConsultas }` | Blandas incluye promocionales y de revisión de cuenta |
| `pasos` | `PasoAgente[]` | Los cuatro pasos con sus textos finales |
| `conclusion` | string | Una o dos frases para el consumidor |
| `advertencias` | string[] | Lectura parcial, formato no reconocido, meses no verificables |

Invariante (FR-002): `problemas.length` es el único número de «cuentas con problemas»; `pasos[3].texto` y `resumen` lo leen de ahí.

## ResumenGeneral

| Campo | Tipo | Regla |
|---|---|---|
| `buro` | `{ id, nombre }` | `nombre: 'Buró no reconocido'` si es desconocido |
| `fecha` | `{ texto, iso }` o `null` | Fecha del reporte, en español largo para mostrar |
| `nombre` | string | Primer nombre válido o «Nombre no legible en el reporte» |
| `ssn` | `{ mostrado: bool, ultimos4: string|null }` | Se pinta `xxx-xx-` + `ultimos4`; si `mostrado` es falso, frase de ausencia |
| `direccion` | `{ actual: string|null, otras: number }` | |
| `telefono` | `{ actual: string|null, otros: number }` | |
| `cuentas` | `{ total, abiertas, cerradas, enCobranza }` | Las cobranzas se cuentan aparte: no son abiertas ni cerradas |
| `registrosPublicos` | number | |
| `paginas` | `{ leidas, totales }` | Solo PDF |

## CuentaConProblema

| Campo | Tipo | Regla |
|---|---|---|
| `id` | string | `Cuenta.id` del lector (o `rp-<n>` para registros públicos) |
| `acreedor` | string | Nombre impreso |
| `nombreCorto` | string | Máximo 22 caracteres, sin sufijos corporativos |
| `iniciales` | string | 1–2 letras (R7) |
| `gravedad` | `'roja' \| 'naranja' \| 'amarilla'` | La más alta de sus hallazgos |
| `gravedadTexto` | string | «Grave», «Atención», «Para revisar» |
| `frase` | string | Problema principal y fecha, 3 a 6 palabras: «Charge-off, feb. 2026» |
| `fechaProblema` | `{ iso }` o `null` | Para ordenar |
| `hallazgos` | `HallazgoLegal[]` | Al menos uno |
| `carta` | `'bureau-dispute' \| 'debt-validation' \| null` | La que ofrece el botón |
| `datosCarta` | `{ acreedor, numero (enmascarado), buro }` | Se precargan en el formulario |

## HallazgoLegal

| Campo | Tipo | Regla |
|---|---|---|
| `regla` | id de `REGLAS` | `cobranza`, `charge_off`, `reposesion`, `ejecucion_hipotecaria`, `atraso`, `saldo_vencido`, `marcada_por_buro`, `obsoleta`, `registro_publico` |
| `gravedad` | como arriba | |
| `queVimos` | string | Dato exacto en español + «(página N)» del `Origen` |
| `queSignifica` | string | Lenguaje sencillo |
| `queDiceLaLey` | `[{ ley: 'FCRA'|'FDCPA', seccion: string, texto: string }]` | Solo secciones presentes en `zyron-leyes.js` |
| `opciones` | string[] | En orden, sin órdenes ni promesas |
| `noCubierto` | string o `null` | Frase honesta cuando podría aplicar una ley no cargada (p. ej. prescripción estatal) |

## GrupoConsultas

`{ total: number, porEmpresa: [{ empresa: string, fechas: string[] }] }` — empresas en orden de la consulta más reciente.

## PasoAgente

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `'observar' \| 'leer' \| 'revisar' \| 'concluir'` | |
| `estado` | `'pendiente' \| 'en_curso' \| 'hecho' \| 'fallido'` | `pendiente → en_curso → hecho`; cualquier paso puede pasar a `fallido` y detiene los siguientes |
| `texto` | string | Con datos reales: «Experian, 23 de mayo de 2026, 23 páginas» |
