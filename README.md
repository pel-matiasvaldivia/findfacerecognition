# FindFace Recognition — Control de Acceso Facial

Aplicación web de control de acceso por reconocimiento facial. Actúa como capa de
orquestación sobre **NTechLab FindFace Multi**: captura un rostro desde la webcam,
hace una prueba de vida (liveness), busca 1:N contra los rostros enrolados y, ante
un match, abre una puerta publicando un comando por MQTT. Todos los servicios de
soporte (autenticación, base de datos y almacenamiento) corren **dentro del stack**,
sin depender de terceros como Supabase.

## Arquitectura

```
[React + react-webcam]  ──HTTPS──▶  [Backend Express :4000]
        (nginx :3300)                     │
                                          ├──▶ NTechLab FindFace Multi (detect / search 1:N / verify / cards)
                                          ├──▶ PostgreSQL           (tabla access_logs)
                                          ├──▶ Filesystem /uploads  (fotos de accesos, servidas por el backend)
                                          └──▶ Mosquitto MQTT :1883 → tópico access/door → cerradura
```

| Servicio | Tecnología | Rol |
|---|---|---|
| **frontend** | React (CRA) + `react-webcam`, servido por Nginx | Captura de cámara, retos de liveness, login con Google |
| **backend** | Node.js + Express | Orquesta NTech, auth, base de datos, storage y MQTT |
| **postgres** | PostgreSQL 16 | Tabla `access_logs` |
| **mqtt** | Eclipse Mosquitto 2.0 | Bus para el comando de apertura de puerta |

## Autenticación (self-hosted)

El login usa **Google Identity Services** en el frontend, pero **la sesión vive en
tu backend**, sin servicios de auth de terceros:

1. El usuario inicia sesión con Google → el navegador recibe un **ID token** de Google.
2. El frontend lo envía a `POST /api/auth/google`.
3. El backend verifica el ID token con `google-auth-library`, comprueba que el email
   esté en la **allowlist** (`ALLOWED_EMAILS` / `ALLOWED_DOMAINS`) y emite un **JWT propio**
   firmado con `JWT_SECRET`.
4. El frontend guarda ese JWT y lo envía como `Authorization: Bearer <token>` en cada request.
5. Todas las rutas bajo `/api` (excepto `/api/auth/*`) requieren ese JWT.

## Endpoints principales (`/api`)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/google` | Canjea el ID token de Google por un JWT de sesión |
| GET | `/api/auth/me` | Devuelve el usuario de la sesión actual |
| POST | `/api/search` | Sube foto, detecta, liveness, búsqueda 1:N, abre puerta si hay match, registra log |
| POST | `/api/enroll` | Da de alta un rostro (card) en FindFace con su foto |
| POST | `/api/verify` | Comparación 1:1 entre dos fotos |
| POST | `/api/door/open` | Apertura manual de la puerta |
| GET | `/health` · `/health/diagnostics` | Healthcheck y diagnóstico |

## Configuración

Copiá `env.example` a `.env` y completá:

```env
# Auth
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
JWT_SECRET=<string random largo>
ALLOWED_EMAILS=vos@dominio.com,otro@dominio.com
# ALLOWED_DOMAINS=dominio.com        # opcional (Google Workspace)

# Base de datos
POSTGRES_USER=faceid
POSTGRES_PASSWORD=<password fuerte>
POSTGRES_DB=faceid

# Storage / URL pública del backend
PUBLIC_BASE_URL=https://back.faceid.alertasenlinea.com.ar

# NTechLab
NTECH_API_URL=https://videoia.alertasenlinea.com.ar
NTECH_API_KEY=<tu api key>

# MQTT
MQTT_USERNAME=backend
MQTT_PASSWORD=<password fuerte>
```

### Google Cloud Console

Creá un **OAuth 2.0 Client ID** (tipo *Web application*) y agregá el origen del frontend
en **Authorized JavaScript origins**, por ejemplo `https://app.faceid.alertasenlinea.com.ar`.
Con este flujo no hace falta client secret ni redirect URI. Usá ese Client ID tanto en
`GOOGLE_CLIENT_ID` (backend) como en `REACT_APP_GOOGLE_CLIENT_ID` (build del frontend).

## Levantar la aplicación

```bash
cp env.example .env    # y completá los valores
docker-compose up -d
docker-compose logs -f
```

La tabla `access_logs` se crea automáticamente al arrancar el backend. Las fotos de
accesos se guardan en el volumen `./backend/uploads` y se sirven en
`${PUBLIC_BASE_URL}/uploads/...`.

## Build y despliegue (CI/CD)

GitHub Actions construye y publica las imágenes a GHCR en cada push (ver
[`CI-CD-README.md`](CI-CD-README.md)). Como Create React App **inyecta las variables
`REACT_APP_*` en tiempo de build**, el frontend se parametriza con *build args* que el
workflow toma de **Repository Variables** (Settings → Secrets and variables → Actions → Variables):

- `REACT_APP_GOOGLE_CLIENT_ID`
- `REACT_APP_API_URL` (opcional; default `https://back.faceid.alertasenlinea.com.ar/api`)

En el server: `docker-compose pull && docker-compose up -d`.

## Notas de seguridad

- Nunca commitees `.env` (está en `.gitignore`). Rotá cualquier credencial que haya
  quedado expuesta en el historial.
- El broker MQTT requiere autenticación (`allow_anonymous false`); las credenciales se
  aprovisionan desde `MQTT_USERNAME`/`MQTT_PASSWORD`.
- Sin allowlist configurada (`ALLOWED_EMAILS`/`ALLOWED_DOMAINS`), el login **rechaza a todos**
  (fail-closed).
