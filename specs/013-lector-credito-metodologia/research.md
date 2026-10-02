# Research — Fase 1: lectura cuenta por cuenta

Fuentes consultadas: `credito.html` (lector actual, funciones `extractPdf`, `detectCreditBureau`, `stripReportNoise`, `extractAccountsSummary`), el grafo de `graphify` (patrón de módulos navegador+Node; `ThemoraCartas`; `CCAuth.saveAnalysis`), las guías `EXPERIAN_CR.md` y `TRANSUNION_CR.md`, el formato de un reporte real de Equifax (mayo 2026, usado solo como referencia de estructura) y `THEMORA-MASTER-SPEC.md` §6 y §27.

No quedan puntos «NEEDS CLARIFICATION» para la Fase 1. La dirección de Equifax para disputas (FR-054) pertenece a la Fase 5.

---

## R1. Extraer texto del PDF con posición

- **Decision**: `extractPdf` agrupa los fragmentos de pdf.js por línea (misma `transform[5]`, con tolerancia de 2 pt) y entrega, por página, `{numero, lineas:[{texto, piezas:[{texto, x}]}]}`. Word y Excel entregan el mismo formato, pero sin `x`.
- **Rationale**: hoy el texto se une con `hasEOL`, lo que mezcla columnas. El historial de pagos de Equifax y TransUnion es una cuadrícula de meses: sin la posición horizontal no se puede saber a qué mes pertenece un «30». Con `x` se asigna cada código a la columna del mes más cercana.
- **Alternatives considered**: (a) Mantener el texto plano y adivinar el mes por orden: produce meses falsos cuando hay celdas vacías (se ve en el reporte real: «2026 | | 30 |»). Rechazado por el Principio I. (b) OCR o IA: innecesario y rompe los Principios II y III.

## R2. Perfiles por buró como datos

- **Decision**: `lector-credito-perfiles.js` exporta un objeto por buró con `id`, `nombre`, `fuente`, `verificadoEl`, `detectar` (frases fuertes), `ruido` (encabezados y pies de página repetidos, leyendas, «Summary of Your Rights»), `secciones` (encabezados → sección canónica), `etiquetas` (etiqueta del reporte → campo canónico), `codigosPago`, `codigosNarrativos` (solo Equifax) y `reglas` (por ejemplo «High Credit es límite si aparece el código 233»).
- **Rationale**: el MASTER-SPEC §7 pide una sola metodología y tres módulos de presentación. Con perfiles como datos se puede revisar y fechar cada buró sin tocar la lógica (Principio IV).
- **Alternatives considered**: un analizador por buró con su propia lógica. Rechazado: triplica el código y las reglas divergen.

## R3. Detección del buró

- **Decision**: se reutiliza la puntuación de `detectCreditBureau` (menciones tempranas + frases fuertes), movida al motor y alimentada por `perfil.detectar`. Se añade la señal de Equifax observada en el reporte real («EFX-ACR» en el pie de página y «equifax.com/personal/disputes»). Un empate o una puntuación cero → perfil genérico con `formatoVerificado:false`.
- **Rationale**: la función actual ya funciona y tiene cobertura manual; moverla la hace comprobable en Node.

## R4. Segmentación en secciones y cuentas

