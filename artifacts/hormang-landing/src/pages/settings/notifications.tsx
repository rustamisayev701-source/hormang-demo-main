import { useState } from "react";
import { MessageCircle, Bell, Tag, Globe, Moon, Sparkles, Sun, Monitor } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { useTheme } from "@/contexts/theme-context";
import { useSettingsPrefs } from "@/lib/settings-prefs-store";
import { SettingsPageShell } from "@/components/settings/page-shell";
import { Section } from "@/components/settings/section";
import { SettingsRow } from "@/components/settings/settings-row";
import { Toggle } from "@/components/settings/toggle";
import { LanguageSelector } from "@/components/settings/language-selector";
import { LOCALES } from "@/lib/i18n";

export default function NotificationsSettingsPage() {
  const { activeRole } = useAuth();
  const { t, locale } = useI18n();
  const { mode, resolved, setMode } = useTheme();
  const [prefs, setPref] = useSettingsPrefs();
  const [langOpen, setLangOpen] = useState(false);

  const isProvider = activeRole === "provider";
  const langName = LOCALES.find((l) => l.code === locale)?.name ?? "—";

  return (
    <>
      <SettingsPageShell title={t.notifications.title} subtitle={t.notifications.subtitle}>
        <Section title={t.notifications.sectionPush}>
          <SettingsRow
            icon={MessageCircle}
            iconBg="hsl(213, 100%, 96%)"
            iconColor="hsl(221, 78%, 48%)"
            title={t.notifications.rows.messages.title}
            desc={t.notifications.rows.messages.desc}
            right={<Toggle checked={prefs.notifMessages} onChange={(v) => setPref("notifMessages", v)} ariaLabel={t.notifications.rows.messages.title} />}
          />
          {isProvider ? (
            <SettingsRow
              icon={Tag}
              iconBg="hsl(35, 95%, 95%)"
              iconColor="hsl(35, 90%, 50%)"
              title={t.notifications.rows.requestsProvider.title}
              desc={t.notifications.rows.requestsProvider.desc}
              right={<Toggle checked={prefs.notifRequests} onChange={(v) => setPref("notifRequests", v)} ariaLabel={t.notifications.rows.requestsProvider.title} />}
            />
          ) : (
            <SettingsRow
              icon={Tag}
              iconBg="hsl(160, 60%, 95%)"
              iconColor="hsl(160, 60%, 38%)"
              title={t.notifications.rows.offersCustomer.title}
              desc={t.notifications.rows.offersCustomer.desc}
              right={<Toggle checked={prefs.notifOffers} onChange={(v) => setPref("notifOffers", v)} ariaLabel={t.notifications.rows.offersCustomer.title} />}
            />
          )}
          <SettingsRow
            icon={Bell}
            iconBg="hsl(262, 80%, 96%)"
            iconColor="hsl(262, 80%, 54%)"
            title={t.notifications.rows.app.title}
            desc={t.notifications.rows.app.desc}
            right={<Toggle checked={prefs.notifApp} onChange={(v) => setPref("notifApp", v)} ariaLabel={t.notifications.rows.app.title} />}
          />
        </Section>

        <Section title={t.notifications.sectionPrefs}>
          <SettingsRow
            icon={Globe}
            iconBg="hsl(213, 100%, 96%)"
            iconColor="hsl(221, 78%, 48%)"
            title={t.notifications.rows.language.title}
            desc={langName}
            onClick={() => setLangOpen(true)}
          />

          <SettingsRow
            icon={resolved === "dark" ? Moon : Sun}
            iconBg={resolved === "dark" ? "hsl(220, 40%, 18%)" : "hsl(48, 100%, 95%)"}
            iconColor={resolved === "dark" ? "hsl(48, 100%, 70%)" : "hsl(35, 90%, 50%)"}
            title={t.notifications.rows.darkMode.title}
            desc={t.notifications.rows.darkMode.desc}
            right={
              <Toggle
                checked={resolved === "dark"}
                onChange={(v) => setMode(v ? "dark" : "light")}
                ariaLabel={t.notifications.rows.darkMode.title}
              />
            }
          />

          <SettingsRow
            icon={Monitor}
            iconBg="hsl(215, 16%, 92%)"
            iconColor="hsl(222, 47%, 30%)"
            title={t.notifications.rows.systemTheme.title}
            desc={t.notifications.rows.systemTheme.desc}
            right={
              <Toggle
                checked={mode === "system"}
                onChange={(v) => setMode(v ? "system" : resolved)}
                ariaLabel={t.notifications.rows.systemTheme.title}
              />
            }
          />

          <SettingsRow
            icon={Sparkles}
            iconBg="hsl(262, 80%, 96%)"
            iconColor="hsl(262, 80%, 54%)"
            title={t.notifications.rows.reduceMotion.title}
            desc={t.notifications.rows.reduceMotion.desc}
            right={<Toggle checked={prefs.reduceMotion} onChange={(v) => setPref("reduceMotion", v)} ariaLabel={t.notifications.rows.reduceMotion.title} />}
          />
        </Section>
      </SettingsPageShell>

      <LanguageSelector open={langOpen} onClose={() => setLangOpen(false)} />
    </>
  );
}
