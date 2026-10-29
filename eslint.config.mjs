import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  // Keep the starter on the flat config export that actually runs under the pinned ESLint/Next toolchain.
  ...nextCoreWebVitals,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    rules: {
      // Foto di aplikasi ini berasal dari data URL pengguna (IndexedDB), jadi
      // optimasi next/image tidak relevan dan justru memperlambat render.
      "@next/next/no-img-element": "off",
    },
  },
]);
