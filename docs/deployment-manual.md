# ZEOrabbit 배포 매뉴얼

## 📋 배포 개요

ZEOrabbit은 Next.js 기반의 웹 애플리케이션으로, Vercel 플랫폼을 사용하며 Prisma ORM을 통해 데이터베이스를 관리합니다.

### 🛠 기술 스택
- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes
- **Database**: MySQL (Prisma ORM)
- **Deployment**: Vercel
- **Payments**: Toss Payments
- **Testing**: Playwright, Vitest

### 📁 주요 파일/디렉토리
- `prisma/schema.prisma`: 데이터베이스 스키마
- `src/scripts/seed.ts`: 개발용 시드 데이터
- `src/scripts/init-db.ts`: 프로덕션용 초기 데이터
- `vercel.json`: Vercel 설정
- `scripts/vercel-build.mjs`: Vercel 빌드 스크립트

---

## 1️⃣ 새로운 서버에 신규로 새로 배포하는 절차

### 사전 준비사항
- [ ] Vercel 계정 생성 및 CLI 설치
- [ ] GitHub 레포지토리 생성 및 코드 푸시
- [ ] 프로덕션용 MySQL 데이터베이스 준비 (AWS RDS, PlanetScale 등)
- [ ] Toss Payments 계정 및 API 키 준비
- [ ] 도메인 설정 (선택사항)

### 배포 단계

#### 1. 로컬 환경 준비
```bash
# 1. 코드 클론 및 의존성 설치
git clone <repository-url>
cd ZEOrabbit
npm install

# 2. 환경변수 설정 (config/env.local)
cp docs/env.example.md config/env.local
# DATABASE_URL, TOSS_PAYMENTS_CLIENT_KEY 등 설정
```

#### 2. 데이터베이스 초기화
```bash
# 1. Prisma 클라이언트 생성
npm run prisma:generate

# 2. 데이터베이스 스키마 적용
npm run db:push:local

# 3. 프로덕션용 초기 데이터 생성 (슈퍼관리자 계정 등)
npm run db:init:local
```

#### 3. Vercel 프로젝트 생성 및 연결
```bash
# 1. Vercel CLI 설치 및 로그인
npm install -D vercel
npx vercel login

# 2. 프로젝트 연결
npm run vercel:link

# 3. 환경변수 설정 (Vercel Dashboard에서)
# - DATABASE_URL: MySQL 연결 문자열
# - CRON_SECRET: 크론 작업용 시크릿
# - DB_PUSH_ON_DEPLOY: 0 (신규 배포시)
# - SEED_ON_DEPLOY: 0 (프로덕션에서는 사용하지 않음)
# - TOSS_PAYMENTS_CLIENT_KEY: 토스페이먼츠 클라이언트 키
# - TOSS_PAYMENTS_SECRET_KEY: 토스페이먼츠 시크릿 키
# - TOSS_PAYMENTS_WEBHOOK_SECRET_KEY: 웹훅 시크릿 키
```

#### 4. 프리뷰 배포 및 테스트
```bash
# 1. 프리뷰 배포
npm run vercel:deploy

# 2. 배포된 URL에서 기본 기능 테스트
# - 회원가입/로그인
# - 기본 페이지 로딩
# - API 엔드포인트 응답 확인
```

#### 5. 프로덕션 배포
```bash
# 1. 프로덕션 배포
npm run vercel:deploy:prod

# 2. 프로덕션 URL에서 최종 검증
# - 모든 페이지 정상 로딩
# - 결제 기능 테스트 (토스페이먼츠)
# - 데이터베이스 연결 및 CRUD 작업 확인
```

### 배포 후 확인사항
- [ ] 프로덕션 URL에서 애플리케이션 정상 실행
- [ ] 데이터베이스 연결 및 데이터 조회 가능
- [ ] Toss Payments 결제 연동 정상 작동
- [ ] 슈퍼관리자 계정으로 로그인 가능
- [ ] 기본 체험단 요금제 데이터 생성됨

---

## 2️⃣ 운영 중 소스 수정이나 DB 수정으로 변경사항만 배포하는 절차

### 사전 준비사항
- [ ] 변경사항 코드 리뷰 및 승인 완료
- [ ] 데이터베이스 백업 완료
- [ ] 스테이징 환경에서 변경사항 테스트 완료
- [ ] 롤백 계획 수립

### 배포 단계

#### 1. 코드 변경사항 준비
```bash
# 1. 최신 코드 가져오기
git checkout main
git pull origin main

# 2. 변경사항이 포함된 브랜치에서 작업
git checkout feature/your-feature
```

