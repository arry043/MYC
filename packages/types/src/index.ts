// Shared types for every MYC client (web, mobile, widget).
//
// `./database` is generated from the Supabase schema; never edit it by hand.
// Regenerate it after every migration with `npm run db:types`.
// Domain types (user, commitment, completion, analytics, API responses) will
// live in their own modules alongside it and be re-exported here.

export * from "./database";
