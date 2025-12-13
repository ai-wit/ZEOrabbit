## Local setup (MySQL on localhost:3306)

### 1) Create database

```sql
CREATE DATABASE IF NOT EXISTS zeorabbit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2) Set env var

Set `DATABASE_URL` (see `config/env.local` for the repo's local default):

```text
mysql://root:1234@localhost:3306/zeorabbit
```

Note: In this repo, `.env` / `.env.local` may be blocked by your editor settings.
As an alternative, you can store env vars in:

`config/env.local`

Example:

```text
DATABASE_URL="mysql://root@localhost:3306/zeorabbit"
CRON_SECRET="dev_cron_secret_change_me"
```

### 3) Apply Prisma migrations

Run:

```bash
npm install
npx prisma generate
npx prisma migrate dev
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


