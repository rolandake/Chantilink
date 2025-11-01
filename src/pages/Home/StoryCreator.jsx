import React, { useState, useRef, useEffect } from "react";
import { XMarkIcon, CheckIcon, PhotoIcon, CameraIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

// Toast Component
const Toast = ({ message, type = "success", onClose }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  useEffect(() => {
    if (!message || !mounted) return;
    const timer = setTimeout(() => { if (onClose) onClose(); }, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose, mounted]);

  if (!message || !mounted) return null;
  const bgColor = type === "success" ? "bg-green-500" : type === "error" ? "bg-red-600" : "bg-blue-500";
  const icon = type === "success" ? "✓" : type === "error" ? "✕" : "ℹ";

  try {
    return createPortal(
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-2xl shadow-2xl z-[10001] ${bgColor} text-white backdrop-blur-md border border-white/20`}
        style={{ minWidth: "300px", maxWidth: "90vw" }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">{icon}</span>
            <span className="text-sm font-medium">{message}</span>
          </div>
          {onClose && (
            <button 
              onClick={onClose} 
              className="text-xl font-bold hover:bg-white/20 rounded-full w-6 h-6 flex items-center justify-center transition-all hover:rotate-90"
            >
              ✕
            </button>
          )}
        </div>
      </motion.div>,
      document.body
    );
  } catch (error) { console.warn('Toast portal error:', error); return null; }
};

export default function StoryCreator({ onClose, onSubmit, uploadProgress }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Bloquer le scroll
  useEffect(() => {
    const originalOverflow = window.getComputedStyle(document.body).overflow;
    const originalPosition = window.getComputedStyle(document.body).position;
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  const handleFileSelect = (e, isVideo = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      const msg = "Fichier trop volumineux (max 100MB)";
      setError(msg);
      setToast({ message: msg, type: "error" });
      return;
    }

    const validTypes = isVideo 
      ? ["video/mp4", "video/webm", "video/quicktime"]
      : ["image/jpeg", "image/png", "image/jpg", "image/gif"];
    if (!validTypes.includes(file.type)) {
      const msg = `Format non supporté. Utilisez ${isVideo ? "MP4, WebM, MOV" : "JPG, PNG, GIF"}`;
      setError(msg);
      setToast({ message: msg, type: "error" });
      return;
    }

    if (isVideo) {
      processVideo(file);
    } else {
      processFile(file);
    }
  };

  const processFile = (file) => {
    setSelectedFile(file);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const processVideo = async (file) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const maxDuration = 15;

      if (duration > maxDuration) {
        // Trim automatique
        const stream = video.captureStream();
        const chunks = [];
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.start();
        setTimeout(() => recorder.stop(), maxDuration * 1000);

        await new Promise(resolve => recorder.onstop = resolve);

        const trimmedBlob = new Blob(chunks, { type: 'video/webm' });
        const trimmedFile = new File([trimmedBlob], file.name, { type: 'video/webm' });
        processFile(trimmedFile);

        // Thumbnail
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        video.currentTime = 0;
        video.onseeked = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setThumbnail(canvas.toDataURL("image/jpeg"));
        };
      } else {
        processFile(file);
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        video.currentTime = 0;
        video.onseeked = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setThumbnail(canvas.toDataURL("image/jpeg"));
        };
      }
    };
  };

  const handlePublish = async () => {
    if (!selectedFile) {
      const msg = "Sélectionnez une image ou vidéo";
      setError(msg);
      setToast({ message: msg, type: "error" });
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("caption", caption.trim());
      formData.append("type", selectedFile.type.startsWith("image") ? "image" : "video");
      formData.append("visibility", "public");

      await onSubmit(formData);

      setToast({ message: "Story publiée avec succès! 🎉", type: "success" });
      setTimeout(() => {
        setSelectedFile(null);
        setPreview(null);
        setCaption("");
        setToast(null);
        setTimeout(() => onClose(), 100);
      }, 1500);
    } catch (err) {
      const msg = err.message || "Erreur upload";
      setError(msg);
      setToast({ message: msg, type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => { if (!uploading) { setToast(null); setTimeout(() => onClose(), 50); } };

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998] flex items-center justify-center p-2 sm:p-4 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="bg-white w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[95vh] sm:rounded-3xl shadow-2xl flex flex-col"
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex-shrink-0 flex justify-between items-center p-3 sm:p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-pink-50">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-2xl sm:text-3xl">✨</span>
              Créer une story
            </h2>
            <button onClick={handleClose} disabled={uploading} className="p-2 hover:bg-white/70 rounded-full transition disabled:opacity-50">
              <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
            {preview ? (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden bg-gray-900 shadow-xl" style={{ height: "65vh" }}>
                  {selectedFile.type.startsWith("image") ? (
                    <img src={preview} alt="preview" className="w-full h-full object-contain"/>
                  ) : (
                    <video src={preview} controls className="w-full h-full object-contain"/>
                  )}
                  <button
                    onClick={() => { setPreview(null); setSelectedFile(null); setCaption(""); }}
                    disabled={uploading}
                    className="absolute bottom-2 left-2 bg-white/90 hover:bg-white text-gray-800 px-3 py-1 rounded-full text-xs font-semibold"
                  >
                    Changer
                  </button>
                </div>

                {/* Caption */}
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Ajouter une légende..."
                  maxLength={200}
                  disabled={uploading}
                  className="w-full border-2 border-gray-300 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm sm:text-base resize-none"
                  rows={2}
                />
                <div className="text-xs text-gray-500 text-right">{caption.length}/200</div>
              </div>
            ) : (
              <div className="space-y-2 py-4">
                {/* Image & Video Buttons */}
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full border-2 border-dashed border-orange-300 rounded-2xl p-4 text-center hover:bg-orange-50 transition group">
                  <div className="flex flex-col items-center gap-2">
                    <PhotoIcon className="w-8 h-8 text-orange-500"/>
                    <p className="font-bold text-gray-800 text-sm">Ajouter une image</p>
                  </div>
                </button>

                <button onClick={() => videoInputRef.current?.click()} disabled={uploading} className="w-full border-2 border-dashed border-blue-300 rounded-2xl p-4 text-center hover:bg-blue-50 transition group">
                  <div className="flex flex-col items-center gap-2">
                    <CameraIcon className="w-8 h-8 text-blue-500"/>
                    <p className="font-bold text-gray-800 text-sm">Ajouter une vidéo (max 15s)</p>
                  </div>
                </button>

                <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleFileSelect(e, false)} className="hidden"/>
                <input ref={videoInputRef} type="file" accept="video/*" onChange={(e) => handleFileSelect(e, true)} className="hidden"/>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm flex items-center justify-between">
                <span>⚠️ {error}</span>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                  <XMarkIcon className="w-4 h-4"/>
                </button>
              </div>
            )}

            {/* Upload Progress */}
            {uploading && uploadProgress > 0 && (
              <div className="bg-orange-50 p-3 rounded-xl border border-orange-200">
                <div className="flex justify-between text-sm text-gray-700 font-medium">
                  <span className="flex items-center gap-1">⏳ Upload en cours...</span>
                  <span className="text-orange-600 font-bold">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mt-1">
                  <div className="bg-gradient-to-r from-orange-500 to-pink-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}/>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t bg-gray-50 p-3 flex gap-2">
            <button onClick={handleClose} disabled={uploading} className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-xl text-gray-700 text-sm">Annuler</button>
            <button onClick={handlePublish} disabled={!preview || uploading} className="flex-1 px-3 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl text-sm flex items-center justify-center gap-1">
              {uploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <CheckIcon className="w-5 h-5"/>}
              <span>{uploading ? "Upload..." : "Publier"}</span>
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Toast */}
      <AnimatePresence mode="wait">
        {toast && <Toast key={`toast-${Date.now()}`} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </>
  );
}
