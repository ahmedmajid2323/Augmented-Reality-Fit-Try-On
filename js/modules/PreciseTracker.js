import * as THREE from "three";

/**
 * PreciseTracker - Tracking ultra-précis avec compensation perspective
 */
export class PreciseTracker {
  constructor() {
    this.previousLandmarks = null;
    this.previousScale = null;
    this.smoothingFactor = 0.3;
    this.scaleSmoothingFactor = 0.7;
  }

  /**
   * Méthode générique qui choisit la bonne transformation selon le type
   */
  calculateTransform(keypoints, videoWidth, videoHeight, productType = "hat") {
    if (!keypoints || keypoints.length < 468) return null;

    switch (productType) {
      case "glasses":
        return this.calculateGlassesTransform(
          keypoints,
          videoWidth,
          videoHeight
        );

      case "headphones":
        return this.calculateHeadphonesTransform(
          keypoints,
          videoWidth,
          videoHeight
        );

      default:
        return this.calculateHatTransform(
          keypoints,
          videoWidth,
          videoHeight
        );
    }
  }

  /* ============================================================
   * 🎧 HEADPHONES
   * ============================================================ */

  calculateHeadphonesTransform(keypoints, videoWidth, videoHeight) {
    // 👂 Ear landmarks
    const leftEar = keypoints[234];
    const rightEar = keypoints[454];

    if (!leftEar || !rightEar) return null;

    // ===== 1️⃣ ROTATION =====
    const rotation = this.calculateHeadphonesRotation(leftEar, rightEar);

    // ===== 2️⃣ SCALE (ear-to-ear distance) =====
    let scale = this.calculateHeadphonesScale(leftEar, rightEar);

    if (this.previousScale !== null) {
      scale =
        this.previousScale * this.scaleSmoothingFactor +
        scale * (1 - this.scaleSmoothingFactor);
    }
    this.previousScale = scale;

    // ===== 3️⃣ POSITION (midpoint between ears) =====
    const position = this.calculateHeadphonesPosition(
      leftEar,
      rightEar,
      scale,
      videoWidth,
      videoHeight
    );

    if (this.previousLandmarks) {
      position.lerp(this.previousLandmarks.position, this.smoothingFactor);
    }

    this.previousLandmarks = { position: position.clone() };

    return { position, rotation, scale };
  }

  calculateHeadphonesRotation(leftEar, rightEar) {
    // Vector ear-to-ear
    const dx = rightEar.x - leftEar.x;
    const dy = rightEar.y - leftEar.y;

    // Roll follows head tilt
    const roll = Math.atan2(dy, dx);

    // Headphones face camera
    const yaw = Math.PI;
    const pitch = 0;

    return new THREE.Euler(pitch, yaw, -roll, "XYZ");
  }

  calculateHeadphonesScale(leftEar, rightEar) {
    const earDistance = Math.sqrt(
      Math.pow(rightEar.x - leftEar.x, 2) +
        Math.pow(rightEar.y - leftEar.y, 2)
    );

    // Average adult head width ≈ 150–160 mm
    const normalized = earDistance / 155;

    // Headphones are bigger than glasses, smaller than hats
    return normalized * 0.25;
  }

  calculateHeadphonesPosition(
    leftEar,
    rightEar,
    scale,
    videoWidth,
    videoHeight
  ) {
    // Midpoint between ears
    const midX = (leftEar.x + rightEar.x) / 2;
    const midY = (leftEar.y + rightEar.y) / 2;

    const normX = midX / videoWidth - 0.5;
    const normY = midY / videoHeight - 0.5;

    const worldZ = -(1 / scale);
    const perspective = (2 + Math.abs(worldZ)) / 2;

    const worldX = -normX * 2 * perspective;
    const worldY = -(normY * 2 - 0.05) * perspective; // slightly higher

    return new THREE.Vector3(worldX, worldY, worldZ);
  }

  /* ============================================================
   * 🧢 HATS (UNCHANGED)
   * ============================================================ */

  calculateHatTransform(keypoints, videoWidth, videoHeight) {
    const leftEye = this.getAverage(keypoints, [33, 133, 160, 159]);
    const rightEye = this.getAverage(keypoints, [362, 263, 387, 386]);
    const forehead = this.getAverage(keypoints, [10, 67, 109, 338, 297]);
    const nose = keypoints[1];

    const rotation = this.calculateHatRotation(leftEye, rightEye, nose);

    let scale = this.calculateScaleWithYawCompensation(
      leftEye,
      rightEye,
      rotation.y
    );

    if (this.previousScale !== null) {
      scale =
        this.previousScale * this.scaleSmoothingFactor +
        scale * (1 - this.scaleSmoothingFactor);
    }
    this.previousScale = scale;

    const position = this.calculateHatPosition(
      forehead,
      scale,
      videoWidth,
      videoHeight
    );

    if (this.previousLandmarks) {
      position.lerp(this.previousLandmarks.position, this.smoothingFactor);
    }

    this.previousLandmarks = { position: position.clone() };

    return { position, rotation, scale };
  }

