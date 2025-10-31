import React from 'react';
import { useEffect, useState } from 'react';

export default function HistoriqueFinition() {
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchHistorique() {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Utilisateur non connecté");

        const res = await fetch("/api/finition", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Erreur chargement historique");

        const data = await res.json();
        setHistorique(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchHistorique();
  }, []);

  if (loading) return <p>Chargement...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (historique.length === 0) return <p>Aucun calcul enregistré.</p>;

  return (
    <section className="p-4 max-w-3xl mx-auto bg-gray-900 text-white rounded shadow mt-6">
      <h2 className="text-orange-400 text-2xl mb-4">Historique des calculs finition</h2>
      {historique.map(({ _id, createdAt, data, coefPerte, devise }) => (
        <div key={_id} className="mb-4 p-3 border border-gray-700 rounded">
          <div className="mb-2 text-sm text-gray-400">
            Date : {new Date(createdAt).toLocaleString()} — Coef perte : {coefPerte}%
          </div>
          <pre className="text-xs overflow-auto bg-gray-800 p-2 rounded max-h-64">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      ))}
    </section>
  );
}


