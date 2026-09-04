/* =========================================================
   ⚠ ARCHIVO SIN USO — NO se incluye en ninguna página del sitio.
   La versión real y activa del analizador de reporte de crédito
   vive dentro de <script> en credito.html (busca "ANALIZADOR DE
   REPORTE"). Este archivo quedó de una versión anterior y sus
   IDs ya no coinciden con el HTML actual; si lo llegaras a
   incluir por error, no funcionaría. Seguro de borrar.
   ========================================================= */

/* =========================================================
   Analizador de reporte de crédito — 100% en el navegador.
   No se sube ningún archivo a ningún servidor.
   Es un análisis por patrones de texto, no una IA que
   "entiende" el documento — sirve como primera guía, no
   como sustituto de asesoría profesional.
   ========================================================= */

(function () {
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  const dropzone = document.getElementById("crDropzone");
  const fileInput = document.getElementById("crFileInput");
  const selectBtn = document.getElementById("crSelectBtn");
  const uploadEmpty = document.getElementById("crUploadEmpty");
  const fileReady = document.getElementById("crFileReady");
  const fileType = document.getElementById("crFileType");
  const fileNameEl = document.getElementById("crFileName");
  const fileSizeEl = document.getElementById("crFileSize");
  const changeBtn = document.getElementById("crChangeBtn");
  const analyzeBtn = document.getElementById("crAnalyzeBtn");
  const progressBox = document.getElementById("crProgress");
  const errorBox = document.getElementById("crError");
  const errorMsg = document.getElementById("crErrorMsg");
  const resultsBox = document.getElementById("crResults");
  const healthBox = document.getElementById("crHealth");
  const healthLabel = document.getElementById("crHealthLabel");
  const positivesList = document.getElementById("crPositives");
  const negativesList = document.getElementById("crNegatives");
  const strategyList = document.getElementById("crStrategy");

  if (!dropzone || !fileInput) return;

  const MAX_BYTES = 15 * 1024 * 1024;
  let currentFile = null;

  /* ---------- patrones a detectar ---------- */
  const CHECKS = [
    {
      id: "late",
      type: "negative",
      label: "Pagos atrasados reportados",
      test: (t) =>
        /\b(30|60|90|120)\s*-?\s*d[ií]as?\s*(de\s*)?atraso/i.test(t) ||
        /\b(30|60|90|120)\s*-?\s*day(s)?\s*late\b/i.test(t) ||
        /pago(s)?\s*atrasad/i.test(t) ||
        /\bpast\s*due\b/i.test(t),
      strategy:
        "Si el atraso fue reciente, considera automatizar tus pagos para que no se repita. Si crees que el dato es incorrecto, puedes disputarlo directamente con el buró que lo reporta.",
    },
    {
      id: "collections",
      type: "negative",
      label: "Cuentas en colección",
      test: (t) => /\bcollections?\b/i.test(t) || /\ben\s*colecci[oó]n/i.test(t),
      strategy:
        "Contacta primero al acreedor original para entender el origen de la deuda. Antes de pagar, pregunta por escrito si es posible negociar que se elimine del reporte una vez pagada ('pay for delete').",
    },
    {
      id: "chargeoff",
      type: "negative",
      label: "Cuentas canceladas por falta de pago (charge-off)",
      test: (t) => /charge[-\s]?off/i.test(t),
      strategy:
        "Una cuenta en charge-off sigue afectando tu puntaje varios años. Revisa la fecha en que se reportó por primera vez como morosa, ya que determina cuándo debe desaparecer del reporte (generalmente 7 años).",
    },
    {
      id: "bankruptcy",
      type: "negative",
      label: "Bancarrota o registros públicos",
      test: (t) =>
        /bankruptcy/i.test(t) || /quiebra/i.test(t) || /public\s*record/i.test(t) || /registro\s*p[uú]blico/i.test(t),
      strategy:
        "Los registros públicos permanecen varios años en tu historial. Mientras tanto, enfócate en abrir y manejar bien cuentas nuevas para reconstruir un historial positivo encima de ese dato.",
    },
    {
      id: "repo",
      type: "negative",
      label: "Reposesión o ejecución hipotecaria",
      test: (t) => /repossession/i.test(t) || /foreclosure/i.test(t) || /ejecuci[oó]n\s*hipotecaria/i.test(t),
      strategy:
        "Este tipo de evento pesa bastante en el puntaje. Prioriza no acumular más atrasos en otras cuentas mientras este dato sigue activo en tu reporte.",
    },
    {
      id: "inquiries",
      type: "negative",
      label: "Varias consultas de crédito recientes (hard inquiries)",
      test: (t) => {
        const matches = t.match(/hard\s*inquiry|hard\s*inquiries|consulta(s)?\s*dura/gi);
        return matches && matches.length >= 3;
      },
      strategy:
        "Evita solicitar crédito nuevo en los próximos 6 a 12 meses. Cada solicitud genera una nueva consulta que puede bajar tu puntaje temporalmente.",
    },
    {
      id: "fraud",
      type: "negative",
      label: "Alerta de fraude o posible robo de identidad",
      test: (t) => /fraud\s*alert/i.test(t) || /identity\s*theft/i.test(t) || /robo\s*de\s*identidad/i.test(t),
      strategy:
        "Revisa con cuidado que reconozcas todas las cuentas listadas. Si algo no es tuyo, repórtalo cuanto antes en IdentityTheft.gov y notifica a los tres burós.",
    },
    {
      id: "utilization-high",
      type: "negative",
      label: "Utilización de crédito alta",
      test: (t) => {
        const pct = extractUtilizationPct(t);
        return pct !== null && pct > 30;
      },
      strategy:
        "Intenta bajar el saldo de tus tarjetas a menos del 30% del límite disponible — idealmente por debajo del 10% para un efecto más favorable en tu puntaje.",
    },
    /* ---------- señales positivas ---------- */
    {
      id: "on-time",
      type: "positive",
      label: "Menciona pagos al día o cuentas 'current'",
      test: (t) => /pagado\s*seg[uú]n\s*lo\s*acordado/i.test(t) || /\bpaid\s*as\s*agreed\b/i.test(t) || /\bcurrent\b/i.test(t),
    },
    {
      id: "utilization-low",
      type: "positive",
      label: "Utilización de crédito baja (30% o menos)",
      test: (t) => {
        const pct = extractUtilizationPct(t);
        return pct !== null && pct <= 30;
      },
    },
    {
      id: "long-history",
      type: "positive",
      label: "Historial de crédito de varios años",
      test: (t) => {
        const m = t.match(/(\d{1,2})\s*(años|years)\s*(de\s*)?(historial|history)/i);
        return !!(m && parseInt(m[1], 10) >= 5);
      },
    },
    {
      id: "mix",
      type: "positive",
      label: "Buena variedad de tipos de crédito",
      test: (t) => /revolving/i.test(t) && /installment/i.test(t),
    },
    {
      id: "no-derog",
      type: "positive",
      label: "No se detectaron marcas negativas obvias en el texto",
      test: (t, foundNegativeIds) => foundNegativeIds.length === 0,
    },
  ];

  function extractUtilizationPct(t) {
    const m =
      t.match(/(\d{1,3})\s?%\s*(de\s*)?(utilizaci[oó]n|utilization)/i) ||
      t.match(/(utilizaci[oó]n|utilization)[^\d]{0,12}(\d{1,3})\s?%/i);
    if (!m) return null;
    const raw = /^\d+$/.test(m[1]) ? m[1] : m[2];
    const pct = parseInt(raw, 10);
    return isNaN(pct) ? null : pct;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  /* ---------- estados de la UI ---------- */
  function resetUI() {
    currentFile = null;
    fileInput.value = "";
    uploadEmpty.hidden = false;
    fileReady.hidden = true;
    dropzone.classList.remove("has-file");
    analyzeBtn.hidden = true;
    progressBox.hidden = true;
    errorBox.hidden = true;
    resultsBox.hidden = true;
  }

  function showFileReady(file) {
    currentFile = file;
    const ext = file.name.split(".").pop().toUpperCase();
    fileType.textContent = ext.length <= 4 ? ext : "DOC";
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatSize(file.size);
    uploadEmpty.hidden = true;
    fileReady.hidden = false;
    dropzone.classList.add("has-file");
    analyzeBtn.hidden = false;
    errorBox.hidden = true;
    resultsBox.hidden = true;
  }

  function showError(msg) {
    progressBox.hidden = true;
    errorBox.hidden = false;
    errorMsg.textContent = msg;
  }

  /* ---------- extracción de texto por tipo de archivo ---------- */
  async function extractText(file) {
    const ext = file.name.split(".").pop().toLowerCase();

    if (ext === "pdf") {
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((it) => it.str).join(" ") + "\n";
      }
      return text;
    }

    if (ext === "docx") {
      const buf = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buf });
      return result.value || "";
    }

    if (ext === "xlsx" || ext === "xls" || ext === "csv") {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      let text = "";
      wb.SheetNames.forEach((name) => {
        const sheet = wb.Sheets[name];
        text += XLSX.utils.sheet_to_csv(sheet) + "\n";
      });
      return text;
    }

    throw new Error("Formato de archivo no compatible.");
  }

  function renderResults(text) {
    const negFound = [];
    const posFound = [];

    CHECKS.filter((c) => c.type === "negative").forEach((c) => {
      if (c.test(text)) negFound.push(c);
    });
    CHECKS.filter((c) => c.type === "positive").forEach((c) => {
      if (c.test(text, negFound)) posFound.push(c);
    });

    positivesList.innerHTML = posFound.length
      ? posFound.map((c) => `<li>${c.label}</li>`).join("")
      : "<li>No se detectaron señales positivas claras en el texto extraído.</li>";

    negativesList.innerHTML = negFound.length
      ? negFound.map((c) => `<li>${c.label}</li>`).join("")
      : "<li>No se detectaron señales negativas comunes en el texto extraído.</li>";

    strategyList.innerHTML = negFound.length
      ? negFound.map((c) => `<li><strong>${c.label}.</strong> ${c.strategy}</li>`).join("")
      : "<li>No se encontraron puntos que requieran una estrategia específica según este análisis. Sigue manteniendo pagos a tiempo y saldos bajos.</li>";

    healthBox.classList.remove("good", "warning", "critical");
    if (negFound.length === 0) {
      healthBox.classList.add("good");
      healthLabel.textContent = "Sin señales negativas detectadas";
    } else if (negFound.length <= 2) {
      healthBox.classList.add("warning");
      healthLabel.textContent = negFound.length + " punto(s) a mejorar";
    } else {
      healthBox.classList.add("critical");
      healthLabel.textContent = negFound.length + " puntos a mejorar";
    }

    resultsBox.hidden = false;
    resultsBox.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function runAnalysis() {
    if (!currentFile) return;

    if (currentFile.size > MAX_BYTES) {
      showError("El archivo pesa más de 15 MB. Intenta con un archivo más liviano.");
      return;
    }

    errorBox.hidden = true;
    resultsBox.hidden = true;
    progressBox.hidden = false;

    try {
      const text = await extractText(currentFile);
      progressBox.hidden = true;

      if (!text || text.trim().length < 20) {
        showError(
          "No se pudo extraer texto legible de este archivo (puede ser un PDF escaneado como imagen). Intenta con un archivo que tenga texto seleccionable."
        );
        return;
      }
      renderResults(text);
    } catch (err) {
      console.error(err);
      progressBox.hidden = true;
      showError("Verifica que sea un PDF, Word (.docx) o Excel (.xlsx/.csv) válido.");
    }
  }

  /* ---------- eventos ---------- */
  function openPicker() {
    fileInput.click();
  }

  dropzone.addEventListener("click", (e) => {
    if (e.target === changeBtn) return;
    if (!fileReady.hidden) return; // ya hay archivo, no reabrir al hacer clic en la zona
    openPicker();
  });
  dropzone.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && fileReady.hidden) {
      e.preventDefault();
      openPicker();
    }
  });
  selectBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openPicker();
  });
  changeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    resetUI();
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) showFileReady(fileInput.files[0]);
  });
  analyzeBtn.addEventListener("click", runAnalysis);

  ["dragenter", "dragover"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("is-dragging");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("is-dragging");
    })
  );
  dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    if (file) showFileReady(file);
  });

  resetUI();
})();
