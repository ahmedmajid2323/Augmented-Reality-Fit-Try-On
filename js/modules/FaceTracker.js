import { CONFIG, FACE_LANDMARKS, KALMAN } from "../config.js";
import {
  Vector3KalmanFilter,
  QuaternionKalmanFilter,
} from "./OptimizedKalmanFilter.js";
import { AutoScaleDetection } from "./AutoScaleDetection.js";

/**
 * FaceTracker - Système de tracking facial professionnel
 * Utilise MediaPipe Face Mesh avec filtres de Kalman optimisés
 */
export class FaceTracker {
  constructor() {
    this.detector = null;
    this.isInitialized = false;
    this.isTracking = false;

    // Canvas temporaire pour flip de la vidéo
    this.tempCanvas = document.createElement("canvas");
    this.tempCtx = this.tempCanvas.getContext("2d");

    // ✅ FILTRES KALMAN OPTIMISÉS (séparés par type de données)
    this.positionFilter = new Vector3KalmanFilter(
      KALMAN.position.processNoise,
      KALMAN.position.measurementNoise
    );

    this.rotationFilter = new QuaternionKalmanFilter(
      KALMAN.rotation.processNoise,
      KALMAN.rotation.measurementNoise
    );

    this.scaleFilter = new Vector3KalmanFilter(
      KALMAN.scale.processNoise,
      KALMAN.scale.measurementNoise
    );

    // Cache pour les landmarks précédents
    this.previousLandmarks = null;
    this.confidenceHistory = [];
    this.maxHistorySize = 30;

    // Compteur de frames pour stabilisation
    this.frameCount = 0;
    this.stabilizationComplete = false;

    // Métadonnées de performance
    this.performanceMetrics = {
      avgProcessTime: 0,
      processTimeHistory: [],
      detectionRate: 0,
      totalFrames: 0,
      successfulDetections: 0,
    };

    // Callbacks
    this.onFaceDetected = null;
    this.onFaceLost = null;
    this.onTrackingUpdate = null;
  }

  /**
   * Initialise le détecteur MediaPipe
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Configuration du backend TensorFlow
      await tf.setBackend("webgl");
      await tf.ready();

      // Création du détecteur MediaPipe Face Mesh
      this.detector = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        {
          runtime: "tfjs",
          refineLandmarks: CONFIG.faceMesh.refineLandmarks,
          maxFaces: CONFIG.faceMesh.maxNumFaces,
          minDetectionConfidence: CONFIG.faceMesh.minDetectionConfidence,
          minTrackingConfidence: CONFIG.faceMesh.minTrackingConfidence,
        }
      );

      this.isInitialized = true;
      console.log("[FaceTracker] ✅ Initialisé avec succès");
    } catch (error) {
      console.error("[FaceTracker] ❌ Erreur d'initialisation:", error);
      throw error;
    }
  }

  /**
   * Démarre le tracking
   */
  startTracking() {
    this.isTracking = true;
    this.frameCount = 0;
    this.stabilizationComplete = false;
    console.log("[FaceTracker] 🎬 Tracking démarré");
  }

  /**
   * Arrête le tracking
   */
  stopTracking() {
    this.isTracking = false;
    this.resetFilters();
    console.log("[FaceTracker] ⏸️ Tracking arrêté");
  }

  /**
   * Traite une frame vidéo
   * @param {HTMLVideoElement} video - Élément vidéo
   * @param {number} timestamp - Timestamp
   * @returns {Object|null} - Données de tracking ou null
   */
  async processFrame(video, timestamp = Date.now()) {
    if (!this.isInitialized || !this.isTracking) {
      return null;
    }

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      return null;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    const startTime = performance.now();

    try {
      // Flip horizontal de la vidéo
      this.tempCanvas.width = video.videoWidth;
      this.tempCanvas.height = video.videoHeight;

      this.tempCtx.save();
      this.tempCtx.scale(-1, 1);
      this.tempCtx.drawImage(
        video,
        -video.videoWidth,
        0,
        video.videoWidth,
        video.videoHeight
      );
      this.tempCtx.restore();

      // Détection des visages
      const faces = await this.detector.estimateFaces(this.tempCanvas, {
        flipHorizontal: false,
        staticImageMode: false,
      });

      // Métriques de performance
      const processTime = performance.now() - startTime;
      this.updatePerformanceMetrics(processTime, faces.length > 0);

      if (!faces || faces.length === 0) {
        this.handleFaceLost();
        return null;
      }

      const face = faces[0];
      this.frameCount++;

      // Calculer la pose 3D du visage
      const trackingData = this.calculateFacePose(
        face,
        video.videoWidth,
        video.videoHeight,
        timestamp
      );

      // Vérifier la stabilisation
      if (
        !this.stabilizationComplete &&
        this.frameCount >= CONFIG.tracking.stabilizationFrames
      ) {
        this.stabilizationComplete = true;
        console.log("[FaceTracker] 🎯 Stabilisation complète");
      }

      // Mettre à jour l'historique de confiance
      this.updateConfidenceHistory(trackingData.confidence);

      // Callback
      if (this.onTrackingUpdate) {
        this.onTrackingUpdate(trackingData);
      }

      return trackingData;
    } catch (error) {
      console.error("[FaceTracker] ❌ Erreur de traitement:", error);
      return null;
    }
  }

