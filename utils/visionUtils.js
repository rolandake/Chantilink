// backend/routes/visionUtils.js
import OpenAI from "openai";

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Prompt d’extraction pure : détecter TOUT ce que contient le plan.
 */
export function buildExtractionPrompt({ imageDescription }) {
  return `
Tu es un expert en lecture de plans (architecture/BTP). 
Analyse UNIQUEMENT le contenu du plan fourni et EXTRAIS les informations suivantes, SANS faire d'hypothèses si l’info n’est pas visible. 
Quand une donnée est incertaine ou absente, mets null et ajoute une entrée dans "inconnus".

Retiens bien : tu ne fais PAS de coûts, PAS de devis, PAS de matériaux. Extraction pure.

Rends UNIQUEMENT du JSON valide suivant CE SCHÉMA :

{
  "resume": {
    "type_batiment": "string|null",
    "niveaux": ["RDC","R+1","Sous-sol"] | [],
    "surface_totale_m2": number|null,
    "perimetre_exterieur_m": number|null,
    "hauteur_nette_m": number|null,
    "nombre_pieces": number|null
  },
  "pieces": [
    {
      "nom": "string",
      "niveau": "string|null",
      "surface_m2": number|null,
      "dimensions_m": { "longueur": number|null, "largeur": number|null },
      "perimetre_m": number|null
    }
  ],
  "ouvertures": {
    "portes": [
      { "nom": "string|null", "largeur_m": number|null, "hauteur_m": number|null, "niveau": "string|null" }
    ],
    "fenetres": [
      { "nom": "string|null", "largeur_m": number|null, "hauteur_m": number|null, "allège_m": number|null, "niveau": "string|null" }
    ]
  },
  "murs": [
    {
      "type": "porteur|cloison|null",
      "niveau": "string|null",
      "longueur_m": number|null,
      "epaisseur_m": number|null,
      "hauteur_m": number|null
    }
  ],
  "dalles": [
    { "niveau": "string|null", "epaisseur_m": number|null, "surface_m2": number|null }
  ],
  "escaliers": [
    { "niveau_depart": "string|null", "niveau_arrivee": "string|null", "largeur_m": number|null, "nb_marches": number|null, "hauteur_marche_m": number|null, "giron_m": number|null }
  ],
  "sanitaires": [
    { "type": "WC|Douche|Lavabo|Baignoire|null", "niveau": "string|null", "compteur_ou_amenée": "string|null" }
  ],
  "electricite": [
    { "type": "prise|interrupteur|luminaire|null", "niveau": "string|null", "quantite": number|null }
  ],
  "cotes": [
    { "etiquette": "string|null", "valeur_m": number|null }
  ],
  "inconnus": [
    { "champ": "string", "raison": "string" }
  ],
  "confiance": 0.0
}

Rappels : 
- Unités en mètres (m) et m².
- Si une cote est lisible (ex: 3,50), convertis en m (3.5).
- "confiance" ∈ [0,1].
- N’invente RIEN.
Description plan: ${imageDescription || "Plan d’architecture fourni."}
`;
}

/**
 * Appel modèle pour extraction. 
 * NOTE : si tu veux envoyer la vraie image, utilise "messages: [{role:'user', content:[{type:'input_text'},{type:'input_image',image_url:'data:...'}]}]"} 
 */
export async function extractElementsFromPlan({ imageDescription }) {
  const prompt = buildExtractionPrompt({ imageDescription });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" }, // force JSON
    messages: [
      { role: "system", content: "Tu es un expert en lecture de plans et extrais des éléments factuels, sans extrapoler." },
      { role: "user", content: prompt }
    ],
    temperature: 0.1
  });

  // JSON garanti par response_format
  const json = JSON.parse(completion.choices[0].message.content);
  return json;
}
