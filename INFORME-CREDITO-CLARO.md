# Clear Credit — Informe de auditoría y hoja de ruta

*Preparado el 29 de agosto de 2026*

Este informe cubre dos cosas: (1) lo que revisé y arreglé directamente en tu
sitio esta sesión, y (2) las decisiones de producto y negocio que me pediste
que pensara a fondo — membresías, el chat con IA, el motor de búsqueda de
opciones, y una idea de negocio original. Todos los archivos actualizados ya
están guardados en tu carpeta `MyWeb`.

---

## 1. Lo que encontré y ya arreglé

Revisé los nueve archivos HTML, los ocho archivos JavaScript, el CSS y la
configuración de Netlify. En general, el sitio está mucho más avanzado de lo
que un "borrador" sugeriría — el analizador de reporte de crédito en
particular es un trabajo serio: detecta el buró emisor, extrae nombre(s),
teléfonos y direcciones del bloque de información personal, calcula
utilización y relación deuda-ingreso, prioriza hallazgos por severidad, y
hasta genera un borrador de carta de corrección personalizado por buró. Eso
no es un formulario de juguete — es una herramienta real. Dicho esto,
encontré y corregí varios problemas concretos:

### Arreglado en esta sesión

- **El widget "Mr. Credit Coach" no tenía ni una sola línea de CSS.** Existe
  en 6 páginas pero se renderizaba sin estilo — probablemente como un botón y
  una caja de texto genéricos del navegador, no como el asistente flotante
  que aparenta ser en el código. Le diseñé un panel completo (burbujas de
  chat, sugerencias, indicador de "escribiendo…", responsivo a celular) que
  respeta la paleta navy/dorado del resto del sitio.
- **Ese mismo panel, una vez le puse CSS, se quedaba visible por defecto**
  en lugar de escondido — un bug clásico de especificidad CSS (la regla
  `display:flex` le ganaba al atributo `hidden`). Lo detecté con una prueba
  visual automatizada y lo corregí antes de entregarte el código.
- **`--radius` (la variable de bordes redondeados) se usaba 14 veces en
  `credito.html` pero nunca se definía.** Resultado: la tarjeta de subir
  documento, los botones del analizador y el formulario de la carta de
  corrección se veían con esquinas cuadradas en vez de redondeadas. Ahora
  está definida globalmente en `styles.css`.
- **Un enlace roto:** en `herramientas.html`, el botón "Usar analizador"
  apuntaba a `credito.html#analizador`, pero la sección real tiene el id
  `analizar-reporte`. El clic no llevaba a ningún lado. Corregido, y de paso
  actualicé la tarjeta "Próximamente → Guía de disputas" para reflejar que
  esa función ya existe (el generador de cartas), en vez de seguir
  anunciándola como pendiente.
- **`analyzer.js` es un archivo huérfano** — no lo incluye ninguna página; la
  versión real y activa del analizador vive en un `<script>` dentro de
  `credito.html`. No lo borré (no tengo permiso de borrado en tu
  computadora), pero le agregué una nota al inicio explicando que no se usa,
  para que no confunda a nadie —incluyéndome a mí en la próxima sesión—.
  Puedes borrarlo cuando quieras.
- **SEO y metadatos ausentes en las 9 páginas:** no había favicon, ni
  etiquetas Open Graph/Twitter (las que generan la vista previa cuando
  alguien comparte tu enlace en WhatsApp o redes), ni `robots.txt`, ni
  `sitemap.xml`, ni `site.webmanifest`. Diseñé un ícono simple (una brújula
  dorada sobre fondo navy, coherente con el símbolo que ya usas en el
  index) y lo agregué a las 9 páginas junto con las etiquetas correspondientes.

  **Importante:** el favicon, el sitemap y las etiquetas Open Graph usan
  `https://TU-DOMINIO-AQUI.com` como marcador de posición, siguiendo la
  misma convención que ya usas en `auth.js` (`TU-PROYECTO`). Cuando tengas
  tu dominio final, es un buscar-y-reemplazar en 9 archivos + `robots.txt` +
  `sitemap.xml`. Dime el dominio cuando lo tengas y lo hago yo.

### Pendiente — depende de ti, no de código

- **Supabase todavía no está configurado.** `auth.js` sigue con
  `SUPABASE_URL = "https://TU-PROYECTO.supabase.co"` de marcador. Esto
  significa que **hoy, el login, el registro y "guardar en mi cuenta" no
  funcionan en absoluto** — es el bloqueador más importante antes de
  publicar, porque varias partes del sitio (cuenta.html, los botones de
  guardar en el analizador y la calculadora) asumen que esto ya existe.
  `INSTRUCCIONES-CUENTAS.md` (que ya tenías) explica los pasos; toma
  10–15 minutos. Puedo guiarte en vivo si prefieres hacerlo juntos.
