import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

import { importOrderRules } from "@myc/config/eslint/import-order";
import { noPrivilegedEnvRules } from "@myc/config/eslint/no-privileged-env";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { rules: { ...importOrderRules, ...noPrivilegedEnvRules } },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
