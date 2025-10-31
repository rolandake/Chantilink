import React, { useState, useEffect } from 'react';

const STORAGE_KEY = "poteaux-history";

export default function Poteaux({
  currency = "XOF",
  onTotalChange = () => {},
  onMateriauxChange = () => {},
}) {
  const [typePoteau, setTypePoteau] = useState("rectangulaire");
  const [largeur, setLargeur] = useState("");
  const [hauteur, setHauteur] = useState("");
  const [diametre, setDiametre] = useState("");
  const [sectionManuelle, setSectionManuelle] = useState("");
  const [longueur, setLongueur] = useState("");
  const [quantite, setQuantite] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [coutMainOeuvre, setCoutMainOeuvre] = useState("");
  const [historique, setHistorique] = useState([]);

  const densiteBeton = 2.4;

  // ✅ CALCULS INSTANTANÉS - SECTION
  let section = 0;
  if (typePoteau === "rectangulaire" || typePoteau === "T") {
    const l = parseFloat(largeur) || 0;
    const h = parseFloat(hauteur) || 0;
    if (l > 0 && h > 0) section = l * h;
  } else if (typePoteau === "circulaire") {
    const d = parseFloat(diametre) || 0;
    if (d > 0) section = Math.PI * (d / 2) ** 2;
  } else if (typePoteau === "autre") {
    const s = parseFloat(sectionManuelle) || 0;
    if (s > 0) section = s;
  }

  const longueurNum = parseFloat(longueur) || 0;
  const quantiteNum = parseInt(quantite) || 0;
  const prixUnitaireNum = parseFloat(prixUnitaire) || 0;
  const coutMainOeuvreNum = parseFloat(coutMainOeuvre) || 0;

  const vol = longueurNum > 0 && section > 0 && quantiteNum > 0
    ? longueurNum * section * quantiteNum
    : 0;

  const total = vol * prixUnitaireNum + coutMainOeuvreNum;

  const ciment = vol * 0.3;
  const sable = vol * 0.6;
  const gravier = vol * 0.8;
  const eau = vol * 150;

  const acierKg = vol * 80; // 80 kg/m³ par défaut
  const acierT = acierKg / 1000;

  const masseBeton = vol * densiteBeton;
  const masseKg = masseBeton * 1000;

  useEffect(() => {
    onTotalChange(total);
  }, [total, onTotalChange]);

  useEffect(() => {
    onMateriauxChange({
      Volume: vol,
      Masse: masseBeton,
      MasseKg: masseKg,
      Ciment: ciment,
      Sable: sable,
      Gravier: gravier,
      Eau: eau,
      Acier: acierT,
    });
  }, [vol, masseBeton, masseKg, ciment, sable, gravier, eau, acierT, onMateriauxChange]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistorique(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historique));
  }, [historique]);

  const handleSave = () => {
    if (vol === 0) {
      alert("⚠️ Veuillez saisir des valeurs valides.");
      return;
    }
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      typePoteau,
      largeur,
      hauteur,
      diametre,
      sectionManuelle,
      longueur,
      quantite,
      prixUnitaire,
      coutMainOeuvre,
      section: section.toFixed(3),
      volume: vol.toFixed(3),
      masse: masseBeton.toFixed(3),
      masseKg: masseKg.toFixed(0),
      ciment: ciment.toFixed(3),
      cimentKg: (ciment * 1000).toFixed(0),
      sable: sable.toFixed(3),
      sableKg: (sable * 1000).toFixed(0),
      gravier: gravier.toFixed(3),
      gravierKg: (gravier * 1000).toFixed(0),
      eau: eau.toFixed(0),
      eauM3: (eau / 1000).toFixed(3),
      acierT: acierT.toFixed(3),
      acierKg: acierKg.toFixed(0),
      total: total.toFixed(2),
    };
    setHistorique([entry, ...historique]);
    alert("✅ Calcul sauvegardé !");
  };

  const handleDelete = (id) => {
    if (confirm("🗑️ Supprimer cette entrée ?")) {
      setHistorique(historique.filter((item) => item.id !== id));
    }
  };

  const clearHistorique = () => {
    if (confirm("🧹 Vider tout l'historique ?")) {
      setHistorique([]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h3 className="text-xl font-bold text-orange-400 mb-4 text-center">Poteaux</h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Type de poteau</label>
          <select
            value={typePoteau}
            onChange={(e) => setTypePoteau(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700"
          >
            <option value="rectangulaire">Rectangulaire</option>
            <option value="T">Poteau en T</option>
            <option value="circulaire">Circulaire</option>
            <option value="autre">Autre</option>
          </select>
        </div>

        {(typePoteau === "rectangulaire" || typePoteau === "T") && (
          <>
            <div>
              <label className="block mb-1 text-orange-400">Largeur (m)</label>
              <input
                type="number"
                value={largeur}
                onChange={(e) => setLargeur(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block mb-1 text-orange-400">Hauteur (m)</label>
              <input
                type="number"
                value={hauteur}
                onChange={(e) => setHauteur(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
              />
            </div>
          </>
        )}

        {typePoteau === "circulaire" && (
          <div>
            <label className="block mb-1 text-orange-400">Diamètre (m)</label>
            <input
              type="number"
              value={diametre}
              onChange={(e) => setDiametre(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
            />
          </div>
        )}

        {typePoteau === "autre" && (
          <div>
            <label className="block mb-1 text-orange-400">Section (m²)</label>
            <input
              type="number"
              value={sectionManuelle}
              onChange={(e) => setSectionManuelle(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
            />
          </div>
        )}

        <div>
          <label className="block mb-1 text-orange-400">Longueur (m)</label>
          <input
            type="number"
            value={longueur}
            onChange={(e) => setLongueur(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
          />
        </div>
        <div>
          <label className="block mb-1 text-orange-400">Quantité</label>
          <input
            type="number"
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
          />
        </div>
        <div>
          <label className="block mb-1 text-orange-400">Prix unitaire ({currency}/m³)</label>
          <input
            type="number"
            value={prixUnitaire}
            onChange={(e) => setPrixUnitaire(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
          />
        </div>
        <div>
          <label className="block mb-1 text-orange-400">Main d'œuvre ({currency})</label>
          <input
            type="number"
            value={coutMainOeuvre}
            onChange={(e) => setCoutMainOeuvre(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
          />
        </div>
      </div>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 mb-6 shadow-2xl border-2 border-orange-500/30">
        <h3 className="text-xl font-bold text-orange-400 mb-3">📊 Résultats instantanés</h3>
        <div className="space-y-2">
          <p>📐 Section : <strong>{section.toFixed(3)} m²</strong></p>
          <p>📦 Volume : {vol.toFixed(3)} m³</p>
          <p>⚖ Masse béton : {masseKg.toFixed(0)} kg</p>
          <p>🧱 Ciment : {ciment.toFixed(3)} t ({(ciment * 1000).toFixed(0)} kg)</p>
          <p>🏖️ Sable : {sable.toFixed(3)} t</p>
          <p>🪨 Gravier : {gravier.toFixed(3)} t</p>
          <p>💧 Eau : {eau.toFixed(0)} L</p>
          <p>🔩 Acier : {acierKg.toFixed(0)} kg ({acierT.toFixed(3)} t)</p>
          <p className="text-orange-400 font-bold text-lg mt-2">💰 Total : {total.toLocaleString()} {currency}</p>
        </div>
      </div>

      <div className="flex justify-center gap-4 mb-4">
        <button onClick={handleSave} disabled={vol === 0} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded">💾 Enregistrer</button>
        <button onClick={clearHistorique} disabled={historique.length === 0} className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded">🧹 Vider</button>
      </div>

      {historique.length > 0 && (
        <div className="bg-gray-800 p-4 rounded-md max-h-96 overflow-y-auto">
          <h4 className="text-center font-bold text-orange-400 mb-3">📜 Historique</h4>
          {historique.map((item) => (
            <div key={item.id} className="bg-gray-700 rounded p-3 mb-2">
              <p className="text-sm text-gray-400">{item.date}</p>
              <p>Type : {item.typePoteau}</p>
              <p>Volume : {item.volume} m³ | Acier : {item.acierKg} kg</p>
              <p className="text-orange-300 font-bold">Total : {item.total} {currency}</p>
              <button onClick={() => handleDelete(item.id)} className="text-red-500 text-sm mt-1">✖ Supprimer</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}