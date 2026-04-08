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

## 2.1) Configurar autenticacion en Supabase

1. Ve a Authentication > Providers y habilita Email.
2. Crea usuarios desde Authentication > Users (Add user) o habilita signup segun tu flujo.
3. Usa esos usuarios para iniciar sesion en la pantalla de login de la app.
4. En Authentication > URL Configuration define:
   - Site URL: tu dominio de Vercel (ejemplo https://tu-app.vercel.app)
   - Redirect URLs: agrega https://tu-app.vercel.app/auth/reset-password

Sin esa configuracion el enlace del correo de recuperacion puede abrir una pagina vacia o ruta invalida.

## 3) Variables de entorno y llaves

Para este frontend solo necesitas variables publicas de Supabase:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

No uses la SERVICE_ROLE_KEY dentro de Vite/React porque quedaria expuesta en el cliente.

Si en el futuro agregas backend o Supabase Edge Functions, ahi si usa la llave secreta como variable privada del servidor.

Archivo de ejemplo unico: [.env.example](.env.example)

En este proyecto frontend solo debes cargar en Vercel:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

Las variables de servidor aparecen comentadas en [.env.example](.env.example) solo como referencia.

## 4) Flujo sin ejecutar local (solo GitHub + deploy)

1. Sube este proyecto a tu repo de GitHub.
2. Conecta el repo en Vercel o Netlify.
3. Configura en el panel de deploy estas variables:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
4. Lanza el deploy.
5. Prueba la app desde la URL de preview/produccion.

## 5) Rutas

- /pos: ventas con lector de codigo de barras y carrito AG Grid.
- /admin/inventory: inventario editable y alta de productos.
- /admin/movimientos: registro de compras de entrada (resumen/detalle).
- /admin/reports: ventas detalle por dia, semana, mes o anio.

## 6) Notas de seguridad

- Se habilita RLS para tablas principales.
- RPCs registrar_venta_con_detalles y registrar_movimiento_entrada manejan operaciones transaccionales.
- Ajusta politicas RLS por rol en ambientes productivos.
- Nunca subas archivos .env con llaves reales al repo.
- La app ahora exige inicio de sesion para usar los modulos.
