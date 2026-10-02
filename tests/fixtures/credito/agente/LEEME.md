# Fixtures del agente de crédito

Esta carpeta guarda **Reportes ya normalizados**, con la misma forma que
`tests/fixtures/credito/esperado/*.json` y el modelo de la spec 013. No contiene
arreglos de `Pagina`.

Todos los datos son sintéticos. Sirven para probar las herramientas de cálculo
sin pasar por el lector, de modo que las dos capas puedan verificarse por
separado. Los orígenes (`pagina`, `seccion`, `etiqueta` y `linea`) se escriben a
mano en estos fixtures.
