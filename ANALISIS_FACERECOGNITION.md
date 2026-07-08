# Análisis técnico — repo `alertasenlinea/facerecognition`

> Análisis del repositorio https://github.com/alertasenlinea/facerecognition.git
> (rama `main`, último commit `18b3228 "Update .env"`), realizado el 2026-07-08.
> Documento de referencia para evaluar su integración con la plataforma Custos
> (ver `MODELO_INTEGRACION_HIKVISION.md` para el modelo de integración de dispositivos).

---

## 1. Qué es

Una aplicación de **control de acceso por reconocimiento facial** que actúa como
capa de orquestación sobre **NTechLab FindFace Multi** (instancia propia en
`videoia.alertasenlinea.com.ar`). Flujo principal: la persona se para frente a una
webcam → el frontend captura la foto → el backend la manda a FindFace para
detección + búsqueda 1:N contra las tarjetas enroladas → si hay match, publica un
comando `OPEN` por **MQTT** al tópico `access/door` para abrir la puerta, y registra
el intento en **Supabase** (tabla `access_logs` + bucket de fotos).

## 2. Arquitectura y stack

```
[React + react-webcam]  ──HTTP──▶  [Backend Express :4000]
        (nginx :3300)                    │
                                         ├──▶ NTechLab FindFace Multi (detect / search 1:N / verify 1:1 / cards)
                                         ├──▶ Supabase (Storage: fotos, Postgres: access_logs con RLS)
                                         └──▶ Mosquitto MQTT :1883 → tópico access/door → cerradura
```

| Componente | Tecnología | Notas |
|---|---|---|
| Frontend | React (CRA), `react-webcam`, Supabase Auth (Google OAuth) | Un solo componente relevante: `FaceCapture.js` (~320 líneas) |
| Backend | Node.js + Express, `multer` (memoria), `axios`, `form-data` | ~590 líneas en total; sin tests |
| Reconocimiento | NTechLab FindFace Multi (API `Token`) | detect, `/cards/humans/` con `looks_like`, `/verify`, `/human-card-attachments/` |
| Persistencia | Supabase: tabla `access_logs` (RLS solo service_role) + bucket público `facial-validation-photos` | Esquema en `supabase_schema.sql` |
| Domótica | Eclipse Mosquitto 2.0 | `allow_anonymous true` |
| Deploy | Docker Compose + GitHub Actions → imágenes en GHCR (`facerecognition-frontend/-backend`) | Build en cada push a cualquier rama |

**Endpoints del backend** (`backend/src/routes/api.routes.js`):

- `POST /api/search` — sube foto, detecta cara, chequeo de liveness pasivo (umbral 0.7), búsqueda 1:N, si hay match → `openDoor()` vía MQTT + log en Supabase.
- `POST /api/enroll` — crea "card" (humano) en FindFace y le sube la foto como attachment (requerido para que el reconocimiento funcione).
- `POST /api/verify` — comparación 1:1 entre dos fotos (umbral `average_conf >= 0.7`).
- `POST /api/door/open` — apertura manual de puerta. **Sin autenticación** (el comentario del código lo admite: *"In a real app, check req.user or role here"*).
- `GET /health` — healthcheck.

**Liveness**: dos capas. (a) Pasiva: score de liveness que devuelve FindFace en `/detect`, validado en el backend. (b) Activa: desafíos en el frontend (sonreír, girar la cabeza a izquierda/derecha) validados con los atributos `features.emotions` y `features.headpose_yaw` de la respuesta de detección.

## 3. Estado de madurez

Es un **prototipo funcional / MVP**, no un producto listo para producción:

- El historial (~30 commits) muestra desarrollo iterativo reciente: enrolamiento, MQTT, liveness pasiva y activa, con varios `fix` de restauración de código borrado por accidente.
- No hay tests, ni linting, ni manejo de sesiones/usuarios en el backend.
- `node_modules/` del backend está commiteado al repo (por eso pesa ~25 MB).
- La autenticación Google del frontend es decorativa: el backend no valida ningún token — cualquiera que alcance el puerto 4000 puede usar toda la API.

## 4. Problemas encontrados

### 🔴 Críticos (seguridad)

1. **Secretos commiteados en `.env`** (y en `frontend/.env`): API key de NTechLab, URL y claves de Supabase de **dos** proyectos (uno comentado, uno activo). El último commit es literalmente "Update .env". Al ser repo público, **todas esas credenciales deben considerarse comprometidas y rotarse**.
2. **`POST /api/door/open` abre la puerta sin autenticación.** Cualquiera con acceso de red al backend abre la cerradura.
3. **MQTT anónimo** (`allow_anonymous true`, puerto 1883 publicado al host): cualquiera en la red puede publicar `OPEN` en `access/door` directamente, sin