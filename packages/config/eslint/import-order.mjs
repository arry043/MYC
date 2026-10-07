/**
 * Shared `import/order` rule for MYC apps.
 *
 * Groups (separated by a blank line): Node built-ins and external packages,
 * then shared workspace packages (`@myc/*`), then app-local aliases (`@/*`),
 * then relative imports. Requires `eslint-plugin-import`, which both
 * `eslint-config-next` and `eslint-config-expo` already register.
 */
export const importOrderRules = {
  "import/order": [
    "error",
    {
      groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
      pathGroups: [
        { pattern: "@myc/**", group: "internal", position: "before" },
        { pattern: "@/**", group: "internal", position: "after" },
      ],
      pathGroupsExcludedImportTypes: ["builtin"],
      "newlines-between": "always",
      alphabetize: { order: "asc", caseInsensitive: true },
    },
  ],
};
