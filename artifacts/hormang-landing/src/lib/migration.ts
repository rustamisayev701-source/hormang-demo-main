/**
 * migration.ts
 * Explicit, version-gated localStorage migrations.
 *
 * Called once from App bootstrap. Never deletes live data — only purges
 * keys that are confirmed legacy from earlier schema versions.
 */

const SEED_VERSION_KEY = "hormang_provider_seed_version";
const SEED_VERSION = "v6"; // v6: migration moved out of provider-store import

const TRULY_LEGACY_KEYS = [
  "hormang_provider_requests",  // pre-shared-store cache
  "hormang_provider_services",  // pre per-provider services
  "hormang_provider_offers",    // pre per-provider offers
  "hormang_provider_seen",      // pre per-provider seen ids
  "hormang_provider_chats",     // pre-unified chats
  "hormang_provider_statuses",  // pre per-provider statuses
];

let migrated = false;

/** Run all one-time migrations. Idempotent across calls in a session. */
export function migrateOnce(): void {
  if (migrated) return;
  migrated = true;
  try {
    const version = localStorage.getItem(SEED_VERSION_KEY);
    if (version !== SEED_VERSION) {
      for (const key of TRULY_LEGACY_KEYS) {
        localStorage.removeItem(key);
      }
      localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
      console.log(`[Hormang] 🧹 Eski legacy kalitlar tozalandi (${SEED_VERSION}).`);
    }
  } catch (e) {
    console.warn("[Hormang] Migration error:", e);
  }
}
