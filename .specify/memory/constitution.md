<!--
Sync Impact Report (borrar antes de hacer commit)
- Version change: (plantilla sin rellenar) → 1.0.0
- Principios modificados: ninguno renombrado; los 5 marcadores de la plantilla se rellenaron
  (I. Honestidad y no asesoría, II. Privacidad por diseño, III. Funciona sin IA,
  IV. Una sola verdad, probada, V. Multilingüe con revisión humana)
- Secciones añadidas: Restricciones técnicas y de despliegue; Flujo de desarrollo y calidad
- Secciones eliminadas: ninguna
- TODOs pendientes:
  - TODO(NATIVE_REVIEW): traducciones a portugués y criollo haitiano escritas por Claude;
    falta revisión de hablantes nativos (ver Principio V).
  - RATIFICATION_DATE se fijó al día de adopción de esta constitución (2026-09-20); el
    primer commit del repositorio es de 2026-09-14.
- Plantillas dependientes (plan/spec/tasks) leen la constitución en tiempo de ejecución;
  no se modificaron aquí.
-->
# Themora Constitution

## Core Principles

### I. Honestidad y no asesoría (NON-NEGOTIABLE)
Themora educa; no aconseja, no promete y no decide por la persona. El contenido, los
cálculos y las respuestas de Zyron y Mr. Credit Coach MUST describir lo que dice la ley o
la fuente citada, y MUST NOT afirmar que algo "es ilegal", decirle a la persona "debes"
hacer algo, garantizar un resultado ni indicar si conviene o no firmar un contrato. Toda
cifra que no sea un cálculo del usuario (tasas, promedios) MUST llevar fuente y presentarse
como referencia educativa, no como oferta ni aprobación de crédito. Lo que no está cargado
(leyes estatales, cambios posteriores a la fecha del texto) MUST decirse con franqueza en
lugar de improvisarse. Ninguna función MUST prometer algo que aún no existe.
Razón: el público (hispanohablantes en todo EE. UU.) toma decisiones de dinero con esto;
una promesa falsa o un consejo legal disfrazado le hace daño real.

### II. Privacidad por diseño
Los datos financieros y personales de la persona MUST quedarse en su navegador salvo que
ella inicie una acción que los requiera. La analítica (Umami) MUST registrar solo eventos y
propiedades categóricas (por ejemplo `etapa`); NEVER cifras, montos, nombres, direcciones ni
texto libre. Las llamadas a IA o a terceros MUST requerir sesión o un límite de uso
explícito, y MUST enviar el mínimo de datos necesario. Borrar la cuenta MUST poder hacerse
desde el propio sitio.
Razón: la confianza es el producto; un solo dato filtrado en analítica la destruye.

### III. Funciona sin IA
Toda función asistida por IA MUST tener un camino local que responda por sí solo. Si falta
la llave, no hay sesión, la función tarda demasiado o falla, la experiencia MUST degradarse
a ese camino o a un aviso honesto con opción de reintentar o agendar una cita; NEVER dejar
a la persona sin respuesta ni mandarla a buscar por su cuenta en otro sitio como sustituto.
La IA es un extra para cuentas con sesión, no un requisito para que el sitio sirva.
Razón: controla el costo, evita abuso de la llave y mantiene el sitio útil cuando algo se cae.

### IV. Una sola verdad, probada
Cada dato legal o numérico MUST vivir en una sola fuente y todo lo demás MUST derivarse de
ella o comprobarse contra ella. En concreto: las fichas de `zyron-leyes.js` y
`netlify/functions/leyes-digest.js` MUST usar las mismas cifras, y las cuatro traducciones
de una ficha MUST coincidir entre sí. El contenido legal nuevo MUST llegar con pruebas
(`node --test tests/`) que cubran enrutamiento de preguntas, reglas de honestidad y
coherencia de números, y esas pruebas MUST pasar antes de publicar. Un cambio que "roba"
preguntas de un tema existente MUST detectarse comparando contra la versión anterior.
Razón: una cifra distinta entre idiomas o entre el chatbot local y la IA es un error de
información legal.

### V. Multilingüe con revisión humana
El español es el idioma principal. Zyron MUST responder en español, inglés, portugués y
criollo haitiano; añadir idiomas es bienvenido. Las traducciones hechas por IA MUST marcarse
como pendientes de revisión de hablantes nativos hasta que alguien las revise. Una ficha o
página nueva MUST NOT publicarse en un idioma con contenido que contradiga al original.
Razón: el idioma es la razón de ser del sitio; una mala traducción de una ley confunde a
quien más necesita claridad.

