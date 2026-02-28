# MCP 최소권한 도입 실행표 (2026-02-28)

## 목적
- `docs/mcp-runbook.md`의 MCP 확장 순서를 실제 운영 적용 단계로 전환한다.
- 각 MCP는 승인 -> 구성 -> 연결 확인 -> health check -> 운영 반영 결정 순서로 일괄 기록한다.

## 도입 대상 순서
1. `github(read)`
2. `postgres(read)`
3. `sentry(read)`
4. `prisma(read)`
5. `playwright`
6. `context7(필요 시)`

## 공통 실행 체크
- 승인 범위: 최소권한 범위 승인서 + 토큰/계정 발급 승인
- 구성 변경: `opencode` 기준 MCP 설정 파일은 단계별로 1개씩만 활성화
- 검증 순서: 연결 확인 -> 간단 조회 1건 -> health check 3개 수행
- 보안: 배포/시크릿/파괴성 작업 금지, main 직접 수정/커밋/푸시 금지 준수
- 완료 산출: 각 단계별로 PASS/FIELD/대기 사유를 기록

## 단계별 실행 템플릿

### 1) github(read)
- 상태: 대기
- 실행 명령(예시)
  - 승인 후 `opencode.json` 또는 `opencode mcp add`로 최소권한 github MCP 등록
  - `opencode mcp list`에서 노출 확인
- 검증 증거
  - 토큰 유효성/Rate limit 조회
  - 최근 이슈/PR 목록 1회 조회
- 통과 기준
  - read 조회만 가능한 항목 3개 성공

### 2) postgres(read)
- 상태: 대기
- 실행 명령(예시)
  - read-only DB 계정 등록 후 조회 전용 연결 문자열 설정
  - MCP 연결 테스트 수행
- 검증 증거
  - `SELECT 1` 성공
  - 슬로우 쿼리 조회 결과 1건 이상 정상 응답
  - 커넥션 풀 지표 조회 성공

### 3) sentry(read)
- 상태: 대기
- 실행 명령(예시)
  - read-only token 기반 Sentry MCP 등록
  - 최근 이벤트 조회 테스트 수행
- 검증 증거
  - 24시간 이벤트 조회
  - 심각도 Top 조회
  - release/환경 필터 정상 동작

### 4) prisma(read)
- 상태: 대기
- 실행 명령(예시)
  - 스키마/마이그레이션 조회 전용 계정 등록
  - drift 조회 테스트 수행
- 검증 증거
  - 스키마 메타 조회
  - migration history 조회
  - drift 점검 응답

### 5) playwright
- 상태: 대기
- 실행 명령(예시)
  - 테스트 실행 권한 적용(테스트 URL 화이트리스트)
  - smoke 시나리오 1회 실행
- 검증 증거
  - 로그인 제외 라우트 smoke 통과율
  - 콘솔 경고/에러 수집 로그
  - DOM 스냅샷 안정성 지표

### 6) context7(필요 시)
- 상태: 대기
- 실행 명령(예시)
  - 최소 read-only 키 등록
  - 문서 검색 1회 수행
- 검증 증거
  - 검색 응답
  - 버전/예시 조회
  - 민감정보 마스킹 로그 확인

## 다음 액션
- 현재 단계는 `github(read)`부터 승인 대기 상태로 시작한다.
- 승인 완료 시 단계별로 위 템플릿에 PASS 결과를 채워 실운영 도입 로그로 전환한다.
