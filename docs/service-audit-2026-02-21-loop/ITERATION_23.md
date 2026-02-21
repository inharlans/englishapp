# ITERATION 23 (2026-02-21)

## 범위
- 카드 학습 경로 추가 점검: `/wordbooks/[id]/cards`

## 변경 체크리스트 (10개)
- [x] 파트 카드가 0개여도 `[`/`]` 파트 이동 가능하도록 키 처리 순서 수정
- [x] 카드 내 `Home`/`End` 단축키 추가(현재 파트 첫/마지막 카드)
- [x] 카드 내 `PageUp`/`PageDown` 단축키 추가(이전/다음 파트)
- [x] 카드 헤더 단축키 안내에 `Home/End` 반영
- [x] 파트 범위 표시 추가(`현재 범위 start~end`)
- [x] 파트 버튼 과밀 방지(중심 파트 + 생략부호)
- [x] 파트 직접 이동 시 입력값을 정규화된 파트 번호로 동기화
- [x] 진행률을 파트 진행률 + 전체 진행률 2단계로 분리
- [x] 전체 진행률 바/aria-label 추가
- [x] 빈 상태 primary CTA도 현재 파트 쿼리(`partSize/partIndex`) 유지

## 구현 파일
- `app/wordbooks/[id]/cards/wordbookCardsClient.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
