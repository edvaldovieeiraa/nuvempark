import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Só os testes de bibliotecas puras (ex.: `src/lib/contrato`). Páginas e
// componentes não têm teste aqui.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
