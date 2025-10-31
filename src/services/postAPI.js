// frontend/src/services/postAPI.js
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/posts";

// Récupérer tous les posts
export async function fetchPosts() {
  try {
    const res = await fetch(`${API_URL}`);
    if (!res.ok) throw new Error("Erreur lors du chargement des posts");
    return res.json();
  } catch (error) {
    console.error(error);
    throw new Error("Impossible de récupérer les posts.");
  }
}

// Créer un nouveau post
export async function createPost(formData) {
  try {
    const res = await fetch(`${API_URL}`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Erreur lors de la création du post");
    return res.json();
  } catch (error) {
    console.error(error);
    throw new Error("Impossible de créer le post.");
  }
}

// Aimer un post
export async function likePost(postId) {
  try {
    const res = await fetch(`${API_URL}/${postId}/like`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Erreur lors du like");
    return res.json();
  } catch (error) {
    console.error(error);
    throw new Error("Impossible d'aimer ce post.");
  }
}

// Ajouter un commentaire à un post
export async function addComment(postId, text, userId) {
  try {
    const res = await fetch(`${API_URL}/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, userId }),
    });
    if (!res.ok) throw new Error("Erreur lors de l'ajout du commentaire");
    return res.json();
  } catch (error) {
    console.error(error);
    throw new Error("Impossible d'ajouter ce commentaire.");
  }
}
