"use client";

import { useRef, useState } from "react";
import { PlusIcon, SendIcon, XIcon } from "./icons";

export function Composer({
  onSend,
  disabled,
}: {
  onSend: (text: string, imageFile: File | null) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [multiline, setMultiline] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Sesuaikan tinggi textarea dengan isinya, sekaligus deteksi apakah tulisan
   * sudah turun ke baris kedua. Kalau iya, kotak berubah jadi petak (rounded-2xl)
   * supaya teks tidak terpotong lengkungan kapsul.
   */
  function syncSize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    const styles = window.getComputedStyle(el);
    const lineHeight = parseFloat(styles.lineHeight) || 24;
    const padding =
      (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0);
    setMultiline(el.scrollHeight - padding > lineHeight * 1.3);
  }

  function handlePickFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed && !imageFile) return;
    onSend(trimmed, imageFile);
    setText("");
    clearImage();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      setMultiline(false);
    }
  }

  return (
    <div className="composer-bar bg-header px-2.5 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3 sm:py-2.5">
      <div className="mx-auto w-full max-w-3xl">
        {imagePreview && (
          <div className="mb-2 flex items-center gap-2">
            <div className="relative">
              <img
                src={imagePreview}
                alt="preview"
                className="h-16 w-16 rounded-lg object-cover ring-1 ring-line"
              />
              <button
                onClick={clearImage}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-slate-800 p-0.5 text-white shadow"
                aria-label="Batalkan foto"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </div>
            <span className="text-xs text-ink-soft">Foto siap dikirim</span>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePickFile(file);
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
            className="mb-0.5 shrink-0 p-2 text-ink-soft transition active:opacity-50 disabled:opacity-50"
            title="Kirim foto"
            aria-label="Lampirkan foto"
          >
            <PlusIcon className="h-6 w-6" />
          </button>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              syncSize(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            rows={1}
            placeholder="Ketik pesan"
            disabled={disabled}
            autoComplete="off"
            enterKeyHint="send"
            aria-label="Tulis pesan"
            className={`max-h-[120px] min-w-0 w-full flex-1 resize-none border-none bg-surface px-4 py-2.5 text-base text-ink outline-none ring-1 ring-line transition-[border-radius] duration-150 placeholder:text-muted disabled:opacity-60 sm:text-sm ${
              multiline ? "rounded-2xl" : "rounded-full"
            }`}
          />
          <button
            onClick={handleSubmit}
            disabled={disabled || (!text.trim() && !imageFile)}
            className="mb-0.5 shrink-0 rounded-full bg-brand p-2.5 text-brand-ink transition hover:bg-brand-strong disabled:opacity-40"
            title="Kirim"
            aria-label="Kirim pesan"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
