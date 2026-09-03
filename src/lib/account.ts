import { queryOptions } from "@tanstack/react-query";
import { getAccountOverview, getMyDownloads, getMyOrders } from "./account.functions";

/**
 * Query-Definitionen der Fan Library. Alles läuft über auth-geschützte
 * Server-Funktionen — im Browser wird keine fremde User-ID mitgeschickt.
 */

export const accountQueryOptions = (userId: string | null) =>
  queryOptions({
    queryKey: ["account", userId],
    enabled: Boolean(userId),
    staleTime: 30_000,
    queryFn: () => getAccountOverview(),
  });

export const ordersQueryOptions = (userId: string | null, page = 0, limit = 10) =>
  queryOptions({
    queryKey: ["account-orders", userId, page, limit],
    enabled: Boolean(userId),
    staleTime: 30_000,
    queryFn: () => getMyOrders({ data: { limit, offset: page * limit } }),
  });

export const downloadsQueryOptions = (userId: string | null) =>
  queryOptions({
    queryKey: ["account-downloads", userId],
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: () => getMyDownloads(),
  });

/** Relative Zeitangabe („vor 3 Std.") ohne zusätzliche Bibliothek. */
export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `vor ${hrs} Std.`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `vor ${days} ${days === 1 ? "Tag" : "Tagen"}`;
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
}

export const formatMoney = (amount: number, currency = "EUR") =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(amount);
