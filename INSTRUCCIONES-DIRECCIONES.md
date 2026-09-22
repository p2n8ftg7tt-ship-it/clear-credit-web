# Autocompletado de direcciones con Google — publicar, comprobar y qué hacer si falla

Mientras alguien escribe una dirección, el sitio le sugiere direcciones de Google
y, al elegir una, llena ciudad, estado y código postal. Funciona en estos
formularios:

| Página | Campo | De quién es la dirección |
|---|---|---|
| `credito.html` (analizador → cartas) | «Calle y número» | La persona |
| `credito.html` (carta de validación de deuda) | Dirección de la agencia | La agencia de cobranza |
| `herramientas.html` (carta de cese de comunicación) | «Tu calle y número» | La persona |
| `herramientas.html` (misma carta) | Dirección de la agencia | La agencia de cobranza |
| `cuenta.html` (Mi perfil) | «Dirección» | La persona |
| `listar-negocio.html` | «Dirección completa del negocio» | El negocio |

No hay casilla que activar. Si algo falla, la persona escribe la dirección a mano y
el formulario funciona igual.

**Privacidad (ya explicada en `privacidad.html`):** solo viaja lo que la persona
escribe en el campo de la calle, y solo cuando escribe. Nombre, teléfono, ciudad,
estado y código postal nunca se envían. Nosotros no guardamos ni registramos lo que
escribe. Google recibe la consulta desde nuestro servidor, así que no ve la IP de la
persona.

## Por qué hay que hacer esto

Las páginas ya están conectadas, pero **el servicio del servidor** (la función
`netlify/functions/autocompletar-direccion.js`) tiene que estar **publicado** y
tener la **llave de Google**. Si no, el sitio responde «no encontrado» y ningún
formulario sugiere nada. En la comprobación del 2026-09-20 la función respondía 404
en el sitio real.

## Paso 1 — Publica con la línea de comandos de Netlify

Publicar arrastrando la carpeta sube las páginas pero **no empaqueta las funciones**.
Desde la carpeta del proyecto:

```
netlify deploy --prod
```

Al terminar, en el resumen del despliegue (o en Netlify → **Functions**) tiene que
aparecer `autocompletar-direccion`. Si no aparece, el paquete de funciones no se subió.

Antes de publicar, ejecuta las pruebas:

```
node --test tests/*.test.js
```

(En Node 22 o más nuevo, `node --test tests/` sin `*.test.js` no encuentra las pruebas.)

## Paso 2 — Comprueba el servicio con un solo comando

Esto **no gasta cuota** de Google: solo pregunta si la función existe y si tiene llave.

```
curl -s -X POST -H "Origin: https://mithemora.com" -H "Content-Type: application/json" -d '{"accion":"estado"}' https://mithemora.com/.netlify/functions/autocompletar-direccion
```

| Qué ves | Qué significa | Qué hacer |
|---|---|---|
| `404` (página «no encontrado») | La función **no está publicada** | Repite el Paso 1 y confirma que aparece en la lista de funciones |
| `403` | La petición no trae el `Origin` del sitio | Repite con el `-H "Origin: https://mithemora.com"` tal cual |
| `405` | Se usó GET | Usa `-X POST` |
| `{"vivo":true,"configurado":false}` | Publicada, **falta la llave** | Paso 3 |
| `{"vivo":true,"configurado":true}` | Publicada y con llave | Paso 4 y Paso 5 |

`configurado:true` solo dice que hay una llave. Si Google la acepta o no (API activada,
facturación, restricciones) se comprueba con una búsqueda real en un formulario (Paso 5).

## Paso 3 — La llave de Google

Es **la misma llave** que ya usa `revisar-negocio` (ver `INSTRUCCIONES-APARIENCIA.md`,
Pasos 1 y 2).

1. En [console.cloud.google.com](https://console.cloud.google.com) → **APIs y
   servicios → Biblioteca**: activa **Places API (New)**.
2. **Facturación**: tiene que estar activa.
3. **Credenciales**: la llave **no debe tener restricción de sitio web (referer HTTP)**,
   porque las consultas salen del servidor de Netlify, no del navegador. Restríngela
   por **API**: solo Places API (New).
4. En Netlify → **Site configuration → Environment variables**: `GOOGLE_PLACES_API_KEY`
   con esa llave. Las variables se aplican en el **siguiente despliegue**: vuelve a
   publicar (Paso 1) y repite el Paso 2.

## Paso 4 — Pon un tope diario en Google (obligatorio)

El sitio limita las consultas (60 cada 10 minutos por IP y 30 por dirección que se
escribe), pero esos límites viven en la memoria de cada copia de la función y **no son
una garantía**. El tope firme es el de Google:

**Google Cloud Console → APIs y servicios → Places API (New) → Cuotas** → limita las
solicitudes **por día** a un número que estés dispuesto a pagar. Sin este tope, un abuso
puede gastar dinero.

Una nota de honestidad sobre el diseño: esta función **no exige iniciar sesión**, porque
el analizador y la herramienta de cartas se usan sin cuenta. Si el uso crece, lo
razonable es exigir sesión solo en Mi cuenta y en Listar negocio.

## Paso 5 — Comprobación en el navegador (con el sitio publicado)

En una ventana nueva, con las herramientas de desarrollo abiertas en **Network**:

1. Abre `herramientas.html` → **Preparar mi carta** → escribe `1600 Penn` en «Tu calle y número».
   Tiene que aparecer **una** petición a `autocompletar-direccion` y, en menos de 2
   segundos, una lista de sugerencias. Elige una: calle, ciudad, estado y código postal
   se llenan y se pueden editar.
2. Antes de escribir (al cargar la página o solo al hacer clic en el campo) **no** debe
   salir ninguna petición.
3. Repite en `credito.html` (carta de una cuenta en cobranza: tu dirección y la de la
   agencia), en `cuenta.html` (Mi perfil) y en `listar-negocio.html`.

## Si algo falla

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Nada aparece y en la consola sale «no está publicado (404)» | Función sin publicar | Paso 1 y Paso 2 |
| La persona ve «El autocompletado no está disponible ahora» | Sin llave, sin cuota, o Google rechazó la llave | Paso 2 (`configurado`), luego Paso 3 y revisa **Cuotas** y **Facturación** en Google Cloud |
| Funciona en `mithemora.com` pero no en una vista previa de Netlify | La función solo acepta el sitio principal, `www` y la URL del despliegue actual | Prueba en `mithemora.com` |
| «Hiciste muchas búsquedas seguidas» | Se pasó el límite por IP o por dirección | Espera unos minutos |
| No aparecen sugerencias para un texto tipo número de seguro social o tarjeta | La función lo rechaza a propósito | Escribe una dirección normal |
| Probar en tu computadora | Un servidor estático no ejecuta funciones | Instala la línea de comandos de Netlify, crea un archivo `.env` con `GOOGLE_PLACES_API_KEY` (ya está ignorado por git) y ejecuta `netlify dev`; abre `http://localhost:8888/herramientas.html` |

## Agregar el autocompletado a un formulario nuevo

No hace falta JavaScript: marca los campos con atributos `data-dir-*` y carga
`direccion-autocompletar.js`. La lista completa de reglas está en el comentario del
principio de `direccion-autocompletar.js`. La prueba `tests/formularios-direccion.test.js`
**falla** si agregas un campo de dirección sin conectar (o sin una excepción con su razón),
para que no vuelva a quedar un formulario sin autocompletado por olvido.

## Antes de mencionarlo al público

No promociones el autocompletado en otras páginas hasta que el Paso 2 diga
`"configurado":true` y el Paso 5 salga bien.
