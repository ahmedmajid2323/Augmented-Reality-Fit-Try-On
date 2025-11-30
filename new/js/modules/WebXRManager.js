import { CONFIG } from '../config.js';

/**
 * WebXRManager - Gère les sessions WebXR
 */
export class WebXRManager {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.session = null;
    this.referenceSpace = null;
    this.isSupported = false;
    this.isActive = false;
    
    this.onSessionStart = null;
    this.onSessionEnd = null;

    this.checkSupport();
  }

  /**
   * Vérifie si WebXR est supporté
   */
  async checkSupport() {
    if (!navigator.xr) {
      console.warn('[WebXRManager] WebXR non disponible');
      this.isSupported = false;
      return false;
    }

    try {
      this.isSupported = await navigator.xr.isSessionSupported(CONFIG.webxr.sessionMode);
      console.log(`[WebXRManager] Support WebXR: ${this.isSupported}`);
      return this.isSupported;
    } catch (error) {
      console.error('[WebXRManager] Erreur de vérification:', error);
      this.isSupported = false;
      return false;
    }
  }

  /**
   * Démarre une session WebXR
   */
  async startSession() {
    if (!this.isSupported) {
      throw new Error('WebXR n\'est pas supporté');
    }

    if (this.session) {
      console.warn('[WebXRManager] Une session est déjà active');
      return;
    }

    try {
      // Demander une session XR
      this.session = await navigator.xr.requestSession(
        CONFIG.webxr.sessionMode,
        {
          requiredFeatures: CONFIG.webxr.requiredFeatures,
          optionalFeatures: CONFIG.webxr.optionalFeatures
        }
      );

      // Configurer le renderer pour WebXR
      await this.renderer.xr.setSession(this.session);
      
      // Obtenir l'espace de référence
      this.referenceSpace = await this.session.requestReferenceSpace('local-floor');

      // Événements de session
      this.session.addEventListener('end', this.handleSessionEnd.bind(this));

      // Démarrer la boucle de rendu XR
      this.session.requestAnimationFrame(this.onXRFrame.bind(this));

      this.isActive = true;
      console.log('[WebXRManager] Session XR démarrée');

      if (this.onSessionStart) {
        this.onSessionStart();
      }

    } catch (error) {
      console.error('[WebXRManager] Erreur de démarrage de session:', error);
      throw error;
    }
  }

  /**
   * Callback de la boucle XR
   * @param {number} time - Timestamp
   * @param {XRFrame} frame - Frame XR
   */
  onXRFrame(time, frame) {
    const session = frame.session;

    // Demander la prochaine frame
    session.requestAnimationFrame(this.onXRFrame.bind(this));

    // Obtenir la pose du viewer
    const pose = frame.getViewerPose(this.referenceSpace);

    if (pose) {
      // Pour chaque vue (gauche et droite pour les casques VR)
      for (const view of pose.views) {
        const viewport = session.renderState.baseLayer.getViewport(view);
        this.renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);

        // Mettre à jour la caméra avec la matrice de vue
        this.camera.matrix.fromArray(view.transform.matrix);
        this.camera.projectionMatrix.fromArray(view.projectionMatrix);
        this.camera.updateMatrixWorld(true);

        // Rendu de la scène
        this.renderer.render(this.scene, this.camera);
      }
    }
  }

  /**
   * Gère la fin de la session
   */
  handleSessionEnd() {
    this.session = null;
    this.referenceSpace = null;
    this.isActive = false;

    console.log('[WebXRManager] Session XR terminée');

    if (this.onSessionEnd) {
      this.onSessionEnd();
    }
  }

  /**
   * Termine la session WebXR
   */
  async endSession() {
    if (!this.session) {
      return;
    }

    try {
      await this.session.end();
      console.log('[WebXRManager] Session XR fermée');
    } catch (error) {
      console.error('[WebXRManager] Erreur de fermeture:', error);
    }
  }

  /**
   * Obtient l'état de la session
   * @returns {Object} - État
   */
  getState() {
    return {
      isSupported: this.isSupported,
      isActive: this.isActive,
      hasSession: !!this.session
    };
  }

  /**
   * Nettoie les ressources
   */
  dispose() {
    if (this.session) {
      this.endSession();
    }
    console.log('[WebXRManager] Ressources libérées');
  }
}
