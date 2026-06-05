# 🚀 pouzat.fr — IA Workspace & Routage Cognitif

Ce projet illustre une architecture d'**IA hybride et sélective** conçue pour l'écosystème **pouzat.fr**. Il permet d'arbitrer intelligemment entre des modèles ultra-rapides et économiques (toujours accessibles en basse connectivité) et des modèles de raisonnement avancé pour les tâches complexes.

Ce guide vous explique comment intégrer, monitorer et modifier cette stack IA de manière **totalement indépendante** dans vos futurs projets web.

---

## 🛠️ Architecture d'Intégration Sécurisée

Pour éviter d'exposer votre clé API secrète `GEMINI_API_KEY` dans le navigateur de vos utilisateurs, l'application utilise une **architecture Full-Stack (Client/Serveur)**. Le navigateur communique avec un proxy intermédiaire (votre serveur Express), qui se charge de requêter l'API de Google avec la clé sécurisée.

```
┌────────────────────────┐         ┌─────────────────────────┐         ┌────────────────────────┐
│   Navigateur Client    │ ──────> │ Serveur Express (Proxy) │ ──────> │    Google Gemini API   │
│ (React, Vue, JS, etc.) │ <────── │   Calcul des métriques  │ <────── │  (Inférence du modèle)  │
└────────────────────────┘         └─────────────────────────┘         └────────────────────────┘
```

---

## 💻 Code Source Prêt pour l'Intégration

### 1. Côté Serveur — `server.js` (Node/Express)
Installez la dépendance officielle moderne de Google :
```bash
npm install @google/genai express
```

Exemple de script serveur autonome et robuste :
```javascript
import express from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json());

// Initialisation sécurisée et paresseuse du client IA
let aiClient = null;
function getAI() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY manquante sur le serveur !");
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Route API pour l'inférence avec calcul de télémétrie locale
app.post('/api/generate', async (req, res) => {
  const { prompt, modelId, temperature, systemInstruction } = req.body;
  const selectedModel = modelId || 'gemini-3.5-flash';
  const startTime = Date.now();

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "Tu es un assistant IA sur le site pouzat.fr.",
        temperature: temperature ?? 0.7,
      },
    });

    const endTime = Date.now();
    const latency = endTime - startTime; // Latence en millisecondes
    const generatedText = response.text || "";

    // Estimation simple du nombre de jetons (1 jeton ~ 4 caractères en français)
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(generatedText.length / 4);

    res.json({
      success: true,
      text: generatedText,
      modelUsed: selectedModel,
      latencyMs: latency,
      inputTokensEst: inputTokens,
      outputTokensEst: outputTokens
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3000, () => console.log('Serveur IA démarré sur http://localhost:3000'));
```

### 2. Côté Client — Appel API en JavaScript
```javascript
async function interrogerIA(promptText, model = 'gemini-3.5-flash') {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: promptText,
        modelId: model,
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (data.success) {
      console.log(`Modèle utilisé : ${data.modelUsed}`);
      console.log(`Temps de réponse : ${data.latencyMs / 1000}s`);
      console.log(`Estimation Jetons : In [${data.inputTokensEst}] | Out [${data.outputTokensEst}]`);
      console.log(`Texte généré :`, data.text);
      return data;
    } else {
      console.error("Erreur de l'API :", data.error);
    }
  } catch (err) {
    console.error("Impossible de joindre le serveur :", err);
  }
}
```

### 3. API — Découverte Automatique et Dynamique des derniers modèles disponible (`/api/discover-models`)
Pour répondre au besoin d'avoir toujours des modèles à jour sans action manuelle de développement, vous disposez d'un endpoint intelligent. Cet endpoint interroge Gemini en activant les **outils de recherche de Google (Google Search Grounding)**. Il effectue une recherche en temps réel sur le web, extrait les identifiants techniques des modèles Gemini actuellement actifs et supportés, et les renvoie au format JSON structuré prêt à l'emploi.

**Exemple d'appel à l'API de de découverte dynamique :**
```javascript
async function decouvrirDerniersModeles() {
  try {
    const response = await fetch('/api/discover-models');
    const data = await response.json();
    if (data.success) {
      console.log("Derniers modèles découverts de manière autonome :", data.models);
      // Mettez à jour dynamiquement vos menus de sélection avec cette liste !
      return data.models;
    }
  } catch (err) {
    console.error("Échec de la recherche autonome des modèles :", err);
  }
}
```

