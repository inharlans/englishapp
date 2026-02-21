# ITERATION 41 (2026-02-21)

## 범위
- MCP 실측 기반 `offline`/`offline/wordbooks/[id]` 학습 UX 보강

## 변경 체크리스트 (10개)
- [x] 오프라인 학습 단축키에 `Home`/`End`/`0`(처음·끝 이동) 추가
- [x] 오프라인 학습 단축키에 `Enter`/`M`(뜻 토글) 추가
- [x] 오프라인 학습 정보 메시지 자동 정리 타이머 추가
- [x] 오프라인 학습 진행률 바에 `progressbar` 역할/값 속성 추가
- [x] 오프라인 학습 뜻 표시를 `MeaningView(detailed)`로 통일
- [x] 오프라인 학습에 `처음/마지막` 카드 버튼 추가
- [x] 오프라인 학습 이전 카드 `aria-label` 인덱스 오표기(0/x) 보정
- [x] 오프라인 라이브러리 `/` 단축키로 검색창 포커스 추가
- [x] 오프라인 라이브러리 `Esc` 단축키로 검색어 즉시 초기화 추가
- [x] 오프라인 라이브러리 새로고침 버튼/삭제 버튼 상태(`disabled`, `aria-busy`) 보강

## 구현 파일
- `app/offline/page.tsx`
- `app/offline/wordbooks/[id]/StudyClient.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
