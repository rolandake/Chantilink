import React from 'react';
import { useState, useEffect } from 'react';

export default function TransportSimple({ currency, onTotalChange }) {
  const [distance, setDistance] = useState("");
  const [quantite, setQuantite] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");

  const total = (parseFloat(distance) || 0) * (parseFloat(quantite) || 0) * (parseFloat(prixUnitaire) || 0);

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

      <label className="block mb-2 font-semibold text-orange-400">Prix unitaire ({currency}/t·km) :</label>
      <input
        type="number"
        min="0"
        step="any"
        value={prixUnitaire}
        onInput={(e) => setPrixUnitaire(e.target.value)}
        className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400 mb-4"
        placeholder="0"
      />

      <p className="text-xl font-bold text-orange-400">💰 Total : {total.toLocaleString()} {currency}</p>
    </div>
  );
}


