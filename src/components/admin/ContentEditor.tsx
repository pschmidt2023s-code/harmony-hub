import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ENTITIES, emptyRecord, type EntityDef, type FieldDef } from "./entity-config";

type Row = Record<string, unknown>;

export function ContentEditor({ only }: { only?: EntityDef["key"] } = {}) {
  const [tab, setTab] = useState<EntityDef["key"]>(only ?? "releases");
  const def = ENTITIES.find((e) => e.key === (only ?? tab))!;

  return (
    <div className="glass rounded-2xl p-6">
      <div className={cn("flex flex-wrap gap-2", only && "hidden")}>
        {ENTITIES.map((e) => (
          <button
            key={e.key}
            onClick={() => setTab(e.key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs transition-colors",
              tab === e.key
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {e.label}
          </button>
        ))}
      </div>
      <EntityTable key={def.key} def={def} />
    </div>
  );
}

function EntityTable({ def }: { def: EntityDef }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ row: Row; isNew: boolean } | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-content", def.key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(def.key)
        .select("*")
        .order(def.orderBy.column, { ascending: def.orderBy.ascending });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-content", def.key] });
    void qc.invalidateQueries({ queryKey: ["site-content"] });
  };

  const save = useMutation({
    mutationFn: async (row: Row) => {
      const { error } = await supabase.from(def.key).upsert(row as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Gespeichert");
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(def.key).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Gelöscht");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{def.label} verwalten</p>
        <button
          onClick={() => setEditing({ row: emptyRecord(def), isNew: true })}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-transform hover:scale-105"
        >
          <Plus className="size-3.5" /> Neu
        </button>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Lade…</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {rows.map((r) => (
            <li key={String(r["id"])} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm">{String(r[def.titleField] ?? r["id"])}</p>
                <p className="truncate text-xs text-muted-foreground">{String(r["id"])}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => setEditing({ row: { ...r }, isNew: false })}
                  aria-label="Bearbeiten"
                  className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:text-primary"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`"${String(r[def.titleField])}" wirklich löschen?`)) {
                      remove.mutate(String(r["id"]));
                    }
                  }}
                  aria-label="Löschen"
                  className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
          {rows.length === 0 && <li className="py-4 text-sm text-muted-foreground">Noch keine Einträge.</li>}
        </ul>
      )}

      {editing && (
        <EntityForm
          def={def}
          initial={editing.row}
          isNew={editing.isNew}
          pending={save.isPending}
          onCancel={() => setEditing(null)}
          onSubmit={(row) => save.mutate(row)}
        />
      )}
    </div>
  );
}

function EntityForm({
  def,
  initial,
  isNew,
  pending,
  onCancel,
  onSubmit,
}: {
  def: EntityDef;
  initial: Row;
  isNew: boolean;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (row: Row) => void;
}) {
  const [values, setValues] = useState<Row>(() => {
    const v: Row = {};
    for (const f of def.fields) {
      const raw = initial[f.name];
      v[f.name] = f.kind === "json" ? JSON.stringify(raw ?? f.defaultValue, null, 2) : (raw ?? f.defaultValue);
    }
    return v;
  });
  const [error, setError] = useState<string | null>(null);

  const set = (name: string, value: unknown) => setValues((p) => ({ ...p, [name]: value }));
  const grid = useMemo(() => def.fields, [def]);

  const submit = () => {
    const out: Row = {};
    for (const f of def.fields) {
      const v = values[f.name];
      if (f.kind === "json") {
        try {
          out[f.name] = JSON.parse(String(v || "null"));
        } catch {
          setError(`${f.label}: ungültiges JSON`);
          return;
        }
      } else if (f.kind === "number") {
        out[f.name] = Number(v) || 0;
      } else if (f.kind === "bool") {
        out[f.name] = Boolean(v);
      } else {
        out[f.name] = String(v ?? "").trim();
      }
    }
    if (!String(out["id"] ?? "")) {
      setError("ID ist erforderlich");
      return;
    }
    if (!String(out[def.titleField] ?? "")) {
      setError("Titel ist erforderlich");
      return;
    }
    setError(null);
    onSubmit(out);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-5 backdrop-blur-sm">
      <div className="glass-strong my-10 w-full max-w-2xl rounded-3xl p-6">
        <p className="text-sm font-semibold">
          {isNew ? "Neuer Eintrag" : "Bearbeiten"} · {def.label}
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {grid.map((f) => (
            <div key={f.name} className={cn(f.full && "sm:col-span-2")}>
              <Field f={f} value={values[f.name]} disabled={!isNew && f.name === "id"} onChange={(v) => set(f.name, v)} />
            </div>
          ))}
        </div>
        {error && <p className="mt-4 text-xs text-destructive">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-full border border-border px-5 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Abbrechen
          </button>
          <button
            onClick={submit}
            disabled={pending}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {pending && <Loader2 className="size-3.5 animate-spin" />} Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "mt-1.5 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary";

function mediaKindForField(name: string): "image" | "audio" | "video" | null {
  if (name === "cover_url" || name === "thumb_url") return "image";
  if (name === "audio_url") return "audio";
  if (name === "video_url") return "video";
  return null;
}

function Field({
  f,
  value,
  disabled,
  onChange,
}: {
  f: FieldDef;
  value: unknown;
  disabled?: boolean;
  onChange: (v: unknown) => void;
}) {
  const [pickerKind, setPickerKind] = useState<"image" | "audio" | "video" | null>(null);
  const mediaKind = mediaKindForField(f.name);
  const label = (
    <span className="text-xs uppercase tracking-widest text-muted-foreground">{f.label}</span>
  );

  if (f.kind === "bool") {
    return (
      <label className="mt-6 flex items-center gap-3 text-sm">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        {f.label}
      </label>
    );
  }

  return (
    <label className="block">
      {label}
      {f.kind === "select" ? (
        <select className={inputCls} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
          {f.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : f.kind === "textarea" || f.kind === "json" ? (
        <textarea
          className={cn(inputCls, "min-h-24 font-mono text-xs")}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <>
          <input
            className={inputCls}
            type={f.kind === "number" ? "number" : f.kind === "date" ? "date" : "text"}
            disabled={disabled}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
          {mediaKind && (
            <button
              type="button"
              onClick={() => setPickerKind(mediaKind)}
              className="mt-2 rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:text-primary"
            >
              Aus Mediathek wählen
            </button>
          )}
          {pickerKind && (
            <MediaPicker
              kind={pickerKind}
              title="Datei aus der Mediathek"
              onClose={() => setPickerKind(null)}
              onSelect={(asset) => {
                onChange(asset.url);
                setPickerKind(null);
              }}
            />
          )}
        </>
      )}
    </label>
  );
}