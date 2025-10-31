import React from 'react';
import { useState, useEffect } from 'react';
import StatsSection from "./StatsSection.jsx";
import OffersSection from "./OffersSection.jsx";
import TransactionsSection from "./TransactionsSection.jsx";
import WithdrawalsSection from "./WithdrawalsSection.jsx";
import NotificationsSection from "./NotificationsSection.jsx";
import SettingsSection from "./SettingsSection.jsx";
import SupportSection from "./SupportSection.jsx";

export default function MonetisationDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/monetisation/dashboard");
        if (!res.ok) throw new Error("Erreur API " + res.status);
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  if (loading) return <p>Chargement du tableau de bord...</p>;
  if (error) return <p className="text-red-600">Erreur: {error}</p>;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-orange-600 mb-6">💰 Tableau de bord monétisation</h2>

      <StatsSection stats={data.stats} />
      <OffersSection offers={data.offers} />
      <TransactionsSection transactions={data.transactions} />
      <WithdrawalsSection withdrawals={data.withdrawals} />
      <NotificationsSection notifications={data.notifications} />
      <SettingsSection settings={data.settings} />
      <SupportSection support={data.support} />
    </div>
  );
}

