// src/hooks/useAsyncTracking.js
import { useState, useEffect, useRef } from 'react';
import { Vector3KalmanFilter } from '../utils/KalmanFilter';
import { TRACKING_CONFIG } from '../config/tracking.config';

export function useAsyncTracking(category, options = {}) {
  const [status, setStatus] = useState('initializing');
  const [confidence, setConfidence] = useState(0);
  const [position, setPosition] = useState(null);
  const [rotation, setRotation] = useState(null);

  const filtersRef = useRef({
    position: new Vector3KalmanFilter(
      TRACKING_CONFIG[category].kalman.R,
      TRACKING_CONFIG[category].kalman.Q
    ),
    rotation: new Vector3KalmanFilter(
      TRACKING_CONFIG[category].kalman.R,
      TRACKING_CONFIG[category].kalman.Q
    )
  });

  useEffect(() => {
    let mounted = true;

    const handleTrackingUpdate = (type, data) => {
      if (type !== category || !mounted) return;

      if (!data) {
        setStatus('tracking_lost');
        setConfidence(0);
        return;
      }

      // Apply Kalman filtering
      const smoothedPosition = filtersRef.current.position.filter(data.position);
      const smoothedRotation = filtersRef.current.rotation.filter(data.rotation);

      setStatus('tracking');
      setConfidence(data.confidence);
      setPosition(smoothedPosition);
      setRotation(smoothedRotation);

      // Callback
      options.onUpdate?.({
        position: smoothedPosition,
        rotation: smoothedRotation,
        scale: data.scale,
        confidence: data.confidence
      });
    };

    // Subscribe to worker updates
    if (window.workerPool) {
      window.workerPool.onUpdate(handleTrackingUpdate);
    }

    return () => {
      mounted = false;
    };
  }, [category, options]);

  return {
    status,
    confidence,
    position,
    rotation
  };
}
