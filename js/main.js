import { FaceTracker } from "./modules/FaceTracker.js";
import { ModelManager } from "./modules/ModelManager.js";
import { RenderEngine } from "./modules/RenderEngine.js";
import { PreciseTracker } from "./modules/PreciseTracker.js";
import { AutoFitter } from "./modules/AutoFitter.js";
import { PRODUCTS } from "./config.js";

/**
 * ARFitTryApp - Application principale
 */
class ARFitTryApp {
  constructor() {
    // DOM
    this.elements = {
      loadingScreen: document.getElementById("loading-screen"),
      appContainer: document.getElementById("app-container"),
      video: document.getElementById("webcam"),
      canvas: document.getElementById("ar-canvas"),
      loadingStatus: document.getElementById("loading-status"),
      productGallery: document.getElementById("product-gallery"),
      tryOnControls: document.getElementById("try-on-controls"),
      backBtn: document.getElementById("back-btn"),
      captureBtn: document.getElementById("capture-btn"),
    };

    // Modules
    this.faceTracker = new FaceTracker();
    this.modelManager = new ModelManager();
    this.renderEngine = new RenderEngine(this.elements.canvas);
    this.preciseTracker = new PreciseTracker();
    this.autoFitter = new AutoFitter();

    // State
    this.currentModel = null;
    this.isTracking = false;
    this.currentTransform = null;

    // Bind methods
    this.trackingLoop = this.trackingLoop.bind(this);
    this.handleBack = this.handleBack.bind(this);
    this.handleCapture = this.handleCapture.bind(this);
  }

  /**
   * Initialise l'application
   */
  async initialize() {
    try {
      this.updateLoadingStatus("Initialisation Face Tracker...", 30);
      await this.faceTracker.initialize();

      this.updateLoadingStatus("Initialisation Render Engine...", 60);
      this.renderEngine.startRendering();

      this.updateLoadingStatus("Construction galerie...", 90);
      this.buildGallery();
      this.setupEventListeners();

      this.updateLoadingStatus("Prêt!", 100);

      setTimeout(() => {
        this.elements.loadingScreen.classList.add("hidden");
        this.elements.appContainer.classList.remove("hidden");
      }, 500);

      console.log("[App] ✅ Initialized");
    } catch (error) {
      console.error("[App] ❌ Initialization error:", error);
      this.updateLoadingStatus("Erreur: " + error.message, 0);
    }
  }

