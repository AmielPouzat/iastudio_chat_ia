import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Lazy-loaded Gemini AI client to prevent crashes if key is missing on startup
let aiClient: GoogleGenAI | null = null;

function getAIClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in development/production parameters.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Available Models Configuration (Default seed list)
const DEFAULT_AI_MODELS = [
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    tier: "lite",
    displayName: "Toujours Accessible (Lite)",
    status: "disponible",
    speed: "Ultra-rapide (~0.3s)",
    latencyRating: "Excellent",
    costRating: "Extrêmement économique",
    description: "Modèle ultra-léger configuré pour être toujours accessible avec une latence minimale. Idéal pour des réponses concises, du formatage rapide ou du traitement en temps réel.",
    strengths: ["Vitesse absolue", "Disponibilité garantie", "Synthèse simple"],
    avgLatencyMs: 380,
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    tier: "standard",
    displayName: "Standard Performant (Flash)",
    status: "disponible",
    speed: "Rapide (~0.7s)",
    latencyRating: "Très bon",
    costRating: "Équilibré",
    description: "Le modèle par défaut le plus équilibré et extrêmement polyvalent. Idéal pour de la rédaction de contenu, traduction, analyse de données ordinaires et Q&A interactif.",
    strengths: ["Polyvalent", "Style naturel", "Excellent rapport qualité/vitesse"],
    avgLatencyMs: 750,
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro",
    tier: "pro",
    displayName: "Ultra-Premium (Pro Plan)",
    status: "premium",
    speed: "Modéré (~1.8s)",
    latencyRating: "Standard",
    costRating: "Premium (Clé requise)",
    description: "Le modèle d'intelligence le plus avancé pour les tâches complexes qui exigent un raisonnement de haut niveau, de la programmation avancée, de la logique complexe et de la créativité.",
    strengths: ["Raisonnement profond", "Programmation & Code", "Analyses complexes"],
    avgLatencyMs: 1850,
  }
];

// Current active models state (can be updated autonomously)
let AI_MODELS = [...DEFAULT_AI_MODELS];

// Autonomous Self-Update Routine
async function performAutonomousModelDiscovery() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log("[Auto-Update] Skipped: GEMINI_API_KEY not defined yet.");
      return;
    }
    console.log("[Auto-Update] Lancement de la vérification autonome des nouveaux modèles Gemini...");
    const ai = getAIClient();
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Quels sont les tout derniers modèles d'IA de la gamme Gemini officiellement disponibles de manière générale (ou en preview publique stable) sur Google AI Studio en date d'aujourd'hui ? Renvoie la liste structurée des modèles actifs. Fais une recherche en ligne pour être sûr d'avoir les versions de modèle de production les plus actuelles de 2026/2027.",
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            models: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "Technical model ID e.g. gemini-3.5-flash" },
                  displayName: { type: Type.STRING },
                  tier: { type: Type.STRING, description: "lite, standard or pro" },
                  description: { type: Type.STRING },
                  speed: { type: Type.STRING }
                },
                required: ["id", "displayName", "tier", "description", "speed"]
              }
            }
          },
          required: ["models"]
        }
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    
    if (data.models && data.models.length > 0) {
      let addedCount = 0;
      data.models.forEach((scraped: any) => {
        const exists = AI_MODELS.some(m => m.id === scraped.id);
        if (!exists) {
          AI_MODELS.push({
            id: scraped.id,
            name: scraped.displayName || scraped.id,
            tier: scraped.tier || "standard",
            displayName: scraped.displayName || scraped.id,
            status: "disponible",
            speed: scraped.speed || "Rapide",
            latencyRating: scraped.tier === "lite" ? "Excellent" : scraped.tier === "pro" ? "Standard" : "Très bon",
            costRating: scraped.tier === "lite" ? "Extrêmement économique" : scraped.tier === "pro" ? "Premium" : "Équilibré",
            description: scraped.description || "Modèle découvert de manière autonome via recherche sémantique en ligne.",
            strengths: ["Détection autonome", "Validation continue"],
            avgLatencyMs: scraped.tier === "lite" ? 400 : scraped.tier === "pro" ? 1800 : 800
          });
          addedCount++;
        }
      });
      console.log(`[Auto-Update] Auto-mise à jour terminée. ${addedCount} nouveaux modèles injectés dynamiquement.`);
    }
  } catch (error) {
    console.warn("[Auto-Update] Échec de la recherche en arrière-plan :", error);
  }
}

