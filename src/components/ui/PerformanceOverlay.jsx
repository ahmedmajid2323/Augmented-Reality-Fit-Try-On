import React, { useState, useEffect } from 'react';

export function PerformanceOverlay() {
  const [stats, setStats] = useState({ fps: 0, latency: 0 });

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const updateStats = () => {
      frameCount++;
      const now = performance.now();
      const delta = now - lastTime;

      if (delta >= 1000) {
        setStats({
          fps: Math.round((frameCount * 1000) / delta),
          latency: Math.round(delta / frameCount)
        });
        frameCount = 0;
        lastTime = now;
      }

      requestAnimationFrame(updateStats);
    };

    updateStats();
  }, []);

  return (
    <div className="performance-overlay">
      <div className="stat">
        <span className="stat-label">FPS:</span>
        <span className="stat-value">{stats.fps}</span>
      </div>
      <div className="stat">
        <span className="stat-label">Latency:</span>
        <span className="stat-value">{stats.latency}ms</span>
      </div>
    </div>
  );
}
