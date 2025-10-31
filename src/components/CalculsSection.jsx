import React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from "../context/AuthContext";

export default function CalculsSection() {
  const { auth } = useAuth();
  const token = auth?.token;

  const [calculs, setCalculs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalData, setModalData] = useState(null);

  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch("/api/historiques", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        return res.json();
      })
      .then(setCalculs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleDelete = async (id) => {
    if (!confirm("Supprimer ce calcul ?")) return;
    try {
      const res = await fetch(`/api/historiques/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setCalculs((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      alert("Erreur suppression : " + err.message);
    }
  };

  const totalPages = Math.ceil(calculs.length / ITEMS_PER_PAGE);
  const paginatedData = calculs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <section>
      <h3 className="text-xl font-semibold mb-4">Historique des Calculs BTP</h3>

      {loading && <p>Chargement...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && calculs.length === 0 && <p>Aucun calcul trouvé.</p>}

      {!loading && !error && calculs.length > 0 && (
        <>
          <ul>
            {paginatedData.map((calc) => (
              <li
                key={calc._id}
                className="border p-3 mb-2 rounded cursor-pointer hover:bg-orange-50"
                onClick={() => setModalData(calc)}
              >
                <div>
                  <strong>Date :</strong> {new Date(calc.createdAt).toLocaleString()}
                </div>
                <div>
                  <strong>Béton :</strong> {calc.resultat.cimentSacs} sacs ciment, {calc.resultat.sableM3} m³ sable, {calc.resultat.gravierM3} m³ gravier
                </div>
                <div>
                  <strong>Coût total :</strong> {calc.resultat.coutTotal.toLocaleString()} FCFA
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(calc._id);
                  }}
                  className="text-red-600 mt-2"
                  aria-label="Supprimer ce calcul"
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav className="flex justify-center gap-2 mt-4">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                ← Précédent
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  className={`px-3 py-1 border rounded ${currentPage === i + 1 ? "bg-orange-600 text-white" : ""}`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Suivant →
              </button>
            </nav>
          )}

          {/* Modal détails */}
          {modalData && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
              onClick={() => setModalData(null)}
            >
              <div
                className="bg-white rounded p-6 max-w-lg w-full shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setModalData(null)}
                  className="text-right w-full mb-4 text-lg font-bold"
                  aria-label="Fermer la fenêtre"
                >
                  ✖
                </button>
                <h3 className="font-bold mb-2">Détails Calcul BTP</h3>
                <p><strong>Date :</strong> {new Date(modalData.createdAt).toLocaleString()}</p>
                <p><strong>Béton :</strong> {modalData.resultat.cimentSacs} sacs ciment, {modalData.resultat.sableM3} m³ sable, {modalData.resultat.gravierM3} m³ gravier</p>
                <p><strong>Eau :</strong> {modalData.resultat.eauL} L</p>
                <p><strong>Finition :</strong> {modalData.resultat.cimentFinitionSacs} sacs ciment, {modalData.resultat.sableFinitionM3} m³ sable</p>
                <p><strong>Coût total :</strong> {modalData.resultat.coutTotal.toLocaleString()} FCFA</p>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}


