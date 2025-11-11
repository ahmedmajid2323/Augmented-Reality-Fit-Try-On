// Optimized tracking configurations for each body part
export const TRACKING_CONFIG = {
  head: {
    mediapipe: {
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    },
    kalman: {
      R: 0.01, // Measurement noise
      Q: 3, // Process noise
    },
    smoothing: {
      bufferSize: 5,
      alpha: 0.7,
    },
  },
  hand: {
    mediapipe: {
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    },
    kalman: {
      R: 0.02,
      Q: 4,
    },
    smoothing: {
      bufferSize: 4,
      alpha: 0.6,
    },
  },
  foot: {
    mediapipe: {
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    },
    kalman: {
      R: 0.03,
      Q: 5,
    },
    smoothing: {
      bufferSize: 6,
      alpha: 0.75,
    },
  },
};

export const CAMERA_CONFIG = {
  facingMode: "user",
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30, max: 30 },
};
