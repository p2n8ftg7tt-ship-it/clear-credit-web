# Quickstart — validar el resumen del consumidor (014)

## Requisitos

- Node 18+ (las pruebas usan `node --test`).
- Un servidor estático local para abrir `credito.html` (por ejemplo `npx serve .` o la extensión Live Server).
- Reportes de prueba: los fixtures sintéticos de `tests/fixtures/credito/` y, solo para revisión manual, un reporte real propio (nunca se copia al proyecto).

## 1. Pruebas automáticas

```bash
node --test tests/
```

Deben pasar, además de las existentes:

- `tests/analista-credito.test.js` — reglas, gravedades, orden, iniciales, obsolescencia, citas válidas contra `zyron-leyes.js`, lenguaje prohibido, `paraGuardar` sin datos personales.
- `tests/lector-credito.test.js` — `ssnUltimos4`, nombres sin «Name ID», marca «POTENTIALLY NEGATIVE», «written off».
- `tests/credito-resumen-ui.test.js` — estructura de `#analizar-reporte` según [contracts/ui-resumen.md](contracts/ui-resumen.md), ausencia de «cliente» y de las secciones retiradas.

## 2. Revisión manual con el formato de Experian

1. Abrir `credito.html`, subir un PDF de Experian (Annual Credit Report).
2. **Pasos**: aparecen los cuatro en orden; el último dice el mismo número de cuentas con problemas que la fila de círculos.
3. **Datos generales**: nombre de persona (no «Name ID»); «Este reporte no muestra tu número de Seguro Social» si no lo imprime; un teléfono; dirección actual con «y N más»; consultas duras destacadas.
4. Tocar el ícono de consultas duras: el cartel lista todas con empresa y fecha; se cierra con Escape y tocando fuera.
5. **Cuentas abiertas**: solo tipos con cuentas.
6. **Círculos**: una cuenta con «written off» en rojo; una tarjeta con atraso de 30 días en naranja; ninguna cuenta al día aparece.
7. Tocar un círculo: se abre su análisis con las cuatro partes, página de origen y cita (FCRA § 1681c, § 1681i…). Tocar otro: se cierra el primero.
8. «Preparar carta de disputa» abre el formulario ya conocido con acreedor y buró precargados.
9. Imprimir: sale el resumen nuevo; el SSN, si lo hay, enmascarado.
10. Teléfono (375 px): sin desplazamiento horizontal; los círculos pasan a varias filas.
11. Con «reducir movimiento» activado en el sistema: los pasos aparecen sin animación.

## 3. Grafo

```bash
graphify update .
```
