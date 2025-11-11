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

    console.log("✅ RenderManager created successfully");
  }

  setupScene() {
    this.camera.position.z = 2;

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.scene.background = null;

    console.log("✅ Scene setup complete");
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
    console.log(`[RENDER] Adding model for ${category}`);

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

    // TRY THESE ROTATIONS (test one at a time):
    model.rotation.x = Math.PI; // Flip vertically
    // OR
    // model.rotation.z = Math.PI;  // Flip horizontally
    // OR
    // model.rotation.x = Math.PI;
    model.rotation.y = Math.PI;

    // ALSO ADD:
    model.traverse((child) => {
      if (child.isMesh) {
        child.material.side = THREE.DoubleSide; // Render both sides
        child.material.needsUpdate = true;
      }
    });

    // FORCE VISIBLE FOR TESTING
    model.visible = true;

    this.models[category] = model;
    this.scene.add(model);

    console.log(`✅ Model added:`, {
      category,
      name: product.name,
      position: model.position,
      scale: model.scale,
      visible: model.visible,
      children: model.children.length,
    });
  }

  updateModelTransform(category, transform) {
    this.updateCount++;

    if (this.updateCount % 30 === 0) {
      console.log(
        `[RENDER] updateModelTransform called ${this.updateCount} times`
      );
    }

    const model = this.models[category];

    if (!model) {
      console.warn(`[RENDER] No model found for category: ${category}`);
      return;
    }

    const offset = model.userData.offset;
    const baseScale = model.userData.baseScale;

    // Calculate position
    model.position.set(
      (transform.position.x - 0.5) * 4 + offset.x,
      -(transform.position.y - 0.5) * 4 + offset.y,
      -3.0 + offset.z
    );

    // Rotation
    model.rotation.set(
      Math.PI + transform.rotation.x,
      Math.PI + transform.rotation.y,
      transform.rotation.z
    );

    // Scale
    const scaleFactor = transform.confidence * transform.scale.x * 0.1;
    const newScale = {
      x: baseScale.x * scaleFactor,
      y: baseScale.y * scaleFactor,
      z: baseScale.z * scaleFactor,
    };

    model.scale.set(newScale.x, newScale.y, -newScale.z);

    // Visibility
    const shouldBeVisible = transform.confidence > 0.5;
    model.visible = shouldBeVisible;

    if (this.updateCount % 30 === 0) {
      console.log(`[RENDER] Model state:`, {
        position: newPos,
        scale: newScale,
        visible: model.visible,
        confidence: transform.confidence,
        inScene: this.scene.children.includes(model),
      });
    }
  }

  removeModel(category) {
    if (this.models[category]) {
      this.scene.remove(this.models[category]);
      delete this.models[category];
      console.log(`🗑️ Removed model: ${category}`);
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
      if (frameCount % 300 === 0) {
        console.log(
          `[RENDER] Rendering at 60fps, models:`,
          Object.keys(this.models)
        );
      }
    };

    animate();
    console.log("✅ Render loop started");
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
