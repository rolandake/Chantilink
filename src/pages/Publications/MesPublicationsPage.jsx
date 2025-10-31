import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { formatDistanceToNow } from "date-fns";

function MesPublications() {
  const { user } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/posts/user/${user.id}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then((res) => res.json())
      .then((data) => setPosts(data))
      .catch(console.error);
  }, [user]);

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Supprimer cette publication ?")) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p._id !== postId));
      } else {
        alert("Erreur lors de la suppression.");
      }
    } catch (err) {
      alert("Erreur lors de la suppression.");
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto min-h-screen bg-white/20 backdrop-blur-md rounded-xl shadow-glass border border-white/30">
      <h2 className="text-3xl font-extrabold mb-6 text-orange-600 select-none">
        📚 Mes publications
      </h2>

      {posts.length === 0 ? (
        <p className="text-gray-900">Aucune publication disponible.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map((post) => (
            <article
              key={post._id}
              className="bg-white/70 rounded-xl p-4 shadow-md flex flex-col"
              aria-label={`Publication de ${post.authorName || "Utilisateur"}`}
            >
              <header className="flex items-center justify-between mb-2">
                <time
                  className="text-sm text-gray-800"
                  dateTime={new Date(post.createdAt).toISOString()}
                  title={new Date(post.createdAt).toLocaleString()}
                >
                  Publié {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </time>
                <button
                  onClick={() => handleDeletePost(post._id)}
                  className="text-orange-600 hover:text-orange-800 text-lg font-bold"
                  title="Supprimer cette publication"
                  aria-label="Supprimer cette publication"
                >
                  🗑️
                </button>
              </header>

              <p className="text-gray-900 mb-3 whitespace-pre-wrap flex-grow">{post.content}</p>

              {post.media && (
                <div className="mt-2">
                  {post.media.endsWith(".mp4") ? (
                    <video
                      controls
                      className="rounded w-full max-h-64"
                      aria-label="Vidéo de la publication"
                    >
                      <source src={post.media} type="video/mp4" />
                      Votre navigateur ne supporte pas la lecture vidéo.
                    </video>
                  ) : (
                    <img
                      src={post.media}
                      alt="Illustration de la publication"
                      className="rounded w-full max-h-64 object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
              )}

              <footer className="mt-4 text-sm text-gray-700 font-semibold select-none">
                👤 {post.authorName || "Utilisateur"}
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default MesPublications;
