import React from 'react';
// ✅ Composant principal nettoyé - ConceptionTechnique.jsx
import { useState } from 'react';

import DimensionPanneaux from "./DimensionPanneaux.jsx";
import ChoixOnduleur from "./ChoixOnduleur.jsx";
import OptionBatteries from "./OptionBatteries.jsx";
import AccessoiresSysteme from "./AccessoiresSysteme.jsx";

const sections = [
  { id: "dimension", title: "📐 Dimensionnement des panneaux", component: DimensionPanneaux },
  { id: "onduleur", title: "⚡ Choix de l’onduleur", component: ChoixOnduleur },
  { id: "batterie", title: "🔋 Option batteries", component: OptionBatteries },
  { id: "accessoires", title: "🧰 Accessoires du système", component: AccessoiresSysteme },
];

const devises = ["FCFA", "€", "$", "£"];

export default function ConceptionTechnique() {
  const [selected, setSelected] = useState(sections[0].id);
  const [currency, setCurrency] = useState(devises[0]);

  const [surface, setSurface] = useState(0);
  const [puissance, setPuissance] = useState(0);
  const [totalPanneaux, setTotalPanneaux] = useState(0);
  const [totalAccessoires, setTotalAccessoires] = useState(0);

  const currentSection = sections.find((s) => s.id === selected);

  const renderCurrentComponent = () => {
    if (!currentSection) return <p className="text-center text-gray-400">Section non trouvée.</p>;

    const Component = currentSection.component;

    switch (selected) {
      case "dimension":
        return (
          <Component
            currency={currency}
            onTotalChange={(total) => setTotalPanneaux(total)}
            onMaterialsChange={({ surface, puissance }) => {
              setSurface(surface);
              setPuissance(puissance);
            }}
          />
        );
      case "accessoires":
        return (
          <Component
            currency={currency}
            surface={surface}
            onTotalChange={(t) => setTotalAccessoires(t)}
          />
        );
      default:
        return <Component currency={currency} />;
    }
  };

  return (
    <div className="text-gray-200 max-w-4xl mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">🛠️ Conception Technique</h2>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="section-select" className="block mb-2 font-semibold text-orange-400">
            Choisir une section :
          </label>
          <select
            id="section-select"
            className="w-full rounded-md bg-gray-800 text-white px-3 py-2 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {sections.map(({ id, title }) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label for="currency-select" className="block mb-2 font-semibold text-orange-400">
            Choisir une devise :
          </label>
          <select
            id="currency-select"
            className="w-full rounded-md bg-gray-800 text-white px-3 py-2 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {devises.map((dev) => (
              <option key={dev} value={dev}>
                {dev}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Composant dynamique, chacun gère ses marges */}
      <div className="mb-6">{renderCurrentComponent()}</div>

      {/* Résumé en bas de page */}
      <div className="bg-gray-900 p-4 rounded text-sm text-gray-400 space-y-1">
        <p>🔹 Surface saisie : <span className="text-white font-bold">{surface} m²</span></p>
        <p>🔹 Puissance estimée : <span className="text-white font-bold">{puissance.toFixed(2)} kWc</span></p>
        <p>🔹 Coût panneaux : <span className="text-orange-400 font-bold">{totalPanneaux.toLocaleString()} {currency}</span></p>
        <p>🔹 Coût accessoires : <span className="text-orange-400 font-bold">{totalAccessoires.toLocaleString()} {currency}</span></p>
      </div>
    </div>
  );
}