  /**
   * Calcule la pose 3D du visage à partir des landmarks
   */
  calculateFacePose(face, width, height, timestamp) {
    const keypoints = face.keypoints;

    // Points clés pour le calcul de la pose
    const leftEye = this.getAverageLandmark(keypoints, FACE_LANDMARKS.leftEye);
    const rightEye = this.getAverageLandmark(
      keypoints,
      FACE_LANDMARKS.rightEye
    );
    const nose = keypoints[FACE_LANDMARKS.noseTip];
    const mouthCenter = keypoints[FACE_LANDMARKS.mouthCenter];
    const forehead = this.getAverageLandmark(
      keypoints,
      FACE_LANDMARKS.forehead
    );

    // ===== POSITION =====
    const rawPosition = {
      x: forehead.x / width,
      y: forehead.y / height,
      z: ((leftEye.z || 0) + (rightEye.z || 0)) / 2,
    };

    const filteredPosition = this.positionFilter.filter(rawPosition);

    // ===== ROTATION =====
    const eyeCenterX = (leftEye.x + rightEye.x) / 2 / width;
    const noseX = nose.x / width;
    const eyeDistance = Math.abs(rightEye.x - leftEye.x) / width;
    const yaw =
      eyeDistance > 0
        ? ((noseX - eyeCenterX) / eyeDistance) * Math.PI * 0.5
        : 0;

    const eyeCenterY = (leftEye.y + rightEye.y) / 2 / height;
    const noseY = nose.y / height;
    const pitch = (noseY - eyeCenterY) * Math.PI * 0.3;

    const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

    const rawRotation = { x: pitch, y: yaw, z: roll };

    const quaternion = this.eulerToQuaternion(rawRotation);
    const filteredQuaternion = this.rotationFilter.filter(quaternion);
    const filteredRotation = this.quaternionToEuler(filteredQuaternion);

    // ===== ÉCHELLE =====
    const eyeDist = Math.sqrt(
      Math.pow((rightEye.x - leftEye.x) / width, 2) +
        Math.pow((rightEye.y - leftEye.y) / height, 2)
    );

    const rawScale = {
      x: eyeDist * 5,
      y: eyeDist * 5,
      z: eyeDist * 5,
    };

    const filteredScale = this.scaleFilter.filter(rawScale);

    // ===== CONFIANCE AVANCÉE =====
    const confidence = this.calculateAdvancedConfidence(
      face,
      leftEye,
      rightEye,
      eyeDistance
    );

    return {
      position: filteredPosition,
      rotation: filteredRotation,
      scale: filteredScale,
      confidence: confidence,
      rawPosition,
      rawRotation,
      timestamp,
      landmarks: {
        leftEye,
        rightEye,
        nose,
        mouthCenter,
        forehead,
      },
      rawKeypoints: keypoints,
      isStabilized: this.stabilizationComplete,
      frameCount: this.frameCount,
    };
  }

