import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";

import { checkSupabaseConnection } from "@myc/utils";

import { getPublicEnv } from "@/lib/env";
import { getSupabase } from "@/lib/supabase";

type Status = { state: "checking" } | { state: "ok" | "error"; detail: string };

/**
 * Development-only Supabase connectivity indicator.
 * Render behind `__DEV__` so it never appears in production builds.
 */
export function SupabaseStatus() {
  const [status, setStatus] = useState<Status>({ state: "checking" });

  useEffect(() => {
    let cancelled = false;

    async function check(): Promise<Status> {
      try {
        // Validates the environment and initializes the shared client.
        getSupabase();
        const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
        const result = await checkSupabaseConnection(supabaseUrl, supabaseAnonKey);
        return result.ok
          ? { state: "ok", detail: `connected (auth ${result.authVersion})` }
          : { state: "error", detail: result.error };
      } catch (error) {
        return {
          state: "error",
          detail: error instanceof Error ? error.message : "Unknown error.",
        };
      }
    }

    void check().then((next) => {
      if (!cancelled) setStatus(next);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const label = status.state === "checking" ? "checking…" : status.detail;
  return (
    <Text style={[styles.text, status.state === "error" && styles.error]}>Supabase: {label}</Text>
  );
}

const styles = StyleSheet.create({
  text: {
    marginTop: 24,
    fontSize: 12,
    color: "#737373",
  },
  error: {
    color: "#b91c1c",
  },
});
