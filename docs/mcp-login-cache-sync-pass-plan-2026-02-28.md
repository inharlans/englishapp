# 로그인 접근성 경고 정리 운영 계획서 및 체크리스트 (PASS 전환)

## 1) 목적
- `npm run ops:prod-login-check` 기준으로 `warn` 상태인 `/login` 접근성 경고를
  `pass`로 전환하기 위한 운영 절차를 통일한다.
- 배포팀 CDN/캐시 동기화와 재점검, 문서 갱신까지 단일 흐름으로 운영한다.

## 2) 성공 기준 (PASS 조건)
- `/login?_smoke=2` HTML에서 노출 스크립트가 최신 해시로 갱신됨
- 점검 결과:
  - `input#login-email` PASS
  - `input#login-password` PASS
  - 콘솔 경고 문자열 `A form field element should have an id or name attribute` 미노출
  - 최종 판정 `PASS`

## 3) 실행 계획(순서)

### 1단계: 배포팀 동기화 요청
- 요청 대상: `/_next/static/chunks/app/login/page-*.js`, `/login` HTML 캐시/템플릿
- 사용 문서: `docs/mcp-login-accessibility-prod-handoff-2026-02-28.md` (요청 섹션 그대로 사용)
- 요청 메시지 최소 4요소:
  1. 대상 URL: `https://www.oingapp.com/login?_smoke=2`
  2. 현재 노출: `/_next/static/chunks/app/login/page-7949e7fe4576be4c.js`
  3. 누락 항목: `id` 누락(`login-email`, `login-password`)
  4. 요청 범위: CDN purge + 배포 최신 정적 자산 반영

### 2단계: 동기화 직후 즉시 점검
- 점검 명령 1차: `npm run ops:prod-login-check`
- 점검 명령 2차(권장):
  `set "OINGAPP_LOGIN_CHECK_LOG=logs/ops/login-prod-accessibility-check.jsonl" && npm run ops:prod-login-check`
- 결과 저장 후 즉시 공유:
  - `checkedAt`
  - `visibleScript`
  - `status`
  - `chunkChecks`

### 3단계: 재시도/추가 확인(필요 시)
- 캐시 반영 즉시 5~10분 간격으로 3회 재점검
- 같은 해시/동일 상태가 3회 반복되면 배포팀 재요청 반복
- 해시 변경 감지 시 이전 결과와 함께 비교 기록

### 4단계: PASS 전환 정리
- `docs/mcp-login-accessibility-prod-handoff-2026-02-28.md` 재측정 섹션 갱신
- `docs/mcp-runbook.md`의 최신 재점검 항목 갱신
- `README.md`의 운영 인수인계 링크는 유지(이미 반영됨)

### 5단계: 종료 보고
- 최종 상태 정리(정상/주의):
  - 상태
  - 측정 시각
  - 측정 번들
  - 경고/마크업 결과

## 4) 체크리스트

- [ ] 배포팀에 캐시 purge + 최신 번들 반영 요청 완료
- [ ] CDN 반영 후 `/login?_smoke=2` 점검 1회 실행
- [ ] JSONL 로그 저장 후 경로 전달
- [ ] 5~10분 내 재점검 1회 추가 실행
- [ ] 10분 내 3회 연속 재점검 수행 여부 확인
- [ ] `input#login-email` `id` 확인( PASS )
- [ ] `input#login-password` `id` 확인( PASS )
- [ ] 콘솔 경고 미노출 확인
- [ ] 최종 판정 PASS 변경
- [ ] `mcp-login-accessibility-prod-handoff-2026-02-28.md` 갱신
- [ ] `mcp-runbook.md` 운영 재점검 문구 갱신
- [ ] 필요 시 관련 팀에게 결과 통보

## 5) 실패 시 대응
- 1회 점검 실패: 1차 원인(캐시 미반영) 판단
- 2회 연속 실패: `visibleScript`가 같은 번들인지, 배포 버전 변경 여부 재확인
- 3회 연속 실패: 배포팀에 "동일 해시 반복 노출"으로 명확 재요청
- 운영 이슈 지속 시: `docs/mcp-login-accessibility-prod-handoff-2026-02-28.md`에 "잔여 리스크" 반영 후 핸드오버 유지

## 6) 참고 위치
- 운영 핸드오버: `docs/mcp-login-accessibility-prod-handoff-2026-02-28.md`
- 운영 Runbook: `docs/mcp-runbook.md`
- 세션 인수인계: `docs/session-continuity-env-guideline-2026-02-28.md`
