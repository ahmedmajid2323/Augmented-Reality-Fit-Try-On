import React, { useState, useEffect } from 'react';

export function XRButton({ onXRStart }) {
  const [xrSupported, setXRSupported] = useState(false);

  useEffect(() => {
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-ar')
        .then(supported => setXrSupported(supported))
        .catch(() => setXrSupported(false));
    }
  }, []);

  if (!xrSupported) return null;

  return (
    <button className="xr-button" onClick={onXRStart}>
      🥽 Enter AR Mode
    </button>
  );
}
