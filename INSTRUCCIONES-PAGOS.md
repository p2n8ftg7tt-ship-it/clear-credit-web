# Cobrar con tarjeta — puesta en marcha

Hasta que termines estos pasos, el sitio **no menciona el pago con tarjeta**.
No promete nada que no exista todavía, así que puedes hacerlo con calma.

---

## Lo primero: por qué merece la pena

Cuando alguien te paga con **tarjeta de crédito** y no recibe lo que pagó,
tiene derecho por ley a disputar el cargo con su banco. Esa protección es
suya, no tuya, y ni tú ni Stripe se la pueden quitar.

Cuando te paga por **Zelle**, no tiene nada de eso. El dinero se fue.

Para alguien que acaba de conocer tu página y está decidiendo si mandarte
$149, esa diferencia es la que decide. Por eso vale la comisión.

**Comisión real sobre tus precios:**

| Servicio | Precio | Te cuesta | Recibes |
|---|---:|---:|---:|
| Ficha en los dos mapas | $49.99 | ~$1.95 | ~$48.04 |
| LLC y EIN | $149.00 | ~$5.22 | ~$143.78 |

(2.9 % + $0.30 de procesamiento, más 0.4 % de facturación. Solo pagas cuando
cobras: no hay cuota mensual.)

---

## Paso 1 — Cuenta de banco del negocio

**No uses tu cuenta personal.** Dos razones:

1. En impuestos, separar el dinero del negocio te ahorra el trabajo de
   reconstruir después qué entrada era de qué.
2. Cuando formes la LLC, mezclar las cuentas es justamente lo que rompe la
   separación por la que existe una LLC.

**No hace falta la LLC todavía.** Puedes abrir una cuenta de negocio como
*sole proprietor* con tu nombre y tu SSN — es lo normal cuando se empieza.
Cuando tengas la LLC y el EIN, cambias la cuenta a nombre de la LLC.

---

## Paso 2 — Crear la cuenta de Stripe

1. Entra a **stripe.com** y crea la cuenta con tu correo del negocio.
2. Stripe te va a pedir: tu nombre legal, tu dirección, tu SSN o EIN y la
   cuenta de banco del paso 1. Es normal — están obligados a verificar quién
   cobra.
3. En **Settings → Business → Public details**, pon el nombre que quieres que
   el cliente vea en su estado de cuenta. Que sea **Themora** o el nombre que
   pusiste en `empresa.js` — nunca uno que el cliente no reconozca.
4. Ponle tu logo y el correo de soporte. Sale en la factura.

> Stripe está solo en inglés. Si algo no se entiende, mándame la pantalla.

---

## Paso 3 — La llave, en Netlify

1. En Stripe, **Developers → API keys**.
2. Copia la **Secret key** (empieza por `sk_live_`).
3. En Netlify: tu sitio → **Site configuration → Environment variables →
   Add a variable**.
4. Nombre exacto: `STRIPE_SECRET_KEY`. Valor: la llave que copiaste.
5. **Deploys → Trigger deploy → Deploy site**, para que la lea.

**Esa llave mueve dinero de tu cuenta.** No me la mandes a mí, no la pongas en
ningún archivo del sitio y no la pegues en un chat. Si alguna vez crees que se
filtró, en Stripe le das a *Roll key* y se anula en el momento.

Para probar sin dinero real, usa la llave que empieza por `sk_test_` y la
tarjeta de prueba `4242 4242 4242 4242` con cualquier fecha futura.

---

## Paso 4 — Encender el aviso en la página

En **`pago.js`**, línea ~40:

```js
var FACTURA_CON_TARJETA = true;
```

Y un poco más abajo, los medios que sigas aceptando a mano:

```js
var MEDIOS_DE_COBRO = ['Zelle', 'Cash App'];
```

**Deja Zelle puesto.** Parte de la gente a la que sirves no tiene tarjeta de
crédito, y si el único camino es tarjeta, los pierdes. Con las dos líneas
puestas, la página muestra las dos opciones lado a lado y dice cuál protege
al cliente y cuál no.

---

## Paso 5 — Cobrar, en la práctica

1. Llega el formulario. Anota el correo del cliente y su referencia `TH-…`.
2. Le escribes: si se puede hacer, cuánto cuesta, qué incluye.
3. Dice que sí.
4. Entras a **mithemora.com/admin.html → Cobrar con tarjeta**. Pones su
   correo, el servicio, la referencia y —si aplica— la cuota del estado.
5. Le das a **Crear borrador en Stripe**.
6. Se abre Stripe con la factura **en borrador**. La revisas y le das a
   **Send invoice**. Ahí es cuando le llega al cliente, no antes.
7. El cliente paga desde su correo. Stripe te avisa y el dinero llega a tu
   banco en 2 días hábiles.

**El importe no sale del panel, sale del servidor.** El panel solo dice qué
servicio es. Así, ni un error de tecleo ni un navegador manipulado pueden
crear una factura de $10,000. Lo único que escribes a mano son las tasas
oficiales, y tienen tope de $1,000.

**Las tasas oficiales van en una línea aparte.** Si metes los $149 y los $100
de Virginia en una sola línea, el cliente cree que los $249 son todos tuyos.
Separados, ve exactamente qué es tu trabajo y qué cobra el estado.

---

## Si alguien pide un reembolso

En Stripe, abre el pago y dale a **Refund** — total o parcial, según las
[etapas de Términos](https://mithemora.com/terminos#etapas). Vuelve a su
tarjeta en 5 a 10 días hábiles.

**Siempre devuelve por el mismo medio por el que pagó.** Si pagó con tarjeta,
reembolso a la tarjeta. Si pagó por Zelle, Zelle. Pedirle datos nuevos para
devolverle su dinero es exactamente lo que hace un estafador, y no quieres
parecerte a eso ni por accidente.

---

## Si te llega una disputa (*chargeback*)

Va a pasar alguna vez, y no significa que hicieras nada mal.

1. Stripe te avisa y te da unos días para responder.
2. Sube lo que tengas: los mensajes donde acordaron el precio, la referencia
   `TH-…`, y la prueba de lo que entregaste (capturas de la ficha creada, el
   acuse del estado, la carta del EIN).
3. Decide el banco del cliente, no Stripe.

Por eso vale la pena guardar cada entrega con su fecha desde el primer día.
Esa carpeta es la que gana o pierde la disputa.

---

## Lo que este sitio nunca hace

- **No guarda números de tarjeta.** Nunca pasan por tu página: el cliente los
  escribe en la página de Stripe.
- **No cobra solo.** No hay botón de "Pagar" que dispare un cargo. Todo pasa
  por una factura que tú revisas y mandas.
- **No manda la factura automáticamente.** Siempre queda en borrador. Un
  correo enviado no se puede des-enviar.
