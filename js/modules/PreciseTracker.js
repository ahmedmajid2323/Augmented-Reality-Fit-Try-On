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

  calculateTransform(keypoints, videoWidth, videoHeight) {
    if (!keypoints || keypoints.length < 468) {
      return null;
    }

    // Points clés
    const leftEye = this.getAverage(keypoints, [33, 133, 160, 159]);
    const rightEye = this.getAverage(keypoints, [362, 263, 387, 386]);
    const forehead = this.getAverage(keypoints, [10, 67, 109, 338, 297]);
    const nose = keypoints[1];

    // ===== 1️⃣ ROTATION D'ABORD (nécessaire pour compensation yaw) =====
    const rotation = this.calculateRotation(leftEye, rightEye, nose);

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
    const position = this.calculatePosition(
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
   * Position 3D avec compensation perspective
   */
  calculatePosition(forehead, scale, videoWidth, videoHeight) {
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
   * Rotation de la tête (pitch, yaw, roll)
   */
  calculateRotation(leftEye, rightEye, nose) {
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