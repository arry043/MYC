export type SupabaseConnectionResult =
  { ok: true; authVersion: string } | { ok: false; error: string };

/**
 * Development diagnostic: verifies that a Supabase project is reachable and
 * accepts the given public API key, via the Auth health endpoint behind the
 * API gateway (which rejects unknown keys with 401). Needs no database objects.
 *
 * The result never contains the key.
 */
export async function checkSupabaseConnection(
  url: string,
  apiKey: string,
): Promise<SupabaseConnectionResult> {
  try {
    const response = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/health`, {
      headers: { apikey: apiKey },
    });
    if (response.status === 401) {
      return { ok: false, error: "API key was rejected (401)." };
    }
    if (!response.ok) {
      return { ok: false, error: `Unexpected response: HTTP ${response.status}.` };
    }
    const body = (await response.json()) as { version?: unknown };
    return { ok: true, authVersion: typeof body.version === "string" ? body.version : "unknown" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Network request failed." };
  }
}
