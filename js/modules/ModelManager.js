import { PRODUCTS } from "../config.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as THREE from "three";

/**
 * ModelManager - Gestionnaire de modèles 3D professionnel
 * Gère le chargement, le cache, le préchargement et l'optimisation des modèles
 */
export class ModelManager {
  constructor() {
    this.loader = new GLTFLoader();
    this.cache = new Map();
    this.loadingProgress = new Map();
    this.onProgress = null;

    // Statistiques
    this.stats = {
      totalLoaded: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalLoadTime: 0,
    };
  }

  /**
   * Charge un modèle 3D avec gestion du cache
   */
  async loadModel(url, onProgress = null) {
    const loadStart = performance.now();

    // Vérifier le cache
    if (this.cache.has(url)) {
      console.log(`[ModelManager] 💾 Cache HIT: ${url}`);
      this.stats.cacheHits++;
      return this.cache.get(url).clone();
    }

    this.stats.cacheMisses++;

    // Vérifier si déjà en cours de chargement
    if (this.loadingProgress.has(url)) {
      console.log(`[ModelManager] ⏳ Chargement en cours: ${url}`);
      return this.loadingProgress.get(url);
    }

    // Créer une nouvelle promesse de chargement
    const loadPromise = new Promise((resolve, reject) => {
      this.loader.load(
        url,
        // onLoad
        (gltf) => {
          const model = gltf.scene;

          // Optimiser le modèle
          this.optimizeModel(model);

          // Mettre en cache
          this.cache.set(url, model);
          this.loadingProgress.delete(url);

          // Statistiques
          const loadTime = performance.now() - loadStart;
          this.stats.totalLoaded++;
          this.stats.totalLoadTime += loadTime;

          console.log(
            `[ModelManager] ✅ Modèle chargé: ${url} (${loadTime.toFixed(0)}ms)`
          );
          resolve(model.clone());
        },

        // onProgress
        (xhr) => {
          const percentComplete = (xhr.loaded / xhr.total) * 100;

          if (percentComplete % 10 < 1 || percentComplete === 100) {
            console.log(
              `[ModelManager] 📥 ${url}: ${percentComplete.toFixed(0)}%`
            );
          }

          if (onProgress) {
            onProgress(percentComplete);
          }

          if (this.onProgress) {
            this.onProgress(url, percentComplete);
          }
        },

        // onError
        (error) => {
          console.error(`[ModelManager] ❌ Erreur chargement ${url}:`, error);
          this.loadingProgress.delete(url);
          reject(error);
        }
      );
    });

    this.loadingProgress.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Optimise un modèle 3D pour de meilleures performances
   */
  optimizeModel(model) {
    let meshCount = 0;
    let vertexCount = 0;

    model.traverse((child) => {
      if (child.isMesh) {
        meshCount++;

        // Compter les vertices
        if (child.geometry) {
          vertexCount += child.geometry.attributes.position.count;
        }

        // Optimisations des matériaux
        if (child.material) {
          // Double-sided pour éviter les problèmes de culling
          child.material.side = THREE.DoubleSide;

          // Désactiver les ombres (améliore les performances)
          child.castShadow = false;
          child.receiveShadow = false;

          // Frustum culling activé
          child.frustumCulled = true;

          // Forcer la mise à jour du matériau
          child.material.needsUpdate = true;
        }

        // Optimiser la géométrie
        if (child.geometry) {
          // Calculer les normales si nécessaire
          if (!child.geometry.attributes.normal) {
            child.geometry.computeVertexNormals();
          }

          // Calculer la bounding sphere pour un culling efficace
          child.geometry.computeBoundingSphere();
        }
      }
    });

    console.log(
      `[ModelManager] 🔧 Optimisé: ${meshCount} meshes, ${vertexCount} vertices`
    );
  }

  /**
   * Précharge plusieurs modèles en parallèle
   */
  async preloadModels(urls, onProgress = null) {
    const total = urls.length;
    let loaded = 0;

    console.log(`[ModelManager] 📦 Préchargement de ${total} modèles...`);

    const promises = urls.map((url) =>
      this.loadModel(url, (progress) => {
        if (onProgress) {
          const globalProgress = ((loaded + progress / 100) / total) * 100;
          onProgress(globalProgress);
        }
      })
        .then((model) => {
          loaded++;
          if (onProgress) {
            onProgress((loaded / total) * 100);
          }
          return model;
        })
        .catch((error) => {
          console.error(`[ModelManager] ❌ Échec préchargement ${url}:`, error);
          loaded++;
          if (onProgress) {
            onProgress((loaded / total) * 100);
          }
          return null;
        })
    );

    const results = await Promise.allSettled(promises);
    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value !== null
    ).length;

    console.log(
      `[ModelManager] ✅ Préchargement terminé: ${successful}/${total} modèles`
    );

    return results.map((r) => (r.status === "fulfilled" ? r.value : null));
  }

