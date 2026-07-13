import { Code2, Github, Layers } from "lucide-react";
import { useI18n } from "@/contexts/i18n-context";
import { SettingsPageShell } from "@/components/settings/page-shell";
import { Section } from "@/components/settings/section";
import { SettingsRow } from "@/components/settings/settings-row";

const VERSION = "1.0.0";
const BUILD = "2026.05.11";

export default function AboutSettingsPage() {
  const { t } = useI18n();

  function comingSoon() {
    alert(t.help.soon);
  }

  return (
    <SettingsPageShell title={t.about.title} subtitle={t.about.subtitle}>
      <div className="bg-white dark:bg-[hsl(var(--surface))] rounded-2xl border border-gray-100 dark:border-[hsl(var(--hairline))] shadow-sm p-6 flex flex-col items-center text-center">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-lg mb-4"
          style={{ background: "linear-gradient(135deg, hsl(262,80%,54%) 0%, hsl(236,76%,60%) 100%)" }}
        >
          H
        </div>
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-[hsl(var(--text-primary))]">Hormang</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {t.about.version} {VERSION} · {t.about.build} {BUILD}
        </p>
        <p className="text-sm text-gray-600 dark:text-[hsl(var(--text-secondary))] mt-4 leading-relaxed">
          {t.about.description}
        </p>
      </div>

      <Section>
        <SettingsRow
          icon={Layers}
          iconBg="hsl(262, 80%, 96%)"
          iconColor="hsl(262, 80%, 54%)"
          title={t.about.licenses}
          onClick={comingSoon}
        />
        <SettingsRow
          icon={Code2}
          iconBg="hsl(213, 100%, 96%)"
          iconColor="hsl(221, 78%, 48%)"
          title={t.about.openSource}
          onClick={comingSoon}
        />
        <SettingsRow
          icon={Github}
          iconBg="hsl(215, 16%, 94%)"
          iconColor="hsl(215, 25%, 25%)"
          title="GitHub"
          desc="hormang/app"
          onClick={comingSoon}
        />
      </Section>

      <p className="text-center text-[11px] text-gray-300 dark:text-gray-600 pb-2">
        {t.about.copyright}
      </p>
    </SettingsPageShell>
  );
}
