# TODO: 단어장 UX/콘텐츠 품질 개선 (2026-02-19)

- [x] 온라인 단어장에 오프라인과 유사한 카드형(뜻 가리기/보기) 별도 페이지 추가
  - 구현: `app/wordbooks/[id]/cards/*`
  - 탭 연결: `components/wordbooks/WordbookStudyTabs.tsx`
- [x] 첫 진입 사용자 기준 파트 크기 기본값을 30으로 고정
  - 수정: `components/wordbooks/useWordbookParting.ts`
  - 원인 보완: 저장값이 없을 때 `Number("")`가 0으로 처리되어 1로 내려가던 케이스 차단
- [x] 의미 데이터의 `(?)` 품사 표기 정제
  - 구현: `scripts/cleanse-meaning-quality.mjs`
  - 규칙: 기존 품사 태그 재사용 + 영단어 기반 POS 추론
- [x] 의미 데이터 품질 정제(부자연/노이즈 표현 감소) 계획 수립 및 실행
  - 진단 스크립트: `scripts/report-meaning-quality.mjs`
  - 정제 실행: `npm run wordbooks:cleanse-meaning-quality:apply`

