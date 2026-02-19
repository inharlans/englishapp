# Englishapp

Englishapp은 영어 학습과 단어장 마켓을 제공하는 웹 애플리케이션입니다.

- 프레임워크: Next.js(App Router)
- 언어/런타임: TypeScript, Node.js
- DB: PostgreSQL + Prisma
- 결제: PortOne
- 핵심 대상 사용자: 한국어 사용자/관리자

## 핵심 기능

### 1. 학습 기능
- 영어 단어 학습(암기/퀴즈)
- 정답/오답/반반 리스트 기반 복습
- 사용자별 학습 상태 저장

### 2. 단어장 기능
- 단어장 생성/수정/삭제
- 항목(단어, 뜻, 발음, 예문, 예문 뜻) CRUD
- 공개/비공개 전환
- 버전 추적 및 동기화

### 3. 마켓 기능
- 공개 단어장 탐색(검색/정렬/페이지네이션)
- 다운로드/평점/리뷰/신고
- 품질 정책 기반 노출 필터링
  - 최소 100단어 이상 노출
  - 테스트성 제목 키워드 차단

### 4. 오프라인 기능
- IndexedDB 기반 오프라인 저장
- 오프라인 학습 페이지 제공
- 동기화 CTA 제공

### 5. 결제/요금제
- FREE / PRO
- PortOne 결제 흐름(체크아웃/확정/웹훅/포털)
- 서버 측 요금제 권한 강제

### 6. 관리자/운영
- 사용자/플랜 관리
- 신고 처리(검토 중/해결/기각/숨김)
- 운영 지표(SLO, 에러, 라우트별 성능) 확인
- 내부 크론 잡 운영

## 페이지

- `/` 랜딩
- `/login`, `/logout`
- `/wordbooks` 내 단어장
- `/wordbooks/new` 단어장 생성
- `/wordbooks/[id]` 단어장 상세
- `/wordbooks/market` 마켓
- `/offline`, `/offline/wordbooks/[id]` 오프라인
- `/pricing` 요금제/결제
- `/admin` 관리자
- `/privacy`, `/terms`

## 주요 API

### 인증
- `POST /api/auth/bootstrap`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### 단어장
- `GET /api/wordbooks`
- `POST /api/wordbooks`
- `GET /api/wordbooks/[id]`
- `PATCH /api/wordbooks/[id]`
- `DELETE /api/wordbooks/[id]`
- `POST /api/wordbooks/[id]/items`
- `PATCH /api/wordbooks/[id]/items/[itemId]`
- `DELETE /api/wordbooks/[id]/items/[itemId]`
- `POST /api/wordbooks/[id]/publish`
- `GET /api/wordbooks/market`
- `POST /api/wordbooks/[id]/download`
- `POST /api/wordbooks/[id]/sync-download`
- `POST /api/wordbooks/[id]/rate`
- `GET /api/wordbooks/[id]/reviews`
- `POST /api/wordbooks/[id]/report`
- `POST /api/wordbooks/[id]/block`

### 학습/퀴즈
- `GET /api/wordbooks/[id]/study`
- `POST /api/wordbooks/[id]/study/items/[itemId]`
- `GET /api/wordbooks/[id]/quiz`
- `POST /api/wordbooks/[id]/quiz/submit`

### 결제
- `POST /api/payments/checkout`
- `POST /api/payments/confirm`
- `POST /api/payments/webhook`
- `POST /api/payments/portal`

### 관리자/운영
- `GET /api/admin/users`
- `POST /api/admin/users/[id]/plan`
- `GET /api/admin/reports`
- `POST /api/admin/reports/[id]`
- `GET /api/admin/metrics`
- `POST /api/admin/wordbooks/recompute-rank`
- `POST /api/internal/cron/wordbook-rank`
- `POST /api/internal/cron/plan-expire`

## 로컬 실행

1. 의존성 설치
```bash
npm ci
```

2. Prisma 준비
```bash
npm run prisma:generate
npm run prisma:migrate
```

