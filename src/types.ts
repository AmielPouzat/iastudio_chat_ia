export interface ModelConfig {
  id: string;
  name: string;
  tier: "lite" | "standard" | "pro";
  displayName: string;
  status: "disponible" | "premium" | "non-active";
  speed: string;
  latencyRating: string;
  costRating: string;
  description: string;
  strengths: string[];
  avgLatencyMs: number;
}

export interface PromptTemplate {
  id: string;
  category: "rédaction" | "développement" | "analyse" | "créatif";
  title: string;
  description: string;
  promptText: string;
  systemInstruction?: string;
  recommendedModelId: string;
}

export interface Message {
  id: string;
  role: "user" | "model" | "system";
  content: string;
  timestamp: string;
  modelUsed?: string;
  latencyMs?: number;
  inputTokensEst?: number;
  outputTokensEst?: number;
  isError?: boolean;
}

export interface ModelComparisonResult {
  modelId: string;
  status: "pending" | "success" | "error";
  text?: string;
  latencyMs?: number;
  inputTokensEst?: number;
  outputTokensEst?: number;
  error?: string;
}
