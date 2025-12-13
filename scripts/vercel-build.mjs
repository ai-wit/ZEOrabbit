import { spawnSync } from "node:child_process";

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// Notes:
// - Vercel automatically prefers the `vercel-build` script if present.
// - We keep schema sync + seed optional to avoid unintended data writes on every deploy.
// - Enable by setting `DB_PUSH_ON_DEPLOY=1` and/or `SEED_ON_DEPLOY=1` in Vercel env.

run("npx", ["prisma", "generate"]);

if (process.env.DB_PUSH_ON_DEPLOY === "1") {
  // In serverless, migrations are often handled externally. For MVP, we use db push.
  run("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"]);
}

if (process.env.SEED_ON_DEPLOY === "1") {
  run("npx", ["tsx", "src/scripts/seed.ts"]);
}

run("npx", ["next", "build"]);


