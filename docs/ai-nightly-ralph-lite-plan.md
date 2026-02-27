# Ralph-Lite Nightly Plan (englishapp)

## 1) 목표
- 밤 동안 AI가 반복 작업을 수행하되, `main`은 절대 건드리지 않는다.
- 결과는 `ai/nightly-YYYYMMDD` 브랜치에만 누적한다.
- 아침에 사람이 `main` 대비 차이/리스크를 검토하고, 로컬/개발 서버 검증 후 반영 여부를 결정한다.

## 2) 운영 원칙
- 매 사이클은 **새 세션**으로 시작한다(컨텍스트 누적 금지).
- 상태는 파일로 유지한다:
  - `docs/compact-context.md`
  - `.loop/last-cycle.json`
  - `.loop/nightly-state.json` (예정)
- 품질 게이트 필수:
  - `npm run codex:workflow:check`
- 게이트 실패 시 커밋/푸시 금지, 실패 원인 기록만 수행.
- PR 자동 생성은 `OFF` 유지.

## 3) 브랜치/반영 정책
- 야간 작업 브랜치: `ai/nightly-YYYYMMDD`
- `main` 직접 커밋/푸시 금지
- 아침에 사람이 아래 4가지 중 하나 결정:
  - `Merge`
  - `Partial merge` (cherry-pick)
  - `Hold`
  - `Drop`

## 4) 사이클 동작(1회)
1. 브랜치 확인/생성 및 체크아웃 (`ai/nightly-YYYYMMDD`)
2. `npm run compact:sync`로 상태 최신화
3. 지시서 + 상태 파일 기반으로 AI 1회 작업
4. `npm run codex:workflow:check` 실행
5. 통과 시에만 커밋(`nightly:` prefix 권장)
6. 실패 시 미커밋 + 실패 사유 기록 후 종료

## 5) 루프 동작(반복)
- 반복 횟수 상한: 예) 6회
- 연속 실패 상한: 예) 2회
- 변경량 상한: 예) 20 files 또는 1000 lines 초과 시 중단
- 금지 영역 변경 감지 시 즉시 중단

## 6) 금지 항목
- 배포 명령 실행
- 시크릿/인프라 설정 변경
- 파괴적 DB 작업
- `git push --force` 계열

## 7) 아침 검토 절차
1. 브랜치 변경량 확인:
   - `git log --oneline main..HEAD`
   - `git diff --stat main...HEAD`
2. AI 차이 분석 요청(요약/리스크/회귀 포인트)
3. 로컬 검증
4. 개발 서버 검증
5. 최종 결정 (`Merge/Partial/Hold/Drop`) 및 근거 기록

## 8) 단계별 도입
- Phase 1: 브랜치 분리 + 1회 사이클 + 게이트
- Phase 2: 반복 루프 + 자동 중단 규칙
- Phase 3: 아침 리포트 자동 생성 고도화
