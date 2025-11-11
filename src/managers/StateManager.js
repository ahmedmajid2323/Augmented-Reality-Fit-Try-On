// src/managers/StateManager.js
export class StateManager {
  constructor() {
    this.listeners = new Map();
    this.state = {
      initialized: false,
      cameraActive: false,
      currentCategory: 'head',
      selectedProduct: null,
      trackingStatus: {},
      errors: []
    };
  }

  setState(key, value) {
    this.state[key] = value;
    this.notify(key, value);
    console.log(`[StateManager] ${key} =`, value);
  }

  getState(key) {
    return this.state[key];
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);
  }

  notify(key, value) {
    const callbacks = this.listeners.get(key);
    if (callbacks) {
      callbacks.forEach(cb => cb(value));
    }
  }

  logError(error, context) {
    const errorInfo = {
      message: error.message,
      context,
      timestamp: new Date().toISOString()
    };
    this.state.errors.push(errorInfo);
    console.error(`[StateManager] Error in ${context}:`, error);
  }
}
