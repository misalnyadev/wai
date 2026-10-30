import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Suara HD lewat Gemini TTS.
 *
 * Sama seperti /api/chat: API key dikirim dari browser dan tidak disimpan di
 * server. Balasan berupa WAV (PCM 16-bit yang dibungkus header), supaya bisa
 * disimpan di IndexedDB dan diputar ulang tanpa memanggil API lagi.
 */

/** Model TTS yang diterima — dibatasi supaya endpoint ini tidak jadi proxy bebas. */
const MODELS = new Set([
  "gemini-3.8-flash-tts",
  "gemini-3.8-flash-lite-tts",
  "gemini-3.1-flash-tts-preview",
  "gemini-2.5-pro-preview-tts",
  "gemini-2.5-flash-preview-tts",
]);

const DEFAULT_MODEL = "gemini-3.8-flash-tts";

/**
 * Generasi 3.8 membedakan dua hal: arahan gaya yang berlangsung sepanjang
 * kalimat masuk ke `speech_metadata.style`, sedangkan teks dibaca apa adanya.
 * Model lama tidak punya field itu, jadi gayanya ditempel di depan teks.
 */
const MODERN_MODELS = new Set(["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts"]);

/** Satu permintaan maksimal ~1.200 karakter; di klien teks sudah dipecah. */
const MAX_TEXT = 1200;

/** Bungkus PCM 16-bit mono menjadi berkas WAV yang bisa diputar <audio>. */
function pcmToWav(pcm: Uint8Array, sampleRate: number): Uint8Array {
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = new Uint8Array(44);
  const view = new DataView(header.buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) header[offset + i] = text.charCodeAt(i);
  };

  ascii(0, "RIFF");
  view.setUint32(4, 36 + pcm.byteLength, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  ascii(36, "data");
  view.setUint32(40, pcm.byteLength, true);

  const out = new Uint8Array(header.byteLength + pcm.byteLength);
  out.set(header, 0);
  out.set(pcm, header.byteLength);
  return out;
}

/** Ambil sample rate dari mimeType, mis. "audio/L16;codec=pcm;rate=24000". */
function sampleRateFrom(mimeType: string | undefined): number {
  const match = mimeType?.match(/rate=(\d+)/i);
  return match ? Number(match[1]) : 24000;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });

  const { apiKey, text, voice, style, model } = body as {
    apiKey?: string;
    text?: string;
    voice?: string;
    style?: string;
    model?: string;
  };

  if (!apiKey?.trim()) {
    return NextResponse.json({ error: "API key Gemini belum diisi." }, { status: 400 });
  }
  if (!text?.trim()) {
    return NextResponse.json({ error: "Teks kosong." }, { status: 400 });
  }
  if (text.length > MAX_TEXT) {
    return NextResponse.json({ error: "Teks terlalu panjang." }, { status: 400 });
  }

  const useModel = model && MODELS.has(model) ? model : DEFAULT_MODEL;
  const voiceName = (voice ?? "Kore").trim() || "Kore";
  const styleText = style?.trim() ?? "";
  const modern = MODERN_MODELS.has(useModel);

  const speechPart = modern
    ? {
        text: text.trim(),
        ...(styleText ? { speech_metadata: { style: styleText } } : {}),
      }
    : { text: styleText ? `${styleText}: ${text.trim()}` : text.trim() };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Key lewat header, bukan query string, supaya tidak tercatat di log.
        "x-goog-api-key": apiKey.trim(),
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [speechPart] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: modern
              ? { voice: voiceName }
              : { prebuiltVoiceConfig: { voiceName } },
          },
        },
      }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    return NextResponse.json({ error: "Koneksi ke Gemini gagal.", retryable: true }, { status: 504 });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    let message = "Gemini menolak permintaan suara.";
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      message = "API key Gemini tidak valid atau belum punya akses TTS.";
    } else if (res.status === 429) {
      message = "Kuota Gemini TTS habis. Coba lagi nanti.";
    } else if (res.status === 404) {
      message = "Model suara ini tidak tersedia di key kamu.";
    } else if (res.status >= 500) {
      message = "Server Gemini sedang bermasalah.";
    }
    return NextResponse.json(
      { error: message, detail: detail.slice(0, 300), retryable: res.status === 429 || res.status >= 500 },
      { status: res.status === 429 ? 429 : 502 }
    );
  }

  const data = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[];
  } | null;

  const part = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  const base64 = part?.inlineData?.data;
  if (!base64) {
    return NextResponse.json({ error: "Gemini tidak mengembalikan audio." }, { status: 502 });
  }

  const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const mime = part?.inlineData?.mimeType ?? "";
  // Model 3.8 sudah mengembalikan WAV utuh; model lama masih PCM mentah.
  const alreadyWav =
    /wav/i.test(mime) || (raw[0] === 0x52 && raw[1] === 0x49 && raw[2] === 0x46 && raw[3] === 0x46);
  const wav = alreadyWav ? raw : pcmToWav(raw, sampleRateFrom(mime));

  return new NextResponse(wav as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "audio/wav",
      // Hasilnya disimpan di perangkat, jadi cache HTTP tidak diperlukan.
      "Cache-Control": "no-store",
    },
  });
}