#### 2. 데이터베이스 변경사항 확인 및 적용
```bash
# 데이터베이스 스키마 변경이 있는 경우
# 1. 로컬에서 마이그레이션 생성 (개발환경)
npm run prisma:migrate

# 2. 프로덕션 DB에 스키마 적용
# 프로덕션 DB에 직접 접속하여 적용
npx prisma db push

# 또는 수동으로 SQL 실행
mysql -h <prod-db-host> -u <user> -p <database> < docs/ddl.sql
```

#### 3. Vercel 배포
```bash
# 1. 변경사항이 포함된 브랜치에서 프리뷰 배포
npm run vercel:deploy

# 2. 프리뷰 환경에서 테스트
# - 변경된 기능 정상 작동 확인
# - 기존 기능 영향 없음 확인
# - 데이터베이스 변경사항 정상 적용 확인
```

#### 4. 프로덕션 배포
```bash
# 1. main 브랜치에 병합 후 프로덕션 배포
git checkout main
git merge feature/your-feature
git push origin main

# 2. 프로덕션 배포
npm run vercel:deploy:prod
```

#### 5. 배포 후 모니터링
```bash
# 1. 헬스체크
curl -f https://your-domain.com/api/health

# 2. 주요 API 엔드포인트 테스트
curl https://your-domain.com/api/me
curl https://your-domain.com/api/advertiser/experience/pricing-plans?placeType=OPENING_SOON

# 3. 로그 모니터링 (Vercel Dashboard)
# - 함수 실행 오류 확인
# - 데이터베이스 연결 오류 확인
```

### 롤백 절차 (필요시)
```bash
# 1. 이전 버전으로 즉시 롤백
npx vercel rollback

# 2. 데이터베이스 롤백 (스키마 변경이 있는 경우)
# 백업본에서 복원
mysql -h <prod-db-host> -u <user> -p <database> < backup_pre_deploy.sql
```

---

## 3️⃣ 기존의 DB를 모두 제거하고 다시 배포하는 절차

### ⚠️ 주의사항
- **이 작업은 모든 데이터를 영구적으로 삭제합니다**
- 프로덕션 환경에서는 반드시 백업을 완료한 후 진행
- 사용자 동의 및 철저한 테스트 후에만 실행

### 사전 준비사항
- [ ] 전체 데이터베이스 백업 완료
- [ ] 사용자 및 이해관계자 동의 획득
- [ ] 재배포 후 데이터 복원 계획 수립
- [ ] 서비스 중단 공지 완료

### 배포 단계

#### 1. 서비스 중단 및 백업
```bash
# 1. 서비스 중단 공지
# 사용자에게 서비스 일시 중단 안내

# 2. 전체 데이터베이스 백업
mysqldump -h <prod-db-host> -u <user> -p <database> > full_backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Vercel에서 현재 배포 중단 (선택사항)
npx vercel --prod --yes
```

#### 2. 데이터베이스 초기화
```bash
# 1. 데이터베이스 DROP 및 CREATE
mysql -h <prod-db-host> -u <user> -p -e "DROP DATABASE IF EXISTS <database>;"
mysql -h <prod-db-host> -u <user> -p -e "CREATE DATABASE <database>;"

# 2. 새로운 스키마 적용
npm run prisma:generate
npx prisma db push
```

#### 3. 초기 데이터 생성
```bash
# 1. 프로덕션용 초기 데이터 생성
npm run db:init

# 또는 수동으로 실행
npx tsx src/scripts/init-db.ts
```

#### 4. 코드 재배포
```bash
# 1. 최신 코드로 빌드 및 배포
npm run build
npm run vercel:deploy:prod

# 2. 배포 완료 대기
```

#### 5. 초기 검증 및 데이터 복원
```bash
# 1. 기본 기능 검증
curl -f https://your-domain.com/api/health
curl https://your-domain.com/

# 2. 슈퍼관리자 계정 확인
# 생성된 계정으로 로그인 테스트

# 3. 필요한 경우 데이터 복원
# 백업에서 특정 데이터만 복원 (사용자 계정, 설정 등)
mysql -h <prod-db-host> -u <user> -p <database> < partial_restore.sql
```

#### 6. 서비스 재개
```bash
# 1. 서비스 정상화 공지
# 사용자에게 서비스 재개 안내

# 2. 모니터링 강화
# 배포 후 24시간 동안 집중 모니터링
```

---

## 4️⃣ 모든 테스트가 완료되고 프로덕션을 배포하는 절차

