import React from 'react';
import { useState, useEffect, useContext } from "react";
import { useAuth } from "../../context/AuthContext";

export default function UsersList() {
  const { user, token } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;

    async function fetchUsers() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.message || "Erreur lors du chargement");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        setError("Erreur réseau");
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [token]);

  if (!user || user.role !== "admin") {
    return <p>Accès refusé, vous devez être admin.</p>;
  }

  return (
    <div style={{ maxWidth: 600, margin: "auto", padding: 20 }}>
      <h2>Liste des utilisateurs</h2>
      {loading && <p>Chargement...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <table border="1" cellPadding="10" cellSpacing="0" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Nom d’utilisateur</th>
            <th>Email</th>
            <th>Rôle</th>
            <th>Créé le</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && !loading && <tr><td colSpan="4">Aucun utilisateur trouvé</td></tr>}
          {users.map(u => (
            <tr key={u._id}>
              <td>{u.username}</td>
              <td>{u.email || "—"}</td>
              <td>{u.role}</td>
              <td>{new Date(u.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}



