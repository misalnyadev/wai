import { AiProviderError, type GenerateReplyInput } from "./types";

/** Pecah teks penjelasan request Gemini yang panjang jadi pesan ramah. */
function describeGeminiError(status: number, raw: string): string {
  if (status === 400 && /API key not valid/i.test(raw)) {
    return "API key Gemini tidak valid. Ambil key baru di aistudio.google.com/apikey lalu simpan ulang di Pengaturan.";
  }
  if (status === 401 || status === 403) {
    return `Gemini menolak API key (${status}). Periksa key di Pengaturan atau apakah key dibatasi untuk domain lain.`;
  }
  if (status === 404) {
    return `Model Gemini tidak ditemukan. Coba model lain seperti gemini-2.5-flash. (${raw.slice(0, 160)})`;
  }
  if (status === 429) {
    return "Kuota Gemini habis atau terlalu banyak permintaan (429). Tunggu sebentar atau pakai key lain.";
  }
  return `Gemini API error (${status}): ${raw.slice(0, 300)}`;
}

function fallbackModel(model: string) {
  const clean = model.trim();
  return clean.startsWith("models/") ? clean.slice("models/".length) : clean;
}

export async function generateGeminiReply(input: GenerateReplyInput): Promise<string> {
  const { apiKey, systemPrompt, history, userText, image } = input;
  const model = fallbackModel(input.model);

  if (!apiKey) {
    throw new AiProviderError("API key Gemini belum diisi. Buka Setelan untuk menambahkannya.", { status: 401, retryable: true });
  }
  if (!model) {
    throw new AiProviderError("Model Gemini belum diisi (contoh: gemini-2.5-flash).");
  }

  const contents = history.map((turn) => ({
    role: turn.role === "assistant" ? "model" : "user",
    parts: [{ text: turn.content }],
  }));

  const currentParts: Record<string, unknown>[] = [];
  if (userText) currentParts.push({ text: userText });
  if (image) {
    currentParts.push({
      inlineData: {
        mimeType: image.mimeType,
        data: image.base64,
      },
    });
  }
  if (currentParts.length === 0) currentParts.push({ text: "(tidak ada pesan)" });

  contents.push({ role: "user", parts: currentParts as { text: string }[] });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 1.05,
        topP: 0.95,
        maxOutputTokens: 1024,
        // Gemini 2.5 menyalakan "thinking" secara default, yang membuat balasan
        // chat terasa lambat. Matikan agar balasan kilat seperti WhatsApp asli.
        thinkingConfig: { thinkingBudget: 0 },
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
      ],
    }),
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    throw new AiProviderError(describeGeminiError(res.status, raw || res.statusText), { status: res.status });
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const parts = candidate?.content?.parts as { text?: string }[] | undefined;
  const textOut = parts
    ?.filter((p) => !(p as { thought?: boolean }).thought)
    .map((p) => p.text ?? "")
    .join("\n")
    .trim();

  if (!textOut) {
    const finishReason = candidate?.finishReason;
    const blockReason = data?.promptFeedback?.blockReason;
    if (blockReason) {
      throw new AiProviderError(`Pesan diblokir filter keamanan Gemini (${blockReason}). Coba ubah kalimatnya.`);
    }
    throw new AiProviderError(
      finishReason === "MAX_TOKENS"
        ? "Balasan Gemini terpotong sebelum sempat ditulis. Coba kirim pesan lebih singkat."
        : finishReason
          ? `Gemini tidak mengembalikan teks (${finishReason}). Coba lagi.`
          : "Gemini tidak mengembalikan teks."
    );
  }

  return textOut;
}
