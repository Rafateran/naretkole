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
  SUPABASE_URL:      'https://ztyhebimsumxhzbhqdow.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_emzNfbWU_7EHk7XAU-6ZJQ_sqGKXhva',
  STORAGE_BUCKET:    'productos',
  // Correo que será administrador. Regístrate con este correo para
  // obtener el panel de administración.
  ADMIN_EMAIL:       'kattyoshum@gmail.com',
  // Pasarela de pago Gumroad (producto "paga lo que quieras")
  GUMROAD_URL:       'https://naretkole.gumroad.com/l/pedido',
  // Correo al que llegan los formularios (vía Netlify Forms)
  NOTIFY_EMAIL:      'Naretkole@gmail.com'
};
