// src/pages/videos/VideoModal.jsx - VERSION COMPLÈTE CORRIGÉE
import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaTimes,
  FaUpload,
  FaMusic,
  FaPalette,
  FaTextHeight,
  FaCut,
  FaCheck,
  FaPlay,
  FaPause,
  FaCamera,
  FaStop,
  FaRedo,
  FaArrowLeft,
  FaGlobe,
  FaUserFriends,
  FaLock
} from "react-icons/fa";
import { HiSparkles } from "react-icons/hi";

const VideoModal = ({ showModal, setShowModal }) => {
  // Refs
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const isCleaningRef = useRef(false);
  const isMountedRef = useRef(true);

  // États principaux
  const [step, setStep] = useState("upload");
  const [videoFile, setVideoFile] = useState(null);
  const [videoURL, setVideoURL] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Édition
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("none");
  const [textOverlay, setTextOverlay] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textPosition] = useState({ x: 50, y: 10 });
  const [musicName, setMusicName] = useState("");
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(60);
  const [duration, setDuration] = useState(0);
  const [privacy, setPrivacy] = useState("public");
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);

  // Loading
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const filters = [
    { name: "Aucun", value: "none", filter: "none" },
    { name: "Vintage", value: "vintage", filter: "sepia(0.5) contrast(1.2)" },
    { name: "B&W", value: "bw", filter: "grayscale(1)" },
    { name: "Vibrant", value: "vibrant", filter: "saturate(2) contrast(1.2)" },
    { name: "Cool", value: "cool", filter: "hue-rotate(180deg)" },
    { name: "Warm", value: "warm", filter: "hue-rotate(30deg) saturate(1.5)" },
    { name: "Neon", value: "neon", filter: "contrast(1.5) brightness(1.2) saturate(2)" },
    { name: "Dream", value: "dream", filter: "blur(1px) brightness(1.1) saturate(1.3)" },
  ];

  // 🔧 CLEANUP AMÉLIORÉ
  const cleanup = useCallback(() => {
    if (isCleaningRef.current || !isMountedRef.current) return;
    isCleaningRef.current = true;

    console.log("🧹 Cleanup VideoModal démarré");

    // 1. Arrêter le stream
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.warn("Erreur arrêt stream:", e);
      }
      streamRef.current = null;
    }

    // 2. Arrêter le recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn("Erreur arrêt recorder:", e);
      }
      mediaRecorderRef.current = null;
    }

    // 3. Nettoyer la vidéo avec requestAnimationFrame
    if (videoRef.current && isMountedRef.current) {
      requestAnimationFrame(() => {
        const video = videoRef.current;
        if (video && isMountedRef.current) {
          try {
            video.pause();
            video.src = '';
            video.srcObject = null;
          } catch (e) {
            console.warn("Erreur nettoyage vidéo:", e);
          }
        }
      });
    }

    // 4. Révoquer l'URL après un délai
    if (videoURL) {
      setTimeout(() => {
        try {
          URL.revokeObjectURL(videoURL);
        } catch (e) {
          console.warn("Erreur révocation URL:", e);
        }
      }, 100);
    }

    // Reset des états
    if (isMountedRef.current) {
      setStep("upload");
      setVideoFile(null);
      setVideoURL(null);
      setIsRecording(false);
      setTitle("");
      setDescription("");
      setSelectedFilter("none");
      setTextOverlay("");
      setMusicName("");
      setIsPlaying(false);
      setStartTime(0);
      setEndTime(60);
      setDuration(0);
      setRecordingTime(0);
    }

    setTimeout(() => {
      isCleaningRef.current = false;
    }, 200);
  }, [videoURL]);

  // Timer pour l'enregistrement
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Nettoyage à la fermeture
  useEffect(() => {
    if (!showModal && isMountedRef.current) {
      cleanup();
    }
  }, [showModal, cleanup]);

  // Nettoyage au démontage
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      alert("❌ Veuillez sélectionner un fichier vidéo");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      alert("❌ La vidéo ne doit pas dépasser 100MB");
      return;
    }

    if (videoURL) {
      try {
        URL.revokeObjectURL(videoURL);
      } catch (e) {
        console.warn("Erreur révocation:", e);
      }
    }

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoURL(url);
    setStep("edit");
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1080, height: 1920 },
        audio: true,
      });

      streamRef.current = stream;
      
      if (videoRef.current && isMountedRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });

      mediaRecorderRef.current = mediaRecorder;
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (!isMountedRef.current) return;

        const blob = new Blob(chunks, { type: "video/webm" });
        
        if (videoURL) {
          try {
            URL.revokeObjectURL(videoURL);
          } catch (e) {
            console.warn("Erreur révocation:", e);
          }
        }

        const url = URL.createObjectURL(blob);
        setVideoURL(url);
        setVideoFile(new File([blob], "recorded-video.webm", { type: "video/webm" }));
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        if (videoRef.current && isMountedRef.current) {
          videoRef.current.srcObject = null;
        }

        setStep("edit");
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erreur enregistrement:", err);
      alert("❌ Impossible d'accéder à la caméra");
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      } catch (e) {
        console.warn("Erreur arrêt enregistrement:", e);
      }
    }
  };

  const retakeVideo = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoURL) {
      try {
        URL.revokeObjectURL(videoURL);
      } catch (e) {
        console.warn("Erreur révocation:", e);
      }
    }

    if (videoRef.current && isMountedRef.current) {
      requestAnimationFrame(() => {
        const video = videoRef.current;
        if (video && isMountedRef.current) {
          try {
            video.pause();
            video.src = '';
            video.srcObject = null;
          } catch (e) {
            console.warn("Erreur nettoyage vidéo:", e);
          }
        }
      });
    }

    setVideoURL(null);
    setVideoFile(null);
    setIsPlaying(false);
    setStep("upload");
  };

  const togglePlay = () => {
    if (videoRef.current && isMountedRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(e => console.warn('Erreur lecture:', e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && isMountedRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setEndTime(Math.min(60, dur));
    }
  };

  const handlePublish = async () => {
    if (!videoFile) {
      alert("❌ Aucune vidéo sélectionnée");
      return;
    }

    if (!title.trim()) {
      alert("❌ Veuillez ajouter un titre");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("filter", selectedFilter);
      formData.append("textOverlay", textOverlay);
      formData.append("textColor", textColor);
      formData.append("textPos", JSON.stringify(textPosition));
      formData.append("musicName", musicName);
      formData.append("startTime", startTime);
      formData.append("endTime", endTime);
      formData.append("privacy", privacy);
      formData.append("allowComments", allowComments);
      formData.append("allowDuet", allowDuet);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // Simulation upload
      await new Promise(resolve => setTimeout(resolve, 2000));

      clearInterval(progressInterval);
      setUploadProgress(100);

      setTimeout(() => {
        if (isMountedRef.current) {
          alert("✅ Vidéo publiée avec succès !");
          setShowModal(false);
          cleanup();
          setIsUploading(false);
          setUploadProgress(0);
        }
      }, 500);
    } catch (err) {
      console.error("Erreur publication:", err);
      alert("❌ Erreur lors de la publication");
      if (isMountedRef.current) {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!showModal) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
        onClick={() => !isUploading && setShowModal(false)}
      >
        <motion.div
          key="modal-content"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl max-h-[95vh] bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {step !== "upload" && (
                  <button
                    onClick={() => setStep(step === "publish" ? "edit" : "upload")}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    <FaArrowLeft size={20} />
                  </button>
                )}
                <h2 className="text-white text-xl font-bold flex items-center gap-2">
                  <HiSparkles className="text-pink-500" />
                  <span>
                    {step === "upload" && "Créer une vidéo"}
                    {step === "edit" && "Modifier la vidéo"}
                    {step === "publish" && "Publier"}
                  </span>
                </h2>
              </div>
              <button
                onClick={() => !isUploading && setShowModal(false)}
                disabled={isUploading}
                className="text-white/70 hover:text-white transition-colors disabled:opacity-50"
              >
                <FaTimes size={24} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(95vh-80px)] p-6">
            {/* STEP 1: UPLOAD/RECORD */}
            {step === "upload" && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <p className="text-white/70">Choisissez comment créer votre vidéo</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="relative overflow-hidden bg-gradient-to-br from-pink-500/20 to-purple-600/20 border-2 border-pink-500/30 rounded-2xl p-8 cursor-pointer group hover:border-pink-500 transition-all"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 to-purple-600/0 group-hover:from-pink-500/10 group-hover:to-purple-600/10 transition-all" />
                    <div className="relative flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                        <FaUpload className="text-white text-2xl" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-white font-bold text-lg mb-2">
                          Importer une vidéo
                        </h3>
                        <p className="text-white/60 text-sm">
                          Sélectionnez un fichier depuis votre appareil
                        </p>
                        <p className="text-white/40 text-xs mt-2">
                          Max 100MB • MP4, WebM, MOV
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={startRecording}
                    className="relative overflow-hidden bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-2 border-blue-500/30 rounded-2xl p-8 cursor-pointer group hover:border-blue-500 transition-all"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-cyan-600/0 group-hover:from-blue-500/10 group-hover:to-cyan-600/10 transition-all" />
                    <div className="relative flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center">
                        <FaCamera className="text-white text-2xl" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-white font-bold text-lg mb-2">
                          Enregistrer
                        </h3>
                        <p className="text-white/60 text-sm">
                          Filmez directement avec votre caméra
                        </p>
                        <p className="text-white/40 text-xs mt-2">
                          Max 60 secondes
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {isRecording && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 bg-black/50 backdrop-blur-xl rounded-2xl p-6 border border-red-500/50"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-white font-semibold">
                          Enregistrement en cours
                        </span>
                      </div>
                      <span className="text-white font-mono text-xl">
                        {formatTime(recordingTime)}
                      </span>
                    </div>
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full aspect-video bg-black rounded-xl mb-4"
                    />
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={stopRecording}
                      className="w-full py-4 bg-gradient-to-r from-red-500 to-pink-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:from-red-600 hover:to-pink-700 transition-all"
                    >
                      <FaStop /> Arrêter l'enregistrement
                    </motion.button>
                  </motion.div>
                )}
              </div>
            )}

            {/* STEP 2: EDIT */}
            {step === "edit" && videoURL && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="relative bg-black rounded-2xl overflow-hidden aspect-[9/16]">
                    <video
                      ref={videoRef}
                      src={videoURL}
                      className="w-full h-full object-cover"
                      style={{ filter: filters.find(f => f.value === selectedFilter)?.filter }}
                      onLoadedMetadata={handleLoadedMetadata}
                      loop
                    />
                    
                    {textOverlay && (
                      <div
                        className="absolute text-2xl font-black pointer-events-none"
                        style={{
                          color: textColor,
                          left: `${textPosition.x}%`,
                          top: `${textPosition.y}%`,
                          transform: "translate(-50%, -50%)",
                          textShadow: "0 0 20px rgba(0,0,0,0.8), 2px 2px 8px rgba(0,0,0,0.6)",
                        }}
                      >
                        {textOverlay}
                      </div>
                    )}

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={togglePlay}
                        className="w-12 h-12 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white"
                      >
                        {isPlaying ? <FaPause /> : <FaPlay />}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={retakeVideo}
                        className="w-12 h-12 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white"
                      >
                        <FaRedo />
                      </motion.button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white/5 rounded-xl p-4">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <FaPalette className="text-pink-500" /> Filtres
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                      {filters.map((filter) => (
                        <motion.button
                          key={filter.value}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedFilter(filter.value)}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            selectedFilter === filter.value
                              ? "border-pink-500"
                              : "border-white/10"
                          }`}
                        >
                          <div
                            className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600"
                            style={{ filter: filter.filter }}
                          />
                          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-white text-[10px] font-semibold drop-shadow-lg whitespace-nowrap">
                            {filter.name}
                          </span>
                          {selectedFilter === filter.value && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center">
                              <FaCheck className="text-white text-[8px]" />
                            </div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-4">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <FaTextHeight className="text-blue-500" /> Texte
                    </h3>
                    <input
                      type="text"
                      value={textOverlay}
                      onChange={(e) => setTextOverlay(e.target.value)}
                      placeholder="Ajouter du texte..."
                      className="w-full bg-white/10 text-white placeholder-white/50 rounded-lg px-4 py-2 mb-2 outline-none focus:ring-2 focus:ring-blue-500"
                      maxLength={50}
                    />
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="bg-white/5 rounded-xl p-4">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <FaMusic className="text-purple-500" /> Musique
                    </h3>
                    <input
                      type="text"
                      value={musicName}
                      onChange={(e) => setMusicName(e.target.value)}
                      placeholder="Nom de la musique..."
                      className="w-full bg-white/10 text-white placeholder-white/50 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="bg-white/5 rounded-xl p-4">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <FaCut className="text-orange-500" /> Découpage
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-white/70 text-sm mb-1 block">
                          Début: {formatTime(startTime)}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max={duration}
                          step="0.1"
                          value={startTime}
                          onChange={(e) => setStartTime(parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-white/70 text-sm mb-1 block">
                          Fin: {formatTime(endTime)}
                        </label>
                        <input
                          type="range"
                          min={startTime}
                          max={duration}
                          step="0.1"
                          value={endTime}
                          onChange={(e) => setEndTime(parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep("publish")}
                    className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all"
                  >
                    Suivant
                  </motion.button>
                </div>
              </div>
            )}

            {/* STEP 3: PUBLISH */}
            {step === "publish" && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-white/5 rounded-xl p-6 space-y-4">
                  <div>
                    <label className="text-white font-semibold mb-2 block">
                      Titre *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Donnez un titre accrocheur..."
                      className="w-full bg-white/10 text-white placeholder-white/50 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500"
                      maxLength={100}
                    />
                    <p className="text-white/40 text-xs mt-1">{title.length}/100</p>
                  </div>

                  <div>
                    <label className="text-white font-semibold mb-2 block">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Décrivez votre vidéo..."
                      className="w-full bg-white/10 text-white placeholder-white/50 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                      rows={4}
                      maxLength={500}
                    />
                    <p className="text-white/40 text-xs mt-1">{description.length}/500</p>
                  </div>

                  <div>
                    <label className="text-white font-semibold mb-3 block">
                      Confidentialité
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "public", icon: FaGlobe, label: "Public", desc: "Tout le monde" },
                        { value: "friends", icon: FaUserFriends, label: "Amis", desc: "Vos amis" },
                        { value: "private", icon: FaLock, label: "Privé", desc: "Vous seul" },
                      ].map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <motion.button
                            key={option.value}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setPrivacy(option.value)}
                            className={`p-4 rounded-xl border-2 transition-all ${
                              privacy === option.value
                                ? "border-pink-500 bg-pink-500/20"
                                : "border-white/10 bg-white/5 hover:border-white/20"
                            }`}
                          >
                            <IconComponent className={`text-2xl mx-auto mb-2 ${
                              privacy === option.value ? "text-pink-500" : "text-white/70"
                            }`} />
                            <p className="text-white text-sm font-semibold">{option.label}</p>
                            <p className="text-white/40 text-xs">{option.desc}</p>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center justify-between bg-white/5 rounded-lg p-4 cursor-pointer">
                      <span className="text-white font-medium">Autoriser les commentaires</span>
                      <input
                        type="checkbox"
                        checked={allowComments}
                        onChange={(e) => setAllowComments(e.target.checked)}
                        className="w-5 h-5 accent-pink-500"
                      />
                    </label>
                    <label className="flex items-center justify-between bg-white/5 rounded-lg p-4 cursor-pointer">
                      <span className="text-white font-medium">Autoriser les duos</span>
                      <input
                        type="checkbox"
                        checked={allowDuet}
                        onChange={(e) => setAllowDuet(e.target.checked)}
                        className="w-5 h-5 accent-pink-500"
                      />
                    </label>
                  </div>
                </div>

                {/* Prévisualisation miniature */}
                <div className="bg-white/5 rounded-xl p-4">
                  <h3 className="text-white font-semibold mb-3">Aperçu</h3>
                  <div className="flex gap-4">
                    <div className="relative w-24 h-32 bg-black rounded-lg overflow-hidden flex-shrink-0">
                      <video
                        src={videoURL}
                        className="w-full h-full object-cover"
                        style={{ filter: filters.find(f => f.value === selectedFilter)?.filter }}
                      />
                      {textOverlay && (
                        <div
                          className="absolute text-xs font-black"
                          style={{
                            color: textColor,
                            left: `${textPosition.x}%`,
                            top: `${textPosition.y}%`,
                            transform: "translate(-50%, -50%)",
                            textShadow: "0 0 10px rgba(0,0,0,0.8)",
                          }}
                        >
                          {textOverlay}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-white font-semibold line-clamp-2">{title || "Sans titre"}</h4>
                      <p className="text-white/60 text-sm line-clamp-2">{description || "Aucune description"}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {selectedFilter !== "none" && (
                          <span className="bg-pink-500/20 text-pink-400 px-2 py-1 rounded">
                            {filters.find(f => f.value === selectedFilter)?.name}
                          </span>
                        )}
                        {musicName && (
                          <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded flex items-center gap-1">
                            <FaMusic className="text-xs" /> {musicName}
                          </span>
                        )}
                        {privacy === "public" && (
                          <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded flex items-center gap-1">
                            <FaGlobe className="text-xs" /> Public
                          </span>
                        )}
                        {privacy === "friends" && (
                          <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded flex items-center gap-1">
                            <FaUserFriends className="text-xs" /> Amis
                          </span>
                        )}
                        {privacy === "private" && (
                          <span className="bg-gray-500/20 text-gray-400 px-2 py-1 rounded flex items-center gap-1">
                            <FaLock className="text-xs" /> Privé
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conseils */}
                <div className="bg-gradient-to-r from-pink-500/10 to-purple-600/10 border border-pink-500/30 rounded-xl p-4">
                  <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <HiSparkles className="text-pink-500" /> Conseils pour réussir
                  </h3>
                  <ul className="text-white/70 text-sm space-y-1">
                    <li>✨ Utilisez un titre accrocheur et des hashtags pertinents</li>
                    <li>🎨 Les filtres et effets augmentent l'engagement</li>
                    <li>🎵 La musique populaire aide à la découverte</li>
                    <li>⏱️ Les vidéos de 15-30 secondes ont plus de vues</li>
                  </ul>
                </div>

                {/* Bouton Publier */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePublish}
                  disabled={isUploading || !title.trim()}
                  className={`w-full py-5 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                    isUploading || !title.trim()
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  } text-white`}
                >
                  {isUploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Publication en cours... {uploadProgress}%</span>
                    </>
                  ) : (
                    <>
                      <HiSparkles />
                      <span>Publier maintenant</span>
                    </>
                  )}
                </motion.button>

                {/* Barre de progression */}
                {isUploading && (
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="h-full bg-gradient-to-r from-pink-500 to-purple-600"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoModal;