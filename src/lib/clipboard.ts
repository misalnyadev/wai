/**
 * Salin teks ke clipboard.
 *
 * `navigator.clipboard` hanya tersedia di konteks aman (HTTPS / localhost) dan
 * bisa ditolak browser, jadi selalu ada cara cadangan lewat `<textarea>`
 * supaya tombol "Salin" tetap bekerja di PWA yang dibuka lewat http biasa.
 */
export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Ditolak / tidak diizinkan — lanjut ke cara cadangan.
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.left = "0";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
