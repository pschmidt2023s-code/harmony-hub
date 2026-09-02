import { useState, type ReactNode } from "react";
import { ImageIcon, X } from "lucide-react";
import { MediaPicker } from "@/components/admin/media/MediaPicker";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <div className="mt-2">{children}</div>
      {hint && <span className="mt-1.5 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-border bg-background/40 px-3 py-2 text-sm outline-none transition-colors focus:border-primary";

export function CounterHint({ value, max, label }: { value: string; max: number; label: string }) {
  const len = value.trim().length;
  const over = len > max;
  return (
    <span className={over ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
      {label}: {len}/{max} Zeichen{over ? " — wird in Suchergebnissen gekürzt" : ""}
    </span>
  );
}

/** Bildfeld mit Auswahl aus der bestehenden Medienbibliothek (Phase 8). */
export function ImageField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-background/40">
          {value ? (
            <img src={value} alt="" loading="lazy" className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full border border-border px-4 py-1.5 text-xs hover:border-primary"
          >
            Aus Medienbibliothek wählen
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" /> Entfernen
            </button>
          )}
        </div>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://…"
        className={`${inputClass} mt-3`}
      />
      {hint && <span className="mt-1.5 block text-xs text-muted-foreground">{hint}</span>}
      {open && (
        <MediaPicker
          kind="image"
          title={label}
          onClose={() => setOpen(false)}
          onSelect={(asset) => {
            onChange(asset.url);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

export function SaveBar({
  dirty,
  saving,
  onSave,
  onReset,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onSave}
        disabled={!dirty || saving}
        className="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
      >
        {saving ? "Speichert…" : "Speichern"}
      </button>
      {dirty && (
        <>
          <button
            type="button"
            onClick={onReset}
            className="rounded-full border border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Änderungen verwerfen
          </button>
          <span className="text-xs text-amber-400">Ungespeicherte Änderungen</span>
        </>
      )}
    </div>
  );
}
