import { defineConfig, globalIgnores } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";

import { importOrderRules } from "@myc/config/eslint/import-order";
import { noPrivilegedEnvRules } from "@myc/config/eslint/no-privileged-env";

export default defineConfig([
  ...expoConfig,
  { rules: { ...importOrderRules, ...noPrivilegedEnvRules } },
  globalIgnores([".expo/**", "dist/**", "android/**", "ios/**"]),
]);
