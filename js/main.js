import { CONFIG, PRODUCTS, DEBUG } from './config.js';
import { FaceTracker } from './modules/FaceTracker.js';
import { ModelManager } from './modules/ModelManager.js';
import { RenderEngine } from './modules/RenderEngine.js';
import { WebXRManager } from './modules/WebXRManager.js';

/**
 * Classe principale de l'application
 */
class ARFitTryApp {
  constructor() {
    // Éléments DOM
    this.elements = {
      loadingScreen: document.getElementById("loading-screen"),
      appContainer: document.getElementById("app-container"),
      errorScreen: document.getElementById("error-screen"),
      video: document.getElementById("webcam"),
      canvas: document.getElementById("ar-canvas"),
      loadingStatus: document.getElementById("loading-status"),
      progressFill: document.getElementById("progress-fill"),
      errorMessage: document.getElementById("error-message"),
      retryBtn: document.getElementById("retry-btn"),
      productGallery: document.getElementById("product-gallery"),
      tryOnControls: document.getElementById("try-on-controls"),
      backBtn: document.getElementById("back-btn"),
      captureBtn: document.getElementById("capture-btn"),
      switchCameraBtn: document.getElementById("switch-camera-btn"),
      xrButton: document.getElementById("xr-button"),
      trackingStatus: document.getElementById("tracking-status"),
      confidenceText: document.getElementById("confidence-text"),
      appTitle: document.getElementById("app-title"),
      debugPanel: document.getElementById("debug-panel"),
      debugContent: document.getElementById("debug-content"),
    };

    // Modules
    this.faceTracker = null;
    this.modelManager = null;
    this.renderEngine = null;
    this.webXRManager = null;

    // État
    this.state = {
      initialized: false,
      cameraActive: false,
      selectedProduct: null,
      tracking: false,
    };

    // Bind des méthodes
    this.handleProductSelect = this.handleProductSelect.bind(this);
    this.handleBack = this.handleBack.bind(this);
    this.handleCapture = this.handleCapture.bind(this);
    this.handleSwitchCamera = this.handleSwitchCamera.bind(this);
    this.handleRetry = this.handleRetry.bind(this);
    this.trackingLoop = this.trackingLoop.bind(this);
  }

  /**
   * Initialise l'application
   */
  async initialize() {
    try {
      console.log("[App] Initialisation...");

      // Enregistrer le Service Worker
      await this.registerServiceWorker();

      // Initialiser le gestionnaire de modèles
      this.updateLoadingStatus(
        "Initialisation du gestionnaire de modèles...",
        10
      );
      this.modelManager = new ModelManager();
      this.modelManager.onProgress = (url, progress) => {
        console.log(`Chargement: ${url} - ${progress}%`);
      };

      // Initialiser le moteur de rendu
      this.updateLoadingStatus("Initialisation du moteur 3D...", 30);
      this.renderEngine = new RenderEngine(this.elements.canvas);
      this.renderEngine.startRendering();

      // Initialiser le tracker facial
      this.updateLoadingStatus("Chargement du système de tracking...", 50);
      this.faceTracker = new FaceTracker();
      await this.faceTracker.initialize();

      // Configurer les callbacks
      this.faceTracker.onTrackingUpdate = (data) => {
        this.renderEngine.updateModelTransform(data);
        this.updateTrackingUI(data);
      };

      this.faceTracker.onFaceLost = () => {
        this.updateTrackingUI(null);
      };

      // Précharger les modèles
      this.updateLoadingStatus("Chargement des modèles 3D...", 70);
      // await this.modelManager.preloadCategory('head', (progress) => {
      //   this.updateLoadingStatus(
      //     `Chargement des modèles 3D... ${Math.round(progress)}%`,
      //     70 + progress * 0.2
      //   );
      // });
      try {
        await this.modelManager.preloadCategory("head", (progress) => {
          this.updateLoadingStatus(
            `Chargement des modèles 3D... ${Math.round(progress)}%`,
            70 + progress * 0.2
          );
        });
      } catch (error) {
        console.warn(
          "[App] Impossible de précharger les modèles, mode demo:",
          error
        );
        // Continuer quand même sans modèles
      }

      // Initialiser WebXR
      this.webXRManager = new WebXRManager(
        this.renderEngine.renderer,
        this.renderEngine.scene,
        this.renderEngine.camera
      );

      if (await this.webXRManager.checkSupport()) {
        this.elements.xrButton.classList.remove("hidden");
        this.elements.xrButton.addEventListener("click", () =>
          this.startXRSession()
        );
      }

      // Construire l'interface
      this.buildGallery();
      this.setupEventListeners();

      // Debug
      if (DEBUG.enabled) {
        this.elements.debugPanel.classList.remove("hidden");
        this.startDebugLoop();
      }

      this.state.initialized = true;
      this.updateLoadingStatus("Prêt !", 100);

      // Afficher l'application
      setTimeout(() => {
        this.elements.loadingScreen.classList.add("hidden");
        this.elements.appContainer.classList.remove("hidden");
      }, 500);

      console.log("[App] Initialisation terminée");
    } catch (error) {
      console.error("[App] Erreur d'initialisation:", error);
      this.showError(CONFIG.errors.generic + "\n" + error.message);
    }
  }

