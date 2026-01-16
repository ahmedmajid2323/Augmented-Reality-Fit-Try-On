import * as THREE from "three";

/**
 * PreciseTracker - Tracking ultra-précis avec compensation perspective
 */
export class PreciseTracker {
  constructor() {
    this.previousLandmarks = null;
    this.previousScale = null;
    this.smoothingFactor = 0.3;
    this.scaleSmoothingFactor = 0.7; // Plus = plus stable (0.5 à 0.9)
  }

  /**
   * Méthode générique qui choisit la bonne transformation selon le type
   */
  calculateTransform(keypoints, videoWidth, videoHeight, productType = "hat") {
    if (!keypoints || keypoints.length < 468) {
      return null;
    }
    
    // Choisir la méthode selon le type de produit
    if (productType === "glasses") {
      return this.calculateGlassesTransform(keypoints, videoWidth, videoHeight);
    } else {
      // Méthode originale pour les chapeaux
      return this.calculateHatTransform(keypoints, videoWidth, videoHeight);
    }
  }

  /**
   * Transformation pour les CHAPEAUX (ancienne méthode renommée)
   */
  calculateHatTransform(keypoints, videoWidth, videoHeight) {
    if (!keypoints || keypoints.length < 468) {
      return null;
    }

    // Points clés
    const leftEye = this.getAverage(keypoints, [33, 133, 160, 159]);
    const rightEye = this.getAverage(keypoints, [362, 263, 387, 386]);
    const forehead = this.getAverage(keypoints, [10, 67, 109, 338, 297]);
    const nose = keypoints[1];

    // ===== 1️⃣ ROTATION D'ABORD (nécessaire pour compensation yaw) =====
    const rotation = this.calculateHatRotation(leftEye, rightEye, nose);

    // ===== 2️⃣ SCALE avec compensation yaw =====
    let scale = this.calculateScaleWithYawCompensation(
      leftEye,
      rightEye,
      rotation.y
    );

    // 🔥 Lissage du scale
    if (this.previousScale !== null) {
      scale =
        this.previousScale * this.scaleSmoothingFactor +
        scale * (1 - this.scaleSmoothingFactor);
    }
    this.previousScale = scale;

    // ===== 3️⃣ POSITION (avec scale pour compensation perspective) =====
    const position = this.calculateHatPosition(
      forehead,
      scale,
      videoWidth,
      videoHeight
    );

    // Lissage position
    if (this.previousLandmarks) {
      position.lerp(this.previousLandmarks.position, this.smoothingFactor);
    }

    this.previousLandmarks = { position: position.clone() };

    return { position, rotation, scale };
  }

  /**
   * 🕶️ Transformation spécifique pour LUNETTES
   * Utilise le nez comme point d'ancrage et les yeux pour le scale
   */
  calculateGlassesTransform(keypoints, videoWidth, videoHeight) {
    if (!keypoints || keypoints.length < 468) {
      return null;
    }
    
    // 🔍 Points clés pour les lunettes:
    // - Pont du nez (ancrage principal)
    // - Yeux (pour la largeur et rotation)
    const noseBridge = this.getAverage(keypoints, [168, 197]); // Haut du nez
    const leftEye = keypoints[33];  // Coin interne œil gauche
    const rightEye = keypoints[263]; // Coin interne œil droit
    
    // ===== 1️⃣ ROTATION (basée sur l'axe des yeux) =====
    const rotation = this.calculateGlassesRotation(leftEye, rightEye, noseBridge);
    
    // ===== 2️⃣ SCALE (basé sur la distance entre les yeux) =====
    let scale = this.calculateGlassesScale(leftEye, rightEye);
    
    // Lissage du scale (même que pour les chapeaux)
    if (this.previousScale !== null) {
      scale = this.previousScale * this.scaleSmoothingFactor + 
              scale * (1 - this.scaleSmoothingFactor);
    }
    this.previousScale = scale;
    
    // ===== 3️⃣ POSITION (basée sur le pont du nez) =====
    const position = this.calculateGlassesPosition(
      noseBridge, 
      scale, 
      videoWidth, 
      videoHeight
    );
    
    // Lissage position
    if (this.previousLandmarks) {
      position.lerp(this.previousLandmarks.position, this.smoothingFactor);
    }
    
    this.previousLandmarks = { position: position.clone() };
    
    return { position, rotation, scale };
  }

  /**
   * Position 3D avec compensation perspective (pour chapeaux)
   */
  calculateHatPosition(forehead, scale, videoWidth, videoHeight) {
    // Normaliser (0-1)
    const normX = forehead.x / videoWidth;
    const normY = forehead.y / videoHeight;

    // Centrer (-0.5 à 0.5)
    const centeredX = normX - 0.5;
    const centeredY = normY - 0.5;

    // Z calculé depuis l'échelle
    const worldZ = -(1 / scale);

    // Compensation perspective
    const perspectiveFactor = (2 + Math.abs(worldZ)) / 2;

    const worldX = -centeredX * 2 * perspectiveFactor;
    const worldY = -centeredY * 2 * perspectiveFactor;

    return new THREE.Vector3(worldX, worldY, worldZ);
  }

