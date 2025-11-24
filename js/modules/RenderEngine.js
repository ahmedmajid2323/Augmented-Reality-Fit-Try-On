import { CONFIG, TRACKING, DEBUG } from "../config.js";
import * as THREE from "three";
import { DebugPanel } from "./DebugPanel.js";
import { AutoScaleDetection } from "./AutoScaleDetection.js";

/**
 * RenderEngine - Moteur de rendu 3D professionnel avec Three.js
 * Gère le rendu, l'auto-scale, et l'optimisation des performances
 */
export class RenderEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.currentModel = null;
    this.isRendering = false;
    this.animationFrameId = null;

    // Debug panel
    this.debugPanel = null;
    this.lastTrackingData = null;

    // Auto-scale cache
    this.autoScaleCache = null;
    this.autoScaleFrameCount = 0;

    // Statistiques
    this.stats = {
      fps: 0,
      frameCount: 0,
      lastTime: performance.now(),
      frameTimeHistory: [],
      avgFrameTime: 0,
    };

    // Performance monitoring
    this.performanceMode = "high"; // high, medium, low

    this.initialize();
  }

  /**
   * Initialise le moteur de rendu
   */
  initialize() {
    // Création de la scène
    this.scene = new THREE.Scene();
    this.scene.background = null; // Transparent

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Création de la caméra
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 2;

    // Création du renderer avec optimisations
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: CONFIG.rendering.antialias,
      powerPreference: CONFIG.rendering.powerPreference,
      preserveDrawingBuffer: CONFIG.rendering.preserveDrawingBuffer,
      stencil: CONFIG.rendering.stencil,
      depth: CONFIG.rendering.depth,
    });

    this.renderer.setSize(width, height);
    this.canvas.width = width;
    this.canvas.height = height;
    this.renderer.setPixelRatio(CONFIG.rendering.pixelRatio);

    // Configuration de l'espace colorimétrique
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Optimisations
    this.renderer.sortObjects = true;
    this.renderer.shadowMap.enabled = false;

    // Configuration de l'éclairage
    this.setupLights();

    // Debug panel
    if (DEBUG.enabled==false) {
      this.debugPanel = new DebugPanel();
      console.log("[RenderEngine] 🐛 Debug panel activé");
    }

    // Gestion du redimensionnement
    window.addEventListener("resize", this.handleResize.bind(this));

    console.log("[RenderEngine] ✅ Initialisé avec succès");
  }

  /**
   * Configure l'éclairage optimisé de la scène
   */
  setupLights() {
    // Lumière ambiante (éclairage général)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambientLight);

    // Lumière directionnelle principale
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 10, 7.5);
    mainLight.castShadow = false;
    this.scene.add(mainLight);

    // Lumière de remplissage
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-5, 0, -5);
    this.scene.add(fillLight);

    // Lumière d'appoint
    const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
    backLight.position.set(0, 5, -10);
    this.scene.add(backLight);

    console.log("[RenderEngine] 💡 Éclairage configuré");
  }

  /**
   * Définit le modèle 3D à rendre
   */
  setModel(model) {
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      this.autoScaleCache = null;
      this.autoScaleFrameCount = 0;
    }

    this.currentModel = model;

    if (model) {
      this.scene.add(model);
      console.log("[RenderEngine] 🎨 Modèle ajouté à la scène");
    }
  }

  /**
   * Met à jour la transformation du modèle basée sur le tracking
   */
  updateModelTransform(trackingData) {
    if (!this.currentModel || !trackingData) {
      return;
    }

    const {
      position,
      rotation,
      scale,
      confidence,
      rawKeypoints,
      isStabilized,
    } = trackingData;

    // ===== AUTO-SCALE CALCULATION =====
    // Calculer l'échelle automatiquement (une fois ou périodiquement)
    if (
      (!this.autoScaleCache || this.shouldRecalculateScale()) &&
      rawKeypoints &&
      isStabilized
    ) {
      const video = document.getElementById("webcam");
      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        const productType =
          this.currentModel.userData.productConfig?.type || "hat";

        try {
          this.autoScaleCache = AutoScaleDetection.getAutoScaleForModel(
            this.currentModel,
            rawKeypoints,
            video.videoWidth,
            video.videoHeight,
            productType
          );

          if (DEBUG.enabled && DEBUG.logAutoScale) {
            console.log("🎯 Auto-Scale recalculé:", this.autoScaleCache.scale);
          }
        } catch (error) {
          console.error("[RenderEngine] ❌ Erreur calcul auto-scale:", error);
          this.autoScaleCache = {
            scale: { x: 0.003, y: 0.003, z: 0.003 },
          };
        }
      }
    }

    this.autoScaleFrameCount++;

    const baseOffset = this.currentModel.userData.offset || {
      x: 0,
      y: 0,
      z: 0,
    };

    // Utiliser l'échelle auto-calculée
    const finalScale = this.autoScaleCache
      ? this.autoScaleCache.scale
      : { x: 0.003, y: 0.003, z: 0.003 };

    // ===== POSITION =====
    this.currentModel.position.set(
      (position.x - 0.5) * TRACKING.positionMultiplier + baseOffset.x,
      -(position.y - 0.5) * TRACKING.positionMultiplier + baseOffset.y,
      TRACKING.depthOffset + baseOffset.z
    );

    // ===== ROTATION =====
    const baseRotation = this.currentModel.userData.baseRotation || {
      x: 0,
      y: 0,
      z: 0,
    };

    this.currentModel.rotation.set(
      rotation.x + baseRotation.x,
      -rotation.y + baseRotation.y,
      Math.PI - rotation.z + baseRotation.z
    );

    // ===== ÉCHELLE AUTOMATIQUE =====
    this.currentModel.scale.set(-finalScale.x, -finalScale.y, finalScale.z);

    // ===== VISIBILITÉ BASÉE SUR LA CONFIANCE =====
    this.currentModel.visible = confidence > TRACKING.confidenceThreshold;

    // Sauvegarder pour le debug
    this.lastTrackingData = trackingData;
  }

  /**
   * Vérifie si l'auto-scale doit être recalculé
   */
  shouldRecalculateScale() {
    return AutoScaleDetection.shouldRecalculate(this.autoScaleFrameCount);
  }

  /**
   * Démarre la boucle de rendu
   */
  startRendering() {
    if (this.isRendering) {
      return;
    }

    this.isRendering = true;
    this.animate();
    console.log("[RenderEngine] ▶️ Rendu démarré");
  }

  /**
   * Boucle d'animation optimisée
   */
  animate() {
    if (!this.isRendering) {
      return;
    }

    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const frameStart = performance.now();

    // Rendu de la scène
    this.renderer.render(this.scene, this.camera);

    // Calcul du FPS
    this.updateStats(frameStart);

    // Mise à jour du debug panel
    if (this.debugPanel && this.lastTrackingData && this.currentModel) {
      this.updateDebugPanel();
    }

    // Monitoring des performances
    if (CONFIG.performance.adaptiveQuality) {
      this.adaptQuality();
    }
  }

  /**
   * Met à jour les statistiques de performance
   */
  updateStats(frameStart) {
    this.stats.frameCount++;
    const now = performance.now();
    const frameTime = now - frameStart;
    const delta = now - this.stats.lastTime;

    // Calculer le frame time moyen
    this.stats.frameTimeHistory.push(frameTime);
    if (this.stats.frameTimeHistory.length > 60) {
      this.stats.frameTimeHistory.shift();
    }
    const sum = this.stats.frameTimeHistory.reduce((a, b) => a + b, 0);
    this.stats.avgFrameTime = sum / this.stats.frameTimeHistory.length;

    // Calculer le FPS toutes les secondes
    if (delta >= 1000) {
      this.stats.fps = Math.round((this.stats.frameCount * 1000) / delta);
      this.stats.frameCount = 0;
      this.stats.lastTime = now;

      if (DEBUG.logFPS) {
        console.log(
          `[RenderEngine] ⚡ FPS: ${
            this.stats.fps
          } | Frame Time: ${this.stats.avgFrameTime.toFixed(2)}ms`
        );
      }
    }
  }

  /**
   * Met à jour le panneau de debug
   */
  updateDebugPanel() {
    const video = document.getElementById("webcam");

    // Calculer isWellFitted si auto-scale existe
    let isWellFitted = false;
    if (this.autoScaleCache && this.autoScaleCache.headDimensions) {
      isWellFitted = AutoScaleDetection.isScaleValid(this.autoScaleCache);
    }

    this.debugPanel.update({
      // Face Tracking
      facePosition: this.lastTrackingData.position,
      faceRotation: this.lastTrackingData.rotation,
      faceScale: this.lastTrackingData.scale,
      confidence: this.lastTrackingData.confidence,
      landmarkCount: this.lastTrackingData.rawKeypoints ? 478 : 0,

      // Model Transform
      modelPosition: this.currentModel.position,
      modelRotation: this.currentModel.rotation,
      modelScale: this.currentModel.scale,
      modelVisible: this.currentModel.visible,

      // Video
      videoWidth: video ? video.videoWidth : 0,
      videoHeight: video ? video.videoHeight : 0,
      videoReady: video ? video.readyState === 4 : false,

      // Performance
      fps: this.stats.fps,
      avgFrameTime: this.stats.avgFrameTime,

      // Camera
      cameraFOV: this.camera.fov,
      cameraPosition: this.camera.position,

      // Head Metrics (si disponible)
      headMetrics: this.autoScaleCache?.headDimensions || null,
      isWellFitted: isWellFitted,
    });
  }

  /**
   * Adapte la qualité selon les performances
   */
  adaptQuality() {
    if (this.stats.avgFrameTime > CONFIG.performance.maxFrameTime) {
      // Performance dégradée
      if (this.performanceMode === "high") {
        this.performanceMode = "medium";
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        console.warn("[RenderEngine] ⚠️ Mode performance: MEDIUM");
      } else if (
        this.performanceMode === "medium" &&
        this.stats.avgFrameTime > CONFIG.performance.maxFrameTime * 1.5
      ) {
        this.performanceMode = "low";
        this.renderer.setPixelRatio(1);
        console.warn("[RenderEngine] ⚠️ Mode performance: LOW");
      }
    } else if (
      this.stats.avgFrameTime <
      CONFIG.performance.maxFrameTime * 0.7
    ) {
      // Performance bonne, restaurer qualité
      if (this.performanceMode === "low") {
        this.performanceMode = "medium";
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        console.log("[RenderEngine] ✅ Mode performance: MEDIUM");
      } else if (
        this.performanceMode === "medium" &&
        this.stats.avgFrameTime < CONFIG.performance.maxFrameTime * 0.5
      ) {
        this.performanceMode = "high";
        this.renderer.setPixelRatio(CONFIG.rendering.pixelRatio);
        console.log("[RenderEngine] ✅ Mode performance: HIGH");
      }
    }
  }

  /**
   * Arrête la boucle de rendu
   */
  stopRendering() {
    this.isRendering = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    console.log("[RenderEngine] ⏸️ Rendu arrêté");
  }

  /**
   * Gère le redimensionnement de la fenêtre
   */
  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.canvas.width = width;
    this.canvas.height = height;

    console.log(`[RenderEngine] 📐 Redimensionné: ${width}x${height}`);
  }

  /**
   * Capture une image de la scène
   */
  captureImage() {
    return this.renderer.domElement.toDataURL("image/png");
  }

  /**
   * Obtient les statistiques de performance
   */
  getStats() {
    return {
      fps: this.stats.fps,
      avgFrameTime: this.stats.avgFrameTime,
      performanceMode: this.performanceMode,
      renderer: {
        drawCalls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
        points: this.renderer.info.render.points,
        lines: this.renderer.info.render.lines,
      },
      memory: {
        geometries: this.renderer.info.memory.geometries,
        textures: this.renderer.info.memory.textures,
      },
    };
  }

  /**
   * Active/désactive le mode debug
   */
  setDebugMode(enabled) {
    if (enabled) {
      const axesHelper = new THREE.AxesHelper(1);
      axesHelper.name = "axesHelper";
      this.scene.add(axesHelper);

      if (this.currentModel) {
        const boxHelper = new THREE.BoxHelper(this.currentModel, 0x00ff00);
        boxHelper.name = "boxHelper";
        this.scene.add(boxHelper);
      }
    } else {
      const helpers = this.scene.children.filter(
        (child) => child.name === "axesHelper" || child.name === "boxHelper"
      );
      helpers.forEach((helper) => this.scene.remove(helper));
    }
  }

  /**
   * Nettoie toutes les ressources
   */
  dispose() {
    this.stopRendering();

    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      this.currentModel = null;
    }

    if (this.debugPanel) {
      this.debugPanel.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }

    window.removeEventListener("resize", this.handleResize);

    console.log("[RenderEngine] 🗑️ Ressources libérées");
  }
}
