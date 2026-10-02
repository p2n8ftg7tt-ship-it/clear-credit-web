# 015 — Plan de pruebas del nuevo analizador de crédito

Estado: borrador para aprobar. No hay código todavía.
Fecha: 2026-10-01.

## 1. Qué se prueba y por qué

El analizador de `credito.html` se va a reemplazar. Hoy el trabajo se reparte así: `lector-credito.js` (013) lee las páginas, `analista-credito.js` (014) arma el resumen y `credito.html` lo muestra. Las pruebas actuales (`tests/lector-credito*.test.js`, `tests/credito-*-ui.test.js`) solo usan **6 reportes sintéticos** que escribimos nosotros. Por eso comprueban que el código hace lo que pensamos, pero no que acierte con reportes reales.

Este plan agrega un **banco de reportes reales anonimizados**. Cada reporte va con el análisis que haría un especialista en crédito. El nuevo analizador se mide contra ese análisis en tres cosas:

1. **Cuentas detectadas**: ¿encontró todas las cuentas, y solo esas?
2. **Inconsistencias**: ¿vio lo que el especialista vio, con la ley correcta y sin inventar problemas?
3. **Prioridades del plan**: ¿le dice al consumidor que empiece por lo mismo que diría el especialista?

Por la arquitectura híbrida (ver la decisión del 2026-10-01), cada parte se prueba de una manera:

| Parte | Quién la hace | Cómo se prueba |
|---|---|---|
| Lectura y detección | Reglas en el navegador (deterministas) | Comparación exacta o con tolerancia definida contra el JSON esperado |
| Prioridad del plan | Reglas (orden base) | Comparación de orden (§6.3) |
| Explicación y redacción del plan | IA, sin datos personales | Revisión de estructura y límites, nunca del texto exacto (§7) |

## 2. El banco de reportes

### 2.1 Carpetas

```
pruebas/
  LEEME.md                       reglas del banco (anonimización, cómo agregar uno)
  reportes/
    experian-001-limpio.json
    equifax-002-cobranza-duplicada.json
    transunion-003-dofd-reenvejecida.json
    ...
  esperado/
    experian-001-limpio.json     mismo nombre que el reporte
    ...
  originales/                    SOLO local, nunca en git (PDF reales antes de anonimizar)
```

- **Mayúsculas**: hoy las carpetas se llaman `pruebas/Reportes` y `pruebas/Esperado`. Windows no distingue mayúsculas, pero git, Netlify y Node en Linux sí. Hay que renombrarlas a `reportes/` y `esperado/` antes de agregar archivos.
- **Nombre del archivo**: `<buro>-<nnn>-<caso>.json`. `nnn` es un número correlativo que no se reutiliza y `caso` es la razón principal por la que el reporte está en el banco.
- **Formato del reporte**: el mismo que ya usan los fixtures, un arreglo de `Pagina` (`specs/013-lector-credito-metodologia/contracts/lector-credito-api.md`). Es el texto que entrega pdf.js en `credito.html`. Así la prueba no depende de pdf.js y el banco se puede revisar a simple vista.
  - Ojo: el texto se extrae una vez con el **mismo código** de `credito.html` (pdf.js 3.11.174). Si cambia la extracción, hay que regenerar el banco.

### 2.2 Privacidad (bloqueante)

`netlify.toml` publica la raíz del repositorio (`publish = "."`). **Todo lo que esté en `pruebas/` quedaría público en el sitio** salvo que se bloquee. Antes de subir el primer reporte:

1. Agregar `pruebas/originales/` a `.gitignore`.
2. Agregar una redirección en `netlify.toml` que no sirva `/pruebas/*`, como ya se hace con `INFORME-CREDITO-CLARO.md`. También vale moverlo fuera de la carpeta publicada.
3. Agregar una prueba automática (`tests/banco-privacidad.test.js`) que falle si un reporte del banco trae:
   - un SSN completo (`\d{3}-?\d{2}-?\d{4}` sin enmascarar)
   - una fecha de nacimiento
   - un número de cuenta con más de 4 dígitos visibles
   - un correo
   - un teléfono que no sea el de un acreedor
   - un nombre o dirección que figure en una lista local de datos reales (`pruebas/originales/no-publicar.txt`, que no se sube)

### 2.3 Reglas de anonimización

Hay que cambiar los datos de la persona, pero **no** las cosas que el analizador necesita para razonar.

