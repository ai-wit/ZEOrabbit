# Production 마이그레이션 안전 가이드

## ⚠️ 주의사항
- **절대** `prisma migrate dev`를 production에서 사용하지 마세요!
- 항상 백업을 먼저 수행하세요!
- 마이그레이션은 트래픽이 적은 시간에 수행하세요!

## 방법 1: Prisma Migrate Deploy (권장)

### 1. 백업 수행
```bash
# 데이터베이스 전체 백업
mysqldump -h [HOST] -u [USER] -p [DATABASE] > backup_$(date +%Y%m%d_%H%M%S).sql

# 특정 테이블만 백업
mysqldump -h [HOST] -u [USER] -p [DATABASE] MemberProfile User > backup_members_$(date +%Y%m%d_%H%M%S).sql
```

### 2. 로컬에서 마이그레이션 파일 생성
```bash
# 로컬 환경에서만 실행 (--create-only 플래그 사용)
npx prisma migrate dev --name add_member_age_gender --create-only
```

### 3. 마이그레이션 파일 검토
- `prisma/migrations/[timestamp]_add_member_age_gender/migration.sql` 확인
- NULL 가능한 필드 추가인지 확인 (기존 데이터 안전)

### 4. Git에 커밋
```bash
git add prisma/migrations
git commit -m "Add age and gender fields to MemberProfile"
git push
```

### 5. Production 서버에서 적용
```bash
# Production 서버에 접속 후
git pull

# .env에서 DATABASE_URL이 production DB를 가리키는지 확인
echo $DATABASE_URL

# 마이그레이션 적용 (데이터 유지)
npx prisma migrate deploy

# Prisma Client 재생성
npx prisma generate
```

### 6. 서버 재시작
```bash
# PM2 사용 시
pm2 restart all

# 또는 systemd 사용 시
sudo systemctl restart your-app-name
```

## 방법 2: 수동 SQL 실행 (더 안전)

### 1. 백업
위와 동일

### 2. SQL 직접 실행
```bash
# MySQL CLI 접속
mysql -h [HOST] -u [USER] -p [DATABASE]

# 또는 파일 실행
mysql -h [HOST] -u [USER] -p [DATABASE] < manual-migration-age-gender.sql
```

### 3. Prisma Migration 테이블 동기화
```bash
# _prisma_migrations 테이블에 수동 마이그레이션 기록
npx prisma migrate resolve --applied [migration_name]
```

## 방법 3: 단계별 수동 적용 (가장 안전)

### Step 1: 읽기 전용 모드 활성화 (선택사항)
```sql
-- 마이그레이션 중 쓰기 방지
SET GLOBAL read_only = ON;
```

### Step 2: 컬럼 추가
```sql
-- age 추가
ALTER TABLE `MemberProfile` ADD COLUMN `age` INT NULL;

-- gender 추가  
ALTER TABLE `MemberProfile` ADD COLUMN `gender` VARCHAR(20) NULL;
```

### Step 3: 검증
```sql
-- 테이블 구조 확인
DESCRIBE `MemberProfile`;

-- 데이터 확인
SELECT COUNT(*) FROM `MemberProfile`;

-- 새 컬럼이 NULL인지 확인
SELECT COUNT(*) FROM `MemberProfile` WHERE age IS NOT NULL;
SELECT COUNT(*) FROM `MemberProfile` WHERE gender IS NOT NULL;
```

### Step 4: 읽기 전용 모드 해제
```sql
SET GLOBAL read_only = OFF;
```

### Step 5: Prisma 동기화
```bash
# Prisma Client 재생성
npx prisma generate

# 스키마와 DB 동기화 확인
npx prisma db pull --force  # 현재 DB 구조를 schema.prisma에 반영
```

## 롤백 방법 (문제 발생 시)

### 방법 1: 백업 복구
```bash
mysql -h [HOST] -u [USER] -p [DATABASE] < backup_YYYYMMDD_HHMMSS.sql
```

### 방법 2: 컬럼 삭제
```sql
ALTER TABLE `MemberProfile` DROP COLUMN `age`;
ALTER TABLE `MemberProfile` DROP COLUMN `gender`;
```

## 체크리스트

- [ ] 데이터베이스 백업 완료
- [ ] 마이그레이션 SQL 파일 검토 완료
- [ ] 마이그레이션이 nullable 필드 추가인지 확인
- [ ] 트래픽 적은 시간대 선택
- [ ] 롤백 계획 준비
- [ ] 마이그레이션 실행
- [ ] 데이터 무결성 검증
- [ ] 애플리케이션 재시작
- [ ] 기능 테스트 완료

## 이미 데이터가 유실된 경우

### 1. 즉시 백업에서 복구
```bash
mysql -h [HOST] -u [USER] -p [DATABASE] < latest_backup.sql
```

### 2. 백업이 없는 경우
- 가능한 데이터 복구 방법 확인 (binlog, snapshot 등)
- 클라우드 DB 사용 시 point-in-time recovery 확인
- 최악의 경우: 사용자에게 공지 후 재가입 요청

### 3. 향후 방지책
- 자동 백업 설정 (일일, 시간별)
- Staging 환경 구축
- 마이그레이션 전 항상 백업
- Production에서는 `migrate deploy`만 사용

