import React from "react";

function PublicationPage({ children }) {
  return (
    <div className="p-6 max-w-4xl mx-auto min-h-screen bg-white/20 backdrop-blur-md rounded-xl shadow-glass border border-white/30 flex flex-col">
      <h1 className="text-3xl font-extrabold mb-6 text-orange-600 select-none">
        📚 Publications
      </h1>
      <p className="text-gray-900 mb-6">
        Bienvenue sur la page des publications.
      </p>
      {children}
    </div>
  );
}

export default PublicationPage;
