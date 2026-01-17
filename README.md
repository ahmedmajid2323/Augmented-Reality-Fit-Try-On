# 🎯 AR-FitTry Head - Virtual Try-On

Application web progressive (PWA) pour l'essayage virtuel d'accessoires de tête  en réalité augmentée.


---

## 📝 Description

AR-FitTry Head permet aux utilisateurs d'essayer virtuellement des chapeaux et des lunettes en temps réel via leur webcam. L'application utilise l'intelligence artificielle pour détecter le visage et positionner automatiquement les accessoires 3D de manière réaliste.

**Cas d'usage:**
- E-commerce de mode 
- Essayage virtuel avant achat
- Application de divertissement AR
- Démonstration de technologie AR

---

## ✨ Caractéristiques

### 🎭 Essayage Virtuel
- **Tracking facial en temps réel** avec 468 points de détection
- **Positionnement automatique** selon le type d'accessoire
- **Suivi des mouvements** (rotation, translation, échelle)
- **Performance optimisée** 30-60 FPS

### 🏷️ Catégories de Produits
- **Chapeaux** : Positionnés sur le sommet de la tête
- **Lunettes** : Positionnées au niveau des yeux avec offset devant le visage

### 🎨 Interface Utilisateur
- **Galerie par catégories** avec scroll horizontal
- **Interface responsive** adaptée mobile/desktop
- **Contrôles intuitifs** (capture photo, retour, changement caméra)

### ⚡ Performance
- **PWA (Progressive Web App)** : Fonctionne hors ligne
- **Cache intelligent** des modèles 3D
- **Rendu optimisé** avec Three.js
- **Filtrage Kalman** pour stabilité du tracking

---

## 🏗️ Architecture

```
Ar-FitTry/
│
├── index.html                    # Point d'entrée
├── manifest.json                 # Configuration PWA
├── sw.js                        # Service Worker
│
├── css/
│   └── style.css                # Styles de l'application
│
├── js/
│   ├── config.js                # Configuration centrale
│   ├── main.js                  # Orchestrateur principal
│   │
│   └── modules/
│       ├── FaceTracker.js       # Détection faciale (MediaPipe)
│       ├── PreciseTracker.js    # Calcul transformation 3D
│       ├── AutoFitter.js        # Placement selon catégorie
│       ├── ModelManager.js      # Gestion modèles 3D
│       ├── RenderEngine.js      # Rendu Three.js
│       ├── FaceMeshDebug.js     # Visualisation debug
│       └── WebXRManager.js      # Support WebXR 
│
├── models/head/
│   ├── *.glb                    # Modèles 3D des produits
│
└── assets/
    ├── icons/                   # Icônes PWA
    └── images/                  # Miniatures produits
```

### 🧩 Modules Principaux

**FaceTracker** : Utilise MediaPipe pour détecter 468 points faciaux en temps réel

**PreciseTracker** : Convertit les points 2D en transformation 3D (position, rotation, échelle)

**AutoFitter** : Place intelligemment les modèles selon leur catégorie (chapeaux vs lunettes)

**RenderEngine** : Gère le rendu 3D avec Three.js (scène, caméra, lumières)

**ModelManager** : Charge et met en cache les modèles 3D (.glb)

---

## 🛠️ Technologies Utilisées

### Frontend
- **HTML5 / CSS3 / JavaScript ES6+**
- **Three.js** `v0.158.0` - Rendu 3D
- **TensorFlow.js** `v4.13.0` - Backend ML
- **MediaPipe Face Mesh** `v1.0.2` - Détection faciale (468 landmarks)

### Formats 3D
- **GLTF 2.0 (.glb)** - Modèles 3D optimisés

### APIs Web
- **WebRTC** - Accès caméra
- **WebGL 2.0** - Rendu GPU
- **WebXR Device API** - Mode AR immersif 

### PWA
- **Service Worker** - Cache et mode offline
- **Web App Manifest** - Installation sur mobile

---

## ⚙️ Configuration

### Fichier `js/config.js`

#### Caméra
```javascript
export const CONFIG = {
  camera: {
    width: { ideal: 1280 },      // Résolution largeur
    height: { ideal: 720 },      // Résolution hauteur
    frameRate: { ideal: 30 },    // FPS
    facingMode: "user"           // Caméra frontale
  }
}
```

#### MediaPipe
```javascript
faceMesh: {
  maxNumFaces: 1,                // Nombre de visages
  refineLandmarks: true,         // Détection précise
  minDetectionConfidence: 0.7,   // Confiance détection (70%)
  minTrackingConfidence: 0.7     // Confiance suivi (70%)
}
```

#### Catalogue de Produits
```javascript
export const PRODUCTS = {
  hats: [
    {
      id: "winter-hat-001",
      name: "Bonnet Hiver",
      category: "hat",
      price: 24.99,
      modelUrl: "./models/head/winter_hat.glb",
      thumbnail: "./assets/images/winter_hat_thumb.jpg"
    }
  ],
  
  glasses: [
    {
      id: "sunglasses-001",
      name: "Lunettes de Soleil",
      category: "glasses",
      price: 79.99,
      modelUrl: "./models/head/sunglasses.glb",
      thumbnail: "./assets/images/sunglasses_thumb.jpg"
    }
  ]
}
```


## 🚀 Installation & Démarrage

### Prérequis
- Serveur HTTPS (obligatoire pour WebRTC)
- Navigateur compatible :
  - Chrome 90+
  - Firefox 88+
  - Safari 14.1+
  - Edge 90+

### Option 1 : Serveur Local (Node.js)

```bash
# Installer http-server
npm install -g http-server

# Démarrer avec HTTPS
http-server -S -C cert.pem -K key.pem -p 8080
```

### Option 2 : Live Server (VS Code)

1. Installer l'extension "Live Server"
2. Activer HTTPS dans les paramètres
3. Clic droit sur `index.html` → "Open with Live Server"

### Accès
Ouvrir `https://localhost:8080`

---

## 🎮 Utilisation

1. **Ouvrir l'application** dans le navigateur
2. **Autoriser l'accès** à la webcam
3. **Choisir une catégorie** 
4. **Cliquer sur un produit** pour l'essayer
5. **Bouger la tête** pour voir l'accessoire suivre vos mouvements
6. **Capturer une photo** avec le bouton 📸
7. **Retour** pour essayer un autre produit

---



