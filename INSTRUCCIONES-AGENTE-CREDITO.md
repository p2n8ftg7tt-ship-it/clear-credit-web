# Agente de crédito con IA — cómo activarlo

El agente analiza el reporte de crédito con Claude (spec 017). Es gratis para el consumidor: hasta 3 análisis por día por cuenta, con sesión iniciada. Hasta que hagas estos pasos, el sitio no debe anunciarlo.

## 1. Crear el contador en Supabase

1. Entra a Supabase → tu proyecto → **SQL Editor** → **New query**.
2. Copia el bloque «Agente de crédito con IA (spec 017)» del final de `supabase-schema.sql` y presiona **Run**.
3. Comprueba: en **Table Editor** aparece `credito_agente_uso`, y en **Database → Functions** aparecen `credito_agente_consumir` y `credito_agente_llamar`.

## 2. Crear el secreto de los pases en Netlify

1. En tu computadora, en la carpeta del proyecto, corre:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```
2. Netlify → tu sitio → **Site configuration → Environment variables → Add a variable**:
   - Key: `AGENTE_CREDITO_SECRETO`
   - Value: lo que imprimió el comando.
3. Vuelve a publicar el sitio (Deploys → Trigger deploy).

`ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` ya existen (las usan Zyron y los pagos).

## 3. Poner un límite de gasto en Anthropic (recomendado)

console.anthropic.com → **Settings → Limits**: pon un **límite de gasto** mensual que te deje tranquilo. Si se alcanza, el agente responde con el análisis local sin IA; el sitio sigue funcionando.

## 4. Probar con Claude de verdad (cuesta centavos)

```bash
ANTHROPIC_API_KEY=tu_llave node tests/manual/agente-credito-real.js
```

En PowerShell: `$env:ANTHROPIC_API_KEY='tu_llave'; node tests/manual/agente-credito-real.js`.

Debe terminar con `"modo": "ia"`, 6 vueltas o menos, cada una por debajo de 8,500 ms, y un costo de unos 5 a 12 centavos. Anota lo medido en `specs/017-agente-credito-ia/notas-prueba-real.md`.

## Qué guarda y qué no

- Guarda: tu id de usuario, el día y cuántos análisis hiciste ese día.
- No guarda: nada del reporte. Los nombres, direcciones, teléfonos, SSN y números de cuenta nunca salen del teléfono del consumidor.
