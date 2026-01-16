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
            bottom: box.min.y
        };
    }
    
    /**
     * Prépare un modèle pour le fitting automatique
     * ⚠️ Used mainly for hats & glasses
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
        
        // 4. Position Y = 0 au point le plus bas
        model.position.y = -normalizedAnalysis.bottom;
        
        return {
            model: model,
            analysis: normalizedAnalysis
        };
    }
    
    /**
     * 🔄 Apply transform with product awareness
     */
    applyTransform(model, transform, productType = "hat") {
        if (!model || !transform) return;

        switch (productType) {
            case "headphones":
                this.applyHeadphones(model, transform);
                break;

            default:
                this.applyDefault(model, transform);
        }
    }

    /**
     * 🎩 Default behavior (hats, glasses)
     */
    applyDefault(model, transform) {
        model.position.copy(transform.position);
        model.rotation.copy(transform.rotation);

        // Mirror X for selfie camera
        model.scale.set(
            -transform.scale,
            transform.scale,
            transform.scale
        );
    }

    /**
     * 🎧 Headphones-specific fitting
     */
    applyHeadphones(model, transform) {
        const { position, rotation, scale } = transform;

        model.position.copy(position);
        model.rotation.copy(rotation);

        // 🎯 Fine vertical adjustment (can be tuned per model)
        model.position.y += 0.05;

        // 🧠 Clamp scale for stability
        const safeScale = THREE.MathUtils.clamp(scale, 0.15, 0.4);

        // Mirror X + uniform scale
        model.scale.set(
            -safeScale,
            safeScale,
            safeScale
        );
    }
}
