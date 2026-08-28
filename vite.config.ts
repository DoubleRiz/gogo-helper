/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { powerApps } from "@microsoft/power-apps-vite/plugin"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), powerApps()],
  // Doit correspondre à `localAppUrl` de power.config.json.
  server: {
    port: 3000,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
