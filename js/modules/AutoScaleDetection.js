import * as THREE from "three";
import { FACE_LANDMARKS, AUTO_SCALE } from "../config.js";

/**
 * AutoScaleDetection - Système de détection automatique d'échelle
 * ✅ VERSION SÉCURISÉE avec validation complète des keypoints
 */
export class AutoScaleDetection {
  /**
   * ✅ AJOUT: Vérifie si un keypoint est valide
   */
  static isValidKeypoint(keypoint) {
    return (
      keypoint &&
      typeof keypoint.x === "number" &&
      typeof keypoint.y === "number" &&
      !isNaN(keypoint.x) &&
      !isNaN(keypoint.y)
    );
  }

  /**
   * ✅ AJOUT: Récupère un keypoint de manière sécurisée
   */
  static safeGetKeypoint(
    keypoints,
    index,
    defaultValue = { x: 0, y: 0, z: 0 }
  ) {
    if (!keypoints || index < 0 || index >= keypoints.length) {
      console.warn(`[AutoScale] Keypoint invalide à l'index ${index}`);
      return defaultValue;
    }

    const point = keypoints[index];
    if (!this.isValidKeypoint(point)) {
      console.warn(`[AutoScale] Keypoint ${index} invalide:`, point);
      return defaultValue;
    }

    return {
      x: point.x,
      y: point.y,
      z: point.z || 0,
    };
  }

  /**
   * Analyse les dimensions du modèle 3D
   */
  static analyzeModelDimensions(model) {
    if (!model) return null;

    try {
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();

      box.getSize(size);
      box.getCenter(center);

      return {
        width: size.x,
        height: size.y,
        depth: size.z,
        volume: size.x * size.y * size.z,
        center: center,
        maxDim: Math.max(size.x, size.y, size.z),
        aspectRatio: {
          widthHeight: size.x / size.y,
          widthDepth: size.x / size.z,
          heightDepth: size.y / size.z,
        },
      };
    } catch (error) {
      console.error("[AutoScale] Erreur analyse modèle:", error);
      return null;
    }
  }

