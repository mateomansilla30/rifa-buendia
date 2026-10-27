# Rifa Buendía

Web app para administrar la rifa: tablero de números, carga de ventas desde el celular, resumen de cobros, sorteo, importar/exportar Excel y la **imagen de números disponibles** para mandar por WhatsApp.

Un solo contenedor: Next.js 15 + SQLite (better-sqlite3). Sin servicios externos.

## Deploy en Easypanel

1. **Subí el código a GitHub** (repo privado está bien).
2. En Easypanel: **Create Project** → ponele un nombre (ej. `rifa`).
3. Dentro del proyecto: **+ Service → App**.
4. **Source → GitHub**: elegí el repo y la rama (`main`). **Build → Dockerfile** (ruta `Dockerfile`).
5. **Mounts → Add Volume**: nombre `rifa-data`, mount path **`/data`**.
   Ahí viven la base (`/data/rifa.db`) y las fotos (`/data/uploads`). Usá tipo *Volume* (no *Bind*): el contenedor corre como usuario no root (uid 1000) y el volumen hereda los permisos de la imagen.
6. **Environment**: pegá esto y cambiá los valores:
   ```
   ADMIN_USER=admin
   ADMIN_PASSWORD=una-clave-larga-de-verdad
   SESSION_SECRET=64-caracteres-al-azar
   DATABASE_PATH=/data/rifa.db
   TZ=America/Buenos_Aires
   PORT=3000
   ```
   Para generar el secreto: `openssl rand -hex 32`.
   `ADMIN_USER` / `ADMIN_PASSWORD` se usan **solo en el primer arranque** (cuando la base está vacía). Después la contraseña se cambia desde *Ajustes*.
7. **Domains**: agregá tu dominio (o el subdominio que te da Easypanel), **puerto 3000**, con HTTPS activado.
8. **Deploy**. El healthcheck es `GET /api/health`. Las migraciones corren solas al arrancar.

Para actualizar: push a GitHub → *Deploy* (o activá auto-deploy). Los datos quedan en el volumen.

## Front en Vercel (opcional)

El mismo repo se puede deployar en Vercel como **solo front**: la base y la API siguen en el VPS y Vercel reenvía todo `/api/*` al VPS. Para el navegador es un solo dominio, así que la cookie de sesión funciona sin CORS.

1. Deployá el backend en Easypanel como arriba, con su dominio HTTPS (ej. `https://rifa-api.tudominio.com`).
2. En Vercel: **Add New → Project** → importá el repo (framework Next.js, sin tocar los comandos de build).
3. **Environment Variables**: solo una:
   ```
   BACKEND_URL=https://rifa-api.tudominio.com
   ```
   Se lee **al compilar**: si la cambiás, hacé *Redeploy*. En Vercel no van `DATABASE_PATH`, `ADMIN_*` ni `SESSION_SECRET` (los usa el VPS).
4. Deploy. Los vendedores usan el dominio de Vercel; el del VPS sigue andando igual.

Sin `BACKEND_URL` la app es la completa (front + API + base), que es lo que corre en el VPS.

## Me olvidé la clave del admin

`ADMIN_USER` / `ADMIN_PASSWORD` solo crean el admin en el primer arranque. Para resetearla sin perder datos:

1. En Environment poné `ADMIN_USER`, el `ADMIN_PASSWORD` nuevo y `RESET_ADMIN_PASSWORD=1`. Sin comillas.
2. Deploy y entrá con esa clave.
3. Sacá `RESET_ADMIN_PASSWORD` y volvé a deployar (si queda, en cada arranque vuelve a pisar la clave que cambies desde Ajustes).

## Primer uso

1. Entrá con el admin.
2. *Ajustes → Rifa*: completá fecha del sorteo, alias de Mercado Pago y (opcional) la foto del premio. La rifa de Buendía ya viene creada con 150 números a $3.000.
3. *Ajustes → Vendedores*: creá a Fede, Mateo y los demás con usuario + PIN.
4. Si ya tenían ventas: *Ajustes → Importar* con el Excel (hoja "Ventas", encabezados en fila 4, columnas A–G). Muestra una vista previa con errores antes de confirmar.
5. En el celu: abrir la página → menú del navegador → *Agregar a la pantalla principal* (queda como app).

## Quién puede hacer qué

| | Vendedor | Admin |
|---|---|---|
| Cargar, editar, marcar pagado y liberar números | ✔ | ✔ |
| Generar y compartir la imagen, ver resumen | ✔ | ✔ |
| Configurar rifa, vendedores, importar/exportar, backup, sorteo, registro completo | | ✔ |

## Backups

*Ajustes → Descargar backup de la base* baja un `.db` (SQLite) con todo. Para restaurarlo: pará el servicio, reemplazá `/data/rifa.db` en el volumen por el backup (y borrá `rifa.db-wal` / `rifa.db-shm` si existen) y volvé a arrancar.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # y poné DATABASE_PATH=./data/rifa.db, SEED_DEMO=1
npm run dev
npm test                     # vitest
```

`SEED_DEMO=1` carga vendedores de prueba (fede/1111, mateo/2222, sofi/3333) y ~60 ventas, solo si la rifa activa no tiene ventas. No lo actives en producción.

Probar el contenedor local:

```bash
docker build -t rifa .
docker run -p 3000:3000 -v rifa-data:/data \
  -e ADMIN_PASSWORD=clave123456 -e SESSION_SECRET=$(openssl rand -hex 32) \
  -e INSECURE_COOKIES=1 rifa
```

(`INSECURE_COOKIES=1` solo para probar por `http://localhost`; en Easypanel con HTTPS no va.)
