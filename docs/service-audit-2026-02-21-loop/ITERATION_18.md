# 18회차 점검 보고서 (2026-02-21)

## 점검 방식 (MCP)
- MCP Playwright로 `https://www.oingapp.com/wordbooks/55/list-wrong`, `.../list-correct` 진입
- 목록 탭 로딩/파트 표시/카드 렌더 확인
- API 응답 직접 확인: `/api/wordbooks/55/study?view=listWrong...`

## 발견/반영 체크리스트 (10건)
1. 목록 페이지 서버 컴포넌트(정답/오답/회복) 문구가 깨져 비로그인/에러 상태 해독 불가 -> 3개 페이지 한국어 문구 전면 정상화
2. 목록 페이지 미로그인 상태에서 로그인 후 원위치 복귀 경로 없음 -> `next=/wordbooks/{id}/list-*` 링크 추가
3. 접근 차단 상태에서 상세 복귀 동선 부재 -> 단어장 상세 이동 링크 추가
4. MCP 실측에서 API `partStats`는 21파트를 반환하지만 UI는 20파트만 표시 가능 -> `displayPartCount = max(hook partCount, partStats 최대 index)`로 보정
5. 현재 파트 성과 가시성이 약함 -> `현재 N파트: matched/total (rate%)` 요약 추가
6. 파트 전환이 다수 버튼 클릭에 의존 -> 이전/다음 파트 버튼 추가
7. 키보드 중심 파트 이동 부재 -> `[`/`]` 단축키 추가
8. 목록 상태 표기가 영문 enum(`CORRECT/WRONG/NEW`)로 노출 -> 한국어 상태명으로 변환
9. 로딩/에러 접근성 부족 -> 로딩 배지 `role=status`, 오류 `role=alert` 적용
10. 목록 헤더에 실제 단어장 제목이 없어 컨텍스트 약함 -> API의 `wordbook.title` 보조 표기 추가

## 수정 파일
- `app/wordbooks/[id]/list-correct/page.tsx`
- `app/wordbooks/[id]/list-wrong/page.tsx`
- `app/wordbooks/[id]/list-half/page.tsx`
- `components/wordbooks/WordbookListClient.tsx`

## 검증 결과
- `npm run typecheck`: pass
- `npm run lint`: pass
- Railway 배포 확인: 커밋/푸시 후 확인 예정

## 다음 회차 우선순위
1. MCP로 배포 반영 후 list 탭의 21파트 표시/전환 동작 재검증
2. list 탭에서 카드/퀴즈로 넘어갈 때 현재 파트 컨텍스트 전달 보강