| Se cambia | Cómo |
|---|---|
| Nombre, alias, dirección, teléfono, empleador | Por datos inventados de forma constante (la misma persona real recibe siempre el mismo nombre falso dentro del reporte) |
| SSN | `XXX-XX-` + 4 dígitos inventados |
| Fecha de nacimiento | Se borra la línea o se deja «XX/XX/XXXX» |
| Números de cuenta y de caso | Se dejan solo los últimos 4, cambiados de forma constante |
| Acreedores pequeños o locales que puedan identificar a la persona | Por un nombre ficticio del mismo tipo |

| **No** se cambia | Por qué |
|---|---|
| Buró, formato, orden de secciones, etiquetas impresas | El lector depende de ellos |
| Fechas de cuentas (apertura, DOFD, cierre, reportada, consultas) | Las inconsistencias dependen de ellas (obsolescencia, reenvejecimiento) |
| Montos | Saldos, límites y vencidos definen inconsistencias y prioridades |
| Acreedores nacionales grandes (bancos, agencias de cobranza conocidas) | Permiten detectar la misma deuda repetida entre original y cobranza |
| Códigos de historial y comentarios | Son el material del análisis |

Si para anonimizar hay que mover una fecha, se mueven **todas** las fechas del reporte por el mismo desplazamiento, para que no cambien los plazos (7 años, 180 días, etc.). Se anota en el esperado (`anonimizacion.desplazamientoDias`).

### 2.4 Cobertura del banco

Meta inicial: **24 reportes**, 8 por buró. Cada caso de la tabla debe aparecer en al menos 2 reportes de burós distintos.

| Caso | Por qué importa |
|---|---|
| Reporte limpio (sin problemas) | Mide los falsos positivos. El plan debe decir que no hay nada urgente |
| Cobranza + cuenta original de la misma deuda | Duplicado, la inconsistencia más común |
| DOFD ausente, cambiada o posterior a la fecha de cobranza | Reenvejecimiento (FCRA §1681s-2(a)(5)) |
| Cuenta con más de 7 años desde la DOFD | Obsoleta (§1681c) |
| Charge-off con saldo que sigue subiendo, o cuenta vendida con saldo distinto de 0 en el original | Saldo duplicado |
| Cuenta cerrada o pagada que sigue reportando vencido | Contradicción de estado |
| Atrasos en meses en que el historial muestra pago, o al revés | Contradicción interna |
| Misma cuenta en dos burós con datos distintos | Comparación entre burós (fase 3). Hace falta el trío del mismo consumidor |
| Consultas duras sin cuenta abierta, o más de 6 en 12 meses | Prioridad baja, pero tiene que aparecer |
| Usuario autorizado con atrasos | Opción de quitar la cuenta, no de disputarla |
| Registro público (bancarrota) | Gravedad y plazo de 7 o 10 años |
| Identidad: nombres o direcciones ajenas | Posible archivo mezclado o robo de identidad. Prioridad alta |
| Alerta de fraude o congelamiento activo | Aviso, no inconsistencia |
| Préstamo estudiantil o hipoteca con historial de 24 meses (Equifax) | Formato difícil para el lector |
| PDF largo (más de 60 páginas) o reporte cortado | Advertencias `paginas_truncadas` y `cuentas_no_leidas` |
| Formato no reconocido (de un banco o de Credit Karma) | Perfil genérico, `formato_no_verificado` |

## 3. Formato del JSON esperado

Un archivo por reporte, en `pruebas/esperado/<mismo-nombre>.json`. Lo escribe el especialista **sin ver la salida del analizador**, para que no se contagie de sus errores. Los textos van en español. Las etiquetas impresas van tal como aparecen en el reporte (en inglés).

```jsonc
{
  "version": 1,                         // versión de este formato
  "reporte": "equifax-002-cobranza-duplicada.json",
  "especialista": {
    "iniciales": "EC",
    "fecha": "2026-10-05",
    "criterio": "2026-10",              // versión del criterio (§3.5); sube cuando cambian las reglas acordadas
    "confianza": "alta",                // alta | media | baja: qué tan seguro está del análisis completo
    "notas": "Reporte con 2 páginas mal escaneadas; la cuenta 7 se leyó a mano."
  },
  "anonimizacion": { "desplazamientoDias": 0 },

  "reporte_meta": {
    "buro": "equifax",                  // equifax | experian | transunion | desconocido
    "fechaReporte": "2026-05-24",
    "paginas": 14,
    "advertenciasEsperadas": []         // códigos del lector: paginas_truncadas, formato_no_verificado, …
  },

  "cuentas": [ /* §3.1 */ ],
  "consultas": { "duras": 3, "blandas": 9 },
  "registrosPublicos": 0,
  "inconsistencias": [ /* §3.2 */ ],
  "plan": [ /* §3.3 */ ],
  "noDebeAparecer": [ /* §3.4 */ ]
}
```

