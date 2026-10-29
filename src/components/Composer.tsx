"use client";

import { useRef, useState } from "react";
import { PaperclipIcon, SendIcon, XIcon } from "./icons";

export function Composer({
  onSend,
  disabled,
}: {
  onSend: (text: string, imageFile: File | null) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  return (
    <div className="border-t border-line bg-header px-2.5 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3 sm:py-2.5">
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
            className="mb-0.5 shrink-0 rounded-full p-2.5 text-ink-soft transition hover:bg-line/60 disabled:opacity-50"
            title="Kirim foto"
            aria-label="Lampirkan foto"
          >
            <PaperclipIcon className="h-5 w-5" />
          </button>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
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
            className="max-h-[120px] min-w-0 w-full flex-1 resize-none rounded-full border-none bg-surface px-4 py-2.5 text-base text-ink outline-none ring-1 ring-line placeholder:text-muted focus:ring-2 focus:ring-emerald-400 disabled:opacity-60 sm:text-sm"
          />
          <button
            onClick={handleSubmit}
            disabled={disabled || (!text.trim() && !imageFile)}
            className="mb-0.5 shrink-0 rounded-full bg-emerald-600 p-2.5 text-white transition hover:bg-emerald-700 disabled:opacity-40 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
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
