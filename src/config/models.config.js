// Product catalog - your e-commerce items
export const MODELS_CONFIG = {
  head: [
    {
      id: "hat-001",
      name: "Baseball Cap",
      price: 29.99,
      modelUrl: "/models/head/cap.glb",
      thumbnail: "/thumbnails/head/cap.jpg",
      scale: { x: 0.05, y: 0.05, z: 0.05 },
      offset: { x: 0, y: 0.15, z: 0 },
    },
    {
      id: "glasses-001",
      name: "Sunglasses",
      price: 149.99,
      modelUrl: "/models/head/sunglasses.glb",
      thumbnail: "/thumbnails/head/sunglasses.jpg",
      scale: { x: 3, y: 3, z: 3 },
      offset: { x: 0, y: 0.05, z: 0.1 },
    },
  ],
  hand: [
    {
      id: "ring-001",
      name: "Gold Ring",
      price: 599.99,
      modelUrl: "/models/hand/gold-ring.glb",
      thumbnail: "/thumbnails/hand/ring.jpg",
      scale: { x: 0.8, y: 0.8, z: 0.8 },
      offset: { x: 0, y: 0, z: 0 },
    },
    {
      id: "watch-001",
      name: "Smart Watch",
      price: 399.99,
      modelUrl: "/models/hand/watch.glb",
      thumbnail: "/thumbnails/hand/watch.jpg",
      scale: { x: 1.0, y: 1.0, z: 1.0 },
      offset: { x: 0, y: -0.05, z: 0 },
    },
  ],
  foot: [
    {
      id: "shoe-001",
      name: "Running Sneakers",
      price: 129.99,
      modelUrl: "/models/foot/sneakers.glb",
      thumbnail: "/thumbnails/foot/sneakers.jpg",
      scale: { x: 1.0, y: 1.0, z: 1.0 },
      offset: { x: 0, y: -0.3, z: 0 },
    },
  ],
};
