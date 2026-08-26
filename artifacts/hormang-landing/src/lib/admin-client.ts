/**
 * Shared HTTP client for admin write endpoints. There's no per-admin account
 * system (both admin entry points — the main /admin panel and the standalone
 * /admin/questions page — are single shared hardcoded passwords, checked
 * entirely client-side) so this doesn't attempt real per-admin auth either:
 * once either local password gate passes, it stashes the same fixed backend
 * key so writes are authenticated against the server's ADMIN_API_KEY.
 */
const RAW_API_BASE = import.meta.env.VITE_API_URL as string | undefined;
const API_BASE = (RAW_API_BASE ?? "/api").replace(/\/$/, "");

const ADMIN_API_KEY_STORAGE_KEY = "hormang_admin_api_key";
/** Must match ADMIN_API_KEY on the server. */
const ADMIN_API_KEY = "ourhormang123";

export function markAdminAuthenticated(): void {
  sessionStorage.setItem(ADMIN_API_KEY_STORAGE_KEY, ADMIN_API_KEY);
}

export class AdminApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

interface AdminFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function adminFetch<T>(path: string, options: AdminFetchOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const key = sessionStorage.getItem(ADMIN_API_KEY_STORAGE_KEY) ?? "";

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": key,
      ...(headers as Record<string, string> | undefined),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data ? String((data as { error: unknown }).error) : null) ||
      res.statusText ||
      "Xatolik yuz berdi";
    throw new AdminApiError(message, res.status);
  }

  return data as T;
}

/** Batch-translates Uzbek strings to one target language (server-side, no key needed client-side). */
export async function translateTexts(texts: string[], target: "ru" | "en"): Promise<string[]> {
  const { translations } = await adminFetch<{ translations: string[] }>("/admin/translate", {
    method: "POST",
    body: { texts, target },
  });
  return translations;
}
