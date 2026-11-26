import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testes da lógica pura (src/lib/**). Ficam fora do `next build`: o tsconfig
// exclui `*.test.ts` e este arquivo, porque a VPS não instala o vitest.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
