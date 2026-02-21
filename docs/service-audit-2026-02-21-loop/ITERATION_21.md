# ITERATION 21 (2026-02-21)

## 범위
- MCP 실측 기준: `https://www.oingapp.com/wordbooks/55/quiz-word`, `.../memorize`, `.../list-wrong`
- 초점: `wordbooks/[id]` 학습 하위 경로의 파트 이동/집중도/입력 안정성

## 점검 체크리스트 (10개)
- [x] 학습 화면 상단 PWA 설치 배너가 집중형 화면(`quiz/list/memorize/cards`)에서 매번 노출되는 문제 완화
- [x] PWA 배너 `나중에` 클릭 시 세션을 넘기면 다시 즉시 노출되는 문제 완화(7일 유예)
- [x] PWA 배너 상태 영역 접근성(`role=status`, `aria-live`) 보강
- [x] 퀴즈 데스크톱 파트 버튼 전체 렌더(40개+)로 가독성 저하되는 문제 개선(현재 중심 + 생략부호)
- [x] 퀴즈 파트 직접 이동 입력 부족 문제 개선(숫자 입력 + 이동 버튼)
- [x] 퀴즈 키보드로 처음/끝 파트 즉시 이동 불가 문제 개선(`Home`/`End`)
- [x] 퀴즈 오답 제출 후 입력값이 그대로 남아 다음 동작을 혼동시키는 문제 개선(제출 직후 입력값 초기화)
- [x] 목록 데스크톱 파트 버튼 과밀 렌더 개선(현재 중심 + 생략부호)
- [x] 목록 파트 직접 이동 입력 부족 문제 개선(숫자 입력 + 이동 버튼)
- [x] 목록 빈 상태 CTA가 현재 파트 컨텍스트를 잃는 문제 개선(`partSize/partIndex` 유지)

## 구현 파일
- `components/PwaInstallPrompt.tsx`
- `app/wordbooks/[id]/quiz/quizClient.tsx`
- `components/wordbooks/WordbookListClient.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 배포
- 커밋/푸시 후 Railway 빌드 확인 예정
