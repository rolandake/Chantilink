import React from 'react';
import { useState } from 'react';
import TransportSimple from "./TransportSimple.jsx";
import TransportCarbone from "./TransportCarbone.jsx";
import TransportForfait from "./TransportForfait.jsx";

const modesCalcul = [
  { value: "simple", label: "Calcul simple (distance × quantité × prix)" },
  { value: "carbone", label: "Calcul carbone (émissions CO2 estimées)" },
  { value: "forfait", label: "Calcul forfaitaire selon tranches" },
];

export default function TransportEco({ currency = "XOF", onTotalChange = () => {} }) {
  const [mode, setMode] = useState("simple");

  // On va remonter le total calculé par chaque sous-composant ici :
  const [total, setTotal] = useState(0);

  // Lorsque total change dans un sous-composant, on informe le parent
  const handleTotalChange = (val) => {
    setTotal(val);
    onTotalChange(val);
  };

  let FormComponent = null;
  if (mode === "simple") FormComponent = TransportSimple;
  else if (mode === "carbone") FormComponent = TransportCarbone;
  else if (mode === "forfait") FormComponent = TransportForfait;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">🚛 Transport Écologique</h2>

      <div className="mb-6">
        <label className="block mb-2 font-semibold text-orange-400">Mode de calcul :</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-gray-200"
        >
          {modesCalcul.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {FormComponent && <FormComponent currency={currency} onTotalChange={handleTotalChange} />}

      <div className="mt-6 text-right">
        <p className="text-xl font-bold text-orange-400">
          💰 Total estimé : {total.toLocaleString()} {currency}
        </p>
      </div>
    </div>
  );
}


