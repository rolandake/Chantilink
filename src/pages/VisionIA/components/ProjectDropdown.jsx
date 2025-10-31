// src/pages/VisionIA/components/ProjectDropdown.jsx
import React, { useEffect } from "react";

const projectIcons = {
  batiment: "🏢",
  energie: "⚡",
  ecologie: "🌱",
  ferroviaire: "🚆",
  geotechnique: "🛠️",
  hydraulique: "💧",
  maritime: "🚢",
  reseaux: "📡",
  route: "🛣️",
};

export default function ProjectDropdown({ projectType, setProjectType, addSystemMessage }) {

  useEffect(() => {
    if (projectType && addSystemMessage) {
      addSystemMessage({
        role: "system",
        content: `Vous êtes désormais un expert en ${projectType}. Je suis là pour vous assister.`
      });
    }
  }, [projectType, addSystemMessage]);

  return (
    <select
      className="bg-gray-800 text-white p-2 rounded-md shadow-md hover:shadow-lg transition-all duration-300 border border-gray-700 focus:ring-2 focus:ring-indigo-500"
      value={projectType || ""}
      onChange={(e) => setProjectType(e.target.value)}
    >
      <option value="">-- Choisir un projet --</option>
      {Object.entries(projectIcons).map(([key, icon]) => (
        <option key={key} value={key}>
          {icon} {key.charAt(0).toUpperCase() + key.slice(1)}
        </option>
      ))}
    </select>
  );
}