  /**
   * Enregistre le Service Worker
   */
  async registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      console.warn("[App] Service Worker non supporté");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register("./sw.js");
      console.log("[App] Service Worker enregistré:", registration.scope);
    } catch (error) {
      console.error("[App] Erreur d'enregistrement du SW:", error);
    }
  }

  /**
   * Construit la galerie de produits
   */
  buildGallery() {
    const galleryScroll =
      this.elements.productGallery.querySelector(".gallery-scroll");
    galleryScroll.innerHTML = "";

    PRODUCTS.forEach((product) => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.dataset.productId = product.id;

      card.innerHTML = `
        <div class="product-image">
          <img src="${product.thumbnail}" alt="${product.name}" />
        </div>
        <div class="product-info">
          <h3 class="product-name">${product.name}</h3>
          <p class="product-price">$${product.price}</p>
        </div>
      `;

      card.addEventListener("click", () => this.handleProductSelect(product));
      galleryScroll.appendChild(card);
    });
  }

  /**
   * Configure les écouteurs d'événements
   */
  setupEventListeners() {
    this.elements.backBtn.addEventListener("click", this.handleBack);
    this.elements.captureBtn.addEventListener("click", this.handleCapture);
    this.elements.switchCameraBtn.addEventListener(
      "click",
      this.handleSwitchCamera
    );
    this.elements.retryBtn.addEventListener("click", this.handleRetry);
  }

  /**
   * Gère la sélection d'un produit
   */
  async handleProductSelect(product) {
    try {
      console.log("[App] Produit sélectionné:", product.name);

      // Charger le modèle
      const model = await this.modelManager.loadModel(product.modelUrl);
      const preparedModel = this.modelManager.prepareModel(model, product);

      // Démarrer la caméra si ce n'est pas déjà fait
      if (!this.state.cameraActive) {
        await this.startCamera();

        // ✅ AJOUTER: Attendre 1 seconde que la caméra se stabilise
        console.log("[App] Attente de stabilisation de la caméra...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Définir le modèle dans le moteur de rendu
      this.renderEngine.setModel(preparedModel);

      // ✅ AJOUTER: Vérifier que la vidéo affiche bien quelque chose
      console.log(
        "[App] Résolution vidéo:",
        this.elements.video.videoWidth,
        "x",
        this.elements.video.videoHeight
      );

      // Démarrer le tracking
      this.faceTracker.startTracking();
      this.state.tracking = true;
      requestAnimationFrame(this.trackingLoop);

      // Mettre à jour l'UI
      this.state.selectedProduct = product;
      this.elements.productGallery.classList.add("hidden");
      this.elements.tryOnControls.classList.remove("hidden");
      this.elements.backBtn.classList.remove("hidden");
      this.elements.appTitle.textContent = product.name;
    } catch (error) {
      console.error("[App] Erreur de sélection:", error);
      this.showError(CONFIG.errors.modelLoad);
    }
  }

  /**
   * Démarre la caméra
   */
  async startCamera() {
    try {
      console.log("[App] Demande d'accès caméra...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: CONFIG.camera,
      });

      this.elements.video.srcObject = stream;

      // ✅ AJOUTER: Attendre que la vidéo soit vraiment prête
      await new Promise((resolve) => {
        this.elements.video.onloadedmetadata = () => {
          console.log("[App] Métadonnées vidéo chargées");
          resolve();
        };
      });

      await this.elements.video.play();

      // ✅ AJOUTER: Log des infos vidéo
      console.log(
        "[App] Vidéo dimensions:",
        this.elements.video.videoWidth,
        this.elements.video.videoHeight
      );
      console.log("[App] Vidéo readyState:", this.elements.video.readyState);

      this.state.cameraActive = true;
      console.log("[App] Caméra démarrée");
    } catch (error) {
      console.error("[App] Erreur caméra:", error);
      throw new Error(CONFIG.errors.cameraAccess);
    }
  }

  /**
   * Boucle de tracking
   */
  async trackingLoop() {
    if (!this.state.tracking) {
      // console.log('⚠️ Tracking arrêté');  // ❌ SUPPRIMER
      return;
    }

    if (
      this.elements.video.readyState === this.elements.video.HAVE_ENOUGH_DATA
    ) {
      const trackingData = await this.faceTracker.processFrame(
        this.elements.video,
        performance.now()
      );

      // ❌ SUPPRIMER TOUS CES LOGS:
      // if (trackingData) {
      //   console.log('✅ Tracking actif, confidence:', trackingData.confidence);
      // } else {
      //   console.log('❌ Aucun visage détecté');
      // }
    }

    requestAnimationFrame(this.trackingLoop);
  }

  /**
   * Met à jour l'UI de tracking
   */
  updateTrackingUI(data) {
    if (!data) {
      this.elements.confidenceText.textContent = "Perdu";
      this.elements.trackingStatus
        .querySelector(".indicator-dot")
        .classList.remove("tracking-active");
      return;
    }

    const confidence = Math.round(data.confidence * 100);
    this.elements.confidenceText.textContent = `${confidence}%`;

    const indicatorDot =
      this.elements.trackingStatus.querySelector(".indicator-dot");
    if (data.confidence > 0.7) {
      indicatorDot.classList.add("tracking-active");
    } else {
      indicatorDot.classList.remove("tracking-active");
    }
  }

  /**
   * Gère le retour à la galerie
   */
  handleBack() {
    this.faceTracker.stopTracking();
    this.state.tracking = false;
    this.renderEngine.setModel(null);

    this.elements.productGallery.classList.remove("hidden");
    this.elements.tryOnControls.classList.add("hidden");
    this.elements.backBtn.classList.add("hidden");
    this.elements.appTitle.textContent = "Choisissez un accessoire";

    this.state.selectedProduct = null;
  }

  /**
   * Capture une photo
   */
  handleCapture() {
    const imageData = this.renderEngine.captureImage();

    // Créer un lien de téléchargement
    const link = document.createElement("a");
    link.download = `ar-try-on-${Date.now()}.png`;
    link.href = imageData;
    link.click();

    console.log("[App] Photo capturée");
  }

  /**
   * Change de caméra
   */
  async handleSwitchCamera() {
    // TODO: Implémenter le changement de caméra
    console.log("[App] Changement de caméra non implémenté");
  }

  /**
   * Démarre une session WebXR
   */
  async startXRSession() {
    try {
      await this.webXRManager.startSession();
      console.log("[App] Session XR démarrée");
    } catch (error) {
      console.error("[App] Erreur XR:", error);
      alert(CONFIG.errors.webxrNotSupported);
    }
  }

  /**
   * Met à jour le statut de chargement
   */
  updateLoadingStatus(message, progress) {
    this.elements.loadingStatus.textContent = message;
    this.elements.progressFill.style.width = `${progress}%`;
  }

  /**
   * Affiche une erreur
   */
  showError(message) {
    this.elements.errorMessage.textContent = message;
    this.elements.loadingScreen.classList.add("hidden");
    this.elements.errorScreen.classList.remove("hidden");
  }

  /**
   * Gère le bouton réessayer
   */
  handleRetry() {
    window.location.reload();
  }

  /**
   * Démarre la boucle de debug
   */
  startDebugLoop() {
    setInterval(() => {
      const stats = this.renderEngine.getStats();
      const trackingConf = this.faceTracker.getAverageConfidence();

      document.getElementById("fps").textContent = stats.fps;
      document.getElementById("landmark-count").textContent =
        this.faceTracker.previousLandmarks?.length || 0;
      document.getElementById("debug-confidence").textContent = Math.round(
        trackingConf * 100
      );

      if (this.renderEngine.currentModel) {
        const pos = this.renderEngine.currentModel.position;
        const rot = this.renderEngine.currentModel.rotation;
        document.getElementById(
          "debug-position"
        ).textContent = `${pos.x.toFixed(2)}, ${pos.y.toFixed(
          2
        )}, ${pos.z.toFixed(2)}`;
        document.getElementById(
          "debug-rotation"
        ).textContent = `${rot.x.toFixed(2)}, ${rot.y.toFixed(
          2
        )}, ${rot.z.toFixed(2)}`;
      }
    }, 100);
  }

  /**
   * Nettoie les ressources
   */
  dispose() {
    if (this.faceTracker) this.faceTracker.dispose();
    if (this.modelManager) this.modelManager.dispose();
    if (this.renderEngine) this.renderEngine.dispose();
    if (this.webXRManager) this.webXRManager.dispose();

    if (this.elements.video.srcObject) {
      this.elements.video.srcObject
        .getTracks()
        .forEach((track) => track.stop());
    }
  }
}

// Démarrage de l'application
window.addEventListener('DOMContentLoaded', () => {
  const app = new ARFitTryApp();
  app.initialize();

  // Nettoyer lors de la fermeture
  window.addEventListener('beforeunload', () => {
    app.dispose();
  });

  // Exposer l'app pour le debug
  window.app = app;
});
