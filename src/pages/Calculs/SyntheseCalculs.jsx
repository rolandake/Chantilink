import React from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from "../../context/AuthContext";
import * as XLSX from "xlsx";

export default function SyntheseCalculs() {
  const { token } = useAuth();
  const [calculs, setCalculs] = useState([]);
  const [loading, setLoading] = useState(true);  // Ajouter un état de chargement
  const [error, setError] = useState("");  // Ajouter un état pour gérer les erreurs

  useEffect(() => {
    fetch("/api/calculs", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setCalculs(data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Erreur lors de la récupération des calculs");
        setLoading(false);
      });
  }, [token]);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(calculs);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Calculs");
    XLSX.writeFile(wb, "synthese_calculs.xlsx");
  };

  if (loading) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">📊 Synthèse de vos calculs</h2>
        <p>Chargement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">📊 Synthèse de vos calculs</h2>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">📊 Synthèse de vos calculs</h2>

      <button onClick={exportExcel} className="mb-4 bg-green-600 text-white px-4 py-2 rounded">
        Exporter Excel
      </button>

      <div className="overflow-auto">
        {calculs.length === 0 ? (
          <p>Aucun calcul disponible.</p>
        ) : (
          <table className="w-full text-sm border border-gray-300">
            <thead className="bg-gray-200 text-left">
              <tr>
                <th className="p-2">Type</th>
                <th className="p-2">Entrées</th>
                <th className="p-2">Résultats</th>
                <th className="p-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {calculs.map((calc) => (
                <tr key={calc._id} className="border-t">
                  <td className="p-2">{calc.type}</td>
                  <td className="p-2">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(calc.inputs, null, 2)}</pre>
                  </td>
                  <td className="p-2">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(calc.result, null, 2)}</pre>
                  </td>
                  <td className="p-2">
                    {new Date(calc.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


