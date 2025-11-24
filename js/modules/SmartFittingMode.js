import { CONFIG } from "../config.js";

/**
 * SmartFittingMode - Mode intelligent d'ajustement automatique
 * Analyse le visage et ajuste automatiquement le modèle 3D en temps réel
 */
export class SmartFittingMode {
  constructor() {
    this.enabled = false;
    this.isCalibrating = false;
    this.calibrationFrames = 0;
    this.calibrationData = [];
    
    // Analyse morphologique
    this.faceProfile = null;
    
    // Historique d'ajustements
    this.adjustmentHistory = [];
    
    // Paramètres optimaux détectés
    this.optimalSettings = {
      scale: null,
      offset: null,
      rotation: null,
      confidence: 0
    };
    
    // Machine learning simple : poids pour différentes morphologies
    this.morphologyWeights = {
      round: { scaleMultiplier: 1.1, yOffset: 0.02 },
      oval: { scaleMultiplier: 1.0, yOffset: 0.0 },
      square: { scaleMultiplier: 1.05, yOffset: -0.01 },
      long: { scaleMultiplier: 0.95, yOffset: 0.03 }
    };
    
    // Statistiques d'utilisation
    this.stats = {
      totalFrames: 0,
      goodFitFrames: 0,
      averageConfidence: 0,
      detectedMorphology: null
    };

    console.log("[SmartFittingMode] 🧠 Mode intelligent initialisé");
  }

  /**
   * Active le mode intelligent
   */
  enable() {
    this.enabled = true;
    console.log("[SmartFittingMode] ✅ Mode intelligent ACTIVÉ");
    this.startCalibration();
  }

  /**
   * Désactive le mode intelligent
   */
  disable() {
    this.enabled = false;
    console.log("[SmartFittingMode] ❌ Mode intelligent DÉSACTIVÉ");
  }

  /**
   * Démarre la phase de calibration automatique
   */
  startCalibration() {
    this.isCalibrating = true;
    this.calibrationFrames = 0;
    this.calibrationData = [];
    console.log("[SmartFittingMode] 🎯 Calibration automatique démarrée...");
  }

  /**
   * Processus principal du mode intelligent
   */
  process(trackingData, currentModel) {
    if (!this.enabled || !trackingData || !currentModel) {
      return null;
    }

    this.stats.totalFrames++;

    // Phase 1 : Calibration (premiers 60 frames)
    if (this.isCalibrating && this.calibrationFrames < 60) {
      return this.processCalibration(trackingData);
    }

    // Fin de calibration
    if (this.isCalibrating && this.calibrationFrames >= 60) {
      this.finishCalibration();
    }

    // Phase 2 : Analyse morphologique du visage
    if (!this.faceProfile) {
      this.faceProfile = this.analyzeFaceMorphology(trackingData);
    }

    // Phase 3 : Ajustements intelligents en temps réel
    const adjustments = this.calculateIntelligentAdjustments(trackingData, currentModel);

    // Phase 4 : Vérifier la qualité du fitting
    const fittingQuality = this.evaluateFittingQuality(trackingData, currentModel);
    
    if (fittingQuality.isGood) {
      this.stats.goodFitFrames++;
    }

    // Phase 5 : Apprentissage continu
    this.learn(trackingData, adjustments, fittingQuality);

    return adjustments;
  }

  /**
   * Processus de calibration
   */
  processCalibration(trackingData) {
    this.calibrationFrames++;

    // Collecter les données
    if (trackingData.confidence > 0.7 && trackingData.rawKeypoints) {
      this.calibrationData.push({
        headMetrics: this.calculateHeadMetrics(trackingData.rawKeypoints),
        rotation: trackingData.rotation,
        position: trackingData.position,
        scale: trackingData.scale,
        confidence: trackingData.confidence
      });
    }

    // Feedback visuel
    const progress = (this.calibrationFrames / 60 * 100).toFixed(0);
    
    return {
      status: 'calibrating',
      progress: progress,
      message: `Calibration en cours... ${progress}%`
    };
  }

  /**
   * Finalise la calibration et calcule les paramètres optimaux
   */
  finishCalibration() {
    console.log("[SmartFittingMode] 📊 Analyse de calibration...");
    
    if (this.calibrationData.length < 10) {
      console.warn("[SmartFittingMode] Pas assez de données de calibration");
      this.isCalibrating = false;
      return;
    }

    // Calculer la moyenne des métriques
    const avgHeadWidth = this.average(this.calibrationData.map(d => d.headMetrics.width));
    const avgHeadHeight = this.average(this.calibrationData.map(d => d.headMetrics.height));
    const avgConfidence = this.average(this.calibrationData.map(d => d.confidence));

    // Détecter la morphologie du visage
    const morphology = this.detectFaceMorphology(avgHeadWidth, avgHeadHeight);

    // Calculer les paramètres optimaux
    const morphWeights = this.morphologyWeights[morphology];
    
    this.optimalSettings = {
      scale: {
        x: 0.0018 * morphWeights.scaleMultiplier,
        y: 0.0018 * morphWeights.scaleMultiplier,
        z: 0.0018 * morphWeights.scaleMultiplier
      },
      offset: {
        x: 0,
        y: 0.15 + morphWeights.yOffset,
        z: -0.15
      },
      rotation: {
        x: 0,
        y: 0,
        z: 0
      },
      confidence: avgConfidence
    };

    this.stats.detectedMorphology = morphology;
    this.isCalibrating = false;

    console.log(`[SmartFittingMode] ✅ Calibration terminée !`);
    console.log(`[SmartFittingMode] 📐 Morphologie détectée: ${morphology}`);
    console.log(`[SmartFittingMode] ⚙️ Paramètres optimaux:`, this.optimalSettings);
  }