### 4. Code d'Intégration Minimal Drop-in Widget (`pz-ai-widget.js`)
Pour intégrer l'intelligence artificielle dans n'importe lequel de vos sites externes (ou d'autres rubriques de `pouzat.fr`), vous pouvez simplement copier et coller cette balise script et initialiser le widget sur n'importe quel conteneur HTML :

```html
<!-- Étape 1 : Créez l'élément cible où le widget doit être injecté -->
<div id="mon-assistant-ia"></div>

<!-- Étape 2 : Chargez le script d'intégration autonome -->
<script src="https://votre-domaine.fr/pz-ai-widget.js"></script>

<!-- Étape 3 : Initialisez le widget connecté à votre serveur Express -->
<script>
  window.initPouzatAIWidget("mon-assistant-ia", {
    serverUrl: "https://votre-serveur-express.fr", // L'URL de votre serveur hôte
    temperature: 0.7
  });
</script>
```

Le script s'occupe de tout :
- Injection autonome d'un design élégant (identitaire sombre et épuré) adapté à `pouzat.fr`.
- Menu déroulant de sélection dynamique des modèles (avec rechargement en direct par recherche sémantique s'appuyant sur le web-grounding).
- Gestion des chargements, de la latence, et de l'affichage des métriques de jetons consommés.

### 5. Concept d'Auto-Mise à Jour Totalement Autonome (Self-Updating Node Engine)
Pour s'assurer que l'application ne devienne jamais obsolète et reste au courant des dernières nouveautés de l'API de Google de manière indépendante, nous avons implémenté une double stratégie d'auto-mise à jour :

#### ⚙️ Comment ça marche ?
1. **Au Boot du Serveur** : Dès qu'Express démarre, une tâche d'arrière-plan asynchrone est lancée sans bloquer le serveur. Elle effectue une recherche en ligne via l'API Gemini et met à jour en mémoire la liste des modèles exploitables.
2. **Boucle d'Écoute (Background Interval)** : Un démon d'arrière-plan interroge l'API à intervalle régulier (toutes les 12 heures) pour capter toute baisse de coût, annonce de nouveau modèle stable, ou mise à disposition de nouvelles versions (par exemple Gemini 3.5 Pro).
3. **Mise à Jour Transparente du Client** : Comme le widget interroge `/api/models` à chaque ouverture pour afficher la liste des options, toute découverte d'un modèle par le serveur est instantanément disponible pour vos utilisateurs sans ré-écriture de code ni redeploiement de l'application !

---

## 📈 Télémétrie, Suivi des Coûts & Quotas

Pour monitorer efficacement l'utilisation et évaluer ce qu'il reste dans votre quota budgétaire, suivez ces règles :

### 📊 Tarification Comparative Réelle des Modèles
| Modèle | Segment d'Usage | Coût par 1M Jetons Entrée | Coût par 1M Jetons Sortie | Disponibilité |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini 3.1 Flash Lite**<br>`gemini-3.1-flash-lite` | **Toujours Accessible (Lite)**<br>Relectures, synthèses ultra-rapides | **0.075 $** | **0.30 $** | **100%** (Rapport d'accès garanti avec très faible latence) |
| **Gemini 3.5 Flash**<br>`gemini-3.5-flash` | **Performant Standard**<br>Rédaction, Q&A polyvalent | **0.075 $** (si <128K) | **0.30 $** (si <128K) | **Très Haute** |
| **Gemini 3.1 Pro**<br>`gemini-3.1-pro-preview` | **Ultra-Premium**<br>Programmation, logique mathématique | **1.25 $** | **5.00 $** | **Standard** |

### 🛠️ Comment implémenter une surveillance stricte de la consommation ?

Pour suivre ce qu'il reste de votre budget ou de votre volume autorisé dans vos applications :

1. **Sauvegarde en Base de Données** :
   À chaque requête réussie sur `/api/generate`, stockez dans une table (ex: SQL ou Firestore) :
   ```json
   {
     "user_id": "amiel_pouzat",
     "timestamp": "2026-06-04T18:30:00Z",
     "model_id": "gemini-3.1-flash-lite",
     "tokens_input": 120,
     "tokens_output": 350,
     "calculated_cost_usd": 0.000114
   }
   ```
2. **Vérification de Limite (Middleware d'Aiguillage)** :
   Avant de router l'appel vers l'API Google, interrogez la base de données pour vérifier si la consommation journalière de l'utilisateur n'excède pas votre seuil (ex: Max 5.00 $ / jour par clé). Si le seuil de performance est proche d'être atteint, **basculez automatiquement toutes les requêtes subséquentes vers le modèle Lite** pour assurer la continuité du service à moindre coût.

---

## 💡 Idées pour Personnaliser `pouzat.fr`

* **Aiguillage Automatique (Auto-Router)** : Créez une fonction intermédiaire qui analyse la longueur et la complexité du prompt de l'utilisateur. Si le prompt contient des mots clés comme `code`, `optimize`, `refactor` ou `algorithm`, utilisez **Gemini 3.1 Pro**. S'il s'agit d'une simple mise en forme ou relecture, forcez **Gemini 3.1 & 3.5 Flash**.
* **Mode Hors-ligne / Fallback Local** : Vous pouvez intégrer une bibliothèque JavaScript locale de type `Transformers.js` au cas où le réseau de l'utilisateur s'interrompt, créant une IA Truly Independent tournant directement sur l'appareil du client.
