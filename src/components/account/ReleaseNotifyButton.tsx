import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";
import { usePlayer } from "@/components/player/player-context";
import { accountQueryOptions } from "@/lib/account";
import { toggleReleaseNotification } from "@/lib/account.functions";

/**
 * Erinnerung für ein Release. Nur für angemeldete Fans persistent —
 * es wird nichts automatisch aktiviert und keine E-Mail verschickt.
 * Getrennt vom Newsletter.
 */
export function ReleaseNotifyButton({ releaseId }: { releaseId: string }) {
  const { userId } = usePlayer();
  const qc = useQueryClient();
  const { data: account } = useQuery(accountQueryOptions(userId));
  const on = (account?.releaseNotifications ?? []).includes(releaseId);

  const mutation = useMutation({
    mutationFn: (next: boolean) => toggleReleaseNotification({ data: { releaseId, on: next } }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["account"] });
      toast.success(res.on ? "Erinnerung aktiviert." : "Erinnerung entfernt.");
    },
    onError: () => toast.error("Konnte nicht gespeichert werden."),
  });

  if (!userId) return null;

  return (
    <button
      type="button"
      onClick={() => mutation.mutate(!on)}
      disabled={mutation.isPending}
      aria-pressed={on}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm transition-colors ${
        on ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {on ? <BellRing className="size-4" /> : <Bell className="size-4" />}
      {on ? "Erinnerung aktiv" : "Erinnere mich"}
    </button>
  );
}
