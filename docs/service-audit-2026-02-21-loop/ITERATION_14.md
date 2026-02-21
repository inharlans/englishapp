# 14회차 점검 보고서 (2026-02-21)

## 점검 범위
- `/wordbooks/[id]/memorize`
- `/wordbooks/[id]/study`
- 결제 흐름 및 결제 API는 제외

## 발견/반영 체크리스트 (10건)
1. 암기 페이지 미로그인 상태에서 즉시 로그인 동선이 없음 -> `next` 포함 로그인 링크 추가
2. 암기 접근 차단 시 상세 복귀 동선이 없음 -> 단어장 상세 이동 링크 추가
3. 암기 화면 키보드 중심 조작이 부족함 -> `/`, `←/→`, `H` 단축키 추가
4. 단축키 안내가 화면에 노출되지 않음 -> 헤더에 단축키 힌트 문구 추가
5. 오류 메시지가 `status`로 노출돼 중요도가 약함 -> `role=alert`로 변경
6. 정보성 피드백(필터 토글/검색 포커스 이동)이 부족함 -> `info` 상태 배너 추가
7. 상태 표기가 영문 enum(`CORRECT/WRONG/NEW`)으로 노출됨 -> 한국어 상태명으로 변환
8. 하단 컨트롤에서 검색/필터 초기화가 번거로움 -> `초기화` 버튼 추가(검색+맞춘단어숨김+페이지 리셋)
9. 페이지 번호 입력 후 Enter 이동 미지원 -> Enter 키로 즉시 이동 지원
10. 맞춘 단어 숨김 토글의 상태 전달이 약함 -> `aria-pressed` 및 토글 피드백 보강

## 수정 파일
- `app/wordbooks/[id]/memorize/page.tsx`
- `app/wordbooks/[id]/study/studyClient.tsx`

## 검증 결과
- `npm run typecheck`: pass
- `npm run lint`: pass
- Railway 배포 확인: 커밋/푸시 후 확인 예정

## 다음 회차 우선순위
1. `/wordbooks/[id]` 상세의 목록/페이지네이션에서 퀴즈 복귀 컨텍스트 유지
2. `/wordbooks/[id]/quiz-*`에서 오답 큐 및 파트 이동 시 학습 피로도 저감 UI 보강
