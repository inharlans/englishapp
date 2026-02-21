# Iteration 78 (2026-02-21)

## 점검 범위
- MCP Playwright 실동작 점검: `https://www.oingapp.com/wordbooks/55/quiz-meaning`
- 실제 오답 제출 후 피드백 패널(`허용 답안 예`) 가독성 확인

## 확인된 리스크
1. `허용 답안 예`가 장문/중복 조합으로 과도하게 길어짐
2. 실측에서 동일 의미 토큰 반복 + 형태 깨진 토큰(`대)너`)이 함께 노출되어 피드백 가독성이 저하됨
3. 원인: 미리보기 생성 시 항목 단위 중복 제거만 수행하고, 항목 내부의 콤마 구분 토큰 정규화/중복 제거가 없음

## 조치
- `app/wordbooks/[id]/quiz/quizClient.tsx`
  - `acceptedMeaningPreview` 계산 로직을 토큰 단위로 보강
  - `acceptedMeaningAnswers`를 콤마 기준 분해 후 trim/문장부호 정리
  - 정규화된 토큰 set으로 중복 제거 후 상위 8개만 노출

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
