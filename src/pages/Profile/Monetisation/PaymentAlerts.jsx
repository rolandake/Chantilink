import React from 'react';
// src/pages/Profile/Monetisation/PaymentAlerts.jsx
export default function PaymentAlerts() {
  return (
    <section>
      <h3 className="text-xl font-bold">🔔 Alertes de paiement</h3>
      <ul className="list-disc ml-5 text-gray-700">
        <li>Alerte quand seuil atteint ✅</li>
        <li>Alerte rejet de paiement ❌</li>
        <li>Alerte email activée ✅</li>
      </ul>
    </section>
  );
}

