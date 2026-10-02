# Research — Resumen del consumidor (014)

No quedaron marcas «NEEDS CLARIFICATION» en el contexto técnico. Cada decisión abajo resuelve una pregunta de diseño.

## R1. Una sola fuente de verdad: quién decide qué es un problema

- **Decision**: un módulo nuevo y puro, `analista-credito.js` (`window.ThemoraAnalista` / `module.exports`), recibe el `Reporte` de `ThemoraLector.leerReporte()` y devuelve el `Analisis` (resumen, cuentas con problema, hallazgos legales, pasos). La página solo pinta. `evaluateDocument()` deja de producir hallazgos visibles; se conserva únicamente como respaldo cuando `ThemoraLector` no cargó (mismo patrón que hoy).
- **Rationale**: hoy los «puntos negativos» salen de buscar palabras en todo el texto (no saben qué cuenta) y los números del resumen salen del lector: por eso se contradicen (6 frente a 12). Con un solo módulo, todos los números se derivan de la misma lista (Principio IV). Un módulo puro, igual que `lector-credito.js`, `tds.js` y `cartas-bilingues.js`, se prueba en Node sin navegador.
- **Alternatives considered**: (a) arreglar `evaluateDocument` — sigue sin saber a qué cuenta pertenece cada señal; (b) meter las reglas dentro de `lector-credito.js` — mezcla leer con juzgar, y la especificación 013 separa a propósito «leer» de «analizar».

## R2. Cuándo una cuenta tiene problemas y de qué color

- **Decision**: reglas declaradas como datos (lista `REGLAS` dentro del módulo, como pide FR-022b de la 013), evaluadas en orden; la gravedad de la cuenta es la más alta de sus hallazgos.

| Regla | Detecta (campos del lector) | Gravedad |
|---|---|---|
| `cobranza` | `esCobranza` o tipo `cobranza` | roja |
| `charge_off` | `montoChargeOff`/`fechaChargeOff` con valor, código `charge_off` en el historial, o estado/estadoPago con «charge off», «charged off», «written off», «profit and loss» | roja |
| `reposesion` | estado o comentarios con «repossess» o código de historial `reposesion` | roja |
| `ejecucion_hipotecaria` | estado o comentarios con «foreclos» o código `ejecucion` | roja |
| `atraso` | algún mes del historial con código `atraso_30`…`atraso_180`, o `atrasosListados` | naranja |
| `saldo_vencido` | `vencido.valor > 0` | naranja |
| `marcada_por_buro` | regla `cuenta-en-adversas` o marca «Potentially negative» de Experian, sin ninguna de las anteriores | amarilla |
| `obsoleta` (se suma a la que aplique) | inicio = DOFD (o, si falta, el mes verificable más antiguo con atraso en el historial); inicio + 7 años + 180 días < fecha del reporte | conserva la del problema; añade hallazgo |

Registros públicos: cada uno es un «problema» propio (rojo) aunque no sea cuenta.
- **Rationale**: los colores los fijó el dueño (rojo cobranza/charge-off, naranja atrasos, amarillo revisar). «Written off» aparece literal en el reporte de muestra de Experian («Paid, Closed. $144 written off.»): una cuenta pagada y cerrada sigue siendo negativa si hubo pérdida.
- **Alternatives considered**: un puntaje numérico de gravedad — el consumidor no lo necesita y obliga a explicar un número inventado.

## R3. Qué dice la ley y qué se puede citar hoy

- **Decision**: cada hallazgo cita solo secciones ya cargadas en `zyron-leyes.js` (FCRA y FDCPA). Una prueba verifica que toda cita del catálogo existe en `zyron-leyes.js`. El texto se verificó contra el texto oficial que traen los skills `claude-legal-federal-laws` (`references/federal-debt-laws/FCRA.md` y `FDCPA.md`).

