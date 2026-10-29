export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type GenerateReplyInput = {
  apiKey: string;
  model: string;
  baseUrl?: string | null;
  systemPrompt: string;
  history: ChatTurn[];
  userText: string;
  image?: { base64: string; mimeType: string } | null;
};

export class AiProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiProviderError";
  }
}

/** Ubah error jaringan/fetch menjadi pesan yang bisa dibaca pengguna. */
export function toUserFacingError(err: unknown, fallback = "Gagal menghubungi penyedia AI. Coba lagi."): string {
  if (err instanceof AiProviderError) return err.message;

  const message = err instanceof Error ? err.message : "";
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|EAI_AGAIN|network|terminated/i.test(message)) {
    return "Tidak bisa menghubungi penyedia AI (masalah jaringan/URL). Periksa Base URL atau koneksi internet.";
  }
  if (/timeout|aborted|UND_ERR/i.test(message)) {
    return "Penyedia AI terlalu lama merespons. Coba model yang lebih ringan atau ulangi.";
  }
  return fallback;
}

/** Batas waktu untuk request ke provider AI (ms). */
export const PROVIDER_TIMEOUT_MS = 55_000;
