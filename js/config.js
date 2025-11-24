// Configuration globale optimisée de l'application AR-FitTry
export const CONFIG = {
  // ===== CONFIGURATION CAMÉRA =====
  camera: {
    width: { ideal: 1920, max: 1920 },
    height: { ideal: 1080, max: 1080 },
    frameRate: { ideal: 30, max: 30 },
    facingMode: "user",
    // Optimisations pour meilleure détection
    advanced: [
      {
        exposureMode: "continuous",
        whiteBalanceMode: "continuous",
        focusMode: "continuous",
      },
    ],
  },

  // ===== CONFIGURATION MEDIAPIPE FACE MESH =====
  faceMesh: {
    maxNumFaces: 1,
    refineLandmarks: true,
    // ✅ OPTIMISÉ: Balance entre précision et performance
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6,
  },

  // ===== CONFIGURATION KALMAN FILTER (ULTRA-OPTIMISÉ) =====
  kalman: {
    // Position tracking
    position: {
      processNoise: 4.0, // Q - Réactivité aux mouvements
      measurementNoise: 0.015, // R - Confiance aux mesures
      smoothing: 0.85, // Lissage temporel
    },

    // Rotation tracking
    rotation: {
      processNoise: 3.5,
      measurementNoise: 0.02,
      smoothing: 0.9,
    },

    // Scale tracking
    scale: {
      processNoise: 2.0, // Moins réactif pour éviter resize brusques
      measurementNoise: 0.025,
      smoothing: 0.88,
    },
  },

  // ===== CONFIGURATION RENDU THREE.JS =====
  rendering: {
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
    pixelRatio: Math.min(window.devicePixelRatio, 2),
    // Optimisations supplémentaires
    preserveDrawingBuffer: false,
    stencil: false,
    depth: true,
    logarithmicDepthBuffer: false,
  },

  // ===== AUTO-SCALE DETECTION =====
  autoScale: {
    enabled: true,
    baseScale: 0.0018, // Échelle de référence calibrée
    eyeDistanceReference: 100, // Pixels de référence
    adaptiveFactor: 1.0, // Multiplicateur d'adaptation
    minScale: 0.0005, // Limites de sécurité
    maxScale: 0.01,
    recalculateInterval: 30, // Recalculer tous les N frames
  },

  // ===== TRACKING AVANCÉ =====
  tracking: {
    positionMultiplier: 8, // Sensibilité position
    depthOffset: -3.2, // Profondeur Z
    confidenceThreshold: 0.5, // Seuil de confiance minimum
    stabilizationFrames: 5, // Frames pour stabilisation
    lostTrackingTimeout: 1000, // ms avant reset
  },

  // ===== POINTS DE REPÈRE FACIAUX =====
  faceLandmarks: {
    // Yeux (pour IPD et tracking)
    leftEye: [33, 133, 160, 159, 158, 144, 145, 153],
    rightEye: [362, 263, 387, 386, 385, 373, 374, 380],

    // Sourcils
    leftEyebrow: [70, 63, 105, 66, 107],
    rightEyebrow: [336, 296, 334, 293, 300],

    // Nez
    noseTip: 1,
    noseBridge: [6, 168],

    // Bouche
    mouthCenter: 13,
    lips: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291],

    // Contour du visage
    faceOval: [
      10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
      378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
      162, 21, 54, 103, 67, 109,
    ],

    // Tempes (pour largeur tête)
    leftTemple: 234,
    rightTemple: 454,

    // Front (pour casquettes)
    forehead: [10, 67, 109, 338, 297],
    topOfHead: 10,

    // Joues (pour morphologie)
    leftCheek: 205,
    rightCheek: 425,
  },

  // ===== CATALOGUE DE PRODUITS =====
  products: {
    head: [
      {
        id: "cap-001",
        name: "Casquette Baseball",
        price: 29.99,
        modelUrl: "../models/head/cap.glb",
        thumbnail: "../assets/images/cap_thumb.svg",
        type: "hat",
        //  PAS DE SCALE - Calculé automatiquement
        offset: { x: 0, y: 0.15, z: -0.15 },
        rotation: { x: 0, y: Math.PI, z: 0 },
        // Métadonnées pour l'auto-fitting
        fitting: {
          targetHeadCoverage: 0.65, // 65% de la tête
          heightRatio: 0.4, // 40% de hauteur de tête
          widthPadding: 1.1, // 10% plus large
        },
      },
    ],
  },

  // ===== CONFIGURATION DEBUG =====
  debug: {
    enabled: true,
    showLandmarks: false,
    showBoundingBox: false,
    logFPS: true,
    logAutoScale: true,
    logConfidence: false,
    showPerformanceMetrics: true,
  },

  // ===== PERFORMANCE =====
  performance: {
    targetFPS: 60,
    adaptiveQuality: true, // Réduire qualité si FPS bas
    maxFrameTime: 33, // ms (30 FPS minimum)
    gpuAcceleration: true,
  },

  // ===== MESSAGES D'ERREUR =====
  errors: {
    cameraAccess:
      "Impossible d'accéder à la caméra. Veuillez autoriser l'accès.",
    modelLoad: "Erreur lors du chargement du modèle 3D.",
    webxrNotSupported: "WebXR n'est pas supporté sur ce navigateur.",
    faceNotDetected: "Aucun visage détecté. Positionnez-vous face à la caméra.",
    lowConfidence: "Tracking instable. Améliorez l'éclairage.",
    generic: "Une erreur s'est produite. Veuillez réessayer.",
  },
};

// ===== EXPORTS UTILES =====
export const FACE_LANDMARKS = CONFIG.faceLandmarks;
export const PRODUCTS = CONFIG.products.head;
export const DEBUG = CONFIG.debug;
export const KALMAN = CONFIG.kalman;
export const AUTO_SCALE = CONFIG.autoScale;
export const TRACKING = CONFIG.tracking;