  /**
   * Calcul avancé de confiance avec multiples facteurs
   */
  calculateAdvancedConfidence(face, leftEye, rightEye, eyeDistance) {
    let confidence = 1.0;

    // Facteur 1: Nombre de landmarks (moins pénalisant)
    const landmarkCount = face.keypoints.length;
    if (landmarkCount >= 468) {
      confidence *= 1.0;
    } else if (landmarkCount >= 400) {
      confidence *= 0.95;
    } else {
      confidence *= 0.85;
    }

    // Facteur 2: Distance entre les yeux
    if (eyeDistance < 0.05) {
      confidence *= 0.85; // Trop loin
    } else if (eyeDistance > 0.3) {
      confidence *= 0.9; // Trop proche
    }

    // Facteur 3: Stabilité temporelle
    if (this.previousLandmarks) {
      const movement = this.calculateMovement(
        face.keypoints,
        this.previousLandmarks
      );
      if (movement > 0.15) {
        confidence *= 0.9; // Mouvement brusque
      } else if (movement > 0.1) {
        confidence *= 0.95;
      }
    }

    // Facteur 4: Historique de confiance
    const avgConfidence = this.getAverageConfidence();
    if (avgConfidence > 0 && Math.abs(confidence - avgConfidence) > 0.3) {
      confidence = confidence * 0.7 + avgConfidence * 0.3; // Lissage
    }

    // Facteur 5: Stabilisation initiale
    if (!this.stabilizationComplete) {
      const stabilizationProgress =
        this.frameCount / CONFIG.tracking.stabilizationFrames;
      confidence *= 0.6 + 0.4 * stabilizationProgress;
    }

    this.previousLandmarks = face.keypoints;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calcule le mouvement entre deux frames
   */
  calculateMovement(current, previous) {
    if (!previous || current.length !== previous.length) {
      return 0;
    }

    let totalDist = 0;
    const sampleSize = Math.min(20, current.length);

    for (let i = 0; i < sampleSize; i++) {
      const idx = Math.floor((i * current.length) / sampleSize);
      const dx = current[idx].x - previous[idx].x;
      const dy = current[idx].y - previous[idx].y;
      totalDist += Math.sqrt(dx * dx + dy * dy);
    }

    return totalDist / sampleSize;
  }

  /**
   * Met à jour l'historique de confiance
   */
  updateConfidenceHistory(confidence) {
    this.confidenceHistory.push(confidence);
    if (this.confidenceHistory.length > this.maxHistorySize) {
      this.confidenceHistory.shift();
    }
  }

  /**
   * Obtient la confiance moyenne
   */
  getAverageConfidence() {
    if (this.confidenceHistory.length === 0) return 0;
    const sum = this.confidenceHistory.reduce((a, b) => a + b, 0);
    return sum / this.confidenceHistory.length;
  }

  /**
   * Met à jour les métriques de performance
   */
  updatePerformanceMetrics(processTime, detected) {
    this.performanceMetrics.totalFrames++;
    if (detected) {
      this.performanceMetrics.successfulDetections++;
    }

    this.performanceMetrics.processTimeHistory.push(processTime);
    if (this.performanceMetrics.processTimeHistory.length > 60) {
      this.performanceMetrics.processTimeHistory.shift();
    }

    const sum = this.performanceMetrics.processTimeHistory.reduce(
      (a, b) => a + b,
      0
    );
    this.performanceMetrics.avgProcessTime =
      sum / this.performanceMetrics.processTimeHistory.length;
    this.performanceMetrics.detectionRate =
      this.performanceMetrics.successfulDetections /
      this.performanceMetrics.totalFrames;
  }

  /**
   * Obtient les métriques de performance
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      avgConfidence: this.getAverageConfidence(),
      isStabilized: this.stabilizationComplete,
      frameCount: this.frameCount,
    };
  }

  /**
   * Calcule la moyenne d'un ensemble de landmarks
   */
  getAverageLandmark(keypoints, indices) {
    if (!Array.isArray(indices)) {
      return keypoints[indices];
    }

    let sumX = 0,
      sumY = 0,
      sumZ = 0;
    indices.forEach((idx) => {
      const point = keypoints[idx];
      sumX += point.x;
      sumY += point.y;
      sumZ += point.z || 0;
    });

    const count = indices.length;
    return {
      x: sumX / count,
      y: sumY / count,
      z: sumZ / count,
    };
  }

  /**
   * Conversion Euler → Quaternion
   */
  eulerToQuaternion(euler) {
    const { x, y, z } = euler;

    const cy = Math.cos(y * 0.5);
    const sy = Math.sin(y * 0.5);
    const cp = Math.cos(x * 0.5);
    const sp = Math.sin(x * 0.5);
    const cr = Math.cos(z * 0.5);
    const sr = Math.sin(z * 0.5);

    return {
      w: cr * cp * cy + sr * sp * sy,
      x: sr * cp * cy - cr * sp * sy,
      y: cr * sp * cy + sr * cp * sy,
      z: cr * cp * sy - sr * sp * cy,
    };
  }

  /**
   * Conversion Quaternion → Euler
   */
  quaternionToEuler(q) {
    const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
    const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
    const roll = Math.atan2(sinr_cosp, cosr_cosp);

    const sinp = 2 * (q.w * q.y - q.z * q.x);
    const pitch =
      Math.abs(sinp) >= 1 ? (Math.sign(sinp) * Math.PI) / 2 : Math.asin(sinp);

    const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
    const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
    const yaw = Math.atan2(siny_cosp, cosy_cosp);

    return { x: pitch, y: yaw, z: roll };
  }

  /**
   * Gère la perte du visage
   */
  handleFaceLost() {
    if (this.onFaceLost) {
      this.onFaceLost();
    }
    this.previousLandmarks = null;
  }

  /**
   * Réinitialise les filtres
   */
  resetFilters() {
    this.positionFilter.reset();
    this.rotationFilter.reset();
    this.scaleFilter.reset();
    this.previousLandmarks = null;
    this.confidenceHistory = [];
    this.frameCount = 0;
    this.stabilizationComplete = false;
  }

  /**
   * Nettoie les ressources
   */
  dispose() {
    if (this.detector) {
      this.detector.dispose();
    }
    this.stopTracking();
    console.log("[FaceTracker] 🗑️ Ressources libérées");
  }
}