### 사전 준비사항
- [ ] 모든 단위 테스트 통과 (`npm run test`)
- [ ] E2E 테스트 통과 (`npx playwright test`)
- [ ] 코드 리뷰 완료 및 승인
- [ ] 보안 감사 완료
- [ ] 성능 테스트 완료
- [ ] 스테이징 환경에서 사용자验收 테스트(UAT) 완료
- [ ] 프로덕션 데이터베이스 백업 완료
- [ ] 롤백 계획 수립 및 팀 공유

### 배포 단계

#### Phase 1: 최종 준비 및 검증 (D-1)
```bash
# 1. 메인 브랜치 최종 상태 확인
git checkout main
git pull origin main
git log --oneline -10  # 최종 커밋 확인

# 2. 프로덕션용 빌드 테스트
npm run build

# 3. 프로덕션 환경변수 최종 확인
npm run vercel:env:pull

# 4. 데이터베이스 마이그레이션 테스트 (스테이징에서)
npm run db:push  # 스테이징 환경에서
```

#### Phase 2: 배포 전 체크리스트 검증 (D-Day)
- [ ] **PM 승인**: 비즈니스 요구사항 충족 확인
- [ ] **QA 승인**: 모든 테스트 케이스 통과
- [ ] **보안팀 승인**: 취약점 스캔 완료
- [ ] **운영팀 승인**: 인프라 및 모니터링 준비 완료
- [ ] **개발팀 승인**: 코드 품질 및 배포 준비 완료

#### Phase 3: 프로덕션 배포 실행
```bash
# 1. 배포 시작 공지 (팀 채널)
# "프로덕션 배포 시작합니다. 예상 소요시간: 30분"

# 2. 최종 프리뷰 배포 및 검증
npm run vercel:deploy

# 프리뷰 환경에서 최종 검증:
# - 모든 페이지 정상 로딩
# - 주요 사용자 플로우 테스트
# - 결제 기능 테스트
# - API 응답시간 확인

# 3. 프로덕션 배포 실행
npm run vercel:deploy:prod

# 4. 배포 완료 대기 및 초기 헬스체크
sleep 60  # 배포 안정화 대기
curl -f https://your-production-domain.com/api/health
```

#### Phase 4: 배포 후 검증 (0-2시간)
```bash
# 1. 자동화된 헬스체크
#!/bin/bash
echo "🔍 프로덕션 배포 검증 시작"

# 기본 헬스체크
if curl -f -s https://your-domain.com/api/health > /dev/null; then
    echo "✅ 헬스체크 통과"
else
    echo "❌ 헬스체크 실패 - 즉시 롤백 고려"
    exit 1
fi

# 주요 API 엔드포인트 검증
endpoints=(
    "/api/me"
    "/api/advertiser/experience/pricing-plans?placeType=OPENING_SOON"
    "/api/member/experience/campaigns"
)

for endpoint in "${endpoints[@]}"; do
    if curl -f -s "https://your-domain.com$endpoint" > /dev/null; then
        echo "✅ $endpoint 정상"
    else
        echo "❌ $endpoint 실패"
    fi
done

echo "🎉 배포 검증 완료"
```

#### Phase 5: 모니터링 및 안정화 (2-24시간)
```bash
# 1. 실시간 모니터링 (Vercel Analytics, 외부 모니터링)
# - 응답시간 추이
# - 오류율 모니터링
# - 사용자 접속 패턴 분석

# 2. 15분 간격 상태 보고
# - 팀 채널에 배포 상태 공유
# - 이상 감지 시 즉시 알림

# 3. 사용자 피드백 수집
# - 고객서비스팀을 통한 사용자 문의 모니터링
# - 실제 사용자 시나리오 테스트
```

#### Phase 6: 배포 완료 및 문서화 (24시간+)
```bash
# 1. 배포 완료 공지
# "✅ 프로덕션 배포 성공적으로 완료되었습니다"

# 2. 배포 보고서 작성
# - 배포 시간, 담당자, 주요 변경사항
# - 발생한 이슈 및 해결방안
# - 모니터링 결과 요약

# 3. 다음 배포를 위한 개선사항 정리
# - 배포 프로세스 개선점
# - 자동화 가능 항목 식별
```

### 롤백 계획 (비상시)
```bash
# 긴급 롤백 (5분 내 실행 가능)
echo "🚨 긴급 롤백 시작"

# 1. 이전 버전으로 즉시 롤백
npx vercel rollback

# 2. 데이터베이스 롤백 (필요시)
# 백업에서 복원
mysql -h <prod-db-host> -u <user> -p <database> < emergency_rollback.sql

# 3. 팀 긴급 소집 및 상황 공유
# Slack/Teams를 통한 긴급 공지

echo "✅ 롤백 완료 - 사용자 영향 최소화됨"
```

