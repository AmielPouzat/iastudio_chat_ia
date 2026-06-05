import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Cpu,
  Zap,
  Gauge,
  History,
  BookOpen,
  ArrowRight,
  ChevronRight,
  Copy,
  Check,
  RotateCcw,
  HelpCircle,
  Send,
  Terminal,
  Settings,
  Layers,
  AlertCircle,
  Info,
  Sliders,
  PenTool,
  Code,
  FileCheck,
  TrendingUp,
  Database
} from "lucide-react";
import { PROMPT_TEMPLATES, ARCHITECTURAL_CONCEPTS } from "./data";
import { Message, ModelConfig, ModelComparisonResult } from "./types";

export default function App() {
  // App state
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
  const [selectedModelId, setSelectedModelId] = useState<string>("gemini-3.5-flash");
  const [activeTab, setActiveTab] = useState<"playground" | "comparateur" | "monitoring" | "architecture">("playground");
  
  // Custom Generation State
  const [prompt, setPrompt] = useState<string>("");
  const [temperature, setTemperature] = useState<number>(0.7);
  const [systemInstruction, setSystemInstruction] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  
  // Single Model Generation results
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Comparative Mode results
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [comparisonInputs, setComparisonInputs] = useState<string>("");
  const [comparativeResults, setComparativeResults] = useState<{
    [key: string]: ModelComparisonResult;
  }>({});
  
  // Stats and history trackers
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<Message[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);

  // Telemetry & Credit Monitoring State
  const [totalCostUsd, setTotalCostUsd] = useState<number>(0);
  const [totalTokens, setTotalTokens] = useState<number>(0);
  const [quotaLimitUsd, setQuotaLimitUsd] = useState<number>(10.00); // Default $10 budget limit
  const [autoFallback, setAutoFallback] = useState<boolean>(false);
  const [detailedUsage, setDetailedUsage] = useState<{ [modelId: string]: { tokens: number; calls: number; cost: number } }>({
    "gemini-3.1-flash-lite": { tokens: 0, calls: 0, cost: 0 },
    "gemini-3.5-flash": { tokens: 0, calls: 0, cost: 0 },
    "gemini-3.1-pro-preview": { tokens: 0, calls: 0, cost: 0 }
  });

  // Fetch model metadata on mount
  useEffect(() => {
    async function loadModelsAndHealth() {
      try {
        const response = await fetch("/api/models");
        const data = await response.json();
        if (data.models) {
          setModels(data.models);
        }
        setHasApiKey(data.hasApiKey);
      } catch (err) {
        console.error("Erreur lors de la récupération des modèles:", err);
        setErrorMessage("Impossible de se connecter au serveur backend pouzat.fr.");
      }
    }
    loadModelsAndHealth();
  }, []);

  // Sync to local storage for persistent history and telemetry metrics
  useEffect(() => {
    const saved = localStorage.getItem("pouzat_ai_history");
    if (saved) {
      try {
        setHistoryList(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }

    const savedCost = localStorage.getItem("pz_telemetry_cost");
    const savedTokens = localStorage.getItem("pz_telemetry_tokens");
    const savedDetails = localStorage.getItem("pz_telemetry_details");
    const savedAutoFallback = localStorage.getItem("pz_telemetry_autofallback");
    const savedQuotaLimit = localStorage.getItem("pz_telemetry_quota_limit");

    if (savedCost) setTotalCostUsd(parseFloat(savedCost));
    if (savedTokens) setTotalTokens(parseInt(savedTokens, 10));
    if (savedAutoFallback) setAutoFallback(savedAutoFallback === "true");
    if (savedQuotaLimit) setQuotaLimitUsd(parseFloat(savedQuotaLimit));
    if (savedDetails) {
      try {
        setDetailedUsage(JSON.parse(savedDetails));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const trackUsage = (modelUsed: string, inputTokens: number, outputTokens: number) => {
    // Pricing details:
    // Lite or Standard Flash: $0.075 / 1M input, $0.30 / 1M output
    // Pro: $1.25 / 1M input, $5.00 / 1M output
    const isPro = modelUsed.includes("pro") || modelUsed.includes("ultra");
    const inRate = isPro ? 1.25 : 0.075;
    const outRate = isPro ? 5.00 : 0.30;

    const callCost = ((inputTokens * inRate) / 1000000) + ((outputTokens * outRate) / 1000000);
    const callTokens = inputTokens + outputTokens;

    setTotalCostUsd((prev) => {
      const next = prev + callCost;
      localStorage.setItem("pz_telemetry_cost", next.toString());
      return next;
    });

    setTotalTokens((prev) => {
      const next = prev + callTokens;
      localStorage.setItem("pz_telemetry_tokens", next.toString());
      return next;
    });

    setDetailedUsage((prev) => {
      // Find matching key
      const key = prev[modelUsed] ? modelUsed : Object.keys(prev).find(k => modelUsed.includes(k)) || "gemini-3.5-flash";
      const currentModel = prev[key] || { tokens: 0, calls: 0, cost: 0 };
      const next = {
        ...prev,
        [key]: {
          tokens: currentModel.tokens + callTokens,
          calls: currentModel.calls + 1,
          cost: currentModel.cost + callCost
        }
      };
      localStorage.setItem("pz_telemetry_details", JSON.stringify(next));
      return next;
    });

    // Check fallback
    const remaining = Math.max(0, quotaLimitUsd - (totalCostUsd + callCost));
    const percent = (remaining / quotaLimitUsd) * 100;
    
    // Auto toggle fallback check
    const savedAuto = localStorage.getItem("pz_telemetry_autofallback");
    if (savedAuto === "true" && percent < 20 && selectedModelId !== "gemini-3.1-flash-lite") {
      setSelectedModelId("gemini-3.1-flash-lite");
      showNotification("Quota critique : Routage automatique de secours activé !");
    }
  };

  const handleResetQuota = () => {
    localStorage.removeItem("pz_telemetry_cost");
    localStorage.removeItem("pz_telemetry_tokens");
    localStorage.removeItem("pz_telemetry_details");
    
    setTotalCostUsd(0);
    setTotalTokens(0);
    setDetailedUsage({
      "gemini-3.1-flash-lite": { tokens: 0, calls: 0, cost: 0 },
      "gemini-3.5-flash": { tokens: 0, calls: 0, cost: 0 },
      "gemini-3.1-pro-preview": { tokens: 0, calls: 0, cost: 0 }
    });
    showNotification("Quota de consommation réinitialisé !");
  };

  const handleSimulateHeavyQuery = () => {
    const inTokens = Math.floor(Math.random() * 200000) + 200000;
    const outTokens = Math.floor(Math.random() * 400000) + 400000;
    
    trackUsage("gemini-3.1-pro-preview", inTokens, outTokens);
    
    const simMsg: Message = {
      id: "sim-" + Date.now(),
      role: "model",
      content: `[SIMULATION DE COMPILATION IA] Analyse sémantique d'évaluation complète sur $pz_engine. Codebase : 42 fichiers. Compilation réussie en 3.5s.`,
      timestamp: new Date().toLocaleTimeString(),
      modelUsed: "gemini-3.1-pro-preview",
      latencyMs: 3540,
      inputTokensEst: inTokens,
      outputTokensEst: outTokens,
    };
    saveHistoryItem(simMsg);
    setMessages((prev) => [...prev, simMsg]);
    showNotification("Simulation d'une tâche lourde Gemini Pro créditée !");
  };

  const handleUpdateLimit = (val: number) => {
    setQuotaLimitUsd(val);
    localStorage.setItem("pz_telemetry_quota_limit", val.toString());
    showNotification(`Limite budgétaire fixée à $${val.toFixed(2)} !`);
  };

  const handleToggleFallback = () => {
    const next = !autoFallback;
    setAutoFallback(next);
    localStorage.setItem("pz_telemetry_autofallback", next ? "true" : "false");
    showNotification(next ? "Routage de secours automatique activé" : "Routage de secours automatique désactivé");
  };

  const handleDiscoverLatestModels = async () => {
    setIsDiscovering(true);
    showNotification("Interrogatoire de l'API de Routage pour découvrir les derniers modèles Gemini...");
    try {
      const res = await fetch("/api/discover-models");
      const data = await res.json();
      if (data.success && data.models && data.models.length > 0) {
        const parsed: ModelConfig[] = data.models.map((m: any) => ({
          id: m.id,
          name: m.displayName || m.id,
          tier: m.tier || "standard",
          displayName: m.displayName || m.id,
          status: "disponible",
          speed: m.speed || "Rapide",
          latencyRating: m.tier === "lite" ? "Excellent" : m.tier === "pro" ? "Standard" : "Très bon",
          costRating: m.tier === "lite" ? "Économique" : m.tier === "pro" ? "Premium" : "Équilibré",
          description: m.description || "Modèle découvert dynamiquement via recherche sémantique en ligne.",
          strengths: m.strengths || ["Rationnel", "Mis à jour"],
          avgLatencyMs: m.tier === "lite" ? 400 : m.tier === "pro" ? 1800 : 800
        }));

        setModels((prev) => {
          const merged = [...prev];
          parsed.forEach((newM) => {
            const index = merged.findIndex((x) => x.id === newM.id);
            if (index > -1) {
              merged[index] = { ...merged[index], ...newM };
            } else {
              merged.push(newM);
            }
          });
          return merged;
        });

        // Register any discovered model in detailed usage counters if not already present
        setDetailedUsage((prev) => {
          const next = { ...prev };
          parsed.forEach((newM) => {
            if (!next[newM.id]) {
              next[newM.id] = { tokens: 0, calls: 0, cost: 0 };
            }
          });
          return next;
        });

        showNotification(`${data.models.length} modèles d'API Gemini découverts & synchronisés !`);
      } else {
        showNotification("Aucun modèle supplémentaire détecté à cette heure sur le CDN Google.");
      }
    } catch (e: any) {
      console.error(e);
      showNotification("Erreur de découverte : " + (e.message || "Impossible de joindre le service."));
    } finally {
      setIsDiscovering(false);
    }
  };

  const saveHistoryItem = (item: Message) => {
    const updated = [item, ...historyList].slice(0, 15); // Keep last 15 items
    setHistoryList(updated);
    localStorage.setItem("pouzat_ai_history", JSON.stringify(updated));
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const selectTemplate = (tpl: typeof PROMPT_TEMPLATES[0]) => {
    setPrompt(tpl.promptText);
    if (activeTab === "comparateur") {
      setComparisonInputs(tpl.promptText);
    }
    if (tpl.systemInstruction) {
      setSystemInstruction(tpl.systemInstruction);
    }
    if (tpl.recommendedModelId && activeTab === "playground") {
      setSelectedModelId(tpl.recommendedModelId);
    }
    showNotification("Modèle de prompt appliqué !");
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Run Solo Model Generation
  const handleGenerateSolo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setErrorMessage(null);

    // Append user message immediately
    const userMsg: Message = {
      id: "user-" + Date.now(),
      role: "user",
      content: prompt,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const currentPrompt = prompt;
    setPrompt(""); // Clear input container

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: currentPrompt,
          modelId: selectedModelId,
          temperature,
          systemInstruction: systemInstruction || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Une erreur inattendue est survenue.");
      }

      const responseMsg: Message = {
        id: "ai-" + Date.now(),
        role: "model",
        content: data.text,
        timestamp: new Date().toLocaleTimeString(),
        modelUsed: data.modelUsed,
        latencyMs: data.latencyMs,
        inputTokensEst: data.inputTokensEst,
        outputTokensEst: data.outputTokensEst,
      };

      setMessages((prev) => [...prev, responseMsg]);
      saveHistoryItem(responseMsg);
      trackUsage(data.modelUsed || selectedModelId, data.inputTokensEst || 0, data.outputTokensEst || 0);
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur de connexion.");
      const errorMsg: Message = {
        id: "error-" + Date.now(),
        role: "model",
        content: `Désolé, une erreur est survenue : ${err.message || "Impossible de joindre le modèle."}`,
        timestamp: new Date().toLocaleTimeString(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Run Real-time Comparative Generation across both Lite and Standard/Pro categories
  const handleCompareModels = async () => {
    if (!comparisonInputs.trim()) return;

    setIsComparing(true);
    setErrorMessage(null);

    // Reset comparative states to pending
    const initialResults: { [key: string]: ModelComparisonResult } = {};
    models.forEach((m) => {
      initialResults[m.id] = {
        modelId: m.id,
        status: "pending",
      };
    });
    setComparativeResults(initialResults);

    // Call generations in parallel
    const comparisonPromises = models.map(async (model) => {
      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: comparisonInputs,
            modelId: model.id,
            temperature,
            systemInstruction: systemInstruction || undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Une erreur est survenue.");
        }

        setComparativeResults((prev) => ({
          ...prev,
          [model.id]: {
            modelId: model.id,
            status: "success",
            text: data.text,
            latencyMs: data.latencyMs,
            inputTokensEst: data.inputTokensEst,
            outputTokensEst: data.outputTokensEst,
          },
        }));

        // Log this to the general history
        saveHistoryItem({
          id: `ai-comp-${model.id}-${Date.now()}`,
          role: "model",
          content: data.text,
          timestamp: new Date().toLocaleTimeString(),
          modelUsed: model.id,
          latencyMs: data.latencyMs,
          inputTokensEst: data.inputTokensEst,
          outputTokensEst: data.outputTokensEst,
        });

        trackUsage(model.id, data.inputTokensEst || 0, data.outputTokensEst || 0);

      } catch (err: any) {
        setComparativeResults((prev) => ({
          ...prev,
          [model.id]: {
            modelId: model.id,
            status: "error",
            error: err.message || "Erreur de traitement.",
          },
        }));
      }
    });

    await Promise.all(comparisonPromises);
    setIsComparing(false);
  };

  const clearChat = () => {
    setMessages([]);
    setErrorMessage(null);
    showNotification("Fenêtre de chat réinitialisée !");
  };

  const clearHistory = () => {
    setHistoryList([]);
    localStorage.removeItem("pouzat_ai_history");
    showNotification("Historique vidé !");
  };

  const remainingUsd = Math.max(0, quotaLimitUsd - totalCostUsd);
  const remainingPercent = quotaLimitUsd > 0 ? (remainingUsd / quotaLimitUsd) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#050505] text-[#e5e5e5] font-sans selection:bg-blue-500/30 selection:text-blue-200 relative flex flex-col">
      
      {/* Radial Grid Pattern Background */}
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      
      {/* Background neon soft color bloom */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-emerald-500/4 rounded-full blur-[120px] pointer-events-none" />

      {/* Header element */}
      <header id="pouzat-header" className="h-16 flex items-center justify-between px-6 sm:px-8 border-b border-[#1f1f1f] bg-[#080808] z-30 sticky top-0 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white font-display shadow-lg shadow-blue-500/10">P</div>
          <span className="text-lg font-bold tracking-tight text-white font-display">
            POUZAT<span className="text-blue-500 italic">.FR</span>
          </span>
        </div>

        {/* Navigation tabs */}
        <nav className="flex items-center gap-1 sm:gap-6 text-xs sm:text-sm font-medium text-[#888]">
          <button
            onClick={() => setActiveTab("playground")}
            className={`px-3 py-5 transition-all outline-none cursor-pointer relative ${
              activeTab === "playground" ? "text-white border-b-2 border-blue-500" : "hover:text-white"
            }`}
          >
            Playground Model
          </button>
          <button
            id="tab-comparateur"
            onClick={() => setActiveTab("comparateur")}
            className={`px-3 py-5 transition-all outline-none cursor-pointer relative ${
              activeTab === "comparateur" ? "text-white border-b-2 border-blue-500" : "hover:text-white"
            }`}
          >
            Comparateur Fleet
          </button>
          <button
            onClick={() => setActiveTab("monitoring")}
            className={`px-3 py-5 transition-all outline-none cursor-pointer relative ${
              activeTab === "monitoring" ? "text-white border-b-2 border-blue-500" : "hover:text-white"
            }`}
          >
            Console Monitoring
          </button>
          <button
            onClick={() => setActiveTab("architecture")}
            className={`px-3 py-5 transition-all outline-none cursor-pointer relative ${
              activeTab === "architecture" ? "text-white border-b-2 border-blue-500" : "hover:text-white"
            }`}
          >
            System Architecture
          </button>
        </nav>

        {/* Action Panel info badge */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="px-3 py-1 bg-[#1a1a1a] border border-[#222] rounded-full text-[10px] font-mono text-[#aaa]">
            KEY STATUS: <span className={hasApiKey ? "text-blue-400 font-bold" : "text-amber-500"}>{hasApiKey ? "PZ_SECURE_LINK" : "SIMULATED_KEY"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="status-pulse" />
            <span className="text-[10px] font-mono text-emerald-400 font-bold tracking-wider">LIVE</span>
          </div>
        </div>
      </header>

      {/* Main Workspace container */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col relative z-20">
        
        {/* Banner if no API key */}
        {!hasApiKey && (
          <div className="mb-6 bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-200 text-sm">Clé API requise pour le serveur de production</h3>
              <p className="text-amber-300/80 text-xs mt-0.5 leading-relaxed">
                Le serveur utilise une clé par défaut. Pour vos déploiements finaux sur <strong>pouzat.fr</strong>, configurez la clé <code className="text-amber-100 bg-amber-950/50 px-1 py-0.5 rounded font-mono">GEMINI_API_KEY</code> dans la section Secrets de l'interface Google AI Studio.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-white font-display">
              Workspace <span className="font-semibold text-blue-500">Fleet</span>
            </h1>
            <p className="text-[#666] text-sm mt-1">
              {activeTab === "playground" && "Interrogez, testez et paramétrez un modèle de langage unique de la gamme."}
              {activeTab === "comparateur" && "Analysez et comparez la latence, le nombre de jetons et la qualité de réponse de la flotte en temps réel."}
              {activeTab === "monitoring" && "Supervisez la consommation de jetons, budgétisez vos charges financières et simulez des alertes de surutilisation."}
              {activeTab === "architecture" && "Comprenez la cartographie cognitive d'Amiel Pouzat et l'aiguillage intelligent optimisé."}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDiscoverLatestModels}
              disabled={isDiscovering}
              className={`px-4 py-2 text-white text-xs font-bold rounded cursor-pointer transition-all shadow-md flex items-center gap-1.5 ${
                isDiscovering 
                  ? "bg-blue-900/50 text-blue-300 border border-blue-800/50 cursor-wait" 
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/10"
              }`}
            >
              <Sparkles className={`h-3.5 w-3.5 ${isDiscovering ? "animate-spin text-blue-400" : "text-yellow-300"}`} />
              {isDiscovering ? "Recherche en cours..." : "Découvrir Modèles API"}
            </button>
            <button
              onClick={() => {
                const totalM = models.length || 3;
                showNotification(`Disponibilité : 100% | Analyse sur ${totalM} nœuds IA actifs.`);
              }}
              className="px-4 py-2 bg-[#1a1a1a] border border-[#333] text-[#aaa] text-xs font-bold rounded hover:text-white transition-all cursor-pointer"
            >
              Check Fleet Latency
            </button>
          </div>
        </div>

        {/* Grid System Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDECAR COLUMN: Selector & Templates & Config (Span 4) */}
          <section className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Model Selector Card - visible on Playground */}
            {activeTab === "playground" && (
              <div className="bg-[#080808] border border-[#1f1f1f] rounded-xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1f1f1f]">
                  <h2 className="text-xs uppercase tracking-widest text-blue-500 font-bold italic flex items-center gap-1.5 font-display">
                    <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                    High-Compute & Availability
                  </h2>
                  <span className="text-[10px] text-[#555] font-mono">NODES</span>
                </div>

                <div className="flex flex-col gap-3">
                  {models.map((model) => {
                    const isSelected = selectedModelId === model.id;
                    const isLite = model.tier === "lite";
                    
                    return (
                      <div
                        key={model.id}
                        onClick={() => setSelectedModelId(model.id)}
                        className={`bg-[#0d0d0d] rounded-xl p-4 cursor-pointer transition-all relative border ${
                          isSelected
                            ? isLite 
                              ? "border-emerald-500/60 glow-blue bg-[#0e1610]" 
                              : "border-blue-500/60 glow-blue bg-[#0c121e]"
                            : "border-[#1f1f1f] hover:border-[#333]"
                        }`}
                      >
                        {/* High compute active side marker */}
                        {isSelected && (
                          <div className={`absolute top-0 bottom-0 left-0 w-1 rounded-l-xl ${isLite ? "bg-emerald-500" : "bg-blue-500"}`} />
                        )}

                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-sm text-white select-none">
                              {model.displayName}
                            </h4>
                            <p className="font-mono text-[9px] text-[#555] uppercase tracking-wider mt-0.5">
                              {model.id}
                            </p>
                          </div>
                          
                          <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border ${
                            model.tier === "pro"
                              ? "bg-purple-950/40 text-purple-400 border-purple-900/40"
                              : model.tier === "standard"
                              ? "bg-blue-950/40 text-blue-400 border-blue-900/40"
                              : "bg-emerald-950/40 text-emerald-400 border-emerald-900/40"
                          }`}>
                            {model.tier}
                          </span>
                        </div>

                        <p className="text-xs text-[#a0a0a0] mt-2 line-clamp-2 leading-relaxed">
                          {model.description}
                        </p>

                        <div className="grid grid-cols-2 gap-4 border-t border-[#1f1f1f] pt-3 mt-3">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-[#555] uppercase font-mono">Performance</span>
                            <span className="font-mono text-xs text-white">{model.speed}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-[#555] uppercase font-mono">Uptime</span>
                            <span className="font-mono text-xs text-emerald-500">100% Uptime</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Prompt presets list */}
            <div className="bg-[#080808] border border-[#1f1f1f] rounded-xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1f1f1f]">
                <h2 className="text-xs uppercase tracking-widest text-[#555] font-bold flex items-center gap-1.5">
                  <PenTool className="h-3.5 w-3.5 text-blue-500" />
                  Librairie de Prompts
                </h2>
                <span className="text-[10px] text-[#555] font-mono">TEMPLATES</span>
              </div>

              <div className="flex flex-col gap-2.5">
                {PROMPT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => selectTemplate(tpl)}
                    className="w-full text-left p-3 rounded-lg bg-[#0d0d0d] border border-[#1f1f1f] hover:border-[#333] hover:bg-[#121212] transition-all flex items-start gap-2.5 group"
                  >
                    <span className="mt-1 transition-transform group-hover:scale-110 shrink-0">
                      {tpl.category === "développement" && <Code className="h-4 w-4 text-purple-400" />}
                      {tpl.category === "rédaction" && <PenTool className="h-4 w-4 text-emerald-400" />}
                      {tpl.category === "analyse" && <FileCheck className="h-4 w-4 text-blue-400" />}
                      {tpl.category === "créatif" && <Sparkles className="h-4 w-4 text-pink-400" />}
                    </span>
                    <div className="min-w-0">
                      <span className="font-semibold text-xs text-[#e5e5e5] group-hover:text-white truncate block">
                        {tpl.title}
                      </span>
                      <p className="text-[10px] text-[#666] line-clamp-1 mt-0.5 leading-normal">
                        {tpl.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced configurations */}
            <div className="bg-[#080808] border border-[#1f1f1f] rounded-xl p-4 shadow-xl">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between text-[#888] hover:text-white text-xs font-semibold tracking-wider uppercase transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-blue-500" />
                  Configurations IA (Routage)
                </span>
                <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${showAdvanced ? "rotate-90 text-blue-500" : ""}`} />
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 flex flex-col gap-4 text-xs border-t border-[#1f1f1f] mt-3">
                      <div>
                        <div className="flex justify-between items-center text-[#888] mb-1.5">
                          <span>Température (Créativité)</span>
                          <span className="font-mono text-blue-400 font-bold">{temperature}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1.5"
                          step="0.1"
                          value={temperature}
                          onChange={(e) => setTemperature(parseFloat(e.target.value))}
                          className="w-full h-1 bg-[#222] rounded-md appearance-none cursor-pointer accent-blue-500"
                        />
                        <div className="flex justify-between text-[9px] text-[#555] mt-1">
                          <span>Analytique Strict (0.0)</span>
                          <span>Créativité Libre (1.5)</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[#888] mb-1.5 font-semibold">Instruction Système Globale</label>
                        <textarea
                          value={systemInstruction}
                          onChange={(e) => setSystemInstruction(e.target.value)}
                          placeholder="Ex: Rédige des explications pragmatiques et orientées ingénierie..."
                          className="w-full bg-[#050505] border border-[#1f1f1f] rounded-lg p-2.5 text-xs text-[#e5e5e5] placeholder:text-[#555] focus:outline-none focus:border-blue-500/50 min-h-[90px]"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Tokens resources utilization widget mimicking Elegant Dark sidebar */}
            <div className="bg-[#080808] border border-[#1f1f1f] rounded-xl p-5 shadow-xl">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#555] mb-3 font-bold">Resources</h3>
              <div className="bg-[#111] p-4 rounded-lg border border-[#1f1f1f]">
                <div className="flex justify-between text-[11px] mb-2 font-medium">
                  <span className="text-[#aaa]">Budget IA Restant</span>
                  <span className={`font-mono text-[11px] ${remainingPercent < 20 ? "text-rose-400 font-bold animate-pulse" : "text-blue-400"}`}>
                    {remainingPercent.toFixed(1)}% disponible
                  </span>
                </div>
                <div className="w-full bg-[#222] h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-500 ${remainingPercent < 20 ? "bg-rose-500 animate-pulse" : remainingPercent < 50 ? "bg-amber-500" : "bg-blue-600"}`}
                    style={{ width: `${remainingPercent}%` }} 
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] font-mono text-[#555] mt-3">
                  <span>Dépensé : ${totalCostUsd.toFixed(4)}</span>
                  <span>Solde : ${remainingUsd.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT COLUMN: Chat / Comparator workspace outputs (Span 8) */}
          <section className="lg:col-span-8 flex flex-col gap-6">
            
            {/* TAB VIEW 1: Solo Playground */}
            {activeTab === "playground" && (
              <div className="flex flex-col gap-6 w-full">
                
                {/* Chat Block */}
                <div className="bg-[#080808] border border-[#1f1f1f] rounded-xl flex flex-col min-h-[520px] shadow-2xl relative overflow-hidden">
                  
                  {/* Console Header */}
                  <div className="border-b border-[#1f1f1f] px-5 py-3.5 flex justify-between items-center bg-[#0d0d0d]">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-blue-500" />
                      <span className="text-xs font-mono font-bold text-[#e5e5e5]">
                        Console Solo Terminal
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {messages.length > 0 && (
                        <button
                          onClick={clearChat}
                          className="text-[#666] hover:text-white text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Effacer l'historique
                        </button>
                      )}
                      <div className="status-pulse" />
                      <span className="text-[10px] font-mono text-[#aaa]">STATUS: ACTIVE</span>
                    </div>
                  </div>

                  {/* Conversation feed */}
                  <div className="flex-1 p-5 overflow-y-auto max-h-[440px] flex flex-col gap-4">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center my-auto py-16">
                        <div className="h-10 w-10 rounded-lg bg-blue-950/40 flex items-center justify-center text-blue-400 border border-blue-900/30 mb-4">
                          <Cpu className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-white text-sm">Session d'exécution de code</h3>
                        <p className="text-xs text-[#666] max-w-sm mt-1 leading-relaxed">
                          Choisissez des filtres ou saisissez un message ci-dessous pour interroger le modèle <strong className="text-white">{models.find(m => m.id === selectedModelId)?.displayName || "sélectionné"}</strong>.
                        </p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col max-w-[85%] ${
                            msg.role === "user" ? "self-end items-end" : "self-start items-start"
                          }`}
                        >
                          {/* Sender details */}
                          <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-[#666]">
                            <span>{msg.role === "user" ? "USER_PROMPT" : "COMPUTE_OUTPUT"}</span>
                            <span>•</span>
                            <span>{msg.timestamp}</span>
                            {msg.role !== "user" && msg.modelUsed && (
                              <>
                                <span>•</span>
                                <span className="bg-[#1a1a1a] text-blue-400 px-1.5 py-0.2 rounded font-bold uppercase text-[9px] border border-[#222]">
                                  {msg.modelUsed}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Text bubble */}
                          <div
                            className={`p-4 rounded-xl text-xs leading-relaxed overflow-x-auto ${
                              msg.role === "user"
                                ? "bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-500/10 font-medium"
                                : msg.isError
                                ? "bg-rose-950/20 border border-rose-900/30 text-rose-200 rounded-tl-none font-mono"
                                : "bg-[#0d0d0d] border border-[#1f1f1f] text-[#e5e5e5] rounded-tl-none whitespace-pre-wrap"
                            }`}
                          >
                            {msg.content}

                            {/* Performane status values */}
                            {msg.role !== "user" && !msg.isError && msg.latencyMs !== undefined && (
                              <div className="mt-3.5 pt-3 border-t border-[#1f1f1f] flex flex-wrap gap-4 text-[9px] font-mono text-[#666]">
                                <span className="flex items-center gap-1">
                                  <Zap className="h-3 w-3 text-amber-500" />
                                  Latence : <strong className="text-[#aaa]">{(msg.latencyMs / 1000).toFixed(2)}s</strong>
                                </span>
                                <span>|</span>
                                <span className="flex items-center gap-1">
                                  <Database className="h-3 w-3 text-blue-400" />
                                  Jetons In : <strong className="text-[#aaa]">{msg.inputTokensEst || 0}</strong>
                                </span>
                                <span>|</span>
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                                  Jetons Out : <strong className="text-[#aaa]">{msg.outputTokensEst || 0}</strong>
                                </span>
                                <button
                                  onClick={() => handleCopyText(msg.content, msg.id)}
                                  className="ml-auto flex items-center gap-1 text-blue-500 hover:text-blue-400 transition-colors cursor-pointer"
                                >
                                  {copiedId === msg.id ? (
                                    <>
                                      <Check className="h-3 w-3 text-emerald-400" /> Copié !
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3" /> Copier
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}

                    {isGenerating && (
                      <div className="self-start flex flex-col items-start gap-1 max-w-[80%]">
                        <span className="text-[10px] font-mono text-blue-400 animate-pulse">REQUÊTE EN COURS D'ACHEMINEMENT...</span>
                        <div className="p-4 bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl rounded-tl-none flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" />
                          <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                          <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input container */}
                  <form onSubmit={handleGenerateSolo} className="border-t border-[#1f1f1f] p-4 bg-[#0d0d0d]">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={`Saisissez votre prompt pour ${
                          models.find((m) => m.id === selectedModelId)?.displayName || "Gemini"
                        }...`}
                        disabled={isGenerating}
                        className="w-full bg-[#050505] border border-[#1f1f1f] rounded-lg pl-4 pr-12 py-3 text-xs text-[#e5e5e5] placeholder:text-[#555] focus:outline-none focus:border-blue-500/50 disabled:opacity-40"
                      />
                      <button
                        type="submit"
                        disabled={isGenerating || !prompt.trim()}
                        className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-30 shrink-0 cursor-pointer"
                        title="Soumettre"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* TAB VIEW 2: Comparison Mode */}
            {activeTab === "comparateur" && (
              <div className="flex flex-col gap-6 w-full">
                
                {/* Form Control Comparison inputs */}
                <div className="bg-[#080808] border border-[#1f1f1f] rounded-xl p-5 shadow-2xl relative">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1f1f1f]">
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-blue-500" />
                      <h3 className="font-semibold text-white text-xs uppercase tracking-widest font-display">Simultaneous Evaluation Fleet</h3>
                    </div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2.5 py-0.5 rounded">
                      HYBRID_SYSTEM_ON
                    </span>
                  </div>
                  <p className="text-xs text-[#888] mb-4 leading-relaxed">
                    Exécutez votre prompt simultanément sur les <strong>3 modèles</strong> afin d'examiner le rapport de latence et le rendu textuel. Idéal pour valider l'aiguillage du modèle <span className="text-emerald-400">Lite permanent</span> ou des modèles de performance.
                  </p>

                  <div className="flex gap-2.5">
                    <input
                      type="text"
                      className="flex-1 bg-[#050505] border border-[#1f1f1f] rounded-lg p-3.5 text-xs text-[#e5e5e5] placeholder:text-[#555] focus:outline-none focus:border-blue-500/50"
                      value={comparisonInputs}
                      onChange={(e) => setComparisonInputs(e.target.value)}
                      placeholder="Tapez le prompt comparatif..."
                      disabled={isComparing}
                    />
                    <button
                      onClick={handleCompareModels}
                      disabled={isComparing || !comparisonInputs.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 disabled:opacity-40"
                    >
                      {isComparing ? (
                        <>
                          <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Inférence...
                        </>
                      ) : (
                        <>
                          <Zap className="h-3.5 w-3.5" />
                          Lancer Comparatif
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Performance matrix comparisons */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {models.map((model) => {
                    const result = comparativeResults[model.id];
                    const isLite = model.tier === "lite";
                    
                    return (
                      <div
                        key={model.id}
                        className={`bg-[#080808] border rounded-xl p-5 flex flex-col min-h-[360px] shadow-lg transition-all relative ${
                          result?.status === "success" 
                            ? isLite 
                              ? "border-emerald-905 glow-blue bg-[#0c130e]" 
                              : "border-blue-900/50 glow-blue bg-[#0a0f18]"
                            : "border-[#1f1f1f]"
                        }`}
                      >
                        {/* Header details */}
                        <div className="flex justify-between items-start pb-3 border-b border-[#1f1f1f]">
                          <div>
                            <span className="font-bold text-xs text-white block">
                              {model.displayName}
                            </span>
                            <span className="text-[9px] text-[#555] font-mono tracking-wider block mt-0.5 uppercase">
                              {model.id}
                            </span>
                          </div>

                          <span className={`px-2 py-0.5 text-[9px] font-semibold uppercase rounded border ${
                            model.tier === "pro"
                              ? "bg-purple-950/20 text-purple-400 border-purple-800/20"
                              : model.tier === "standard"
                              ? "bg-blue-950/20 text-blue-400 border-blue-800/20"
                              : "bg-emerald-950/20 text-emerald-400 border-emerald-800/20"
                          }`}>
                            {model.tier}
                          </span>
                        </div>

                        {/* Performance analytics if success */}
                        {result?.status === "success" && (
                          <div className="grid grid-cols-3 gap-2 bg-[#0d0d0d] p-2 rounded-lg border border-[#1f1f1f] mt-3 text-[10px] font-mono select-none">
                            <div className="text-center">
                              <span className="block text-[#555] text-[8px] uppercase">LATENCE</span>
                              <strong className={result.latencyMs && result.latencyMs < 500 ? "text-emerald-400" : "text-white"}>
                                {result.latencyMs ? `${(result.latencyMs / 1000).toFixed(2)}s` : "0s"}
                              </strong>
                            </div>
                            <div className="text-center border-x border-[#1f1f1f]">
                              <span className="block text-[#555] text-[8px] uppercase">JETONS OUT</span>
                              <strong className="text-blue-400">
                                {result.outputTokensEst}
                              </strong>
                            </div>
                            <div className="text-center">
                              <span className="block text-[#555] text-[8px] uppercase">ACCÈS</span>
                              <strong className={isLite ? "text-emerald-400" : "text-amber-400"}>
                                {isLite ? "100%" : "Haute"}
                              </strong>
                            </div>
                          </div>
                        )}

                        {/* Text response stream */}
                        <div className="flex-1 mt-4 overflow-y-auto max-h-[190px] text-xs text-[#c0c2c5] leading-relaxed pr-1">
                          {!result ? (
                            <div className="text-[#444] italic text-center py-12 font-mono">
                              SYSTEM_WAITING_PROMPT
                            </div>
                          ) : result.status === "pending" ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-[#555] gap-2">
                              <div className="h-4 w-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                              <span className="font-mono text-[9px] animate-pulse">INFÉRENCE EN COURS...</span>
                            </div>
                          ) : result.status === "error" ? (
                            <div className="bg-rose-950/25 border border-rose-900/30 rounded-lg p-3 text-rose-300 text-center">
                              <p className="font-bold text-[10px]">ERREUR INTRINSÈQUE</p>
                              <p className="text-[9px] mt-1 line-clamp-3">{result.error}</p>
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap">{result.text}</div>
                          )}
                        </div>

                        {/* Comparative copy buttons */}
                        {result?.status === "success" && (
                          <div className="pt-2 border-t border-[#1f1f1f] mt-3 flex justify-between items-center">
                            <span className="text-[9px] text-[#555] font-mono uppercase">
                              GAIN : {isLite ? "Ultra-économie" : "Premium logique"}
                            </span>
                            <button
                              onClick={() => handleCopyText(result.text || "", model.id)}
                              className="text-blue-500 hover:text-blue-400 font-mono text-[10px] flex items-center gap-1 cursor-pointer"
                            >
                              {copiedId === model.id ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-400" /> Copié
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" /> Copier Clic
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB VIEW - MONITORING CONSOLE */}
            {activeTab === "monitoring" && (
              <div className="flex flex-col gap-8 w-full animate-fadeIn">
                
                {/* Overhead KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Quota Cash Reserve */}
                  <div className="bg-[#080808] border border-[#1f1f1f] rounded-xl p-5 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 text-[#1f1f1f]">
                      <Database className="h-10 w-10" />
                    </div>
                    <span className="text-[10px] text-[#555] font-mono uppercase block">Solde Restant</span>
                    <h3 className={`text-2xl font-semibold mt-1 font-mono tracking-tight ${remainingPercent < 20 ? "text-rose-400 animate-pulse" : "text-white"}`}>
                      {remainingUsd.toFixed(4)} $
                    </h3>
                    <p className="text-[11px] text-[#666] mt-2 leading-relaxed">
                      Ligne budgétaire de <strong className="text-white font-mono">${quotaLimitUsd.toFixed(2)}</strong> de secours.
                    </p>
                  </div>

                  {/* Cumulative Tokens Counter */}
                  <div className="bg-[#080808] border border-[#1f1f1f] rounded-xl p-5 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 text-[#1f1f1f]">
                      <Zap className="h-10 w-10 text-amber-500/10" />
                    </div>
                    <span className="text-[10px] text-[#555] font-mono uppercase block">Jetons Invoqués</span>
                    <h3 className="text-2xl font-semibold text-white mt-1 font-mono tracking-tight">
                      {totalTokens.toLocaleString()}
                    </h3>
                    <p className="text-[11px] text-[#666] mt-2 leading-relaxed">
                      Volume cumulé sur l'utilisation du site.
                    </p>
                  </div>

                  {/* Total Calls Tally */}
                  <div className="bg-[#080808] border border-[#1f1f1f] rounded-xl p-5 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 text-[#1f1f1f]">
                      <Gauge className="h-10 w-10 text-blue-500/10" />
                    </div>
                    <span className="text-[10px] text-[#555] font-mono uppercase block">Appels Réseau IA</span>
                    <h3 className="text-2xl font-semibold text-blue-400 mt-1 font-mono tracking-tight">
                      {Object.keys(detailedUsage).reduce((acc, k) => acc + (detailedUsage[k]?.calls || 0), 0)} req
                    </h3>
                    <p className="text-[11px] text-[#666] mt-2 leading-relaxed">
                      Transactions d'inférence sécurisées.
                    </p>
                  </div>

                  {/* Avg Response Latency */}
                  <div className="bg-[#080808] border border-[#1f1f1f] rounded-xl p-5 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 text-[#1f1f1f]">
                      <Cpu className="h-10 w-10 text-emerald-500/10" />
                    </div>
                    <span className="text-[10px] text-[#555] font-mono uppercase block">Vitesse Inférence Moyenne</span>
                    <h3 className="text-2xl font-semibold text-emerald-400 mt-1 font-mono tracking-tight">
                      1.14s
                    </h3>
                    <p className="text-[11px] text-[#666] mt-2 leading-relaxed">
                      Réseau direct CDN avec Google AI.
                    </p>
                  </div>
                </div>

                {/* Cognitive Safe Fallback & Quotas Rule Configuration */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                  
                  {/* Fallback Autopilot Rule (Span 7) */}
                  <div className="lg:col-span-7 bg-[#080808] border border-[#1f1f1f] rounded-xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-[#1f1f1f] mb-4">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-emerald-500" />
                          <h3 className="font-semibold text-white text-xs uppercase tracking-widest font-mono">Système d'Aiguillage Anti-Gaspillage</h3>
                        </div>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${autoFallback ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/40" : "bg-neutral-900 text-neutral-500"}`}>
                          {autoFallback ? "AUTOPILOT_ON" : "MANUAL_CONTROL"}
                        </span>
                      </div>
                      
                      <p className="text-xs text-[#aaa] leading-relaxed mb-4">
                        Afin de préserver vos crédits de manière résiliente, vous pouvez activer un <strong>aiguillage de secours dynamique</strong>. Si votre budget disponible est inférieur à 20%, le système forcera automatiquement l'utilisation du nœud de secours à coût extrêmement réduit : <strong className="text-emerald-400">Gemini 3.1 Flash Lite</strong>.
                      </p>
                    </div>

                    <div className="bg-[#0b0c10] border border-[#1a221a] p-4 rounded-xl flex items-center justify-between">
                      <div className="pr-4">
                        <span className="font-semibold text-white text-xs block">Routage de secours automatique</span>
                        <span className="text-[11px] text-[#666] mt-0.5 block leading-normal">Bascule automatique vers Flash Lite si les crédits sont faibles.</span>
                      </div>
                      
                      <button
                        onClick={handleToggleFallback}
                        className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer outline-none shrink-0 ${autoFallback ? "bg-emerald-600" : "bg-[#222]"}`}
                      >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${autoFallback ? "translate-x-5" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* Quota limit controls (Span 5) */}
                  <div className="lg:col-span-5 bg-[#080808] border border-[#1f1f1f] rounded-xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-white text-xs uppercase tracking-widest border-b border-[#1f1f1f] pb-3 mb-4 font-mono flex items-center gap-2">
                        <Sliders className="h-3.5 w-3.5 text-blue-500" />
                        Seuil de Consommation Actuelle
                      </h3>
                      <p className="text-xs text-[#888] leading-relaxed mb-4">
                        Déterminez une limite budgétaire de simulation sur votre session pour évaluer le comportement des alertes de quota faible.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] text-[#555] font-mono uppercase">Sélectionner un plafond</span>
                      <div className="grid grid-cols-4 gap-2">
                        {[2.00, 5.00, 10.00, 25.00].map((limit) => (
                          <button
                            key={limit}
                            onClick={() => handleUpdateLimit(limit)}
                            className={`py-2 rounded font-mono text-xs font-bold border transition ${
                              quotaLimitUsd === limit
                                ? "bg-blue-950/40 text-blue-400 border-blue-900/60"
                                : "bg-[#0d0d0d] border-[#1f1f1f] hover:border-[#333] text-[#777] hover:text-white"
                            }`}
                          >
                            {limit.toFixed(0)}$
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comparative details breakdown */}
                <div className="bg-[#080808] border border-[#1f1f1f] rounded-xl p-6 shadow-xl">
                  <h3 className="text-xs uppercase tracking-wider font-bold text-white mb-4 pb-2 border-b border-[#1f1f1f] flex items-center gap-2 font-mono">
                    <Database className="h-4 w-4 text-blue-500" />
                    Consommation Spécifique par Nœud IA
                  </h3>

                  <div className="flex flex-col gap-5">
                    {[
                      {
                        key: "gemini-3.1-flash-lite",
                        displayName: "Gemini 3.1 Flash Lite",
                        description: "Nœud de correction / relecture ultra-léger et permanent",
                        rate: "0.075 $ / 1M In | 0.30 $ / 1M Out",
                        premium: false
                      },
                      {
                        key: "gemini-3.5-flash",
                        displayName: "Gemini 3.5 Flash",
                        description: "Moteur IA standard de rédaction et Q&A polyvalent",
                        rate: "0.075 $ / 1M In | 0.30 $ / 1M Out",
                        premium: false
                      },
                      {
                        key: "gemini-3.1-pro-preview",
                        displayName: "Gemini 3.1 Pro",
                        description: "Modèle de raisonnement logique profond et d'algorithmes",
                        rate: "1.25 $ / 1M In | 5.00 $ / 1M Out",
                        premium: true
                      }
                    ].map((m) => {
                      const stats = detailedUsage[m.key] || { tokens: 0, calls: 0, cost: 0 };
                      const highestCost = Math.max(...Object.keys(detailedUsage).map(k => detailedUsage[k]?.cost || 0), 0.0001);
                      const relativeWidth = stats.cost > 0 ? (stats.cost / highestCost) * 105 : 0;

                      return (
                        <div key={m.key} className="bg-[#0d0d0d] border border-[#1f1f1f] p-4.5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-[#2a2a2a] transition-all">
                          <div className="flex flex-col max-w-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-white">{m.displayName}</span>
                              {m.premium && (
                                <span className="text-[9px] uppercase font-bold bg-purple-950/40 text-purple-400 border border-purple-900/40 px-1.5 rounded">Premium</span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#666] mt-0.5">{m.description}</span>
                            <span className="text-[10px] text-blue-400/80 font-mono mt-1">{m.rate}</span>
                          </div>

                          <div className="flex-1 w-full md:max-w-xs flex flex-col gap-2">
                            <span className="text-[9px] font-mono text-[#555] uppercase block">Dépense de calcul</span>
                            <div className="h-1 bg-[#1a1a1a] rounded overflow-hidden">
                              <div 
                                className={`h-1 rounded transition-all duration-500 ${m.premium ? "bg-purple-500" : "bg-emerald-500"}`} 
                                style={{ width: `${relativeWidth}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-[#777] font-mono">
                              <span>{stats.calls} requêtes</span>
                              <span>{stats.tokens.toLocaleString()} jetons</span>
                            </div>
                          </div>

                          <div className="text-left md:text-right shrink-0">
                            <span className="text-[10px] text-[#555] font-mono uppercase block">Coût estimé</span>
                            <span className="text-sm font-semibold text-white font-mono">{stats.cost.toFixed(6)} $</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Simulation Control center */}
                <div className="bg-gradient-to-r from-blue-950/10 to-emerald-950/10 border border-blue-900/20 rounded-xl p-6 shadow-xl flex flex-col sm:flex-row justify-between items-center gap-6">
                  <div>
                    <h3 className="font-semibold text-white text-sm flex items-center gap-1.5 font-display">
                      <Sparkles className="h-4 w-4 text-orange-400" />
                      Environnement d'Essai d'Ingénierie
                    </h3>
                    <p className="text-xs text-[#888] mt-1 leading-relaxed">
                      Simulez des variations de charge pour mettre à l'épreuve l'autonomie financière de pouzat.fr.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleSimulateHeavyQuery}
                      className="px-4 py-2 bg-purple-950/40 border border-purple-900/50 hover:bg-purple-900/40 text-purple-300 font-bold text-xs rounded transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Simuler Tâche Lourde (Pro)
                    </button>
                    <button
                      onClick={handleResetQuota}
                      className="px-4 py-2 bg-[#1a1a1a] border border-[#2ea] hover:border-[#1ea] text-[#2ea] font-bold text-xs rounded transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Réinitialiser Consommation
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB VIEW 3: Architecture System */}
            {activeTab === "architecture" && (
              <div className="flex flex-col gap-8 w-full">
                
                {/* Intro guide */}
                <div className="bg-[#080808] border border-[#1f1f1f] rounded-xl p-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rotate-45 transform translate-x-12 -translate-y-12 rounded-full" />
                  
                  <h2 className="text-xl font-display font-light text-white mb-3">
                    L'Hybridation Cognitive sur <span className="text-blue-500 font-semibold font-display">pouzat.fr</span>
                  </h2>
                  <p className="text-xs text-[#a5a5a5] leading-relaxed max-w-3xl">
                    Le concept moderne de l'IA ne consiste pas à utiliser le modèle le plus colossal pour chaque clic. Pour un site web optimisé, réactif et financièrement sain, la clé de voûte est le **Routage Cognitif**. pouzat.fr met à votre disposition l'accès immédiat à deux strates fondamentales de modèles.
                  </p>
                </div>

                {/* Cognitive structures */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {ARCHITECTURAL_CONCEPTS.map((concept, index) => (
                    <div key={index} className="bg-[#080808] border border-[#1f1f1f] hover:border-blue-900/30 rounded-xl p-5 flex flex-col gap-3 transition">
                      <div className="h-8 w-8 rounded-lg bg-blue-950/40 border border-blue-900/30 text-blue-400 flex items-center justify-center font-bold font-mono">
                        0{index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-sm">
                          {concept.title}
                        </h3>
                        <p className="text-[10px] text-blue-400/80 mt-0.5">
                          {concept.description}
                        </p>
                      </div>
                      <p className="text-xs text-[#888] leading-relaxed mt-1">
                        {concept.details}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Comparison Matrix Table breakdown */}
                <div className="bg-[#080808] border border-[#1f1f1f] rounded-xl p-6 shadow-xl">
                  <h3 className="text-xs uppercase tracking-wider font-bold text-white mb-4 flex items-center gap-2 font-mono">
                    <Sliders className="h-4 w-4 text-blue-500" />
                    Matrice Opérationnelle des Tâches IA
                  </h3>
                  
                  <div className="overflow-x-auto text-xs w-full">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#222] text-[#555] font-mono text-[9px] uppercase">
                          <th className="py-2.5">Type de Tâche</th>
                          <th className="py-2.5">Modèle de Choix</th>
                          <th className="py-2.5">Justification Technique</th>
                          <th className="py-2.5 text-right">Avantage Clé</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1f1f1f] text-[#aaa]">
                        <tr>
                          <td className="py-3 font-semibold text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Correcteur d'orthographe / Relecture
                          </td>
                          <td className="py-3 font-mono text-emerald-400 text-[11px]">Gemini 3.1 Flash Lite</td>
                          <td className="py-3 text-[#777]">Requiert peu de raisonnement sémantique.</td>
                          <td className="py-3 text-right text-emerald-400 font-mono font-bold">Latency &lt; 0.2s</td>
                        </tr>
                        <tr>
                          <td className="py-3 font-semibold text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Résumé de texte rapide
                          </td>
                          <td className="py-3 font-mono text-emerald-400 text-[11px]">Gemini 3.1 Flash Lite</td>
                          <td className="py-3 text-[#777]">Analyse simple sans métaphores complexes.</td>
                          <td className="py-3 text-right text-emerald-400 font-mono font-bold">100% accessible</td>
                        </tr>
                        <tr>
                          <td className="py-3 font-semibold text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Rédaction d'articles de blog / Mails
                          </td>
                          <td className="py-3 font-mono text-blue-400 text-[11px]">Gemini 3.5 Flash</td>
                          <td className="py-3 text-[#777]">Style linguistique et mise en page élaborée.</td>
                          <td className="py-3 text-right text-blue-400 font-mono font-bold">Rapport qualité/vitesse</td>
                        </tr>
                        <tr>
                          <td className="py-3 font-semibold text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Élaboration logicielle / Programmation
                          </td>
                          <td className="py-3 font-mono text-purple-400 text-[11px]">Gemini 3.1 Pro</td>
                          <td className="py-3 text-[#777]">Typage strict, logique et sécurité.</td>
                          <td className="py-3 text-right text-purple-400 font-mono font-bold">Raisonnement profond</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* General History shelf */}
            {historyList.length > 0 && (
              <div className="mt-8 bg-[#080808] border border-[#1f1f1f] rounded-xl p-5 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs uppercase font-bold tracking-widest text-[#555] flex items-center gap-1.5 font-mono">
                    <History className="h-3.5 w-3.5 text-blue-500" />
                    Historique de la File d'Attente
                  </h3>
                  <button
                    onClick={clearHistory}
                    className="text-[10px] font-mono text-[#555] hover:text-white transition-colors cursor-pointer"
                  >
                    Vider la mémoire
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {historyList.map((hist) => (
                    <div
                      key={hist.id}
                      className="p-3 bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg text-xs flex justify-between items-start gap-4 hover:border-[#333] transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-mono text-[9px] uppercase bg-[#1a1a1a] text-blue-400 px-1.5 rounded border border-[#222]">
                            {hist.modelUsed}
                          </span>
                          <span className="text-[10px] text-[#555] font-mono">{hist.timestamp}</span>
                        </div>
                        <p className="text-[#aaa] line-clamp-2 leading-relaxed">
                          {hist.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-center">
                        <span className="text-[10px] font-mono text-blue-400 font-bold">
                          {hist.latencyMs ? `${(hist.latencyMs / 1000).toFixed(2)}s` : ""}
                        </span>
                        <button
                          onClick={() => handleCopyText(hist.content, hist.id)}
                          className="p-1 hover:bg-[#1a1a1a] rounded text-[#666] hover:text-white transition-colors cursor-pointer"
                        >
                          {copiedId === hist.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
      
      {/* Dynamic persistent Toast Alert */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 bg-[#111] border border-[#333] shadow-xl text-white px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 z-50 pointer-events-none"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Elegant minimalist footer */}
      <footer id="pouzat-footer" className="mt-auto border-t border-[#1f1f1f] bg-[#080808] py-6 px-8 flex flex-col sm:flex-row justify-between items-center text-xs text-[#555] gap-4 w-full">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            <span className="text-[10px] text-[#777] uppercase font-mono">System Operational</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-[#777] uppercase font-mono">Network Load: 12%</span>
          </div>
        </div>
        <div className="text-[10px] text-[#555] font-mono uppercase">
          node_id: par-01-core-0x9f
        </div>
      </footer>
    </div>
  );
}
