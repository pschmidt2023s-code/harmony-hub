import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({
  eyebrow,
  title,
  action,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("section-pad", className)}>
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mb-10 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
          <div className="min-w-0 animate-fade-up">
            {eyebrow && (
              <p className="mb-3 text-xs uppercase tracking-[0.4em] text-primary">{eyebrow}</p>
            )}
            <h2 className="text-3xl font-semibold sm:text-4xl md:text-5xl">{title}</h2>
          </div>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}