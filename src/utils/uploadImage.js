import axios from "axios";

/**
 * Upload d'une image générique
 * @param {File} file - Le fichier image sélectionné
 * @param {string} type - Type d'image (ex: "profileImage", "coverImage", "projectImage", "documentImage")
 * @param {string} token - Token JWT de l'utilisateur connecté
 * @returns {Promise<{url: string, type: string}>}
 */
export const uploadImage = async (file, type, token) => {
  if (!file) throw new Error("Aucun fichier fourni");
  if (!type) throw new Error("Type d'image requis");

  const formData = new FormData();
  formData.append(type, file); // le backend reconnaît le type grâce au fieldname

  const res = await axios.post("/api/upload", formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data; // { url, type }
};
