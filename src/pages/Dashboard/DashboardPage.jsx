import React from 'react';
import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

export default function DashboardPage() {
  const { token, user } = useContext(AuthContext);
  const [statuses, setStatuses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const sRes = await fetch("/api/status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const pRes = await fetch("/api/projects/user", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!sRes.ok || !pRes.ok) {
          throw new Error("Erreur lors du chargement des données.");
        }

        const sData = await sRes.json();
        const pData = await pRes.json();

        setStatuses(sData.statuses);
        setProjects(pData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (token) fetchData();
  }, [token]);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Bienvenue {user?.username}</h1>

      {loading && <p>Chargement...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <section className="mb-6">
        <h2 className="text-orange-500 text-lg font-semibold mb-2">Vos Statuts</h2>
        <div className="flex gap-4 overflow-x-auto">
          {statuses.length === 0 && <p>Aucun statut pour le moment.</p>}
          {statuses.map((s) => (
            <div key={s._id} className="w-24">
              <div className="relative">
                {s.images?.[0] ? (
                  <img
                    src={s.images[0]}
                    alt={s.content || "Statut utilisateur"}  // alt dynamique
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-white">📷</span>  {/* Image par défaut */}
                  </div>
                )}
              </div>
              <p className="text-xs text-center mt-1">{s.owner?.username || "Anonyme"}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-orange-500 text-lg font-semibold mb-2">Vos Projets</h2>
        {projects.length === 0 && <p>Aucun projet pour le moment.</p>}
        <ul className="space-y-2">
          {projects.map((p) => (
            <li key={p._id} className="bg-white/30 p-3 rounded-xl shadow">
              <h3 className="text-sm font-bold text-gray-800">{p.nom}</h3>
              <p className="text-xs text-gray-600">{p.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

