import React from 'react';
import { useState, useContext } from 'react';
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function EditPage() {
  const { user, token } = useContext(AuthContext);
  const [content, setContent] = useState(user?.pageContent || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // Ajouter un état d'erreur
  const navigate = useNavigate();

  if (!user) 
    return (
      <p className="text-center mt-10 text-red-600 font-semibold">
        Connectez-vous pour éditer votre page.
      </p>
    );

  const savePage = async () => {
    setLoading(true);
    setError(null); // Reset error state before sending request

    try {
      const res = await fetch(`/api/users/${user._id}/page`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pageContent: content }),
      });

      if (res.ok) {
        alert("Page sauvegardée !");
        navigate(`/profile/${user._id}`);
      } else {
        const data = await res.json();
        setError(data.message || "Erreur lors de la sauvegarde");
      }
    } catch (err) {
      setError("Erreur réseau, veuillez réessayer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white/20 backdrop-blur-md rounded-xl shadow-glass border border-white/30 flex flex-col">
      <h1 className="text-2xl font-bold mb-6 text-orange-600 select-none">
        Édition de votre page perso
      </h1>
      
      <textarea
        className="w-full h-64 p-4 mb-6 rounded-lg border border-white/40 bg-white/40 text-gray-900 placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
        placeholder="Écrivez ici le contenu de votre page personnelle..."
        value={content}
        onInput={(e) => setContent(e.target.value)}
        disabled={loading}
        aria-label="Contenu de la page personnelle"
        aria-invalid={error ? "true" : "false"}
        aria-describedby="error-message"
      />
      
      {error && (
        <p id="error-message" className="text-red-600 text-sm mt-2">
          {error}
        </p>
      )}

      <button
        disabled={loading || content.trim().length === 0}
        onClick={savePage}
        className={`py-3 px-6 rounded-xl font-semibold transition ${
          loading || content.trim().length === 0
            ? "bg-orange-300 cursor-not-allowed"
            : "bg-orange-600 hover:bg-orange-700 text-white"
        }`}
        aria-busy={loading}
      >
        {loading ? (
          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
        ) : (
          "Sauvegarder"
        )}
      </button>
    </div>
  );
}


