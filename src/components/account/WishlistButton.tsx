import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { usePlayer } from "@/components/player/player-context";
import { accountQueryOptions } from "@/lib/account";
import { toggleWishlist } from "@/lib/account.functions";

/** Merkliste für ein Produkt — nur für angemeldete Fans, nie automatisch. */
export function WishlistButton({ productId, name }: { productId: string; name: string }) {
  const { userId } = usePlayer();
  const qc = useQueryClient();
  const { data: account } = useQuery(accountQueryOptions(userId));
  const on = (account?.wishlist ?? []).includes(productId);

  const mutation = useMutation({
    mutationFn: (next: boolean) => toggleWishlist({ data: { productId, on: next } }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["account"] });
      toast.success(res.on ? `${name} gemerkt.` : `${name} entfernt.`);
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
      className={`flex min-h-11 items-center gap-2 rounded-full border px-6 text-sm transition-colors ${
        on ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      <Star className={`size-4 ${on ? "fill-current" : ""}`} /> {on ? "Gemerkt" : "Merken"}
    </button>
  );
}