  /**
   * Précharge tous les produits d'une catégorie
   */
  async preloadCategory(category = "head", onProgress = null) {
    const products = PRODUCTS;
    const urls = products.map((p) => p.modelUrl);

    console.log(
      `[ModelManager] 📂 Préchargement catégorie "${category}": ${urls.length} modèles`
    );

    try {
      await this.preloadModels(urls, onProgress);
      console.log(`[ModelManager] ✅ Catégorie "${category}" préchargée`);
    } catch (error) {
      console.error(`[ModelManager] ❌ Erreur préchargement catégorie:`, error);
      throw error;
    }
  }

  /**
   * Prépare un modèle pour le rendu AR
   * (N'applique PAS l'échelle - sera calculée automatiquement)
   */
  prepareModel(model, productConfig) {
    // Appliquer la rotation de base (si elle existe)
    if (productConfig.rotation) {
      model.rotation.set(
        productConfig.rotation.x,
        productConfig.rotation.y,
        productConfig.rotation.z
      );
    }

    // Stocker la configuration dans userData
    model.userData = {
      productConfig: productConfig,
      baseScale: productConfig.scale || { x: 1, y: 1, z: 1 },
      baseRotation: productConfig.rotation || { x: 0, y: 0, z: 0 },
      offset: productConfig.offset || { x: 0, y: 0, z: 0 },
      preparedAt: Date.now(),
    };

    console.log(`[ModelManager] 🎨 Modèle préparé: ${productConfig.name}`);

    return model;
  }

  /**
   * Obtient les informations du cache
   */
  getCacheInfo() {
    return {
      size: this.cache.size,
      models: Array.from(this.cache.keys()),
      stats: {
        ...this.stats,
        hitRate:
          (this.stats.cacheHits /
            (this.stats.cacheHits + this.stats.cacheMisses)) *
          100,
        avgLoadTime: this.stats.totalLoadTime / this.stats.totalLoaded,
      },
    };
  }

  /**
   * Obtient les statistiques de performance
   */
  getStats() {
    const cacheInfo = this.getCacheInfo();
    return {
      modelsLoaded: this.stats.totalLoaded,
      cacheSize: this.cache.size,
      hitRate: cacheInfo.stats.hitRate.toFixed(1) + "%",
      avgLoadTime: cacheInfo.stats.avgLoadTime.toFixed(0) + "ms",
    };
  }

  /**
   * Vide le cache
   */
  clearCache() {
    this.cache.forEach((model) => {
      this.disposeModel(model);
    });
    this.cache.clear();
    console.log("[ModelManager] 🗑️ Cache vidé");
  }

  /**
   * Libère les ressources d'un modèle
   */
  disposeModel(model) {
    model.traverse((child) => {
      if (child.isMesh) {
        // Libérer la géométrie
        if (child.geometry) {
          child.geometry.dispose();
        }

        // Libérer les matériaux
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => this.disposeMaterial(mat));
          } else {
            this.disposeMaterial(child.material);
          }
        }
      }
    });
  }

  /**
   * Libère les ressources d'un matériau
   */
  disposeMaterial(material) {
    // Libérer toutes les textures
    Object.keys(material).forEach((key) => {
      const value = material[key];
      if (value && typeof value === "object" && "minFilter" in value) {
        value.dispose();
      }
    });

    material.dispose();
  }

  /**
   * Nettoie toutes les ressources
   */
  dispose() {
    this.clearCache();
    console.log("[ModelManager] 🗑️ Ressources libérées");
  }
}
