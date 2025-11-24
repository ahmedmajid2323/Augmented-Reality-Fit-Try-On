/**
 * DebugPanel - VERSION SÉCURISÉE
 * Toutes les vérifications ajoutées pour éviter les erreurs "undefined"
 */
export class DebugPanel {
  constructor() {
    this.panel = null;
    this.values = {};
    this.createPanel();
  }

  createPanel() {
    this.panel = document.createElement("div");
    this.panel.id = "advanced-debug-panel";
    this.panel.style.cssText = `
      position: fixed;
      top: 70px;
      left: 10px;
      background: rgba(0, 0, 0, 0.92);
      color: #00ff00;
      padding: 15px;
      border-radius: 10px;
      font-family: 'Courier New', 'Monaco', monospace;
      font-size: 11px;
      z-index: 10000;
      min-width: 380px;
      max-height: 90vh;
      overflow-y: auto;
      border: 2px solid #00ffff;
      box-shadow: 0 4px 20px rgba(0, 255, 255, 0.3);
    `;
    document.body.appendChild(this.panel);
  }

  update(data) {
    // VÉRIFICATION : data existe
    if (!data) {
      this.panel.innerHTML =
        '<div style="color: #ff0000;">⚠️ Aucune donnée</div>';
      return;
    }

    const {
      facePosition = null,
      faceRotation = null,
      faceScale = null,
      confidence = 0,
      landmarkCount = 0,
      modelPosition = [0, 0, 0],
      modelRotation = [0, 0, 0],
      modelScale = [0, 0, 0],
      modelVisible = false,
      videoWidth = 0,
      videoHeight = 0,
      videoReady = false,
      fps = 0,
      avgFrameTime = 0,
      cameraFOV = 0,
      cameraPosition = [0, 0, 0],
      headMetrics = null,
      isWellFitted = false,
      smartMode = null,
      occlusionEnabled = false,
    } = data;

    const confidenceColor =
      confidence > 0.7 ? "#00ff00" : confidence > 0.5 ? "#ffff00" : "#ff0000";
    const fpsColor = fps > 50 ? "#00ff00" : fps > 30 ? "#ffff00" : "#ff0000";

    this.panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h3 style="color: #00ffff; margin: 0; font-size: 14px;">🔍 DEBUG PANEL</h3>
        <span style="color: ${fpsColor}; font-size: 16px; font-weight: bold;">${fps} FPS</span>
      </div>
      
      ${this.renderVideoSection(videoWidth, videoHeight, videoReady)}
      
      ${
        headMetrics
          ? this.renderHeadMetricsSection(headMetrics, isWellFitted)
          : ""
      }
      
      ${this.renderFaceTrackingSection(
        facePosition,
        faceRotation,
        faceScale,
        confidence,
        confidenceColor,
        landmarkCount
      )}
      
      ${this.renderModelTransformSection(
        modelPosition,
        modelRotation,
        modelScale,
        modelVisible
      )}
      
      ${smartMode ? this.renderSmartModeSection(smartMode) : ""}
      
      ${this.renderFeaturesSection(occlusionEnabled)}
      
      ${this.renderCameraSection(cameraFOV, cameraPosition)}
      
      ${this.renderPerformanceSection(fps, avgFrameTime, fpsColor)}
    `;
  }

  renderVideoSection(width, height, ready) {
    return `
      <div style="margin-bottom: 12px; padding: 8px; background: rgba(0, 100, 100, 0.2); border-radius: 5px;">
        <h4 style="color: #ffff00; margin: 0 0 5px 0; font-size: 12px;">📹 VIDEO</h4>
        <div style="font-size: 10px;">
          <span style="color: #888;">Resolution:</span> 
          <span style="color: #fff;">${width || 0} x ${height || 0}</span><br>
          <span style="color: #888;">Ready:</span> 
          <span style="color: ${ready ? "#00ff00" : "#ff0000"};">
            ${ready ? "✓" : "✗"}
          </span>
        </div>
      </div>
    `;
  }

  renderHeadMetricsSection(headMetrics, isWellFitted) {
    if (!headMetrics) return "";

    const wellFittedColor = isWellFitted ? "#00ff00" : "#ff0000";
    const scaleFactorColor =
      (headMetrics.overallScaleFactor || 0) > 0.8 &&
      (headMetrics.overallScaleFactor || 0) < 1.2
        ? "#00ff00"
        : "#ffff00";

    return `
      <div style="margin-bottom: 12px; padding: 8px; background: rgba(255, 0, 255, 0.15); border-radius: 5px;">
        <h4 style="color: #ff00ff; margin: 0 0 5px 0; font-size: 12px;">🧠 SMART HEAD DETECTION</h4>
        <div style="font-size: 10px; line-height: 1.4;">
          <span style="color: #888;">Head Width:</span> 
          <span style="color: #fff;">${(headMetrics.widthPixels || 0).toFixed(
            1
          )} px</span> 
          <span style="color: #666;">(${(headMetrics.widthMm || 0).toFixed(
            1
          )} mm)</span><br>
          
          <span style="color: #888;">Head Height:</span> 
          <span style="color: #fff;">${(headMetrics.heightPixels || 0).toFixed(
            1
          )} px</span> 
          <span style="color: #666;">(${(headMetrics.heightMm || 0).toFixed(
            1
          )} mm)</span><br>
          
          <span style="color: #888;">Eye Distance:</span> 
          <span style="color: #fff;">${(
            headMetrics.eyeDistancePixels || 0
          ).toFixed(1)} px</span><br>
          
          <span style="color: #888;">Distance:</span> 
          <span style="color: #fff;">${(headMetrics.distanceMm || 0).toFixed(
            0
          )} mm</span><br>
          
          <span style="color: #888;">Scale Factor:</span> 
          <span style="color: ${scaleFactorColor};">
            ${(headMetrics.overallScaleFactor || 0).toFixed(3)}
          </span><br>
          
          <span style="color: #888;">Well Fitted:</span> 
          <span style="color: ${wellFittedColor}; font-weight: bold;">
            ${isWellFitted ? "YES ✓" : "NO ✗"}
          </span>
        </div>
      </div>
    `;
  }

  renderFaceTrackingSection(
    position,
    rotation,
    scale,
    confidence,
    confidenceColor,
    landmarkCount
  ) {
    // VÉRIFICATIONS DE SÉCURITÉ
    if (!position || !rotation || !scale) {
      return `
        <div style="margin-bottom: 12px; padding: 8px; background: rgba(0, 100, 0, 0.15); border-radius: 5px;">
          <h4 style="color: #00ff00; margin: 0 0 5px 0; font-size: 12px;">👤 FACE TRACKING</h4>
          <div style="font-size: 10px;">
            <span style="color: #ff9900;">⏳ En attente de données de tracking...</span><br>
            <span style="color: #666; font-size: 9px;">Assurez-vous que la caméra est active</span>
          </div>
        </div>
      `;
    }

    return `
      <div style="margin-bottom: 12px; padding: 8px; background: rgba(0, 100, 0, 0.15); border-radius: 5px;">
        <h4 style="color: #00ff00; margin: 0 0 5px 0; font-size: 12px;">👤 FACE TRACKING</h4>
        <div style="font-size: 10px; line-height: 1.4;">
          <span style="color: #888;">Confidence:</span> 
          <span style="color: ${confidenceColor}; font-weight: bold;">
            ${((confidence || 0) * 100).toFixed(1)}%
          </span><br>
          
          <span style="color: #888;">Landmarks:</span> 
          <span style="color: #fff;">${landmarkCount || 0}</span><br>
          
          <div style="margin-top: 4px;">
            <span style="color: #888;">Position:</span><br>
            <span style="color: #fff; font-size: 9px;">
              X: ${(position.x || 0).toFixed(3)} 
              Y: ${(position.y || 0).toFixed(3)} 
              Z: ${(position.z || 0).toFixed(3)}
            </span>
          </div>
          
          <div style="margin-top: 4px;">
            <span style="color: #888;">Rotation (radians):</span><br>
            <span style="color: #fff; font-size: 9px;">
              X: ${(rotation.x || 0).toFixed(3)} 
              Y: ${(rotation.y || 0).toFixed(3)} 
              Z: ${(rotation.z || 0).toFixed(3)}
            </span>
          </div>
          
          <div style="margin-top: 4px;">
            <span style="color: #888;">Scale:</span><br>
            <span style="color: #fff; font-size: 9px;">
              ${(scale.x || 0).toFixed(3)}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  renderModelTransformSection(position, rotation, scale, visible) {
    position = position || [0, 0, 0];
    rotation = rotation || [0, 0, 0];
    scale = scale || [0, 0, 0];

    return `
      <div style="margin-bottom: 12px; padding: 8px; background: rgba(100, 0, 100, 0.15); border-radius: 5px;">
        <h4 style="color: #ff00ff; margin: 0 0 5px 0; font-size: 12px;">👒 MODEL TRANSFORM</h4>
        <div style="font-size: 10px; line-height: 1.4;">
          <span style="color: #888;">Visible:</span> 
          <span style="color: ${visible ? "#00ff00" : "#ff0000"};">
            ${visible ? "YES ✓" : "NO ✗"}
          </span><br>
          
          <div style="margin-top: 4px;">
            <span style="color: #888;">Position:</span><br>
            <span style="color: #fff; font-size: 9px;">
              X: ${(position[0] || 0).toFixed(3)} 
              Y: ${(position[1] || 0).toFixed(3)} 
              Z: ${(position[2] || 0).toFixed(3)}
            </span>
          </div>
          
          <div style="margin-top: 4px;">
            <span style="color: #888;">Rotation:</span><br>
            <span style="color: #fff; font-size: 9px;">
              X: ${(rotation[0] || 0).toFixed(3)} 
              Y: ${(rotation[1] || 0).toFixed(3)} 
              Z: ${(rotation[2] || 0).toFixed(3)}
            </span>
          </div>
          
          <div style="margin-top: 4px;">
            <span style="color: #888;">Scale:</span><br>
            <span style="color: #fff; font-size: 9px;">
              X: ${(scale[0] || 0).toFixed(3)} 
              Y: ${(scale[1] || 0).toFixed(3)} 
              Z: ${(scale[2] || 0).toFixed(3)}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  renderSmartModeSection(smartMode) {
    if (!smartMode) return "";

    const { enabled, isCalibrating, morphology, fitRate } = smartMode;

    return `
      <div style="margin-bottom: 12px; padding: 8px; background: rgba(0, 150, 255, 0.15); border-radius: 5px;">
        <h4 style="color: #0099ff; margin: 0 0 5px 0; font-size: 12px;">🧠 SMART MODE</h4>
        <div style="font-size: 10px; line-height: 1.4;">
          <span style="color: #888;">Enabled:</span> 
          <span style="color: ${enabled ? "#00ff00" : "#ff0000"};">
            ${enabled ? "YES ✓" : "NO ✗"}
          </span><br>
          
          ${
            enabled && isCalibrating
              ? `
            <span style="color: #ffff00;">⏳ Calibration en cours...</span><br>
          `
              : ""
          }
          
          ${
            enabled && morphology
              ? `
            <span style="color: #888;">Morphology:</span> 
            <span style="color: #fff;">${morphology}</span><br>
          `
              : ""
          }
          
          ${
            enabled && fitRate
              ? `
            <span style="color: #888;">Fit Quality:</span> 
            <span style="color: #fff;">${fitRate}%</span><br>
          `
              : ""
          }
        </div>
      </div>
    `;
  }

  renderFeaturesSection(occlusionEnabled) {
    return `
      <div style="margin-bottom: 12px; padding: 8px; background: rgba(150, 75, 0, 0.15); border-radius: 5px;">
        <h4 style="color: #ff9900; margin: 0 0 5px 0; font-size: 12px;">⚙️ FEATURES</h4>
        <div style="font-size: 10px; line-height: 1.4;">
          <span style="color: #888;">Occlusion:</span> 
          <span style="color: ${occlusionEnabled ? "#00ff00" : "#ff0000"};">
            ${occlusionEnabled ? "ON ✓" : "OFF ✗"}
          </span>
        </div>
      </div>
    `;
  }

  renderCameraSection(fov, position) {
    position = position || [0, 0, 0];

    return `
      <div style="margin-bottom: 12px; padding: 8px; background: rgba(0, 100, 100, 0.15); border-radius: 5px;">
        <h4 style="color: #00ffff; margin: 0 0 5px 0; font-size: 12px;">📷 CAMERA</h4>
        <div style="font-size: 10px; line-height: 1.4;">
          <span style="color: #888;">FOV:</span> 
          <span style="color: #fff;">${(fov || 0).toFixed(1)}°</span><br>
          
          <span style="color: #888;">Position Z:</span> 
          <span style="color: #fff;">${(position[2] || 0).toFixed(2)}</span>
        </div>
      </div>
    `;
  }

  renderPerformanceSection(fps, avgFrameTime, fpsColor) {
    return `
      <div style="margin-bottom: 12px; padding: 8px; background: rgba(100, 100, 0, 0.15); border-radius: 5px;">
        <h4 style="color: #ffff00; margin: 0 0 5px 0; font-size: 12px;">⚡ PERFORMANCE</h4>
        <div style="font-size: 10px; line-height: 1.4;">
          <span style="color: #888;">FPS:</span> 
          <span style="color: ${fpsColor}; font-weight: bold;">${
      fps || 0
    }</span><br>
          
          <span style="color: #888;">Frame Time:</span> 
          <span style="color: #fff;">${Number(avgFrameTime || 0).toFixed(
            2
          )} ms</span><br>
          
          <span style="color: #888;">Status:</span> 
          <span style="color: ${
            fps > 50 ? "#00ff00" : fps > 30 ? "#ffff00" : "#ff0000"
          };">
            ${fps > 50 ? "Excellent" : fps > 30 ? "Good" : "Low"}
          </span>
        </div>
      </div>
    `;
  }
}
