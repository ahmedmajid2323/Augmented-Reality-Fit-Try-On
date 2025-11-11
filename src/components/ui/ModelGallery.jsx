import React from 'react';
import { MODELS_CONFIG } from '../../config/models.config';
import '../../styles/components.css';

export function ModelGallery({ category, onSelectProduct, loading }) {
  const products = MODELS_CONFIG[category] || [];

  return (
    <div className="model-gallery">
      <h2 className="gallery-title">
        {category === 'head' && '👒 Head Accessories'}
        {category === 'hand' && '💍 Hand Accessories'}
        {category === 'foot' && '👟 Footwear'}
      </h2>

      <div className="product-grid">
        {products.map(product => (
          <div 
            key={product.id}
            className="product-card"
            onClick={() => onSelectProduct(product)}
          >
            <div className="product-image">
              <img src={product.thumbnail} alt={product.name} />
              <div className="try-on-overlay">
                <button className="try-on-btn">
                  📸 Try On
                </button>
              </div>
            </div>

            <div className="product-info">
              <h3 className="product-name">{product.name}</h3>
              <p className="product-price">${product.price}</p>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading model...</p>
        </div>
      )}
    </div>
  );
}
