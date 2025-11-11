// src/utils/KalmanFilter.js
export class KalmanFilter {
  constructor(R = 0.01, Q = 3) {
    // R: Measurement noise (lower = trust measurements more)
    // Q: Process noise (higher = allow more movement)
    this.R = R;
    this.Q = Q;

    this.x = 0;  // State estimate
    this.P = 1;  // Error covariance
    this.K = 0;  // Kalman gain
  }

  filter(measurement) {
    // Prediction
    const xPrediction = this.x;
    const pPrediction = this.P + this.Q;

    // Update
    this.K = pPrediction / (pPrediction + this.R);
    this.x = xPrediction + this.K * (measurement - xPrediction);
    this.P = (1 - this.K) * pPrediction;

    return this.x;
  }

  reset() {
    this.x = 0;
    this.P = 1;
    this.K = 0;
  }
}

export class Vector3KalmanFilter {
  constructor(R = 0.01, Q = 3) {
    this.filters = {
      x: new KalmanFilter(R, Q),
      y: new KalmanFilter(R, Q),
      z: new KalmanFilter(R, Q)
    };
  }

  filter(vector) {
    return {
      x: this.filters.x.filter(vector.x),
      y: this.filters.y.filter(vector.y),
      z: this.filters.z.filter(vector.z)
    };
  }

  reset() {
    this.filters.x.reset();
    this.filters.y.reset();
    this.filters.z.reset();
  }
}
