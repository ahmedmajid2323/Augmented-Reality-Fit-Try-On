import React, { useEffect, useRef, useState } from "react";
import { CameraManager } from "./managers/CameraManager";
import { WorkerPool } from "./managers/WorkerPool";
import { ModelCache } from "./managers/ModelCache";
import { RenderManager } from "./managers/RenderManager";
import { ModelGallery } from "./components/ui/ModelGallery";
import { CategoryTabs } from "./components/ui/CategoryTabs";
import { TrackingIndicator } from "./components/ui/TrackingIndicator";
import "./styles/App.css";

export default function App() {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const managersRef = useRef({});
  const initStartedRef = useRef(false);

  const [category, setCategory] = useState("head");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [trackingStatus, setTrackingStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [showGallery, setShowGallery] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({
    trackingActive: false,
    landmarksReceived: 0,
    modelVisible: false,
    modelPosition: null,
    lastUpdate: null,
  });

  // Initialize managers
  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    let mounted = true;

    const initialize = async () => {
      try {
        // Wait for canvas
        for (let i = 0; i < 20; i++) {
          if (canvasRef.current) break;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        if (!canvasRef.current) throw new Error("Canvas initialization failed");

        // Initialize managers
        const workers = new WorkerPool();
        await workers.initialize();
        managersRef.current.workers = workers;
        window.workerPool = workers;

        const models = new ModelCache();
        await models.initialize();
        managersRef.current.models = models;

        const render = new RenderManager(canvasRef.current);
        render.startRenderLoop();
        managersRef.current.render = render;

        // Tracking updates
        workers.onUpdate((type, data) => {
          if (!mounted) return;

          setTrackingStatus((prev) => ({ ...prev, [type]: data }));

          setDebugInfo((prev) => ({
            ...prev,
            trackingActive: !!data,
            landmarksReceived: prev.landmarksReceived + 1,
            lastUpdate: new Date().toLocaleTimeString(),
            modelPosition: data
              ? {
                  x: data.position.x.toFixed(3),
                  y: data.position.y.toFixed(3),
                  z: data.position.z.toFixed(3),
                  confidence: (data.confidence * 100).toFixed(0),
                }
              : null,
          }));

          if (data && managersRef.current.render) {
            managersRef.current.render.updateModelTransform(type, {
              position: data.position,
              rotation: data.rotation,
              scale: data.scale,
              confidence: data.confidence,
            });

            const model = managersRef.current.render.models[type];
            if (model) {
              setDebugInfo((prev) => ({
                ...prev,
                modelVisible: model.visible,
              }));
            }
          }
        });

        if (mounted) {
          setInitialized(true);
          setLoading(false);
          console.log("✅ Initialization complete");
        }
      } catch (err) {
        console.error("Init error:", err);
        if (mounted) {
          setLoading(false);
          setError(err.message);
        }
      }
    };

    setTimeout(initialize, 500);

    return () => {
      mounted = false;
      managersRef.current.camera?.dispose();
      managersRef.current.workers?.dispose();
      managersRef.current.render?.dispose();
    };
  }, []);

  const handleSelectProduct = async (product) => {
    if (!initialized) {
      alert("Please wait for initialization...");
      return;
    }

    try {
      setLoading(true);

      if (!managersRef.current.camera) {
        const camera = new CameraManager();
        await camera.initialize(managersRef.current.workers);
        managersRef.current.camera = camera;
        camera.startCapture();

        if (videoRef.current && camera.video) {
          videoRef.current.srcObject = camera.video.srcObject;
          await videoRef.current.play();
        }
      }

      const model = await managersRef.current.models.loadModel(
        product.modelUrl,
        category
      );

      managersRef.current.render.addModel(category, model, product);

      setSelectedProduct(product);
      setShowGallery(false);
      setLoading(false);
    } catch (err) {
      console.error("Error:", err);
      setLoading(false);
      alert(`Error loading product: ${err.message}`);
    }
  };

  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
    setSelectedProduct(null);
    setShowGallery(true);
    
    // Stop and dispose camera
    managersRef.current.camera?.stopCapture();
    managersRef.current.camera?.dispose();
    managersRef.current.camera = null;
    
    managersRef.current.render?.removeModel(category);

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setDebugInfo({
      trackingActive: false,
      landmarksReceived: 0,
      modelVisible: false,
      modelPosition: null,
      lastUpdate: null,
    });
  };


  const handleBack = () => {
    setSelectedProduct(null);
    setShowGallery(true);
    
    // Stop camera capture
    managersRef.current.camera?.stopCapture();
    
    // **NEW: Fully dispose of camera instance**
    managersRef.current.camera?.dispose();
    managersRef.current.camera = null;
    
    // Remove 3D model
    managersRef.current.render?.removeModel(category);

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Reset debug info
    setDebugInfo({
      trackingActive: false,
      landmarksReceived: 0,
      modelVisible: false,
      modelPosition: null,
      lastUpdate: null,
    });
  };

  return (
    <>
      {/* Video feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
          display: "block",
        }}
      />

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        id="ar-canvas"
        width={window.innerWidth}
        height={window.innerHeight}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "block",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Loading overlay */}
      {loading && !initialized && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            zIndex: 1000,
          }}
        >
          <div style={{ fontSize: "60px", marginBottom: "20px" }}>🚀</div>
          <h2>Initializing AR System...</h2>
        </div>
      )}

      {/* Error overlay */}
      {error && !initialized && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            padding: "20px",
            textAlign: "center",
            zIndex: 1000,
          }}
        >
          <h2 style={{ fontSize: "32px", marginBottom: "20px" }}>
            Initialization Failed
          </h2>
          <p style={{ fontSize: "18px", marginBottom: "30px" }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "white",
              color: "#ff6b6b",
              border: "none",
              padding: "15px 40px",
              borderRadius: "8px",
              fontSize: "18px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload Page
          </button>
        </div>
      )}

      {/* Main UI */}
      {initialized && (
        <div>
          <CategoryTabs active={category} onChange={handleCategoryChange} />

          {showGallery && (
            <ModelGallery
              category={category}
              onSelectProduct={handleSelectProduct}
              loading={loading}
            />
          )}

          {selectedProduct && !showGallery && (
            <>
              <TrackingIndicator status={trackingStatus} />

              <button className="back-button" onClick={handleBack}>
                ← Back to Gallery
              </button>

              <div className="product-info-overlay">
                <h3>{selectedProduct.name}</h3>
                <p>{selectedProduct.price}</p>
              </div>
            </>
          )}

          {loading && !showGallery && (
            <div
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                background: "rgba(0,0,0,0.8)",
                color: "white",
                padding: "20px 40px",
                borderRadius: "12px",
                fontSize: "18px",
                zIndex: 1000,
              }}
            >
              Loading model...
            </div>
          )}

          {/* Debug overlay */}
          {selectedProduct && (
            <div
              style={{
                position: "fixed",
                top: "10px",
                right: "10px",
                background: "rgba(0,0,0,0.95)",
                color: "white",
                padding: "15px",
                borderRadius: "12px",
                fontSize: "12px",
                fontFamily: "monospace",
                zIndex: 9999,
                border: "2px solid cyan",
                minWidth: "300px",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: "14px",
                  marginBottom: "10px",
                  color: "cyan",
                }}
              >
                📊 TRACKING DEBUG
              </div>
              <div style={{ marginBottom: "8px" }}>
                <strong>Tracking Active:</strong>{" "}
                {debugInfo.trackingActive ? "✅ YES" : "❌ NO"}
              </div>
              <div style={{ marginBottom: "8px" }}>
                <strong>Landmarks Received:</strong>{" "}
                {debugInfo.landmarksReceived}
              </div>
              <div style={{ marginBottom: "8px" }}>
                <strong>Model Visible:</strong>{" "}
                {debugInfo.modelVisible ? "✅ YES" : "❌ NO"}
              </div>
              <div style={{ marginBottom: "8px" }}>
                <strong>Last Update:</strong> {debugInfo.lastUpdate || "None"}
              </div>
              {debugInfo.modelPosition && (
                <div
                  style={{
                    marginTop: "10px",
                    paddingTop: "10px",
                    borderTop: "1px solid cyan",
                  }}
                >
                  <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
                    Model Position:
                  </div>
                  <div>X: {debugInfo.modelPosition.x}</div>
                  <div>Y: {debugInfo.modelPosition.y}</div>
                  <div>Z: {debugInfo.modelPosition.z}</div>
                  <div>Confidence: {debugInfo.modelPosition.confidence}%</div>
                </div>
              )}
              {!debugInfo.trackingActive && debugInfo.landmarksReceived === 0 && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    background: "rgba(255,0,0,0.3)",
                    borderRadius: "8px",
                    border: "1px solid red",
                  }}
                >
                  ⚠️ NO TRACKING DATA!
                  <br />
                  Check console for worker errors
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
