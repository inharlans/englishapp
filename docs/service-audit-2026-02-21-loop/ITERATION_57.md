# ITERATION 57 (2026-02-22)

## Scope
- MCP 점검: `/wordbooks/market`, `/wordbooks`
- 마켓 필터/페이지네이션 안정성 개선

## MCP 확인 결과
- 필터는 정상 동작하지만, `page` 쿼리가 과도하면 빈 목록 페이지로 들어갈 가능성이 있음
- 로그인 `next` 경로가 문자열 조합 방식에서 손상될 여지가 있음
- 필터 상태 가시성이 약해 현재 조건 인지가 어려움

## 적용한 개선점 (10+)
1. `requestedPage`와 `maxPage`를 분리해 페이지 상한 클램프
2. 클램프된 `page` 기준으로 `pageIds` 계산
3. 과도한 `page` 파라미터에서도 실제 마지막 페이지 결과를 보여주도록 보정
4. `prevPage`, `nextPage`를 보정된 `page` 기준으로 재계산
5. 로그인 복귀용 `nextMarketPath`를 `URLSearchParams`로 안전 생성
6. 로그인 URL 문자열 버전(`marketLoginHrefAsString`) 추가로 타입/파싱 안정화
7. 빈 결과 `EmptyStateCard`의 로그인 href를 안전 문자열로 교체
8. 검색 입력에 `autoComplete="off"` 적용
9. 검색 입력 길이 제한(`maxLength=120`) 추가
10. 필터 적용 버튼에 명확한 `aria-label` 추가
11. 활성 필터가 없을 때 `필터 초기화` 링크 숨김 처리
12. 폼 하단에 현재 필터 요약(검색어/정렬/규모) 추가

## 변경 파일
- `app/wordbooks/market/page.tsx`

## 검증
- `npm run typecheck`
- `npm run lint`

