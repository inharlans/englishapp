# 8회차 점검 보고서 (2026-02-21)

## 점검 범위
- `/wordbooks` 학습 대시보드/다운로드 목록
- 다운로드 온보딩 배너
- 당일 목표량 입력 UX/접근성
- 결제 로직/결제 API 제외

## 발견/반영 체크리스트 (10건)
1. 당일 목표 입력에 명시적 라벨이 없어 입력 의도가 약함 -> `label` + `id` 연결
2. 목표 입력 도움 문구가 없어 허용 범위 혼동 가능 -> `1~500 범위` 안내 텍스트 추가
3. 숫자 범위 밖 입력 시 저장 실패 이유가 즉시 보이지 않음 -> 저장 전 클라이언트 범위 검증 및 에러 안내 추가
4. 목표 저장 성공 시 피드백이 없어 반응 확인이 어려움 -> 성공 메시지(`role=status`) 추가
5. 목표 저장 에러가 보조기기에서 경고로 전달되지 않음 -> 에러 메시지 `role=alert` 적용
6. 목표 입력 후 Enter 키로 저장이 되지 않아 폼 사용성이 떨어짐 -> Enter 저장 핸들러 추가
7. 목표 입력이 유효하지 않아도 저장 버튼이 활성화됨 -> 유효값일 때만 저장 버튼 활성화
8. 다운로드 온보딩 배너 상태 변경이 보조기기에 전달되지 않음 -> 배너 `role=status`, `aria-live=polite` 적용
9. 다운로드 배너 제목에 공백/빈 문자열이 그대로 노출될 수 있음 -> 제목 `trim()` 후 fallback 처리
10. `/wordbooks` 카드 목록/액션 링크의 구조·의미가 약함 -> 목록 `role=list/listitem` 적용 + 학습 링크 `aria-label` 보강

## 수정 파일
- `components/wordbooks/DailyGoalSetter.tsx`
- `components/wordbooks/PostDownloadOnboardingBanner.tsx`
- `app/wordbooks/page.tsx`

## 검증 결과
- `npm run typecheck`: pass
- `npm run lint`: pass
- Railway 배포 확인: pending (푸시 후 4분 대기 + Railway 확인 예정)
