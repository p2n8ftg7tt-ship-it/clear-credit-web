# Research — Herramientas de cálculo del agente de crédito (016)

No quedó ningún «NEEDS CLARIFICATION» en el contexto técnico. Cada sección registra una decisión de diseño, por qué se tomó y qué se descartó.

## R1. Ubicación: un archivo nuevo `herramientas-credito.js` en la raíz

- **Decision**: crear `herramientas-credito.js` en la raíz, con el mismo patrón UMD de `lector-credito.js` y `analista-credito.js` (`window.ThemoraHerramientas` en el navegador, `module.exports` en Node).
- **Rationale**:
  - **Separación de capas.** `lector-credito.js` extrae y normaliza; `analista-credito.js` interpreta (problemas, pasos, conclusión) y es quien hablará con el consumidor. Si los cálculos vivieran dentro del analista, se mezclarían cálculo e interpretación, justo lo que la spec prohíbe (FR-003).
  - **Mismo código en navegador y servidor (FR-009, Principio III).** `netlify/functions/revisar-negocio.js` ya hace `require("../../tds.js")` sobre un módulo de la raíz, así que la futura función del agente puede cargar este archivo igual, sin copiarlo.
  - **Una sola verdad (Principio IV).** El analista (014) y el agente (fase siguiente) van a usar las mismas funciones. Ninguno calcula por su cuenta.
- **Alternatives considered**:
  - *Dentro de `analista-credito.js`*: descartado por mezclar capas. Además, el agente del servidor tendría que cargar también la lógica de presentación.
  - *En `netlify/functions/lib/`*: descartado porque el navegador no la puede cargar y se rompe el camino sin IA.
  - *Varios archivos (`herramientas/fecha-salida.js`, …)*: descartado por ahora. El sitio no tiene paso de compilación y cada archivo sería otra etiqueta `<script>`. Con cuatro herramientas y menos de unas 500 líneas, un archivo es más simple. Si pasa de unas 800 líneas, se divide (ver R8).

## R2. Aritmética de fechas sin `Date` ni zona horaria

- **Decision**: toda la aritmética se hace con enteros de calendario `{anio, mes, dia}`:
  - `sumarMeses` recorta al último día del mes cuando el día no existe.
  - `sumarDias` convierte a número de día civil, suma y vuelve a convertir (algoritmo *days from civil* de Howard Hinnant).
  - Se compara por cadena ISO de largo fijo.
  - Nunca se usa `new Date()`, `Date.now()` ni `toISOString()`.
- **Rationale**: `Date` depende de la zona horaria y del horario de verano del dispositivo. Un DOFD «2021-03-01» podría convertirse en 28 de febrero en un teléfono de Los Ángeles. El determinismo (FR-001, SC-003) exige que el resultado no dependa del dispositivo.
- **Alternatives considered**: `Date.UTC(...)`. Funciona, pero es fácil mezclarlo con métodos locales por error. Una librería de fechas queda descartada por la regla de no agregar dependencias.

## R3. Regla de 180 días + 7 años y la estimación mensual

- **Decision**:
  - **DOFD con día** → `sumarAnios(sumarDias(dofd, 180), 7)`, `precision: 'dia'`, `estimada: false`. Si el día no existe (29 de febrero), se usa el último día del mes.
  - **DOFD con solo mes** → valor estimado = mes del DOFD + 90 meses. Rango: `desde` = (primer día del mes del DOFD + 180 días + 7 años) en meses; `hasta` = (último día del mes del DOFD + 180 días + 7 años) en meses. Se marca `precision: 'mes'`, `estimada: true`, `motivoEstimacion: 'dofd_sin_dia_exacto'`.
  - **DOFD con solo año** → `no_calculable / dofd_imprecisa`.
- **Rationale**: es lo que pidió el dueño. 180 días no se presentan como 6 meses jurídicos. La estimación mensual coincide con el ejemplo de la spec 013 (03/2019 → 09/2026) y con el valor aprobado `2028-09`. El rango deja ver la incertidumbre real (`2028-08` a `2028-09` para un DOFD `2021-03`).
- **Verificación a mano**: 2021-03-01 + 180 d = 2021-08-28; 2021-03-31 + 180 d = 2021-09-27; 2019-03-15 + 180 d = 2019-09-11.
- **Alternatives considered**: tomar el día 1 o el día 15 como supuesto. Descartado porque inventa un dato (FR-005).

## R4. Cuándo una cuenta es cobranza o charge-off (FR-016)

- **Decision**: es verdadero si se cumple **cualquiera** de estas condiciones:
  - `esCobranza === true`;
  - algún mes del `historial` tiene `codigo === 'charge_off'`;
  - `fechaChargeOff` o `montoChargeOff` tienen valor;
  - el texto de `estado`, `estadoPago` o `designadorActividad` coincide con `/charge[\s-]?off|charged[\s-]off|cargad[ao] a p[eé]rdida/i`.
- **Rationale**: el lector ya resuelve casi todo con `esCobranza` y los códigos R11, pero en algunos formatos el charge-off solo aparece en el texto del estado (por ejemplo, ACME: «Charge Off»).
- **Regla adicional**: si la cuenta es cobranza o charge-off, se aplica solo la regla de 7 años + 180 días a la cuenta. Sus atrasos anteriores forman parte de la misma morosidad y no generan fechas aparte.

## R5. Atrasos para la regla de «7 años desde el atraso» (FR-015)

