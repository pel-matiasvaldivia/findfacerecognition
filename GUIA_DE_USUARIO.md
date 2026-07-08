# 📸 Guía de Usuario - Sistema de Reconocimiento Facial

## 🎯 Introducción

Esta aplicación permite capturar, detectar, buscar y verificar rostros usando tecnología de reconocimiento facial de NTLAB. Esta guía te mostrará paso a paso cómo usar cada funcionalidad.

---

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener:
- ✅ Navegador web moderno (Chrome, Firefox, Edge)
- ✅ Cámara web funcional
- ✅ Conexión a internet
- ✅ Cuenta de Google (para autenticación)

---

## 🚀 Inicio Rápido

### Paso 1: Acceder a la Aplicación

1. Abre tu navegador web
2. Navega a: `http://localhost:3300` (desarrollo) o tu URL de producción
3. Verás la pantalla de inicio de sesión

```
┌─────────────────────────────────────────┐
│                                         │
│     🔐 Facial Validation App            │
│                                         │
│   ┌───────────────────────────────┐    │
│   │  Login with Google            │    │
│   └───────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

### Paso 2: Iniciar Sesión

1. Haz clic en **"Login with Google"**
2. Selecciona tu cuenta de Google
3. Autoriza el acceso a la aplicación
4. Serás redirigido a la pantalla principal

---

## 📷 Funcionalidad 1: Capturar y Detectar Rostros

### Pantalla Principal

Una vez autenticado, verás la interfaz principal:

```
┌─────────────────────────────────────────────────────────┐
│  Face Verification              Logout (tu@email.com) ▼ │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────────────────────────────────────────┐      │
│   │                                             │      │
│   │         📹 VISTA DE CÁMARA EN VIVO          │      │
│   │                                             │      │
│   │          (Tu rostro aparece aquí)           │      │
│   │                                             │      │
│   └─────────────────────────────────────────────┘      │
│                                                         │
│              ┌─────────────────────┐                    │
│              │  Capture Photo      │                    │
│              └─────────────────────┘                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Paso a Paso: Detectar un Rostro

#### 1️⃣ Posiciona tu rostro

- Colócate frente a la cámara
- Asegúrate de tener buena iluminación
- Tu rostro debe estar completamente visible
- Mantén una expresión neutral

**💡 Consejos para mejor detección:**
- ✅ Iluminación frontal (no de espaldas)
- ✅ Fondo simple y sin distracciones
- ✅ Rostro centrado en la cámara
- ✅ Sin lentes de sol o accesorios que cubran el rostro
- ❌ Evita sombras fuertes
- ❌ No uses gorras o sombreros

#### 2️⃣ Captura la foto

1. Haz clic en **"Capture Photo"**
2. La imagen se congela mostrando la foto capturada

```
┌─────────────────────────────────────────────────────────┐
│  Face Verification              Logout (tu@email.com) ▼ │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────────────────────────────────────────┐      │
│   │                                             │      │
│   │         📸 FOTO CAPTURADA                   │      │
│   │                                             │      │
│   │          (Imagen congelada)                 │      │
│   │                                             │      │
│   └─────────────────────────────────────────────┘      │
│                                                         │
│   ┌──────────┐  ┌──────────────────────┐               │
│   │  Retake  │  │  Verify Face         │               │
│   └──────────┘  └──────────────────────────┘           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 3️⃣ Verificar el rostro

1. Si la foto se ve bien, haz clic en **"Verify Face"**
2. El botón cambiará a **"Processing..."**
3. Espera unos segundos mientras se procesa

#### 4️⃣ Ver resultados

Una vez procesada, verás los resultados:

```
┌─────────────────────────────────────────────────────────┐
│  Results:                                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✅ Face Detected Successfully!                         │
│                                                         │
│  📊 Detection Details:                                  │
│  ┌───────────────────────────────────────────────┐     │
│  │ Detection ID: cf0mbqev54rqhngnq940            │     │
│  │ Confidence Score: 0.95 (95%)                  │     │
│  │ Bounding Box:                                 │     │
│  │   - Left: 451px                               │     │
│  │   - Top: 235px                                │     │
│  │   - Right: 645px                              │     │
│  │   - Bottom: 502px                             │     │
│  │ Quality: High ✓                               │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│  🔗 Saved to: [MinIO Link]                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**📊 Interpretación de Resultados:**

- **Detection Score (0-1)**: Confianza de que es un rostro
  - `0.9 - 1.0`: ✅ Excelente detección
  - `0.7 - 0.9`: ✅ Buena detección
  - `< 0.7`: ⚠️ Baja confianza, intenta de nuevo

- **Bounding Box**: Coordenadas del rectángulo alrededor del rostro
- **Quality**: Indica si la imagen es apta para reconocimiento

---

## 🔍 Funcionalidad 2: Buscar Rostros Similares (1:N)

Esta funcionalidad busca si el rostro capturado coincide con alguno registrado en el sistema.

