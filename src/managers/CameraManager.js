// src/managers/CameraManager.js
export class CameraManager {
  constructor() {
    this.stream = null;
    this.video = document.createElement("video");
    this.canvas = new OffscreenCanvas(1280, 720);
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    this.frameRate = 30;
    this.workerPool = null;
    this.isRunning = false;
  }

  async initialize(workerPool) {
    this.workerPool = workerPool;

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
    });

    this.video.srcObject = this.stream;
    await this.video.play();
  }

  startCapture() {
    if (this.isRunning) return;

    this.isRunning = true;
    let lastFrameTime = 0;
    const frameInterval = 1000 / this.frameRate;

    const captureFrame = async (timestamp) => {
      if (!this.isRunning) return;

      if (timestamp - lastFrameTime < frameInterval) {
        requestAnimationFrame(captureFrame);
        return;
      }

      lastFrameTime = timestamp;

      try {
        this.ctx.drawImage(this.video, 0, 0, 1280, 720);
        const bitmap = await createImageBitmap(this.canvas);
        await this.workerPool.processFrame(bitmap, timestamp);
      } catch (error) {
        // Silent fail
      }

      requestAnimationFrame(captureFrame);
    };

    requestAnimationFrame(captureFrame);
  }

  stopCapture() {
    this.isRunning = false;
  }

  getVideoElement() {
    return this.video;
  }

  dispose() {
    this.stopCapture();
    this.stream?.getTracks().forEach((track) => track.stop());
  }
}