- **Decision**:
  1. Se eliminan las líneas de ruido del perfil (encabezado repetido «Prepared for / Date / Confirmation #», pie «Page N of M», leyendas de códigos, todo lo que sigue a «A Summary of Your Rights»).
  2. Se marca la sección activa al encontrar un encabezado del perfil.
  3. Dentro de una sección de cuentas, una cuenta nueva empieza en:
     - **Equifax**: una línea de nombre de acreedor en mayúsculas seguida, en la línea siguiente, de «Date Reported:». El sufijo « - Closed» marca la cuenta como cerrada.
     - **Experian**: la etiqueta «Account Name».
     - **TransUnion**: el nombre del acreedor seguido del bloque de datos de la cuenta; en el reporte por correo, las cobranzas pueden venir dentro de «Accounts with Adverse Information».
     - **Genérico**: la repetición de una etiqueta ancla («Account Name», «Creditor», «Account Number», «Acreedor», «Número de cuenta»).
- **Rationale**: cada buró marca el inicio de una cuenta de forma distinta, pero todos tienen un ancla estable.
- **Alternatives considered**: dividir por página. Rechazado: una cuenta puede cruzar páginas y una página puede tener varias cuentas.

## R5. Etiqueta → valor

- **Decision**: para cada línea se buscan todas las etiquetas conocidas del perfil. El valor de una etiqueta es el texto entre el final de esa etiqueta y el inicio de la siguiente etiqueta conocida de la misma línea, o el final de la línea. Un valor vacío, «-» o «—» queda como `{estado:'no_reportado'}`.
- **Rationale**: Equifax imprime tres etiquetas por línea («Date Opened: 08/18/2025 Date of 1st Delinquency: Terms Frequency: Monthly»), y la mitad vienen vacías. Así se evita que «Terms Frequency» se lea como valor de la DOFD, y se cumple FR-013.

## R6. Historial de pagos y tabla de 24 meses

- **Decision**:
  - **Cuadrícula anual** (Equifax, TransUnion): se leen las `x` de los encabezados de mes («Jan» … «Dec») y cada código se asigna al mes más cercano, si la distancia es menor que la mitad del ancho de una columna. Si no hay `x` o la distancia es mayor, el registro es `{anio, mes:null, codigo, mesVerificable:false}`.
  - **Tabla de 24 meses** (Equifax): las columnas se ubican por las `x` de sus encabezados (Balance, Scheduled Payment, Actual Payment, Last Payment Date, Past Due, High Credit, Credit Limit, Narrative Codes). Sin `x`, solo se guardan el mes y el primer monto como saldo, con `columnasVerificables:false`.
  - **Experian**: «Late Payments» (lista de meses) y la cuadrícula de códigos de la guía.
- **Rationale**: FR-011 exige el historial mes a mes, y la US1 (escenario 6) exige no inventar el mes.

## R7. Fechas

- **Decision**: formatos aceptados: `MM/DD/YYYY`, `MM/YYYY`, `MM/YY` (solo en la tabla de 24 meses), «Month YYYY», «Mon D, YYYY», y sus equivalentes en español. Cada fecha se guarda como `{texto, iso}`, donde `iso` puede ser parcial (`2025-05`) cuando falta el día. Nunca se completa un día que no está en el reporte.
- **Rationale**: la Fase 2 compara fechas; necesita saber qué precisión tiene cada una.

## R8. Montos

- **Decision**: «$1,500», «$1,500.00» o «1500» se convierten en el número 1500. «$0» es 0. Vacío o «-» significa no reportado.
- **Rationale**: distinguir cero de ausente es la regla número 5 del MASTER-SPEC §30.

## R9. Enmascarado y datos sensibles

- **Decision**: los números de cuenta conservan solo los últimos 4 dígitos visibles (`*6602`, `137995XXXX` → `…XXXX` más los últimos 4 si los hay). Cualquier secuencia de 9 o más dígitos en un campo de cuenta se enmascara. En `Identidad` solo se guardan `ssnMostrado` (booleano) y `fechaNacimientoMostrada` (booleano); los valores se descartan después de leer la línea. Nombres, direcciones y teléfonos se conservan en memoria porque los formularios de corrección de identidad (spec 005) los necesitan.
- **Rationale**: FR-017 y el Principio II.

## R10. Límite, saldo más alto y monto original

- **Decision**:
  - **Equifax**: si la cuenta o su fila de 24 meses lleva el código narrativo 233 («Amount in High Credit Column is Credit Limit»), `saldoMasAlto` queda como no reportado y el valor pasa a `limite`, con la nota de la regla aplicada.
  - **Experian**: «Credit Limit / Original Balance» va a `limite` en cuentas rotativas y a `montoOriginal` en préstamos a plazos. Si el tipo no se puede determinar, va a `limiteOMontoOriginal`.
- **Rationale**: sin esta regla, la utilización de la Fase 2 saldría mal (MASTER-SPEC §8).

## R11. Vocabulario común de códigos de pago

- **Decision**: `al_dia` (OK, «Paid on time», «Pays As Agreed»), `atraso_30` … `atraso_180`, `cobranza` (C), `charge_off` (CO), `reposesion` (R), `entrega_voluntaria` (V, VS), `ejecucion_hipotecaria` (F), `ejecucion_iniciada` (FS), `bancarrota` (B, BK), `cerrada` (CLS), `muy_nueva` (TN), `sin_datos` (ND, «-», «No Data Available»), `pagada_por_acreedor` (PBC), `reclamo_gobierno` (G), `reclamo_seguro` (IC), `incumplimiento` (D). Cada código conserva también el texto original.
- **Rationale**: FR-016. Los nombres internos son descriptivos; la interfaz muestra el texto en español.

## R12. Consultas

- **Decision**: una fila con varias fechas produce una consulta por fecha. El tipo sale de la columna «Inquiry Type» (Equifax), de la sección (Experian: «Hard Inquiries» o «Soft Inquiries»; TransUnion: «Regular», «Promotional» o «Account Review») o de la palabra «Hard»/«Soft». Se guarda la empresa, el tipo, la fecha, la fecha de salida si el reporte la muestra (Experian «Removal Date») y el contacto enmascarado solo en teléfonos personales (los de empresas se conservan).
- **Rationale**: en el reporte real la misma empresa aparece como consulta dura y como blanda en las mismas fechas; la Fase 2 necesita cada fecha por separado para detectar la agrupación por comparación de tasas.

## R13. Texto explicativo del buró

- **Decision**: cada perfil define `ruido` (frases y bloques de texto educativo del buró). El texto que coincide se descarta antes de segmentar. Se reutilizan las frases de `stripReportNoise`.
- **Rationale**: SC-003 (0 falsos positivos por leyendas).

## R14. Convivencia con la evaluación actual

- **Decision**: en la Fase 1, `runAnalysis` llama primero a `ThemoraLector.leerReporte(paginas)` y después a `evaluateDocument(texto)`, que no cambia. `render` recibe ambos resultados. Los contadores «Cuentas», «Tarjetas» y «Consultas» del resumen pasan a salir del registro nuevo. La lista de negativos y positivos sigue saliendo de `evaluateDocument` hasta la Fase 2.
- **Rationale**: se entrega la US1 sin romper la Fase 0 ni las cartas (spec 005), y cada fase se puede publicar sola.

## R15. Fixtures sintéticos

- **Decision**: `tests/fixtures/credito/*.json` contienen páginas con líneas y `x`, escritas a mano: personas inventadas («ANA EJEMPLO RUIZ», «Calle Falsa 123»), acreedores genéricos («BANCO EJEMPLO», «TARJETA DEMO») y números inventados. Se imitan el orden, las etiquetas y los vacíos del formato real, incluidos una cuenta con charge-off pagado, un atraso en la cuadrícula, dos cuentas del mismo acreedor con la misma fecha de apertura y una empresa con consultas dura y blanda.
- **Rationale**: FR y Assumptions de la spec: ningún dato del reporte real entra al repositorio.

## R16. Reportes en español

- **Decision**: cada perfil admite alias en español de sus etiquetas cuando se conocen. El perfil genérico incluye los más comunes («Acreedor», «Número de cuenta», «Fecha de apertura», «Saldo», «Límite de crédito», «Estado», «Fecha del primer atraso»).
- **Rationale**: caso borde de la spec; el público es hispanohablante.

## R17. Dirección visual del lector (frontend-design)

- **Decision**: el resultado se presenta como **la copia del reporte de la persona, ya ordenada**: cada cuenta es una ficha sobre papel rayado lavanda (la «copia» del crédito), con el resaltador amarillo solo en DOFD, charge-off y vencido, y una franja de 24 meses del historial como único elemento llamativo. Detalle en [contracts/ui-cuentas.md](./contracts/ui-cuentas.md).
- **Rationale**: el sistema «Mar en calma» ya dice que el resaltador es «lo que importa» y que el crédito es lavanda. Llevar esa metáfora al resultado hace que el lector se parezca al objeto que la persona tiene en la mano, no a un tablero genérico.
- **Alternatives considered**:
  - Tabla ancha con una fila por cuenta. Rechazada: en el teléfono obliga a desplazarse de lado y esconde las fechas, que son lo más importante.
  - Tarjetas redondeadas con sombra, iguales entre sí (el «kit SaaS»). Rechazadas: es el aspecto por defecto, y además el sitio fija el radio en 6 px.
  - Pestañas por sección. Rechazadas: esconden contenido y complican imprimir.
