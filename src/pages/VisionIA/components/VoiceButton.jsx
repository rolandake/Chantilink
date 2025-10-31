// src/pages/VisionIA/components/VoiceButton.jsx
import React, { useRef, useEffect } from "react";

export default function VoiceButton({ onTranscript, continuous, listening, setListening }) {
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous || false;
    recognition.interimResults = true;
    recognition.lang = "fr-FR";

    recognition.onresult = e => {
      let transcript = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      onTranscript(transcript);
    };
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
  }, [continuous, onTranscript, setListening]);

  const toggle = () => {
    if (recognitionRef.current) listening ? recognitionRef.current.stop() : recognitionRef.current.start();
  };

  return (
    <button
      onClick={toggle}
      className={`px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md hover:shadow-lg ${listening?"ring-2 ring-indigo-500 ring-offset-1":""}`}
      title="Activer/désactiver la saisie vocale"
    >
      🎤
    </button>
  );
}
