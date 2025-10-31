// ============================================
// 5. src/Home/StoryEditor.jsx - INCHANGÉ
// ============================================
import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  ArrowLeftIcon,
  PaperAirplaneIcon,
  AdjustmentsHorizontalIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

const FILTERS = [
  { name: "Original", filter: "none" },
  { name: "B&W", filter: "grayscale(100%)" },
  { name: "Sépia", filter: "sepia(100%)" },
  { name: "Vintage", filter: "sepia(50%) contrast(1.2)" },
  { name: "Lumineux", filter: "brightness(1.3) contrast(1.1)" },
  { name: "Sombre", filter: "brightness(0.8) contrast(1.2)" },
  { name: "Vif", filter: "saturate(1.5) contrast(1.1)" },
  { name: "Cool", filter: "saturate(0.8) hue-rotate(20deg)" },
  { name: "Warm", filter: "saturate(1.2) hue-rotate(-20deg)" },
];

const TEXT_STYLES = [
  { name: "Normal", style: "font-normal text-white" },
  { name: "Bold", style: "font-bold text-white text-shadow" },
  { name: "Outline", style: "font-bold text-white outline-text" },
  { name: "Gradient", style: "font-bold bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent" },
];

export default function StoryEditor({ file, fileType, onClose, onSubmit }) {
  const [caption, setCaption] = useState("");
  const [selectedFilter, setSelectedFilter] = useState(0);
  const [textStyle, setTextStyle] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);

  const preview = URL.createObjectURL(file);

  const handleSubmit = async () => {
    setLoading(true);
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("caption", caption);
    formData.append("type", fileType);
    formData.append("filter", FILTERS[selectedFilter].name);
    
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error("❌ Erreur:", error);
      alert("Erreur lors de la publication");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] bg-black overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 via-black/70 to-transparent px-4 py-3">
          <div className="flex items-center justify-between">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2.5 hover:bg-white/10 rounded-full transition"
            >
              <ArrowLeftIcon className="w-6 h-6 text-white" />
            </motion.button>

            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-full transition flex items-center gap-2 ${
                  showFilters
                    ? "bg-orange-500 text-white"
                    : "bg-white/10 text-white"
                }`}
              >
                <SparklesIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Filtres</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={loading}
                className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full font-semibold disabled:opacity-50 transition flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Envoi...</span>
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="w-5 h-5" />
                    <span>Publier</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="absolute inset-0 flex items-center justify-center pt-16 pb-4">
          <div className="relative w-full h-full max-w-lg flex flex-col px-4">
            {/* Media with filter */}
            <div
              className="flex-1 relative rounded-3xl overflow-hidden bg-black shadow-2xl mb-4"
              style={{ filter: FILTERS[selectedFilter].filter }}
            >
              {fileType === "image" ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <video
                  ref={videoRef}
                  src={preview}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-contain"
                />
              )}

              {/* Caption overlay */}
              <AnimatePresence>
                {caption && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    className="absolute bottom-20 left-0 right-0 px-4"
                  >
                    <div className="bg-black/70 backdrop-blur-xl rounded-2xl px-5 py-3 shadow-2xl border border-white/10 max-w-md mx-auto">
                      <p className={`text-center font-medium leading-relaxed ${TEXT_STYLES[textStyle].style}`}>
                        {caption}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
            </div>

            {/* Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  className="absolute bottom-24 left-4 right-4 bg-black/90 backdrop-blur-xl rounded-3xl p-4 border border-white/20 shadow-2xl"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <SparklesIcon className="w-5 h-5 text-orange-400" />
                    <h3 className="text-white font-bold">Filtres</h3>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-orange-500">
                    {FILTERS.map((filter, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedFilter(index)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                          selectedFilter === index
                            ? "bg-orange-500 text-white"
                            : "bg-white/10 text-white hover:bg-white/20"
                        }`}
                      >
                        {filter.name}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-4 mb-2">
                    <AdjustmentsHorizontalIcon className="w-5 h-5 text-orange-400" />
                    <h3 className="text-white font-bold">Style de texte</h3>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-orange-500">
                    {TEXT_STYLES.map((style, index) => (
                      <button
                        key={index}
                        onClick={() => setTextStyle(index)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                          textStyle === index
                            ? "bg-purple-500 text-white"
                            : "bg-white/10 text-white hover:bg-white/20"
                        }`}
                      >
                        {style.name}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Caption Input */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-4"
            >
              <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-3 shadow-2xl border border-white/20">
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Ajoutez une légende..."
                  maxLength={200}
                  className="w-full px-4 py-3 bg-white/10 text-white placeholder-white/50 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition"
                />
                {caption && (
                  <p className="text-white/60 text-xs mt-2 text-right">
                    {caption.length}/200
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}