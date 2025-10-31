
// ============================================
// 📁 shared/components/HistoryList.jsx
// ============================================
import React from 'react';
import { formatters } from '../../core/utils/formatters';

export function HistoryList({ 
  history = [], 
  onDelete, 
  onLoad,
  emptyMessage = "Aucun calcul enregistré",
  maxHeight = "80",
}) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        📭 {emptyMessage}
      </div>
    );
  }

  return (
    <section 
      className={`max-h-${maxHeight} overflow-y-auto bg-gray-800 rounded-xl p-4 shadow-inner border border-gray-700 space-y-3`}
      aria-label="Historique des calculs"
    >
      <div className="flex justify-between items-center mb-3 sticky top-0 bg-gray-800 pb-2 border-b border-gray-700">
        <h3 className="text-xl font-bold text-orange-400">🕓 Historique</h3>
        <span className="text-sm text-gray-400">{history.length} entrée(s)</span>
      </div>

      {history.map((item) => (
        <div
          key={item.id}
          className="bg-gray-700 rounded-lg p-4 flex justify-between items-start text-sm text-gray-100 hover:bg-gray-600 transition-all hover:scale-[1.01]"
        >
          <div className="flex-1 space-y-1 max-w-[85%]">
            <time className="block text-xs text-gray-400" dateTime={item.date}>
              📅 {formatters.date(item.date, 'datetime')}
            </time>
            
            {/* Affichage des inputs */}
            <div className="text-xs text-gray-300 space-y-0.5">
              {Object.entries(item.inputs || {}).map(([key, value]) => (
                value && (
                  <p key={key}>
                    <span className="font-semibold">{key}:</span> {value}
                  </p>
                )
              ))}
            </div>

            {/* Affichage du résultat principal */}
            {item.results?.total && (
              <p className="font-bold text-orange-300 mt-2">
                💰 Total : {item.results.total.toLocaleString('fr-FR')}
              </p>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex flex-col gap-2 ml-3">
            {onLoad && (
              <button
                onClick={() => onLoad(item)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white font-bold text-xs transition-all hover:scale-110"
                title="Charger"
              >
                📂
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(item.id)}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white font-bold text-xs transition-all hover:scale-110"
                title="Supprimer"
              >
                ✖
              </button>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}