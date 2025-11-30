import { CONFIG} from '../config.js';
import * as THREE from 'three';


/**
 * RenderEngine - Moteur de rendu 3D simplifié
 * Affiche le modèle 3D avec Three.js
 */
export class RenderEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.currentModel = null;
        this.isRendering = false;
        this.animationFrameId = null;
        
 
        // Stats
        this.stats = {
            fps: 0,
            frameCount: 0,
            lastTime: performance.now()
        };
        
        this.initialize();
    }
    
    /**
     * Initialise le moteur de rendu
     */
    initialize() {
        // Scène
        this.scene = new THREE.Scene();
        this.scene.background = null; // Transparent
        
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Caméra
        this.camera = new THREE.PerspectiveCamera(63, width / height, 0.1, 1000);
        this.camera.position.z = 2;
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: CONFIG.rendering?.antialias ?? true,
            powerPreference: CONFIG.rendering?.powerPreference ?? 'high-performance'
        });
        
        this.renderer.setSize(width, height);
        this.canvas.width = width;
        this.canvas.height = height;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Couleurs
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        // Lumières
        this.setupLights();
        
        // Resize
        window.addEventListener('resize', () => this.handleResize());
        
        console.log('[RenderEngine] ✅ Initialized');
    }
    
    /**
     * Configure l'éclairage
     */
    setupLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(ambient);
        
        const directional = new THREE.DirectionalLight(0xffffff, 0.8);
        directional.position.set(5, 10, 7.5);
        this.scene.add(directional);
    }
    
    /**
     * Définit le modèle actuel
     */
    setModel(model) {
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
        }
        
        this.currentModel = model;
        
        if (model) {
            this.scene.add(model);
            console.log('[RenderEngine] 🎨 Model added to scene');
        }
    }
    
    /**
     * Démarre le rendu
     */
    startRendering() {
        if (this.isRendering) return;
        
        this.isRendering = true;
        this.animate();
        console.log('[RenderEngine] ▶️ Rendering started');
    }
    
    /**
     * Boucle d'animation
     */
    animate() {
        if (!this.isRendering) return;
        
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        
        // Rendu
        this.renderer.render(this.scene, this.camera);
        
        // Stats
        this.updateStats();
    }
    
    /**
     * Met à jour les stats FPS
     */
    updateStats() {
        this.stats.frameCount++;
        const now = performance.now();
        const delta = now - this.stats.lastTime;
        
        if (delta >= 1000) {
            this.stats.fps = Math.round((this.stats.frameCount * 1000) / delta);
            this.stats.frameCount = 0;
            this.stats.lastTime = now;
        }
    }
    
    /**
     * Gère le redimensionnement
     */
    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
        this.canvas.width = width;
        this.canvas.height = height;
    }
    
    /**
     * Arrête le rendu
     */
    stopRendering() {
        this.isRendering = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }
    
    /**
     * Obtient les stats
     */
    getStats() {
        return {
            fps: this.stats.fps,
            renderer: this.renderer.info.render
        };
    }
    
    /**
     * Nettoie les ressources
     */
    dispose() {
        this.stopRendering();
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
        }
        if (this.renderer) {
            this.renderer.dispose();
        }
        window.removeEventListener('resize', this.handleResize);
    }
}
