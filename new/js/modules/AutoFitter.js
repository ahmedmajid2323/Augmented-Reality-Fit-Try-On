import * as THREE from 'three';

/**
 * 🎯 AutoFitter - Ajustement automatique parfait
 * Analyse le modèle et calcule le placement optimal automatiquement
 */
export class AutoFitter {
    /**
     * Analyse un modèle 3D et retourne ses caractéristiques
     */
    analyzeModel(model) {
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        
        box.getSize(size);
        box.getCenter(center);
        
        return {
            box: box,
            size: size,
            center: center,
            height: size.y,
            width: size.x,
            depth: size.z,
            // Point le plus bas (là où le chapeau touche la tête)
            bottom: box.min.y
        };
    }
    
    /**
     * Prépare un modèle pour le fitting automatique
     */
    prepareModel(model) {
        const analysis = this.analyzeModel(model);
        
        // 1. Normaliser l'échelle du modèle
        const maxDim = Math.max(analysis.width, analysis.height, analysis.depth);
        const normalizeScale = 1.0 / maxDim;
        model.scale.setScalar(normalizeScale);
        
        // 2. Recalculer après normalisation
        const normalizedAnalysis = this.analyzeModel(model);
        
        // 3. Centrer le modèle sur X et Z
        model.position.x = -normalizedAnalysis.center.x;
        model.position.z = -normalizedAnalysis.center.z;
        
        // 4. Position Y = 0 au point le plus bas (le chapeau "repose" sur Y=0)
        model.position.y = -normalizedAnalysis.bottom;
        
        return {
            model: model,
            analysis: normalizedAnalysis
        };
    }
    
    /**
     * Applique la transformation au modèle
     */
    applyTransform(model, transform) {
        if (!model || !transform) return;
        
        // Position
        model.position.copy(transform.position);
        
        // Rotation
        model.rotation.copy(transform.rotation);
        
        // Scale (miroir sur X pour correspondre à la vidéo)
        model.scale.set(
            -transform.scale,  // Miroir X
            transform.scale,   
            transform.scale
        );
    }
}
