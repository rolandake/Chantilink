import React from 'react';
import { useState } from 'react';
import { useAuth } from "../context/AuthContext";

export default function ChatGPTForm() {
  const { token } = useAuth();
  const [step, setStep] = useState(0);
  const [userResponses, setUserResponses] = useState([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  // Questions préliminaires
  const questions = [
    "Quel est le type de construction ?",
    "Quelle est la surface totale (m²) ?",
    "Quel est le budget prévu pour les matériaux ?",
    "Avez-vous des spécifications sur la main d'œuvre ?",
  ];

  function handleInputChange(e) {
    setUserResponses([...userResponses, e.target.value]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (userResponses.length < questions.length) {
      setStep(step + 1);  // Passe à la question suivante
      return;
    }

    // Quand toutes les questions sont répondues, on envoie les réponses à l'IA
    setLoading(true);
    try {
      const res = await fetch("/api/gpt/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "Vous êtes un assistant de calcul de projets de construction." },
            ...userResponses.map((response, index) => ({
              role: "user",
              content: `${questions[index]} ${response}`,
            })),
          ],
        }),
      });
      const data = await res.json();
      setAnswer(data.answer);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Assistant IA pour Projet BTP</h2>

      {step < questions.length ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p>{questions[step]}</p>
          <textarea
            rows={3}
            value={userResponses[step] || ""}
            onChange={handleInputChange}
            placeholder="Votre réponse..."
            className="w-full p-2 border rounded"
            required
          />
          <button type="submit" className="btn-glass px-4 py-2">
            {step === questions.length - 1 ? (loading ? "Envoi..." : "Commencer le calcul") : "Suivant"}
          </button>
        </form>
      ) : (
        <div>
          <p className="font-semibold">Réponse de l'IA :</p>
          <div className="mt-4 p-3 bg-gray-100 rounded">
            <p>{answer}</p>
          </div>
        </div>
      )}
    </div>
  );
}


