import { cp, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

async function copyIfPresent(source, target) {
  if (!existsSync(source)) return;
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true, force: true });
}

await copyIfPresent(".next/static", ".next/standalone/.next/static");
await copyIfPresent("public", ".next/standalone/public");