### 3.1 `cuentas[]`

Una entrada por cada cuenta que el especialista ve en el reporte, incluidas las cobranzas. El analizador tiene que encontrarlas **todas**, ni una más ni una menos.

```jsonc
{
  "ref": "c3",                          // id local del esperado; las inconsistencias apuntan aquí
  "acreedor": "MIDLAND CREDIT MGMT",    // como está impreso
  "acreedorOriginal": "CAPITAL ONE",    // solo cobranzas y cuentas vendidas
  "ultimos4": "4411",
  "apertura": "2021-03",                // ISO parcial, como en el lector
  "tipo": "cobranza",                   // rotativa | plazos | hipoteca | auto | estudiantil | cobranza | abierta | deposito | otra
  "estado": "abierta",                  // abierta | cerrada | cobranza  (como cuenta ResumenGeneral.cuentas)
  "responsabilidad": "individual",      // individual | conjunta | usuario_autorizado | cofirmante | desconocida
  "pagina": 6,                          // primera página donde aparece
  "campos": {                           // solo los que el especialista verificó; los que falten no se comparan
    "saldo": 1840,
    "limite": null,                     // null = el reporte lo imprime vacío / «no reportado»
    "vencido": 1840,
    "dofd": "2022-01",
    "fechaReportada": "2026-04-30"
  },
  "tieneProblema": true                 // debe salir como círculo de color en la UI (014)
}
```

Así se empareja una cuenta del analizador con una del esperado (§6.1): `acreedor` normalizado + `ultimos4` + `apertura`. Si falta alguno de los tres, se usan los otros dos más `tipo`.

### 3.2 `inconsistencias[]`

Cada problema que el especialista disputaría o marcaría para revisar.

```jsonc
{
  "ref": "i1",
  "categoria": "deuda_duplicada",       // catálogo cerrado, abajo
  "cuentas": ["c3", "c5"],              // refs de §3.1 (una o varias; vacío solo en categorías de identidad o consultas)
  "campo": "saldo",                     // campo en cuestión, si aplica
  "gravedad": "roja",                   // roja | naranja | amarilla (mismos niveles que 014)
  "evidencia": "C5 (Capital One) vendida a Midland con saldo $1,840; C3 (Midland) también reporta $1,840.",
  "leyes": [                            // al menos una; solo secciones cargadas en zyron-leyes.js o en la lista aprobada
    { "ley": "FCRA", "seccion": "1681e(b)" },
    { "ley": "FCRA", "seccion": "1681i" }
  ],
  "accion": "disputa_buro",             // catálogo cerrado, abajo
  "destinatario": "equifax",            // buro | acreedor | cobrador | cfpb
  "obligatoria": true                   // true = si el analizador no la detecta, la prueba falla.
                                        // false = aceptable que no la vea (caso discutible); cuenta en las métricas pero no rompe
}
```

**Catálogo de `categoria`.** Si aparece una nueva, primero se agrega aquí:

| categoria | Gravedad usual | Ejemplo |
|---|---|---|
| `deuda_duplicada` | roja | Original y cobranza, las dos con saldo |
| `dofd_reenvejecida` | roja | DOFD posterior a la de la cuenta original, o que cambia entre burós |
| `dofd_ausente` | naranja | Cuenta en mora sin DOFD |
| `obsoleta` | roja | Más de 7 años desde la DOFD (o 10 para bancarrota 7) |
| `saldo_incorrecto` | naranja | Pagada o vendida con saldo distinto de 0; charge-off que sigue creciendo |
| `estado_contradictorio` | naranja | Cerrada o pagada con vencido; «current» con atraso del mes |
| `historial_contradictorio` | naranja | Códigos de atraso que no cuadran con el estado o con los atrasos listados |
| `cobranza_sin_validar` | roja | Cobranza sin acreedor original o sin datos para validarla (FDCPA §1692g) |
| `identidad_ajena` | roja | Nombre, dirección o empleador que no es del consumidor |
| `cuenta_desconocida` | roja | Cuenta que el especialista marcaría para preguntar al consumidor (posible fraude) |
| `responsabilidad_incorrecta` | naranja | Marcada como individual siendo usuario autorizado |
| `consulta_sin_permiso` | amarilla | Consulta dura sin cuenta asociada |
| `entre_buros` | naranja | La misma cuenta con datos distintos entre burós (solo en tríos) |
| `marca_disputa_faltante` | amarilla | Cuenta disputada antes sin el comentario «disputed by consumer» |
| `atraso_real` | naranja | Atraso bien reportado: no hay error, pero el plan debe tratarlo (carta de buena voluntad, esperar) |

