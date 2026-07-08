# Face Recognition - CI/CD Pipeline

Este proyecto utiliza GitHub Actions para automatizar el build y publicación de imágenes Docker.

## 🚀 Cómo Funciona

### Build Automático
Cada vez que hagas push a cualquier branch, GitHub Actions automáticamente:
1. Construye las imágenes Docker del frontend y backend
2. Las publica en GitHub Container Registry (GHCR)
3. Las etiqueta con:
   - `latest` (solo en el branch principal)
   - Nombre del branch
   - SHA del commit

Nota: en **pull requests** las imágenes se construyen para validar los Dockerfiles,
pero **no se publican**; el push a GHCR ocurre solo en pushes de rama / ejecución manual.

### Imágenes Publicadas
Las imágenes se publican en:
- **Frontend**: `ghcr.io/pel-matiasvaldivia/findfacerecognition-frontend:latest`
- **Backend**: `ghcr.io/pel-matiasvaldivia/findfacerecognition-backend:latest`

### Configuración del build del frontend (Repository Variables)
Create React App inyecta las variables `REACT_APP_*` **en tiempo de build**, así que el
workflow las pasa como *build args* tomados de **Settings → Secrets and variables →
Actions → Variables**:
- `REACT_APP_GOOGLE_CLIENT_ID` — Client ID de Google (público).
- `REACT_APP_API_URL` — opcional (default `https://back.faceid.alertasenlinea.com.ar/api`).

## 📦 Uso

### Producción (Imágenes Pre-buildeadas)
Para usar las imágenes ya construidas desde GHCR:

```bash
# Descargar las últimas imágenes
docker-compose pull

# Iniciar los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

### Desarrollo Local
Para desarrollo local con hot-reload:

```bash
# Usar el archivo de desarrollo
docker-compose -f docker-compose.dev.yml up --build

# O con hot-reload
docker-compose -f docker-compose.dev.yml up
```

## 🔐 Autenticación

Para descargar imágenes privadas de GHCR, necesitas autenticarte:

```bash
# Crear un Personal Access Token en GitHub con permisos read:packages
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

## 🔄 Actualizar Imágenes

Para obtener las últimas versiones:

```bash
docker-compose pull
docker-compose up -d
```

## 🛠️ Variables de Entorno

Asegúrate de tener un archivo `.env` con:

```env
GOOGLE_CLIENT_ID=tu_google_client_id
JWT_SECRET=tu_jwt_secret
ALLOWED_EMAILS=email1@dominio.com,email2@dominio.com
POSTGRES_PASSWORD=tu_password_postgres
PUBLIC_BASE_URL=https://back.faceid.alertasenlinea.com.ar
NTECH_API_URL=tu_ntech_api_url
NTECH_API_KEY=tu_ntech_api_key
MQTT_USERNAME=backend
MQTT_PASSWORD=tu_password_mqtt
```

Ver `env.example` para la lista completa.

## 📝 Notas

- El workflow se ejecuta automáticamente en cada push
- Puedes ejecutarlo manualmente desde la pestaña "Actions" en GitHub
- Las imágenes se cachean para builds más rápidos
- El `docker-compose.yml` principal usa imágenes pre-buildeadas
- El `docker-compose.dev.yml` construye localmente para desarrollo