## Restricciones técnicas y de despliegue

- **Sitio estático sin paso de compilación.** HTML, CSS y JavaScript sin framework se
  sirven tal cual (`publish = "."` en `netlify.toml`). La lógica de servidor MUST ir en
  funciones de Netlify (`netlify/functions/`) y los datos de cuentas en Supabase. No se
  añade un framework, un subsitio ni una dependencia nueva sin evidencia de que lo existente
  no alcanza (ver el caso de "Car Buying Center": se reutilizó `contrato-auto.html` en lugar
  de construir un subsitio).
- **Todo lo que está en la raíz se publica.** Notas internas, instrucciones (`INSTRUCCIONES-*.md`),
  `README.md`, `tests/`, borradores y la papelera MUST bloquearse con reglas 404 en
  `netlify.toml`. Los textos completos de leyes (PDF/MD) MUST NOT copiarse al proyecto.
- **Secretos fuera del código.** Llaves de Anthropic, Google Places, Supabase (service role)
  y similares MUST vivir solo en variables de entorno de Netlify. Toda función que gaste
  dinero o toque datos MUST verificar la sesión con Supabase y aplicar límite de uso por
  IP o por cuenta.
- **Seguridad del navegador.** Se mantienen las cabeceras de `netlify.toml` (CSP,
  `X-Frame-Options: DENY`, HSTS, `Permissions-Policy`). Un servicio externo nuevo MUST
  añadirse de forma explícita a la CSP, con el mínimo de permisos.
- **Formato de archivos.** Los archivos se editan preservando finales de línea LF; un cambio
  que convierta un archivo a CRLF y ensucie todo el diff MUST corregirse antes del commit.

## Flujo de desarrollo y calidad

- **Evidencia antes de construir.** Antes de una función grande se revisa qué ya existe en
  el código y, cuando hay analítica, qué usa la gente realmente. Se documenta la decisión
  (y lo que se decidió NO construir) en la memoria del proyecto o en `INSTRUCCIONES-*.md`.
- **Documentación junto al cambio.** Una función que exige configuración (llaves, tablas,
  pagos, planes) MUST llevar su `INSTRUCCIONES-*.md` en español claro, con pasos verificables.
  Hasta que esos pasos estén hechos, el sitio MUST NOT mencionar la función al público.
- **Pruebas.** Cambios en `zyron-leyes.js`, `leyes-digest.js`, `direccion-autocompletar.js`
  o cualquier lógica con reglas MUST correr `node --test tests/` y pasar. Un fallo se
  reporta tal cual; no se debilita una prueba para que pase.
- **Grafo de conocimiento.** Tras modificar código se ejecuta `graphify update .` para
  mantener `graphify-out/` al día, y las preguntas sobre el código empiezan por
  `graphify query`.
- **Cambios por partes pequeñas.** Los commits agrupan un solo propósito y explican el
  porqué; nada se publica con cambios sin revisar en el árbol de trabajo.

## Governance

Esta constitución prevalece sobre otras prácticas del proyecto. Cuando una instrucción,
plantilla o costumbre la contradiga, gana la constitución hasta que se enmiende.

- **Enmiendas.** Se proponen editando este archivo con un Sync Impact Report, se justifican
  por escrito (qué problema resuelven) y las aprueba la persona dueña del proyecto. Un
  cambio que afecte contenido ya publicado MUST incluir el plan para actualizarlo.
- **Versionado (semántico).** MAJOR: se elimina o redefine un principio de forma
  incompatible. MINOR: se añade un principio o sección, o se amplía materialmente una
  guía. PATCH: aclaraciones, redacción o correcciones sin cambio de significado.
- **Cumplimiento.** Toda especificación, plan y revisión MUST verificar los principios I–V
  antes de aprobarse; una desviación MUST justificarse por escrito en el plan
  (sección de complejidad) o corregirse. Los principios I y II son innegociables: no admiten
  excepciones por conveniencia. Se revisa la constitución completa al menos cuando se añada
  una ley, un idioma o un servicio externo nuevo.
- **Guía operativa.** Las instrucciones de trabajo del día a día viven en `CLAUDE.md` y en
  los archivos `INSTRUCCIONES-*.md`; si chocan con esta constitución, se corrigen.

**Version**: 1.0.0 | **Ratified**: 2026-09-20 | **Last Amended**: 2026-09-20
