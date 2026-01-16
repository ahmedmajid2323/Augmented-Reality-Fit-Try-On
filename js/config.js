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

  // 🔥 NEW – Ears (for headphones)
  leftEar: [234],
  rightEar: [454],

  // Optional: head width reference
  headSides: [234, 454],
};

// Produits
export const PRODUCTS = [
  {
    id: "winter-hat-001",
    name: "Bonnet Hiver",
    price: 24.99,
    modelUrl: "./models/head/bucket_hat.glb",
    thumbnail: "./assets/images/winter_hat_thumb.jpg",
  },
  {
    id: "glasse-001",
    name: "Glasses Classic",
    price: 28.99,
    modelUrl: "./models/head/lunettes_a_montures_maronne.glb",
    thumbnail: "./assets/images/sunglasses_thumb.jpg",
  },

  // 🎧 NEW – Headphones
  {
    id: "headphones-001",
    name: "Casque Audio",
    price: 149.99,
    modelUrl: "./models/head/headphones.glb",
    thumbnail: "./assets/images/headphones_thumb.jpg",

    // Optional metadata (future-proof)
    type: "headphones",
    category: "audio",
  },
];
