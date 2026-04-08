# InvFac POS (React + Supabase)

Aplicacion PWA mobile-first para POS con modulos de inventario, movimientos de entrada, ventas y reportes de ventas detalle.

## 1) Requisitos

- Proyecto en Supabase
- Repositorio en GitHub
- Plataforma de deploy (Vercel o Netlify)

## 2) Configurar base de datos

1. Abre SQL Editor en Supabase.
2. Ejecuta el script de [supabase/schema.sql](supabase/schema.sql).

## 3) Variables de entorno y llaves

Para este frontend solo necesitas variables publicas de Supabase:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

No uses la SERVICE_ROLE_KEY dentro de Vite/React porque quedaria expuesta en el cliente.

Si en el futuro agregas backend o Supabase Edge Functions, ahi si usa la llave secreta como variable privada del servidor.

Archivo de ejemplo para frontend: [.env.example](.env.example)

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
