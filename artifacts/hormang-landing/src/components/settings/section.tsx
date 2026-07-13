import type { ReactNode } from "react";

interface SectionProps {
  title?: string;
  children: ReactNode;
  tone?: "default" | "danger";
}

export function Section({ title, children, tone = "default" }: SectionProps) {
  const danger = tone === "danger";
  return (
    <section>
      {title && (
        <h2
          className={`text-[11px] font-black uppercase tracking-[0.16em] px-1 mb-2 ${
            danger ? "text-red-500 dark:text-red-400" : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {title}
        </h2>
      )}
      <div
        className={`rounded-2xl shadow-sm overflow-hidden divide-y ${
          danger
            ? "bg-red-50/40 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 divide-red-100/60 dark:divide-red-900/30"
            : "bg-white dark:bg-[hsl(var(--surface))] border border-gray-100 dark:border-[hsl(var(--hairline))] divide-gray-50 dark:divide-[hsl(var(--hairline))]"
        }`}
      >
        {children}
      </div>
    </section>
  );
}
