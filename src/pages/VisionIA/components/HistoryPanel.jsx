// src/pages/VisionIA/components/HistoryPanel.jsx
import React from 'react';

export default function HistoryPanel({ open, onClose, plans, messages }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            📜 Historique du Projet
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          
          {/* Plans uploadés */}
          {plans && plans.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-indigo-400 mb-4 flex items-center gap-2">
                📄 Plans Analysés ({plans.length})
              </h3>
              <div className="space-y-3">
                {plans.map((plan, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-700/50 rounded-xl p-4 border border-gray-600/50 hover:border-indigo-500/50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-white font-semibold mb-1">
                          {plan.name || `Plan ${idx + 1}`}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {plan.date ? new Date(plan.date).toLocaleString('fr-FR') : 'Date inconnue'}
                        </p>
                        {plan.summary && (
                          <p className="text-sm text-gray-300 mt-2 line-clamp-2">
                            {plan.summary}
                          </p>
                        )}
                      </div>
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold">
                        ✓ Analysé
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages récents */}
          {messages && messages.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
                💬 Conversations Récentes ({messages.length})
              </h3>
              <div className="space-y-2">
                {messages.slice(-10).reverse().map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-indigo-600/20 border border-indigo-500/30'
                        : msg.role === 'ai'
                        ? 'bg-purple-600/20 border border-purple-500/30'
                        : 'bg-gray-700/50 border border-gray-600/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-none">
                        {msg.role === 'user' ? '👤' : 
                         msg.role === 'ai' ? '🤖' : 
                         msg.role === 'system' ? '⚙️' : '📋'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-300 break-words">
                          {msg.content.length > 150
                            ? msg.content.substring(0, 150) + '...'
                            : msg.content}
                        </p>
                        {msg.timestamp && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString('fr-FR')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {(!plans || plans.length === 0) && (!messages || messages.length === 0) && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-400 text-lg mb-2">Aucun historique disponible</p>
              <p className="text-gray-500 text-sm">
                Commencez par uploader un plan ou poser une question
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            {plans?.length || 0} plans • {messages?.length || 0} messages
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-semibold transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}