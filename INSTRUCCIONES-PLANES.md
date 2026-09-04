# Cómo funcionan los planes de pago en Clear Credit

Ahora generar una carta (validación de deuda, disputa a un buró, o corrección
de identidad) requiere que el cliente tenga un plan activo: **Básico**
($4.99/mes), **Estándar** ($9.99/mes) o **Premium** ($14.99/mes). El resto del
sitio — el analizador de reporte, las calculadoras, el contenido educativo y
Mr. Credit Coach — sigue siendo gratis, como ya tenías planeado.

## Prueba gratis de 7 días

Toda cuenta nueva puede generar cartas gratis durante los primeros **7 días
desde que se creó la cuenta** — sin elegir ningún plan. No requiere que hagas
nada: se calcula automáticamente con la fecha en que Supabase registró la
cuenta, así que no hay ninguna tabla ni campo que activar.

- Mientras dura la prueba, el formulario para preparar la carta se abre
  directo (sin la ventana de planes) y muestra un aviso — "Estás usando tu
  prueba gratis de 7 días — te quedan X días" — con un enlace para ver los
  planes de todas formas, por si el cliente quiere elegir uno antes de que se
  acabe.
- En "Mi cuenta", mientras dura la prueba, el cliente ve "Prueba gratis · X
  días" en vez de "Sin plan activo".
- Pasados los 7 días, si no activaste un plan para esa cuenta, vuelve a
  aparecer la ventana de planes normalmente — el mismo comportamiento que ya
  tenías.
- Un cliente con un plan activo (activado por ti, como se explica abajo)
  nunca ve el aviso de prueba, tenga los días que tenga la cuenta — el plan
  real siempre manda.

Si más adelante quieres cambiar la duración (por ejemplo a 14 días) o
quitarla del todo, es un solo número que puedo ajustar en segundos — dime
cuándo.

Todavía no conectamos un cobro real (Stripe u otro procesador) — ese es
justamente el paso que falta y que puedes pedirme cuando quieras hacerlo. Por
ahora el flujo es manual y no requiere que configures nada nuevo además de lo
que ya tenías:

## Cómo se ve para el cliente

1. Analiza su reporte gratis, como siempre.
2. Cuando hace clic en "Solucionar este problema" para generar una carta, si
   no tiene un plan activo le aparece una ventana con los tres planes.
3. Si no ha iniciado sesión, le pedimos que cree una cuenta gratis o inicie
   sesión primero (así sabemos a quién activarle el plan).
4. Si ya inició sesión y elige un plan, se envía un formulario (usando
   Netlify Forms, igual que el formulario de contacto) con su correo y el
   plan elegido — sin necesitar backend propio.
5. Tú te pones en contacto con esa persona para cobrar (Zelle, Cash App,
   Venmo, o lo que ya uses) y luego activas su plan manualmente — ver abajo.

## Dónde ves quién quiere un plan

En tu panel de Netlify, ve a **Forms** → verás una entrada nueva llamada
`plan-interes` junto a la de `contacto` que ya tenías. Ahí aparece el correo
de cada persona y qué plan eligió, en el momento en que lo elige. Puedes
activar notificaciones por correo para este formulario igual que hiciste (o
puedas hacer) con el de contacto: **Forms → plan-interes → Settings and
usage → Form notifications**.

## Cómo activas el plan de un cliente que ya te pagó

El plan de cada cliente vive en un campo especial de Supabase
(`app_metadata`) que el cliente **no puede editar desde el navegador** —
solo tú, desde el SQL Editor de tu proyecto:

1. En Supabase, abre **SQL Editor**.
2. Corre esto, cambiando el correo y el plan (`basico`, `estandar` o
   `premium`):

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"plan":"estandar"}'::jsonb
where email = 'correo-del-cliente@ejemplo.com';
```

3. Listo. La próxima vez que ese cliente inicie sesión (o recargue la
   página si ya tenía sesión abierta), va a poder generar cartas sin que le
   vuelva a aparecer la ventana de planes.

Para quitarle el plan a alguien (por ejemplo, si canceló), corre lo mismo
pero con `'{"plan":null}'::jsonb`.

## Cuando quieras cobrar de verdad, sin hacerlo manualmente

Cuando tengas suficientes clientes interesados como para que activar planes
a mano ya no sea práctico, el siguiente paso natural es conectar **Stripe**.
Hay tres formas, de menos a más trabajo de configuración:

1. **Enlaces de pago de Stripe** (el más rápido): tú mismo creas los 3
   productos/precios en tu cuenta de Stripe (unos minutos, sin código) y me
   das los 3 enlaces — yo los conecto a los botones "Elegir plan" del sitio.
   El cliente paga ahí mismo, pero tú sigues activando el plan a mano
   después de ver el pago en Stripe.
2. **Stripe Checkout integrado**: como el anterior, pero con una función de
   Netlify que activa el plan automáticamente cuando Stripe confirma el
   pago (usando un webhook) — nadie tiene que activar nada a mano, pero
   toma más tiempo de configuración inicial.
3. Seguir como está ahora — está bien mientras el volumen sea manejable.

Dime cuándo quieres dar ese paso y lo armamos juntos.

## Notas importantes

- El campo `plan` no se puede falsificar desde el navegador — vive en
  `app_metadata`, que Supabase protege específicamente para esto (a
  diferencia de `user_metadata`, que si podría editar el propio cliente).
- Si más adelante quieres que un plan tenga fecha de vencimiento (por
  ejemplo, para pagos mensuales manuales), lo más simple es agregar un
  recordatorio en tu calendario para revisar y renovar o quitar el `plan`
  de cada cliente cuando corresponda, hasta que tengas cobros automáticos.
