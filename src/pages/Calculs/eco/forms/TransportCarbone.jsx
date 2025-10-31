import React from 'react';
import { useState, useEffect } from 'react';

const facteurEmission = {
  camion: 0.3,
  train: 0.05,
  bateau: 0.02,
  avion: 0.5,
};

export default function TransportCarbone({ onTotalChange }) {
  const [distance, setDistance] = useState("");
  const [quantite, setQuantite] = useState("");
  const [typeTransport, setTypeTransport] = useState("camion");

  const tkm = (parseFloat(distance) || 0) * (parseFloat(quantite) || 0);
  const emissionsCO2 = tkm * (facteurEmission[typeTransport] || 0);

  // Pas de coût monétaire, total = 0 ou à gérer à part si besoin
  const total = 0;

  useEffect(() => {
    onTotalChange(total);
  }, [total]);

  return (
    <div>
      <label className="block mb-2 font-semibold text-orange-400">Distance (km) :</label>
      <input
        type="number"
        min="0"
        step="any"
        value={distance}
        onInput={(e) => setDistance(e.target.value)}
        className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400 mb-4"
        placeholder="0"
      />

      <label className="block mb-2 font-semibold text-orange-400">Quantité transportée (t) :</label>
      <input
        type="number"
        min="0"
        step="any"
        value={quantite}
        onInput={(e) => setQuantite(e.target.value)}
        className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400 mb-4"
        placeholder="0"
      />

      <label className="block mb-2 font-semibold text-orange-400">Type de transport :</label>
      <select
        value={typeTransport}
        onChange={(e) => setTypeTransport(e.target.value)}
        className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-gray-200 mb-4"
      >
        {Object.keys(facteurEmission).map((type) => (
          <option key={type} value={type}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </option>
        ))}
      </select>

      <p className="text-lg font-semibold text-green-400 mb-2">
        Émissions CO2 estimées : {emissionsCO2.toFixed(2)} kg CO2
      </p>
      <p className="text-sm italic text-gray-400">
        (Facteur d'émission utilisé : {facteurEmission[typeTransport]} kg CO2 / t·km)
      </p>
    </div>
  );
}


