# 17회차 점검 보고서 (2026-02-21)

## 점검 방식 (MCP)
- MCP Playwright로 `https://www.oingapp.com/wordbooks/55/cards` 진입
- 실제 화면에서 `카드 학습` 헤더/카운트/로딩 상태 관찰

## 발견/반영 체크리스트 (10건)
1. 카드 페이지 서버 컴포넌트 문구가 깨져 사용자 메시지 해독이 어려움 -> `page.tsx` 한국어 문구 전면 정상화
2. 카드 미로그인 상태에서 로그인 후 복귀 경로 없음 -> `next=/wordbooks/{id}/cards` 로그인 링크 추가
3. 접근 차단 상태에서 상세 복귀 동선 부재 -> 단어장 상세 이동 링크 추가
4. 카드 클라이언트 문구/마크업 깨짐으로 신뢰도 저하 -> `wordbookCardsClient.tsx` 전면 정리
5. 로딩 중 `단어 0개` 노출로 오해 유발 -> 로딩 중 카운트 `-` 표시로 개선
6. 카드 학습 키보드 동선 부족 -> `←/→`, `Space`, `R` 단축키 추가
7. 로딩/오류/정보 메시지 접근성 보강 필요 -> `role=status`/`role=alert` 적용
8. 카드 진행률 가시성이 약함 -> 상단 진행률 바 추가
9. 카드가 비어 있을 때 다음 행동 제시 부족 -> `EmptyStateCard`로 상세/암기 이동 동선 제공
10. 섞기 액션 피드백이 약함 -> 섞기 후 정보 메시지(`카드 순서를 다시 섞었습니다.`) 제공

## 수정 파일
- `app/wordbooks/[id]/cards/page.tsx`
- `app/wordbooks/[id]/cards/wordbookCardsClient.tsx`

## 검증 결과
- `npm run typecheck`: pass
- `npm run lint`: pass
- Railway 배포 확인: 커밋/푸시 후 확인 예정

## 다음 회차 우선순위
1. MCP로 배포 반영 후 `/wordbooks/[id]/cards` 실동작 재검증
2. 카드/암기/퀴즈 간 전환 시 현재 학습 위치 유지 개선
