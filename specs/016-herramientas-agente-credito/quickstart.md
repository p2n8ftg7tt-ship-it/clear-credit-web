# Quickstart — validar las herramientas de cálculo (016)

## Requisitos

- Node 18 o más reciente (`node --test`). No hay dependencias que instalar.
- Desde la raíz del proyecto (`MyWeb/`).

## 1. Pruebas de la feature

```bash
node --test tests/herramientas-credito.test.js
```

Esperado: todas pasan. Cubren:

| Grupo | Qué demuestra |
|---|---|
| ACME/ZETA | Los valores de la tabla «Resultados de referencia» de `spec.md`, exactos (SC-001) |
| Casos límite | Una prueba por cada caso de «Edge Cases» de `spec.md` (SC-002) |
| Determinismo | 100 ejecuciones con la misma entrada dan 100 salidas idénticas; mismo resultado con `TZ=America/Los_Angeles` y `TZ=Asia/Tokyo` (SC-003) |
| Sin mutación | El fixture congelado no provoca errores |
| Palabras prohibidas | Ninguna salida contiene las palabras de FR-004 (SC-005) |
| Origen | Cada resultado por cuenta o consulta trae un origen con página y etiqueta (SC-006) |
| Humo | Las 4 herramientas corren sobre los 6 reportes de `tests/fixtures/credito/esperado/` sin errores |

## 2. Zona horaria (determinismo)

```bash
TZ=America/Los_Angeles node --test tests/herramientas-credito.test.js
TZ=Asia/Tokyo          node --test tests/herramientas-credito.test.js
```

En PowerShell: `$env:TZ='Asia/Tokyo'; node --test tests/herramientas-credito.test.js`.

Esperado: los mismos resultados.

## 3. Sin regresiones (SC-007)

```bash
node --test tests/*.test.js
```

En Windows, la forma con la carpeta (`node --test tests/`) falla durante el descubrimiento.

Esperado: todas las pruebas que pasaban antes siguen pasando. `git diff --stat` no muestra cambios en `credito.html`, `cartas-bilingues.js`, `lector-credito*.js` ni `analista-credito.js`.

## 4. Prueba manual rápida

```bash
node -e "const H=require('./herramientas-credito.js');const r=require('./tests/fixtures/credito/agente/acme-zeta.json');console.log(JSON.stringify(H.ejecutar('calcularFechaSalida',r,{hoy:'2026-10-01',cuentaId:'A'}),null,2))"
```

Esperado: el resultado del ejemplo de `contracts/herramientas-api.md` (salida `2028-09`, estimada, rango `2028-08`–`2028-09`).

## 5. Después de cambiar código

```bash
graphify update .
```
