# Data Model — Lector de reportes de crédito

El modelo sirve a las cinco fases. La Fase 1 **llena** `Reporte`, `Cuenta`, `Consulta`, `RegistroPublico`, `Aviso` e `Identidad`. `Asunto`, `Evidencia`, `Comparacion` y `Disputa` quedan descritos para las fases siguientes y **no se implementan ahora**.

Convenciones:

- **`Valor<T>`**: todo campo leído del reporte es `{ valor: T, texto: string, origen: Origen }`, o `{ estado: 'no_reportado', origen: Origen }` si la etiqueta aparece vacía. Si la etiqueta no aparece, el campo no existe en el registro (`undefined`). Así se distinguen tres casos: tiene valor, está impreso vacío y no aparece.
- **`Fecha`**: `{ texto, iso }`. `iso` puede ser parcial: `'2025'`, `'2025-05'` o `'2025-05-19'`.
- **`Monto`**: número en dólares, sin centavos si el reporte no los trae. `0` es un valor real, distinto de «no reportado».

## Origen

De dónde salió un dato (FR-012).

| Campo | Tipo | Regla |
|---|---|---|
| `pagina` | número | Página del documento, contando desde 1 |
| `seccion` | string | Sección canónica (`personal`, `avisos`, `resumen`, `cuentas`, `adversas`, `satisfactorias`, `cobranzas`, `consultas`, `registros_publicos`, `desconocida`) |
| `etiqueta` | string | Etiqueta tal como está impresa (por ejemplo `'Date of 1st Delinquency'`) |
| `linea` | número | Índice de la línea dentro de la página (para depurar) |

## Reporte

| Campo | Tipo | Regla |
|---|---|---|
| `buro` | `'equifax' \| 'experian' \| 'transunion' \| 'desconocido'` | Detectado (R3) |
| `perfil` | `{ id, verificadoEl, formatoVerificado }` | `formatoVerificado:false` con el perfil genérico |
| `fechaReporte` | `Valor<Fecha>` | «Report Date», «Date:» del encabezado, etc. |
| `paginasLeidas` | número | Máximo 150; si hay más, `paginasTotales` > `paginasLeidas` |
| `paginasTotales` | número | |
| `identidad` | `Identidad` | |
| `avisos` | `Aviso[]` | |
| `cuentas` | `Cuenta[]` | Incluye las cobranzas (con `esCobranza:true`) |
| `consultas` | `Consulta[]` | Una por fecha |
| `registrosPublicos` | `RegistroPublico[]` | |
| `advertencias` | `Advertencia[]` | Por ejemplo: `sin_texto` (PDF escaneado), `paginas_truncadas`, `formato_no_verificado`, `mes_no_verificable` |
| — Fases 2 a 5 — | | `asuntos: Asunto[]`, `evidencias`, `disputas` |

Una advertencia es `{ codigo, detalle, origen? }`.

## Identidad

| Campo | Tipo | Regla |
|---|---|---|
| `nombres` | `Valor<string>[]` | Nombre principal y alias («Former Names», «Also Known As», «Names reported») |
| `direcciones` | `Valor<string>[]` | Actual y anteriores, con `tipo: 'actual' \| 'anterior'` cuando el reporte lo distingue |
| `telefonos` | `Valor<string>[]` | Solo los del bloque personal |
| `empleadores` | `Valor<string>[]` | |
| `ssnMostrado` | booleano | **Nunca se guarda el número** (FR-017) |
| `ssnUltimos4` | string de 4 dígitos o `null` | **(014)** Solo los últimos 4 dígitos impresos; el resto se descarta al leerlo (enmienda a FR-017) |
| `fechaNacimientoMostrada` | booleano | **Nunca se guarda la fecha** (FR-017) |

## Aviso

Avisos del archivo: alerta de fraude, alerta de servicio activo, congelamiento, bloqueo, exclusión de ofertas preseleccionadas, declaración del consumidor.

| Campo | Tipo |
|---|---|
| `tipo` | `'alerta_fraude' \| 'alerta_servicio_activo' \| 'congelamiento' \| 'bloqueo' \| 'exclusion_ofertas' \| 'declaracion' \| 'otro'` |
| `texto` | `Valor<string>` |

Los textos «None» o «No Statement on file» significan que no hay aviso: no se crea ninguno.

