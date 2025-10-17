import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: false,
    copyPublicDir: false,
    sourcemap: false,
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "HandyFunctions",
      formats: ["es", "cjs"],
      fileName: (format) =>
        format === "es"
          ? "handy-functions.mjs"
          : format === "cjs"
          ? "handy-functions.cjs"
          : `handy-functions.${format}.js`,
    },
    minify: "terser",
    reportCompressedSize: true,
    chunkSizeWarningLimit: 25,
    terserOptions: {
      compress: {
        passes: 3,
        pure_getters: true,
        drop_console: true,
        drop_debugger: true,
        booleans_as_integers: true,
      },
      mangle: {
        safari10: true,
        properties: {
          regex: /^_/,
        },
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      external: [],
      treeshake: "smallest",
      output: {
        exports: "named",
        compact: true,
      },
    },
  },
});
