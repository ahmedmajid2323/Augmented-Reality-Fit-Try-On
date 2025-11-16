// src/managers/WorkerPool.js
export class WorkerPool {
  constructor() {
    this.workers = {};
    this.latestResults = {};
    this.listeners = [];
    this.processingFlags = {};
  }

  async initialize() {
    this.workers.head = new Worker(
      new URL("../workers/head-tracking.worker.js", import.meta.url)
    );
    this.workers.hand = new Worker(
      new URL("../workers/hand-tracking.worker.js", import.meta.url)
    );
    this.workers.foot = new Worker(
      new URL("../workers/foot-tracking.worker.js", import.meta.url)
    );

    Object.entries(this.workers).forEach(([type, worker]) => {
      worker.onmessage = (event) => this.handleWorkerMessage(type, event);
      worker.onerror = (error) => console.error(`${type} worker error:`, error);
    });

    await Promise.all(
      Object.keys(this.workers).map((type) =>
        this.sendToWorker(type, { type: "init" })
      )
    );
  }

  async processFrame(bitmap, timestamp) {
    if (this.workers.head && !this.processingFlags.head) {
      this.processingFlags.head = true;
      await this.sendToWorker(
        "head",
        { type: "process", data: { bitmap, timestamp } },
        [bitmap]
      );
    } else if (bitmap) {
      bitmap.close();
    }
  }

  handleWorkerMessage(type, event) {
    const { type: messageType, ...data } = event.data;

    switch (messageType) {
      case "ready":
        break;

      case "landmarks":
        this.processingFlags[type] = false;
        this.latestResults[type] = data;
        this.notifyListeners(type, data);
        break;

      case "tracking_lost":
        this.processingFlags[type] = false;
        this.latestResults[type] = null;
        this.notifyListeners(type, null);
        break;

      case "error":
        this.processingFlags[type] = false;
        break;
    }
  }

  sendToWorker(type, message, transfer) {
    return new Promise((resolve) => {
      this.workers[type].postMessage(message, transfer);
      resolve();
    });
  }

  onUpdate(callback) {
    this.listeners.push(callback);
  }

  notifyListeners(type, data) {
    this.listeners.forEach((cb) => cb(type, data));
  }

  getLatestResults() {
    return { ...this.latestResults };
  }

  dispose() {
    Object.values(this.workers).forEach((worker) => {
      worker.postMessage({ type: "dispose" });
      worker.terminate();
    });
  }
}
