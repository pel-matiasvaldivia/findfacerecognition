# 🔧 Solución de Errores - Face Recognition App

## ❌ Errores Identificados

Basándome en los errores de la consola del navegador, estos son los problemas encontrados:

### 1. Error de CORS (Principal)
```
Access to XMLHttpRequest at 'http://api.faceid.alertasenlinea.com.ar:3000/' 
from origin 'https://app.faceid.alertasenlinea.com.ar' has been blocked by CORS policy
```

**Causa**: El backend no está configurado para aceptar peticiones desde el dominio del frontend.

### 2. Conexión Rechazada
```
net::ERR_CONNECTION_REFUSED
WebSocket connection to 'ws://api.faceid.alertasenlinea.com.ar:3000/' failed
```

**Causa**: El puerto 3000 no está disponible o el backend no está corriendo en ese puerto.

### 3. Puerto Incorrecto
El frontend está intentando conectarse al puerto **3000**, pero el backend corre en el puerto **4000**.

---

## ✅ Soluciones Aplicadas

### 1. Configuración de CORS en el Backend

**Archivo modificado**: `backend/src/index.js`

```javascript
// CORS configuration for production
const corsOptions = {
    origin: [
        'http://localhost:3300',
        'http://localhost:3000',
        'https://app.faceid.alertasenlinea.com.ar',
        'http://app.faceid.alertasenlinea.com.ar'
    ],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

### 2. Configuración del Frontend

**Archivo creado**: `frontend/.env`

```env
REACT_APP_API_URL=https://back.faceid.alertasenlinea.com.ar/api
REACT_APP_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

> Recordá: `REACT_APP_*` se inyecta en tiempo de build (CRA). En la imagen Docker
> se pasa como *build arg* desde las Repository Variables de GitHub Actions, no en runtime.

---

## 🚀 Pasos para Aplicar la Solución

### Opción 1: Desarrollo Local

```bash
# 1. Actualizar el backend
cd backend
git pull
npm install
npm start

# 2. Actualizar el frontend
cd ../frontend
git pull
npm install
npm start
```

### Opción 2: Producción con Docker

```bash
# 1. Commit y push de los cambios
git add backend/src/index.js frontend/.env
git commit -m "fix: Configure CORS and API URL for production"
git push origin main

# 2. Esperar a que GitHub Actions construya las imágenes

# 3. Actualizar los contenedores
docker-compose pull
docker-compose down
docker-compose up -d
```

---

## 🔍 Verificación

### 1. Verificar que el backend esté corriendo

```bash
# Verificar el endpoint de health
curl https://back.faceid.alertasenlinea.com.ar/health

# Debería retornar:
# {"status":"ok"}
```

### 2. Verificar CORS

```bash
# Probar desde el dominio del frontend
curl -H "Origin: https://app.faceid.alertasenlinea.com.ar" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://back.faceid.alertasenlinea.com.ar/api/detect


# Debería incluir en los headers:
# Access-Control-Allow-Origin: https://app.faceid.alertasenlinea.com.ar
```

### 3. Verificar desde el navegador

1. Abre la consola del navegador (F12)
2. Ve a la pestaña **Network**
3. Intenta capturar una foto y hacer "Verify Face"
4. Verifica que la petición a `/api/detect` tenga:
   - Status: `200 OK`
   - Headers de respuesta incluyan `Access-Control-Allow-Origin`

---

## 🐛 Problemas Adicionales Posibles

### Si el error persiste después de aplicar los cambios:

#### 1. Caché del Navegador

```bash
# Limpiar caché del navegador:
# 1. Presiona Ctrl + Shift + Delete
# 2. Selecciona "Cached images and files"
# 3. Haz clic en "Clear data"

# O usa modo incógnito:
# Ctrl + Shift + N (Chrome)
# Ctrl + Shift + P (Firefox)
```

#### 2. Variables de Entorno no Cargadas

```bash
# En el frontend, verifica que las variables estén cargadas
# Agrega esto temporalmente en FaceCapture.js:
console.log('API_URL:', process.env.REACT_APP_API_URL);

# Debería mostrar:
# API_URL: http://api.faceid.alertasenlinea.com.ar/api
```

Si muestra `undefined`, necesitas:
1. Reiniciar el servidor de desarrollo del frontend
2. Verificar que el archivo `.env` esté en la raíz de `frontend/`

#### 3. Puerto Incorrecto en Producción

Verifica la configuración de tu servidor:

```bash
# Si usas nginx o similar, verifica el proxy_pass
# Debería apuntar al puerto 4000, no 3000

# Ejemplo de configuración nginx:
location /api {
    proxy_pass http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

#### 4. Firewall o Seguridad

```bash
# Verifica que el puerto 4000 esté abierto
netstat -an | grep 4000

# O en Linux:
sudo ufw status
sudo ufw allow 4000
```

---

## 📝 Checklist de Verificación

- [ ] Backend corriendo en el puerto correcto (4000)
- [ ] CORS configurado con el dominio del frontend
- [ ] Frontend `.env` tiene la URL correcta del API
- [ ] Cambios commiteados y pusheados a GitHub
- [ ] Imágenes Docker reconstruidas (si usas Docker)
- [ ] Contenedores reiniciados
- [ ] Caché del navegador limpiado
- [ ] Peticiones en Network tab muestran 200 OK

---

## 🆘 Si Nada Funciona

1. **Revisa los logs del backend**:
   ```bash
   # Docker
   docker-compose logs backend
   
   # Local
   cd backend && npm start
   # Observa los logs en la consola
   ```

2. **Revisa los logs del frontend**:
   ```bash
   # Abre la consola del navegador (F12)
   # Pestaña Console
   # Busca errores en rojo
   ```

3. **Verifica la configuración de red**:
   ```bash
   # Ping al backend
   ping api.faceid.alertasenlinea.com.ar
   
   # Verifica DNS
   nslookup api.faceid.alertasenlinea.com.ar
   ```

4. **Contacta al administrador del servidor** con:
   - Logs del backend
   - Logs del navegador
   - Configuración de nginx/apache (si aplica)

---

## 📚 Referencias

- [Documentación de CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Guía de API](./NTLAB_API_GUIDE.md)
- [Guía de Usuario](./GUIA_DE_USUARIO.md)
