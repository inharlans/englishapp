# 6회차 점검 보고서 (2026-02-21)

## 점검 범위
- 로그인/빈 상태 동선
- 상태 메시지 접근성(role/aria-live)
- 설명 파싱 중복 계산(렌더 성능)
- 결제 영역 제외

## 발견/반영 항목 (10건)
1. `/wordbooks` 비로그인 화면에 로그인 CTA 부재 -> 로그인 버튼 추가
2. 마켓 빈 상태 secondary CTA가 게스트에도 `내 단어장` 고정 -> 게스트는 `로그인`으로 분기
3. `wordbooks` 내가 만든 단어장에서 설명 파싱 중복 호출 -> 1회 계산으로 축소
4. `wordbooks` 다운로드 단어장에서도 설명 파싱 중복 호출 -> 1회 계산으로 축소
5. `market` 카드 설명 파싱 중복 호출 -> 1회 계산으로 축소
6. `market` 배지 계산의 `hasDescription`에서 중복 파싱 -> 캐시 값 재사용
7. 차단 성공 메시지에 상태 알림 속성 부재 -> `role=status`, `aria-live=polite` 추가
8. 다운로드 실패 메시지 알림 강도 부족 -> `role=alert` 추가
9. 오프라인 로딩 메시지 보조기기 반영 부족 -> `role=status`, `aria-live=polite` 추가
10. 오프라인 에러 메시지 경고 의미 약함 -> `role=alert` 추가

## 수정 파일
- `app/wordbooks/page.tsx`
- `app/wordbooks/market/page.tsx`
- `app/offline/page.tsx`
- `components/wordbooks/BlockOwnerButton.tsx`
- `components/wordbooks/DownloadButton.tsx`

## 검증 결과
- typecheck: pending
- 테스트: pending
- 배포 확인(Railway): pending
