## Local setup (PostgreSQL)

### 2) Set env var

Set `DATABASE_URL` (see `config/env.local` for the repo's local default):

```text
postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require
```

Note: In this repo, `.env` / `.env.local` may be blocked by your editor settings.
As an alternative, you can store env vars in:

`config/env.local`

Example:

```text
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require"
CRON_SECRET="dev_cron_secret_change_me"
```

### 3) Apply Prisma schema (tables)

Run:

```bash
npm install
npx prisma generate
npx prisma db push
```

If `.env` loading conflicts with `config/env.local`, you can use:

```bash
npm run db:push:local
```

### 4) Run expiration batch (optional)

This marks `IN_PROGRESS` participations past `expiresAt` as `EXPIRED` and restores `quotaRemaining`.

In development you can call:

`/api/cron/expire-participations`

This closes past-due mission days and campaigns:

`/api/cron/close-campaigns`

In production, set `CRON_SECRET` and call:

`/api/cron/expire-participations?secret=...`

`/api/cron/close-campaigns?secret=...`

### 5) Generate demo data (DEV only)

After the dev server is running, you can generate data in two ways:

- **Full seed (recommended)**:
  - `POST /api/dev/seed`
- **Minimal demo set**:
  - `POST /api/dev/bootstrap`

Or open:

`/dev/bootstrap`

Or call:

`POST /api/dev/bootstrap`


