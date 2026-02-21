# ITERATION 55 (2026-02-22)

## Scope
- MCP 브라우저 점검: `/offline`, `/wordbooks/new`
- 오프라인 라이브러리/오프라인 학습 UX 안정성 강화

## MCP 확인 결과
- 오프라인 화면은 기능은 정상이나 로딩/삭제 중 입력 충돌 여지가 있었음
- 상태 안내 영역이 조건부 렌더링이라 레이아웃 점프가 발생 가능
- 오프라인 학습은 재진입 시 마지막 위치 복원이 없어 연속 학습성이 떨어짐

## 적용한 개선점 (10+)
1. `offline/page.tsx`에 `busy` 상태(로딩/삭제 중) 통합
2. 키보드 단축키 `R`로 오프라인 목록 새로고침 추가
3. 검색 입력창을 busy 상태에서 비활성화
4. 정렬 select를 busy 상태에서 비활성화
5. 필터 초기화 버튼을 busy 또는 비활성 필터 상태에서 비활성화
6. 오프라인 목록 컨테이너에 `aria-busy` 추가
7. 오프라인 카드 삭제 버튼을 busy 상태 전체 잠금으로 충돌 방지
8. 목록 제목에 `sanitizeUserText` 적용
9. 상태 메시지 영역을 항상 렌더링해 레이아웃 점프 완화
10. 검색어 trim 기반 파생값으로 필터 판단/표시 일관화
11. `offline/wordbooks/[id]/StudyClient.tsx`에 학습 인덱스 localStorage 저장 추가
12. 오프라인 학습 재진입 시 마지막 카드 위치 복원 추가
13. 오프라인 학습 단축키에 `R` 섞기 추가 및 동작 연결
14. 오프라인 학습 제목 렌더링에 `sanitizeUserText` 적용
15. 오프라인 학습 상태 메시지 영역 상시 렌더링으로 레이아웃 안정화

## 변경 파일
- `app/offline/page.tsx`
- `app/offline/wordbooks/[id]/StudyClient.tsx`

## 검증
- `npm run typecheck`
- `npm run lint`

