# Englishapp

Next.js(App Router) + Prisma + PostgreSQL 기반 영어 단어 학습 서비스입니다.

## 핵심 기능
- 소셜 로그인: Google / Naver / Kakao
- 개인 단어장 생성/관리
- 공개 단어장 마켓(다운로드/평점/리뷰)
- 학습 모드: 암기, 퀴즈(뜻/단어), 오답/반정답/정답 리스트
- 오프라인 학습(IndexedDB + Service Worker)
- 요금제: FREE / PRO

## 인증 및 계정
- 로그인 페이지: `/login`
- 로그아웃 페이지: `/logout`
- 현재 사용자 확인 API: `GET /api/auth/me`

OAuth 콜백 경로:
- Google: `/api/auth/google/callback`
- Naver: `/api/auth/naver/callback`
- Kakao: `/api/auth/kakao/callback`

## 요금제 정책(현재)
### FREE
- 단어장 생성: 평생 1개
- 공개 범위: 공개만 가능
- 다운로드 한도: 누적 1000단어

### PRO
- 단어장 생성: 무제한
- 공개 범위: 공개/비공개 선택 가능
- 다운로드 한도: 무제한

## 법적 페이지
- 개인정보처리방침: `/privacy`
- 서비스 이용약관: `/terms`
- `/pricing` 페이지 상단에서 두 페이지로 바로 이동 가능

## 환경 변수
### 공통
- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL` (운영: `https://www.oingapp.com`)

### OAuth
- Google
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI` (선택, 기본: `{publicOrigin}/api/auth/google/callback`)
- Naver
  - `NAVER_CLIENT_ID`
  - `NAVER_CLIENT_SECRET`
  - `NAVER_REDIRECT_URI` (선택)
- Kakao
  - `KAKAO_CLIENT_ID` (REST API 키)
  - `KAKAO_CLIENT_SECRET` (콘솔에서 활성화한 경우)
  - `KAKAO_REDIRECT_URI` (선택)

### 결제(Stripe)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_MONTHLY`
- `STRIPE_PRICE_YEARLY`
- `STRIPE_PORTAL_RETURN_URL`

## 실행 방법
```bash
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

프로덕션 빌드:
```bash
npm run build
npm run start
```

## 배포 운영 체크리스트
1. 운영 도메인 고정: `https://www.oingapp.com`
2. OAuth 리디렉션 URI를 운영 도메인으로 통일
3. `NEXT_PUBLIC_APP_URL=https://www.oingapp.com` 설정
4. 로그인 성공/실패 코드(`?error=`) 점검
5. `/privacy`, `/terms` 공개 접근 확인

## 인코딩/문서 정책
- 모든 소스/문서 파일은 UTF-8(무 BOM) 사용
- 텍스트 파일 수정 후 `npm run build`로 검증
- PowerShell로 파일 쓸 때는 UTF-8 명시 저장

## 최근 반영 사항 요약
- OAuth 리다이렉트 호스트 계산 로직 개선
  - 프록시 헤더(`x-forwarded-host`, `x-forwarded-proto`)와 `NEXT_PUBLIC_APP_URL` 기반으로 public origin 계산
- Google/Naver/Kakao 콜백 리다이렉트 루프 이슈 수정
- `/privacy`, `/terms` 페이지 추가
- `/pricing`에 법적 페이지 버튼 및 로그인 이메일 표시 추가(검수 증빙용)