`atraso_real` es la única categoría que **no** es un error del reporte. Está aquí porque el plan tiene que incluirlo y el analizador no debe venderlo como disputa.

**Catálogo de `accion`**: `disputa_buro`, `validacion_deuda`, `disputa_acreedor`, `bloqueo_robo_identidad` (§1681c-2), `quitar_usuario_autorizado`, `carta_buena_voluntad`, `esperar_vencimiento`, `queja_cfpb`, `solo_informar`.

### 3.3 `plan[]`

Lista **ordenada**: el primer paso es lo que el consumidor debe hacer primero.

```jsonc
{
  "orden": 1,
  "inconsistencias": ["i4"],            // refs de §3.2; un paso puede cubrir varias (una carta para dos cuentas)
  "accion": "bloqueo_robo_identidad",
  "porque": "Una cuenta abierta con una dirección que no es suya: si es fraude, todo lo demás depende de esto.",
  "empateCon": []                       // refs de pasos con la misma prioridad (el orden entre ellos no importa)
}
```

**Criterio de prioridad.** El especialista lo sigue y el analizador lo implementa. Si cambia, sube `criterio`:

1. Identidad y fraude (`identidad_ajena`, `cuenta_desconocida`): todo lo demás depende de esto.
2. Lo que se puede **borrar** completo (`obsoleta`, `deuda_duplicada`, `cobranza_sin_validar`, `dofd_reenvejecida`).
3. Lo que corrige montos o estados que pesan en el puntaje (`saldo_incorrecto`, `estado_contradictorio`, `historial_contradictorio`, `responsabilidad_incorrecta`).
4. Consultas y marcas (`consulta_sin_permiso`, `marca_disputa_faltante`).
5. Lo que no es error (`atraso_real`): cartas de buena voluntad o esperar.

Dentro de un mismo nivel va primero la de mayor gravedad, luego la más reciente y luego la de mayor monto.

### 3.4 `noDebeAparecer[]`

Errores conocidos que el analizador **no** debe cometer en este reporte. Los falsos positivos son igual de graves que las omisiones, porque una disputa sin fundamento le quita credibilidad al consumidor.

```jsonc
{ "categoria": "obsoleta", "cuentas": ["c2"], "motivo": "La DOFD es de 2020; la fecha de 2017 es la apertura." }
```

### 3.5 Esquema y validación del esperado

- Se escribe un JSON Schema (`pruebas/esperado.schema.json`) con estos catálogos.
- Una prueba valida **todos** los esperados antes de comparar (§5, capa B), para que un error de tipeo del especialista no se cuente como error del analizador.
- Revisión cruzada: el 25 % de los esperados (uno de cada cuatro) lo revisa una segunda persona o una pasada con los skills `claude-legal-federal-laws:consumer-report-accuracy` / `consumer-credit-disputes`. Las diferencias se discuten y se anotan en `especialista.notas`.

## 4. Correspondencia con la salida del analizador

El nuevo analizador puede tener su propio formato. Para no atar las pruebas a sus detalles internos, se escribe **un adaptador** (`pruebas/adaptador.js`) que convierte su salida al formato de §3. Las pruebas comparan esperado contra adaptado. Si el analizador cambia por dentro, solo cambia el adaptador.

El adaptador es lo único que el nuevo analizador tiene que cumplir para ser medido:

- devolver cuentas con acreedor, últimos 4, apertura, tipo y estado;
- devolver inconsistencias con una categoría del catálogo y las cuentas involucradas;
- devolver un plan ordenado con la acción de cada paso.

## 5. Capas de pruebas

```
        E. Manual con PDF reales          pocas, antes de publicar
       D. UI (credito.html con jsdom)     las que ya existen, adaptadas
      C. Banco (golden) — §6              24+ reportes, en cada cambio
     B. Contrato (esquema + adaptador)    rápido, en cada cambio
    A. Unitarias por regla                muchas, rápidas
```

