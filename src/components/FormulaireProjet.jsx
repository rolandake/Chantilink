import React from 'react';
import { useState } from 'react';
import TypeConstruction from "./TypeConstruction.jsx";
import DeviseSelector from "./DeviseSelector.jsx";
import Terrassement from "./Terrassement.jsx";
import Fondation from "./Fondation.jsx";
import Structure from "./Structure.jsx";
import Finition from "./Finition.jsx";
import Devis from "./Devis.jsx";
import { generatePDF } from "../utils/exportPDF";
import { generateDevisExcel } from "../utils/exportExcel";
import { useCalculs } from "../context/CalculsContext.jsx";

export default function FormulaireProjet() {
  const {
    globalData,
    updateGlobalData,
    resetGlobalData,
  } = useCalculs();

  const [formuleBeton, setFormuleBeton] = useState("B25");
  const [coefPerte, setCoefPerte] = useState(0);
  const [devise, setDevise] = useState("FCFA");

  const { type = "", niveaux = 0 } = globalData;

  // Validation simple du formulaire
  function validerFormulaire() {
    if (!type) {
      alert("❗Veuillez sélectionner un type de construction.");
      return false;
    }
    if (type === "Immeuble" && (!niveaux || niveaux < 1)) {
      alert("❗Veuillez indiquer un nombre de niveaux valide.");
      return false;
    }
    return true;
  }

  // Réinitialisation complète
  function resetFormulaire() {
    if (confirm("Voulez-vous vraiment réinitialiser tout le formulaire ?")) {
      resetGlobalData();
      setFormuleBeton("B25");
      setCoefPerte(0);
      setDevise("FCFA");
    }
  }

  // Export PDF avec validation
  function handleExportPDF() {
    if (!validerFormulaire()) return;
    generatePDF({
      formuleBeton,
      coefPerte,
      devise,
      terrassementData: globalData.terrassement,
      fondationData: globalData.fondation,
      structureData: globalData.structure,
      finitionData: globalData.finition,
      type,
      niveaux,
    });
  }

  // Export Excel avec validation
  function handleExportExcel() {
    if (!validerFormulaire()) return;
    generateDevisExcel({
      formuleBeton,
      coefPerte,
      devise,
      terrassementData: globalData.terrassement,
      fondationData: globalData.fondation,
      structureData: globalData.structure,
      finitionData: globalData.finition,
      type,
      niveaux,
    });
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex justify-center items-start py-12 px-4 text-gray-300">
      <div className="w-full max-w-5xl bg-gray-900/70 backdrop-blur-md rounded-3xl shadow-2xl p-12 space-y-12 border border-gray-700">

        <h2 className="text-5xl font-extrabold text-indigo-400 tracking-wide text-center">
          Assistant BTP IA - Formulaire Projet
        </h2>

        {/* Affichage debug type */}
        <div className="mb-4 p-2 bg-gray-700 text-white rounded text-center">
          Type sélectionné : <strong>{type || "aucun"}</strong>
        </div>

        {/* Type de construction + niveaux */}
        <TypeConstruction
          type={type}
          setType={(val) => updateGlobalData("type", val)}
          niveaux={niveaux}
          setNiveaux={(val) => updateGlobalData("niveaux", val)}
        />

        {/* Sélecteur de devise */}
        <DeviseSelector devise={devise} setDevise={setDevise} />

        {/* Formule béton */}
        <section>
          <label className="block mb-2 text-xl font-semibold text-indigo-400">
            Formule béton :
          </label>
          <select
            value={formuleBeton}
            onChange={(e) => setFormuleBeton(e.target.value)}
            className="w-full px-6 py-4 text-lg bg-gray-800 text-indigo-300 rounded-xl border border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="B25">B25</option>
            <option value="B30">B30</option>
            <option value="B35">B35</option>
          </select>
        </section>

        {/* Coefficient de perte */}
        <section>
          <label className="block mb-2 text-xl font-semibold text-indigo-400">
            Coefficient de perte :
          </label>
          <select
            value={coefPerte}
            onChange={(e) => setCoefPerte(Number(e.target.value))}
            className="w-full px-6 py-4 text-lg bg-gray-800 text-indigo-300 rounded-xl border border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value={0}>0%</option>
            <option value={5}>5%</option>
            <option value={10}>10%</option>
            <option value={15}>15%</option>
          </select>
        </section>

        {/* Sections Terrassement, Fondation, Structure, Finition */}
        <section className="space-y-16">
          <Terrassement
            data={globalData.terrassement}
            setData={(val) => updateGlobalData("terrassement", val)}
            devise={devise}
            type={type}
            niveaux={niveaux}
          />
          <Fondation
            data={globalData.fondation}
            setData={(val) => updateGlobalData("fondation", val)}
            formuleBeton={formuleBeton}
            coefPerte={coefPerte}
            devise={devise}
            type={type}
            niveaux={niveaux}
          />
          <Structure
            data={globalData.structure}
            setData={(val) => updateGlobalData("structure", val)}
            formuleBeton={formuleBeton}
            coefPerte={coefPerte}
            devise={devise}
            type={type}
            niveaux={niveaux}
          />
          <Finition
            data={globalData.finition}
            setData={(val) => updateGlobalData("finition", val)}
            coefPerte={coefPerte}
            devise={devise}
            type={type}
            niveaux={niveaux}
          />
        </section>

        {/* Récapitulatif devis */}
        <Devis
          devise={devise}
          terrassementData={globalData.terrassement}
          fondationData={globalData.fondation}
          structureData={globalData.structure}
          finitionData={globalData.finition}
        />

        {/* Boutons export & reset */}
        <section className="flex flex-col sm:flex-row justify-center gap-6 mt-12">
          <button
            onClick={handleExportPDF}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition transform hover:scale-[1.03]"
          >
            📄 Export PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition transform hover:scale-[1.03]"
          >
            📊 Export Excel
          </button>
          <button
            onClick={resetFormulaire}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition transform hover:scale-[1.03]"
          >
            ♻️ Réinitialiser
          </button>
        </section>
      </div>
    </main>
  );
}


