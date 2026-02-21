# ITERATION 67 (2026-02-22)

## Scope
- 퀴즈 진행 지표 가독성 개선
- 대상: `app/wordbooks/[id]/quiz/quizClient.tsx`

## 배경
- 남은 문제 수를 재도전 포함 총합으로만 보여줄 때,
  사용자가 `신규 문제`와 `재도전 문제` 비중을 파악하기 어려움

## 적용한 개선점
1. `remainingBreakdown` 파생값 추가
2. 상단 요약에 `신규 + 재도전` 분해 정보 추가
3. 초기 로딩(`-` 표기)에서는 분해 텍스트를 숨겨 노이즈 방지
4. 상태 바의 오답 큐 문구를 `신규 N + 재도전 M` 형태로 명확화

## 변경 파일
- `app/wordbooks/[id]/quiz/quizClient.tsx`

## 검증
- `npm run typecheck`
- `npm run lint`

