# ITERATION 54 (2026-02-22)

## Scope
- MCP 브라우저 점검: `https://www.oingapp.com/wordbooks/55/list-wrong`, `.../cards`
- 공용 리스트 화면(`list-correct`, `list-wrong`, `list-half`) 안정성/가독성 보강

## MCP 확인 결과
- 리스트 화면 파트 입력/이동 제어에서 비정상 숫자 입력 방어가 약함
- 로딩 중에도 파트 이동 조작이 가능해 상태 충돌 가능성 존재
- 목록 텍스트(의미/예문/제목) 정제 방어가 없어 품질 이슈 데이터가 그대로 노출될 수 있음

## 적용한 개선점 (10+)
1. `WordbookListClient` 파트 크기 입력값 `1~200` 범위 강제(clamp)
2. 파트 크기 변경 시 파트 인덱스 1로 리셋
3. 파트 크기 변경 시 파트 점프값도 `1`로 동기화
4. 파트 크기 변경 시 사용자 안내 메시지 추가
5. 모바일 파트 선택 select 값 파싱 안정화(clamp)
6. 로딩 중 모바일 파트 선택 select 비활성화
7. 로딩 중 처음/이전/다음/마지막 버튼 비활성화
8. 점프 이동 submit/blur 모두 안전 파싱(clamp)
9. 로딩 중 파트 칩 버튼 비활성화 및 클릭 가드 추가
10. 상태 안내 영역을 항상 렌더링해 레이아웃 점프 완화
11. 단어장 제목 출력 시 텍스트 정제 적용
12. 항목 의미 출력 시 텍스트 정제 적용
13. 예문/예문 해석 출력 시 텍스트 정제 적용

## 변경 파일
- `components/wordbooks/WordbookListClient.tsx`

## 검증
- `npm run typecheck`
- `npm run lint`

