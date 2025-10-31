import React, { useState } from 'react';
import MonetisationDashboard from "./Monetisation/MonetisationDashboard";
import CreateOffer from "./Monetisation/CreateOffer";
import MyClients from "./Monetisation/MyClients";
import RevenueStats from "./Monetisation/RevenueStats";
import Payouts from "./Monetisation/Payouts";
import AdminDashboard from "../Admin/AdminDashboard";
import { useAuth } from '../../context/AuthContext';

export default function SettingsSection() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { isAdmin } = useAuth();

  const TABS = [
    { id: "dashboard", label: "📊 Tableau de bord" },
    { id: "create", label: "➕ Créer une offre" },
    { id: "clients", label: "👥 Mes clients" },
    { id: "revenus", label: "💰 Statistiques" },
    { id: "retraits", label: "💵 Retraits" },
    ...(isAdmin() ? [{ id: "admin", label: "🛠️ Admin", badge: "Admin only" }] : [])
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <MonetisationDashboard />;
      case "create": return <CreateOffer />;
      case "clients": return <MyClients />;
      case "revenus": return <RevenueStats />;
      case "retraits": return <Payouts />;
      case "admin":
        return isAdmin() ? (
          <div className="relative">
            {/* Fond sombre + blur */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm rounded-lg"></div>
            <div className="relative z-10">
              <AdminDashboard />
            </div>
          </div>
        ) : <p className="text-red-500 font-medium">Accès réservé aux administrateurs.</p>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Menu déroulant mobile */}
      <div className="md:hidden">
        <label htmlFor="settings-tabs" className="sr-only">Choisir une section</label>
        <select
          id="settings-tabs"
          className="w-full px-4 py-2 rounded-md border border-gray-300"
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
        >
          {TABS.map(({ id, label }) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
      </div>

      {/* Onglets desktop */}
      <div className="hidden md:flex space-x-3 mb-6" role="tablist" aria-label="Sections des paramètres">
        {TABS.map(({ id, label, badge }) => {
          const isActive = id === activeTab;
          return (
            <button
              key={id}
              id={`tab-${id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${id}`}
              tabIndex={isActive ? 0 : -1}
              className={`px-5 py-2 rounded-md font-semibold transition focus:outline-none focus:ring-2 focus:ring-orange-500 relative ${
                isActive ? "bg-orange-500 text-white shadow-md" : "bg-gray-200 hover:bg-gray-300"
              }`}
              onClick={() => setActiveTab(id)}
            >
              {label}
              {badge && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium text-white bg-red-500 rounded-full">{badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Contenu principal */}
      <main
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className={`bg-white p-6 rounded-lg shadow-lg min-h-[300px] relative overflow-hidden`}
      >
        {renderContent()}
      </main>
    </div>
  );
}