- **Sin dominio propio todavía.** Necesario para que el sitemap, el
  robots.txt y las etiquetas de redes sociales apunten a la URL correcta.

---

## 2. Chat con IA — de qué tienes y qué construí

"Mr. Credit Coach" ya existía como un chatbot de reglas (detecta palabras
clave como "hipoteca" o "disputa" y responde con un texto fijo). Funciona
bien como respaldo gratuito, pero no es IA real — no puede seguir una
conversación ni responder algo fuera de sus patrones.

Construí la capa de IA real encima de eso, sin quitar el respaldo:

- Un nuevo archivo `netlify/functions/coach.js` — una función que corre en
  la nube de Netlify, llama a la API de Claude (Anthropic) con instrucciones
  estrictas (solo temas de crédito/vivienda/auto, nunca pide información
  sensible, siempre aclara que no sustituye asesoría profesional), y
  devuelve la respuesta.
- Actualicé `credit-coach.js` para que, **solo si el cliente inició sesión**,
  intente usar la IA real primero; si falla por cualquier motivo (no
  configurada, sin sesión, error de red), cae automáticamente al asistente
  local — el chat nunca se queda sin responder.
- `INSTRUCCIONES-IA.md` (nuevo, mismo estilo que el de cuentas) te lleva
  paso a paso: crear una llave en console.anthropic.com, ponerle un límite
  de gasto bajo, y agregar tres variables de entorno en Netlify.

**Por qué la até al login:** así conviertes "IA real" en un beneficio de
tener cuenta desde el día uno, sin construir nada de membresías todavía —y
controlas el costo, porque solo tus clientes registrados la usan, no
cualquier visitante anónimo. Ver la sección 4 para cómo esto encaja con
membresías pagadas más adelante.

---

## 3. El motor de búsqueda de opciones

Me dijiste que me irás dando los detalles con el tiempo, así que no adiviné
una implementación — pero te dejo el terreno preparado para cuando me digas
qué comparar. Tres direcciones típicas en este tipo de sitio, para que me
digas cuál se acerca más a lo que tienes en mente:

1. **Comparador de tarjetas para reconstruir crédito** (aseguradas, sin
   verificación de crédito, con reporte a los tres burós) — encaja
   naturalmente después del analizador: "tu reporte muestra esto → estas
   tarjetas te ayudarían a mejorar X".
2. **Comparador de prestamistas hipotecarios o de auto** por perfil de
   crédito — una extensión directa del mapa de tasas que ya tienes en
   `comprar-auto.html`.
3. **Comparador de programas de asistencia para el pronto pago** (down
   payment assistance) por estado — muy buscado por primeros compradores
   hispanos y casi nadie lo presenta bien en español.

Cualquiera de las tres reutiliza patrones que ya existen en tu código (la
tabla de comparación de `credito.html`, el mapa por estado de
`comprar-auto.html`, las tarjetas de `herramientas.html`), así que la parte
técnica no es el riesgo — el riesgo es la fuente de datos (¿tasas en vivo de
una API, un partner de afiliados, o datos que tú actualizas a mano como
`auto-rates.json`?). Cuéntame eso primero.

---

## 4. Membresías y precios — propuesta

Tu instrucción fue "barato". Con un público que ya es sensible al costo, la
regla de oro es: **todo lo que ya funciona gratis, sigue gratis** — el
analizador, las calculadoras, todo el contenido educativo, y Mr. Credit
Coach en su versión de reglas. Cobrar por quitarle algo a la gente que ya lo
tiene rompe la confianza que construiste. Cobra por *lo nuevo*.

| Plan | Precio sugerido | Qué incluye |
|---|---|---|
| **Gratis** | $0 | Todo lo que existe hoy: analizador, calculadora, contenido, Mr. Credit Coach (reglas), 1 análisis guardado en la cuenta. |
| **Plus** | $4.99/mes o $39/año | IA real en Mr. Credit Coach sin límite de sesión, análisis y cálculos guardados ilimitados, historial de progreso (cómo cambió tu utilización/puntaje estimado entre análisis), exportar el análisis en PDF. |
| **Familia** | $8.99/mes | Todo lo de Plus, hasta 5 cuentas vinculadas (útil para el patrón cultural de ayudar a construir crédito entre varios miembros de la familia — ver la idea de negocio abajo), recordatorios de pago compartidos. |