// Helper to calculate tokens (rough estimation for UI representation)
function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // Approximation of 4 characters per token
  return Math.ceil(text.length / 4);
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    apiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

app.get("/api/models", (req, res) => {
  res.json({
    models: AI_MODELS,
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

app.get("/api/discover-models", async (req, res) => {
  try {
    const ai = getAIClient();
    
    // We query Google Search Grounding to find the very latest Gemini Models.
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Quels sont les tout derniers modèles d'IA de la gamme Gemini de Google officiellement disponibles via l'API Google AI Studio (comme Gemini 2.5, 3.1, 3.5 et leurs déclinaisons flash, pro) ? Fais une recherche en ligne approfondie. Retourne la liste exacte des modèles actifs au format JSON structuré selon le schéma indiqué.",
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            models: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "Technical model ID such as gemini-3.5-flash or gemini-3.1-flash-lite" },
                  displayName: { type: Type.STRING, description: "Friendly name of the model" },
                  tier: { type: Type.STRING, description: "lite, standard, or pro" },
                  description: { type: Type.STRING, description: "A brief 1-sentence description" },
                  speed: { type: Type.STRING, description: "Approximate latency (e.g. Rapide, Modéré)" },
                  strengths: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ["id", "displayName", "tier", "description", "speed"]
              }
            }
          },
          required: ["models"]
        }
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    res.json({
      success: true,
      models: data.models || [],
      discoveredAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Error discovering models:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Impossible d'effectuer l'analyse de découverte des derniers modèles."
    });
  }
});

app.post("/api/generate", async (req, res) => {
  const { prompt, modelId, temperature, systemInstruction } = req.body;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Le paramètre 'prompt' est requis et doit être une chaîne." });
  }

  const selectedModelId = modelId || "gemini-3.5-flash";
  const matchedModel = AI_MODELS.find((m) => m.id === selectedModelId);

  if (!matchedModel) {
    return res.status(400).json({ error: `Le modèle spécifié '${selectedModelId}' n'est pas pris en charge.` });
  }

  const startTime = Date.now();

  try {
    const ai = getAIClient();

    const response = await ai.models.generateContent({
      model: selectedModelId,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "Vous êtes un assistant IA intelligent intégré dans pouzat.fr, une plateforme web d'Amiel Pouzat. Répondez de manière structurée, précise et élégante en français, sauf si d'autres langues sont demandées.",
        temperature: typeof temperature === "number" ? temperature : 0.7,
      },
    });

    const endTime = Date.now();
    const actualLatency = endTime - startTime;
    const generatedText = response.text || "";

    res.json({
      text: generatedText,
      modelUsed: selectedModelId,
      latencyMs: actualLatency,
      inputTokensEst: estimateTokenCount(prompt),
      outputTokensEst: estimateTokenCount(generatedText),
      success: true,
    });
  } catch (error: any) {
    const endTime = Date.now();
    const actualLatency = endTime - startTime;
    console.error("Gemini API Error:", error);

    // Format error message elegantly for client implementation
    let errorMessage = "Une erreur est survenue lors de l'appel au modèle de langage.";
    if (error.message && error.message.includes("API_KEY")) {
      errorMessage = "Clé d'accès API Gemini introuvable ou invalide dans les paramètres du serveur.";
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(500).json({
      error: errorMessage,
      modelUsed: selectedModelId,
      latencyMs: actualLatency,
      success: false,
    });
  }
});

// Vite Developer Server vs Production Handler
async function serveApp() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[pouzat.fr Live Hub] Serveur démarré sur le port ${PORT}`);
    
    // Trigger autonomous self-update on start
    performAutonomousModelDiscovery();
    
    // Set 12-hour background loop interval
    setInterval(performAutonomousModelDiscovery, 12 * 60 * 60 * 1000);
  });
}

serveApp().catch((err) => {
  console.error("Échec du démarrage de l'application pouzat.fr:", err);
});