  /**
   * Analyse la morphologie du visage
   */
  analyzeFaceMorphology(trackingData) {
    if (!trackingData.rawKeypoints || trackingData.rawKeypoints.length < 468) {
      return null;
    }

    const keypoints = trackingData.rawKeypoints;
    const headMetrics = this.calculateHeadMetrics(keypoints);

    // Ratio largeur/hauteur
    const ratio = headMetrics.width / headMetrics.height;

    // Déterminer la forme du visage
    let shape;
    if (ratio > 0.9) {
      shape = 'round';      // Visage rond
    } else if (ratio > 0.75) {
      shape = 'oval';       // Visage ovale (idéal)
    } else if (ratio > 0.65) {
      shape = 'long';       // Visage allongé
    } else {
      shape = 'square';     // Visage carré
    }

    // Caractéristiques additionnelles
    const profile = {
      shape: shape,
      width: headMetrics.width,
      height: headMetrics.height,
      ratio: ratio,
      jawlineWidth: headMetrics.jawlineWidth,
      foreheadWidth: headMetrics.foreheadWidth,
      // Classification de la taille
      sizeCategory: this.classifyHeadSize(headMetrics.width, headMetrics.height)
    };

    console.log("[SmartFittingMode] 🎭 Profil facial analysé:", profile);
    return profile;
  }

  /**
   * Calcule les métriques de la tête
   */
  calculateHeadMetrics(keypoints) {
    // Temples (largeur de tête)
    const leftTemple = keypoints[234];
    const rightTemple = keypoints[454];
    const width = Math.abs(rightTemple.x - leftTemple.x);

    // Hauteur (haut de tête au menton)
    const topOfHead = keypoints[10];
    const chin = keypoints[152];
    const height = Math.abs(topOfHead.y - chin.y);

    // Largeur de la mâchoire
    const leftJaw = keypoints[172];
    const rightJaw = keypoints[397];
    const jawlineWidth = Math.abs(rightJaw.x - leftJaw.x);

    // Largeur du front
    const leftForehead = keypoints[67];
    const rightForehead = keypoints[297];
    const foreheadWidth = Math.abs(rightForehead.x - leftForehead.x);

    return {
      width,
      height,
      jawlineWidth,
      foreheadWidth
    };
  }

  /**
   * Détecte la morphologie du visage
   */
  detectFaceMorphology(width, height) {
    const ratio = width / height;
    
    if (ratio > 0.9) return 'round';
    if (ratio > 0.75) return 'oval';
    if (ratio > 0.65) return 'long';
    return 'square';
  }

  /**
   * Classifie la taille de la tête
   */
  classifyHeadSize(width, height) {
    const avgDimension = (width + height) / 2;
    
    if (avgDimension < 80) return 'small';
    if (avgDimension < 120) return 'medium';
    if (avgDimension < 160) return 'large';
    return 'extra-large';
  }

  /**
   * Calcule les ajustements intelligents en temps réel
   */
  calculateIntelligentAdjustments(trackingData, currentModel) {
    const adjustments = {
      scale: null,
      offset: null,
      rotation: null,
      alpha: 1.0 // Opacité
    };

    // Si on a des paramètres optimaux, les utiliser
    if (this.optimalSettings.scale) {
      adjustments.scale = { ...this.optimalSettings.scale };
      adjustments.offset = { ...this.optimalSettings.offset };
    }

    // Ajustements basés sur la rotation de la tête
    const yawDegrees = Math.abs(trackingData.rotation.y) * (180 / Math.PI);
    const pitchDegrees = Math.abs(trackingData.rotation.x) * (180 / Math.PI);

    // Si la tête tourne beaucoup, ajuster l'échelle et la position
    if (yawDegrees > 30) {
      const turnFactor = (yawDegrees - 30) / 60; // 0 à 1
      
      // Réduire légèrement la visibilité latérale
      if (adjustments.scale) {
        adjustments.scale.x *= (1 - turnFactor * 0.1);
      }
      
      // Ajuster l'opacité pour un effet plus réaliste
      adjustments.alpha = 1.0 - (turnFactor * 0.2);
    }

    // Si la tête penche, ajuster
    if (pitchDegrees > 20) {
      if (adjustments.offset) {
        const pitchFactor = (pitchDegrees - 20) / 40;
        adjustments.offset.y += pitchFactor * 0.05;
      }
    }

    // Ajustement de profondeur selon la distance
    if (trackingData.scale && adjustments.offset) {
      const depthAdjustment = (1 - trackingData.scale.x) * 0.1;
      adjustments.offset.z -= depthAdjustment;
    }

    return adjustments;
  }

