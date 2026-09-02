import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Copy, Eye, Pencil, Plus, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { AdminError, AdminPageHeader, AdminSkeleton } from "@/components/admin/AdminPageHeader";
import {
  adminReleasesQueryOptions,
  isReleasePublic,
  newReleaseId,
  RELEASE_STATUSES,
  saveRelease,
  uniqueSlug,
  type ReleaseRow,
} from "@/lib/admin/releases";
import { formatDate } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/admin/releases/")({
  component: ReleasesPage,
});

type SortKey = "date-desc" | "date-asc" | "title" | "updated";

function ReleasesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery(adminReleasesQueryOptions);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("alle");
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [confirm, setConfirm] = useState<ReleaseRow | null>(null);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "releases"] });
    void qc.invalidateQueries({ queryKey: ["content"] });
  };

  const mutate = useMutation({
    mutationFn: async (fn: () => Promise<void>) => fn(),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Aktion fehlgeschlagen"),
  });

  const rows = useMemo(() => {
    let list = data ?? [];
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(term) ||
          (r.slug ?? "").toLowerCase().includes(term) ||
          r.type.toLowerCase().includes(term),
      );
    }
    if (status !== "alle") list = list.filter((r) => r.status === status);
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "date-asc") return a.release_date.localeCompare(b.release_date);
      if (sort === "updated") return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
      return b.release_date.localeCompare(a.release_date);
    });
    return sorted;
  }, [data, q, status, sort]);

  const duplicate = (r: ReleaseRow) => async () => {
    const slug = await uniqueSlug(`${r.title} kopie`);
    const id = newReleaseId();
    const { created_at: _c, updated_at: _u, ...rest } = r;
    await saveRelease(
      { ...rest, id, slug, title: `${r.title} (Kopie)`, status: "Entwurf", publish_at: null },
      "insert",
    );
    toast.success("Release dupliziert");
    void navigate({ to: "/admin/releases/$id/edit", params: { id } });
  };

  const setStatusOf = (r: ReleaseRow, next: string) => async () => {
    await saveRelease({ ...r, status: next }, "update");
    toast.success(`Status: ${next}`);
  };

  return (
    <div className="min-w-0">
      <AdminPageHeader
        title="Releases"
        description="Alle Veröffentlichungen verwalten, planen und bearbeiten."
        action={
          <Link
            to="/admin/releases/new"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]"
          >
            <Plus className="size-4" /> Neues Release
          </Link>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="glass flex min-w-0 flex-1 items-center gap-2 rounded-xl px-4 py-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suchen…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="glass rounded-xl px-4 py-2.5 text-sm outline-none"
        >
          <option value="alle">Alle Status</option>
          {RELEASE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="glass rounded-xl px-4 py-2.5 text-sm outline-none"
        >
          <option value="date-desc">Datum (neu → alt)</option>
          <option value="date-asc">Datum (alt → neu)</option>
          <option value="title">Titel A–Z</option>
          <option value="updated">Zuletzt bearbeitet</option>
        </select>
      </div>

      {isLoading && <AdminSkeleton rows={5} />}
      {error && <AdminError message="Releases konnten nicht geladen werden." onRetry={() => void refetch()} />}

      {!isLoading && !error && rows.length === 0 && (
        <div className="glass grid place-items-center rounded-2xl px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {(data ?? []).length === 0
              ? "Noch keine Releases angelegt."
              : "Keine Releases passen zu den Filtern."}
          </p>
          <Link
            to="/admin/releases/new"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" /> Neues Release
          </Link>
        </div>
      )}

      {rows.length > 0 && (
        <div className="grid gap-3">
          {rows.map((r) => {
            const live = isReleasePublic(r);
            return (
              <div key={r.id} className="glass min-w-0 rounded-2xl p-4">
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                  <img
                    src={r.cover_url || "/icons/icon-192.png"}
                    alt=""
                    className="size-16 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold uppercase">{r.title}</p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                          live ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {live ? "Live" : r.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {r.type} · {formatDate(r.release_date)} · /{r.slug ?? r.id}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to="/admin/releases/$id/preview"
                      params={{ id: r.id }}
                      className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors hover:text-primary"
                    >
                      <Eye className="size-3.5" /> Vorschau
                    </Link>
                    <Link
                      to="/admin/releases/$id/edit"
                      params={{ id: r.id }}
                      className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors hover:text-primary"
                    >
                      <Pencil className="size-3.5" /> Bearbeiten
                    </Link>
                    <button
                      onClick={() => mutate.mutate(duplicate(r))}
                      className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors hover:text-primary"
                    >
                      <Copy className="size-3.5" /> Duplizieren
                    </button>
                    {live ? (
                      <button
                        onClick={() => mutate.mutate(setStatusOf(r, "Entwurf"))}
                        className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors hover:text-primary"
                      >
                        Offline nehmen
                      </button>
                    ) : (
                      <button
                        onClick={() => mutate.mutate(setStatusOf(r, "Veröffentlicht"))}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                      >
                        <Upload className="size-3.5" /> Veröffentlichen
                      </button>
                    )}
                    <button
                      onClick={() => setConfirm(r)}
                      className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors hover:text-primary"
                    >
                      <Archive className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-5 backdrop-blur">
          <div className="glass-strong w-full max-w-md rounded-2xl p-6">
            <h2 className="text-lg font-semibold">Release archivieren?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {`„${confirm.title}" wird archiviert und ist danach nicht mehr öffentlich sichtbar. Das Release bleibt erhalten und kann jederzeit wiederhergestellt werden.`}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="glass rounded-full px-5 py-2.5 text-sm"
              >
                Abbrechen
              </button>
              <button
                disabled={mutate.isPending}
                onClick={() =>
                  mutate.mutate(async () => {
                    await saveRelease({ ...confirm, status: "Archiviert" }, "update");
                    toast.success("Release archiviert");
                  })
                }
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                Archivieren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