  /**
   * Rotation de la tête (pitch, yaw, roll) - pour chapeaux
   */
  calculateHatRotation(leftEye, rightEye, nose) {
    const eyeCenterX = (leftEye.x + rightEye.x) / 2;
    const eyeCenterY = (leftEye.y + rightEye.y) / 2;

    const eyeDist = Math.sqrt(
      Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2)
    );

    const yaw = ((nose.x - eyeCenterX) / eyeDist) * 0.5;
    const pitch = ((nose.y - eyeCenterY) / eyeDist) * 0.3;
    const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

    return new THREE.Euler(pitch, Math.PI + yaw, -roll, "XYZ");
  }

  /**
   * Rotation spécifique pour lunettes
   * Basée sur la ligne des yeux
   */
  calculateGlassesRotation(leftEye, rightEye, noseBridge) {
    // Calcule l'angle de la ligne entre les yeux
    const eyeVectorX = rightEye.x - leftEye.x;
    const eyeVectorY = rightEye.y - leftEye.y;
    
    // Roll (inclinaison latérale) - angle de la ligne des yeux
    const roll = Math.atan2(eyeVectorY, eyeVectorX);
    
    // Pour les lunettes, on suit surtout le roll
    // Pitch très léger basé sur la position des yeux par rapport au nez
    const pitch = ((leftEye.y + rightEye.y) / 2 - noseBridge.y) / 100 * 0.1;
    const yaw = Math.PI; // Rotation de base pour faire face à la caméra
    
    return new THREE.Euler(pitch, yaw, -roll, "XYZ");
  }

  /**
   * Scale basé sur la distance interpupillaire (IPD)
   */
  calculateGlassesScale(leftEye, rightEye) {
    // Distance entre les yeux en pixels
    const eyeDistance = Math.sqrt(
      Math.pow(rightEye.x - leftEye.x, 2) + 
      Math.pow(rightEye.y - leftEye.y, 2)
    );
    
    // IPD moyen adulte: ~62-64mm
    // On normalise pour avoir un scale autour de 1
    const normalizedScale = eyeDistance / 62;
    
    // Les lunettes sont généralement plus petites que les chapeaux
    return normalizedScale * 0.1; // Réduire de moitié
  }

  /**
   * Position basée sur le pont du nez
   */
  calculateGlassesPosition(noseBridge, scale, videoWidth, videoHeight) {
    // Normaliser (0-1)
    const normX = noseBridge.x / videoWidth;
    const normY = noseBridge.y / videoHeight;
    
    // Centrer (-0.5 à 0.5)
    const centeredX = normX - 0.5;
    const centeredY = normY - 0.5;
    
    // Z calculé depuis l'échelle
    const worldZ = -(1 / scale);
    
    // Compensation perspective
    const perspectiveFactor = (2 + Math.abs(worldZ)) / 2;
    
    // Positionner les lunettes légèrement plus bas que le pont du nez
    const worldX = -centeredX * 1.5 * perspectiveFactor; // Moins large que les chapeaux
    const worldY = -(centeredY * 1.5 + 0.05) * perspectiveFactor; // Légèrement plus bas
    
    return new THREE.Vector3(worldX, worldY, worldZ);
  }

  /**
   * 🔥 SCALE avec compensation de l'angle yaw
   * Quand la tête tourne, l'IPD apparent diminue, on compense!
   */
  calculateScaleWithYawCompensation(leftEye, rightEye, yawRadians) {
    // IPD apparent (en pixels)
    const apparentIPD = Math.sqrt(
      Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2)
    );

    // Extraire l'angle yaw réel (enlever le offset Math.PI)
    const actualYaw = yawRadians - Math.PI;

    // 🔥 Compensation: IPD réel = IPD apparent / cos(yaw)
    // Quand yaw = 0° (face) → cos(0) = 1 → pas de compensation
    // Quand yaw = 45° → cos(45°) ≈ 0.7 → IPD réel plus grand
    const yawCompensation = Math.abs(Math.cos(actualYaw));

    // Éviter division par zéro et limiter la compensation
    const safeCompensation = Math.max(yawCompensation, 0.5); // Min 0.5

    const compensatedIPD = apparentIPD / safeCompensation;

    return compensatedIPD / 62;
  }

  /**
   * Moyenne de landmarks
   */
  getAverage(keypoints, indices) {
    let sumX = 0,
      sumY = 0,
      sumZ = 0;
    indices.forEach((i) => {
      sumX += keypoints[i].x;
      sumY += keypoints[i].y;
      sumZ += keypoints[i].z || 0;
    });
    const n = indices.length;
    return { x: sumX / n, y: sumY / n, z: sumZ / n };
  }

  reset() {
    this.previousLandmarks = null;
    this.previousScale = null;
  }
}