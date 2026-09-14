@echo off
REM ===================================================================
REM  Limpieza de archivos que ya no usa ninguna pagina de Themora.
REM
REM  NO BORRA NADA DE VERDAD. Mueve los archivos a una carpeta
REM  llamada _papelera, dentro de tu misma carpeta MyWeb.
REM
REM  Asi puedes revisar que el sitio siga bien y, cuando estes
REM  tranquilo, borrar esa carpeta a mano. Si algo saliera mal,
REM  los archivos siguen ahi y los puedes devolver.
REM
REM  Ademas, todo esto ya esta en tu GitHub, asi que aunque borres
REM  _papelera se puede recuperar desde ahi.
REM ===================================================================

setlocal
cd /d "%~dp0"

echo.
echo ===================================================================
echo   LIMPIEZA DE THEMORA
echo ===================================================================
echo.
echo   Se van a MOVER (no borrar) estos archivos a _papelera:
echo.
echo     images\hero-compra-auto.png             2.2 MB
echo     images\hero-compra-casa.png             2.2 MB
echo     images\hero-familia.png                 2.2 MB
echo     images\compass.png                      0.8 MB
echo     images\hero-familia-casa.png            2.2 MB
echo     images\hero-familia-concesionario.png   2.0 MB
echo     images\cartas-claras-hero.jpg           0.2 MB
echo     images\loading-spinner.png              0.1 MB
echo     comprar-casa-auto.html
echo.
echo   Total: unos 11.9 MB
echo.
echo   Ninguno de estos archivos aparece en ninguna pagina del sitio.
echo   Se comprobo archivo por archivo antes de escribir esto.
echo.
echo ===================================================================
echo.
set /p RESP="Escribe SI y pulsa Enter para continuar (o cierra la ventana): "

if /I not "%RESP%"=="SI" (
  echo.
  echo   Cancelado. No se movio nada.
  echo.
  pause
  exit /b
)

if not exist "_papelera\images" mkdir "_papelera\images"

set MOVIDOS=0
set FALTANTES=0

call :mover "images\hero-compra-auto.png"            "_papelera\images\"
call :mover "images\hero-compra-casa.png"            "_papelera\images\"
call :mover "images\hero-familia.png"                "_papelera\images\"
call :mover "images\compass.png"                     "_papelera\images\"
call :mover "images\hero-familia-casa.png"           "_papelera\images\"
call :mover "images\hero-familia-concesionario.png"  "_papelera\images\"
call :mover "images\cartas-claras-hero.jpg"          "_papelera\images\"
call :mover "images\loading-spinner.png"             "_papelera\images\"
call :mover "comprar-casa-auto.html"                 "_papelera\"

echo.
echo ===================================================================
echo   Listo. Movidos: %MOVIDOS%    Ya no estaban: %FALTANTES%
echo ===================================================================
echo.
echo   AHORA:
echo     1. Sube el cambio a GitHub y espera el despliegue.
echo     2. Abre tu sitio y revisa que las imagenes se vean bien.
echo     3. Si todo esta bien, borra la carpeta _papelera a mano.
echo.
echo   IMPORTANTE: no subas la carpeta _papelera al sitio. Si usas
echo   GitHub Desktop, quitale la palomita a esos archivos, o borra
echo   la carpeta antes de subir.
echo.
pause
exit /b

:mover
if exist %1 (
  move /Y %1 %2 >nul
  if errorlevel 1 (
    echo   [ERROR] no se pudo mover %~1
  ) else (
    echo   [movido] %~1
    set /a MOVIDOS+=1
  )
) else (
  echo   [ya no estaba] %~1
  set /a FALTANTES+=1
)
exit /b