| Capa | Qué | Tipo | Dónde | Cuándo corre |
|---|---|---|---|---|
| A | Cada regla de inconsistencia por separado, con mini reportes de 1 o 2 páginas (como `pag(...)` en `lector-credito.test.js`) | Unitaria | `tests/analizador-reglas.test.js` | `node --test`, siempre |
| A | Ordenamiento del plan con inconsistencias ya armadas (sin leer reportes) | Unitaria | `tests/analizador-plan.test.js` | siempre |
| B | Todos los esperados cumplen el esquema; el adaptador devuelve el formato de §3 | Contrato | `tests/banco-contrato.test.js` | siempre |
| B | Privacidad del banco (§2.2) | Contrato | `tests/banco-privacidad.test.js` | siempre, **bloquea** |
| C | Cada reporte del banco contra su esperado (§6) | Golden / regresión | `tests/banco-reportes.test.js` | siempre; imprime tabla de métricas |
| D | Lo que ve el consumidor: círculos, conteos, pasos, conclusión, coherente con el análisis | UI | `tests/credito-resumen-ui.test.js` y `tests/credito-lector-ui.test.js` (existentes, se adaptan) | siempre |
| D | La llamada a la IA no lleva datos personales (§7) | Seguridad | `tests/analizador-ia-privacidad.test.js` | siempre, **bloquea** |
| E | 3 PDF reales (uno por buró) subidos en el navegador; revisar lectura, tiempos y textos | Manual | lista en `specs/015/quickstart.md` | antes de cada `git push origin master:main` |

Los 6 fixtures sintéticos de `tests/fixtures/credito/` **se quedan**. Siguen probando el lector (013) y son la única fuente segura para casos que ningún reporte real tiene todavía.

## 6. Cómo se compara (capa C)

### 6.1 Cuentas

- Emparejamiento según §3.1. Cada cuenta del esperado se empareja con una sola del analizador, y al revés.
- **Recall de cuentas**: emparejadas / esperadas. **Precisión**: emparejadas / detectadas.
- Por cada pareja se comparan `tipo`, `estado`, `responsabilidad` y los `campos` que el especialista llenó. Montos con tolerancia de $1; fechas al nivel de precisión del esperado (si el esperado dice `2022-01`, se acepta `2022-01-15`).
- `tieneProblema` del esperado contra «aparece en `problemas`» del analizador.

### 6.2 Inconsistencias

- Una inconsistencia se considera **detectada** si el analizador produce una de la misma `categoria` que involucra al menos una de las mismas cuentas (después del emparejamiento). Para las de identidad o consultas basta la categoría.
- Además se comprueba:
  - **gravedad**: igual, o como mucho un nivel de diferencia (si la diferencia es de un nivel, avisa pero no falla);
  - **leyes**: el conjunto que da el analizador contiene al menos una de las secciones esperadas y ninguna fuera de la lista aprobada;
  - **accion**: igual.
- Cualquier inconsistencia que caiga en `noDebeAparecer` es un **falso positivo grave** y falla siempre.
- Una inconsistencia detectada que no está en el esperado ni en `noDebeAparecer` es un falso positivo común: cuenta en la precisión y se lista para que el especialista decida si faltaba en el esperado.

### 6.3 Plan

- **Primer paso**: la acción y las inconsistencias del paso 1 deben coincidir (respetando `empateCon`).
- **Los 3 primeros**: el conjunto de inconsistencias cubiertas por los 3 primeros pasos debe coincidir en al menos 2 de 3.
- **Orden completo**: se mide con la correlación de Kendall (tau) entre los dos órdenes, contando los empates como empates. Solo se informa, no falla.
- **Reporte limpio**: el plan del analizador no debe tener pasos de disputa. Puede decir «no encontramos nada que disputar».

### 6.4 Metas

Se miden sobre todo el banco. Las de la izquierda son las mínimas para reemplazar el analizador actual.

| Métrica | Para reemplazar | Meta a 3 meses |
|---|---|---|
| Recall de cuentas (formatos verificados: Equifax, Experian, TransUnion) | ≥ 98 % | 100 % |
| Precisión de cuentas | ≥ 98 % | 100 % |
| Recall de cuentas (formato genérico) | ≥ 80 % | ≥ 90 % |
| Recall de inconsistencias `obligatoria: true` y gravedad roja | **100 %** | 100 % |
| Recall de inconsistencias (todas) | ≥ 85 % | ≥ 95 % |
| Precisión de inconsistencias | ≥ 85 % | ≥ 95 % |
| Falsos positivos de `noDebeAparecer` | **0** | 0 |
| Primer paso del plan correcto | ≥ 90 % de los reportes | ≥ 95 % |
| 3 primeros pasos (2 de 3) | ≥ 80 % | ≥ 90 % |
| Reportes limpios sin disputas inventadas | 100 % | 100 % |

