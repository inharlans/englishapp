# ITERATION 64 (2026-02-22)

## Scope
- MCP 실플레이 후 퀴즈 상단 지표의 초기 로딩 표시 품질 개선
- 대상: `app/wordbooks/[id]/quiz/quizClient.tsx`

## 관찰
- 초기 로딩 시 실제 데이터가 아직 없는데 `총 0개 / 1개 파트`로 잠깐 보임
- 사용자는 빈 데이터로 오해할 수 있음

## 적용한 개선점
1. 로딩 중 + `totalItems===0`일 때 총 개수 라벨을 `-`로 표시
2. 같은 조건에서 파트 수 라벨을 `-`로 표시
3. 같은 조건에서 남은 파트 라벨을 `-`로 표시
4. 같은 조건에서 남은 문제(재도전 포함) 라벨을 `-`로 표시
5. 데이터 로드 완료 후에는 기존 숫자 표시를 그대로 유지

## 변경 파일
- `app/wordbooks/[id]/quiz/quizClient.tsx`

## 검증
- `npm run typecheck`
- `npm run lint`

