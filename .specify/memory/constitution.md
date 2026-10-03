<!--
Sync Impact Report
- Version change: 1.1.0 → 1.2.0 (MINOR: se amplía la guía con lo aprendido; ningún principio cambia de sentido)
- Principio ampliado: III (interruptor para apagar la IA sin republicar).
- Sección añadida: «Lecciones aprendidas (2026-09/10)»: IA y plataforma, costo, secretos, Codex, Windows, retomar.
- Motivo: el agente de crédito (specs 016–019) se construyó en 4 fases y la prueba real recién en la última
  mostró que la respuesta final no cabe en los 10 s de Netlify; además, sin créditos de Netlify no se pudo
  republicar para apagarlo. Estas reglas evitan repetir ese recorrido al empezar de cero.
- TODOs pendientes: TODO(NATIVE_REVIEW) de portugués y criollo haitiano (Principio V).
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
La IA es un extra para cuentas con sesión, no un requisito para que el sitio sirva. Toda
función que gaste dinero en IA MUST poder apagarse sin republicar el sitio (por ejemplo, una
bandera o un límite en Supabase), porque republicar también puede fallar o costar.
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
- **Secretos fuera del código.** Llaves de Anthropic, Google Places, Supabase (service role),
  Stripe (secreta, de webhook) y similares MUST vivir solo en variables de entorno de
  Netlify. Toda función que gaste dinero o toque datos MUST verificar la sesión con
  Supabase y aplicar límite de uso por IP o por cuenta.
- **Pagos y datos de tarjeta.** Si el proyecto integra pagos, Stripe MUST ser la única
  autoridad del estado de pago/suscripción/factura; la base de datos propia es una copia
  que se reconcilia vía webhooks, nunca la fuente de verdad. Los datos crudos de tarjeta
  MUST NOT tocar servidores ni funciones de Themora (solo Stripe Checkout/Elements/
  Customer Portal). Todo endpoint de webhook MUST verificar la firma de Stripe antes de
  confiar en el evento, y toda petición que cambie estado (cobro, reembolso, cancelación)
  MUST usar una llave de idempotencia.
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
- **Código que toca dinero.** Cambios en checkout, suscripciones, facturas, reembolsos o
  webhooks de pago MUST llevar pruebas de: evento de webhook duplicado (mismo event id
  NEVER se reprocesa), pago fallido, fallo de firma de webhook y fallo de la API de
  Stripe, antes de publicarse. Toda acción de administración sobre pagos o reembolsos
  MUST quedar en un registro de auditoría (quién, cuándo, qué cambió).

## Lecciones aprendidas (2026-09/10)

Reglas nacidas de problemas reales. Si se empieza de cero, se aplican desde el día uno.

- **Medir la IA de verdad antes de construir alrededor.** Antes de escribir la spec de una
  función con IA, se hace una prueba mínima (spike) contra la API real, con el tamaño de
  respuesta real, y se anota el tiempo y el costo. Las funciones normales de Netlify cortan
  a los 10 s: una respuesta larga (JSON de miles de tokens) no cabe. Si no cabe, se elige
  desde el principio streaming (Edge Function), Background Function con espera, o una
  respuesta más corta. El agente de crédito se diseñó en 4 fases y la prueba real llegó en
  la última: falló por tiempo.
- **Retorno antes que gasto.** Una función que cuesta dinero por uso (IA, APIs pagadas)
  MUST tener primero señal de demanda (uso del camino local gratuito, analítica de eventos)
  y la aprobación explícita del dueño para el gasto. Se informa el costo estimado por uso
  antes de cada prueba pagada.
- **Créditos de la plataforma.** Cada `git push` a `main` dispara una compilación en
  Netlify, y las compilaciones gastan créditos de la cuenta. Sin créditos, la compilación
  se salta («Skipped due to account credit usage exceeded») y el sitio queda congelado en
  la versión anterior. Se agrupan los cambios antes de publicar y se revisa el saldo antes
  de depender de una republicación.
- **Publicar.** Se publica con `git push origin master:main`; nunca subiendo archivos a
  mano por la web.
- **Secretos y pruebas pagadas.** Claude no lee llaves (el permiso lo bloquea, y está
  bien). Las pruebas reales las corre el dueño desde Claude Code con
  `! VAR="$(netlify env:get VAR)" node tests/manual/<prueba>.js`; la llave no sale en la
  conversación. Las pruebas que cuestan dinero viven en `tests/manual/` y no terminan en
  `.test.js`.
- **Saldo prepagado como tope.** En Anthropic se usa saldo prepagado sin recarga
  automática; el saldo es el límite de gasto. Si se activa la recarga, se pone antes un
  límite mensual.
- **Trabajo con Codex.** Codex implementa a partir de tareas con TDD escritas en
  `specs/<nnn>/`; Claude revisa y hace los commits (Codex no puede escribir en `.git`). Si
  el modelo configurado falla, se usa otro modelo solo para esa corrida, sin tocar la
  configuración. Si Codex se queda sin límite o sin memoria, se verifica qué tareas quedaron
  hechas (casillas y pruebas) antes de continuar.
- **Ediciones masivas con script.** Antes de un script que borre o mueva bloques, se hace
  copia de seguridad y se ancla en un texto único y comprobado; luego se compara el número
  de líneas. Un ancla equivocada borró 1,846 líneas una vez.
- **Windows.** Las pruebas se corren con `node --test tests/*.test.js` (la carpeta sola no
  funciona igual). Los fallos que ya existían se anotan por nombre y no se mezclan con los
  del trabajo nuevo.
- **Pausar sin perder el hilo.** Todo trabajo que se detiene deja una nota de
  «punto de retomar» en su carpeta `specs/<nnn>/` (estado, diagnóstico, opciones y
  siguiente paso) y una línea en la memoria que apunte a ella. Al retomar se lee esa nota,
  no todo el historial.
- **Specs por fases pequeñas.** Una función grande se parte en specs independientes
  (cálculo → IA → acciones → interfaz), cada una con su prueba y su commit. La que pone en
  riesgo la viabilidad (costo, tiempo, permisos) se prueba primero.

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

**Version**: 1.2.0 | **Ratified**: 2026-09-20 | **Last Amended**: 2026-10-03
