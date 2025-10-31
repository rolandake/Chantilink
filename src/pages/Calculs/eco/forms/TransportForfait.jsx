import React from 'react';
import { useState, useEffect } from 'react';

const forfaits = [
  { maxKm: 50, prixKm: 1000 },
  { maxKm: 200, prixKm: 800 },
  { maxKm: Infinity, prixKm: 500 },
];

export default function TransportForfait({ currency, onTotalChange }) {
  const [distance, setDistance] = useState("");
  const [prixParKm, setPrixParKm] = useState("");

  const dist = parseFloat(distance) || 0;
  const prixSaisi = parseFloat(prixParKm);
  
  // Si prixParKm est saisi et valide, on l'utilise, sinon barème forfaitaire
  const tranche = forfaits.find((f) => dist <= f.maxKm);
  const prixKm = !isNaN(prixSaisi) && prixSaisi > 0 ? prixSaisi : tranche?.prixKm || 0;
  
  const total = prixKm * dist;

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

      <label className="block mb-2 font-semibold text-orange-400">
        Prix par km (laisser vide pour forfaits) :
      </label>
      <input
        type="number"
        min="0"
        step="any"
        value={prixParKm}
        onInput={(e) => setPrixParKm(e.target.value)}
        className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400 mb-4"
        placeholder="Prix au km"
      />

      <p className="mb-2 font-semibold text-orange-400">Barème forfaitaire :</p>
      <ul className="list-disc list-inside mb-4 text-gray-300">
        {forfaits.map((f, i) => (
          <li key={i}>
            Jusqu'à {f.maxKm === Infinity ? "plus" : f.maxKm} km : {f.prixKm.toLocaleString()} {currency} / km
          </li>
        ))}
      </ul>

      <p className="text-xl font-bold text-orange-400">
        💰 Coût total estimé : {total.toLocaleString()} {currency}
      </p>
    </div>
  );
}