3. 개발 서버 실행
```bash
npm run dev
```

## 테스트/검증

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```

로컬 E2E 고정 명령:
```bash
npm run test:e2e:local
npm run test:e2e:local:smoke
npm run test:e2e:local:ui
```

## 필수 환경 변수(대표)

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_BOOTSTRAP_TOKEN`
- `CRON_SECRET`

PortOne 결제 연동:
- `PORTONE_API_SECRET`
- `PORTONE_WEBHOOK_SECRET`
- `PORTONE_STORE_ID`
- `PORTONE_CHANNEL_KEY`
- `PORTONE_PRICE_MONTHLY_KRW`
- `PORTONE_PRICE_YEARLY_KRW`

## 결제 인수인계 상태 (2026-02-19 기준)

기준 문서: `docs/HANDOFF_PORTONE_2026-02-19.md`

### 오늘 완료된 항목
- PortOne 콘솔 가입/로그인 완료
- `PORTONE_STORE_ID` 확인 완료
- `PORTONE_API_SECRET` 발급 및 Railway 반영 완료
- 웹훅 설정 완료
  - URL: `https://www.oingapp.com/api/payments/webhook`
  - `PORTONE_WEBHOOK_SECRET` 발급 및 Railway 반영 완료
- Railway 반영 완료
  - `PORTONE_API_SECRET`
  - `PORTONE_WEBHOOK_SECRET`
  - `PORTONE_STORE_ID`
  - `PORTONE_PRICE_MONTHLY_KRW=2900`
  - `PORTONE_PRICE_YEARLY_KRW=29000`
  - `CRON_SECRET` (기존 유지)
- GitHub Actions 시크릿 확인 완료
  - `APP_BASE_URL`
  - `CRON_SECRET`
- `Scheduled Internal Cron Jobs` 수동 실행 성공 확인

### 현재 블로커 (미완료 1건)
- `PORTONE_CHANNEL_KEY` 미설정
  - 사유: PortOne 채널 생성 시 PG 테스트 자격증명(MID/secret/client key 등)이 필요
  - 자격증명 없이는 채널 생성 불가 → `CHANNEL_KEY` 발급 불가

### 사업자 번호 확보 후 즉시 실행 순서
1. 대상 PG(예: 토스페이먼츠, KG이니시스) 테스트 자격증명 확보
2. PortOne에서 테스트 채널 생성 후 `CHANNEL_KEY` 발급
3. Railway에 `PORTONE_CHANNEL_KEY` 추가 후 배포
4. 앱 결제 플로우 검증
   - `/pricing` 월간/연간 결제 진입
   - 성공 리다이렉트: `/pricing?payment=success`
   - 사용자 `plan=PRO`, `proUntil` 반영 확인
5. 취소 플로우 검증
   - 구독 관리에서 해지
   - `/pricing?payment=cancel` 확인
   - DB `stripeSubscriptionStatus=canceled` 확인

보안 주의:
- 실제 시크릿 값은 문서에 기록하지 말고 Railway/GitHub Secrets에서만 관리합니다.

## 배포 메모

Railway 기준:
- `npm run start:railway`
- 필요 시 `npm run start:railway:seed`
- 크론 워크플로우/시크릿 설정 필요

## 최근 변경 사항

### 2026-02-19 Round 2
- 결제/로그인/요금제 페이지 한글 문구 정리
- 텍스트 품질 가드 확장(설명/리뷰 포함)
- 내부 메타 설명 노출 분리(displayDescription)
- 관리자 신고 워크플로우 확장 + SLO 요약 표시
- 오프라인 동기화 CTA 보강

### 2026-02-19 마켓 긴급 수정
- 마켓이 0개로 보이던 과도한 필터 문제 수정
- 필터 정책 단순화: 최소 단어 수 + 제목 기반 테스트 키워드 중심

## 문서

- 운영/점검/인수인계 문서: `docs/`
- Round 2 계획 문서: `docs/service-audit-2026-02-19-round2/`
