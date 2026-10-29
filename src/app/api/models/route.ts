import { NextResponse } from "next/server";
import { providerTypeValues, type ProviderType } from "@/types/chat";
import { listProviderModels } from "@/lib/ai/models";
import { toUserFacingError } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Daftar model yang aktif untuk sebuah API key.
 * Dipakai tombol "Pilih model" di Setelan — tanpa menyimpan apa pun di server.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { type, apiKey, backupKeys, baseUrl } = (body ?? {}) as {
    type?: string;
    apiKey?: string;
    backupKeys?: string[];
    baseUrl?: string | null;
  };

  if (!type || !providerTypeValues.includes(type as ProviderType)) {
    return NextResponse.json({ ok: false, error: "Tipe provider tidak valid." }, { status: 400 });
  }

  const keys = [
    ...new Set(
      [apiKey ?? "", ...(Array.isArray(backupKeys) ? backupKeys : [])]
        .map((k) => (k ?? "").trim())
        .filter(Boolean)
    ),
  ];

  if (!keys.length && type !== "custom") {
    return NextResponse.json({ ok: false, error: "Isi API key dulu." }, { status: 400 });
  }
  if (type === "custom" && !baseUrl?.trim()) {
    return NextResponse.json({ ok: false, error: "Base URL belum diisi." }, { status: 400 });
  }

  try {
    const { models, usedKeyIndex } = await listProviderModels(
      type as ProviderType,
      keys,
      baseUrl ?? null
    );
    return NextResponse.json({
      ok: true,
      models,
      usedKeyIndex,
      usedKeyNumber: usedKeyIndex + 1,
      totalKeys: keys.length || 1,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: toUserFacingError(err, "Gagal memuat daftar model."),
    });
  }
}
