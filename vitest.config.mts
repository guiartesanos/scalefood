import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Testes cobrem só lógica pura por enquanto (datas, formatação, ranking do
// radar) — nada que bate em Supabase/Asaas/Google ainda, então sem
// setupFiles nem environment de DOM. O alias espelha o "@/*" do
// tsconfig.json pra quem importar assim num teste futuro.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(dirname, "./src") },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
