/**
 * pouzat.fr — IA Workspace & Routage Cognitif drop-in integration widget
 * Permet d'intégrer facilement un panneau d'interrogation multi-modèles avec télémétrie.
 */
(function() {
  const DEFAULT_STYLES = `
    .pz-widget {
      font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #080808;
      border: 1px solid #1f1f1f;
      border-radius: 12px;
      color: #e5e5e5;
      padding: 20px;
      max-width: 100%;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      box-sizing: border-box;
    }
    .pz-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1f1f1f;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .pz-title {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 700;
      color: #3b82f6;
      margin: 0;
    }
    .pz-select-label {
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
      font-family: monospace;
      margin-bottom: 6px;
      display: block;
    }
    .pz-select {
      width: 100%;
      background: #0d0d0d;
      border: 1px solid #1f1f1f;
      color: #fff;
      padding: 10px;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
      margin-bottom: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .pz-select:focus {
      border-color: #3b82f6;
    }
    .pz-textarea {
      width: 100%;
      background: #0d0d0d;
      border: 1px solid #1f1f1f;
      color: #fff;
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      min-height: 100px;
      resize: vertical;
      outline: none;
      margin-bottom: 12px;
      box-sizing: border-box;
      transition: all 0.2s;
    }
    .pz-textarea:focus {
      border-color: #3b82f6;
    }
    .pz-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 16px;
    }
    .pz-btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }
    .pz-btn-primary {
      background: #2563eb;
      color: #fff;
    }
    .pz-btn-primary:hover {
      background: #1d4ed8;
    }
    .pz-btn-secondary {
      background: #1a1a1a;
      border: 1px solid #1f1f1f;
      color: #aaa;
    }
    .pz-btn-secondary:hover {
      background: #222;
      color: #fff;
    }
    .pz-response {
      background: #0d0d0d;
      border: 1px solid #1f1f1f;
      border-radius: 8px;
      padding: 12px;
      font-size: 13px;
      line-height: 1.5;
      max-height: 250px;
      overflow-y: auto;
      white-space: pre-wrap;
      display: none;
      box-sizing: border-box;
    }
    .pz-metrics {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #555;
      font-family: monospace;
      margin-top: 8px;
    }
    .pz-loading {
      display: none;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #3b82f6;
      margin-bottom: 12px;
    }
    .pz-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(59, 130, 246, 0.2);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: pz-spin 0.6s linear infinite;
    }
    @keyframes pz-spin {
      to { transform: rotate(360deg); }
    }
  `;

  // Insert styles
  const styleEl = document.createElement('style');
  styleEl.textContent = DEFAULT_STYLES;
  document.head.appendChild(styleEl);

  window.initPouzatAIWidget = function(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Pouzat AI Integration: Conteneur #${containerId} introuvable.`);
      return;
    }

    const host = options.serverUrl || window.location.origin;
    let availableModels = [
      { id: "gemini-3.1-flash-lite", displayName: "Gemini 3.1 Flash Lite" },
      { id: "gemini-3.5-flash", displayName: "Gemini 3.5 Flash" },
      { id: "gemini-3.1-pro-preview", displayName: "Gemini 3.1 Pro" }
    ];

    // Build DOM
    container.innerHTML = `
      <div class="pz-widget">
        <div class="pz-header">
          <h4 class="pz-title">pouzat.fr — Workspace IA</h4>
          <span style="font-size: 9px; font-family: monospace; color: #444;">V3.0 INTEGRATED</span>
        </div>
        
        <div>
          <label class="pz-select-label">Sélectionner un modèle cognitif</label>
          <select class="pz-select" id="pz-model-select"></select>
        </div>

        <textarea class="pz-textarea" id="pz-prompt-input" placeholder="Posez une question ou donnez une instruction à l'intelligence artificielle..."></textarea>

        <div class="pz-loading" id="pz-loading-indicator">
          <div class="pz-spinner"></div>
          <span>Analyse du prompt et génération en cours (Routage sécurisé)...</span>
        </div>

        <div class="pz-actions">
          <button class="pz-btn pz-btn-primary" id="pz-submit-btn">Exécuter la requête</button>
          <button class="pz-btn pz-btn-secondary" id="pz-discover-btn">Live Discovery (Découvrir)</button>
        </div>

        <div class="pz-response" id="pz-response-box"></div>
        <div class="pz-metrics" id="pz-metrics-bar" style="display: none;">
          <span id="pz-metric-latency">Latence : --</span>
          <span id="pz-metric-tokens">Jetons : --</span>
        </div>
      </div>
    `;

    const modelSelect = container.querySelector('#pz-model-select');
    const promptInput = container.querySelector('#pz-prompt-input');
    const submitBtn = container.querySelector('#pz-submit-btn');
    const discoverBtn = container.querySelector('#pz-discover-btn');
    const responseBox = container.querySelector('#pz-response-box');
    const loadingIndicator = container.querySelector('#pz-loading-indicator');
    const metricsBar = container.querySelector('#pz-metrics-bar');
    const metricLatency = container.querySelector('#pz-metric-latency');
    const metricTokens = container.querySelector('#pz-metric-tokens');

    // Populate standard models
    function renderModelOptions() {
      modelSelect.innerHTML = availableModels.map(m => 
        `<option value="${m.id}">${m.displayName || m.name || m.id}</option>`
      ).join('');
    }
    renderModelOptions();

    // Load actual models from server if possible
    async function loadModelsFromServer() {
      try {
        const r = await fetch(`${host}/api/models`);
        const d = await r.json();
        if (d.models && d.models.length > 0) {
          availableModels = d.models;
          renderModelOptions();
        }
      } catch (e) {
        console.warn("Pouzat AI Widget: Impossible de charger la liste initiale depuis /api/models, repli local.", e);
      }
    }
    loadModelsFromServer();

    // Query Submission
    submitBtn.addEventListener('click', async () => {
      const prompt = promptInput.value.trim();
      if (!prompt) {
        alert("Veuillez saisir un prompt !");
        return;
      }

      submitBtn.disabled = true;
      loadingIndicator.style.display = 'flex';
      responseBox.style.display = 'none';
      metricsBar.style.display = 'none';

      try {
        const response = await fetch(`${host}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: prompt,
            modelId: modelSelect.value,
            temperature: options.temperature || 0.7
          })
        });

        const data = await response.json();
        if (data.success || data.text) {
          responseBox.textContent = data.text || data.error;
          responseBox.style.display = 'block';
          
          if (data.latencyMs) {
            metricLatency.textContent = `Latence : ${(data.latencyMs / 1000).toFixed(2)}s`;
            metricTokens.textContent = `Calcul Jetons : In [${data.inputTokensEst || 0}] | Out [${data.outputTokensEst || 0}]`;
            metricsBar.style.display = 'flex';
          }
        } else {
          responseBox.textContent = "Erreur : " + (data.error || "Réponse invalide.");
          responseBox.style.display = 'block';
        }
      } catch (err) {
        responseBox.textContent = "Erreur réseau : Impossible de contacter votre proxy de routage.";
        responseBox.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        loadingIndicator.style.display = 'none';
      }
    });

    // Web Search Dynamic Discovery function in widget!
    discoverBtn.addEventListener('click', async () => {
      discoverBtn.disabled = true;
      discoverBtn.textContent = 'Découverte sémantique...';
      
      try {
        const r = await fetch(`${host}/api/discover-models`);
        const d = await r.json();
        if (d.success && d.models && d.models.length > 0) {
          // Merge models
          d.models.forEach(model => {
            if (!availableModels.some(m => m.id === model.id)) {
              availableModels.push(model);
            }
          });
          renderModelOptions();
          modelSelect.value = d.models[0].id; // auto select the first newly discovered
          alert(`Mise à jour réussie : ${d.models.length} modèles actifs découverts et ajoutés à la sélection locale !`);
        } else {
          alert("Recherche terminée : La flotte actuelle est déjà parfaitement synchronisée avec Google.");
        }
      } catch (e) {
        alert("Une erreur est survenue lors de la tentative de découverte en ligne.");
      } finally {
        discoverBtn.disabled = false;
        discoverBtn.textContent = 'Live Discovery (Découvrir)';
      }
    });
  };
})();
