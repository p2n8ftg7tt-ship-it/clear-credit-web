/* =========================================================
   doc-paginas.js — convierte lo que suba la persona en PÁGINAS
   ---------------------------------------------------------
   Lo usan Cartas Claras y la herramienta del contrato del dealer.

   El problema que resuelve: más del 90% de los documentos reales
   tienen más de una página. Una carta de cobro trae el aviso de
   derechos atrás; un contrato de dealer tiene el precio en la
   página 1 y los productos agregados en la 3. Leer solo la
   primera foto es leer mal el documento.

   Qué hace:
   - Acepta varias fotos a la vez, en el orden en que se eligieron.
   - Acepta PDF y convierte CADA página a imagen. Esto además
     arregla un error que estaba escondido: antes, si alguien subía
     un PDF escaneado (sin texto) y el lector local fallaba, el
     camino de la foto reventaba, porque un PDF no se puede meter
     en una etiqueta <img>.
   - Reduce cada página para que quepa en el tope de la petición,
     bajando calidad por pasos si hace falta, en vez de fallar.

   Nada de esto sale del dispositivo: aquí solo se preparan los
   archivos. Quien decide si se mandan es la persona, con el panel
   de permiso de cada página.
   ========================================================= */
(function () {
  'use strict';

  var MAX_PAGINAS = 8;           // más que esto casi siempre es un documento equivocado
  var LADO_MAX = 1568;           // el lado largo, en píxeles
  var CALIDADES = [0.82, 0.7, 0.6, 0.5];  // se van probando de mejor a peor
  var TOPE_TOTAL = 3.6 * 1024 * 1024;     // base64 sumado de todas las páginas

  function esPdf(file) {
    return file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
  }
  function esImagen(file) {
    return /^image\//.test(file.type || '');
  }

  function lienzoAJpeg(canvas, calidad) {
    return canvas.toDataURL('image/jpeg', calidad).split(',')[1];
  }

  function escalar(anchoOrig, altoOrig, lado) {
    var e = Math.min(1, lado / Math.max(anchoOrig, altoOrig));
    return { w: Math.max(1, Math.round(anchoOrig * e)), h: Math.max(1, Math.round(altoOrig * e)) };
  }

  /* Una imagen del teléfono → un lienzo. */
  function imagenALienzo(file, lado) {
    return new Promise(function (resolve, reject) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var d = escalar(img.width, img.height, lado);
        var c = document.createElement('canvas');
        c.width = d.w; c.height = d.h;
        c.getContext('2d').drawImage(img, 0, 0, d.w, d.h);
        resolve(c);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('No se pudo abrir "' + (file.name || 'esa imagen') + '". Intenta con otra foto.'));
      };
      img.src = url;
    });
  }

  /* Un PDF → un lienzo por página. Así funciona igual un PDF de texto
     que uno escaneado: para la IA las dos cosas terminan siendo imágenes. */
  function pdfALienzos(file, lado, restantes) {
    if (!window.pdfjsLib) {
      return Promise.reject(new Error('No se pudo cargar el lector de PDF. Revisa tu conexión e inténtalo otra vez.'));
    }
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    return file.arrayBuffer().then(function (buf) {
      return window.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
    }).then(function (pdf) {
      var total = Math.min(pdf.numPages, restantes);
      var lienzos = [];
      var cadena = Promise.resolve();
      for (var i = 1; i <= total; i++) {
        (function (n) {
          cadena = cadena.then(function () {
            return pdf.getPage(n).then(function (page) {
              var v1 = page.getViewport({ scale: 1 });
              var escala = Math.min(2, lado / Math.max(v1.width, v1.height));
              var vp = page.getViewport({ scale: escala });
              var c = document.createElement('canvas');
              c.width = Math.round(vp.width); c.height = Math.round(vp.height);
              // Fondo blanco: un PDF sin fondo sale negro al pasarlo a JPEG.
              var ctx = c.getContext('2d');
              ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
              return page.render({ canvasContext: ctx, viewport: vp }).promise.then(function () {
                lienzos.push(c);
              });
            });
          });
        })(i);
      }
      return cadena.then(function () {
        return { lienzos: lienzos, totalReal: pdf.numPages };
      });
    });
  }

  /* Comprime todas las páginas con la mejor calidad que quepa en el tope.
     Prefiere bajar calidad antes que rechazar el documento: una foto un
     poco más comprimida se sigue leyendo; un error deja a la persona sin
     nada. */
  function comprimirDentroDelTope(lienzos) {
    for (var i = 0; i < CALIDADES.length; i++) {
      var datos = lienzos.map(function (c) { return lienzoAJpeg(c, CALIDADES[i]); });
      var total = datos.reduce(function (s, d) { return s + d.length; }, 0);
      if (total <= TOPE_TOTAL) return { datos: datos, calidad: CALIDADES[i] };
    }
    // Último intento: encoger también las dimensiones a la mitad.
    var chicos = lienzos.map(function (c) {
      var d = escalar(c.width, c.height, Math.round(LADO_MAX / 2));
      var n = document.createElement('canvas');
      n.width = d.w; n.height = d.h;
      n.getContext('2d').drawImage(c, 0, 0, d.w, d.h);
      return n;
    });
    var datos2 = chicos.map(function (c) { return lienzoAJpeg(c, 0.5); });
    var total2 = datos2.reduce(function (s, d) { return s + d.length; }, 0);
    if (total2 <= TOPE_TOTAL) return { datos: datos2, calidad: 0.5 };
    return null;
  }

  /* ===== La función que usan las páginas =====
     Recibe los archivos que eligió la persona y devuelve:
       { paginas: [{nombre, base64, mediaType}], avisos: [texto] }
     Los avisos son cosas que la persona debe saber (se recortaron
     páginas, se bajó la calidad), no errores. */
  function prepararPaginas(files) {
    var lista = Array.prototype.slice.call(files || []);
    if (!lista.length) return Promise.reject(new Error('No se seleccionó ningún archivo.'));

    var avisos = [];
    var nombres = [];
    var lienzos = [];
    var cadena = Promise.resolve();

    lista.forEach(function (file) {
      cadena = cadena.then(function () {
        var restantes = MAX_PAGINAS - lienzos.length;
        if (restantes <= 0) return;

        if (esPdf(file)) {
          return pdfALienzos(file, LADO_MAX, restantes).then(function (r) {
            r.lienzos.forEach(function (c, i) {
              lienzos.push(c);
              nombres.push((file.name || 'PDF') + ' · pág. ' + (i + 1));
            });
            if (r.totalReal > r.lienzos.length) {
              avisos.push('El PDF "' + (file.name || '') + '" tiene ' + r.totalReal +
                ' páginas y solo se tomaron las primeras ' + r.lienzos.length + '.');
            }
          });
        }
        if (esImagen(file)) {
          return imagenALienzo(file, LADO_MAX).then(function (c) {
            lienzos.push(c);
            nombres.push(file.name || 'Foto ' + lienzos.length);
          });
        }
        avisos.push('"' + (file.name || 'un archivo') + '" no es una foto ni un PDF, así que no se incluyó.');
      });
    });

    return cadena.then(function () {
      if (!lienzos.length) {
        throw new Error('No se pudo preparar ninguna página. Sube fotos (JPG o PNG) o un PDF.');
      }
      // Si un PDF ya avisó que se recortó, no se repite el mismo mensaje.
      var yaAviso = avisos.some(function (a) { return /solo se tomaron/.test(a); });
      if (lienzos.length >= MAX_PAGINAS && !yaAviso) {
        avisos.push('Se tomaron las primeras ' + MAX_PAGINAS + ' páginas. Si el documento es más largo, sube por separado las que tengan las fechas y los montos.');
      } else if (yaAviso) {
        avisos.push('Si el documento es más largo, sube por separado las páginas que tengan las fechas y los montos.');
      }
      var r = comprimirDentroDelTope(lienzos);
      if (!r) {
        throw new Error('Las fotos pesan demasiado juntas. Sube menos páginas a la vez, o tómalas con menor resolución.');
      }
      if (r.calidad < 0.7) {
        avisos.push('Las fotos se comprimieron bastante para que cupieran todas. Si el resultado sale confuso, prueba subiendo menos páginas a la vez.');
      }
      return {
        paginas: r.datos.map(function (d, i) {
          return { nombre: nombres[i] || ('Página ' + (i + 1)), base64: d, mediaType: 'image/jpeg' };
        }),
        avisos: avisos
      };
    });
  }

  window.ThemoraPaginas = {
    preparar: prepararPaginas,
    MAX_PAGINAS: MAX_PAGINAS,
    esPdf: esPdf,
    esImagen: esImagen
  };
})();
