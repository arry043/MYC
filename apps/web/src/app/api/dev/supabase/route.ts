import { connection } from "next/server";

import { checkSupabaseConnection } from "@myc/utils";

import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Development-only Supabase connectivity check: `GET /api/dev/supabase`.
 * Responds 404 in production builds.
 */
export async function GET() {
  await connection();

  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }

  try {
    // Validates the environment and initializes the server client.
    await createClient();
    const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
    const result = await checkSupabaseConnection(supabaseUrl, supabaseAnonKey);
    return Response.json(
      { ...result, project: new URL(supabaseUrl).host },
      { status: result.ok ? 200 : 502 },
    );
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error." },
      { status: 500 },
    );
  }
}
