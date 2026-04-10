# InvFac POS (React + Supabase)

Aplicacion PWA mobile-first para POS con modulos de inventario, movimientos de entrada, ventas y reportes de ventas detalle.

## 1) Requisitos

- Proyecto en Supabase
- Repositorio en GitHub
- Plataforma de deploy (Vercel o Netlify)

## 2) Configurar base de datos

1. Abre SQL Editor en Supabase.
2. Ejecuta el script de [supabase/schema.sql](supabase/schema.sql).
3. Para forzar acceso solo con login (sin publico), ejecuta [supabase/fix_rls_require_auth.sql](supabase/fix_rls_require_auth.sql).
