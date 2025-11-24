# 🏛️ Architecture Technique - AR-FitTry Head

## 📐 Vue d'Ensemble de l'Architecture

Cette application suit une **architecture modulaire** avec séparation claire des responsabilités.

```
┌─────────────────────────────────────────────────────────────┐
│                     index.html (PWA Shell)                   │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │   Video    │  │    Canvas    │  │    UI Controls       │ │
│  │  (Caméra)  │  │   (Three.js) │  │  (Gallery/Buttons)  │ │
│  └────────────┘  └──────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                             ↓
              ┌──────────────────────────────┐
              │       main.js (Orchestrator)  │
              │  - Gère le cycle de vie       │
              │  - Coordonne les modules      │
              └──────────────────────────────┘
                             ↓
        ┌────────────────────┴────────────────────┐
        ↓                    ↓                     ↓
┌───────────────┐   ┌──────────────┐   ┌──────────────────┐
│  FaceTracker  │   │ ModelManager │   │  RenderEngine    │
│ (MediaPipe +  │   │  (GLTF +     │   │   (Three.js)     │
│  Kalman)      │   │   Cache)     │   │                  │
└───────────────┘   └──────────────┘   └──────────────────┘
        ↓                    ↓                     ↓
┌───────────────┐   ┌──────────────┐   ┌──────────────────┐
│ KalmanFilter  │   │ WebXRManager │   │  Service Worker  │
│ (Lissage)     │   │  (Sessions)  │   │  (Cache/Offline) │
└───────────────┘   └──────────────┘   └──────────────────┘
```

---

## 🔄 Flux de Données

### 1️⃣ **Initialisation**
```
User opens app
     ↓
Service Worker registration
     ↓
Load TensorFlow.js + MediaPipe
     ↓
Initialize FaceTracker
     ↓
Preload 3D models
     ↓
Show gallery
```

### 2️⃣ **Sélection de Produit**
```
User clicks product card
     ↓
Load 3D model from cache/network
     ↓
Request camera access
     ↓
Start video stream
     ↓
Start FaceTracker
     ↓
Render loop begins
```

### 3️⃣ **Boucle de Tracking (60 FPS)**
```
requestAnimationFrame
     ↓
Capture video frame
     ↓
MediaPipe face detection
     ↓
Extract landmarks (468 points)
     ↓
Calculate pose (position + rotation + scale)
     ↓
Apply Kalman filtering
     ↓
Update 3D model transform
     ↓
Three.js render
     ↓
Display on canvas
     ↓
Loop back
```

---

## 🧩 Modules Détaillés

### 📹 **FaceTracker.js**

**Responsabilité** : Détection et suivi du visage

**Données d'Entrée** :
- Frame vidéo (HTMLVideoElement)
- Timestamp

**Données de Sortie** :
```javascript
{
  position: { x, y, z },        // Position 3D normalisée
  rotation: { x, y, z },        // Euler angles (pitch, yaw, roll)
  scale: { x, y, z },           // Échelle basée sur distance
  confidence: 0.0-1.0,          // Score de confiance
  landmarks: { leftEye, rightEye, nose, ... },
  timestamp: number
}
```

**Fonctionnement** :

1. **Détection MediaPipe**
   ```javascript
   const faces = await detector.estimateFaces(video);
   const face = faces[0]; // Premier visage
   const keypoints = face.keypoints; // 468 points
   ```

2. **Calcul de Position**
   ```javascript
   // Centre entre les deux yeux
   const leftEye = getAverageLandmark(keypoints, LANDMARKS.leftEye);
   const rightEye = getAverageLandmark(keypoints, LANDMARKS.rightEye);
   
   position.x = (leftEye.x + rightEye.x) / 2 / width;
   position.y = (leftEye.y + rightEye.y) / 2 / height;
   position.z = (leftEye.z + rightEye.z) / 2;
   ```

3. **Calcul de Rotation**
   ```javascript
   // YAW (gauche-droite) : Position du nez vs centre des yeux
   const yaw = ((nose.x - eyeCenterX) / eyeDistance) * π * 0.5;
   
   // PITCH (haut-bas) : Position du nez vs centre des yeux
   const pitch = (nose.y - eyeCenterY) * π * 0.3;
   
   // ROLL (inclinaison) : Angle entre les deux yeux
   const roll = atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
   ```

4. **Filtrage Kalman**
   ```javascript
   const filteredPosition = positionFilter.filter(rawPosition, timestamp);
   const filteredRotation = rotationFilter.filter(rawRotation);
   const filteredScale = scaleFilter.filter(rawScale, timestamp);
   ```

---

### 🎯 **KalmanFilter.js**

**Responsabilité** : Lissage des données de tracking

**Types de Filtres** :

