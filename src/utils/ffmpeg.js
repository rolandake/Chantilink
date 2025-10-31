// src/utils/ffmpeg.js
let ffmpeg;
let fetchFile;
let isLoaded = false;

export const loadFFmpeg = async () => {
  try {
    if (!isLoaded) {
      // Importer dynamiquement FFmpeg
      const ffmpegModule = await import("@ffmpeg/ffmpeg");
      
      // Créer l'instance de ffmpeg et récupérer fetchFile
      ffmpeg = ffmpegModule.createFFmpeg({ log: true });
      fetchFile = ffmpegModule.fetchFile;

      // Charger FFmpeg
      await ffmpeg.load();
      isLoaded = true;
    }

    return { ffmpeg, fetchFile };
  } catch (error) {
    console.error("Erreur lors du chargement de FFmpeg :", error);
    throw error; // Propager l'erreur pour gestion ultérieure
  }
};
