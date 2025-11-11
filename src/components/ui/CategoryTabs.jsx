import React from 'react';
import '../../styles/components.css';

export function CategoryTabs({ active, onChange }) {
  const categories = [
    { id: 'head', label: 'Head', icon: '👒' },
    { id: 'hand', label: 'Hand', icon: '💍' },
    { id: 'foot', label: 'Foot', icon: '👟' }
  ];

  return (
    <div className="category-tabs">
      {categories.map(cat => (
        <button
          key={cat.id}
          className={`category-tab ${active === cat.id ? 'active' : ''}`}
          onClick={() => onChange(cat.id)}
        >
          <span className="category-icon">{cat.icon}</span>
          <span className="category-label">{cat.label}</span>
        </button>
      ))}
    </div>
  );
}
