import React from 'react';
// src/pages/Profile/Monetisation/PaymentThreshold.jsx
export default function PaymentThreshold() {
  return (
    <section>
      <h3 className="text-xl font-bold">📊 Seuil de paiement</h3>
      <p>Définissez le montant minimum avant déclenchement automatique.</p>
      <div className="mt-2">
        Seuil actuel : <strong>10 000 FCFA</strong>
      </div>
    </section>
  );
}