## Cuenta

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | Estable dentro del reporte: `buro-acreedor-últimos4-apertura` normalizado |
| `acreedor` | `Valor<string>` | «DISCOVER CARD», «Account Name» |
| `acreedorOriginal` | `Valor<string>` | Cobranzas y cuentas vendidas |
| `numero` | `Valor<string>` | **Siempre enmascarado** (R9) |
| `tipo` | `Valor<TipoCuenta>` | `rotativa`, `plazos`, `hipoteca`, `auto`, `estudiantil`, `cobranza`, `abierta`, `deposito`, `otra` + texto original |
| `responsabilidad` | `Valor<string>` | Individual, conjunta, usuario autorizado, cofirmante |
| `cerrada` | booleano | Por «- Closed», «Date Closed» con valor o estado cerrado |
| `esCobranza` | booleano | Por sección, tipo o estado |
| `estado` | `Valor<string>` | «Pays As Agreed», «Charge Off», «Open, Current» |
| `estadoPago` | `Valor<string>` | Experian «Payment Status» |
| `designadorActividad` | `Valor<string>` | Equifax «Activity Designator» («Paid», «Paid and Closed») |
| `saldo` | `Valor<Monto>` | |
| `limite` | `Valor<Monto>` | Solo cuentas rotativas o cuando la regla 233 lo indica |
| `saldoMasAlto` | `Valor<Monto>` | «High Credit» cuando no es el límite |
| `montoOriginal` | `Valor<Monto>` | Préstamos a plazos, cobranzas («Original Loan Amount») |
| `limiteOMontoOriginal` | `Valor<Monto>` | Solo si el tipo es indeterminado (R10) |
| `vencido` | `Valor<Monto>` | «Amount Past Due» |
| `pagoProgramado` | `Valor<Monto>` | «Scheduled Payment Amount», «Monthly Payment» |
| `pagoReal` | `Valor<Monto>` | «Actual Payment Amount» |
| `montoChargeOff` | `Valor<Monto>` | |
| `plazo` | `Valor<string>` | «Term Duration», «Terms» |
| `frecuencia` | `Valor<string>` | «Terms Frequency» |
| `mesesRevisados` | `Valor<number>` | |
| **Fechas** | | |
| `fechaApertura` | `Valor<Fecha>` | |
| `fechaCierre` | `Valor<Fecha>` | |
| `dofd` | `Valor<Fecha>` | «Date of 1st Delinquency», «Date of First Delinquency» |
| `fechaMorosidadGraveReportada` | `Valor<Fecha>` | Equifax «Date Major Delinquency 1st Reported» |
| `ultimoPago` | `Valor<Fecha>` | |
| `ultimaActividad` | `Valor<Fecha>` | **No** se usa como inicio del periodo de reporte (FR-024) |
| `fechaReportada` | `Valor<Fecha>` | «Date Reported», «Date Updated», «Payment Status Date», «Status Date» |
| `fechaChargeOff` | `Valor<Fecha>` | |
| `fechaCobranza` | `Valor<Fecha>` | «Collection Opened», «Date Placed» |
| **Historial** | | |
| `historial` | `MesHistorial[]` | Cuadrícula de códigos |
| `historial24` | `FilaHistorial24[]` | Tabla de 24 meses (Equifax) |
| `atrasosListados` | `Valor<Fecha>[]` | Experian «Late Payments» |
| `codigosNarrativos` | `{ codigo, descripcion }[]` | Equifax |
| `comentarios` | `Valor<string>[]` | «Comments», «Remarks», «Narrative» |
| `declaracionConsumidor` | `Valor<string>` | Experian «Your Statements» |
| `contacto` | `Valor<string>` | Dirección y teléfono del acreedor |
| `reglasAplicadas` | string[] | Por ejemplo `'equifax-233-high-credit-es-limite'` |
| — Fases 2 a 5 — | | `asuntoIds`, `evidenciaIds` |

### MesHistorial

| Campo | Tipo | Regla |
|---|---|---|
| `anio` | número | |
| `mes` | 1–12 o `null` | `null` si no se pudo ubicar |
| `codigo` | Código común (R11) | |
| `texto` | string | Código tal como está impreso |
| `mesVerificable` | booleano | `false` → la interfaz dice «mes no verificable» |
| `origen` | `Origen` | |

### FilaHistorial24

`{ mes: Fecha, saldo, pagoProgramado, pagoReal, fechaUltimoPago, vencido, saldoMasAlto, limite, codigosNarrativos, columnasVerificables, origen }`. Los montos son `Valor<Monto>`.

## Consulta

| Campo | Tipo | Regla |
|---|---|---|
| `empresa` | `Valor<string>` | |
| `tipo` | `'dura' \| 'blanda' \| 'promocional' \| 'revision_cuenta' \| 'desconocida'` | R12 |
| `fecha` | `Valor<Fecha>` | Una consulta por fecha |
| `fechaSalida` | `Valor<Fecha>` | Solo si el reporte la imprime; nunca se calcula (FR-027) |
| `tipoNegocio` | `Valor<string>` | Experian «Business Type» |
| `contacto` | `Valor<string>` | |

## RegistroPublico

`{ tipo (bancarrota_7, bancarrota_13, bancarrota_11, bancarrota_12, otro), tribunal, numeroCaso (enmascarado), fechaPresentacion, fechaResolucion, estado, fuente }`, todos con `Valor<…>`.

---

## Entidades de fases posteriores (solo diseño)

### Asunto — Fase 2

`{ id, categoria (FR-020), cuentaId?, campo, valorReportado, valorEsperado?, fundamento, evidenciasSugeridas[], referenciasLegales[], explicacion (8 partes), estado: 'abierto' | 'descartado' | 'en_disputa' | 'resuelto' }`. Transiciones: `abierto → descartado` (la persona lo confirma correcto), `abierto → en_disputa` (Fase 5), `en_disputa → resuelto | abierto` (tras verificar el resultado).

### Evidencia — Fase 2

`{ id, tipo, descripcion, fecha?, documento? }`. Solo son sugerencias hasta la Fase 5; no se sube ningún archivo.

### Comparacion — Fase 3

`{ cuentas: { [buro]: cuentaId }, confianza: 'alta' | 'media' | 'baja', diferencias: [{ campo, valores: { [buro]: Valor } }] }`.

### Disputa — Fase 5

`{ id, destinatario, buro, cuentaId, asuntoIds, evidenciaIds, fechaPreparada, fechaEnviada, rastreo, fechaRespuesta, resultado: 'corregido' | 'eliminado' | 'sin_cambio' | 'no_verificable', siguientePaso }`.
