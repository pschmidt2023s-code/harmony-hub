import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/** Teilen über die native Share-API, sonst Link kopieren. */
export function ShareButton({ title, text }: { title: string; text?: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        /* abgebrochen – auf Kopieren zurückfallen */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Zwischenablage nicht verfügbar */
    }
  };

  return (
    <button
      onClick={share}
      className="glass inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm transition-colors hover:text-primary"
    >
      {copied ? <Check className="size-4 text-primary" /> : <Share2 className="size-4" />}
      {copied ? "Link kopiert" : "Teilen"}
    </button>
  );
}
