# 구현 상태 (2026-02-20)

- 01 의미/품사 렌더링 품질: 완료
  - `components/MeaningView.tsx`
- 02 마켓 신뢰도/탐색성: 완료(1차)
  - `app/wordbooks/market/page.tsx`
  - `lib/wordbookPresentation.ts`
- 03 카드 롤아웃/동선: 완료(1차)
  - `app/wordbooks/[id]/cards/*`
  - `components/wordbooks/WordbookStudyTabs.tsx`
  - `components/wordbooks/ResumeStudyButton.tsx`
  - `tests/e2e/http-smoke.mjs`
- 04 신고/차단 UX 명확화: 완료
  - `components/wordbooks/BlockOwnerButton.tsx`
  - `components/wordbooks/ReportWordbookButton.tsx`
- 05 대용량 단어장 성능: 완료(1차)
  - `app/wordbooks/[id]/page.tsx` 서버 페이지네이션

## 남은 2차 과제
- 카드 롤아웃: 운영 환경 플래그(`NEXT_PUBLIC_ENABLE_WORDBOOK_CARDS`) 정책 고정
- 성능: 상세 목록 가상 스크롤(virtualization) 적용 여부 검토

