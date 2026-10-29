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
  /** HTTP status dari provider, bila ada. */
  status?: number;
  /** true = layak dicoba ulang dengan key/provider lain. */
  retryable?: boolean;

  constructor(message: string, options?: { status?: number; retryable?: boolean }) {
    super(message);
    this.name = "AiProviderError";
    this.status = options?.status;
    this.retryable = options?.retryable;
  }
}

/** Status yang biasanya pulih kalau key diganti (limit, key dicabut, gangguan provider). */
const ROTATABLE_STATUS = new Set([401, 403, 408, 409, 425, 429, 500, 502, 503, 504, 529]);

/** Error ini sebaiknya dicoba lagi dengan API key / provider berikutnya. */
export function isRotatableError(err: unknown): boolean {
  if (err instanceof AiProviderError) {
    if (err.retryable !== undefined) return err.retryable;
    if (err.status !== undefined) return ROTATABLE_STATUS.has(err.status);
  }
  const message = err instanceof Error ? err.message : "";
  return /fetch failed|ENOTFOUND|ECONNREFUSED|EAI_AGAIN|network|terminated|timeout|aborted|UND_ERR/i.test(
    message
  );
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
