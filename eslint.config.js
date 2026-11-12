// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Supabase Edge Functions run on Deno (npm: imports); docs/ is the built demo site.
    ignores: ['dist/*', 'docs/*', 'supabase/functions/*/index.ts'],
  },
  {
    rules: {
      // React Native <Text> renders apostrophes and quotes as-is; escaping is a web-only concern.
      'react/no-unescaped-entities': 'off',
      // TypeScript already checks imports; this rule misreads re-exported enums (e.g. AndroidImportance).
      'import/namespace': 'off',
    },
  },
]);
