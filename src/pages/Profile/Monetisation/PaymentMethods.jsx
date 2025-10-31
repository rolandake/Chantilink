import React from 'react';
// src/pages/Profile/Monetisation/PaymentMethods.jsx
export default function PaymentMethods() {
  return (
    <section>
      <h3 className="text-xl font-bold">💳 Méthodes de paiement</h3>
      <p>Ajoutez un compte bancaire, mobile money ou PayPal.</p>
      {/* À remplacer plus tard par formulaire dynamique */}
      <ul className="list-disc ml-5 text-gray-700">
        <li>Compte bancaire : non ajouté</li>
        <li>Orange Money : ajouté</li>
        <li>PayPal : non ajouté</li>
      </ul>
    </section>
  );
}

