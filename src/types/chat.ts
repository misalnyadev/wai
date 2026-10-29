export const providerTypeValues = ["gemini", "grok", "openrouter", "custom"] as const;

export type ProviderType = (typeof providerTypeValues)[number];

export type Provider = {
  id: string;
  type: ProviderType;
  label: string;
  apiKey: string;
  baseUrl: string | null;
  model: string;
  isDefault: boolean;
};

export type Character = {
  id: string;
  name: string;
  avatarUrl: string | null;
  shortBio: string;
  personality: string;
  greeting: string;
  providerId: string | null;
  model: string | null;
  preview: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl: string | null;
  createdAt: string;
  pending?: boolean;
};
