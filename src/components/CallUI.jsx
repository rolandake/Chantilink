// src/components/CallUI.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ========================================
// CALL UI COMPONENT
// ========================================
export default function CallUI({
  callState,
  callType,
  remotePeer,
  isMuted,
  isVideoOff,
  callDuration,
  error,
  localVideoRef,
  remoteVideoRef,
  onAnswer,
  onReject,
  onEnd,
  onToggleMute,
  onToggleVideo,
  formatDuration,
}) {
  if (!callState) return null;

  // ========================================
  // INCOMING CALL UI
  // ========================================
  if (callState === 'incoming') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-700"
          >
            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white text-5xl font-bold shadow-2xl"
              >
                {remotePeer?.fullName?.[0]?.toUpperCase() || '?'}
              </motion.div>
            </div>

            {/* Info */}
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">
                {remotePeer?.fullName || 'Utilisateur'}
              </h3>
              <p className="text-gray-400 text-lg flex items-center justify-center gap-2">
                {callType === 'video' ? '📹' : '📞'}
                <span>Appel {callType === 'video' ? 'vidéo' : 'vocal'} entrant...</span>
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onReject}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white text-2xl shadow-lg transition"
              >
                ✕
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onAnswer}
                className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white text-2xl shadow-lg transition animate-pulse"
              >
                ✓
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ========================================
  // OUTGOING CALL UI
  // ========================================
  if (callState === 'outgoing') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-700"
          >
            {/* Local Video Preview (if video call) */}
            {callType === 'video' && (
              <div className="mb-6 rounded-2xl overflow-hidden bg-gray-900 aspect-video">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white text-5xl font-bold shadow-2xl"
              >
                {remotePeer?.fullName?.[0]?.toUpperCase() || '?'}
              </motion.div>
            </div>

            {/* Info */}
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">
                {remotePeer?.fullName || 'Utilisateur'}
              </h3>
              <p className="text-gray-400 text-lg flex items-center justify-center gap-2">
                {callType === 'video' ? '📹' : '📞'}
                <span>Appel en cours...</span>
              </p>
              {error && (
                <p className="text-red-400 text-sm mt-2">{error}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onEnd}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white text-2xl shadow-lg transition"
              >
                📴
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ========================================
  // ACTIVE CALL UI
  // ========================================
  if (callState === 'active') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black z-50 flex flex-col"
        >
          {/* Remote Video/Avatar */}
          <div className="flex-1 relative flex items-center justify-center bg-gray-900">
            {callType === 'video' ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-40 h-40 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white text-7xl font-bold shadow-2xl mb-4">
                  {remotePeer?.fullName?.[0]?.toUpperCase() || '?'}
                </div>
                <h3 className="text-3xl font-bold text-white mb-2">
                  {remotePeer?.fullName || 'Utilisateur'}
                </h3>
                <p className="text-gray-400 text-xl">
                  {formatDuration(callDuration)}
                </p>
              </div>
            )}

            {/* Local Video (Picture-in-Picture) */}
            {callType === 'video' && (
              <motion.div
                drag
                dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
                className="absolute top-4 right-4 w-32 h-40 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-gray-900 cursor-move"
              >
                {isVideoOff ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <div className="text-white text-4xl">📹</div>
                  </div>
                ) : (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover mirror"
                  />
                )}
              </motion.div>
            )}

            {/* Call Duration (for video calls) */}
            {callType === 'video' && (
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white font-medium">
                  {formatDuration(callDuration)}
                </span>
              </div>
            )}

            {/* Remote Name */}
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-6 py-3 rounded-full">
              <span className="text-white font-semibold text-lg">
                {remotePeer?.fullName || 'Utilisateur'}
              </span>
            </div>

            {/* Error Message */}
            {error && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500/90 backdrop-blur-sm px-6 py-3 rounded-xl">
                <span className="text-white font-medium">{error}</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-gray-900 p-6 border-t border-gray-800">
            <div className="flex items-center justify-center gap-6">
              {/* Mute Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onToggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg transition ${
                  isMuted
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {isMuted ? '🔇' : '🎤'}
              </motion.button>

              {/* Video Toggle (only for video calls) */}
              {callType === 'video' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onToggleVideo}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg transition ${
                    isVideoOff
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {isVideoOff ? '📹' : '📹'}
                </motion.button>
              )}

              {/* End Call Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onEnd}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-2xl shadow-lg transition"
              >
                📴
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return null;
}

// Add this to your global CSS
/*
.mirror {
  transform: scaleX(-1);
}
*/