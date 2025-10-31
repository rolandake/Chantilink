import React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from "../../../context/AuthContext";

export default function TransactionsSection() {
  const { user } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchTransactions() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/monetisation/transactions", {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (!res.ok) throw new Error("Erreur chargement transactions");
        const data = await res.json();
        setTransactions(data.transactions);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (user) fetchTransactions();
  }, [user]);

  if (loading) return <p>Chargement des transactions...</p>;
  if (error) return <p className="text-red-600">Erreur : {error}</p>;

  if (transactions.length === 0) return <p>Aucune transaction récente.</p>;

  return (
    <section className="p-4 bg-white rounded shadow">
      <h3 className="text-lg font-semibold mb-4">💳 Historique des ventes</h3>
      <ul className="divide-y divide-gray-200">
        {transactions.map(({ _id, offerTitle, amount, date, status }) => (
          <li key={_id} className="py-2 flex justify-between items-center">
            <div>
              <div className="font-semibold">{offerTitle}</div>
              <div className="text-sm text-gray-600">
                {new Date(date).toLocaleDateString()}
              </div>
            </div>
            <div className="font-bold text-orange-600">
              {amount.toLocaleString()} FCFA
            </div>
            <div
              className={`capitalize ${
                status === "completed"
                  ? "text-green-600"
                  : "text-yellow-600"
              }`}
            >
              {status}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

