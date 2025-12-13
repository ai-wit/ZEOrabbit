# Vercel 배포 가이드

## 1) Vercel 프로젝트 생성

- GitHub(또는 GitLab/Bitbucket)에 현재 레포를 push
- Vercel에서 **New Project** → 해당 레포 선택
- Framework Preset은 **Next.js**

## 1-1) CLI로 배포하기 (추천)

사전 준비(최초 1회):

```bash
npm install
npm i -D vercel
```

로그인/프로젝트 연결(최초 1회):

```bash
npx vercel login
npm run vercel:link
```

프리뷰 배포:

```bash
npm run vercel:deploy
```

프로덕션 배포:

```bash
npm run vercel:deploy:prod
```

Vercel 환경변수를 로컬로 내려받기(필요할 때):

```bash
npm run vercel:env:pull
```

## 2) 환경변수 설정 (Vercel Dashboard)

Vercel 프로젝트 → **Settings → Environment Variables**에 아래 값을 추가합니다.

- **DATABASE_URL**: MySQL 연결 문자열
  - **Supabase Postgres를 쓸 경우**: *pooler(IPv4) URI*를 사용하세요 (직접 DB 호스트가 IPv6-only면 Vercel에서 접속 실패할 수 있음)
  - 예: `postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require`
- **CRON_SECRET** (선택): Cron API를 수동 호출할 때 사용할 시크릿
  - 예: `prod_cron_secret_change_me`
- **DB_PUSH_ON_DEPLOY**: 배포 시 `prisma db push` 실행 여부
  - 테이블 생성/스키마 동기화가 필요하면 `1`
- **SEED_ON_DEPLOY**: 배포 시 초기 테스트 데이터 seed 실행 여부
  - 최초 배포/테스트용이면 `1` (이후 원치 않으면 끄세요)

참고:
- 이 레포는 로컬에서 `config/env.local`을 읽지만, **Vercel에서는 Dashboard 환경변수**가 그대로 적용됩니다.

## 3) Prisma / DB 스키마 적용

현재 레포는 `prisma/migrations`가 없어서 Vercel 배포 시 자동으로 DB 스키마를 맞추지 않습니다.
운영 DB 스키마는 배포 전 별도로 적용해야 합니다.

권장 방법(택1):

- **A. Prisma db push 사용 (간단 / MVP용)**:
  - 운영 DB에 접속 가능한 로컬/CI 환경에서:

```bash
npx prisma generate
npx prisma db push
```

- **B. SQL DDL 적용 (관리형 운영)**:
  - `docs/ddl.sql` 기반으로 운영 DB에 스키마를 적용

## 4) Vercel Cron 설정

이 레포는 `vercel.json`로 Cron을 설정할 수 있습니다.

단, **Vercel Hobby 플랜은 하루 1회 실행되는 Cron만 허용**합니다.
현재 레포에서는 배포 호환을 위해 `vercel.json`의 `crons`를 비워둔 상태입니다.

운영 환경에서 Cron API 인증:
- Vercel Cron 호출은 `x-vercel-cron` 헤더가 포함되어 자동 허용됩니다.
- 수동 호출 시에는 `CRON_SECRET`을 설정하고 아래처럼 호출하세요:

```bash
curl "https://<your-domain>/api/cron/expire-participations?secret=<CRON_SECRET>"
curl "https://<your-domain>/api/cron/close-campaigns?secret=<CRON_SECRET>"
```

## 5) DEV Seed 데이터

`/api/dev/seed`, `/api/dev/bootstrap`은 `NODE_ENV=production`에서는 동작하지 않습니다.
운영 배포 후에는 로컬/스테이징 환경에서만 사용하세요.

배포 시 자동 seed(테스트용):
- `vercel-build` 스크립트가 `DB_PUSH_ON_DEPLOY=1`이면 `prisma db push`를,
  `SEED_ON_DEPLOY=1`이면 `npm run db:seed`를 실행합니다.


