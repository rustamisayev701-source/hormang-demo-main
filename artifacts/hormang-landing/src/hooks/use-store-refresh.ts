/**
 * useStoreRefresh
 * Call this hook inside any component that reads from localStorage stores.
 * It subscribes to the global store-change event and forces the component
 * to re-render whenever any store write happens — giving instant reactivity
 * without a separate fetch/reload cycle.
 *
 * Usage:
 *   useStoreRefresh();          // just trigger re-renders
 *   const v = useStoreRefresh(); // v as dependency in useMemo/useCallback
 */
import { useEffect, useReducer } from "react";
import { onStoreChange } from "@/lib/store-events";

export function useStoreRefresh(): number {
  const [version, bump] = useReducer((v: number) => v + 1, 0);
  useEffect(() => onStoreChange(bump), []);
  return version;
}
