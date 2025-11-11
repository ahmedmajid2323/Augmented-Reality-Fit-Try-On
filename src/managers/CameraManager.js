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

    // Get camera with optimal settings
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

    console.log("✅ Camera initialized");
  }

  startCapture() {
    if (this.isRunning) return;
    this.isRunning = true;

    let lastFrameTime = 0;
    const frameInterval = 1000 / this.frameRate;

    const captureFrame = async (timestamp) => {
      if (!this.isRunning) return;

      // Throttle to 30fps
      if (timestamp - lastFrameTime < frameInterval) {
        requestAnimationFrame(captureFrame);
        return;
      }
      lastFrameTime = timestamp;

      try {
        // Draw to offscreen canvas
        this.ctx.drawImage(this.video, 0, 0, 1280, 720);

        // Create ImageBitmap for zero-copy transfer
        const bitmap = await createImageBitmap(this.canvas);

        // Send to workers (transfers bitmap ownership)
        await this.workerPool.processFrame(bitmap, timestamp);
      } catch (error) {
        console.error("Frame capture error:", error);
      }

      requestAnimationFrame(captureFrame);
    };

    requestAnimationFrame(captureFrame);
    console.log("✅ Camera capture started");
  }

  stopCapture() {
    this.isRunning = false;
    console.log("⏸️ Camera capture stopped");
  }

  getVideoElement() {
    return this.video;
  }

  dispose() {
    this.stopCapture();
    this.stream?.getTracks().forEach((track) => track.stop());
    console.log("🧹 Camera disposed");
  }
}
