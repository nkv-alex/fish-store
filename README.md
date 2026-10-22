# Pezcado

Tienda de ejemplo con Next.js, TypeScript, PostgreSQL, Prisma y Stripe Checkout en modo test.

El carrito tiene una página propia (`/cart`), se mantiene accesible desde la navegación y conserva sus artículos en el navegador al cambiar de página o iniciar sesión.

## Modelo de datos

El schema Prisma está en [prisma/schema.prisma](./prisma/schema.prisma). `Product` guarda precio en unidades menores (centavos) y moneda; `Order` conserva correo, total, estado y referencia única de Stripe. `OrderItem` registra cantidad y precio unitario al comprar para preservar el importe histórico. El checkout requiere una cuenta y asocia los pedidos con ella.

## Requisitos

- Node.js 22+
- Docker y Docker Compose
- Una cuenta de Stripe para pagos de prueba

## Desarrollo local

1. Instala dependencias y prepara variables:

   ```bash
   npm ci
   cp .env.example .env
   ```

2. Arranca PostgreSQL:

   ```bash
   docker compose up -d db
   ```

3. Aplica migraciones, carga el catálogo y arranca Next.js:

   ```bash
   npm run db:generate
   npm run db:deploy
   npm run db:seed
   npm run dev
   ```

La tienda estará en [http://localhost:3000](http://localhost:3000). `npm run dev` mantiene Next.js en primer plano: no cierres esa terminal si quieres que la app siga activa. Para dejarla ejecutándose en segundo plano y reiniciarla si el contenedor falla, usa Docker Compose:

```bash
openssl rand -base64 32
# Guarda el resultado como AUTH_SECRET en .env antes de iniciar Compose.
docker compose up -d db
docker compose run --rm migrate
docker compose up -d --build app nginx
docker compose ps
docker compose logs -f app
```

Nginx se ejecuta en su propio contenedor y reenvía las solicitudes a Next.js; la tienda sigue disponible en [http://localhost:3000](http://localhost:3000). El puerto de la app no se publica directamente en el host. Para detener los servicios, usa `docker compose down`. Para desarrollo local, `DATABASE_URL` y `DIRECT_URL` apuntan al PostgreSQL de Docker. En Neon, la app usa `DATABASE_URL` (conexión pooled) y Prisma CLI usa `DIRECT_URL` (conexión directa para migraciones); la selección del adaptador es automática por hostname.

### Autenticación

La ruta `/account` permite registrarse e iniciar sesión con correo y contraseña o con Google OAuth. Las contraseñas se guardan como hashes bcrypt (nunca reversiblemente cifradas ni en texto plano), y el formulario de registro pide confirmar la contraseña. Para Google, crea un OAuth client de tipo Web y configura `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET` y `NEXTAUTH_URL=https://fish-store-jet.vercel.app` como variables en Vercel. En Google Cloud Console → **APIs & Services** → **Credentials** → tu OAuth client → **Authorized redirect URIs**, añade `https://fish-store-jet.vercel.app/api/auth/callback/google`; para desarrollo local añade `http://localhost:3000/api/auth/callback/google`. La URI debe usar el mismo dominio que `NEXTAUTH_URL` y no lleva barra final. Genera el secreto con `openssl rand -base64 32`. El login por contraseña funciona aunque Google no esté configurado. Es necesario iniciar sesión o crear una cuenta para comprar; los pedidos quedan asociados a la cuenta y aparecen en `/orders`.

En `/account/settings` se puede actualizar el nombre, cambiar o añadir una contraseña y eliminar la cuenta. Al eliminarla, los pedidos se conservan por obligación operativa, se desvinculan de la cuenta y se anonimiza su correo. Cambiar la contraseña incrementa la versión de autenticación y revoca las sesiones existentes.

El panel `/admin/accounts` permite a administradores buscar y paginar cuentas, cambiar roles y desactivar/reactivar accesos. Los cambios revocan las sesiones de esa cuenta; no se permite modificar la cuenta propia ni quitar el acceso al último administrador activo. Las cuentas nuevas empiezan como usuarios normales. Para crear el primer administrador, registra primero esa cuenta en la tienda y, con `DATABASE_URL` apuntando a la base de producción, ejecuta una vez:

```bash
npm run db:promote-admin -- admin@example.com
```

El comando activa la cuenta existente, le concede rol de administrador e invalida sus sesiones para que vuelva a iniciar sesión. No permite crear cuentas ni asignar roles desde el registro público.

### Balanceadores y varias instancias

La aplicación no necesita sesiones sticky: las sesiones JWT se validan en cualquier instancia. Configura todas las instancias con el mismo `AUTH_SECRET`, el mismo `DATABASE_URL` y la misma `NEXTAUTH_URL` pública, por ejemplo `https://tienda.example.com`; configura también `NEXT_PUBLIC_APP_URL` con la URL pública para enlaces y redirecciones. `NEXTAUTH_URL_INTERNAL` puede apuntar al servicio interno al que el proxy enruta (en Compose, `http://app:3000`). La URL pública debe usar HTTPS detrás de un balanceador TLS.

Configura el proxy (Nginx, ALB, Cloudflare u otro) para reenviar `Host`, `X-Forwarded-Host` y `X-Forwarded-Proto`, conservar las cookies y dirigir tráfico a instancias sanas. Usa `GET /api/health/live` para comprobar que el proceso responde y `GET /api/health/ready` para comprobar que también puede consultar la base de datos; el readiness responde `503` si la base de datos no está disponible. No expongas las instancias directamente a Internet.

Todas las instancias deben compartir una única base de datos PostgreSQL y ejecutar el mismo artefacto Docker construido una sola vez. Ejecuta `npm run db:deploy` **una sola vez por despliegue**, antes de activar la nueva versión, y no simultáneamente desde cada instancia. En Compose, el servicio de mantenimiento permite hacerlo con `docker compose run --rm migrate`; después, despliega esa imagen en los hosts o réplicas administrados por tu orquestador. El servicio Compose incluido publica un único puerto local y es para desarrollo/una instancia; para múltiples réplicas, configura el puerto y health check del servicio en tu orquestador o en cada host detrás del balanceador. La CI publica una imagen con un `deploymentId` derivado del commit para manejar la navegación durante despliegues graduales. Ajusta `DATABASE_POOL_MAX` según el máximo de conexiones admitido por la base: el valor limita el pool de cada proceso PostgreSQL (1–100, predeterminado 1), así que el total aproximado es el valor multiplicado por el número de instancias. Para Neon, administra el pool a través de su URL pooled. La app no usa ISR ni invalidación de caché; si se incorporan esas funciones, configura un backend de caché compartido entre instancias.

Las páginas informativas están disponibles en `/privacy`, `/cookies` y `/terms`. La autenticación utiliza las cookies técnicas de sesión de NextAuth; el panel de consentimiento permite aceptar solo las necesarias o activar las métricas propias. Las métricas opcionales guardan únicamente totales diarios por página, sin IP, identificador de visitante o datos de cuenta. Sus textos legales son un borrador basado en las funciones actuales. Antes de publicar o aceptar ventas, completa y verifica la identidad legal y contacto del titular, los territorios de venta y las condiciones de envío, desistimiento, devoluciones y reembolsos con asesoramiento adecuado.

### Idiomas y asistente de chat

La tienda ofrece español (predeterminado), inglés, francés y alemán. La preferencia se guarda en la cookie `fish-store-locale`. El botón flotante usa el Perplexity Router API mediante el SDK oficial de OpenAI Chat Completions. Configura `PERPLEXITY_API_KEY` y `PERPLEXITY_ROUTER_MODEL` como variables de entorno del servidor (por ejemplo, en `.env` local o en las variables del servicio de producción). La clave nunca debe llevar el prefijo `NEXT_PUBLIC_` ni incluirse en el navegador.

La documentación de Perplexity indica que Router está en *private preview*; si la consulta autenticada del catálogo responde `403`, solicita acceso a `api@perplexity.ai` antes de configurar el modelo.

El modelo debe ser un ID `creator/model-name` obtenido del catálogo de Router consultado con **la misma clave** usada en producción: ese listado depende del tier de uso de la organización y es la allowlist de modelos para esa clave. Para consultar el catálogo sin guardar la respuesta en archivos:

```bash
test -n "$PERPLEXITY_API_KEY" || { echo "Exporta PERPLEXITY_API_KEY primero"; exit 1; }
curl --fail-with-body --silent --show-error \
  https://api.perplexity.ai/router/v1/models \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY"
```

Copia un ID devuelto por esa consulta en `PERPLEXITY_ROUTER_MODEL`. No uses un slug de ejemplo ni selecciones un modelo solo porque aparezca en documentación pública: un ID no incluido en el catálogo de tu clave da `400`, y un modelo no habilitado para el tier da `402`. Cambiar de proveedor/modelo consiste en cambiar esa variable, sin cambiar el código. Para habilitar el asistente en una sesión local:

```bash
export PERPLEXITY_API_KEY="..." # créala en https://console.perplexity.ai y no la compartas
export PERPLEXITY_ROUTER_MODEL="<id copiado del catálogo autenticado>"
npm run dev
```

Con el servidor local en marcha, puedes probar el chat desde tu terminal (la clave sigue solo en el servidor):

```bash
curl --fail-with-body --silent --show-error \
  http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"locale":"en","messages":[{"role":"user","content":"Where can I see my orders?"}]}'
```

El servidor limita el tamaño de la conversación y el tiempo por solicitud. El SDK reintenta errores transitorios respetando `Retry-After`; si el Router sigue sobrecargado, la API de la tienda devuelve `429` y conserva ese encabezado. Las llamadas pueden generar cargos según modelo/tokens: configura límites de gasto en Perplexity. La aplicación no incluye rate limiting compartido entre instancias; para un despliegue público, limita la frecuencia en el proxy/API gateway o añade un limitador distribuido.

### Conectar Neon con Vercel

1. En Vercel, abre el proyecto y ve a **Storage** → **Create Database** → **Neon Postgres**. Crea la base y conéctala a `fish-store` al menos para **Production** (y Preview si vas a usar esas vistas previas).
2. En Neon, abre **Connect** y copia las dos cadenas de la misma rama/base/rol. Usa la cadena **pooled** como `DATABASE_URL` y la cadena **direct** (sin `-pooler` en el host) como `DIRECT_URL`. Guárdalas en Vercel → **Settings** → **Environment Variables** para Production (y Preview si corresponde). No pongas las cadenas en el código ni las compartas públicamente.
3. Para crear el esquema y los productos iniciales, configura ambas variables en tu `.env` local (no sobrescribas las claves Stripe) y ejecuta:

   ```bash
   npm run db:deploy
   npm run db:seed
   ```

La migración `20261018162600_admin_accounts` añade a `User` el enum `role` (por defecto `USER`), el campo `isActive` (por defecto `true`) y un índice para filtrar cuentas; las cuentas existentes mantienen el acceso como usuarios normales. En Neon, aplica el cambio usando `DIRECT_URL` y `npm run db:deploy`, o deja que el Build Command de Vercel use el script `vercel-build`: en producción ejecuta `prisma migrate deploy` con `DIRECT_URL` y después el seed idempotente. No ejecutes la misma migración simultáneamente desde varias instancias. Una vez desplegado el esquema y creado el usuario desde la web, promuévelo con el comando anterior y con `DATABASE_URL` configurada para esa misma base de Neon.

4. Deja el Build Command de Vercel en su valor predeterminado para que detecte `vercel-build`. Las previews no escriben en la base de producción. Redeploya la aplicación. Comprueba `https://fish-store-jet.vercel.app/api/products`: debería responder con el catálogo en JSON.

Vercel/Neon no puede crear la base por el mero hecho de conocer la URL de la web; el paso de **Storage** requiere que inicies sesión y autorices la integración en tu cuenta. Si la integración completa ya añadió `DATABASE_URL`, añade manualmente `DIRECT_URL` desde Neon para que las migraciones usen una conexión directa.

Después de añadir o cambiar modelos Prisma, crea la migración en desarrollo con `npm run db:migrate -- --name nombre_del_cambio` y aplícala en producción antes de desplegar la nueva versión. El seed actualiza el catálogo de demostración de forma idempotente y desactiva los productos de ejemplo anteriores sin borrar productos ni pedidos.

El formulario crea una sesión de Stripe Checkout; el cliente no envía precios y el total se calcula con datos de la base de datos. Usa las claves `sk_test_...` y `whsec_...` de Stripe; esta demo rechaza claves Stripe live. Para probar el webhook localmente, ejecuta `stripe listen --forward-to localhost:3000/api/webhooks/stripe` y copia el secreto que Stripe CLI imprime a `STRIPE_WEBHOOK_SECRET`. El pedido solo se marca como pagado tras validar el pago completado.

Al cambiar `prisma/schema.prisma`, genera una migración con `npm run db:migrate -- --name nombre_del_cambio`; aplica las migraciones pendientes localmente con `npm run db:deploy`.

Para levantar app y base de datos en contenedores por primera vez:

```bash
docker compose up -d db
docker compose run --rm migrate
docker compose up -d --build app nginx
```

Compose reinicia los servicios si se detienen inesperadamente y comprueba la disponibilidad de la app con `/api/health/ready` antes de iniciar Nginx. Sigue la salida de la app con `docker compose logs -f app` o la de Nginx con `docker compose logs -f nginx`. Ejecuta el seed una vez después de que el servicio esté listo con `docker compose exec app npm run db:seed`. Nginx publica el puerto 3000 del host; para TLS en producción, termina HTTPS en un balanceador o proxy con certificados y configura allí la URL pública de la app.

## Pruebas y CI

```bash
npm test
npm run typecheck
npx playwright install chromium
npm run test:e2e
```

Vitest comprueba utilidades de carrito y rutas API, incluidas las métricas anónimas con consentimiento y la validación de la API de chat sin llamadas reales a Perplexity. Playwright comprueba la presentación de productos sin recortar, la confirmación de contraseña, las páginas legales y las preferencias de cookies. También realiza el checkout real con tarjeta de prueba si `STRIPE_SECRET_KEY` y una base PostgreSQL con migraciones y seed están configurados. Para habilitar ese flujo de pago en GitHub Actions, configura el secreto `STRIPE_TEST_SECRET_KEY`; las demás pruebas de navegador se ejecutan aunque no esté configurado. La CI ejecuta typecheck, tests unitarios, pruebas de navegador, build, `npm audit` (bloquea vulnerabilidades altas o críticas), análisis CodeQL con consultas ampliadas y revisión de nuevas dependencias en PR. Al hacer push a `main`, construye y publica la imagen en GitHub Container Registry si pasan los jobs requeridos.

Tarjeta de prueba Stripe: `4242 4242 4242 4242`, cualquier fecha futura y CVC de tres dígitos.

## Despliegue en AWS

El workflow publica `ghcr.io/<owner>/<repo>:latest`. Para AWS, usa ECS/ECS Express Mode y publica la imagen en ECR mediante una integración OIDC de GitHub Actions; App Runner solo está disponible para clientes actuales y no es la ruta recomendada para cuentas nuevas. Para un entorno real, provisiona PostgreSQL administrado, configura `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y `NEXT_PUBLIC_APP_URL` como secretos/variables del servicio y configura el webhook HTTPS de Stripe. No uses claves de prueba en producción. El despliegue cloud requiere cuenta, permisos y secretos de AWS y se configura cuando estén disponibles.
