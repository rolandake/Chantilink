import React from 'react';
import { useState } from 'react';

import Terrassement from "./Terrassement";
import Fondations from "./Fondations";
import PontsOuvrages from "./PontsOuvrages";
import Gares from "./Gares";
import VoiesFerrees from "./VoiesFerrees";

const composants = {
  terrassement: Terrassement,
  fondations: Fondations,
  pontsOuvrages: PontsOuvrages,
  gares: Gares,
  voiesFerrees: VoiesFerrees,
};

export default function EtudesDetaillees() {
  const [selection, setSelection] = useState("terrassement");
  const ComposantSelectionne = composants[selection];

  return (
    <div className="max-w-3xl mx-auto p-4">
      <label className="block mb-2 font-semibold text-orange-500" for="choixEtude">
        Choisir une étude détaillée :
      </label>
      <select
        id="choixEtude"
        className="w-full p-2 mb-6 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
        value={selection}
        onChange={(e) => setSelection(e.target.value)}
      >
        <option value="terrassement">Terrassement</option>
        <option value="fondations">Fondations</option>
        <option value="pontsOuvrages">Ponts & Ouvrages</option>
        <option value="gares">Gares</option>
        <option value="voiesFerrees">Voies Ferrées</option>
      </select>

      <div>
        <ComposantSelectionne />
      </div>
    </div>
  );
}


