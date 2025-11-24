# 🎚️ Guide de Réglage Fin - AR-FitTry Head

Ce guide vous aidera à optimiser le tracking et le rendu pour différents cas d'usage.

---

## 📊 Configurations Pré-Définies

### 🏃 **Performance Mode** (Appareils faibles)
```javascript
// config.js
export const CONFIG = {
  camera: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 24, max: 30 }
  },
  
  faceMesh: {
    refineLandmarks: false,  // Désactiver raffinage
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
  },
  
  kalman: {
    R: 0.02,
    Q: 4
  },
  
  rendering: {
    antialias: false,  // Désactiver antialiasing
    pixelRatio: 1      // Forcer pixelRatio à 1
  }
};
```

### 🎯 **Quality Mode** (Appareils puissants)
```javascript
export const CONFIG = {
  camera: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 60 }
  },
  
  faceMesh: {
    refineLandmarks: true,
    minDetectionConfidence: 0.8,
    minTrackingConfidence: 0.8
  },
  
  kalman: {
    R: 0.005,
    Q: 2
  },
  
  rendering: {
    antialias: true,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
  }
};
```

### ⚡ **Responsive Mode** (Mouvements rapides)
```javascript
export const CONFIG = {
  camera: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  },
  
  faceMesh: {
    refineLandmarks: true,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
  },
  
  kalman: {
    R: 0.03,   // Plus de réactivité
    Q: 6       // Suit les mouvements rapides
  },
  
  rendering: {
    antialias: true,
    pixelRatio: 1.5
  }
};
```

### 🎭 **Stable Mode** (Capture photo)
```javascript
export const CONFIG = {
  kalman: {
    R: 0.005,  // Maximum de stabilité
    Q: 1       // Minimum de réactivité
  }
};
```

---

## 🔍 Diagnostic des Problèmes

### ❌ Symptôme : Modèle Tremble Beaucoup

**Diagnostic** :
```javascript
// Vérifier la variance de position dans la console
let positions = [];
faceTracker.onTrackingUpdate = (data) => {
  positions.push(data.position.x);
  if (positions.length > 30) {
    const variance = calculateVariance(positions);
    console.log('Variance:', variance);
    if (variance > 0.01) {
      console.warn('⚠️ Tracking instable !');
    }
    positions = [];
  }
};
```

**Solution 1** : Augmenter le lissage
```javascript
kalman: {
  R: 0.005,  // ⬇️ Diminuer
  Q: 2       // ⬇️ Diminuer
}
```

**Solution 2** : Utiliser One Euro Filter
```javascript
// Dans FaceTracker.js, remplacer par :
this.positionFilter = new OneEuroFilter(
  1.0,   // minCutoff
  0.005, // beta (très bas = très stable)
  1.0    // dCutoff
);
```

**Solution 3** : Ajouter un buffer de moyennage
```javascript
// Dans FaceTracker.js
class MovingAverage {
  constructor(size = 5) {
    this.buffer = [];
    this.size = size;
  }
  
  add(value) {
    this.buffer.push(value);
    if (this.buffer.length > this.size) {
      this.buffer.shift();
    }
    
    const sum = this.buffer.reduce((a, b) => ({
      x: a.x + b.x,
      y: a.y + b.y,
      z: a.z + b.z
    }));
    
    return {
      x: sum.x / this.buffer.length,
      y: sum.y / this.buffer.length,
      z: sum.z / this.buffer.length
    };
  }
}
```

---

### ❌ Symptôme : Modèle Trop Lent à Réagir

**Diagnostic** :
```javascript
// Mesurer le lag
let lastMovement = Date.now();
faceTracker.onTrackingUpdate = (data) => {
  const movement = calculateMovement(data.position, lastPosition);
  if (movement > 0.05) {
    const lag = Date.now() - lastMovement;
    console.log('Lag:', lag, 'ms');
    if (lag > 200) {
      console.warn('⚠️ Réactivité insuffisante !');
    }
    lastMovement = Date.now();
  }
  lastPosition = data.position;
};
```

**Solution** : Augmenter la réactivité
```javascript
kalman: {
  R: 0.03,   // ⬆️ Augmenter
  Q: 6       // ⬆️ Augmenter
}
```

---

### ❌ Symptôme : Modèle Mal Positionné

**Diagnostic Visuel** :
```javascript
// Afficher les points de repère
DEBUG.showLandmarks = true;

// Dans FaceTracker.js après calculateFacePose()
if (DEBUG.showLandmarks) {
  this.drawLandmarks(video, landmarks);
}

drawLandmarks(video, landmarks) {
  const canvas = document.getElementById('debug-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Dessiner tous les landmarks
  landmarks.forEach(point => {
    ctx.fillStyle = 'red';
    ctx.fillRect(point.x - 1, point.y - 1, 2, 2);
  });
  
  // Dessiner les points clés en vert
  const { leftEye, rightEye, nose } = this.getKeyPoints(landmarks);
  ctx.fillStyle = 'green';
  ctx.fillRect(leftEye.x - 3, leftEye.y - 3, 6, 6);
  ctx.fillRect(rightEye.x - 3, rightEye.y - 3, 6, 6);
  ctx.fillRect(nose.x - 3, nose.y - 3, 6, 6);
}
```

