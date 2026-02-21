# ITERATION 63 (2026-02-22)

## Scope
- MCP 실플레이 기반 퀴즈 지표 가독성 개선
- 대상: `app/wordbooks/[id]/quiz/quizClient.tsx`

## 관찰
- 오답 큐가 있을 때 `현재 파트 남은 문제`가 고유 풀이 기준으로만 계산되어
  사용자 체감(재도전 문제 포함)과 차이가 날 수 있음

## 적용한 개선점
1. `remainingInPartWithRetry` 파생값 추가
2. 상단 요약의 `현재 파트 남은 문제`를 `재도전 포함` 기준으로 변경
3. 상태 바의 오답 큐 표시에 `남은 문제` 수치 병기
4. 기존 `고유 풀이` 지표는 유지해 학습 진행률 의미를 보존

## 변경 파일
- `app/wordbooks/[id]/quiz/quizClient.tsx`

## 검증
- `npm run typecheck`
- `npm run lint`

