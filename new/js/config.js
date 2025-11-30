// Configuration AR-FitTryV3
export const CONFIG = {
  camera: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
    facingMode: "user",
  },

  faceMesh: {
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
  },

  rendering: {
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  },
};

// Debug activé par défaut
export const DEBUG = {
  enabled: true,
};

// Landmarks MediaPipe Face Mesh (468 points)
export const FACE_LANDMARKS = {
  leftEye: [33, 133, 160, 159, 158, 144, 145, 153],
  rightEye: [362, 263, 387, 386, 385, 373, 374, 380],
  forehead: [10, 67, 109, 338, 297],
  noseTip: 1,
};

// Produits
export const PRODUCTS = [
  {
    id: "winter-hat-001",
    name: "Bonnet Hiver",
    price: 24.99,
    modelUrl: "./models/head/bucket_hat.glb",
    thumbnail: "./assets/images/winter_hat_thumb.jpg",
  }
];
