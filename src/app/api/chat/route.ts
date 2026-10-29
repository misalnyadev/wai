import { NextResponse } from "next/server";
import { providerTypeValues, type ProviderType } from "@/types/chat";
import {
  buildSystemPrompt,
  generateCharacterReply,
  isRotatableError,
  splitIntoBubbles,
  toUserFacingError,
  type ChatTurn,
  type UserContext,
} from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Jangan mencoba terlalu banyak key dalam satu request (batas waktu serverless). */
const MAX_KEY_ATTEMPTS = 4;
const TIME_BUDGET_MS = 48_000;

type KeyAttempt = { index: number; message: string; rotated: boolean };

/**
 * Proxy tanpa-database: menerima profil karakter + konfigurasi provider dari
 * browser, merangkai prompt "method acting" di server, lalu meneruskan ke
 * provider AI. Bila satu API key kena limit/error, key berikutnya dicoba
 * otomatis — semua terjadi di sini, tanpa menyimpan apa pun.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });

  const { character, provider, history, text, image, user } = body as {
    character?: { name?: string; personality?: string };
    provider?: {
      type?: string;
      apiKey?: string;
      keys?: string[];
      backupKeys?: string[];
      baseUrl?: string | null;
      model?: string;
    };
    history?: { role?: string; content?: string }[];
    text?: string;
    image?: { mimeType?: string; data?: string } | null;
    user?: UserContext | null;
  };

  if (!character?.name?.trim()) {
    return NextResponse.json({ error: "Profil karakter tidak lengkap." }, { status: 400 });
  }
  if (!provider?.type || !providerTypeValues.includes(provider.type as ProviderType)) {
    return NextResponse.json(
      { error: "Provider belum diatur. Buka Setelan untuk menambahkan API key." },
      { status: 400 }
    );
  }
  if (!provider.model?.trim()) {
    return NextResponse.json({ error: "Model provider belum diisi." }, { status: 400 });
  }
  if (!text?.trim() && !image) {
    return NextResponse.json({ error: "Pesan tidak boleh kosong." }, { status: 400 });
  }
  if (image?.data && image.data.length > 6_000_000) {
    return NextResponse.json({ error: "Ukuran gambar terlalu besar." }, { status: 413 });
  }

  const safeHistory: ChatTurn[] = (Array.isArray(history) ? history : [])
    .filter((t) => t && typeof t.content === "string" && t.content.trim())
    .slice(-20)
    .map((t): ChatTurn => ({
      role: t.role === "assistant" ? "assistant" : "user",
      content: String(t.content),
    }));

  const systemPrompt = buildSystemPrompt(
    { name: character.name, personality: character.personality ?? "" },
    user ?? null
  );

  // Susun daftar key: utama dulu, lalu cadangan. Buang duplikat & yang kosong.
  const rawKeys = [
    ...(Array.isArray(provider.keys) ? provider.keys : []),
    provider.apiKey ?? "",
    ...(Array.isArray(provider.backupKeys) ? provider.backupKeys : []),
  ];
  const keys = [...new Set(rawKeys.map((k) => (k ?? "").trim()).filter(Boolean))].slice(
    0,
    MAX_KEY_ATTEMPTS
  );
  // Provider custom (Ollama/LM Studio) boleh tanpa key.
  const attempts = keys.length ? keys : provider.type === "custom" ? [""] : [];

  if (!attempts.length) {
    return NextResponse.json(
      { error: "API key belum diisi. Buka Setelan untuk menambahkannya.", retryable: false },
      { status: 400 }
    );
  }

  const failures: KeyAttempt[] = [];
  const startedAt = Date.now();

  for (let i = 0; i < attempts.length; i++) {
    try {
      const rawReply = await generateCharacterReply(provider.type as ProviderType, {
        apiKey: attempts[i],
        model: provider.model.trim(),
        baseUrl: provider.baseUrl || null,
        systemPrompt,
        history: safeHistory,
        userText: text?.trim() || (image ? "(mengirim foto tanpa teks)" : ""),
        image: image?.data && image?.mimeType ? { base64: image.data, mimeType: image.mimeType } : null,
      });

      const cleaned = rawReply.replace(/\*?\[\[NEXT\]\]\*?/g, "[[NEXT]]");
      const bubbles = splitIntoBubbles(cleaned);
      return NextResponse.json({
        bubbles: bubbles.length ? bubbles : [cleaned.trim() || "..."],
        usedKeyIndex: i,
        keysTried: i + 1,
        fallbackUsed: i > 0,
      });
    } catch (err) {
      const rotated = isRotatableError(err);
      failures.push({ index: i, message: toUserFacingError(err), rotated });

      const outOfTime = Date.now() - startedAt > TIME_BUDGET_MS;
      const hasNextKey = i < attempts.length - 1;
      if (!rotated || !hasNextKey || outOfTime) break;
    }
  }

  const last = failures[failures.length - 1];
  const allRotatable = failures.every((f) => f.rotated);
  return NextResponse.json(
    {
      error: last?.message || "Gagal menghubungi penyedia AI. Coba lagi.",
      // retryable = layak dicoba dengan provider lain oleh klien
      retryable: allRotatable,
      keysTried: failures.length,
      keyErrors: failures.map((f) => f.message),
    },
    { status: 502 }
  );
}