| Hallazgo | Qué dice la ley (resumen educativo) | Cita |
|---|---|---|
| charge-off, cobranza | Pueden reportarse hasta 7 años; el plazo empieza 180 días después del inicio de la morosidad que precedió al charge-off o a la cobranza, y no se reinicia si la deuda se vende o se paga | FCRA § 1681c(a)(4) y § 1681c(c) |
| atraso, reposesión, ejecución | Otra información negativa: hasta 7 años | FCRA § 1681c(a)(5) |
| bancarrota (registro público) | Hasta 10 años desde la orden | FCRA § 1681c(a)(1) |
| cualquier dato inexacto | Si se disputa con el buró, debe reinvestigar gratis en 30 días (hasta 45 si se aporta información nueva) y corregir o borrar lo que no pueda verificar | FCRA § 1681i(a) |
| dato inexacto del acreedor | Quien reporta debe investigar cuando el buró le pasa la disputa | FCRA § 1681s-2(b) |
| cobranza | Derecho a pedir por escrito la validación dentro de los 30 días del aviso; mientras tanto el cobrador debe pausar el cobro | FDCPA § 1692g(b) |
| cobranza disputada | Comunicar información de crédito sobre una deuda sin indicar que está disputada, cuando se sabe que lo está, es una práctica prohibida. | FDCPA § 1692e(8) |
| obsoleta | Información negativa más antigua que el plazo no debería aparecer | FCRA § 1681c(a) |

- **Rationale**: Principio I (describir lo que dice la ley, sin «debes» ni «es ilegal») y Principio IV (una sola verdad: las mismas secciones que Zyron). FCBA, ECOA, CROA, Reg V y Reg F están en los skills de leyes pero **no** en el sitio; se dejan para una especificación que las cargue con sus pruebas, y el análisis lo dice con franqueza cuando aplique (FR-017).
- **Alternatives considered**: citar desde los archivos del skill directamente — están fuera del proyecto y la constitución prohíbe copiar textos completos de leyes al repositorio.

## R4. Lenguaje del análisis («como un analista»)

- **Decision**: cuatro partes fijas por hallazgo — **Qué vimos** (dato + página), **Qué significa para ti**, **Qué dice la ley**, **Qué puedes hacer** — redactadas como opciones («Una opción es…», «Si el dato no es correcto, puedes…»). Las opciones siguen el orden que recomiendan los skills de leyes: verificar el dato → disputa directa y documentada al buró (correo certificado con acuse) → disputa paralela al acreedor → validación con el cobrador cuando es cobranza. Se recuerda que una queja a la CFPB no es una disputa FCRA. Una prueba prohíbe «debes», «no pagues», «es ilegal», «garantiz».
- **Rationale**: es lo que hace un analista sin dar asesoría legal; respeta el Principio I y el aviso «no es asesoría legal».

## R5. Datos generales: nombre, SSN, teléfonos

- **Decision**:
  - Nombres: el lector descarta valores que coinciden con `/^(name|address)\s*id\b|^#?\d[\d\s-]*$/i` y las celdas sueltas se unen por columna en Experian (un nombre partido en dos renglones de la misma columna). El nombre principal es el primero que queda; si no queda ninguno, «Nombre no legible en el reporte».
  - SSN: el lector guarda `ssnUltimos4` (solo cuatro dígitos, de un patrón `XXX-XX-1234`, `***-**-1234` o completo) y descarta el resto en la misma línea donde lo lee. Enmienda FR-017 de la 013: antes no se guardaba nada. `ssnUltimos4` **no** entra en lo que se guarda en la cuenta ni en nada que vaya a la IA; solo se pinta.
  - Teléfono y dirección: el actual es el marcado «actual» o el primero; el resto se cuenta («y 2 más»).
- **Rationale**: el dueño pidió `xxx-xx-1234`. Los cuatro últimos son el estándar que usan los propios burós; aun así se mantienen fuera de lo guardado (Principio II, mínimo necesario). El Annual Credit Report de Experian no imprime SSN: se muestra «Este reporte no muestra tu número de Seguro Social».

## R6. Cartel de consultas

