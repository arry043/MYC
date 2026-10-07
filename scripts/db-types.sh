#!/usr/bin/env sh
# Regenerates packages/types/src/database.ts from the Supabase database schema.
#
# Usage: sh scripts/db-types.sh [--linked|--local] [--check]
#   --linked  generate from the linked (development) project  [default]
#   --local   generate from the local Supabase stack
#   --check   don't write; exit 1 if the committed file is out of date
set -eu

target="--linked"
check=false
for arg in "$@"; do
  case "$arg" in
    --linked | --local) target="$arg" ;;
    --check) check=true ;;
    *) echo "Unknown argument: $arg" >&2 && exit 2 ;;
  esac
done

out="packages/types/src/database.ts"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

# Generate into a temp file so a failed run never truncates the committed types.
supabase gen types typescript "$target" --schema public > "$tmp"
npx prettier --stdin-filepath "$out" < "$tmp" > "$tmp.fmt" && mv "$tmp.fmt" "$tmp"

if [ "$check" = true ]; then
  if cmp -s "$tmp" "$out"; then
    echo "$out is up to date."
  else
    echo "$out is out of date. Run: npm run db:types" >&2
    exit 1
  fi
else
  cat "$tmp" > "$out"
  echo "Updated $out from the ${target#--} database."
fi
