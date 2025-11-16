// src/managers/ModelCache.js
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
  }

  async loadModel(url, category) {
    if (this.memoryCache.has(url)) {
      return this.memoryCache.get(url).clone();
    }

    const cached = await this.db.get("models", url);
    if (cached) {
      const model = await this.parseGLB(cached.blob);
      this.memoryCache.set(url, model);
      return model.clone();
    }

    const model = await this.downloadModel(url);
    this.memoryCache.set(url, model);
    await this.saveToDB(url, category);
    return model.clone();
  }

  async downloadModel(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
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
      // Silent fail
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
