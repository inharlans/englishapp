# 19회차 점검 보고서 (2026-02-21)

## 점검 방식 (MCP)
- MCP Playwright로 `/wordbooks/55/list-wrong`, `/wordbooks/55/list-correct` 진입
- 목록 탭 전환 및 파트 표시 확인
- API 직접 확인: `partStats`가 `partIndex=21`까지 반환됨

## 발견/반영 체크리스트 (10건)
1. 학습 탭 전환 시 `partSize/partIndex` 컨텍스트가 URL에 남지 않아 연속 점검 흐름이 끊김 -> `useWordbookParting`에 URL 쿼리(`partSize`,`partIndex`) 읽기/쓰기 동기화 추가
2. 탭 링크가 현재 파트 쿼리를 유지하지 않아 페이지 이동 시 컨텍스트 손실 -> `WordbookStudyTabs`에서 현재 쿼리 유지 링크 적용
3. 목록 컴포넌트 초기 `loading=false`로 첫 화면에 `총 0개/1파트`가 보이는 깜빡임 발생 -> 초기 로딩 상태를 `true`로 변경
4. 목록 로드 실패 시 재시도 버튼 부재 -> `다시 시도` 버튼 및 재요청 트리거(`reloadTick`) 추가
5. 파트 컨텍스트 공유를 위해 로컬스토리지/URL 동기화 우선순위가 필요 -> URL 우선, 로컬스토리지 fallback 로직 적용
6. 파트 크기 변경 시 URL 쿼리 갱신이 없어 새로고침 시 상태 복원 불가 -> `history.replaceState`로 즉시 반영
7. 파트 인덱스 변경 시 URL 쿼리 갱신이 없어 탭 이동 공유 불가 -> 동일하게 즉시 반영
8. 목록 페이지에서 파트 이동 단축키를 써도 URL은 그대로라 협업 점검 어려움 -> 훅 동기화로 해소
9. 탭 링크 타입이 문자열 기반으로 TS 경고 가능 -> `Route` 타입 캐스팅으로 타입 안정화
10. MCP 점검 기준으로 목록 탭 컨텍스트 보존(파트 중심)을 공통 기반에서 보강해 다음 회차 점검 속도 향상

## 수정 파일
- `components/wordbooks/useWordbookParting.ts`
- `components/wordbooks/WordbookStudyTabs.tsx`
- `components/wordbooks/WordbookListClient.tsx`

## 검증 결과
- `npm run typecheck`: pass
- `npm run lint`: pass
- Railway 배포 확인: 커밋/푸시 후 확인 예정

## 다음 회차 우선순위
1. MCP로 배포 반영 후 탭 이동 시 `partSize/partIndex` URL 유지 검증
2. 목록/퀴즈/암기 간 공통 상태(밀도/의미표시) URL 동기화 확장 검토
