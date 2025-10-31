import React from 'react';
// src/components/ui/card.jsx
export function Card({ children, className = "" }) {
  return (
    <div className={`p-4 bg-white bg-opacity-20 rounded-xl shadow-md ${className}`}>
      {children}
    </div>
  );
}

