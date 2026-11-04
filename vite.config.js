import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // A fixed timezone keeps the daylight saving tests repeatable on any machine.
  test: { env: { TZ: "America/New_York" } },
});