**Solution Chapeaux Trop Bas** :
```javascript
{
  offset: { 
    x: 0, 
    y: 0.20,  // ⬆️ Augmenter (était 0.15)
    z: 0.1 
  }
}
```

**Solution Lunettes Trop Loin** :
```javascript
{
  offset: { 
    x: 0, 
    y: 0.08, 
    z: 0.20  // ⬆️ Augmenter (était 0.15)
  }
}
```

---

### ❌ Symptôme : Modèle Mal Orienté

**Diagnostic** :
```javascript
// Logger les angles de rotation
renderEngine.updateModelTransform = function(trackingData) {
  const { rotation } = trackingData;
  console.log('Pitch:', rotation.x * 180/Math.PI);
  console.log('Yaw:', rotation.y * 180/Math.PI);
  console.log('Roll:', rotation.z * 180/Math.PI);
  // ... rest of function
};
```

**Solution Chapeau Penche Trop** :
```javascript
// Dans FaceTracker.js ligne ~190
const pitch = (noseY - eyeCenterY) * Math.PI * 0.2;  // ⬇️ Réduire (était 0.3)
```

**Solution Chapeau Tourne Trop** :
```javascript
const yaw = ((noseX - eyeCenterX) / eyeDistance) * Math.PI * 0.3;  // ⬇️ Réduire (était 0.5)
```

---

### ❌ Symptôme : FPS Trop Bas

**Diagnostic** :
```javascript
// Activer le monitoring
setInterval(() => {
  const stats = renderEngine.getStats();
  console.log('FPS:', stats.fps);
  console.log('Draw Calls:', stats.renderer.drawCalls);
  console.log('Triangles:', stats.renderer.triangles);
  console.log('Textures:', stats.memory.textures);
}, 1000);
```

**Solution 1** : Réduire résolution
```javascript
camera: {
  width: { ideal: 640 },
  height: { ideal: 480 }
}
```

**Solution 2** : Simplifier le modèle 3D
```bash
# Utiliser gltf-pipeline pour optimiser
npm install -g gltf-pipeline
gltf-pipeline -i model.glb -o model-optimized.glb -d
```

**Solution 3** : Désactiver features coûteuses
```javascript
rendering: {
  antialias: false,
  pixelRatio: 1
},

// Dans RenderEngine.js
this.renderer.shadowMap.enabled = false;

// Dans le modèle
model.traverse(child => {
  if (child.isMesh) {
    child.castShadow = false;
    child.receiveShadow = false;
  }
});
```

**Solution 4** : Throttler le tracking
```javascript
// Dans FaceTracker.js
const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;
let lastFrameTime = 0;

async processFrame(video, timestamp) {
  if (timestamp - lastFrameTime < FRAME_INTERVAL) {
    return null; // Skip frame
  }
  lastFrameTime = timestamp;
  // ... rest of processing
}
```

---

## 🎨 Ajustements par Type de Produit

### 👒 Casquettes / Chapeaux

**Position Optimale** :
```javascript
{
  scale: { x: 0.045, y: 0.045, z: 0.045 },
  offset: { 
    x: 0,      // Centré
    y: 0.16,   // Mi-hauteur du front
    z: 0.08    // Légèrement en arrière
  },
  rotation: { 
    x: 0,      // Pas d'inclinaison avant/arrière
    y: 0,      // Pas de rotation gauche/droite
    z: 0       // Pas d'inclinaison latérale
  }
}
```

**Si le chapeau flotte** :
- ⬇️ Diminuer `offset.y` de 0.02
- ⬆️ Augmenter `offset.z` de 0.02

**Si le chapeau enfonce le visage** :
- ⬆️ Augmenter `offset.y` de 0.02
- ⬇️ Diminuer `offset.z` de 0.02

### 👓 Lunettes

**Position Optimale** :
```javascript
{
  scale: { x: 3.0, y: 3.0, z: 3.0 },
  offset: { 
    x: 0,      // Centré
    y: 0.08,   // Niveau des yeux
    z: 0.17    // Devant le visage
  },
  rotation: { 
    x: 0,      
    y: 0,      
    z: 0       
  }
}
```

**Si les lunettes sont trop hautes** :
- ⬇️ Diminuer `offset.y` de 0.01

**Si les lunettes sont trop collées** :
- ⬆️ Augmenter `offset.z` de 0.02

**Si les lunettes sont de travers** :
- Vérifier que `roll` est bien calculé
- Ajouter un offset de rotation si nécessaire

### 🎓 Bonnets

**Position Optimale** :
```javascript
{
  scale: { x: 0.04, y: 0.04, z: 0.04 },
  offset: { 
    x: 0,      
    y: 0.18,   // Plus haut qu'une casquette
    z: 0.05    // Plus proche du crâne
  }
}
```

