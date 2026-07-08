# 🚀 Inicio Rápido — FindFace Recognition

Aplicación de control de acceso facial sobre **NTechLab FindFace Multi**, con
autenticación, base de datos y almacenamiento **dentro del stack** (sin Supabase).

Para la documentación completa, ver [`README.md`](README.md).

## 📦 Servicios (docker-compose)

| Servicio | Rol |
|---|---|
| **frontend** (React + Nginx) | Captura facial + retos de liveness + login con Google |
| **backend** (Node + Express) | Orquesta NTech, auth (JWT propio), Postgres, storage local y MQTT |
| **postgres** | Tabla `access_logs` |
| **mqtt** (Mosquitto) | Comando de apertura de puerta (`access/door`) |

## ✅ Requisitos previos

1. **NTechLab FindFace Multi** — instancia y API key.
2. **Google OAuth Client ID** (Google Cloud Console, tipo *Web application*), con el
   origen del frontend en *Authorized JavaScript origins*
   (ej. `https://app.faceid.alertasenlinea.com.ar`).
3. **Docker + Docker Compose**.

## 🛠️ Configuración

Copiá `env.example` a `.env` y completá los valores (auth, Postgres, NTech, MQTT):

```bash
cp env.example .env
# editá .env: GOOGLE_CLIENT_ID, JWT_SECRET, ALLOWED_EMAILS,
#             POSTGRES_PASSWORD, PUBLIC_BASE_URL, NTECH_*, MQTT_*
```

Para builds locales del frontend, copiá también `frontend/.env.example` a `frontend/.env`
y completá `REACT_APP_GOOGLE_CLIENT_ID` y `REACT_APP_API_URL`.

## ▶️ Iniciar

```bash
docker-compose up -d
docker-compose logs -f
```

- Frontend: http://localhost:3300
- Backend: http://localhost:4000
- Health: http://localhost:4000/health

La tabla `access_logs` se crea sola al arrancar el backend. Las fotos se guardan en
`./backend/uploads` y se sirven en `${PUBLIC_BASE_URL}/uploads/...`.

## 🔑 Credenciales necesarias

1. **Google Cloud** → Client ID (`GOOGLE_CLIENT_ID` / `REACT_APP_GOOGLE_CLIENT_ID`).
2. **JWT** → `JWT_SECRET` (string random largo) para firmar las sesiones.
3. **Allowlist** → `ALLOWED_EMAILS` (y/o `ALLOWED_DOMAINS`) con quién puede entrar.
4. **Postgres** → `POSTGRES_PASSWORD`.
5. **NTechLab** → `NTECH_API_URL`, `NTECH_API_KEY`.
6. **MQTT** → `MQTT_USERNAME`, `MQTT_PASSWORD`.

## 🆘 Ayuda

- Logs: `docker-compose logs -f`
- Diagnóstico: `GET /health/diagnostics`
- Problemas comunes: [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md)
- Integración NTechLab: [`NTECH_SETUP.md`](NTECH_SETUP.md) · [`NTLAB_API_GUIDE.md`](NTLAB_API_GUIDE.md)

## ⚠️ Sobre NTechLab

La documentación de su API no está accesible públicamente. La integración está en
`backend/src/services/ntech.service.js` y puede requerir ajustes según tu versión de
FindFace Multi. Ver `NTECH_SETUP.md`.
