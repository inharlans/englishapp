# Englishapp

Englishapp은 영어 단어 학습과 단어장 마켓 기능을 제공하는 Next.js 기반 서비스입니다.

- 기술 스택: Next.js(App Router), Prisma, PostgreSQL, TypeScript
- 핵심 기능: 단어장 생성/학습, 공개 마켓, 오프라인 학습, 결제(PortOne), 관리자 운영 도구
- 언어 정책: 사용자/관리자 노출 문구는 한국어

## 주요 기능

### 1) 단어장 및 학습
- 내 단어장 생성/수정/삭제
- 단어 항목(뜻, 발음, 예문, 예문 뜻) 관리
- 학습 모드: 암기, 의미 퀴즈, 단어 퀴즈, 정답/오답/반반 리스트
- 학습 상태는 사용자 기준으로 저장

### 2) 마켓
- 공개 단어장 탐색(검색/정렬/페이지네이션)
- 다운로드/평점/리뷰/신고
- 100단어 미만 단어장은 마켓 비노출
- 테스트/시드성 데이터 필터링

### 3) 오프라인
- 다운로드 단어장 IndexedDB 저장
- 오프라인 학습 페이지 제공
- 동기화 필요 시 온라인 원본으로 이동하는 CTA 제공

### 4) 요금제 및 결제
- 요금제: FREE / PRO
- FREE: 생성 1개, 다운로드 누적 한도
- PRO: 생성/다운로드 확장, 비공개 기능 사용 가능
- PortOne 결제 연동(checkout/confirm/webhook/portal)

### 5) 관리자 기능
- 사용자 목록/요금제/권한 관리
- 신고 처리(검토 중/해결/기각/숨김)
- 운영 지표 및 SLO 요약(API 성공률, 크론 성공률, 핵심 경로 P95)

## 주요 경로

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

## 주요 API (일부)

- 인증: `/api/auth/*`
- 단어장: `/api/wordbooks/*`
- 결제: `/api/payments/checkout`, `/api/payments/confirm`, `/api/payments/webhook`, `/api/payments/portal`
- 관리자: `/api/admin/*`
- 내부 크론: `/api/internal/cron/*`

## 로컬 실행

1. 환경변수 준비
- `.env.example`를 `.env`로 복사 후 값 설정
- 필수 예시: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_BOOTSTRAP_TOKEN`

2. 실행

```bash
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## 테스트 명령

```bash
npm run typecheck
npm test
npm run test:e2e
npm run test:e2e:local
npm run test:e2e:local:smoke
npm run test:e2e:local:ui
```

## 배포/운영 메모

- Railway 배포 시 `start:railway` 계열 스크립트 사용
- 크론 워크플로우는 `CRON_SECRET`과 `APP_BASE_URL` 설정 필요
- 운영/인수인계 문서는 `docs/` 폴더 참고
