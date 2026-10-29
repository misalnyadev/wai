import { NextResponse } from "next/server";
import { providerTypeValues, type ProviderType } from "@/types/chat";
import { generateCharacterReply, isRotatableError, toUserFacingError } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Uji koneksi API key + model sebelum dipakai chat.
 * Bila key utama kena limit, key cadangan ikut dicoba.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { type, apiKey, backupKeys, baseUrl, model } = (body ?? {}) as {
    type?: string;
    apiKey?: string;
    backupKeys?: string[];
    baseUrl?: string | null;
    model?: string;
  };

  if (!type || !providerTypeValues.includes(type as ProviderType)) {
    return NextResponse.json({ ok: false, error: "Tipe provider tidak valid." });
  }
  if (!model?.trim()) {
    return NextResponse.json({ ok: false, error: "Model belum diisi." });
  }

  const keys = [
    ...new Set(
      [apiKey ?? "", ...(Array.isArray(backupKeys) ? backupKeys : [])]
        .map((k) => (k ?? "").trim())
        .filter(Boolean)
    ),
  ];
  const attempts = keys.length ? keys : [""];

  const failures: string[] = [];
  for (let i = 0; i < attempts.length; i++) {
    try {
      const reply = await generateCharacterReply(type as ProviderType, {
        apiKey: attempts[i],
        model: model.trim(),
        baseUrl: baseUrl || null,
        systemPrompt: "Kamu adalah alat uji koneksi. Balas singkat sesuai instruksi.",
        history: [],
        userText: 'Tes koneksi. Balas hanya dengan satu kata: "siap".',
        image: null,
      });
      return NextResponse.json({
        ok: true,
        sample: reply.replace(/\s+/g, " ").slice(0, 60),
        usedKeyIndex: i,
        usedKeyNumber: i + 1,
        totalKeys: attempts.length,
      });
    } catch (err) {
      failures.push(toUserFacingError(err, "Gagal terhubung ke provider."));
      if (!isRotatableError(err)) break;
    }
  }

  return NextResponse.json({
    ok: false,
    error: failures[failures.length - 1] || "Gagal terhubung ke provider.",
    keysTried: failures.length,
  });
}
