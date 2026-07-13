import { useEffect, useState } from "react";

const KEY = "hormang_settings_prefs";

export interface SettingsPrefs {
  notifMessages: boolean;
  notifRequests: boolean;
  notifOffers: boolean;
  notifApp: boolean;
  reduceMotion: boolean;
}

const DEFAULTS: SettingsPrefs = {
  notifMessages: true,
  notifRequests: true,
  notifOffers: true,
  notifApp: true,
  reduceMotion: false,
};

function read(): SettingsPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<SettingsPrefs>) };
  } catch {
    return DEFAULTS;
  }
}

function write(prefs: SettingsPrefs) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* noop */ }
  try { window.dispatchEvent(new CustomEvent("hormang:settings-prefs-change")); } catch { /* noop */ }
}

export function getSettingsPrefs(): SettingsPrefs {
  return read();
}

export function setSettingsPref<K extends keyof SettingsPrefs>(key: K, value: SettingsPrefs[K]) {
  const next = { ...read(), [key]: value };
  write(next);
}

export function useSettingsPrefs(): [SettingsPrefs, <K extends keyof SettingsPrefs>(k: K, v: SettingsPrefs[K]) => void] {
  const [prefs, setPrefs] = useState<SettingsPrefs>(() => read());
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onChange = () => setPrefs(read());
    window.addEventListener("hormang:settings-prefs-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("hormang:settings-prefs-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return [prefs, setSettingsPref];
}
