// src/components/CallManager.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { playRingtone, stopRingtone, playCallEndSound } from '../utils/sounds';

// ========================================
// CONFIGURATION
// ========================================
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

const CALL_TIMEOUT = 45000; // 45 secondes

// ========================================
// CALL MANAGER COMPONENT
// ========================================
export default function CallManager({ socket, onCallStateChange }) {
  const { user } = useAuth();
  
  // States
  const [callState, setCallState] = useState(null); // null | 'outgoing' | 'incoming' | 'active'
  const [callType, setCallType] = useState(null); // 'video' | 'audio'
  const [remotePeer, setRemotePeer] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState(null);
  
  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const callTimerRef = useRef(null);
  const callTimeoutRef = useRef(null);
  const durationIntervalRef = useRef(null);

  // ========================================
  // CLEANUP FUNCTION
  // ========================================
  const cleanup = useCallback(() => {
    console.log('🧹 Cleanup des ressources...');
    
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Track arrêté:', track.kind);
      });
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear timers
    if (callTimerRef.current) {
      clearTimeout(callTimerRef.current);
      callTimerRef.current = null;
    }

    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    stopRingtone();
    setCallDuration(0);
  }, []);

  // ========================================
  // INITIALIZE PEER CONNECTION
  // ========================================
  const createPeerConnection = useCallback(() => {
    console.log('🔗 Création de la connexion peer...');
    
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 Nouveau ICE candidate');
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          to: remotePeer?.id,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('📺 Track reçu:', event.track.kind);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('🔌 État de connexion:', pc.connectionState);
      
      if (pc.connectionState === 'connected') {
        console.log('✅ Connexion établie');
        setError(null);
        stopRingtone();
        
        // Start duration timer
        durationIntervalRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      }
      
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.log('❌ Connexion échouée/déconnectée');
        setError('Connexion perdue');
        endCall();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('🧊 État ICE:', pc.iceConnectionState);
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [remotePeer, socket]);

  // ========================================
  // GET USER MEDIA
  // ========================================
  const getUserMedia = useCallback(async (type) => {
    try {
      const constraints = {
        audio: true,
        video: type === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      };

      console.log('🎥 Demande d\'accès média:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      console.log('✅ Média obtenu:', stream.getTracks().map(t => t.kind));
      return stream;
    } catch (err) {
      console.error('❌ Erreur getUserMedia:', err);
      
      let errorMessage = 'Impossible d\'accéder à la caméra/micro';
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Accès refusé. Veuillez autoriser l\'accès à la caméra/micro.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Aucune caméra/micro trouvé.';
      }
      
      setError(errorMessage);
      throw err;
    }
  }, []);

  // ========================================
  // START CALL (Initiator)
  // ========================================
  const startCall = useCallback(async (peer, type) => {
    if (callState) {
      console.log('⚠️ Appel déjà en cours');
      return;
    }

    console.log('📞 Démarrage appel vers:', peer.fullName, '| Type:', type);
    
    setCallState('outgoing');
    setCallType(type);
    setRemotePeer(peer);
    setError(null);

    try {
      // Get local media
      const stream = await getUserMedia(type);
      
      // Create peer connection
      const pc = createPeerConnection();
      
      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        console.log('➕ Ajout track:', track.kind);
        pc.addTrack(track, stream);
      });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log('📤 Envoi de l\'offre');
      
      // Send call request
      socket.emit('call-request', {
        to: peer.id,
        type,
        offer,
        caller: {
          id: user.id,
          fullName: user.fullName,
        }
      });

      playRingtone();

      // Set timeout
      callTimeoutRef.current = setTimeout(() => {
        if (callState === 'outgoing') {
          console.log('⏱️ Timeout de l\'appel');
          setError('Pas de réponse');
          endCall();
        }
      }, CALL_TIMEOUT);

    } catch (err) {
      console.error('❌ Erreur démarrage appel:', err);
      cleanup();
      setCallState(null);
    }
  }, [callState, user, socket, getUserMedia, createPeerConnection, cleanup]);

  // ========================================
  // ANSWER CALL
  // ========================================
  const answerCall = useCallback(async () => {
    if (!remotePeer || !callType) {
      console.error('❌ Pas d\'appel entrant');
      return;
    }

    console.log('✅ Réponse à l\'appel');
    
    try {
      // Get local media
      const stream = await getUserMedia(callType);
      
      // Create peer connection
      const pc = createPeerConnection();
      
      // Add tracks
      stream.getTracks().forEach(track => {
        console.log('➕ Ajout track:', track.kind);
        pc.addTrack(track, stream);
      });

      setCallState('active');
      stopRingtone();

      // Emit answer event
      socket.emit('call-answered', {
        to: remotePeer.id,
      });

    } catch (err) {
      console.error('❌ Erreur réponse appel:', err);
      rejectCall();
    }
  }, [remotePeer, callType, socket, getUserMedia, createPeerConnection]);

  // ========================================
  // REJECT CALL
  // ========================================
  const rejectCall = useCallback(() => {
    console.log('❌ Rejet de l\'appel');
    
    if (remotePeer) {
      socket.emit('call-rejected', {
        to: remotePeer.id,
      });
    }

    stopRingtone();
    cleanup();
    setCallState(null);
    setRemotePeer(null);
    setCallType(null);
  }, [remotePeer, socket, cleanup]);

  // ========================================
  // END CALL
  // ========================================
  const endCall = useCallback(() => {
    console.log('📴 Fin de l\'appel');
    
    if (remotePeer) {
      socket.emit('call-ended', {
        to: remotePeer.id,
      });
    }

    playCallEndSound();
    cleanup();
    
    setTimeout(() => {
      setCallState(null);
      setRemotePeer(null);
      setCallType(null);
      setError(null);
    }, 500);
  }, [remotePeer, socket, cleanup]);

  // ========================================
  // TOGGLE MUTE
  // ========================================
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
      console.log('🔇 Mute:', !audioTrack.enabled);
    }
  }, []);

  // ========================================
  // TOGGLE VIDEO
  // ========================================
  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current || callType !== 'video') return;

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
      console.log('📹 Vidéo:', !videoTrack.enabled ? 'OFF' : 'ON');
    }
  }, [callType]);

  // ========================================
  // SOCKET EVENT HANDLERS
  // ========================================
  useEffect(() => {
    if (!socket) return;

    // Incoming call
    socket.on('incoming-call', async ({ from, type, offer }) => {
      console.log('📞 Appel entrant de:', from.fullName, '| Type:', type);
      
      if (callState) {
        console.log('⚠️ Appel déjà en cours, rejet automatique');
        socket.emit('call-rejected', { to: from.id });
        return;
      }

      setCallState('incoming');
      setCallType(type);
      setRemotePeer(from);
      
      // Store offer for later
      const pc = createPeerConnection();
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      playRingtone();

      // Auto-reject after timeout
      callTimeoutRef.current = setTimeout(() => {
        if (callState === 'incoming') {
          console.log('⏱️ Timeout appel entrant');
          rejectCall();
        }
      }, CALL_TIMEOUT);
    });

    // Call answered
    socket.on('call-answered', async () => {
      console.log('✅ Appel accepté');
      setCallState('active');
      stopRingtone();
    });

    // Call rejected
    socket.on('call-rejected', () => {
      console.log('❌ Appel rejeté');
      setError('Appel refusé');
      stopRingtone();
      
      setTimeout(() => {
        cleanup();
        setCallState(null);
        setRemotePeer(null);
        setCallType(null);
      }, 2000);
    });

    // Call ended
    socket.on('call-ended', () => {
      console.log('📴 Appel terminé par l\'autre utilisateur');
      endCall();
    });

    // ICE candidate
    socket.on('ice-candidate', async ({ candidate }) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('🧊 ICE candidate ajouté');
        } catch (err) {
          console.error('❌ Erreur ICE candidate:', err);
        }
      }
    });

    // Answer received
    socket.on('call-answer', async ({ answer }) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          console.log('✅ Réponse SDP reçue');
        } catch (err) {
          console.error('❌ Erreur réponse SDP:', err);
        }
      }
    });

    return () => {
      socket.off('incoming-call');
      socket.off('call-answered');
      socket.off('call-rejected');
      socket.off('call-ended');
      socket.off('ice-candidate');
      socket.off('call-answer');
    };
  }, [socket, callState, createPeerConnection, rejectCall, endCall, cleanup]);

  // ========================================
  // NOTIFY PARENT OF CALL STATE
  // ========================================
  useEffect(() => {
    if (onCallStateChange) {
      onCallStateChange({
        state: callState,
        type: callType,
        peer: remotePeer,
        duration: callDuration,
      });
    }
  }, [callState, callType, remotePeer, callDuration, onCallStateChange]);

  // ========================================
  // CLEANUP ON UNMOUNT
  // ========================================
  useEffect(() => {
    return () => {
      console.log('🔄 Unmount CallManager');
      cleanup();
    };
  }, [cleanup]);

  // ========================================
  // FORMAT DURATION
  // ========================================
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ========================================
  // RENDER
  // ========================================
  return {
    // State
    callState,
    callType,
    remotePeer,
    isMuted,
    isVideoOff,
    callDuration,
    error,
    
    // Refs for video elements
    localVideoRef,
    remoteVideoRef,
    
    // Actions
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    
    // Utilities
    formatDuration,
  };
}