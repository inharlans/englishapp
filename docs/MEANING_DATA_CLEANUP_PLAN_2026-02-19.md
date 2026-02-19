# 의미 데이터 정제 계획 및 이행 보고 (2026-02-19)

## 1) 목표
- 사용자 관점에서 신뢰를 떨어뜨리는 의미 데이터 노이즈를 줄인다.
- 대표 이슈:
  - 품사 미상 표기 `(?)`
  - 속어/비속어성 노이즈(`ㄹㅇ`, `레알`, `ㅈㄴ`, `존나` 등)
  - 의미 구분자 오염(`문명화(?)교양인` 등)

## 2) 정제 원칙
- 의미를 임의 재번역하지 않는다.
- 구조적 정제만 수행한다.
  - 품사 태그 표준화: `(명)/(동)/(형)/(부)/(대)/(전)/(접)/(감)/(조)/(관)/(수)`
  - `(?)` 처리:
    - 기존 태그가 있으면 해당 태그로 대체
    - 없으면 영단어 기반 POS 추론으로 대체
    - 단어 사이 연결용 `(?)`는 쉼표 구분자로 변환
  - 슬랭/노이즈 제거
  - 중복 쉼표/공백 정리

## 3) 실행 절차
1. 사전 진단
   - `npm run wordbooks:report-meaning-quality`
2. 정제 시뮬레이션(dry-run)
   - `npm run wordbooks:cleanse-meaning-quality`
3. 정제 반영(apply)
   - `npm run wordbooks:cleanse-meaning-quality:apply`
4. 사후 검증
   - `npm run wordbooks:report-meaning-quality`

## 4) 구현 파일
- 진단: `scripts/report-meaning-quality.mjs`
- 정제: `scripts/cleanse-meaning-quality.mjs`
- npm 스크립트:
  - `wordbooks:report-meaning-quality`
  - `wordbooks:cleanse-meaning-quality`
  - `wordbooks:cleanse-meaning-quality:apply`

## 5) 이행 결과 (실측)
- 정제 전:
  - `WordbookItem` 총 13,533개
  - `(?)` 포함: 381개
  - 슬랭/노이즈 포함: 14개
- 정제 적용:
  - 업데이트 반영: 405개 `WordbookItem`
- 정제 후:
  - `(?)` 포함: 0개
  - 슬랭/노이즈 포함: 0개

## 6) 후속 작업
- POS 추론 품질을 더 높이기 위해 사전 기반(Kaikki/Wiktionary) 보강 라운드를 별도 실행한다.
- 정제 스크립트를 배치성 운영 작업(예: 주 1회)으로 자동화한다.

