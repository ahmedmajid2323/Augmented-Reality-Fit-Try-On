/**
 * OptimizedKalmanFilter - Implémentation professionnelle du filtre de Kalman
 * Basé sur la documentation OpenCV et optimisé pour le face tracking
 *
 * Équations du filtre de Kalman:
 * Prédiction:
 *   x̂(k|k-1) = x̂(k-1|k-1)
 *   P(k|k-1) = P(k-1|k-1) + Q
 *
 * Correction:
 *   K(k) = P(k|k-1) / (P(k|k-1) + R)
 *   x̂(k|k) = x̂(k|k-1) + K(k) * (z(k) - x̂(k|k-1))
 *   P(k|k) = (1 - K(k)) * P(k|k-1)
 */
export class OptimizedKalmanFilter {
  constructor(processNoise = 4.0, measurementNoise = 0.015) {
    // Paramètres du filtre
    this.Q = processNoise; // Process noise covariance (incertitude du modèle)
    this.R = measurementNoise; // Measurement noise covariance (incertitude des mesures)

    // État interne
    this.x = 0; // Estimation actuelle
    this.P = 1; // Covariance d'erreur d'estimation
    this.K = 0; // Gain de Kalman

    // Flags
    this.isInitialized = false;

    // Historique pour analyse
    this.history = {
      estimates: [],
      measurements: [],
      innovations: [],
      maxHistory: 100,
    };
  }

  /**
   * Étape de prédiction
   * Prédit l'état suivant basé sur le modèle du système
   */
  predict() {
    // La prédiction simple: l'état reste le même (modèle constant)
    // x̂(k|k-1) = x̂(k-1|k-1)

    // Mise à jour de la covariance d'erreur
    // P(k|k-1) = P(k-1|k-1) + Q
    this.P = this.P + this.Q;
  }

  /**
   * Étape de correction
   * Met à jour l'estimation avec une nouvelle mesure
   *
   * @param {number} measurement - Nouvelle mesure
   * @returns {number} - Estimation filtrée
   */
  update(measurement) {
    // Initialisation au premier appel
    if (!this.isInitialized) {
      this.x = measurement;
      this.isInitialized = true;
      this.addToHistory(measurement, measurement, 0);
      return this.x;
    }

    // 1. PRÉDICTION
    this.predict();

    // 2. CALCUL DU GAIN DE KALMAN
    // K(k) = P(k|k-1) / (P(k|k-1) + R)
    this.K = this.P / (this.P + this.R);

    // 3. CALCUL DE L'INNOVATION
    // Innovation = différence entre mesure et prédiction
    const innovation = measurement - this.x;

    // 4. CORRECTION DE L'ESTIMATION
    // x̂(k|k) = x̂(k|k-1) + K(k) * innovation
    this.x = this.x + this.K * innovation;

    // 5. MISE À JOUR DE LA COVARIANCE D'ERREUR
    // P(k|k) = (1 - K(k)) * P(k|k-1)
    this.P = (1 - this.K) * this.P;

    // Ajouter à l'historique
    this.addToHistory(measurement, this.x, innovation);

    return this.x;
  }

  /**
   * Filtre une valeur (alias pour update)
   * @param {number} value - Valeur à filtrer
   * @returns {number} - Valeur filtrée
   */
  filter(value) {
    return this.update(value);
  }

  /**
   * Ajuste les paramètres dynamiquement
   * Utile pour adapter le filtre selon les conditions
   */
  setParameters(processNoise, measurementNoise) {
    this.Q = processNoise;
    this.R = measurementNoise;
  }

  /**
   * Obtient les métriques de performance
   */
  getMetrics() {
    return {
      gain: this.K,
      covariance: this.P,
      qrRatio: this.Q / this.R,
      innovationStd: this.calculateInnovationStd(),
    };
  }

  /**
   * Calcule l'écart-type des innovations
   */
  calculateInnovationStd() {
    if (this.history.innovations.length < 2) return 0;

    const mean =
      this.history.innovations.reduce((a, b) => a + b, 0) /
      this.history.innovations.length;
    const variance =
      this.history.innovations.reduce(
        (sum, val) => sum + Math.pow(val - mean, 2),
        0
      ) / this.history.innovations.length;
    return Math.sqrt(variance);
  }

