import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function DalotForm({
  currency = "XOF",
  onCostChange = () => {},
  onMateriauxChange = () => {},
}) {
  const [typeDalot, setTypeDalot] = useState("simple");
  const [showModal, setShowModal] = useState(false);
  const [longueur, setLongueur] = useState("");
  const [largeur, setLargeur] = useState("");
  const [hauteur, setHauteur] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [total, setTotal] = useState(0);

  // Calcul automatique
  useEffect(() => {
    const l = parseFloat(longueur) || 0;
    const L = parseFloat(largeur) || 0;
    const h = parseFloat(hauteur) || 0;
    const p = parseFloat(prixUnitaire) || 0;

    const volume = l * L * h;
    const cout = volume * p;
    setTotal(cout);
    onCostChange(cout);
  }, [longueur, largeur, hauteur, prixUnitaire]);

  return (
    <div className="p-6 bg-gray-900 rounded-2xl shadow-lg border border-gray-800 text-gray-100 relative">
      {/* Sélecteur du type de dalot */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-orange-400">
          Type de dalot :{" "}
          <span className="text-white font-bold uppercase">{typeDalot}</span>
        </h3>
        <button
          onClick={() => setShowModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold transition"
        >
          Choisir type
        </button>
      </div>

      {/* Formulaire */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-orange-400">
            Longueur (m)
          </label>
          <input
            type="number"
            value={longueur}
            onChange={(e) => setLongueur(e.target.value)}
            className="w-full border border-gray-700 rounded-lg p-2 mt-1 bg-gray-800 focus:ring-2 focus:ring-orange-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-orange-400">
            Largeur (m)
          </label>
          <input
            type="number"
            value={largeur}
            onChange={(e) => setLargeur(e.target.value)}
            className="w-full border border-gray-700 rounded-lg p-2 mt-1 bg-gray-800 focus:ring-2 focus:ring-orange-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-orange-400">
            Hauteur (m)
          </label>
          <input
            type="number"
            value={hauteur}
            onChange={(e) => setHauteur(e.target.value)}
            className="w-full border border-gray-700 rounded-lg p-2 mt-1 bg-gray-800 focus:ring-2 focus:ring-orange-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-orange-400">
            Prix unitaire ({currency})
          </label>
          <input
            type="number"
            value={prixUnitaire}
            onChange={(e) => setPrixUnitaire(e.target.value)}
            className="w-full border border-gray-700 rounded-lg p-2 mt-1 bg-gray-800 focus:ring-2 focus:ring-orange-400 outline-none"
          />
        </div>
      </div>

      <div className="mt-5 text-right text-lg font-bold text-orange-400">
        💰 Total : {total.toLocaleString()} {currency}
      </div>

      {/* MODAL DE SÉLECTION */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gray-900 rounded-2xl shadow-2xl p-6 w-[90%] max-w-md relative border border-gray-700"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-white"
              >
                <X size={22} />
              </button>

              <h2 className="text-xl font-semibold mb-5 text-center text-orange-400">
                Choisir le type de Dalot
              </h2>

              <div className="grid grid-cols-2 gap-3">
                {["simple", "double", "triple", "quadruple"].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setTypeDalot(type);
                      setShowModal(false);
                    }}
                    className={`p-3 rounded-xl text-sm font-semibold capitalize transition border ${
                      typeDalot === type
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-gray-800 border-gray-700 hover:bg-gray-700"
                    }`}
                  >
                    Dalot {type}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