#### 1. **Kalman Filter Classique**
```javascript
// Prédiction
x_pred = x
P_pred = P + Q

// Mise à jour
K = P_pred / (P_pred + R)
x = x_pred + K * (measurement - x_pred)
P = (1 - K) * P_pred
```

**Paramètres** :
- `R` (Measurement Noise) : Confiance dans les mesures
  - ⬇️ R = Plus de confiance dans les mesures (moins stable)
  - ⬆️ R = Moins de confiance (plus stable mais plus lent)
  
- `Q` (Process Noise) : Vitesse de réaction
  - ⬇️ Q = Réaction lente (très stable)
  - ⬆️ Q = Réaction rapide (suit mieux les mouvements)

**Valeurs Recommandées** :
- Position : R=0.01, Q=3
- Rotation : R=0.02, Q=4

#### 2. **One Euro Filter**
```javascript
// Lissage adaptatif basé sur la vélocité
cutoff = minCutoff + beta * |dx/dt|
alpha = 1 / (1 + tau / dt)
x_filtered = alpha * x + (1 - alpha) * x_prev
```

**Avantages** :
- S'adapte automatiquement à la vitesse de mouvement
- Lent = très stable, Rapide = très réactif

#### 3. **Hybrid Filter** (Utilisé dans le projet)
```javascript
// Combine les deux approches
kalmanFiltered = kalmanFilter.filter(rawValue);
finalFiltered = oneEuroFilter.filter(kalmanFiltered);
```

**Résultat** : Stabilité du Kalman + Réactivité du One Euro

---

### 🎨 **RenderEngine.js**

**Responsabilité** : Rendu 3D avec Three.js

**Pipeline de Rendu** :

1. **Setup Scene**
   ```javascript
   scene = new THREE.Scene();
   camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
   renderer = new THREE.WebGLRenderer({ alpha: true });
   ```

2. **Lighting**
   ```javascript
   // 3-point lighting setup
   ambientLight  (0.8)  // Éclairage général
   mainLight     (0.6)  // Lumière principale
   fillLight     (0.3)  // Adoucit les ombres
   backLight     (0.2)  // Éclaire les contours
   ```

3. **Model Transform**
   ```javascript
   // Position : Coordonnées normalisées → Three.js
   model.position.x = (position.x - 0.5) * 4 + offset.x;
   model.position.y = -(position.y - 0.5) * 4 + offset.y;
   model.position.z = -3.0 + offset.z;
   
   // Rotation : Euler → Three.js (avec corrections)
   model.rotation.x = π + rotation.x + baseRotation.x;
   model.rotation.y = π + rotation.y + baseRotation.y;
   model.rotation.z = -rotation.z + baseRotation.z;
   
   // Échelle : Distance face + base scale
   scaleFactor = confidence * scale.x * 0.1;
   model.scale.set(
     baseScale.x * scaleFactor,
     baseScale.y * scaleFactor,
     baseScale.z * scaleFactor
   );
   ```

4. **Render Loop**
   ```javascript
   function animate() {
     requestAnimationFrame(animate);
     renderer.render(scene, camera);
   }
   ```

---

### 📦 **ModelManager.js**

**Responsabilité** : Chargement et cache des modèles 3D

**Stratégie de Cache** :

```javascript
// 1. Vérifier cache mémoire
if (memoryCache.has(url)) {
  return memoryCache.get(url).clone();
}

// 2. Vérifier IndexedDB
const cached = await db.get('models', url);
if (cached) {
  const model = await parseGLB(cached.blob);
  memoryCache.set(url, model);
  return model.clone();
}

// 3. Télécharger depuis le réseau
const model = await downloadModel(url);
memoryCache.set(url, model);
await saveToDB(url, blob);
return model.clone();
```

**Optimisations** :
- Clone des modèles (partage géométrie)
- Compression des textures
- Préchargement asynchrone
- Libération mémoire après usage

---

### 🌐 **WebXRManager.js**

**Responsabilité** : Gestion des sessions WebXR

**Workflow** :

1. **Vérification du Support**
   ```javascript
   const supported = await navigator.xr.isSessionSupported('immersive-ar');
   ```

2. **Demande de Session**
   ```javascript
   const session = await navigator.xr.requestSession('immersive-ar', {
     requiredFeatures: ['local-floor'],
     optionalFeatures: ['dom-overlay']
   });
   ```

3. **Boucle XR**
   ```javascript
   session.requestAnimationFrame((time, frame) => {
     const pose = frame.getViewerPose(referenceSpace);
     
     for (const view of pose.views) {
       const viewport = session.renderState.baseLayer.getViewport(view);
       renderer.setViewport(viewport);
       
       camera.matrix.fromArray(view.transform.matrix);
       camera.projectionMatrix.fromArray(view.projectionMatrix);
       
       renderer.render(scene, camera);
     }
   });
   ```

---

## ⚙️ Configuration des Paramètres

