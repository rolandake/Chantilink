import React from 'react';
// src/pages/Profile/Monetisation/EligibilityConditions.jsx
export default function EligibilityConditions() {
  return (
    <section>
      <h3 className="text-xl font-bold">📃 Conditions d’éligibilité</h3>
      <ul className="list-disc ml-5 text-gray-700">
        <li>Compte vérifié ✅</li>
        <li>Minimum 1 offre active ✅</li>
        <li>Pas de blocage de compte ✅</li>
      </ul>
    </section>
  );
}

