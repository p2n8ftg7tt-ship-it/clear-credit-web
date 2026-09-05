/* =========================================================
   Cuentas de cliente — Themora
   Usa Supabase (https://supabase.com) para manejar registro,
   inicio de sesión y guardado de resultados por usuario.

   ANTES DE USAR:
   1) Crea un proyecto gratuito en supabase.com
   2) Corre el archivo supabase-schema.sql en el "SQL Editor" del proyecto
   3) Copia tu "Project URL" y tu llave "anon public"
      (Settings → API) y pégalas abajo, en SUPABASE_URL y SUPABASE_ANON_KEY
   Ver INSTRUCCIONES-CUENTAS.md para el paso a paso completo.
   ========================================================= */
(function () {
  "use strict";

  const SUPABASE_URL = "https://udjunkorcmmyndisscfa.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_v-1sh_rgLyOU8GrZPXbB1g_XoLlYWG5";

  const notConfigured = SUPABASE_URL.indexOf("TU-PROYECTO") !== -1;

  if (!window.supabase || !window.supabase.createClient) {
    console.warn(
      "[Themora] No se encontró la librería de Supabase. Agrega el <script> de supabase-js antes de auth.js."
    );
    return;
  }

  if (notConfigured) {
    console.warn(
      "[Themora] Todavía no configuraste SUPABASE_URL / SUPABASE_ANON_KEY en auth.js. El login no funcionará hasta que lo hagas."
    );
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Prueba gratis: días desde que se creó la cuenta durante los cuales puede
  // generar cartas (validación de deuda, disputa, corrección de identidad)
  // sin tener un plan de pago activo. Se calcula con la fecha de creación de
  // la cuenta (`created_at`, la pone Supabase — el cliente no puede
  // cambiarla), así que no requiere ninguna tabla ni acción manual tuya.
  const TRIAL_DAYS = 7;

  let currentUser = null;
  let currentSession = null;
  let ready = false;
  const listeners = [];
  const recoveryListeners = [];

  // Días de prueba gratis que le quedan a la cuenta (0 si ya expiró, no hay
  // sesión, o la fecha de creación no se pudo leer).
  function trialDaysLeft() {
    if (!currentUser || !currentUser.created_at) return 0;
    const createdAt = new Date(currentUser.created_at).getTime();
    if (Number.isNaN(createdAt)) return 0;
    const elapsedDays = (Date.now() - createdAt) / (24 * 60 * 60 * 1000);
    const remaining = Math.ceil(TRIAL_DAYS - elapsedDays);
    return remaining > 0 ? remaining : 0;
  }

  function notify() {
    listeners.forEach((fn) => {
      try {
        fn(currentUser, ready);
      } catch (err) {
        console.error(err);
      }
    });
  }

  function updateNavLink() {
    const link = document.getElementById("navAuthLink");
    if (!link) return;
    if (currentUser) {
      link.textContent = "Mi cuenta";
      link.href = "cuenta.html";
      link.classList.add("is-logged-in");
    } else {
      link.textContent = "Iniciar sesión";
      link.href = "login.html";
      link.classList.remove("is-logged-in");
    }
  }

  const CCAuth = {
    isConfigured: !notConfigured,
    client: client,

    onChange(fn) {
      listeners.push(fn);
      fn(currentUser, ready);
    },

    // Avisa cuando alguien llega desde el enlace de "restablecer contraseña"
    // de su correo (evento PASSWORD_RECOVERY de Supabase). Se llama ANTES que
    // los listeners de onChange, para que la página pueda mostrar el
    // formulario de nueva contraseña en vez de redirigir de una vez como si
    // fuera un inicio de sesión normal.
    onPasswordRecovery(fn) {
      recoveryListeners.push(fn);
    },

    getUser() {
      return currentUser;
    },

    // Plan de pago del cliente ('basico' | 'estandar' | 'premium' | null si no tiene ninguno).
    // Se guarda en app_metadata (NO en user_metadata) para que el propio cliente no pueda
    // otorgárselo desde el navegador — solo tú puedes cambiarlo, desde el SQL Editor de
    // Supabase. Ver INSTRUCCIONES-PLANES.md para el paso a paso de cómo activar un plan.
    getPlan() {
      return currentUser && currentUser.app_metadata && currentUser.app_metadata.plan
        ? currentUser.app_metadata.plan
        : null;
    },

    // Días de prueba gratis restantes (0 si ya no tiene, o nunca inició sesión).
    getTrialDaysLeft() {
      return trialDaysLeft();
    },

    // true si la cuenta todavía está dentro de su ventana de prueba gratis
    // de 7 días desde que se creó — sin importar si además tiene un plan.
    isInTrial() {
      return trialDaysLeft() > 0;
    },

    // Token de sesión para llamar funciones protegidas (ej. netlify/functions/coach.js)
    getAccessToken() {
      return currentSession ? currentSession.access_token : null;
    },

    async signUp(email, password) {
      // Le decimos a Supabase a dónde mandar al cliente cuando haga clic en el
      // enlace de confirmación del correo — sin esto, Supabase usa el "Site URL"
      // que tengas configurado en su panel (Authentication → URL Configuration),
      // que por defecto NO apunta a tu sitio real. Ver INSTRUCCIONES-CUENTAS.md,
      // Paso 5, para el paso de configuración que falta del lado de Supabase.
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + window.location.pathname.replace(/[^/]+$/, "cuenta.html"),
        },
      });
      if (error) throw error;
      return data;
    },

    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },

    // Inicia sesión (o crea la cuenta automáticamente si es la primera vez) con un proveedor
    // externo: 'google', 'apple' o 'azure' (Microsoft). Esto redirige al navegador fuera del sitio
    // hacia la pantalla de acceso de ese proveedor, así que no hay nada que "devolver" — si algo
    // falla antes de redirigir (por ejemplo, el proveedor no está activado en Supabase todavía),
    // lanza un error para que la página lo muestre. Requiere configurar cada proveedor en
    // Supabase → Authentication → Providers. Ver INSTRUCCIONES-LOGIN-SOCIAL.md.
    async signInWithProvider(provider) {
      const { error } = await client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + window.location.pathname.replace(/[^/]+$/, "cuenta.html"),
        },
      });
      if (error) throw error;
    },

    // Envía un código de 6 dígitos por SMS al número dado (formato internacional, ej. +13055551234).
    // Si el número no tiene cuenta todavía, Supabase la crea automáticamente al verificar el código
    // — un mismo flujo sirve para iniciar sesión y para crear cuenta nueva. Requiere activar un
    // proveedor de SMS en Supabase (tiene costo por mensaje). Ver INSTRUCCIONES-LOGIN-SOCIAL.md.
    async signInWithPhone(phone) {
      const { error } = await client.auth.signInWithOtp({ phone });
      if (error) throw error;
    },

    // Verifica el código de 6 dígitos que la persona recibió por SMS y completa el inicio de sesión.
    async verifyPhoneCode(phone, code) {
      const { data, error } = await client.auth.verifyOtp({ phone, token: code, type: "sms" });
      if (error) throw error;
      return data;
    },

    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },

    async resetPassword(email) {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname.replace(/[^/]+$/, "login.html"),
      });
      if (error) throw error;
    },

    // Guarda un resumen del analizador de reporte de crédito (credito.html)
    async saveAnalysis(summary) {
      if (!currentUser) throw new Error("Debes iniciar sesión para guardar tu resultado.");
      const { error } = await client.from("analisis_credito").insert({
        user_id: currentUser.id,
        salud: summary.health || null,
        tono: summary.tone || null,
        puntaje: summary.score != null ? summary.score : null,
        utilizacion: summary.utilization != null ? summary.utilization : null,
        negativos: summary.negatives ? summary.negatives.length : null,
        positivos: summary.positives ? summary.positives.length : null,
        conclusion: summary.conclusion || null,
        resumen_json: summary,
      });
      if (error) throw error;
    },

    // Guarda un resumen de la calculadora hipotecaria (herramientas.html)
    async saveMortgage(calc) {
      if (!currentUser) throw new Error("Debes iniciar sesión para guardar tu cálculo.");
      const { error } = await client.from("calculos_hipoteca").insert({
        user_id: currentUser.id,
        precio: calc.price != null ? calc.price : null,
        pronto_pct: calc.downPercent != null ? calc.downPercent : null,
        tasa: calc.rate != null ? calc.rate : null,
        plazo: calc.years != null ? calc.years : null,
        pago_mensual: calc.totalMonthly != null ? calc.totalMonthly : null,
        monto_financiado: calc.loan != null ? calc.loan : null,
      });
      if (error) throw error;
    },

    async listAnalyses() {
      if (!currentUser) return [];
      const { data, error } = await client
        .from("analisis_credito")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async listMortgages() {
      if (!currentUser) return [];
      const { data, error } = await client
        .from("calculos_hipoteca")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async deleteRecord(table, id) {
      const { error } = await client.from(table).delete().eq("id", id);
      if (error) throw error;
    },

    // ---- Configuración de la cuenta (página cuenta.html) ----

    // Cambia el nombre para mostrar (se guarda en user_metadata, no afecta el login).
    async updateName(name) {
      const { data, error } = await client.auth.updateUser({ data: { full_name: name } });
      if (error) throw error;
      return data;
    },

    // Cambia el correo. Supabase manda un enlace de confirmación al correo NUEVO
    // (y a veces también al anterior) antes de completar el cambio.
    async updateEmail(email) {
      const { data, error } = await client.auth.updateUser({ email: email });
      if (error) throw error;
      return data;
    },

    // Cambia la contraseña de la sesión activa.
    async updatePassword(password) {
      const { data, error } = await client.auth.updateUser({ password: password });
      if (error) throw error;
      return data;
    },

    // Preferencias de notificación. Todavía no enviamos correos/SMS automáticos —
    // esto solo guarda lo que la persona prefiere para cuando esa función se active.
    async getPreferences() {
      if (!currentUser) return { alertas_correo: true, alertas_sms: false, resumen_semanal: true };
      const { data, error } = await client
        .from("preferencias_usuario")
        .select("*")
        .eq("user_id", currentUser.id)
        .maybeSingle();
      if (error) throw error;
      return data || { alertas_correo: true, alertas_sms: false, resumen_semanal: true };
    },

    async savePreferences(prefs) {
      if (!currentUser) throw new Error("Debes iniciar sesión.");
      const { error } = await client.from("preferencias_usuario").upsert({
        user_id: currentUser.id,
        alertas_correo: !!prefs.alertas_correo,
        alertas_sms: !!prefs.alertas_sms,
        resumen_semanal: !!prefs.resumen_semanal,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },

    // Borra todo lo que el cliente guardó (análisis, cálculos y preferencias).
    // No elimina la cuenta de acceso en sí (eso requiere confirmación manual del equipo).
    async deleteAllMyData() {
      if (!currentUser) throw new Error("Debes iniciar sesión.");
      const uid = currentUser.id;
      const results = await Promise.allSettled([
        client.from("analisis_credito").delete().eq("user_id", uid),
        client.from("calculos_hipoteca").delete().eq("user_id", uid),
        client.from("preferencias_usuario").delete().eq("user_id", uid),
      ]);
      const failed = results.find((r) => r.status === "rejected" || (r.value && r.value.error));
      if (failed) throw (failed.reason || (failed.value && failed.value.error));
    },
  };

  CCAuth.onChange(updateNavLink);
  window.CCAuth = CCAuth;

  client.auth.getSession().then(({ data }) => {
    currentSession = data && data.session ? data.session : null;
    currentUser = currentSession ? currentSession.user : null;
    ready = true;
    notify();
  });

  client.auth.onAuthStateChange((event, session) => {
    // Si viene del enlace de "restablecer contraseña", avisa primero a los
    // listeners dedicados (onPasswordRecovery) — así la página puede
    // prepararse (mostrar el formulario de nueva contraseña) antes de que
    // los listeners normales de onChange vean la sesión y redirijan.
    if (event === "PASSWORD_RECOVERY") {
      recoveryListeners.forEach((fn) => {
        try {
          fn(session ? session.user : null);
        } catch (err) {
          console.error(err);
        }
      });
    }
    currentSession = session || null;
    currentUser = session ? session.user : null;
    ready = true;
    notify();
  });
})();
