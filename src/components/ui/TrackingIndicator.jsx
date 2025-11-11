// src/components/ui/TrackingIndicator.jsx
import React from 'react';

export function TrackingIndicator({ status }) {
  const getStatusInfo = (category, data) => {
    if (!data) return { color: 'red', text: 'Lost', icon: '❌' };

    const confidence = data.confidence || 0;

    if (confidence > 0.8) return { color: 'green', text: 'Excellent', icon: '✅' };
    if (confidence > 0.5) return { color: 'yellow', text: 'Good', icon: '⚠️' };
    return { color: 'red', text: 'Poor', icon: '❌' };
  };

  return (
    <div className="tracking-indicator">
      <h4>Tracking Status</h4>
      {Object.entries(status).map(([category, data]) => {
        const info = getStatusInfo(category, data);
        return (
          <div key={category} className="tracking-item">
            <span className="tracking-icon">{info.icon}</span>
            <span className="tracking-category">{category}</span>
            <span className="tracking-status" style={{ color: info.color }}>
              {info.text}
            </span>
            {data && (
              <span className="tracking-confidence">
                {(data.confidence * 100).toFixed(0)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
