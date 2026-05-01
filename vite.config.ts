import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  envPrefix: ["VITE_", "POSTHOG_ANALYTICS_"],
  plugins: [react()],
});
