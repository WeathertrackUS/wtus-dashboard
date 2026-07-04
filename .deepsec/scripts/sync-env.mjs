#!/usr/bin/env node
/**
 * Pull API keys from OpenCode auth into .deepsec/.env.local (gitignored).
 * Run after rotating keys: pnpm sync-env
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const opencodeAuth = path.join(
  process.env.USERPROFILE ?? process.env.HOME ?? "",
  ".local/share/opencode/auth.json",
);

if (!fs.existsSync(opencodeAuth)) {
  console.error("No OpenCode auth at", opencodeAuth);
  process.exit(1);
}

const auth = JSON.parse(fs.readFileSync(opencodeAuth, "utf8"));
const envPath = path.join(root, ".env.local");
const existing = fs.existsSync(envPath)
  ? fs.readFileSync(envPath, "utf8").split(/\r?\n/)
  : [];

const keys = {
  OPENCODE_API_KEY: auth.opencode?.key,
  BAI_API_KEY: auth.bai?.key,
  NVIDIA_API_KEY: auth.nvidia?.key,
};

const kept = existing.filter((line) => {
  const key = line.replace(/^#/, "").split("=")[0];
  return !Object.keys(keys).includes(key);
});

const lines = [...kept.filter(Boolean)];
for (const [name, value] of Object.entries(keys)) {
  if (value) lines.push(`${name}=${value}`);
}

fs.writeFileSync(envPath, `${lines.join("\n")}\n`);
console.log("Updated .env.local:", Object.keys(keys).filter((k) => keys[k]).join(", "));
