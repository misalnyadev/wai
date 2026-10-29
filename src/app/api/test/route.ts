import { NextResponse } from "next/server";
import { providerTypeValues, type ProviderType } from "@/db/schema";
import { AiProviderError, generateCharacterReply } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Uji koneksi API key + model sebelum dipakai chat. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { type, apiKey, baseUrl, model } = (body ?? {}) as {
    type?: string;
    apiKey?: string;
    baseUrl?: string | null;
    model?: string;
  };

  if (!type || !providerTypeValues.includes(type as ProviderType)) {
    return NextResponse.json({ ok: false, error: "Tipe provider tidak valid." });
  }
  if (!model?.trim()) {
    return NextResponse.json({ ok: false, error: "Model belum diisi." });
  }

  try {
    const reply = await generateCharacterReply(type as ProviderType, {
      apiKey: apiKey?.trim() || "",
      model: model.trim(),
      baseUrl: baseUrl || null,
      systemPrompt: "Kamu adalah alat uji koneksi. Balas singkat sesuai instruksi.",
      history: [],
      userText: 'Tes koneksi. Balas hanya dengan satu kata: "siap".',
      image: null,
    });
    return NextResponse.json({ ok: true, sample: reply.slice(0, 60) });
  } catch (err) {
    const message =
      err instanceof AiProviderError ? err.message : "Gagal terhubung ke provider.";
    return NextResponse.json({ ok: false, error: message });
  }
}