### Usando la API directamente

Aunque el frontend actual solo tiene detección, puedes usar la API para búsqueda:

#### Opción A: Usando cURL

```bash
# 1. Captura y guarda una foto como "mi-foto.jpg"

# 2. Busca rostros similares
curl -X POST "http://localhost:4000/api/search?limit=10&threshold=0.7" \
  -F "image=@mi-foto.jpg"
```

#### Opción B: Usando Postman

1. **Abre Postman**
2. **Crea una nueva petición POST**
   - URL: `http://localhost:4000/api/search`
   - Query Params:
     - `limit`: 10
     - `threshold`: 0.7

3. **Configura el Body**
   - Tipo: `form-data`
   - Key: `image` (tipo: File)
   - Value: Selecciona tu foto

4. **Envía la petición**

#### Resultado de Búsqueda

```json
{
  "imageUrl": "https://back.faceid.alertasenlinea.com.ar/uploads/photo.jpg",
  "detectedFace": {
    "id": "cf0mbqev54rqhngnq940",
    "bbox": { "left": 451, "top": 235, "right": 645, "bottom": 502 },
    "detection_score": 0.95
  },
  "searchResults": {
    "results": [
      {
        "id": "person-123",
        "similarity": 0.94,
        "metadata": {
          "name": "Juan Pérez",
          "registered_date": "2026-01-15"
        }
      },
      {
        "id": "person-456",
        "similarity": 0.87,
        "metadata": {
          "name": "María García"
        }
      }
    ]
  },
  "totalMatches": 2
}
```

**📊 Interpretación:**

- **similarity (0-1)**: Qué tan parecidos son los rostros
  - `> 0.9`: ✅ Muy probable que sea la misma persona
  - `0.7 - 0.9`: ⚠️ Posible coincidencia, revisar manualmente
  - `< 0.7`: ❌ Probablemente no es la misma persona

- **threshold**: Umbral mínimo de similitud para considerar una coincidencia
  - Más alto (0.9): Más estricto, menos falsos positivos
  - Más bajo (0.6): Más permisivo, puede tener falsos positivos

---

## ⚖️ Funcionalidad 3: Comparar Dos Rostros (1:1)

Compara dos fotos para verificar si son de la misma persona.

### Casos de Uso

- ✅ Verificar identidad con foto de documento
- ✅ Comparar foto actual vs foto de registro
- ✅ Validación de acceso

### Usando la API

#### Con cURL

```bash
curl -X POST http://localhost:4000/api/verify \
  -F "image1=@foto-documento.jpg" \
  -F "image2=@selfie.jpg"
```

#### Con Postman

1. **Nueva petición POST**
   - URL: `http://localhost:4000/api/verify`

2. **Body (form-data)**
   - `image1`: Foto del documento
   - `image2`: Selfie actual

3. **Enviar**

#### Resultado de Verificación

```json
{
  "image1Url": "https://back.faceid.alertasenlinea.com.ar/uploads/documento.jpg",
  "image2Url": "https://back.faceid.alertasenlinea.com.ar/uploads/selfie.jpg",
  "face1": {
    "id": "cf0mbqev54rqhngnq940",
    "detection_score": 0.95
  },
  "face2": {
    "id": "cf0mbqev54rqhngnq94g",
    "detection_score": 0.92
  },
  "verification": {
    "confidence": {
      "average_conf": 0.89
    }
  },
  "match": true
}
```

**✅ Interpretación del campo `match`:**

- `true`: Las fotos son de la misma persona (confidence >= 0.7)
- `false`: Las fotos NO son de la misma persona (confidence < 0.7)

**📊 Niveles de Confianza:**

| Confidence | Interpretación | Acción Recomendada |
|------------|----------------|-------------------|
| 0.95 - 1.0 | ✅ Coincidencia muy alta | Aprobar automáticamente |
| 0.85 - 0.95 | ✅ Coincidencia alta | Aprobar |
| 0.70 - 0.85 | ⚠️ Coincidencia moderada | Revisar manualmente |
| < 0.70 | ❌ No coincide | Rechazar |

---

## 🛠️ Solución de Problemas

### ❌ Error: "No face detected"

**Causas comunes:**
- Rostro no visible o parcialmente oculto
- Iluminación muy baja o muy alta
- Imagen borrosa o de baja calidad
- Rostro muy pequeño en la imagen

**Soluciones:**
1. Mejora la iluminación
2. Acércate más a la cámara
3. Asegúrate de que tu rostro esté completamente visible
4. Usa una cámara de mejor calidad

### ❌ Error: "API Key inválida"

**Causa:** El token de NTLAB no está configurado o es inválido

