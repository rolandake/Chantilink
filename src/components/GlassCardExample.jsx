import React from "react";

export default function GlassCardExample() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <div className="glass-card max-w-md p-6">
        <h2 className="text-2xl font-bold mb-4">Carte Effet Verre Flouté</h2>
        <p className="text-gray-700">
          Voici un exemple de carte avec effet glassmorphism, utilisant ta
          classe personnalisée <code>glass-card</code> combinée à Tailwind CSS.
        </p>
        <button className="mt-6 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition">
          Bouton d'action
        </button>
      </div>
    </div>
  );
}
