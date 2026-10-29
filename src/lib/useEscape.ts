"use client";

import { useEffect } from "react";

/** Tutup modal/dialog dengan tombol Escape. */
export function useEscape(onClose: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, active]);
}