**Solución:**
1. Verifica que `NTECH_API_KEY` esté en el archivo `.env`
2. Genera un nuevo token siguiendo la [guía de autenticación](#crear-api-token)
3. Reinicia el servidor backend

### ❌ Error: "Connection refused"

**Causa:** El backend no está corriendo

**Solución:**
```bash
# Inicia el backend
cd backend
npm start

# Verifica que esté corriendo en http://localhost:4000
```

### ⚠️ Baja confianza en detección

**Causas:**
- Foto de baja calidad
- Rostro parcialmente oculto
- Ángulo muy pronunciado
- Expresión facial extrema

**Soluciones:**
1. Toma la foto de frente
2. Mantén expresión neutral
3. Mejora la iluminación
4. Usa una cámara de mayor resolución

---

## 📱 Flujos de Trabajo Recomendados

### Flujo 1: Registro de Nuevo Usuario

```
1. Usuario captura selfie
   ↓
2. Sistema detecta rostro (POST /api/detect)
   ↓
3. Si detección exitosa (score > 0.8):
   - Guardar foto y detection_id
   - Registrar en base de datos
   ↓
4. Confirmación al usuario
```

### Flujo 2: Verificación de Identidad

```
1. Usuario sube foto de documento
   ↓
2. Usuario captura selfie actual
   ↓
3. Sistema compara ambas (POST /api/verify)
   ↓
4. Si match = true y confidence > 0.85:
   - Aprobar identidad
   Sino:
   - Solicitar revisión manual
```

### Flujo 3: Búsqueda de Persona

```
1. Usuario captura foto de persona desconocida
   ↓
2. Sistema busca en base de datos (POST /api/search)
   ↓
3. Si encuentra coincidencias (similarity > 0.8):
   - Mostrar resultados
   - Usuario selecciona coincidencia correcta
   Sino:
   - Ofrecer registrar como nueva persona
```

---

## 🔐 Mejores Prácticas de Seguridad

### Para Usuarios

- ✅ Usa siempre tu propia cámara
- ✅ Verifica que estés en el sitio correcto (URL)
- ✅ Cierra sesión al terminar
- ❌ No compartas tu sesión activa
- ❌ No uses fotos de otras personas

### Para Administradores

- ✅ Mantén el API Key seguro (nunca en el código)
- ✅ Usa HTTPS en producción
- ✅ Implementa rate limiting
- ✅ Registra todos los accesos (logs)
- ✅ Revisa manualmente casos con baja confianza
- ❌ No expongas endpoints sin autenticación

---

## 📊 Métricas de Calidad

### Foto Ideal para Reconocimiento

| Característica | Valor Recomendado |
|----------------|-------------------|
| Resolución mínima | 640x480 px |
| Tamaño del rostro | > 100x100 px |
| Iluminación | Uniforme, frontal |
| Ángulo | Frontal (± 15°) |
| Expresión | Neutral |
| Accesorios | Sin lentes oscuros |
| Fondo | Simple, sin distracciones |

### Umbrales Recomendados

| Operación | Threshold | Uso |
|-----------|-----------|-----|
| Detección | 0.8 | Asegurar que es un rostro |
| Búsqueda (alta seguridad) | 0.9 | Bancos, seguridad |
| Búsqueda (uso general) | 0.7 | Aplicaciones generales |
| Verificación (alta seguridad) | 0.85 | Acceso restringido |
| Verificación (uso general) | 0.7 | Verificación básica |

---

## 🆘 Soporte y Ayuda

### Documentación Adicional

- [Guía de API de NTLAB](./NTLAB_API_GUIDE.md)
- [Documentación oficial de NTLAB](https://videoia.alertasenlinea.com.ar/doc/en/api.html)
- [Guía de configuración](./NTECH_SETUP.md)

### Contacto

Si tienes problemas o preguntas:
1. Revisa esta guía primero
2. Consulta la sección de solución de problemas
3. Revisa los logs del backend
4. Contacta al administrador del sistema

---

## 📝 Glosario

- **Detection**: Proceso de encontrar rostros en una imagen
- **Verification (1:1)**: Comparar dos rostros para ver si son la misma persona
- **Search (1:N)**: Buscar un rostro entre muchos registrados
- **Confidence/Similarity**: Score de 0 a 1 que indica qué tan seguro está el sistema
- **Bounding Box**: Rectángulo que encierra el rostro detectado
- **Threshold**: Umbral mínimo para considerar una coincidencia
- **Detection ID**: Identificador único del rostro detectado
- **API Token**: Clave de autenticación para usar la API de NTLAB

---

## ✅ Checklist de Inicio

Antes de usar la aplicación, verifica:

- [ ] Backend corriendo en `http://localhost:4000`
- [ ] Frontend corriendo en `http://localhost:3300`
- [ ] `NTECH_API_KEY` configurado en `.env`
- [ ] Cámara web conectada y funcionando
- [ ] Permisos de cámara otorgados al navegador
- [ ] Cuenta de Google para autenticación
- [ ] Buena iluminación en el área de captura

---

**¡Listo! Ahora estás preparado para usar el sistema de reconocimiento facial. 🎉**
