# 20회차 점검 보고서 (2026-02-21)

## 점검 방식 (MCP)
- MCP Playwright로 `.../list-wrong?partSize=15&partIndex=3` 진입
- 로딩 후 현재 파트(3파트) 적용 여부 확인
- 탭 이동(`의미 퀴즈`) 후 URL 쿼리 유지(`partSize=15&partIndex=3`) 검증

## 발견/반영 체크리스트 (10건)
1. 학습 탭 링크의 쿼리 문자열이 마운트 시점 값으로 고정되어 파트 변경 후 링크가 stale 될 수 있음 -> `useSearchParams` 기반 실시간 쿼리 생성으로 변경
2. 학습 탭 컴포넌트가 `partSize/partIndex`를 동적 갱신하지 못해 연속 점검/공유 링크 정확도 저하 -> 렌더 시점 쿼리 계산으로 개선
3. 파트가 `partCount`를 초과해 자동 클램프될 때 URL/localStorage는 갱신되지 않아 상태 불일치 가능 -> 보정 시 URL+스토리지 동기화 추가
4. `useWordbookParting`에서 자동 보정 후 브라우저 주소와 내부 상태 불일치 리스크 -> `history.replaceState`로 즉시 반영
5. 탭 이동 컨텍스트의 타입 안정성 부족 -> `Route` 타입 캐스팅 유지하며 쿼리 링크 보장
6. 목록/퀴즈 탭 전환 시 협업자가 동일 컨텍스트를 재현하기 어려움 -> URL에 파트 정보 일관 유지 구조 확정
7. 초기 상태에서 파트 보정 후 새로고침 시 값 복원 일관성 보강 -> 보정된 `partIndex`를 localStorage에 즉시 기록
8. MCP 검증에서 `list-wrong` 로딩 후 `현재 3파트`가 정확히 반영되는지 확인 -> 반영 확인 (pass)
9. MCP 검증에서 `quiz-meaning` 이동 후 URL 쿼리 유지 확인 -> 유지 확인 (pass)
10. 탭 컨텍스트 유지 구조를 공통 컴포넌트(`WordbookStudyTabs` + `useWordbookParting`)에서 해결해 개별 페이지 중복 패치 필요성 감소

## 수정 파일
- `components/wordbooks/WordbookStudyTabs.tsx`
- `components/wordbooks/useWordbookParting.ts`

## 검증 결과
- `npm run typecheck`: pass
- `npm run lint`: pass
- MCP URL 검증: pass (`list-wrong -> quiz-meaning`에서 `partSize/partIndex` 유지)

## 다음 회차 우선순위
1. MCP로 `quiz-word -> list-* -> cards` 왕복에서 쿼리 유지 추가 검증
2. 의미/밀도 모드도 URL 동기화할지 검토 및 적용