  calculateHatRotation(leftEye, rightEye, nose) {
    const eyeCenterX = (leftEye.x + rightEye.x) / 2;
    const eyeCenterY = (leftEye.y + rightEye.y) / 2;

    const eyeDist = Math.hypot(
      rightEye.x - leftEye.x,
      rightEye.y - leftEye.y
    );

    const yaw = ((nose.x - eyeCenterX) / eyeDist) * 0.5;
    const pitch = ((nose.y - eyeCenterY) / eyeDist) * 0.3;
    const roll = Math.atan2(
      rightEye.y - leftEye.y,
      rightEye.x - leftEye.x
    );

    return new THREE.Euler(pitch, Math.PI + yaw, -roll, "XYZ");
  }

  calculateHatPosition(forehead, scale, videoWidth, videoHeight) {
    const normX = forehead.x / videoWidth - 0.5;
    const normY = forehead.y / videoHeight - 0.5;

    const worldZ = -(1 / scale);
    const perspective = (2 + Math.abs(worldZ)) / 2;

    return new THREE.Vector3(
      -normX * 2 * perspective,
      -normY * 2 * perspective,
      worldZ
    );
  }

  /* ============================================================
   * 🕶️ GLASSES (UNCHANGED)
   * ============================================================ */

  calculateGlassesTransform(keypoints, videoWidth, videoHeight) {
    const noseBridge = this.getAverage(keypoints, [168, 197]);
    const leftEye = keypoints[33];
    const rightEye = keypoints[263];

    const rotation = this.calculateGlassesRotation(
      leftEye,
      rightEye,
      noseBridge
    );

    let scale = this.calculateGlassesScale(leftEye, rightEye);

    if (this.previousScale !== null) {
      scale =
        this.previousScale * this.scaleSmoothingFactor +
        scale * (1 - this.scaleSmoothingFactor);
    }
    this.previousScale = scale;

    const position = this.calculateGlassesPosition(
      noseBridge,
      scale,
      videoWidth,
      videoHeight
    );

    if (this.previousLandmarks) {
      position.lerp(this.previousLandmarks.position, this.smoothingFactor);
    }

    this.previousLandmarks = { position: position.clone() };

    return { position, rotation, scale };
  }

  calculateGlassesRotation(leftEye, rightEye, noseBridge) {
    const roll = Math.atan2(
      rightEye.y - leftEye.y,
      rightEye.x - leftEye.x
    );

    const pitch =
      ((leftEye.y + rightEye.y) / 2 - noseBridge.y) / 100 * 0.1;

    return new THREE.Euler(pitch, Math.PI, -roll, "XYZ");
  }

  calculateGlassesScale(leftEye, rightEye) {
    const eyeDistance = Math.hypot(
      rightEye.x - leftEye.x,
      rightEye.y - leftEye.y
    );

    return (eyeDistance / 62) * 0.1;
  }

  calculateGlassesPosition(noseBridge, scale, videoWidth, videoHeight) {
    const normX = noseBridge.x / videoWidth - 0.5;
    const normY = noseBridge.y / videoHeight - 0.5;

    const worldZ = -(1 / scale);
    const perspective = (2 + Math.abs(worldZ)) / 2;

    return new THREE.Vector3(
      -normX * 1.5 * perspective,
      -(normY * 1.5 + 0.05) * perspective,
      worldZ
    );
  }

  /* ============================================================
   * UTILS
   * ============================================================ */

  calculateScaleWithYawCompensation(leftEye, rightEye, yawRadians) {
    const apparentIPD = Math.hypot(
      rightEye.x - leftEye.x,
      rightEye.y - leftEye.y
    );

    const actualYaw = yawRadians - Math.PI;
    const compensation = Math.max(Math.abs(Math.cos(actualYaw)), 0.5);

    return (apparentIPD / compensation) / 62;
  }

  getAverage(keypoints, indices) {
    let x = 0,
      y = 0,
      z = 0;
    indices.forEach((i) => {
      x += keypoints[i].x;
      y += keypoints[i].y;
      z += keypoints[i].z || 0;
    });
    const n = indices.length;
    return { x: x / n, y: y / n, z: z / n };
  }

  reset() {
    this.previousLandmarks = null;
    this.previousScale = null;
  }
}
