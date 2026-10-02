# Quickstart — validar la Fase 1 (lectura cuenta por cuenta)

## Requisitos

- Node 24 o superior. No hace falta `npm install`, porque el proyecto no tiene dependencias de Node.
- Un navegador para la prueba manual; sirve `npx serve .` o abrir la página con Netlify Dev.
- **Opcional**: un reporte propio en PDF para probar a mano. No se sube a ningún lado y no se copia al proyecto.

## 1. Pruebas automáticas

```powershell
node --test tests/lector-credito.test.js tests/lector-credito-perfiles.test.js tests/credito-fase0.test.js tests/credito-identidad.test.js tests/cartas-bilingues.test.js tests/sistema-visual.test.js
```

**Resultado esperado**: todas pasan. En concreto:

| Qué se prueba | Resultado esperado | Requisito |
|---|---|---|
| `equifax.json` | 6 cuentas (3 abiertas, 3 cerradas), una en «Charge Off» con DOFD y monto; 2 cuentas del mismo acreedor con la misma fecha de apertura; la empresa con consulta dura y blanda produce una consulta por fecha | FR-010, FR-011, R12 |
| Código narrativo 233 | En esas cuentas, «High Credit» termina en `limite` y la cuenta registra la regla aplicada | US1 escenario 2 |
| `experian.json` | «Credit Limit / Original Balance» va a `limite` en la tarjeta y a `montoOriginal` en el préstamo | US1 escenario 3 |
| `transunion.json` (versión por correo) | Las cobranzas se encuentran dentro de «Accounts with Adverse Information» | US1 escenario 4 |
| Campos impresos vacíos | Quedan como `no_reportado`, nunca como 0 | FR-013, SC-003 |
| Cuadrícula sin posiciones `x` | El atraso sale con `mesVerificable:false` | US1 escenario 6 |
| `generico.json` | Perfil genérico y advertencia `formato_no_verificado` | US1 escenario 7 |
| Orígenes | Cada `Valor` tiene `origen.pagina` y `origen.seccion` | FR-012, SC-002 |
| Privacidad | La salida serializada no contiene el SSN ni la fecha de nacimiento sembrados en el fixture; ningún número de cuenta tiene más de 4 dígitos visibles | FR-017 |
| Perfiles | Los 4 perfiles tienen fuente y fecha; los códigos pertenecen al vocabulario común; no contienen datos de personas | FR-014, FR-015, FR-016 |

## 2. Prueba manual en el navegador

1. Abre `credito.html` y ve a «Sube tu reporte».
2. Sube un reporte en PDF y pulsa «Leer mi reporte». Comprueba lo siguiente:
   - El progreso dice «Leyendo la página N de M».
   - El encabezado del resultado dice el buró y la fecha en una frase.
   - Aparece «Tus cuentas, una por una» con una ficha por cuenta. El número de fichas coincide con las cuentas de tu reporte.
   - En cada ficha, las fechas se ven igual que en tu papel. Lo que en tu reporte está vacío dice «no reportado».
   - Solo la DOFD, la fecha de charge-off, el monto vencido y el monto de charge-off tienen resaltador, y solo cuando tienen valor.
   - La franja del historial marca los atrasos en rojo, con su número dentro.
   - «De dónde salió cada dato» indica la página correcta.
3. Pon el teléfono en vertical, a 360 px de ancho: no debe haber desplazamiento horizontal, y el índice pasa a ser «Ir a una cuenta».
4. Activa «Reducir movimiento» en el sistema: el resaltador aparece sin animación.
5. Imprime o guarda como PDF: las fichas no se cortan a la mitad.
6. Sube un PDF escaneado, que no tiene texto: la página dice que no pudo leer el texto. **No** debe decir que el reporte está limpio.

## 3. Lo que no cambia

- Los puntos negativos y positivos, el plan y las cartas siguen como en la Fase 0.
- Evidencia: `tests/credito-fase0.test.js`, `tests/credito-identidad.test.js` y `tests/cartas-bilingues.test.js` pasan.
- Después de implementar: `graphify update .`
