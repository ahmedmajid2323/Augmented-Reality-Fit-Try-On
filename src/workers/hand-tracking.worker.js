// src/workers/hand-tracking.worker.js
// Stub worker for hand tracking (not implemented yet)

self.onmessage = async (event) => {
  const { type } = event.data;

  switch (type) {
    case "init":
      console.log("[HAND WORKER] Initialized (stub)");
      self.postMessage({ type: "ready" });
      break;

    case "process":
      // Do nothing - hand tracking not implemented
      if (event.data.data && event.data.data.bitmap) {
        event.data.data.bitmap.close();
      }
      break;

    case "dispose":
      console.log("[HAND WORKER] Disposed");
      break;
  }
};

console.log("[HAND WORKER] Script loaded (stub)");