---

## 🧪 Tests & Validation

### Test de Stabilité
```javascript
// Tester la stabilité sur 100 frames
async function testStability() {
  const samples = [];
  
  for (let i = 0; i < 100; i++) {
    const data = await faceTracker.processFrame(video);
    if (data) {
      samples.push(data.position);
    }
    await sleep(33); // ~30 FPS
  }
  
  const variance = {
    x: calculateVariance(samples.map(s => s.x)),
    y: calculateVariance(samples.map(s => s.y)),
    z: calculateVariance(samples.map(s => s.z))
  };
  
  console.log('Variance:', variance);
  // Objectif: < 0.01 pour chaque axe
}
```

### Test de Latence
```javascript
async function testLatency() {
  const start = performance.now();
  
  // Déplacer la tête brusquement
  console.log('Déplacez votre tête maintenant !');
  
  const initialPos = await faceTracker.processFrame(video);
  
  // Attendre que la position change significativement
  let currentPos;
  do {
    currentPos = await faceTracker.processFrame(video);
    await sleep(16);
  } while (distance(initialPos, currentPos) < 0.1);
  
  const latency = performance.now() - start;
  console.log('Latence:', latency, 'ms');
  // Objectif: < 200ms
}
```

### Test de Confiance
```javascript
function testConfidence() {
  let confidences = [];
  
  faceTracker.onTrackingUpdate = (data) => {
    confidences.push(data.confidence);
    
    if (confidences.length >= 100) {
      const avgConfidence = confidences.reduce((a,b) => a+b) / 100;
      console.log('Confiance moyenne:', (avgConfidence * 100).toFixed(1) + '%');
      // Objectif: > 70%
      confidences = [];
    }
  };
}
```

---

## 📏 Calibration Wizard

Créez un assistant de calibration interactif :

```javascript
class CalibrationWizard {
  constructor(app) {
    this.app = app;
    this.step = 0;
    this.results = {};
  }
  
  async start() {
    console.log('=== Calibration Wizard ===');
    console.log('Suivez les instructions...');
    
    // Étape 1: Centrer le visage
    await this.stepCenter();
    
    // Étape 2: Mesurer la taille
    await this.stepSize();
    
    // Étape 3: Tester les rotations
    await this.stepRotation();
    
    // Générer la configuration
    this.generateConfig();
  }
  
  async stepCenter() {
    console.log('\n[1/3] Centrez votre visage dans la caméra');
    console.log('Appuyez sur Entrée quand c\'est bon...');
    
    await waitForEnter();
    
    const data = await this.app.faceTracker.processFrame(video);
    this.results.centerPosition = data.position;
    console.log('✓ Position centrale enregistrée');
  }
  
  async stepSize() {
    console.log('\n[2/3] Éloignez-vous au maximum');
    console.log('Appuyez sur Entrée...');
    await waitForEnter();
    const farData = await this.app.faceTracker.processFrame(video);
    
    console.log('Rapprochez-vous au maximum');
    console.log('Appuyez sur Entrée...');
    await waitForEnter();
    const nearData = await this.app.faceTracker.processFrame(video);
    
    this.results.sizeRange = {
      far: farData.scale,
      near: nearData.scale
    };
    console.log('✓ Plage d\'échelle enregistrée');
  }
  
  async stepRotation() {
    console.log('\n[3/3] Tournez la tête à gauche');
    await waitForEnter();
    const leftData = await this.app.faceTracker.processFrame(video);
    
    console.log('Tournez la tête à droite');
    await waitForEnter();
    const rightData = await this.app.faceTracker.processFrame(video);
    
    this.results.rotationRange = {
      left: leftData.rotation,
      right: rightData.rotation
    };
    console.log('✓ Plage de rotation enregistrée');
  }
  
  generateConfig() {
    console.log('\n=== Configuration Recommandée ===');
    
    const config = {
      offset: {
        x: 0,
        y: this.results.centerPosition.y + 0.15,
        z: 0.1
      },
      scale: {
        min: this.results.sizeRange.far.x,
        max: this.results.sizeRange.near.x
      },
      rotation: {
        yawRange: [this.results.rotationRange.left.y, this.results.rotationRange.right.y]
      }
    };
    
    console.log(JSON.stringify(config, null, 2));
    return config;
  }
}

// Utilisation
const wizard = new CalibrationWizard(window.app);
wizard.start();
```

---

## 🎯 Checklist Finale

Avant de considérer le tracking comme optimal :

- [ ] FPS stable ≥ 30
- [ ] Confidence moyenne ≥ 70%
- [ ] Latence < 200ms
- [ ] Variance de position < 0.01
- [ ] Modèle ne traverse pas le visage
- [ ] Modèle suit les rotations smoothement
- [ ] Pas de gimbal lock visible
- [ ] Bon éclairage ambiant (>300 lux)
- [ ] Pas d'occlusions (mains, cheveux)
- [ ] Testé sur plusieurs distances

---

**Bon tuning ! 🎚️**
