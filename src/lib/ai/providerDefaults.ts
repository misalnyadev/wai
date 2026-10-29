import type { ProviderType } from "@/types/chat";

export const PROVIDER_META: Record<
  ProviderType,
  { name: string; defaultModel: string; baseUrl?: string; needsBaseUrl: boolean; keyUrl: string }
> = {
  gemini: {
    name: "Gemini",
    defaultModel: "gemini-2.5-flash",
    needsBaseUrl: false,
    keyUrl: "https://aistudio.google.com/apikey",
  },
  groq: {
    name: "Groq",
    defaultModel: "llama-3.3-70b-versatile",
    baseUrl: "https://api.groq.com/openai/v1",
    needsBaseUrl: false,
    keyUrl: "https://console.groq.com/keys",
  },
  openrouter: {
    name: "OpenRouter",
    defaultModel: "openai/gpt-4o-mini",
    baseUrl: "https://openrouter.ai/api/v1",
    needsBaseUrl: false,
    keyUrl: "https://openrouter.ai/keys",
  },
  custom: {
    name: "Custom",
    defaultModel: "",
    needsBaseUrl: true,
    keyUrl: "",
  },
};

export const PROVIDER_ORDER: ProviderType[] = ["gemini", "groq", "openrouter", "custom"];

/**
 * Model yang biasanya paling nyaman untuk chat (cepat, hemat kuota).
 * Ditampilkan paling atas pada daftar model hasil muat otomatis.
 */
export const RECOMMENDED_MODELS: Partial<Record<ProviderType, string[]>> = {
  gemini: ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"],
  groq: ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "llama-3.1-8b-instant"],
  openrouter: ["openai/gpt-4o-mini", "google/gemini-2.5-flash"],
};
