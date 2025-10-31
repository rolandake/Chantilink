import { useState, useEffect } from "preact/hooks";
import { useParams } from "react-router-dom";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

export default function UserProfile() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/users/${id}`);
        setProfile(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Profil introuvable");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [id]);

  const isFollowing = () => {
    if (!currentUser || !profile) return false;
    return currentUser.following?.some((u) => u === profile._id || u === profile._id.toString());
  };

  async function handleFollow() {
    if (!currentUser?.token) {
      setError("Connectez-vous pour vous abonner.");
      return;
    }
    setFollowLoading(true);
    setError("");
    try {
      if (isFollowing()) {
        await api.post(`/users/${profile._id}/unfollow`);
      } else {
        await api.post(`/users/${profile._id}/follow`);
      }
      // Refresh profile after follow/unfollow
      const res = await api.get(`/users/${profile._id}`);
      setProfile(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur serveur");
    } finally {
      setFollowLoading(false);
    }
  }

  if (loading) return <p className="text-center text-orange-500">Chargement du profil...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;
  if (!profile) return <p className="text-center text-gray-500">Utilisateur non trouvé.</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-md text-gray-100">
      <h1 className="text-3xl font-bold mb-4 text-orange-400">{profile.username}</h1>
      <img
        src={profile.profileImage || "/default-avatar.png"}
        alt="Avatar"
        className="w-24 h-24 rounded-full mb-4"
      />
      <p className="mb-4 text-gray-300">Email: {profile.email}</p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2 text-orange-300">Page personnelle</h2>
        <p>{profile.pageContent || "Cet utilisateur n'a pas encore rédigé sa page perso."}</p>
      </section>

      <section className="mb-6 flex space-x-8">
        <div>
          <h3 className="font-semibold text-orange-300">Abonnés ({profile.followers?.length || 0})</h3>
          <ul className="list-disc ml-5 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-700">
            {(profile.followers || []).map((follower) => (
              <li key={follower._id} className="text-gray-300">{follower.username}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-orange-300">Abonnements ({profile.following?.length || 0})</h3>
          <ul className="list-disc ml-5 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-700">
            {(profile.following || []).map((following) => (
              <li key={following._id} className="text-gray-300">{following.username}</li>
            ))}
          </ul>
        </div>
      </section>

      {currentUser && currentUser.userId !== profile._id && (
        <button
          disabled={followLoading}
          onClick={handleFollow}
          className={`px-6 py-3 rounded-md ${
            isFollowing() ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
          } text-white transition duration-300`}
          aria-label={isFollowing() ? "Se désabonner" : "S'abonner"}
        >
          {followLoading ? "Chargement..." : isFollowing() ? "Se désabonner" : "S'abonner"}
        </button>
      )}
    </div>
  );
}
