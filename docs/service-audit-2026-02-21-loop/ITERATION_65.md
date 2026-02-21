# ITERATION 65 (2026-02-22)

## Scope
- 퀴즈 제출 API 입력 제한 정합성 보강
- 대상: `app/api/wordbooks/[id]/quiz/submit/route.ts`

## 배경
- 프론트 입력창은 `maxLength=120`으로 제한되어 있음
- 서버 스키마는 `max(1000)`로 더 넓어 불필요한 장문 입력을 허용
- 의미 유사도 계산(토큰/레벤슈타인) 특성상 과도한 입력은 비용 증가 요인이 됨

## 적용한 개선점
1. `submitSchema.answer` 최대 길이를 `1000 -> 120`으로 축소
2. 프론트/백엔드 입력 제한 정책을 일치시켜 검증 정합성 강화
3. 장문 입력 기반의 과도한 채점 계산 리스크 완화

## 변경 파일
- `app/api/wordbooks/[id]/quiz/submit/route.ts`

## 검증
- `npm run typecheck`
- `npm run lint`