  /**
   * ✅ CORRECTION: Calcule les dimensions réelles de la tête
   */
  static calculateRealHeadDimensions(keypoints, width, height) {
    // Validation initiale
    if (!keypoints || keypoints.length < 468) {
      console.warn("[AutoScale] Keypoints insuffisants:", keypoints?.length);
      return null;
    }

    try {
      // ===== EXTRACTION DES POINTS CLÉS AVEC VALIDATION =====
      const leftEye = this.getAverageLandmark(
        keypoints,
        FACE_LANDMARKS.leftEye
      );
      const rightEye = this.getAverageLandmark(
        keypoints,
        FACE_LANDMARKS.rightEye
      );

      // ✅ Vérifier que les points des yeux sont valides
      if (!this.isValidKeypoint(leftEye) || !this.isValidKeypoint(rightEye)) {
        console.warn("[AutoScale] Points des yeux invalides");
        return null;
      }

      const leftTemple = this.safeGetKeypoint(
        keypoints,
        FACE_LANDMARKS.leftTemple
      );
      const rightTemple = this.safeGetKeypoint(
        keypoints,
        FACE_LANDMARKS.rightTemple
      );
      const topOfHead = this.safeGetKeypoint(
        keypoints,
        FACE_LANDMARKS.topOfHead
      );
      const nose = this.safeGetKeypoint(keypoints, FACE_LANDMARKS.noseTip);
      const forehead = this.getAverageLandmark(
        keypoints,
        FACE_LANDMARKS.forehead
      );

      // ===== CALCUL DES DISTANCES EN PIXELS =====

      // Distance inter-pupillaire (IPD)
      const eyeDistancePixels = Math.sqrt(
        Math.pow(rightEye.x - leftEye.x, 2) +
          Math.pow(rightEye.y - leftEye.y, 2)
      );

      // ✅ Vérifier que la distance est valide
      if (eyeDistancePixels <= 0 || isNaN(eyeDistancePixels)) {
        console.warn(
          "[AutoScale] Distance des yeux invalide:",
          eyeDistancePixels
        );
        return null;
      }

      // Largeur de la tête
      const headWidthPixels = Math.sqrt(
        Math.pow(rightTemple.x - leftTemple.x, 2) +
          Math.pow(rightTemple.y - leftTemple.y, 2)
      );

      // Hauteur de la tête
      const headHeightPixels = Math.abs(topOfHead.y - nose.y);

      // ✅ Vérifier que les dimensions sont valides
      if (
        headWidthPixels <= 0 ||
        headHeightPixels <= 0 ||
        isNaN(headWidthPixels) ||
        isNaN(headHeightPixels)
      ) {
        console.warn("[AutoScale] Dimensions de tête invalides:", {
          width: headWidthPixels,
          height: headHeightPixels,
        });
        return null;
      }

      // ===== ESTIMATION DE LA DISTANCE RÉELLE =====
      const averageIPDmm = 63;
      const focalLengthPixels = 500;

      const estimatedDistanceMm =
        (averageIPDmm * focalLengthPixels) / eyeDistancePixels;
      const pixelToMmRatio = averageIPDmm / eyeDistancePixels;

      const realHeadWidthMm = headWidthPixels * pixelToMmRatio;
      const realHeadHeightMm = headHeightPixels * pixelToMmRatio;
      const realHeadDepthMm = 190;

      // ===== FACTEURS D'ÉCHELLE =====
      const referenceHeadWidthMm = 145;
      const referenceHeadHeightMm = 230;

      const widthScaleFactor = realHeadWidthMm / referenceHeadWidthMm;
      const heightScaleFactor = realHeadHeightMm / referenceHeadHeightMm;
      const overallScaleFactor = (widthScaleFactor + heightScaleFactor) / 2;

      // ✅ Vérifier que les facteurs sont dans une plage raisonnable
      if (
        overallScaleFactor < 0.5 ||
        overallScaleFactor > 2.0 ||
        isNaN(overallScaleFactor)
      ) {
        console.warn(
          "[AutoScale] Facteur d'échelle hors limites:",
          overallScaleFactor
        );
        return null;
      }

      const foreheadPosition = {
        x: forehead.x / width,
        y: forehead.y / height,
        z: forehead.z || 0,
      };

      return {
        widthPixels: headWidthPixels,
        heightPixels: headHeightPixels,
        eyeDistancePixels: eyeDistancePixels,
        widthMm: realHeadWidthMm,
        heightMm: realHeadHeightMm,
        depthMm: realHeadDepthMm,
        distanceMm: estimatedDistanceMm,
        pixelToMmRatio: pixelToMmRatio,
        widthScaleFactor: widthScaleFactor,
        heightScaleFactor: heightScaleFactor,
        overallScaleFactor: overallScaleFactor,
        foreheadPosition: foreheadPosition,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("[AutoScale] Erreur calcul dimensions:", error);
      return null;
    }
  }

  /**
   * ✅ CALCUL AUTOMATIQUE DE L'ÉCHELLE - VERSION SÉCURISÉE
   */
  static getAutoScaleForModel(
    model,
    keypoints,
    videoWidth,
    videoHeight,
    productType = "hat"
  ) {
    try {
      // 1. Calculer les dimensions réelles de la tête
      const headDims = this.calculateRealHeadDimensions(
        keypoints,
        videoWidth,
        videoHeight
      );

      // 2. Analyser le modèle 3D
      const modelDims = this.analyzeModelDimensions(model);

      if (!headDims || !modelDims) {
        console.warn(
          "[AutoScale] Impossible de calculer - utilisation fallback"
        );
        return this.getFallbackScale();
      }

      // 3. FORMULE CALIBRÉE ET ADAPTATIVE
      const baseScale = AUTO_SCALE.baseScale;
      const eyeDistanceReference = AUTO_SCALE.eyeDistanceReference;
      const adaptiveFactor = headDims.eyeDistancePixels / eyeDistanceReference;

      // Ajustement selon le type de produit
      let productMultiplier = 1.0;
      if (productType === "hat" || productType === "cap") {
        productMultiplier = 1.0;
      } else if (productType === "glasses") {
        productMultiplier = 0.7;
      }

      // Calcul final
      let finalScale =
        baseScale *
        adaptiveFactor *
        productMultiplier *
        AUTO_SCALE.adaptiveFactor;

      // ✅ Limites de sécurité strictes
      finalScale = Math.max(
        AUTO_SCALE.minScale,
        Math.min(AUTO_SCALE.maxScale, finalScale)
      );

      // ✅ Vérification finale
      if (isNaN(finalScale) || finalScale <= 0) {
        console.error("[AutoScale] Échelle finale invalide:", finalScale);
        return this.getFallbackScale();
      }

      // Logging
      if (AUTO_SCALE.enabled && AUTO_SCALE.logAutoScale !== false) {
        console.group("🎯 Auto-Scale Calculation");
        console.log("👤 Head:", {
          width: `${headDims.widthPixels.toFixed(1)}px`,
          eyeDist: `${headDims.eyeDistancePixels.toFixed(1)}px`,
        });
        console.log("📊 Scale:", {
          base: baseScale,
          adaptive: adaptiveFactor.toFixed(3),
          final: finalScale.toFixed(6),
        });
        console.groupEnd();
      }

      return {
        scale: {
          x: finalScale,
          y: finalScale,
          z: finalScale,
        },
        headDimensions: headDims,
        modelDimensions: modelDims,
        metadata: {
          baseScale: baseScale,
          adaptiveFactor: adaptiveFactor,
          productMultiplier: productMultiplier,
          productType: productType,
          calculatedAt: Date.now(),
        },
      };
    } catch (error) {
      console.error("[AutoScale] Erreur générale:", error);
      return this.getFallbackScale();
    }
  }

  /**
   * Échelle de secours
   */
  static getFallbackScale() {
    const fallback = AUTO_SCALE.baseScale || 0.0018;
    console.warn("[AutoScale] Using fallback scale:", fallback);
    return {
      scale: {
        x: fallback,
        y: fallback,
        z: fallback,
      },
      headDimensions: null,
      modelDimensions: null,
      metadata: {
        isFallback: true,
      },
    };
  }

  /**
   * Vérifie si l'échelle est valide
   */
  static isScaleValid(scaleResult) {
    if (!scaleResult || !scaleResult.scale) return false;
    const s = scaleResult.scale.x;
    return s >= AUTO_SCALE.minScale && s <= AUTO_SCALE.maxScale && !isNaN(s);
  }

  /**
   * ✅ CORRECTION: Calcule la moyenne de landmarks avec validation
   */
  static getAverageLandmark(keypoints, indices) {
    if (!keypoints) {
      return { x: 0, y: 0, z: 0 };
    }

    // Si c'est un index unique
    if (!Array.isArray(indices)) {
      return this.safeGetKeypoint(keypoints, indices);
    }

    // Si c'est un tableau d'indices
    let sumX = 0,
      sumY = 0,
      sumZ = 0;
    let validCount = 0;

    indices.forEach((idx) => {
      const point = this.safeGetKeypoint(keypoints, idx);
      if (this.isValidKeypoint(point)) {
        sumX += point.x;
        sumY += point.y;
        sumZ += point.z || 0;
        validCount++;
      }
    });

    // ✅ Vérifier qu'on a au moins un point valide
    if (validCount === 0) {
      console.warn("[AutoScale] Aucun point valide dans la moyenne");
      return { x: 0, y: 0, z: 0 };
    }

    return {
      x: sumX / validCount,
      y: sumY / validCount,
      z: sumZ / validCount,
    };
  }

  /**
   * Recalcule l'échelle si nécessaire
   */
  static shouldRecalculate(frameCount) {
    return frameCount % AUTO_SCALE.recalculateInterval === 0;
  }
}
