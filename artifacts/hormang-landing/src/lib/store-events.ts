/**
 * store-events.ts
 * Lightweight global event bus for localStorage store mutations.
 * Any store write calls emitStoreChange(); components that need to
 * re-render subscribe via useStoreRefresh().
 */

const STORE_CHANGE_EVENT = "hormang:store-change";

export function emitStoreChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STORE_CHANGE_EVENT));
}

export function onStoreChange(fn: () => void): () => void {
  window.addEventListener(STORE_CHANGE_EVENT, fn);
  return () => window.removeEventListener(STORE_CHANGE_EVENT, fn);
}
