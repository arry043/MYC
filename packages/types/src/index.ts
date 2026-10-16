// Shared types for every MYC client (web, mobile, widget).
//
// `./database` is generated from the Supabase schema; never edit it by hand.
// Regenerate it after every migration with `npm run db:types`.
// Domain types live in `./domain` and are re-exported here.

export * from "./database";
export * from "./domain";
