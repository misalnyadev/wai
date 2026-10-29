import { NextResponse } from "next/server";
import { providerTypeValues, type ProviderType } from "@/db/schema";
import {
  AiProviderError,
  buildSystemPrompt,
  generateCharacterReply,
  splitIntoBubbles,
  type ChatTurn,
} from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Proxy tanpa-database: menerima profil karakter + konfigurasi provider dari
 * browser, merangkai prompt "method acting" di server, lalu meneruskan ke
 * Gemini / Grok / OpenRouter / custom. Tidak ada data yang disimpan di server.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });

  const { character, provider, history, text, image } = body as {
    character?: { name?: string; personality?: string };
    provider?: { type?: string; apiKey?: string; baseUrl?: string | null; model?: string };
    history?: { role?: string; content?: string }[];
    text?: string;
    image?: { mimeType?: string; data?: string } | null;
  };

  if (!character?.name?.trim()) {
    return NextResponse.json({ error: "Profil karakter tidak lengkap." }, { status: 400 });
  }
  if (!provider?.type || !providerTypeValues.includes(provider.type as ProviderType)) {
    return NextResponse.json(
      { error: "Provider belum diatur. Buka Pengaturan untuk menambahkan API key." },
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

  const systemPrompt = buildSystemPrompt({
    name: character.name,
    personality: character.personality ?? "",
  });

  try {
    const rawReply = await generateCharacterReply(provider.type as ProviderType, {
      apiKey: provider.apiKey?.trim() || "",
      model: provider.model.trim(),
      baseUrl: provider.baseUrl || null,
      systemPrompt,
      history: safeHistory,
      userText: text?.trim() || (image ? "(mengirim foto tanpa teks)" : ""),
      image: image?.data && image?.mimeType ? { base64: image.data, mimeType: image.mimeType } : null,
    });

    const bubbles = splitIntoBubbles(rawReply);
    return NextResponse.json({ bubbles: bubbles.length ? bubbles : [rawReply.trim() || "..."] });
  } catch (err) {
    const message =
      err instanceof AiProviderError ? err.message : "Gagal menghubungi penyedia AI. Coba lagi.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
