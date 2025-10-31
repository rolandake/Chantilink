import React from 'react';
// src/pages/Profile/Monetisation/SettingsSection.jsx
import { useState } from 'react';
import PaymentMethods from "./PaymentMethods";
import PaymentThreshold from "./PaymentThreshold";
import PaymentAlerts from "./PaymentAlerts";
import PaymentFrequency from "./PaymentFrequency";
import PaymentHistory from "./PaymentHistory";
import EligibilityConditions from "./EligibilityConditions";
import MonetisationStatus from "./MonetisationStatus";

const sections = [
  { id: "status", title: "🔐 Statut du compte", Component: MonetisationStatus },
  { id: "methods", title: "💳 Méthodes de paiement", Component: PaymentMethods },
  { id: "threshold", title: "📊 Seuil de paiement", Component: PaymentThreshold },
  { id: "frequency", title: "📅 Fréquence des paiements", Component: PaymentFrequency },
  { id: "alerts", title: "🔔 Alertes", Component: PaymentAlerts },
  { id: "history", title: "💸 Historique des paiements", Component: PaymentHistory },
  { id: "conditions", title: "📃 Conditions d’éligibilité", Component: EligibilityConditions },
];

export default function SettingsSection() {
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (id) => {
    setOpenSection(openSection === id ? null : id);
  };

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-2xl font-semibold">⚙️ Paramètres de monétisation</h2>
      <p className="text-gray-600 mb-4">
        Ici, vous pourrez configurer vos préférences de paiement, seuils, alertes, etc.
      </p>

      {sections.map(({ id, title, Component }) => (
        <div key={id} className="border rounded-xl shadow-sm">
          <button
            onClick={() => toggleSection(id)}
            className="w-full flex justify-between items-center px-4 py-3 font-medium bg-gray-100 hover:bg-gray-200 rounded-t-xl"
          >
            <span>{title}</span>
            <span>{openSection === id ? "▲" : "▼"}</span>
          </button>
          {openSection === id && (
            <div className="px-4 py-3 bg-white rounded-b-xl">
              <Component />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