  /**
   * Ajoute une entrée à l'historique
   */
  addToHistory(measurement, estimate, innovation) {
    this.history.measurements.push(measurement);
    this.history.estimates.push(estimate);
    this.history.innovations.push(innovation);

    // Limiter la taille de l'historique
    if (this.history.measurements.length > this.history.maxHistory) {
      this.history.measurements.shift();
      this.history.estimates.shift();
      this.history.innovations.shift();
    }
  }

  /**
   * Réinitialise le filtre
   */
  reset() {
    this.x = 0;
    this.P = 1;
    this.K = 0;
    this.isInitialized = false;
    this.history.estimates = [];
    this.history.measurements = [];
    this.history.innovations = [];
  }
}

/**
 * Vector3KalmanFilter - Filtre de Kalman pour vecteurs 3D
 * Utilisé pour position, rotation, échelle
 */
export class Vector3KalmanFilter {
  constructor(processNoise = 4.0, measurementNoise = 0.015) {
    this.xFilter = new OptimizedKalmanFilter(processNoise, measurementNoise);
    this.yFilter = new OptimizedKalmanFilter(processNoise, measurementNoise);
    this.zFilter = new OptimizedKalmanFilter(processNoise, measurementNoise);
  }

  /**
   * Filtre un vecteur 3D
   * @param {Object} vector - {x, y, z}
   * @returns {Object} - Vecteur filtré
   */
  filter(vector) {
    return {
      x: this.xFilter.filter(vector.x),
      y: this.yFilter.filter(vector.y),
      z: this.zFilter.filter(vector.z),
    };
  }

  /**
   * Obtient les métriques de tous les axes
   */
  getMetrics() {
    return {
      x: this.xFilter.getMetrics(),
      y: this.yFilter.getMetrics(),
      z: this.zFilter.getMetrics(),
    };
  }

  /**
   * Ajuste les paramètres pour tous les axes
   */
  setParameters(processNoise, measurementNoise) {
    this.xFilter.setParameters(processNoise, measurementNoise);
    this.yFilter.setParameters(processNoise, measurementNoise);
    this.zFilter.setParameters(processNoise, measurementNoise);
  }

  /**
   * Réinitialise tous les filtres
   */
  reset() {
    this.xFilter.reset();
    this.yFilter.reset();
    this.zFilter.reset();
  }
}

/**
 * QuaternionKalmanFilter - Filtre de Kalman pour quaternions
 * Utilisé pour le filtrage de rotation
 */
export class QuaternionKalmanFilter {
  constructor(processNoise = 3.5, measurementNoise = 0.02) {
    this.wFilter = new OptimizedKalmanFilter(processNoise, measurementNoise);
    this.xFilter = new OptimizedKalmanFilter(processNoise, measurementNoise);
    this.yFilter = new OptimizedKalmanFilter(processNoise, measurementNoise);
    this.zFilter = new OptimizedKalmanFilter(processNoise, measurementNoise);
  }

  /**
   * Filtre un quaternion
   * @param {Object} quaternion - {w, x, y, z}
   * @returns {Object} - Quaternion filtré et normalisé
   */
  filter(quaternion) {
    const filtered = {
      w: this.wFilter.filter(quaternion.w),
      x: this.xFilter.filter(quaternion.x),
      y: this.yFilter.filter(quaternion.y),
      z: this.zFilter.filter(quaternion.z),
    };

    // Normaliser le quaternion filtré
    return this.normalize(filtered);
  }

  /**
   * Normalise un quaternion
   */
  normalize(q) {
    const magnitude = Math.sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z);

    if (magnitude === 0) {
      return { w: 1, x: 0, y: 0, z: 0 };
    }

    return {
      w: q.w / magnitude,
      x: q.x / magnitude,
      y: q.y / magnitude,
      z: q.z / magnitude,
    };
  }

  /**
   * Ajuste les paramètres pour tous les composants
   */
  setParameters(processNoise, measurementNoise) {
    this.wFilter.setParameters(processNoise, measurementNoise);
    this.xFilter.setParameters(processNoise, measurementNoise);
    this.yFilter.setParameters(processNoise, measurementNoise);
    this.zFilter.setParameters(processNoise, measurementNoise);
  }

  /**
   * Réinitialise tous les filtres
   */
  reset() {
    this.wFilter.reset();
    this.xFilter.reset();
    this.yFilter.reset();
    this.zFilter.reset();
  }
}