### 🎯 **Pour les Chapeaux**
```javascript
{
  type: 'hat',
  scale: { x: 0.04-0.05, y: 0.04-0.05, z: 0.04-0.05 },
  offset: { 
    x: 0,           // Centré
    y: 0.15-0.18,   // Hauteur du front
    z: 0.08-0.12    // Légèrement en arrière
  }
}
```

### 👓 **Pour les Lunettes**
```javascript
{
  type: 'glasses',
  scale: { x: 2.8-3.2, y: 2.8-3.2, z: 2.8-3.2 },
  offset: { 
    x: 0,           // Centré
    y: 0.08,        // Niveau des yeux
    z: 0.15-0.18    // Devant le visage
  }
}
```

---

## 🔧 Améliorer le Tracking

### Problème : Instabilité

**Cause** : Noise trop élevé dans les mesures

**Solution** :
```javascript
// Augmenter le lissage
kalman: {
  R: 0.005,  // ⬇️ Plus stable
  Q: 2       // ⬇️ Moins réactif
}
```

### Problème : Latence

**Cause** : Trop de lissage

**Solution** :
```javascript
// Réduire le lissage
kalman: {
  R: 0.02,   // ⬆️ Plus réactif
  Q: 5       // ⬆️ Suit mieux
}
```

### Problème : Mauvaise Orientation

**Cause** : Calcul incorrect de la rotation

**Solution** : Ajuster les facteurs de conversion
```javascript
// Dans FaceTracker.js ligne ~190
const yaw = ((noseX - eyeCenterX) / eyeDistance) * π * 0.5;  // Facteur 0.5
const pitch = (noseY - eyeCenterY) * π * 0.3;                 // Facteur 0.3

// Expérimenter avec 0.4, 0.6, etc.
```

---

## 📊 Performances & Optimisations

### Objectifs de Performance
- **FPS** : 30+ (idéal 60)
- **Latence Tracking** : < 100ms
- **Memory** : < 200MB
- **Battery** : < 5% / minute

### Optimisations Implémentées

1. **OffscreenCanvas pour Workers**
   ```javascript
   // Traitement tracking dans un Worker
   const bitmap = await createImageBitmap(canvas);
   worker.postMessage({ bitmap }, [bitmap]);
   ```

2. **Géométrie Partagée**
   ```javascript
   // Un seul BufferGeometry pour plusieurs Mesh
   return cachedModel.clone(); // Clone = partage géométrie
   ```

3. **Frustum Culling**
   ```javascript
   model.frustumCulled = true; // Ne rend que ce qui est visible
   ```

4. **Throttling du Tracking**
   ```javascript
   // Limiter à 30 FPS même si l'écran est 60 FPS
   if (timestamp - lastFrameTime < frameInterval) return;
   ```

---

## 🐛 Debugging Tips

### Console Logs Utiles
```javascript
// Performance
console.log('[FPS]', renderEngine.getStats().fps);

// Confidence
console.log('[Confidence]', faceTracker.getAverageConfidence());

// Position
console.log('[Position]', model.position.toArray());

// Cache
console.log('[Cache]', modelManager.getCacheInfo());
```

### Visualiser les Landmarks
```javascript
// Dans FaceTracker.js
if (DEBUG.showLandmarks) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  keypoints.forEach(point => {
    ctx.fillRect(point.x, point.y, 2, 2);
  });
}
```

---

## 🎓 Concepts Clés à Comprendre

### 1. **Système de Coordonnées**
```
MediaPipe (2D)     →   Three.js (3D)
─────────────────      ─────────────
X: 0 → width           X: -∞ → +∞ (gauche-droite)
Y: 0 → height          Y: -∞ → +∞ (bas-haut)
Z: depth               Z: -∞ → +∞ (loin-proche)
```

### 2. **Euler vs Quaternion**
- **Euler** : Intuitive (degrés), mais gimbal lock
- **Quaternion** : Mathématique complexe, mais stable
- **Solution** : Euler → Quaternion → Filtre → Euler

### 3. **Normalized Coordinates**
```javascript
// MediaPipe donne des coordonnées 0-1
const normalized = {
  x: landmark.x / videoWidth,   // 0-1
  y: landmark.y / videoHeight   // 0-1
};

// Conversion pour Three.js (-2 à +2)
const worldPos = {
  x: (normalized.x - 0.5) * 4,
  y: -(normalized.y - 0.5) * 4
};
```

---

## 📚 Ressources & Références

- [MediaPipe Face Mesh](https://google.github.io/mediapipe/solutions/face_mesh.html)
- [Three.js Documentation](https://threejs.org/docs/)
- [WebXR Device API](https://www.w3.org/TR/webxr/)
- [Kalman Filter Explained](https://www.kalmanfilter.net/)
- [One Euro Filter Paper](http://cristal.univ-lille.fr/~casiez/1euro/)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)

---

**Bon courage pour votre projet ! 🚀**