  /**
   * Évalue la qualité du fitting actuel
   */
  evaluateFittingQuality(trackingData, currentModel) {
    const quality = {
      score: 0,
      isGood: false,
      issues: []
    };

    // Critère 1 : Confiance du tracking (40% du score)
    const confidenceScore = trackingData.confidence * 40;
    quality.score += confidenceScore;
    
    if (trackingData.confidence < 0.6) {
      quality.issues.push("Confiance de tracking faible");
    }

    // Critère 2 : Stabilité (30% du score)
    const stabilityScore = trackingData.isStabilized ? 30 : 15;
    quality.score += stabilityScore;
    
    if (!trackingData.isStabilized) {
      quality.issues.push("Tracking instable");
    }

    // Critère 3 : Angle de vue optimal (30% du score)
    const yawDegrees = Math.abs(trackingData.rotation.y) * (180 / Math.PI);
    const angleScore = yawDegrees < 30 ? 30 : Math.max(0, 30 - (yawDegrees - 30));
    quality.score += angleScore;
    
    if (yawDegrees > 45) {
      quality.issues.push("Angle de vue sous-optimal");
    }

    // Évaluation finale
    quality.isGood = quality.score >= 70 && quality.issues.length === 0;

    return quality;
  }

  /**
   * Apprentissage continu basé sur les données
   */
  learn(trackingData, adjustments, quality) {
    // Enregistrer dans l'historique
    this.adjustmentHistory.push({
      timestamp: Date.now(),
      trackingData: { ...trackingData },
      adjustments: { ...adjustments },
      quality: { ...quality }
    });

    // Garder seulement les 100 derniers
    if (this.adjustmentHistory.length > 100) {
      this.adjustmentHistory.shift();
    }

    // Mettre à jour les statistiques
    const recentGoodFits = this.adjustmentHistory
      .slice(-30)
      .filter(h => h.quality.isGood).length;
    
    this.stats.averageConfidence = 
      this.average(this.adjustmentHistory.slice(-30).map(h => h.trackingData.confidence));

    // Si le taux de bon fitting est faible, suggérer une recalibration
    if (this.adjustmentHistory.length > 30 && recentGoodFits < 15) {
      console.warn("[SmartFittingMode] ⚠️ Qualité du fitting en baisse, recalibration recommandée");
    }
  }

  /**
   * Obtient des recommandations intelligentes
   */
  getRecommendations() {
    const recommendations = [];

    if (!this.faceProfile) {
      recommendations.push({
        type: 'info',
        message: "Analyse du visage en cours..."
      });
      return recommendations;
    }

    // Recommandations basées sur la morphologie
    const { shape, sizeCategory } = this.faceProfile;

    if (shape === 'round') {
      recommendations.push({
        type: 'tip',
        message: "Votre visage rond est idéal pour les casquettes avec visière courte"
      });
    } else if (shape === 'long') {
      recommendations.push({
        type: 'tip',
        message: "Les casquettes larges équilibreront votre visage allongé"
      });
    }

    if (sizeCategory === 'small') {
      recommendations.push({
        type: 'warning',
        message: "Privilégiez les modèles de taille S ou ajustables"
      });
    } else if (sizeCategory === 'large') {
      recommendations.push({
        type: 'warning',
        message: "Privilégiez les modèles de taille L ou XL"
      });
    }

    // Recommandations basées sur les statistiques
    const fitRate = (this.stats.goodFitFrames / this.stats.totalFrames) * 100;
    
    if (fitRate < 50) {
      recommendations.push({
        type: 'action',
        message: "Essayez de garder votre visage face à la caméra pour un meilleur résultat"
      });
    }

    return recommendations;
  }

  /**
   * Retourne les statistiques du mode intelligent
   */
  getStats() {
    return {
      ...this.stats,
      fitRate: ((this.stats.goodFitFrames / this.stats.totalFrames) * 100).toFixed(1),
      isCalibrated: !this.isCalibrating && this.optimalSettings.scale !== null
    };
  }

  /**
   * Utilitaire : calcul de moyenne
   */
  average(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /**
   * Exporte les paramètres optimaux
   */
  exportOptimalSettings() {
    return {
      scale: this.optimalSettings.scale,
      offset: this.optimalSettings.offset,
      rotation: this.optimalSettings.rotation,
      morphology: this.stats.detectedMorphology,
      confidence: this.optimalSettings.confidence
    };
  }

  /**
   * Réinitialise le mode intelligent
   */
  reset() {
    this.faceProfile = null;
    this.calibrationData = [];
    this.calibrationFrames = 0;
    this.adjustmentHistory = [];
    this.optimalSettings = {
      scale: null,
      offset: null,
      rotation: null,
      confidence: 0
    };
    console.log("[SmartFittingMode] 🔄 Réinitialisé");
  }
}
