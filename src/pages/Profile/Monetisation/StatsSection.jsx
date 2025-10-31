import React from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from "../../../context/AuthContext.jsx";

export default function StatsSection() {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    salesCount: 0,
    activeSubscribers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/monetisation/stats", {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (!res.ok) throw new Error("Erreur lors du chargement des statistiques");

        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (user) fetchStats();
  }, [user]);

  if (loading) return <p>Chargement des statistiques...</p>;
  if (error) return <p className="text-red-600">Erreur : {error}</p>;

  return (
    <section className="p-4 bg-white rounded shadow">
      <h3 className="text-lg font-semibold mb-4">📈 Statistiques principales</h3>

      <ul className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <li className="bg-orange-50 rounded p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {stats.totalRevenue.toLocaleString()} FCFA
          </div>
          <div className="text-sm text-gray-600">Revenus totaux</div>
        </li>
        <li className="bg-orange-50 rounded p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {stats.monthlyRevenue.toLocaleString()} FCFA
          </div>
          <div className="text-sm text-gray-600">Revenus ce mois</div>
        </li>
        <li className="bg-orange-50 rounded p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.salesCount}</div>
          <div className="text-sm text-gray-600">Ventes réalisées</div>
        </li>
        <li className="bg-orange-50 rounded p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.activeSubscribers}</div>
          <div className="text-sm text-gray-600">Abonnés premium</div>
        </li>
      </ul>
    </section>
  );
}

