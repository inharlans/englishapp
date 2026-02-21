# ITERATION 59 (2026-02-22)

## Scope
- MCP 실플레이: `/wordbooks/55/quiz-word`
- 오답 재도전(`다시 풀기`) 이후 오답 큐 처리 검증/수정

## 실플레이 재현
- `that` 문제에서 오답(`zzz`) 제출 -> 오답 큐 1
- `다시 풀기` 클릭 후 정답(`that`) 제출
- 결과: 정답 처리됐지만 버튼 라벨이 `다음 (오답 큐 1)`로 유지되어 큐가 남아있음

## 원인
- 정답 제출 분기에서 현재 문제를 오답 큐에서 제거하지 않음
- 따라서 동일 문제가 이후에 다시 재출제될 수 있음

## 적용한 개선점
1. 정답 제출 시 현재 `item.id`를 `retryQueue`에서 제거
2. 제거 결과를 `retryQueueRef.current`에도 즉시 동기화
3. 오답 분기(`setWrongs`)와 정답 분기 로직을 명확히 분리
4. 기존 오답 큐 추가 로직과 충돌 없이 동작하도록 보존
5. 재시도 후 정답 처리 흐름의 중복 재출제 리스크 제거

## 변경 파일
- `app/wordbooks/[id]/quiz/quizClient.tsx`

## 검증
- `npm run typecheck`
- `npm run lint`

