# Clipper Option A Known Issues (2026-03-02)

## Known issues

- ✅ 클리퍼 확장 E2E 시나리오는 Option A(직접 저장 + 토스트 + fallback 허용 경로) 기준으로 작성 및 보강 완료.
- ⚠️ `npm run test`는 클리퍼 스코프와 무관한 모바일 auth 테스트 2건이 500 응답으로 실패하여 전체 게이트가 중단됨.
  - `app/api/auth/mobile/callback/route.test.ts:56` (기대 307, 실제 500)
  - `app/api/auth/mobile/callback/route.test.ts:66` (기대 400, 실제 500)
- ⚠️ `npm run test:e2e:clipper:extension`은 `E2E_SECRET`이 없으면 프리컨디션에서 종료되며(`E2E_MANUAL_LOGIN=1` 필요), 시크릿 값 자체는 코드/문서/로그에 저장하지 않음.

## Secret injection guidance

- 로컬: 셸 환경변수 또는 로컬 비밀 파일(`.env.local`)을 통해 `E2E_SECRET` 주입.
- CI: 저장소/조직 Secret Store에 `E2E_SECRET` 등록 후 워크플로에서 주입.
- 보안 원칙: 시크릿 원문은 채팅, 커밋, 테스트 로그에 남기지 않음.
