/**
 * PWA Cache Policy & Security Filter
 *
 * Implements strict rules for resource categorization and prevents
 * caching of sensitive user data, authenticated APIs, and Supabase tokens.
 */

export {
  CACHE_VERSION,
  STATIC_CACHE_NAME,
  SHELL_CACHE_NAME,
  PRECACHE_URLS,
  isSensitivePwaRequest as isSensitiveRequest,
  isStaticPwaAsset as isStaticAsset,
  isNavigationPwaRequest as isNavigationRequest,
  isMutationMethod,
  validateManifestData,
} from "@myc/utils";
