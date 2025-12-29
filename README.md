# ZEOrabbit

## 문서

- `requirements.md`: 서비스 요구사항 정리
- `docs/architecture.md`: 아키텍처/모듈 설계 + 상세 Pseudo code
- `docs/gap-analysis.md`: 요구사항 보강(누락/리스크/개선 제안)
- `docs/erd.md`: ERD (Mermaid)
- `docs/ddl.sql`: MySQL 기본 DDL
- `docs/vercel-deploy.md`: Vercel 배포 가이드
- `docs/dev-plan.md`: 개발 계획(마일스톤/단계/수용 기준)
- `prisma/schema.prisma`: Prisma 스키마(초안)

## 데이터베이스 초기화

### 프로덕션용 초기 데이터 배포

프로덕션 환경에서 시스템 운영에 필수적인 기본 데이터를 초기화합니다:

```bash
# ✅ 추천: npm script 사용
npm run db:init          # 프로덕션
npm run db:init:local    # 로컬 환경
```

**참고**: `npx prisma db init` 명령어는 Prisma에서 지원하지 않습니다.
기존 `npx prisma db seed`는 `seed.ts`를 실행합니다.

초기화되는 데이터:
- **시스템 정책**: 요금제, 제한사항, 지급 정책 등
- **슈퍼 관리자 계정**: `superadmin@zeorabbit.com`
- **체험단 요금제**: 모든 매장 유형별 요금제 정보
- **기본 보안 설정**: 블랙리스트 등

### 개발용 테스트 데이터 배포

개발/테스트 환경에서 풍부한 샘플 데이터를 생성합니다:

```bash
# 프로덕션 환경
npm run db:seed

# 로컬 개발 환경
npm run db:seed:local
```

⚠️ **주의**: `init-db`는 운영 필수 데이터만, `seed`는 테스트용 데이터를 포함합니다.