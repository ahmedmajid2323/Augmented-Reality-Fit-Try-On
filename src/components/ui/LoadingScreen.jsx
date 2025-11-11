import React from 'react';

export function LoadingScreen({ message = 'Loading...', progress }) {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="spinner-large"></div>
        <p className="loading-message">{message}</p>
        {progress !== undefined && (
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
}
