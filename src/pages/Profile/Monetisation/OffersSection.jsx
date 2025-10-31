import React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from "../../../context/AuthContext";

export default function OffersSection() {
  const { user } = useAuth();

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Formulaire création
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const fetchOffers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/monetisation/offers", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error("Erreur récupération offres");
      const data = await res.json();
      setOffers(data.offers);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOffers();
    }
  }, [user]);

  const handleCreateOffer = async (e) => {
    e.preventDefault();
    setError("");

    if (!title || !price) {
      setError("Titre et prix sont obligatoires");
      return;
    }

    const priceNumber = Number(price);
    if (isNaN(priceNumber) || priceNumber <= 0) {
      setError("Prix invalide");
      return;
    }

    try {
      const res = await fetch("/api/monetisation/offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ title, description, price: priceNumber }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur création offre");

      setTitle("");
      setDescription("");
      setPrice("");
      fetchOffers(); // Refresh liste
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteOffer = async (id) => {
    if (!confirm("Confirmer la suppression de cette offre ?")) return;

    try {
      const res = await fetch(`/api/monetisation/offers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur suppression offre");

      fetchOffers(); // Refresh liste
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="p-4 bg-white rounded shadow">
      <h3 className="text-lg font-semibold mb-4">🛍️ Vos offres actives</h3>

      <form onSubmit={handleCreateOffer} className="mb-6 space-y-3">
        {error && <p className="text-red-600">{error}</p>}

        <input
          type="text"
          placeholder="Titre de l'offre"
          value={title}
          onInput={(e) => setTitle(e.target.value)}
          className="input"
          required
        />
        <textarea
          placeholder="Description (optionnel)"
          value={description}
          onInput={(e) => setDescription(e.target.value)}
          className="input"
        />
        <input
          type="number"
          placeholder="Prix en FCFA"
          value={price}
          onInput={(e) => setPrice(e.target.value)}
          className="input"
          required
          min="1"
        />
        <button type="submit" className="btn-primary">
          Créer une offre
        </button>
      </form>

      {loading ? (
        <p>Chargement des offres...</p>
      ) : offers.length === 0 ? (
        <p>Aucune offre active.</p>
      ) : (
        <ul className="space-y-3">
          {offers.map((offer) => (
            <li key={offer._id} className="border p-3 rounded flex justify-between items-center">
              <div>
                <h4 className="font-semibold">{offer.title}</h4>
                <p className="text-sm text-gray-600">{offer.description}</p>
                <p className="mt-1 font-bold text-orange-600">{offer.price.toLocaleString()} FCFA</p>
              </div>
              <button
                onClick={() => handleDeleteOffer(offer._id)}
                className="btn-danger"
                aria-label={`Supprimer l'offre ${offer.title}`}
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

