// src/workers/foot-tracking.worker.js
// Stub worker for foot tracking (not implemented yet)

self.onmessage = async (event) => {
  const { type } = event.data;

  switch (type) {
    case "init":
      console.log("[FOOT WORKER] Initialized (stub)");
      self.postMessage({ type: "ready" });
      break;

    case "process":
      // Do nothing - foot tracking not implemented
      if (event.data.data && event.data.data.bitmap) {
        event.data.data.bitmap.close();
      }
      break;

    case "dispose":
      console.log("[FOOT WORKER] Disposed");
      break;
  }
};

console.log("[FOOT WORKER] Script loaded (stub)");