  /**
   * Construit la galerie de produits
   */
  buildGallery() {
    const gallery =
      this.elements.productGallery.querySelector(".gallery-scroll");
    gallery.innerHTML = "";

    PRODUCTS.forEach((product) => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.innerHTML = `
                <div class="product-image">
                    <img src="${product.thumbnail}" alt="${product.name}">
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-price">$${product.price}</p>
                </div>
            `;
      card.addEventListener("click", () => this.selectProduct(product));
      gallery.appendChild(card);
    });
  }

  /**
   * Configure les event listeners
   */
  setupEventListeners() {
    this.elements.backBtn.addEventListener("click", this.handleBack);
    this.elements.captureBtn.addEventListener("click", this.handleCapture);
  }

  /**
   * Sélectionne un produit
   */
  async selectProduct(product) {
    try {
      console.log("[App] Loading product:", product.name);

      // Charger le modèle
      const model = await this.modelManager.loadModel(product.modelUrl);

      // Préparer le modèle avec AutoFitter
      const prepared = this.autoFitter.prepareModel(model);
      this.currentModel = prepared.model;

      // Ajouter à la scène
      this.renderEngine.setModel(this.currentModel);

      // Démarrer caméra si nécessaire
      if (!this.isTracking) {
        await this.startCamera();
        this.startTracking();
      }

      // UI
      this.elements.productGallery.classList.add("hidden");
      this.elements.tryOnControls.classList.remove("hidden");
      this.elements.backBtn.classList.remove("hidden");

      console.log("[App] ✅ Product loaded and ready");
    } catch (error) {
      console.error("[App] ❌ Product selection error:", error);
      alert("Erreur de chargement du modèle: " + error.message);
    }
  }

  /**
   * Démarre la caméra
   */
  async startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
      });

      this.elements.video.srcObject = stream;

      // Attendre que la vidéo soit prête
      await new Promise((resolve) => {
        this.elements.video.onloadedmetadata = () => {
          resolve();
        };
      });

      await this.elements.video.play();

      console.log("[App] 📹 Camera started");
      console.log(
        "[App] Video size:",
        this.elements.video.videoWidth,
        "x",
        this.elements.video.videoHeight
      );
    } catch (error) {
      console.error("[App] ❌ Camera error:", error);
      alert("Impossible d'accéder à la caméra: " + error.message);
      throw error;
    }
  }

  /**
   * Démarre le tracking
   */
  startTracking() {
    this.isTracking = true;
    this.faceTracker.startTracking();
    console.log("[App] 🎬 Tracking started");

    // Démarrer la boucle
    requestAnimationFrame(this.trackingLoop);
  }

  /**
   * Boucle de tracking principale
   */
  async trackingLoop() {
    if (!this.isTracking) {
      return;
    }

    // Détecter le visage
    const faceData = await this.faceTracker.processFrame(
      this.elements.video,
      performance.now()
    );

    if (faceData && faceData.rawKeypoints && this.currentModel) {
      // Calculer la transformation avec PreciseTracker
      const transform = this.preciseTracker.calculateTransform(
        faceData.rawKeypoints,
        this.elements.video.videoWidth,
        this.elements.video.videoHeight
      );

      if (transform) {
        // 🔥 IMPORTANT: Appliquer la transformation au modèle
        this.autoFitter.applyTransform(this.currentModel, transform);

        // Sauvegarder 
        this.currentTransform = transform;
      }
    }

    // Continuer la boucle
    requestAnimationFrame(this.trackingLoop);
  }

  /**
   * Retour à la galerie
   */
  handleBack() {
    // Arrêter le tracking
    this.isTracking = false;
    this.faceTracker.stopTracking();

    // Retirer le modèle
    this.renderEngine.setModel(null);
    this.currentModel = null;
    this.currentTransform = null;

    // Reset tracker
    this.preciseTracker.reset();

    // UI
    this.elements.productGallery.classList.remove("hidden");
    this.elements.tryOnControls.classList.add("hidden");
    this.elements.backBtn.classList.add("hidden");

    console.log("[App] ⬅️ Back to gallery");
  }

  /**
   * Capture une photo
   */
  handleCapture() {
    const imageData = this.renderEngine.captureImage();

    const link = document.createElement("a");
    link.download = `ar-try-on-${Date.now()}.png`;
    link.href = imageData;
    link.click();

    console.log("[App] 📸 Photo captured");
  }

  /**
   * Met à jour le statut de chargement
   */
  updateLoadingStatus(message, progress) {
    this.elements.loadingStatus.textContent = message;
    const progressBar = document.getElementById("progress-fill");
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
  }

  /**
   * Nettoie les ressources
   */
  dispose() {
    this.isTracking = false;

    if (this.faceTracker) this.faceTracker.dispose();
    if (this.renderEngine) this.renderEngine.dispose();
    if (this.modelManager) this.modelManager.dispose();

    if (this.elements.video.srcObject) {
      this.elements.video.srcObject
        .getTracks()
        .forEach((track) => track.stop());
    }

    console.log("[App] 🗑️ Resources disposed");
  }
}

// 🚀 Démarrage de l'application
window.addEventListener("DOMContentLoaded", () => {
  const app = new ARFitTryApp();
  app.initialize();

  // Nettoyer à la fermeture
  window.addEventListener("beforeunload", () => {
    app.dispose();
  });

  // Exposer pour debug
  window.app = app;

  console.log("[App] 🎯 Application ready");
});
