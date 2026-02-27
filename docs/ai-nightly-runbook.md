# AI Nightly Runbook (Ralph-Lite)

## 1) 시작
```bash
npm run ai:nightly:start
```

필요 시 환경변수 지정:
- `NIGHTLY_BRANCH` (기본: `ai/nightly-YYYYMMDD`)
- `NIGHTLY_MAX_CYCLES` (기본: `6`)
- `NIGHTLY_MAX_CONSECUTIVE_FAILURES` (기본: `2`)
- `NIGHTLY_MAX_CHANGED_FILES` (기본: `20`)
- `NIGHTLY_MAX_CHANGED_LINES` (기본: `1000`)
- `NIGHTLY_INTERVAL_SECONDS` (기본: `300`)
- `NIGHTLY_AUTO_PUSH` (`1`이면 매 커밋 후 push)
- `NIGHTLY_TASK_COMMAND` (사이클마다 실행할 추가 명령)

## 2) 야간 루프 실행
```bash
npm run ai:nightly:loop
```

## 3) 수동 1회 사이클
```bash
npm run ai:nightly:cycle
```

## 4) 아침 리포트 생성
```bash
npm run ai:nightly:report
```

## 5) 아침 검토 명령
```bash
git log --oneline main..HEAD
git diff --stat main...HEAD
npm run codex:workflow:check
```

## 6) 운영 규칙
- PR 자동 생성은 OFF를 유지한다.
- main 브랜치 직접 push는 금지한다.
- 최종 반영은 코드 검토 + 로컬/개발 서버 검증 후 사람이 결정한다.
