import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function stripQuotes(value) {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

function loadEnvLocal() {
  const filePath = path.join(process.cwd(), "config", "env.local");
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf-8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = stripQuotes(line.slice(idx + 1));
    if (!key) continue;
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", env: process.env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// Usage:
//   node scripts/with-envlocal.mjs prisma db push --accept-data-loss
loadEnvLocal();
const [, , cmd, ...args] = process.argv;
if (!cmd) {
  // eslint-disable-next-line no-console
  console.error("Missing command. Example: node scripts/with-envlocal.mjs prisma generate");
  process.exit(1);
}
run("npx", [cmd, ...args]);


