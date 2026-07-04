import { defineConfig } from "deepsec/config";

export default defineConfig({
  defaultAgent: "pi",
  projects: [
    { id: "wtus-dashboard", root: ".." },
    // <deepsec:projects-insert-above>
  ],
});
