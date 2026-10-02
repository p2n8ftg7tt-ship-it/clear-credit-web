---
type: "audit"
date: "2026-09-28T19:33:49.078733+00:00"
question: "Revisión de diseño visual: jerarquía, tipografía, color, marca y consistencia"
contributor: "graphify"
outcome: "useful"
source_nodes: ["index.html", "credito.html", "comprar-casa.html", "styles.css"]
---

# Q: Revisión de diseño visual: jerarquía, tipografía, color, marca y consistencia

## Answer

# Revisión de diseño visual (frontend-design), 2026-09-28

Capturas con Edge headless a 1440px de index, credito y comprar-casa. Las capturas a 390px salieron recortadas porque Edge headless usa un ancho mayor, así que no sirven como evidencia de móvil.

## Qué funciona
- El hero de index.html (carta en papel, línea resaltada con --resaltador y nota en español; .hm-hoja, .hm-carta, .hm-marca y .hm-nota en index.html:46-78) es la única idea con identidad propia.
- Los colores por herramienta (.copia-*, --copia y --franja en styles.css:912-927) funcionan como navegación en la portada.
- Bricolage Grotesque y Literata contrastan bien, y el amarillo se usa con disciplina.

## Oportunidades, por orden
1. La idea principal no pasa de la portada. Las 17 páginas internas usan el mismo .page-hero oscuro con dos círculos decorativos (styles.css:143-145). credito usa una foto de stock en inglés con logos de Equifax, Experian y TransUnion y una taza que dice "SAME RIGHTS. BRIGHTER TOMORROW". comprar-casa no tiene imagen.
2. Bloques oscuros encadenados. En credito, el hero, la banda "Primero, revisa tus tres reportes" y la sección del analizador (.cr-analyzer-section, credito.html:421) suman unos 1600px oscuros, y la herramienta queda en medio. En comprar-casa, al hero oscuro le sigue .citizen-myth, también oscuro.
3. Restos de diseños anteriores:
   - marrón rgba(201,138,62) / rgba(184,134,59) en 20 lugares (credito.html:88, 112, 170; cartas-claras.html:52, 71, 97, 127, 129; comprar-casa.html:35, 64, 326; herramientas.html:90, 113, 494; styles.css:231, 390, 430, 432, 661, 662)
   - la cabecera de Zyron con gradiente a #171008 (styles.css:390)
   - el botón de login en píldora con gradiente, MAYÚSCULAS y brillo marrón (styles.css:430)
   - botones en píldora y en Literata en credito ("Obtener mis reportes", "Seleccionar documento")
   - 91 reglas uppercase (19 de ellas en comprar-casa)
4. Jerarquía débil en el hero. El botón secundario "Aprender los fundamentos" de credito casi no se ve. En comprar-casa, la tarjeta blanca redondeada .talk-card del hero (comprar-casa.html:440) compite con el titular.
5. Una palabra resaltada en el titular: .tint-green en "crédito" y "plan" (credito.html:342), con el nombre "green" en una página de color lavanda.
6. La escala tipográfica existe (--text-* en styles.css:56-70) pero nada la usa. Hay unos 800 tamaños fijos (122 en comprar-casa) y mucho texto serif gris de 13-14px.
7. CSS en tres capas: .eyebrow y .btn definidos dos veces (styles.css:147/879 y 154/888), más overrides body[data-cms-page="index"] con !important (index.html:171-233).

## Menores
- El logo apilado se ve débil a la altura del menú, y ni el menú ni el pie usan la idea del papel.
- Flechas "→" pegadas al texto de los enlaces.
- contacto dice "Escríbeme" (en singular) mientras el resto del sitio dice "nosotros".
- Líneas de unos 90 caracteres en las zonas oscuras de credito y comprar-casa (conviene limitarlas a 65ch).

## Outcome

- Signal: useful

## Source Nodes

- index.html
- credito.html
- comprar-casa.html
- styles.css