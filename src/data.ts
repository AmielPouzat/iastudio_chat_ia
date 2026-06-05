import { PromptTemplate } from "./types";

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "gen-blog",
    category: "rédaction",
    title: "Générateur d'Articles & Billets",
    description: "Élaborer une structure d'article complète avec titres captivants et style professionnel.",
    promptText: "Rédige une structure détaillée d'un article de blog portant sur : 'La complémentarité des petits modèles d'IA ultra-rapides et des grands modèles cognitifs'. Inclus une introduction percutante, trois grandes sections structurées avec sous-titres, et une conclusion engageante.",
    recommendedModelId: "gemini-3.5-flash",
    systemInstruction: "Vous êtes un rédacteur professionnel et rédigez un contenu structuré, agréable à lire et SEO-friendly en français."
  },
  {
    id: "refactor-code",
    category: "développement",
    title: "Refactorisation & Optimisation",
    description: "Améliorer les performances, la lisibilité et la robustesse de votre code.",
    promptText: "Optimise cette fonction JavaScript/TypeScript suivante :\n\n```typescript\nfunction filterAndMapUsers(users) {\n  let result = [];\n  for (let i = 0; i < users.length; i++) {\n    if (users[i].age > 18) {\n      if (users[i].active) {\n        result.push({\n          fullName: users[i].firstName + ' ' + users[i].lastName,\n          status: 'Adult Active'\n        });\n      }\n    }\n  }\n  return result;\n}\n```\nExplique brièvement les gains d'optimisation.",
    recommendedModelId: "gemini-3.1-pro-preview",
    systemInstruction: "Vous êtes un expert en architecture logicielle spécialisé en TypeScript et Clean Code. Vos réponses sont concises et incluent toujours des blocs de code optimisés."
  },
  {
    id: "swot-analysis",
    category: "analyse",
    title: "Matrice d'Analyse Stratégique",
    description: "Générer une analyse Forces, Faiblesses, Opportunités et Menaces pour un projet.",
    promptText: "Produis une analyse SWOT approfondie pour le projet suivant : 'Un service SaaS français auto-hébergé, utilisant des modèles d'IA locaux pour garantir la souveraineté totale des données clients'. Organise la réponse en 4 catégories claires sous forme de liste avec deux recommandations marquantes.",
    recommendedModelId: "gemini-3.5-flash",
  },
  {
    id: "creative-slogans",
    category: "créatif",
    title: "Idéation de Slogans d'Impact",
    description: "Trouver des formules mémorables adaptées à l'identité de votre marque.",
    promptText: "Génère 6 propositions de slogans inspirants, concis et audacieux pour la plateforme 'pouzat.fr' qui intègre de l'intelligence artificielle fluide, sélective, respectueuse et de haute performance.",
    recommendedModelId: "gemini-3.1-flash-lite",
    systemInstruction: "Vous êtes un concepteur-rédacteur publicitaire de premier ordre. Votre style est audacieux, percutant et mémorable."
  },
  {
    id: "explain-ai",
    category: "analyse",
    title: "Améliorateur de Prompt (Prompt Craft)",
    description: "Transformer une formulation simple en instruction experte et structurée.",
    promptText: "Voici mon prompt de base : 'Rédige un message pour féliciter mon équipe'. Reprends-le et réécris-le pour en faire un 'Prompt Expert' ultra-précis, en utilisant des variables, du contexte, et un ton clair, pour obtenir un meilleur résultat.",
    recommendedModelId: "gemini-3.1-pro-preview",
    systemInstruction: "Vous agissez en tant qu'ingénieur expert en prompt (Prompt Engineer)."
  },
  {
    id: "fast-summarize",
    category: "rédaction",
    title: "Synthèse Flash",
    description: "Résumer un texte long en trois puces clés en une fraction de seconde.",
    promptText: "Synthétise le concept suivant en 3 puces clés de moins de 10 mots chacune :\n\nL'intelligence artificielle sélective consiste à répartir de manière intelligente les requêtes utilisateurs en fonction de leur niveau de complexité. Les requêtes rudimentaires de structuration ou de relecture sont confiées à des modèles de Flash Lite extrêmement légers de l'ordre de quelques millisecondes, tandis que les requêtes analytiques profondes, les opérations de chiffrement ou d'optimisation de code sont acheminées vers les plus grands modèles de raisonnement comme Pro. Cette architecture hybride permet de préserver l'autonomie financière du site tout en garantissant une expérience fluide avec zéro temps d'attente.",
    recommendedModelId: "gemini-3.1-flash-lite",
  }
];

export const ARCHITECTURAL_CONCEPTS = [
  {
    title: "La Complémentarité des Modèles",
    description: "Pourquoi faire le choix de l'hybridation des modèles de langage ?",
    details: "Certaines requêtes d'IA n'ont pas besoin de la puissance analytique colossale d'un supercalculateur. Un traducteur simple, un correcteur orthographique ou un synthétiseur d'idées tourne impeccablement sur des modèles ultra-rapides et légers comme Gemini 3.1 Flash Lite. Cette stratégie assure une vitesse d'exécution instantanée sans altérer les quotas opérationnels. À l'inverse, l'analyse de code complexe ou la génération d'essais haut de gamme s'appuient sur la profondeur cognitive de Gemini 3.1 Pro."
  },
  {
    title: "Accessible à 100% (Modèle Lite)",
    description: "Qu'est-ce que la garantie d'accessibilité permanente ?",
    details: "Le modèle Flash Lite s'exécute avec des tailles d'ancrage réduites. Il nécessite infiniment moins d'infrastructure de calcul intermédiaire, ce qui évite l'engorgement des serveurs et les latences erratiques pendant les heures de pointe. Il s'agit du garde-fou idéal pour maintenir une application toujours réactive, utilisable même en basse connectivité."
  },
  {
    title: "Optimisation de Budget & Éco-Conception",
    description: "L'impact écologique et économique du routage intelligent",
    details: "Chaque jeton (token) traité consomme de l'énergie et de la bande passante. En filtrant les tâches banales avec un modèle léger, pouzat.fr divise par 5 la consommation infrastructurelle tout en conservant toute la puissance pour les utilisateurs ayant besoin de résoudre d'importantes problématiques logiques."
  }
];
