
// ============================================
// 📁 shared/components/ResultsCard.jsx
// ============================================
import React from 'react';

export function ResultsCard({ 
  title, 
  subtitle,
  items = [], 
  total, 
  currency = 'FCFA',
  loading = false,
  icon,
}) {
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-5 shadow-lg border border-orange-500/30 animate-pulse">
        <div className="h-20 bg-gray-600 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-5 shadow-lg border border-orange-500/30">
      {(title || subtitle) && (
        <div className="text-center mb-4">
          {icon && <div className="text-4xl mb-2">{icon}</div>}
          {title && <p className="text-sm text-gray-400">{title}</p>}
          {subtitle && <p className="text-3xl font-bold text-orange-400">{subtitle}</p>}
        </div>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {items.map((item, idx) => (
            <div key={idx} className="bg-gray-900/50 p-3 rounded hover:bg-gray-900/70 transition-colors">
              <p className="text-gray-400 text-xs mb-1">{item.icon} {item.label}</p>
              <p className={`text-xl font-bold ${item.color || 'text-green-400'}`}>
                {item.value}
              </p>
              {item.subtitle && (
                <p className="text-xs text-gray-500 mt-1">{item.subtitle}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {total !== undefined && total !== null && (
        <div className="border-t border-gray-600 pt-4 mt-4">
          <p className="text-center text-3xl font-extrabold text-orange-400 animate-pulse">
            💰 Total : {total.toLocaleString('fr-FR')} {currency}
          </p>
        </div>
      )}
    </div>
  );
}
