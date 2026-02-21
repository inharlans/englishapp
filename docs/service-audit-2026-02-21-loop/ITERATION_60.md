# ITERATION 60 (2026-02-22)

## Scope
- MCP 실플레이 재검증: `/wordbooks/55/quiz-word`
- 단축키(`Esc`, `R`) 실동작 검증 및 수정

## 재현
- 입력창 포커스 상태에서 `Esc`를 눌러도 값이 지워지지 않음
- 원인: 키 핸들러에서 `isTyping` 체크가 먼저 실행되어 `Esc`/`R` 분기가 도달하지 못함

## 적용한 개선점
1. `R`(오답 재시도) 분기를 `isTyping` 체크보다 먼저 처리
2. `Esc`(입력 비우기) 분기를 `isTyping` 체크보다 먼저 처리
3. 입력창 포커스 여부와 무관하게 `Esc`로 현재 답안 비우기 가능
4. 오답 피드백 상태에서 `R` 단축키가 포커스 상태와 무관하게 동작
5. 중복/사후 분기 제거로 키 이벤트 흐름 단순화

## 변경 파일
- `app/wordbooks/[id]/quiz/quizClient.tsx`

## 검증
- `npm run typecheck`
- `npm run lint`
- MCP에서 `Esc` 입력 비우기 재현 확인 후 수정 반영

