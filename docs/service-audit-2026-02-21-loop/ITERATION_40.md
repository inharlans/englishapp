# ITERATION 40 (2026-02-21)

## 범위
- MCP 실측 기반 `wordbooks/[id]` 학습 경로 보정 (`/list-*`, `/cards`, `/quiz-*`)

## 변경 체크리스트 (10개)
- [x] `/api/wordbooks/[id]/study` 파트 통계 SQL의 경계 계산 보정 (`position-1` 기준)
- [x] `/list-*` 파트 수 표시에 `paging.partCount`를 우선 반영해 과대 표기 방지
- [x] `/list-*` 파트 점프 입력 `onBlur` 자동 보정(clamp) 추가
- [x] `/list-*` 현재 파트 버튼에 `aria-current`/보조텍스트 추가
- [x] `/cards` 첫/마지막 파트 버튼 경계 메시지 일관화
- [x] `/cards` 다음 파트 버튼을 공통 이동 함수로 통일
- [x] `/cards` 이전 카드 `aria-label` 인덱스(0/15 표기) 보정
- [x] `/cards` 뜻 표시를 `MeaningView(detailed)`로 통일해 품사/뜻 가독성 개선
- [x] `/quiz-*` 파트 진행률 바에 `role="progressbar"` 및 값 속성 추가
- [x] `/quiz-*` 파트 크기 label/input 연결, 파트 점프 입력값 정규화, 건너뛰기 로딩 중 비활성화

## 구현 파일
- `app/api/wordbooks/[id]/study/route.ts`
- `components/wordbooks/WordbookListClient.tsx`
- `app/wordbooks/[id]/cards/wordbookCardsClient.tsx`
- `app/wordbooks/[id]/quiz/quizClient.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
