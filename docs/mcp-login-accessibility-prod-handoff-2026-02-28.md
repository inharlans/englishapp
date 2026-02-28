# 로그인 접근성 경고 해결 후 운영 반영 요청 (2026-02-28)

## 배경
- 로컬 빌드에서 `/login` 폼 마크업이 수정되어 `id`/`name`이 추가되었습니다.
- 실서비스는 아직 구 번들(`page-5796d505b27b8e43.js`)을 노출해 경고가 그대로 남아있습니다.

## 요청 요약
- `components/auth/LoginPanel.tsx`의 접근성 수정 반영 배포 및 캐시 갱신
- `/login` 페이지 스크립트 해시를 새 번들(`page-ffd3dd5d24441f80.js`)로 갱신

## 배포/캐시 작업 항목
- 배포 파이프라인/릴리스 실행 또는 hot swap 배포
- CDN/캐시 purging 권장 대상
  - `/_next/static/chunks/app/login/page-*.js`
  - `/login` HTML 템플릿
- 배포 후 5~10분 내 새 정적 리소스 반영 확인

## 승인 기준 (PASS 조건)
1. `https://www.oingapp.com/login?_smoke=2` HTML에서 스크립트가 `page-ffd3dd5d24441f80.js` 또는 이후 새 해시를 가리킴
2. 해당 HTML 및 렌더된 폼에서 `input#login-email`, `input#login-password`, `name="email"`, `name="password"`가 확인됨
3. 콘솔 경고 `A form field element should have an id or name attribute` 미노출

## 장애 전파 우려
- 현재 운영 페이지가 오래된 번들을 사용 중이라 접근성 경고는 코드 자체가 아닌 배포 동기화 이슈로 판단됨
- 코드 변경은 완료되어 있으나 실서비스 반영이 선행되어야 사용자 체감 개선이 끝납니다.

## 배포 후 재측정 리포트 템플릿

### 1) 기본 항목
- 대상 URL: `https://www.oingapp.com/login?_smoke=2`
- 측정 시각(KST): `YYYY-MM-DD HH:mm`
- 측정자: `이름/아이디`
- 배포 버전: `릴리스명/커밋/빌드ID`

### 2) 소스/번들 확인
- 이전 해시: `page-5796d505b27b8e43.js`
- 현재 노출 해시: `page-*-*.js` (실측값 기입)
- 체크: `<script src="/_next/static/chunks/app/login/page-*.js">`가 최신 해시로 갱신되었는지

### 3) DOM / 접근성 마크업 확인
- `input#login-email` 존재: `PASS` / `FAIL`
- `input#login-password` 존재: `PASS` / `FAIL`
- `name="email"` 존재: `PASS` / `FAIL`
- `name="password"` 존재: `PASS` / `FAIL`
- 비밀번호 로그인 폼(`비밀번호 로그인 (관리자/개발용)`) 렌더 확인: `PASS` / `FAIL`

### 4) 런타임 확인
- 콘솔 경고 중 `A form field element should have an id or name attribute` 미노출: `PASS` / `FAIL`
- 콘솔 총 에러/경고 수: `PASS` / `FAIL`
- 네트워크 4xx/5xx 실패 응답: `PASS` / `FAIL`
- 신규 에러 URL(있을 경우): `목록`

### 5) 최종 판정
- 상태: `정상` / `주의` / `비정상`
- 판정 근거
  - 번들 갱신: `PASS` / `FAIL`
  - 마크업: `PASS` / `FAIL`
  - 경고 제거: `PASS` / `FAIL`
- 잔여 리스크: `기재`

## 재측정 결과 (즉시 재확인)

- 측정 URL: `https://www.oingapp.com/login?_smoke=2`
- 측정 결과: `주의` (실서비스 번들 지연 노출)
- 번들 스크립트: `/_next/static/chunks/app/login/page-5796d505b27b8e43.js` 노출
- 신규 번들(`page-ffd3dd5d24441f80.js`): `404` (미노출)
- 렌더 마크업:
  - `input#login-email` 미노출
  - `input#login-password` 미노출
  - `name="email"` 미노출
  - `name="password"` 미노출
- 런타임 콘솔:
  - `A form field element should have an id or name attribute` 경고가 여전히 남아 있음
- 권고:
  - 배포 라인/CDN 캐시 반영이 완료되기 전까지는 운영 사용자 체감 개선은 제한됨
  - 캐시 purge 대상 정리된 항목 기준으로 배포팀 재요청 필요

## 재측정 자동화 명령

- 실행 명령: `npm run ops:prod-login-check`
- 확인 항목:
  - 현재 노출 번들 스크립트
  - 로그인 패널 마크업 문자열(`login-email`, `login-password`, `email`, `password`) 존재 여부
  - 경고 문자열 흔적 유무
  - 다중 번들 후보가 있으면 모든 `app/login/page-*.js`를 검사해 요약/추적
- 결과가 `pass`가 아니면 배포/캐시 동기화팀에 결과 JSON을 함께 전달할 것

### 실행 예시

- `npm run ops:prod-login-check`
- `OINGAPP_LOGIN_CHECK_LOG=logs/ops/login-prod-accessibility-check.jsonl npm run ops:prod-login-check`

## 배포팀 전달용 한 페이지 요약

- 제목: 로그인 접근성 경고 해소를 위한 운영 캐시 동기화 요청
- 대상: `https://www.oingapp.com/login?_smoke=2`
- 현재 상태: `주의`
- 증상 요약:
  - 노출 번들: `/_next/static/chunks/app/login/page-5796d505b27b8e43.js`
  - `input#login-email`, `input#login-password`, `name="email"`, `name="password"` 미노출
  - 경고 문자열: `A form field element should have an id or name attribute`
- 요청 액션:
  1. `/_next/static/chunks/app/login/` 및 `/login` HTML 템플릿 캐시/배포 동기화
  2. 배포 후 즉시 `/login?_smoke=2` 소스 재확인
  3. 새 번들(`page-ffd3dd5d24441f80.js` 또는 최신) 노출 확인 후 경고 제거 재검증

## 로그 보관 포맷

- 포맷: JSONL (1행 1회 점검 결과)
- 저장 권장 경로: `logs/ops/login-prod-accessibility-check.jsonl`
- 저장 변수: `OINGAPP_LOGIN_CHECK_LOG`
- 주요 필드: `checkedAt`, `status`, `url`, `visibleScript`, `scriptCandidates`, `chunkChecks`, `chunkEvaluations`, `summary`, `errors`