- **Decision**:
  - Fuentes: meses del `historial` con código `atraso_30` … `atraso_180` y `mesVerificable: true`, más `atrasosListados` (Experian «Late Payments»).
  - Se eliminan los meses repetidos y se ordenan de forma ascendente.
  - Los meses con `mesVerificable: false` se devuelven en `omitidos` con motivo `mes_no_verificable`.
  - `historial24` no se usa en esta fase, porque trae montos y códigos narrativos, no el estado de pago por mes.
- **Rationale**: los meses del historial no traen día, así que todo resultado es una estimación mensual (`motivoEstimacion: 'atraso_sin_dia_exacto'`).
- **Riesgo anotado**: si un perfil de buró deja los atrasos solo en `historial24`, la herramienta no los verá. Se resuelve en el lector (spec 013), no aquí.

## R6. Utilización en centavos y redondeo

- **Decision**:
  - `centavos = Math.round(monto * 100)`.
  - Porcentaje por cuenta y total: `floor((200·saldo + límite) / (2·límite))`, en centavos y con enteros. Es el redondeo con mitades hacia arriba para valores positivos.
  - El total es `null` si no hay cuentas incluidas.
- **Rationale**: evita resultados de coma flotante como `0.1 + 0.2`. Con montos de crédito de consumo, los enteros quedan muy por debajo de 2^53.
- **Exclusiones**: en este orden, gana la primera que aplica: `cobranza`, `cargada_a_perdida`, `cerrada`, `sin_saldo`, `saldo_negativo`, `sin_limite`, `limite_cero`.
- **Qué se analiza**: solo cuentas con `tipo.valor === 'rotativa'`. Las que no son rotativas no aparecen ni en las excluidas.

## R7. Normalización de nombres para duplicados

- **Decision**: `normalizarNombre(s)` hace lo siguiente:
  1. Convierte el texto con `NFD` y quita las marcas diacríticas.
  2. Lo pasa a mayúsculas.
  3. Reemplaza `[^A-Z0-9]` por un espacio.
  4. Junta los espacios repetidos y recorta los extremos.

  Se compara por igualdad exacta. No se quitan sufijos («BANK», «NA», «INC») y no se usa comparación aproximada.
- **Rationale**: la spec prefiere no encontrar un par antes que inventarlo (FR-028). Quitar sufijos haría que «CAPITAL ONE BANK» y «CAPITAL ONE AUTO» parecieran el mismo acreedor.
- **Marca de venta**: `/\bsold\b|\btransferred\b|vendid[ao]|transferid[ao]/i` sobre `comentarios[]`, `estado`, `estadoPago` y `codigosNarrativos[].descripcion` de la cuenta original. Se devuelve la primera coincidencia en ese orden, con su texto y su origen.

## R8. Arquitectura extensible: catálogo de herramientas

- **Decision**: además de las cuatro funciones con nombre, el módulo exporta:
  - `CATALOGO`: un arreglo congelado de `{ nombre, version, alcance: 'cuenta' | 'reporte', ejecutar(reporte, opciones) }`;
  - `ejecutar(nombre, reporte, opciones)`: busca en el catálogo y llama a la herramienta. Un nombre desconocido lanza `TypeError`.

  Para agregar una herramienta nueva, se escribe su función pura, se agrega una entrada al catálogo y se escriben sus pruebas. Nada más cambia.
- **Rationale**: la fase siguiente (el agente con tool use) necesita llamar herramientas por nombre con el reporte guardado en el servidor. El agente pide «calcularFechaSalida de la cuenta B» y no manda la cuenta entera. El catálogo es el punto único donde se registran.
- **Not now (YAGNI)**: los esquemas JSON para la API de Claude, las descripciones en lenguaje natural y los límites de uso se definen en la fase del agente, a partir de este catálogo.
- **Señal para dividir el archivo**: más de unas 800 líneas o más de 8 herramientas. Entonces se pasa a `herramientas-credito/` con un archivo por herramienta y un índice, manteniendo el mismo API.

## R9. Fixture ACME/ZETA: reporte normalizado, no páginas

- **Decision**: `tests/fixtures/credito/agente/acme-zeta.json` es un `Reporte` ya normalizado (la forma de `esperado/*.json`, spec 013), no un arreglo de `Pagina`. Se agrega `tests/fixtures/credito/agente/LEEME.md` explicando la diferencia.
- **Rationale**: las herramientas prueban cálculo, no lectura. Si el fixture pasara por el lector, un cambio del lector rompería pruebas de cálculo, y las capas tienen que poder probarse por separado. El origen de cada dato (página y etiqueta) se escribe a mano en el fixture para poder comprobar FR-006.
- **Complemento**: una prueba de humo corre las cuatro herramientas sobre los seis `esperado/*.json` existentes. Verifica que no lanzan errores, que son deterministas y que no aparecen palabras prohibidas. Esto protege la integración con lo que el lector produce de verdad.

## R10. Prueba de palabras prohibidas (FR-004, SC-005)

- **Decision**: la prueba convierte toda salida con `JSON.stringify` y la compara contra `/debe eliminarse|ilegal|violaci[oó]n|fraude|garantiz|subir[aá] tu puntaje|must be removed|illegal|violation|fraud/i`.
- **Rationale**: es una comprobación mecánica y barata. La marca de venta devuelve el texto del reporte tal cual, y en teoría ese texto podría contener «fraud» (por ejemplo, «Account closed due to fraud»). En ese caso la prueba de humo lo señalaría; los fixtures sintéticos no tienen esos textos. Queda anotado: si un reporte real los trae, la exclusión se aplica solo a los campos generados por la herramienta, no al texto citado del reporte.
