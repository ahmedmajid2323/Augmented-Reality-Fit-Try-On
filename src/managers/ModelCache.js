import { openDB } from "idb";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

export class ModelCache {
  constructor() {
    this.dbName = "ar-fittry-models";
    this.db = null;
    this.memoryCache = new Map();
    this.loader = new GLTFLoader();
  }

  async initialize() {
    this.db = await openDB(this.dbName, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("models")) {
          const store = db.createObjectStore("models", { keyPath: "url" });
          store.createIndex("timestamp", "timestamp");
        }
      },
    });
    console.log("✅ Model cache initialized");
  }

  async loadModel(url, category) {
    // 1. Check memory cache
    if (this.memoryCache.has(url)) {
      console.log("📦 Model from memory:", url);
      return this.memoryCache.get(url).clone();
    }

    // 2. Check IndexedDB
    const cached = await this.db.get("models", url);
    if (cached) {
      console.log("💾 Model from IndexedDB:", url);
      const model = await this.parseGLB(cached.blob);
      this.memoryCache.set(url, model);
      return model.clone();
    }

    // 3. Download and cache
    console.log("🌐 Downloading model:", url);
    const model = await this.downloadModel(url);

    this.memoryCache.set(url, model);
    await this.saveToDB(url, category);

    return model.clone();
  }

  async downloadModel(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => resolve(gltf.scene),
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100;
          console.log(`Loading: ${percent.toFixed(0)}%`);
        },
        reject
      );
    });
  }

  async saveToDB(url, category) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();

      await this.db.put("models", {
        url,
        category,
        blob,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Failed to cache model:", error);
    }
  }

  async parseGLB(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    return new Promise((resolve, reject) => {
      this.loader.parse(arrayBuffer, "", (gltf) => resolve(gltf.scene), reject);
    });
  }

  clearMemoryCache() {
    this.memoryCache.clear();
  }
}
