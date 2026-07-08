# NTLAB Face Recognition API - Guía de Uso

Esta guía explica cómo usar la integración con NTLAB FindFace Multi para reconocimiento facial.

## 🔧 Configuración

### Variables de Entorno

Asegúrate de tener configuradas estas variables en tu archivo `.env`:

```env
NTECH_API_URL=https://videoia.alertasenlinea.com.ar
NTECH_API_KEY=tu-token-aqui
```

> **Importante**: El token debe ser válido y tener permisos para usar la API de NTLAB.

## 📡 Endpoints Disponibles

### 1. Detectar Rostros (`POST /api/detect`)

Detecta rostros en una imagen.

**Request:**
```bash
curl -X POST http://localhost:4000/api/detect \
  -H "Content-Type: multipart/form-data" \
  -F "image=@photo.jpg"
```

**Response:**
```json
{
  "imageUrl": "https://...",
  "detection": {
    "orientation": 1,
    "objects": {
      "face": [
        {
          "id": "cf0mbqev54rqhngnq940",
          "bbox": {
            "left": 451,
            "top": 235,
            "right": 645,
            "bottom": 502
          },
          "detection_score": 0.80645436,
          "low_quality": false
        }
      ]
    }
  },
  "faces": [...]
}
```

---

### 2. Buscar Rostros Similares (`POST /api/search`)

Busca rostros similares en el sistema (búsqueda 1:N).

**Request:**
```bash
curl -X POST "http://localhost:4000/api/search?limit=10&threshold=0.7" \
  -H "Content-Type: multipart/form-data" \
  -F "image=@photo.jpg"
```

**Query Parameters:**
- `limit` (opcional): Número máximo de resultados (default: 10)
- `threshold` (opcional): Umbral de similitud mínimo (default: 0.7)

**Response:**
```json
{
  "imageUrl": "https://...",
  "detectedFace": {
    "id": "cf0mbqev54rqhngnq940",
    "bbox": {...},
    "detection_score": 0.80645436
  },
  "searchResults": {
    "results": [
      {
        "id": "person-123",
        "similarity": 0.94,
        "metadata": {...}
      }
    ]
  },
  "totalMatches": 5
}
```

---

### 3. Verificar/Comparar Dos Rostros (`POST /api/verify`)

Compara dos rostros para verificar si pertenecen a la misma persona (verificación 1:1).

**Request:**
```bash
curl -X POST http://localhost:4000/api/verify \
  -H "Content-Type: multipart/form-data" \
  -F "image1=@photo1.jpg" \
  -F "image2=@photo2.jpg"
```

**Response:**
```json
{
  "image1Url": "https://...",
  "image2Url": "https://...",
  "face1": {
    "id": "cf0mbqev54rqhngnq940",
    "bbox": {...},
    "detection_score": 0.80645436
  },
  "face2": {
    "id": "cf0mbqev54rqhngnq94g",
    "bbox": {...},
    "detection_score": 0.90099674
  },
  "verification": {
    "confidence": {
      "face_objects": {
        "4493493039043981648": 0.7896046
      },
      "average_conf": 0.7896046
    }
  },
  "match": true
}
```

**Campo `match`**: `true` si `average_conf >= 0.7`, `false` en caso contrario.

---

## 🔄 Flujo de Trabajo Típico

### Caso 1: Verificar Identidad

1. Usuario sube una foto
2. Sistema detecta el rostro con `/api/detect`
3. Sistema busca rostros similares con `/api/search`
4. Si encuentra coincidencias, muestra los resultados

### Caso 2: Comparar Dos Fotos

1. Usuario sube dos fotos (ej: foto de documento vs selfie)
2. Sistema compara con `/api/verify`
3. Si `match: true`, las fotos son de la misma persona

---

## 🎯 Ejemplos de Uso

### Desde JavaScript (Frontend)

```javascript
// Detectar rostros
const formData = new FormData();
formData.append('image', fileInput.files[0]);

const response = await fetch('http://localhost:4000/api/detect', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Rostros detectados:', result.faces.length);
```

### Buscar rostros similares

```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

const response = await fetch('http://localhost:4000/api/search?limit=5&threshold=0.8', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Coincidencias encontradas:', result.totalMatches);
```

---

## ⚠️ Manejo de Errores

### Error: No face detected

```json
{
  "error": "No faces detected in the image",
  "imageUrl": "https://..."
}
```

**Solución**: Asegúrate de que la imagen contenga un rostro visible y de buena calidad.

### Error: API Key inválida

```json
{
  "error": "Request failed with status code 401"
}
```

**Solución**: Verifica que `NTECH_API_KEY` en `.env` sea válido.

---

## 📊 Interpretación de Scores

- **detection_score**: Confianza de que el objeto detectado es un rostro (0-1)
  - `> 0.8`: Alta confianza
  - `0.5-0.8`: Confianza media
  - `< 0.5`: Baja confianza

- **similarity/average_conf**: Similitud entre rostros (0-1)
  - `> 0.9`: Muy similar (probablemente la misma persona)
  - `0.7-0.9`: Similar (posible coincidencia)
  - `< 0.7`: No similar

---

## 🔐 Seguridad

- ✅ Las imágenes se guardan en el filesystem del backend y se sirven en `/uploads`
- ✅ El API Key nunca se expone al frontend
- ✅ Todas las peticiones a NTLAB se hacen desde el backend
- ✅ Se usa autenticación por Token

---

## 📝 Notas Técnicas

- Las imágenes se procesan con `multipart/form-data`
- Los rostros detectados reciben un ID único (`detection:id`)
- Este ID se usa para búsquedas y comparaciones
- La API soporta múltiples rostros por imagen (se usa el primero)
