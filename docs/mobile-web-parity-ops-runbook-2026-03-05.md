# 모바일-웹 패리티 운영 런북 (2026-03-05)

Back to [AGENTS.md](../AGENTS.md)

## 장애 우선순위 룰

1. **P0 (즉시 차단): 권한/인증 불일치**
   - 예: 모바일은 401/403, 웹은 200 또는 반대
   - 조치: 배포 중단 -> `ops:mobile-parity:backend-check` 즉시 실행 -> 인증/가드 롤백 여부 결정
2. **P1 (고우선): 데이터 계약 불일치**
   - 예: 응답 필드 누락/타입 변경으로 앱 파싱 실패
   - 조치: `lib/api/mobileParity.test.ts` + 관련 라우트 테스트 즉시 실행, 계약 복구 우선
3. **P2 (중간): 기능 경로 누락/404 재발**
   - 조치: `ops:mobile-known-gaps:check` 실행 후 누락 라우트 복구
4. **P3 (일반): 성능/관측성 이슈**
   - 조치: 기능 정합성 확보 후 튜닝

## 릴리즈 전 고정 검증 루틴

1. `npm run ops:mobile-known-gaps:check`
2. `npm run ops:mobile-parity:backend-check`
3. `npm run ops:mobile-parity:cross-check`
4. `npm run codex:workflow:check`

통과 기준:
- 4개 커맨드 모두 exit code 0
- `ai:review:gate`에서 actionable finding 0건
- 모바일 패리티 관련 테스트 실패 0건

## 실패 시 대응

- `known-gaps` 실패: 누락 라우트/경로부터 복구
- `backend-check` 실패: 실패한 라우트 테스트 단일 실행 -> 최소 수정 -> 재실행
- `cross-check` 실패: 웹/모바일 공통 라우트 계약 재검증 후 응답 shape 우선 복구
- `workflow:check` 실패: lint/type/test/gate 순서로 원인 분리
