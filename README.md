# 🎯 AR-FitTry Head - Virtual Try-On PWA

Application Web Progressive pour l'essayage virtuel d'accessoires de tête (chapeaux, lunettes) en réalité augmentée.

## ✨ Caractéristiques

- ✅ **PWA Pure** : Sans React/JSX, manifest + service worker
- ✅ **WebXR Ready** : Support WebXR Device API
- ✅ **Tracking Optimisé** : MediaPipe Face Mesh + Kalman Filter
- ✅ **Performances** : Filtres hybrides (Kalman + One Euro)
- ✅ **Mode Offline** : Fonctionne sans connexion Internet
- ✅ **HTTPS** : Obligatoire pour la caméra et WebXR
- ✅ **Responsive** : S'adapte à tous les écrans

## 🏗️ Architecture

```
ar-fittry-head/
├── index.html              # Point d'entrée
├── manifest.json           # Configuration PWA
├── sw.js                   # Service Worker
├── css/
│   └── style.css          # Styles globaux
├── js/
│   ├── main.js            # Script principal
│   ├── config.js          # Configuration
│   └── modules/
│       ├── FaceTracker.js     # Tracking facial MediaPipe
│       ├── KalmanFilter.js    # Filtres de lissage
│       ├── ModelManager.js    # Gestion des modèles 3D
│       ├── RenderEngine.js    # Moteur Three.js
│       └── WebXRManager.js    # Gestion WebXR
├── models/head/           # Modèles 3D (.glb)
└── assets/
    ├── icons/            # Icônes PWA
    └── images/           # Thumbnails
```

## 🔧 Technologies Utilisées

### Core
- **HTML5 / CSS3 / JavaScript ES6+**
- **PWA** : Service Worker + Manifest

### 3D & Rendu
- **Three.js** : Moteur 3D
- **GLTFLoader** : Chargement modèles 3D
- **WebXR Device API** : Réalité augmentée

### IA & Tracking
- **TensorFlow.js** : Backend ML
- **MediaPipe Face Mesh** : 468 points faciaux
- **Kalman Filter** : Lissage position/rotation
- **One Euro Filter** : Lissage adaptatif

## 🚀 Installation & Démarrage

### Prérequis
- Serveur HTTPS (obligatoire pour camera + WebXR)
- Navigateur compatible :
  - Chrome 90+
  - Firefox 88+
  - Safari 14.1+
  - Edge 90+

### Option 1 : Serveur Local HTTPS (Node.js)

```bash
# Installer http-server avec SSL
npm install -g http-server

# Démarrer avec HTTPS
http-server -S -C cert.pem -K key.pem -p 8080
```

Générer certificat auto-signé :
```bash
openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem
```

### Option 2 : Serveur Python HTTPS

```bash
# Créer un serveur HTTPS simple
python3 -m http.server 8080 --bind localhost
```

### Option 3 : Live Server (VS Code)

1. Installer l'extension "Live Server"
2. Configurer pour HTTPS dans settings.json :
```json
{
  "liveServer.settings.https": {
    "enable": true,
    "cert": "cert.pem",
    "key": "key.pem"
  }
}
```

### Accès
Ouvrir `https://localhost:8080` dans le navigateur

## 📱 Configuration

### Éditer `js/config.js`

```javascript
export const CONFIG = {
  camera: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  },
  
  kalman: {
    R: 0.01,  // Noise de mesure (⬇️ = + confiance)
    Q: 3      // Noise processus (⬆️ = + réactivité)
  },
  
  faceMesh: {
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
  },
  
  debug: {
    enabled: false  // true pour debug panel
  }
};
```

## 🎨 Ajouter des Produits

### 1. Préparer le Modèle 3D
- Format : `.glb` (GLTF 2.0)
- Optimisé : < 5 MB
- Échelle : Adaptée à la taille d'une tête

### 2. Ajouter la Configuration

Dans `js/config.js` :

```javascript
products: {
  head: [
    {
      id: 'unique-id',
      name: 'Nom du Produit',
      price: 99.99,
      modelUrl: './models/head/mon-modele.glb',
      thumbnail: './assets/images/thumbnail.jpg',
      type: 'hat', // ou 'glasses'
      scale: { x: 0.05, y: 0.05, z: 0.05 },
      offset: { x: 0, y: 0.15, z: 0.1 },
      rotation: { x: 0, y: 0, z: 0 }
    }
  ]
}
```

### 3. Ajuster la Position

**Pour les chapeaux** :
- `offset.y` : Hauteur (+ = plus haut)
- `offset.z` : Avant/Arrière (+ = plus en arrière)

**Pour les lunettes** :
- `offset.y` : Hauteur des yeux
- `offset.z` : Distance du visage

## 🎛️ Optimisation du Tracking

### Problème : Modèle tremble
**Solution** : Augmenter le lissage

```javascript
kalman: {
  R: 0.005,  // Plus bas = plus stable
  Q: 2       // Plus bas = moins réactif
}
```

### Problème : Modèle trop lent
**Solution** : Plus de réactivité

```javascript
kalman: {
  R: 0.02,   // Plus haut = plus réactif
  Q: 5       // Plus haut = suit mieux
}
```

### Problème : Mauvaise position
**Solution** : Ajuster les calculs dans `FaceTracker.js`

```javascript
// Ligne ~180 dans calculateFacePose()
const rawPosition = {
  x: (leftEye.x + rightEye.x) / 2 / width,
  y: (leftEye.y + rightEye.y) / 2 / height,
  z: ((leftEye.z || 0) + (rightEye.z || 0)) / 2
};
```

## 🐛 Debug

### Activer le Panel Debug

Dans `js/config.js` :
```javascript
debug: {
  enabled: true,
  showLandmarks: true,
  logFPS: true
}
```

### Console Browser
```javascript
// Accéder à l'app
window.app

// Stats de performance
window.app.renderEngine.getStats()

// Info tracking
window.app.faceTracker.getAverageConfidence()

// Cache modèles
window.app.modelManager.getCacheInfo()
```

## 📊 Performances

### Objectifs
- **FPS** : 30+ (idéal 60)
- **Latence** : < 100ms
- **Confidence** : > 70%

### Optimisations

1. **Réduire la résolution vidéo**
```javascript
camera: {
  width: { ideal: 640 },
  height: { ideal: 480 }
}
```

2. **Simplifier les modèles 3D**
- Moins de polygones
- Textures compressées
- Format `.glb` optimisé

3. **Désactiver les ombres**
```javascript
// Dans RenderEngine.js
this.renderer.shadowMap.enabled = false;
```

## 🌐 Support WebXR

### Navigateurs Compatibles
- Chrome/Edge Android (ARCore)
- Safari iOS (ARKit) [limité]

### Activer WebXR

Le bouton "Mode AR" apparaît automatiquement si WebXR est supporté.

### Test sans appareil AR
Utiliser [WebXR Emulator](https://github.com/MozillaReality/WebXR-emulator-extension)
