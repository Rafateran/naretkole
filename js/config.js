/* NARETKOLE — Configuración de Supabase
   ------------------------------------------------------------------
   Pega aquí las 2 claves de tu proyecto Supabase.
   Están en: Supabase → tu proyecto → Project Settings → API
     • Project URL      →  SUPABASE_URL
     • Project API keys → "anon public"  →  SUPABASE_ANON_KEY
   La anon key es pública y segura para el frontend (la seguridad
   real la dan las políticas RLS del archivo supabase-setup.sql).

   Mientras estas claves sigan con el texto "PEGA_...", el sitio
   funciona en MODO DEMO (datos en el navegador). En cuanto pegues
   claves válidas, pasa automáticamente a MODO REAL (compartido).
   ------------------------------------------------------------------ */
window.NK_CONFIG = {
  SUPABASE_URL:      'PEGA_TU_PROJECT_URL_AQUI',
  SUPABASE_ANON_KEY: 'PEGA_TU_ANON_KEY_AQUI',
  STORAGE_BUCKET:    'productos',
  // Correo que será administrador. Regístrate con este correo para
  // obtener el panel de administración.
  ADMIN_EMAIL:       'kattyoshum@gmail.com'
};