- **Decision**: botón con ícono junto a cada número, que abre un panel con el atributo nativo `popover` (cierre al tocar fuera y con Escape incluidos), lista agrupada por empresa con sus fechas, con desplazamiento propio. Respaldo: si el navegador no soporta `popover`, el panel se muestra/oculta con `hidden` y el mismo botón.
- **Rationale**: sin dependencias nuevas (constitución: sitio estático sin framework). `aria-expanded` en el botón; foco al primer elemento del cartel.
- **Alternatives considered**: `<dialog>` modal — bloquea la página por una lista; `<details>` — no flota y empuja el contenido.

## R7. Círculos y análisis abierto

- **Decision**: patrón de divulgación: cada círculo es un `<button aria-expanded aria-controls>`; un solo panel de análisis debajo de la fila de círculos (FR-016). Iniciales: dos primeras palabras significativas del acreedor, sin «BANK», «NA», «CARD», «CREDIT», «FINANCIAL», «SERVICES», «INC», «LLC», «THE», «OF»; si queda una sola palabra, sus dos primeras letras. Debajo: nombre corto (máx. 22 caracteres) y la frase del problema principal. La gravedad se dice en texto oculto visualmente y en la frase (FR-013).
- **Rationale**: lo pidió el dueño; un panel único evita la pared de fichas de hoy.

## R8. Pasos del agente

- **Decision**: lista ordenada de cuatro pasos (`<ol aria-live="polite">`). Observar se actualiza con el avance por página que ya entrega `extractPdf`; Leer, Revisar y Concluir se marcan con los números reales del `Analisis`. Sin animación con `prefers-reduced-motion`; con movimiento, solo el trazo del paso en curso (un único momento animado, como pide la guía de diseño).
- **Rationale**: los pasos reflejan trabajo real, no una espera fingida; se elimina el `setTimeout(400)` decorativo.

## R9. Guardar en la cuenta y Mr. Credit Coach

- **Decision**: `CCAuth.saveAnalysis()` sigue recibiendo la misma forma (`health`, `tone`, `conclusion`, `negatives`, `positives`, `accountsSummary`, `inquiriesSummary`). Un adaptador `analisisParaGuardar()` la construye desde el `Analisis` (`negatives` = cuentas con problema, `positives` = []). `ssnUltimos4`, nombres y direcciones no entran. `credit-coach.js` no lee `__ccLastAnalysis` (verificado con graphify y búsqueda), así que no cambia.
- **Rationale**: no tocar Supabase ni `cuenta.html` en esta entrega.

## R10. Dirección visual (skill frontend-design, dentro del sistema existente)

- **Decision**: no se inventa un estilo nuevo: el sitio ya tiene «Mar en calma» + «El resaltador» y crédito usa la copia lavanda. Lo memorable de esta pantalla es **una sola cosa**: la fila de círculos, que se lee como las marcas que un analista deja con su resaltador en el margen del reporte. Todo lo demás queda quieto.
  - Color: tinta `#123F4F` (texto), papel `#F5F9F9`, copia lavanda `#ECEAF7` con franja `#8C86C9` (cuadro grande), rojo = `--corrector` `#C7372F`, naranja = token nuevo `--atencion` `#B4561B` (contraste ≥4.5:1 con blanco), amarillo = `--resaltador` `#FFE27A` con iniciales en tinta.
  - Tipografía: Bricolage Grotesque para iniciales, cifras y títulos; Literata para las explicaciones. Sin mayúsculas sostenidas en etiquetas, sin cejas sobre cada título, sin flechas añadidas a los botones.
  - Forma: `--radius` 6px en cuadros; 50% solo en los círculos (la regla de la 011 ya reserva el círculo para avatares, y estos funcionan como avatares de acreedores).
  - Cuadro grande alineado a la izquierda, datos en dos columnas en escritorio y una en teléfono; las cifras de consultas duras en tamaño mayor que las blandas.
- **Rationale**: el dueño ya eligió y probó la paleta; cambiarla rompería la coherencia con las otras 17 páginas. Gastar la audacia solo en los círculos cumple «spend your boldness in one place».
- **Alternatives considered**: tarjetas de colores por cuenta (la plantilla de «kit SaaS» que la guía pide evitar); semáforo con íconos — menos personal que las iniciales del acreedor.
