// src/managers/RenderManager.js
import * as THREE from "three";
import { MODELS_CONFIG } from "../config/models.config";

export class RenderManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.models = {};
    this.isRendering = false;
    this.updateCount = 0;

    this.setupScene();
    this.setupLights();

    window.addEventListener("resize", this.handleResize.bind(this));
  }

  setupScene() {
    this.camera.position.z = 2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.scene.background = null;
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(5, 10, 7.5);
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 0, -5);
    this.scene.add(fillLight);
  }

  addModel(category, model, product) {
    if (this.models[category]) {
      this.scene.remove(this.models[category]);
    }

    const productList = MODELS_CONFIG[category];
    const productConfig =
      productList.find((p) => p.id === product.id) || productList[0];

    model.userData = {
      offset: productConfig.offset,
      category,
      baseScale: { ...productConfig.scale },
    };

    model.scale.set(
      productConfig.scale.x,
      productConfig.scale.y,
      -productConfig.scale.z
    );

    model.rotation.x = Math.PI;

    model.traverse((child) => {
      if (child.isMesh) {
        child.material.side = THREE.DoubleSide;
        child.material.needsUpdate = true;
      }
    });

    model.visible = true;
    this.models[category] = model;
    this.scene.add(model);
  }

  updateModelTransform(category, transform) {
    this.updateCount++;

    const model = this.models[category];
    if (!model) return;

    const offset = model.userData.offset;
    const baseScale = model.userData.baseScale;

    model.position.set(
      (transform.position.x - 0.5) * 4 + offset.x,
      -(transform.position.y - 0.5) * 4 + offset.y,
      -3.0 + offset.z
    );

    model.rotation.set(
      Math.PI + transform.rotation.x,
      Math.PI + transform.rotation.y,
      transform.rotation.z
    );

    const scaleFactor = transform.confidence * transform.scale.x * 0.1;
    const newScale = {
      x: baseScale.x * scaleFactor,
      y: baseScale.y * scaleFactor,
      z: baseScale.z * scaleFactor,
    };

    model.scale.set(newScale.x, newScale.y, -newScale.z);

    const shouldBeVisible = transform.confidence > 0.5;
    model.visible = shouldBeVisible;
  }

  removeModel(category) {
    if (this.models[category]) {
      this.scene.remove(this.models[category]);
      delete this.models[category];
    }
  }

  startRenderLoop() {
    this.isRendering = true;
    let frameCount = 0;

    const animate = () => {
      if (!this.isRendering) return;
      requestAnimationFrame(animate);
      this.renderer.render(this.scene, this.camera);
      frameCount++;
    };

    animate();
  }

  stopRenderLoop() {
    this.isRendering = false;
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  dispose() {
    this.stopRenderLoop();
    Object.values(this.models).forEach((model) => this.scene.remove(model));
    this.renderer.dispose();
    window.removeEventListener("resize", this.handleResize);
  }
}