### 6.5 Línea base y regresión

1. **Antes de escribir el nuevo analizador**, se pasa el analizador actual (013 + 014) por el banco con un adaptador propio. Esas cifras son la línea base: el nuevo tiene que superarlas en todas las métricas.
2. Cada vez que corre la capa C se guarda la tabla de métricas en `pruebas/resultados/ultima.json`. Si una métrica baja más de 2 puntos frente al último resultado guardado en git, la prueba falla aunque siga sobre la meta.
3. Cuando un reporte falla por un error del esperado (no del analizador), se corrige el esperado con una nota en `especialista.notas`. **Nunca** se cambia el esperado solo para que pase.

## 7. Pruebas de la parte con IA

La IA solo explica y redacta. Por eso no se compara su texto exacto. Se prueba:

| Qué | Cómo |
|---|---|
| No recibe datos personales | Se intercepta la llamada (fetch simulado) en todos los reportes del banco. Falla si el cuerpo trae un nombre, una dirección, un teléfono, un SSN (ni siquiera los últimos 4), una fecha de nacimiento o un número de cuenta. **Bloqueante** |
| No cambia el plan | El orden y las acciones que vienen de las reglas son los mismos antes y después de la redacción |
| No inventa leyes | Toda sección citada en el texto existe en la lista aprobada (`zyron-leyes.js` y las que se agreguen) |
| No promete resultados | No hay frases prohibidas: «garantizado», «eliminaremos», «subirá X puntos», «borrar todo». Lista en `pruebas/frases-prohibidas.json` |
| Habla de «consumidor» | No hay «cliente» en los textos visibles |
| Funciona si la IA falla | Con la IA simulada caída o lenta, el consumidor igual ve las cuentas, las inconsistencias y el plan generado por las reglas, con un aviso |

En las pruebas automáticas la IA siempre está simulada (respuestas guardadas en `pruebas/ia-simulada/`). Una prueba manual opcional (`IA_REAL=1`) corre 5 reportes contra el modelo real, y una persona revisa el resultado.

## 8. Huecos en la cobertura actual

| Hueco | Hoy | Con este plan |
|---|---|---|
| Reportes reales | 0 (solo 6 sintéticos) | 24+ anonimizados |
| Análisis de un especialista para comparar | No existe; el «esperado» actual es lo que el propio lector produjo | Escrito a ciegas por el especialista |
| Falsos positivos | No se miden | `noDebeAparecer` + reportes limpios |
| Prioridad del plan | No existe (014 ordena por gravedad y fecha, no por lo que conviene hacer) | §3.3 y §6.3 |
| Leyes más allá de FCRA/FDCPA | 014 solo usa `zyron-leyes.js` | Lista aprobada, ampliable (FCBA, ECOA, CROA, estatales) |
| Comparación entre burós | Diseñada en 013 (fase 3), sin pruebas | Tríos del mismo consumidor en el banco |
| Privacidad del banco en el sitio publicado | `pruebas/` se serviría en Netlify | §2.2, bloqueante |
| Privacidad de lo que se manda a la IA | Sin prueba | §7, bloqueante |

## 9. Orden de trabajo propuesto

1. Renombrar las carpetas a minúsculas y bloquear `pruebas/` en git y Netlify (§2.2).
2. Escribir el esquema del esperado y `pruebas/LEEME.md` (anonimización, cómo agregar un reporte).
3. Cargar los **6 primeros** reportes (2 por buró: uno limpio y uno con problemas) con su esperado. Validar el formato con el especialista antes de seguir.
4. Adaptador del analizador actual y medir la línea base.
5. Completar el banco hasta 24 reportes con la tabla de §2.4.
6. Recién entonces escribir el nuevo analizador, guiado por las capas A y C.

## 10. Preguntas abiertas

1. ¿Quién es el especialista que escribe los esperados? ¿Hay una segunda persona para la revisión cruzada?
2. ¿Hay tríos (Equifax + Experian + TransUnion) del mismo consumidor? Sin ellos no se puede probar `entre_buros`.
3. ¿Qué leyes además de FCRA y FDCPA entran en la lista aprobada para esta versión? Y si entra alguna estatal, ¿de qué estados?
4. ¿Los PDF originales quedan solo en tu computadora, o en un lugar privado compartido (Drive)?
