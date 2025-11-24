import * as THREE from "three";

/**
 * AdvancedTracking - Calcul de position plus précis
 */
export class AdvancedTracking {
  /**
   * Convertit la position normalisée MediaPipe en position 3D
   */
  static calculateWorldPosition(position, videoWidth, videoHeight, cameraFOV) {
    // Calculer la position en coordonnées monde basée sur la FOV
    const aspect = videoWidth / videoHeight;
    const vFOV = THREE.MathUtils.degToRad(cameraFOV);
    const height = 2 * Math.tan(vFOV / 2) * 2.5; // Distance = 2.5
    const width = height * aspect;

    return {
      x: (position.x - 0.5) * width,
      y: -(position.y - 0.5) * height,
      z: -2.5,
    };
  }

  /**
   * Applique un filtre de lissage temporel
   */
  static smoothPosition(currentPos, previousPos, smoothing = 0.7) {
    if (!previousPos) return currentPos;

    return {
      x: previousPos.x * smoothing + currentPos.x * (1 - smoothing),
      y: previousPos.y * smoothing + currentPos.y * (1 - smoothing),
      z: previousPos.z * smoothing + currentPos.z * (1 - smoothing),
    };
  }
}
