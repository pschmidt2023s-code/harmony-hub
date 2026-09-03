import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePlayer } from "@/components/player/player-context";
import { downloadsQueryOptions } from "@/lib/account";
import { createDownloadLink } from "@/lib/account.functions";

/**
 * Käufer-exklusive Dateien zu diesem Release.
 * Die Berechtigung wird ausschließlich serverseitig geprüft (bezahlte eigene
 * Bestellung); der Link ist ein kurzlebiger, signierter Storage-Link.
 */
export function ReleaseDownloads({ productIds }: { productIds: string[] }) {
  const { userId } = usePlayer();
  const { data = [] } = useQuery(downloadsQueryOptions(userId));
  const [busy, setBusy] = useState<string | null>(null);

  const items = data.filter((d) => productIds.includes(d.productId));
  if (!userId || items.length === 0) return null;

  const open = async (key: string) => {
    setBusy(key);
    try {
      const res = await createDownloadLink({ data: { key } });
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Download konnte nicht erstellt werden.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((d) => (
        <button
          key={d.key}
          onClick={() => void open(d.key)}
          disabled={busy === d.key}
          className="glass flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:text-primary"
        >
          {busy === d.key ? (
            <Loader2 className="size-4 shrink-0 animate-spin" />
          ) : (
            <Download className="size-4 shrink-0" />
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{d.label}</span>
            <span className="block truncate text-xs text-muted-foreground">{d.product}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