Por qué estos números: $4.99 es el punto donde un servicio se siente "una
suscripción de streaming", no "una decisión financiera" — y ya viste en tu
propio mercado (mapa de tasas, calculadora) que tu audiencia compara cada
dólar. Evita anual-only al principio; deja mensual para que probar cueste
poco, y ofrece el anual como descuento una vez que confíen en el producto.

**No necesitas Stripe ni cobros en el MVP.** Puedes lanzar el plan Plus como
"gratis por tiempo limitado / próximamente $4.99" para medir cuánta gente lo
activaría, usando solo una bandera en la tabla de Supabase (`plan: 'plus'`)
que actives manualmente al principio. Cuando tengas 20–30 personas
interesadas, ahí vale la pena integrar cobros de verdad.

---

## 5. Una idea de negocio original: "Tanda de Crédito"

Pediste algo poco explorado, que esté de moda, que resuelva una necesidad
real, y que genere enganche. Aquí está la que más me convenció después de
pensarlo con el contexto de tu sitio:

**La idea:** digitalizar la *tanda* — el círculo rotativo de ahorro que ya
es una práctica financiera de confianza en la comunidad hispana (cada
persona aporta un monto fijo cada período, y por turnos alguien recibe el
fondo completo) — pero conectada a reporte real a los burós de crédito.

**Por qué funciona:**

- **Es una necesidad real, no inventada.** Millones de personas ya
  participan en tandas informales. El problema es que ese dinero y esa
  disciplina de pago —que demuestra exactamente el comportamiento que un
  buró de crédito quiere ver— no construye ningún historial porque es
  informal y en efectivo.
- **Está en tendencia, pero casi nadie lo ha hecho bien todavía.** Hay
  interés creciente en fintech por productos "ROSCA" (el nombre técnico de
  la tanda) en Estados Unidos, pero es un espacio joven — no es un mercado
  saturado como "otra app de monitoreo de crédito".
- **El enganche es estructural, no artificial.** A diferencia de una app que
  depende de notificaciones para que vuelvas, una tanda te obliga a volver
  cada período porque es un compromiso social con personas reales — familia
  o amigos que tú mismo invitas. Eso es retención sin trucos.
- **Conecta directo con lo que ya construiste.** Clear Credit ya explica
  crédito, historial y burós en español claro — la capa educativa que este
  producto necesita ya existe. El plan Familia de la sección 4 es, sin
  quererlo, el primer paso hacia esto.

**Cómo empezar sin necesitar licencia de prestamista:** operar tú mismo el
dinero de una tanda te metería en territorio de servicios financieros
regulados (transmisión de dinero), que requiere licencias estatales caras.
La ruta razonable para probar la idea:

1. Empieza con la capa social y educativa: un módulo donde un cliente crea
   un "círculo", invita a su gente, y el sitio calcula turnos, montos y
   fechas — sin tocar el dinero (la gente se paga entre sí como ya hace hoy,
   por Zelle o efectivo).
2. Para el reporte a burós, en vez de construir tu propio sistema de
   crédito, asóciate por afiliación con un proveedor ya licenciado de
   "credit-builder loans" (por ejemplo Self o Kikoff) — ellos manejan el
   dinero y el reporte; tú aportas la comunidad, la educación y la interfaz
   en español.
3. Mide primero si la gente realmente forma círculos en tu sitio antes de
   invertir en integrarte con un proveedor.

Esto no es asesoría legal — antes de mover dinero de terceros, cualquier
paso más allá del punto 1 necesita que consultes con un abogado
especializado en servicios financieros en tu estado.

---

## 6. Lista de lanzamiento, en orden

1. **Configura Supabase** (bloqueador — nada de cuentas funciona sin esto).
2. Decide tu dominio y dímelo para actualizar las 9 páginas + sitemap +
   robots.txt de una vez.
3. Prueba el flujo completo tú mismo: crea una cuenta, analiza un reporte de
   prueba, guarda el resultado, ábrelo en `cuenta.html`.
4. (Opcional para el lanzamiento, recomendado pronto después) Configura la
   IA real siguiendo `INSTRUCCIONES-IA.md`.
5. Publica en Netlify y confirma que `netlify.toml` recogió la carpeta de
   funciones (deberías ver `coach` listada en **Functions** dentro de tu
   sitio en Netlify).
6. Envíame el enlace en vivo cuando esté publicado — hago una pasada final
   en el sitio real (no en mi copia local) para revisar que todo cargue
   bien con tu dominio y certificado HTTPS.

---

Dime qué quieres que ataquemos primero — yo sugeriría Supabase, porque todo
lo demás (membresías, IA, la tanda) depende de que las cuentas ya funcionen
de verdad.
