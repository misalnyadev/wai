import { AiProviderError, type GenerateReplyInput } from "./types";

type Options = GenerateReplyInput & {
  baseUrl: string;
  providerLabel: string;
  extraHeaders?: Record<string, string>;
  /** Parameter opsional khusus per provider. */
  extraBody?: Record<string, unknown>;
};

type OpenAIContentPart = Record<string, unknown>;
type OpenAIMessage = { role: string; content: string | OpenAIContentPart[] };

/**
 * Endpoint "chat/completions" bergaya OpenAI: Groq, OpenRouter, dan
 * endpoint custom milik sendiri (Ollama, LM Studio, gateway lain).
 */
export async function generateOpenAICompatibleReply(options: Options): Promise<string> {
  const {
    apiKey,
    model,
    systemPrompt,
    history,
    userText,
    image,
    baseUrl,
    providerLabel,
    extraHeaders,
    extraBody,
  } = options;

  if (!model) {
    throw new AiProviderError(`Model untuk ${providerLabel} belum diatur.`);
  }

  const userContent: OpenAIContentPart[] = [];
  if (userText) userContent.push({ type: "text", text: userText });
  if (image) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
    });
  }
  if (userContent.length === 0) userContent.push({ type: "text", text: "(tidak ada pesan)" });

  // Kalau turn ini hanya teks, kirim sebagai string biasa — beberapa endpoint
  // (Ollama, LM Studio, sebagian gateway) lebih toleran terhadap format itu.
  const hasImage = userContent.some((part) => part.type === "image_url");
  const lastUserContent: string | OpenAIContentPart[] = hasImage
    ? userContent
    : userText || "(tidak ada pesan)";

  const messages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map((turn) => ({ role: turn.role, content: turn.content })),
    { role: "user", content: lastUserContent },
  ];

  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature: 1.0,
      max_tokens: 1024,
      ...extraBody,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const detail = text.slice(0, 400) || res.statusText;
    if (res.status === 401 || res.status === 403) {
      throw new AiProviderError(
        `${providerLabel}: API key ditolak (${res.status}). Periksa key di Setelan. ${detail}`,
        { status: res.status }
      );
    }
    if (res.status === 429) {
      throw new AiProviderError(
        `${providerLabel}: kuota/limit tercapai (429). Tunggu sebentar atau ganti provider/key.`,
        { status: 429 }
      );
    }
    throw new AiProviderError(`${providerLabel} API error (${res.status}): ${detail}`, {
      status: res.status,
    });
  }

  const data = await res.json();
  const textOut = data?.choices?.[0]?.message?.content as unknown;

  // Sebagian model reasoning mengembalikan content berupa array part.
  const normalized =
    typeof textOut === "string"
      ? textOut
      : Array.isArray(textOut)
        ? textOut
            .map((part) =>
              typeof part === "string" ? part : typeof part?.text === "string" ? part.text : ""
            )
            .join("\n")
        : "";

  if (!normalized.trim()) {
    throw new AiProviderError(`${providerLabel} tidak mengembalikan teks balasan.`);
  }

  return normalized.trim();
}
