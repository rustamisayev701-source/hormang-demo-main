import type { ComponentType, ReactNode } from "react";
import { ChevronRight } from "lucide-react";

interface SettingsRowProps {
  icon?: ComponentType<{ className?: string; style?: React.CSSProperties }>;
  iconBg?: string;
  iconColor?: string;
  iconDarkBg?: string;
  title: string;
  desc?: string;
  right?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}

export function SettingsRow({
  icon: Icon,
  iconBg,
  iconColor,
  iconDarkBg,
  title,
  desc,
  right,
  onClick,
  disabled,
  tone = "default",
}: SettingsRowProps) {
  const isDanger = tone === "danger";
  const interactive = !!onClick && !disabled;
  const baseCls = `w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors ${
    interactive
      ? isDanger
        ? "hover:bg-red-50 dark:hover:bg-red-950/30 active:bg-red-100 dark:active:bg-red-950/50"
        : "hover:bg-gray-50 dark:hover:bg-[hsl(var(--surface-2))] active:bg-gray-100 dark:active:bg-[hsl(var(--surface-3))]"
      : ""
  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`;

  const inner = (
    <>
      {Icon && (
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg ?? "hsl(213, 100%, 96%)" }}
          data-icon-bg-dark={iconDarkBg ?? ""}
        >
          <Icon className="w-5 h-5" style={{ color: iconColor ?? "hsl(221, 78%, 52%)" }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p
          className={`font-semibold text-sm ${
            isDanger
              ? "text-red-700 dark:text-red-400"
              : "text-gray-900 dark:text-[hsl(var(--text-primary))]"
          }`}
        >
          {title}
        </p>
        {desc && (
          <p className="text-xs mt-0.5 text-gray-500 dark:text-[hsl(var(--text-tertiary))] leading-snug">
            {desc}
          </p>
        )}
      </div>
      {right ?? (interactive ? (
        <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
      ) : null)}
    </>
  );

  if (interactive) {
    return (
      <button type="button" onClick={onClick} className={baseCls}>
        {inner}
      </button>
    );
  }
  return <div className={baseCls}>{inner}</div>;
}
