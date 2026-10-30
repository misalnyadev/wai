"use client";

/**
 * ZIP kecil untuk cadangan suara.
 *
 * Isinya hanya file WAV, yang sudah berupa data terkompresi secara alami
 * (PCM 16-bit), jadi metode "store" tanpa kompresi sudah cukup: hasilnya
 * hampir sama besar dengan aslinya dan tidak perlu pustaka tambahan.
 *
 * Yang didukung:
 * - tulis ZIP (metode store)
 * - baca ZIP (metode store; metode deflate ditolak dengan pesan jelas)
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export type ZipInput = { name: string; data: Uint8Array };
export type ZipEntry = { name: string; data: Uint8Array };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Waktu dalam format DOS yang dipakai header ZIP. */
function dosStamp(date: Date): { time: number; day: number } {
  const time =
    (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day =
    ((Math.max(1980, date.getFullYear()) - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();
  return { time, day };
}

function u16(value: number): BlobPart {
  const out = new Uint8Array(2);
  new DataView(out.buffer).setUint16(0, value, true);
  return out;
}

function u32(value: number): BlobPart {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value >>> 0, true);
  return out;
}

/** Susun ZIP dari beberapa file. Tidak ada kompresi, jadi cepat. */
export function writeZip(files: ZipInput[], date = new Date()): Blob {
  const { time, day } = dosStamp(date);
  /** Bendera 0x0800 = nama file memakai UTF-8. */
  const FLAGS = 0x0800;

  const parts: BlobPart[] = [];
  const central: BlobPart[] = [];
  let offset = 0;
  let centralSize = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const size = file.data.length;

    const localHeader = new Blob([
      u32(0x04034b50),
      u16(20),
      u16(FLAGS),
      u16(0),
      u16(time),
      u16(day),
      u32(crc),
      u32(size),
      u32(size),
      u16(name.length),
      u16(0),
      name as BlobPart,
    ]);
    const localSize = 30 + name.length;
    const dataOffset = offset + localSize;

    parts.push(localHeader, file.data as BlobPart);

    const centralHeader = new Blob([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(FLAGS),
        u16(0),
        u16(time),
        u16(day),
        u32(crc),
        u32(size),
        u32(size),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        // Harus menunjuk ke AWAL header lokal, bukan ke awal datanya.
        u32(offset),
        name as BlobPart,
      ]);

    central.push(centralHeader);
    centralSize += centralHeader.size;
    offset = dataOffset + size;
  }

  const end = new Blob([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralSize),
    u32(offset),
    u16(0),
  ]);

  return new Blob([...parts, ...central, end], { type: "application/zip" });
}

/** Baca isi ZIP. Hanya metode store yang didukung. */
export function readZip(buffer: ArrayBuffer): ZipEntry[] {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // End of Central Directory dicari dari belakang (komentar ZIP bisa panjang).
  let eocd = -1;
  const lowest = Math.max(0, bytes.length - 22 - 0xffff);
  for (let i = bytes.length - 22; i >= lowest; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("File ini bukan ZIP yang valid.");

  const count = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  const entries: ZipEntry[] = [];

  for (let i = 0; i < count; i++) {
    if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== 0x02014b50) {
      throw new Error("Daftar isi ZIP rusak.");
    }
    const method = view.getUint16(cursor + 10, true);
    const compressed = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));

    if (method !== 0) {
      throw new Error("ZIP terkompresi belum didukung. Pakai cadangan dari aplikasi ini.");
    }

    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    entries.push({ name, data: bytes.subarray(start, start + compressed) });

    cursor += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}
