import { CONFIG} from '../config.js';

/**
 * FaceTracker - Tracking facial avec MediaPipe
 */
export class FaceTracker {
    constructor() {
        this.detector = null;
        this.isInitialized = false;
        this.isTracking = false;
        
        // Canvas temporaire
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d');
        
        // Callbacks
        this.onTrackingUpdate = null;
        this.onFaceLost = null;
    }
    
    /**
     * Initialise MediaPipe
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            await tf.setBackend('webgl');
            await tf.ready();
            
            this.detector = await faceLandmarksDetection.createDetector(
                faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
                {
                    runtime: 'tfjs',
                    refineLandmarks: CONFIG.faceMesh?.refineLandmarks ?? true,
                    maxFaces: CONFIG.faceMesh?.maxNumFaces ?? 1,
                    minDetectionConfidence: CONFIG.faceMesh?.minDetectionConfidence ?? 0.7,
                    minTrackingConfidence: CONFIG.faceMesh?.minTrackingConfidence ?? 0.7
                }
            );
            
            this.isInitialized = true;
            console.log('[FaceTracker] ✅ Initialized');
        } catch (error) {
            console.error('[FaceTracker] ❌ Initialization error:', error);
            throw error;
        }
    }
    
    /**
     * Démarre le tracking
     */
    startTracking() {
        this.isTracking = true;
        console.log('[FaceTracker] 🎬 Tracking started');
    }
    
    /**
     * Arrête le tracking
     */
    stopTracking() {
        this.isTracking = false;
        console.log('[FaceTracker] ⏸️ Tracking stopped');
    }
    
    /**
     * Traite une frame vidéo
     */
    async processFrame(video, timestamp = Date.now()) {
        if (!this.isInitialized || !this.isTracking) {
            return null;
        }
        
        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
            return null;
        }
        
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            return null;
        }
        
        try {
            // Flip horizontal
            this.tempCanvas.width = video.videoWidth;
            this.tempCanvas.height = video.videoHeight;
            
            this.tempCtx.save();
            this.tempCtx.scale(-1, 1);
            this.tempCtx.drawImage(video, -video.videoWidth, 0, video.videoWidth, video.videoHeight);
            this.tempCtx.restore();
            
            // Détection
            const faces = await this.detector.estimateFaces(this.tempCanvas, {
                flipHorizontal: false,
                staticImageMode: false
            });
            
            if (!faces || faces.length === 0) {
                if (this.onFaceLost) this.onFaceLost();
                return null;
            }
            
            const face = faces[0];
            
            // Retourner les données
            return {
                rawKeypoints: face.keypoints,
                confidence: 1.0,
                timestamp: timestamp
            };
            
        } catch (error) {
            console.error('[FaceTracker] ❌ Processing error:', error);
            return null;
        }
    }
    
    /**
     * Nettoie les ressources
     */
    dispose() {
        if (this.detector) {
            this.detector.dispose();
        }
        this.stopTracking();
        console.log('[FaceTracker] 🗑️ Resources disposed');
    }
}
