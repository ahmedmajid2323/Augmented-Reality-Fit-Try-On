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
    this.currentProductType = null;

    // Bind
    this.trackingLoop = this.trackingLoop.bind(this);
    this.handleBack = this.handleBack.bind(this);
    this.handleCapture = this.handleCapture.bind(this);
  }

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

  setupEventListeners() {
    this.elements.backBtn.addEventListener("click", this.handleBack);
    this.elements.captureBtn.addEventListener("click", this.handleCapture);
  }

  /**
   * Détection du type de produit (glasses / headphones / hat)
   */
  detectProductType(product) {
    const name = product.name.toLowerCase();
    const id = product.id.toLowerCase();

    if (
      name.includes("glasse") ||
      name.includes("sunglass") ||
      name.includes("lunette") ||
      id.includes("glasse") ||
      id.includes("glass")
    ) {
      this.currentProductType = "glasses";
      console.log("[App] 🕶️ Product type detected: glasses");

    } else if (
      name.includes("headphone") ||
      name.includes("headset") ||
      name.includes("earphone") ||
      id.includes("headphone") ||
      id.includes("headset")
    ) {
      this.currentProductType = "headphones";
      console.log("[App] 🎧 Product type detected: headphones");

    } else {
      this.currentProductType = "hat";
      console.log("[App] 🧢 Product type detected: hat");
    }
  }

  async selectProduct(product) {
    try {
      console.log("[App] Loading product:", product.name);

      this.detectProductType(product);

      const model = await this.modelManager.loadModel(product.modelUrl);
      const prepared = this.autoFitter.prepareModel(
        model,
        this.currentProductType
      );
      this.currentModel = prepared.model;

      this.renderEngine.setModel(this.currentModel);

      if (!this.isTracking) {
        await this.startCamera();
        this.startTracking();
      }

      this.elements.productGallery.classList.add("hidden");
      this.elements.tryOnControls.classList.remove("hidden");
      this.elements.backBtn.classList.remove("hidden");

      console.log("[App] ✅ Product loaded");
    } catch (error) {
      console.error("[App] ❌ Product error:", error);
      alert("Erreur de chargement du modèle");
    }
  }

  async startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
      },
    });

    this.elements.video.srcObject = stream;

    await new Promise((resolve) => {
      this.elements.video.onloadedmetadata = resolve;
    });

    await this.elements.video.play();
    console.log("[App] 📹 Camera started");
  }

  startTracking() {
    this.isTracking = true;
    this.faceTracker.startTracking();
    requestAnimationFrame(this.trackingLoop);
    console.log("[App] 🎬 Tracking started");
  }

  async trackingLoop() {
    if (!this.isTracking) return;

    const faceData = await this.faceTracker.processFrame(
      this.elements.video,
      performance.now()
    );

    if (faceData && faceData.rawKeypoints && this.currentModel) {
      const transform = this.preciseTracker.calculateTransform(
        faceData.rawKeypoints,
        this.elements.video.videoWidth,
        this.elements.video.videoHeight,
        this.currentProductType
      );

      if (transform) {
        this.autoFitter.applyTransform(
          this.currentModel,
          transform,
          this.currentProductType
        );
        this.currentTransform = transform;
      }
    }

    requestAnimationFrame(this.trackingLoop);
  }

  handleBack() {
    this.isTracking = false;
    this.faceTracker.stopTracking();

    this.renderEngine.setModel(null);
    this.currentModel = null;
    this.currentTransform = null;
    this.currentProductType = null;

    this.preciseTracker.reset();

    this.elements.productGallery.classList.remove("hidden");
    this.elements.tryOnControls.classList.add("hidden");
    this.elements.backBtn.classList.add("hidden");

    console.log("[App] ⬅️ Back to gallery");
  }

  handleCapture() {
    const imageData = this.renderEngine.captureImage();
    const link = document.createElement("a");
    link.download = `ar-try-on-${Date.now()}.png`;
    link.href = imageData;
    link.click();
  }

  updateLoadingStatus(message, progress) {
    this.elements.loadingStatus.textContent = message;
    const bar = document.getElementById("progress-fill");
    if (bar) bar.style.width = `${progress}%`;
  }

  dispose() {
    this.isTracking = false;

    this.faceTracker?.dispose();
    this.renderEngine?.dispose();
    this.modelManager?.dispose();

    if (this.elements.video.srcObject) {
      this.elements.video.srcObject.getTracks().forEach((t) => t.stop());
    }

    console.log("[App] 🗑️ Disposed");
  }
}

/* 🚀 App bootstrap */
window.addEventListener("DOMContentLoaded", () => {
  const app = new ARFitTryApp();
  app.initialize();

  window.addEventListener("beforeunload", () => app.dispose());
  window.app = app;

  console.log("[App] 🎯 Application ready");
});
