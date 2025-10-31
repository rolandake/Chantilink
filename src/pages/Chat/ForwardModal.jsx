// src/components/ForwardModal.jsx
import React from "react";
import { motion } from "framer-motion";

export default function ForwardModal({ onClose, message }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-800 rounded-2xl p-6 w-full max-w-md"
      >
        <h3 className="text-xl font-bold text-white mb-4">Transférer le message</h3>
        <p className="text-gray-300 mb-4">{message}</p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition"
          >
            Annuler
          </button>
          <button
            onClick={() => { alert("Message transféré !"); onClose(); }}
            className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition"
          >
            Transférer
          </button>
        </div>
      </motion.div>
    </div>
  );
}
