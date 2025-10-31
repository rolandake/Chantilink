// src/utils/sounds.js (effets visuels modernes + sons pour appels)

export const playSendSound = () => {
  const input = document.querySelector("#chatInput");
  if (input) {
    input.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(0.95)" },
        { transform: "scale(1)" },
      ],
      { duration: 120, easing: "ease-out" }
    );
  }
};

export const playReceiveSound = () => {
  const lastMsg = document.querySelector(".message:last-child");
  if (lastMsg) {
    lastMsg.animate(
      [
        { transform: "scale(0.9)", opacity: 0.5 },
        { transform: "scale(1)", opacity: 1 },
      ],
      { duration: 200, easing: "ease-out" }
    );
  }
};

export const playCallEndSound = () => {
  const callBox = document.querySelector("#callBox"); // conteneur de l'appel
  if (callBox) {
    callBox.animate(
      [
        { transform: "scale(1)", opacity: 1 },
        { transform: "scale(0.95)", opacity: 0.5 },
        { transform: "scale(1)", opacity: 0 },
      ],
      { duration: 250, easing: "ease-out" }
    );
  }
};

// Jouer une sonnerie d'appel
export const playRingtone = () => {
  const audio = new Audio("/sounds/ringtone.mp3"); // remplace par ton fichier
  audio.loop = true;
  audio.play();
  return audio; // à utiliser pour arrêter ensuite
};

// Arrêter la sonnerie
export const stopRingtone = (audio) => {
  if (audio) audio.pause();
};
