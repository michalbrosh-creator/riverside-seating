import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, SUPABASE_ENABLED } from "../lib/supabase";
import { useLocalStorage } from "./useLocalStorage";

// Syncs state with Supabase and broadcasts changes to all connected clients.
// Falls back to localStorage when Supabase env vars are not configured.
export function useSupabaseState(key, initialValue) {
  // Always call useLocalStorage — handles data migration and provides fallback
  const [localVal, setLocalVal] = useLocalStorage(key, initialValue);

  const [remoteVal, setRemoteVal] = useState(initialValue);
  const [ready, setReady] = useState(false);
  const initLocalVal = useRef(localVal); // capture migrated localStorage value for one-time migration

  useEffect(() => {
    if (!SUPABASE_ENABLED) { setReady(true); return; }

    supabase
      .from("app_state")
      .select("value")
      .eq("key", key)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value != null) {
          setRemoteVal(data.value);
        } else {
          // No Supabase data yet — seed from localStorage if there is anything
          const seed = initLocalVal.current;
          const hasSeed = Array.isArray(seed) ? seed.length > 0 : seed !== initialValue;
          if (hasSeed) {
            setRemoteVal(seed);
            supabase.from("app_state")
              .upsert({ key, value: seed, updated_at: new Date().toISOString() }, { onConflict: "key" })
              .then();
          }
        }
        setReady(true);
      })
      .catch(() => {
        // Supabase unreachable — fall back to localStorage data
        const seed = initLocalVal.current;
        const hasSeed = Array.isArray(seed) ? seed.length > 0 : seed !== initialValue;
        if (hasSeed) setRemoteVal(seed);
        setReady(true);
      });

    // Real-time: receive changes from other admins
    const channel = supabase
      .channel("realtime:" + key)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "app_state",
        filter: `key=eq.${key}`,
      }, ({ new: row }) => {
        if (row?.value != null) setRemoteVal(row.value);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const setRemote = useCallback((newValue) => {
    setRemoteVal((prev) => {
      const resolved = typeof newValue === "function" ? newValue(prev) : newValue;
      // Always write to localStorage as backup so data survives Supabase outages
      setLocalVal(resolved);
      supabase
        .from("app_state")
        .upsert({ key, value: resolved, updated_at: new Date().toISOString() }, { onConflict: "key" })
        .then();
      return resolved;
    });
  }, [key, setLocalVal]);

  if (!SUPABASE_ENABLED) return [localVal, setLocalVal, true];
  return [remoteVal, setRemote, ready];
}
