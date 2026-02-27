# AI Nightly Instructions

## 목적
- 야간 자동 작업은 `ai/nightly-YYYYMMDD` 브랜치에서만 수행한다.
- `main`은 절대 직접 수정/푸시하지 않는다.

## 작업 원칙
- 매 사이클은 새 세션으로 시작한다.
- 변경 후 반드시 `npm run codex:workflow:check`를 통과해야 한다.
- 실패 시 커밋하지 않고 실패 사유만 상태 파일에 기록한다.

## 허용 범위
- 기본 허용: `app/`, `components/`, `lib/`, `server/`, `tests/`, `docs/`, `scripts/ops/`
- 금지: 배포 설정, 시크릿 값, 파괴적 DB 변경, force push

## 산출물
- 게이트 통과 시: `nightly: cycle N pass checks` 커밋
- 종료 시: 아침 검토용 리포트 생성

## 아침 인계 메모
- 변경 요약, 주요 리스크, 검증 결과를 보고한다.
- 최종 반영 판단은 사람이 직접 수행한다.