### 성공 기준
- [ ] 배포 후 1시간 내 오류율 < 1%
- [ ] API 응답시간 < 500ms (평균)
- [ ] 모든 주요 기능 정상 작동
- [ ] 결제 시스템 정상 연동
- [ ] 데이터베이스 연결 안정적
- [ ] 사용자 로그인/회원가입 정상
- [ ] 모니터링 시스템 정상 동작

---

## 📞 커뮤니케이션 가이드라인

### 사전 공지 (배포 1일 전)
- 팀 채널: 배포 일정 및 영향 범위 공유
- 이해관계자: 비즈니스 영향 안내
- 사용자: 서비스 일시 중단 가능성 안내 (필요시)

### 배포 중 (실시간)
- 팀 채널: 15분 간격 상태 업데이트
- 모니터링 대시보드: 실시간 공유
- 긴급 연락망: 이슈 발생 시 즉시 통보

### 배포 후 (24시간)
- 팀 채널: 배포 완료 및 결과 공유
- 이해관계자: 배포 성공 및 모니터링 결과 보고
- 사용자: 서비스 정상화 안내

---

## 🔧 문제 해결 가이드

### 일반적인 배포 문제

#### 1. 빌드 실패
```bash
# 로컬에서 빌드 테스트
npm run build

# Vercel 로그 확인
npx vercel logs --follow
```

#### 2. 데이터베이스 연결 실패
```bash
# 연결 문자열 검증
npx prisma db push --preview-feature

# 환경변수 확인
npm run vercel:env:pull
```

#### 3. API 타임아웃
```bash
# Vercel 함수 타임아웃 설정 확인 (vercel.json)
# 기본 10초, 필요시 증가 가능
```

#### 4. 메모리 부족
```bash
# Vercel 플랜 업그레이드 고려
# 또는 코드 최적화 (불필요한 import 제거)
```

### 🚨 긴급 상황 대응

#### 즉시 조치가 필요한 경우
1. **서비스 다운**: 즉시 롤백 실행
2. **데이터 손실**: 백업에서 복원
3. **보안 이슈**: 서비스 중단 후 조사
4. **법적 문제**: 관련 팀 즉시 소집

#### 모니터링 강화 상황
1. **응답시간 저하**: 로드밸런서 확인
2. **오류율 증가**: 로그 분석 및 핫픽스
3. **사용자 불편**: 커뮤니케이션 강화

---

**문서 버전**: 1.0
**최종 업데이트**: 2025-01-01
**담당자**: DevOps 팀</content>
</xai:function_call">## ZEOrabbit 배포 매뉴얼

4가지 배포 케이스에 대한 상세한 절차를 작성했습니다. 각 케이스별로 단계별 절차, 체크리스트, 모니터링 포인트, 롤백 계획 등을 포함했습니다.

### 📋 매뉴얼 주요 내용

**1️⃣ 새로운 서버에 신규로 새로 배포하는 절차**
- 환경 설정, 데이터베이스 초기화, Vercel 연결, 프리뷰/프로덕션 배포

**2️⃣ 운영 중 소스 수정이나 DB 수정으로 변경사항만 배포하는 절차**
- 코드 변경사항 준비, DB 마이그레이션, 프리뷰/프로덕션 배포, 모니터링

**3️⃣ 기존의 DB를 모두 제거하고 다시 배포하는 절차**
- 서비스 중단, DB 초기화, 재배포, 데이터 복원 (⚠️ 위험한 작업)

**4️⃣ 모든 테스트가 완료되고 프로덕션을 배포하는 절차**
- Phase별 배포 단계, 검증 프로세스, 모니터링, 성공 기준, 롤백 계획

### 🔧 추가 포함 사항

- **커뮤니케이션 가이드라인**: 팀/사용자 대상 공지 방법
- **문제 해결 가이드**: 일반적인 배포 문제와 해결 방법
- **긴급 상황 대응**: 서비스 다운, 데이터 손실 등 긴급 케이스 처리
- **성공 기준**: 배포 성공 여부 판단 기준

이 매뉴얼은 실제 ZEOrabbit 프로젝트의 구조(Next.js + Vercel + Prisma + MySQL)를 기반으로 작성되었으며, 실무에서 바로 사용할 수 있도록 상세한 명령어와 체크리스트를 포함했습니다.
