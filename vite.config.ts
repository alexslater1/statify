/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // UK time for everyone, so tests cover the clocks changing
    env: { TZ: "Europe/London" },
  },
});
