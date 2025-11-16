// src/workers/head-tracking.worker.js
importScripts(
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core@4.12.0/dist/tf-core.min.js"
);
importScripts(
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-converter@4.12.0/dist/tf-converter.min.js"
);
importScripts(
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl@4.12.0/dist/tf-backend-webgl.min.js"
);
importScripts(
  "https://cdn.jsdelivr.net/npm/@tensorflow-models/face-landmarks-detection@1.0.2/dist/face-landmarks-detection.min.js"
);

let detector = null;
let isProcessing = false;
let frameCount = 0;

self.onmessage = async (event) => {
  const { type, data } = event.data;

  switch (type) {
    case "init":
      await initializeDetector();
      break;

    case "process":
      frameCount++;

      if (!detector) {
        if (data.bitmap) data.bitmap.close();
        return;
      }

      if (isProcessing) {
        if (data.bitmap) data.bitmap.close();
        return;
      }

      await processFrame(data.bitmap, data.timestamp);
      break;

    case "dispose":
      if (detector) detector.dispose();
      self.close();
      break;
  }
};

async function initializeDetector() {
  try {
    await tf.setBackend("webgl");
    await tf.ready();

    detector = await faceLandmarksDetection.createDetector(
      faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
      {
        runtime: "tfjs",
        refineLandmarks: false,
        maxFaces: 1,
      }
    );

    self.postMessage({ type: "ready" });
  } catch (error) {
    self.postMessage({ type: "error", error: error.message });
  }
}

async function processFrame(bitmap, timestamp) {
  isProcessing = true;

  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    bitmap.close();

    const tensor = tf.browser.fromPixels(imageData);

    const faces = await detector.estimateFaces(tensor, {
      flipHorizontal: false,
      staticImageMode: false,
    });

    tensor.dispose();

    if (faces && faces.length > 0) {
      handleFace(faces[0], imageData.width, imageData.height);
    } else {
      self.postMessage({ type: "tracking_lost" });
    }

    isProcessing = false;
  } catch (error) {
    isProcessing = false;
    if (bitmap) bitmap.close();
  }
}

function handleFace(face, width, height) {
  const kp = face.keypoints;

  const leftEye = kp.find((p) => p.name === "leftEye") || kp[33] || kp[0];
  const rightEye = kp.find((p) => p.name === "rightEye") || kp[263] || kp[1];
  const nose = kp.find((p) => p.name === "noseTip") || kp[1] || kp[2];

  const position = {
    x: (leftEye.x + rightEye.x) / 2 / width,
    y: (leftEye.y + rightEye.y) / 2 / height,
    z: ((leftEye.z || 0) + (rightEye.z || 0)) / 2,
  };

  const lx = leftEye.x / width,
    ly = leftEye.y / height;
  const rx = rightEye.x / width,
    ry = rightEye.y / height;
  const nx = nose.x / width,
    ny = nose.y / height;

  const eyeCenterX = (lx + rx) / 2;
  const eyeDistance = Math.abs(rx - lx);
  const yaw =
    eyeDistance > 0 ? ((nx - eyeCenterX) / eyeDistance) * Math.PI * 0.5 : 0;

  const eyeCenterY = (ly + ry) / 2;
  const pitch = (ny - eyeCenterY) * Math.PI * 0.3;
  const roll = Math.atan2(ry - ly, rx - lx);

  const rotation = { x: pitch, y: yaw, z: roll };

  const eyeDist = Math.sqrt(Math.pow(rx - lx, 2) + Math.pow(ry - ly, 2));
  const scale = {
    x: eyeDist * 5,
    y: eyeDist * 5,
    z: eyeDist * 5,
  };

  const confidence = kp.length >= 400 ? 0.9 : 0.7;

  self.postMessage({
    type: "landmarks",
    position,
    rotation,
    scale,
    confidence,
    timestamp: performance.now(),
  });
}
