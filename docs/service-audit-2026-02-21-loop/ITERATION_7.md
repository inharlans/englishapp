# 7회차 점검 보고서 (2026-02-21)

## 점검 범위
- 마켓/오프라인/요금제 UX, 접근성, 게스트 동선
- 결제 로직 및 결제 API는 제외

## 발견/반영 체크리스트 (10건)
1. 마켓 필터 적용 시 기존 페이지 번호 유지로 빈 결과가 뜨는 문제를 방지하기 위해 `page=0` 리셋 필드를 추가
2. 마켓 검색 입력에 `aria-describedby`를 연결해 보조 설명을 스크린리더가 함께 읽도록 개선
3. 마켓 결과 카운트 영역에 `aria-atomic`을 추가해 페이지/개수 갱신 문장을 온전히 전달
4. 마켓 상단 페이지네이션을 `nav` 랜드마크로 감싸 내비게이션 의미를 명확화
5. 마켓 목록 컨테이너에 `role=list`, 카드에 `role=listitem`을 추가해 목록 구조를 명확화
6. 마켓 카드의 차단/신고 액션 그룹에 항목별 `aria-label`을 부여해 컨트롤 의미를 명확화
7. 마켓 하단 모바일 고정 페이지네이션을 결과가 있을 때만 렌더링하도록 조건 처리
8. 리뷰 토글 버튼에 평점/리뷰수 기반 `aria-label`을 추가해 숫자 의미를 명시
9. 리뷰 날짜 표기를 UTC 슬라이스에서 `Asia/Seoul` 기준 로컬 표기로 교체
10. 오프라인 라이브러리에서 필터 초기화 시 검색창 포커스를 복귀시키고 결과 카운트 `aria-live`를 강화

## 수정 파일
- `app/wordbooks/market/page.tsx`
- `components/wordbooks/MarketRatingReviews.tsx`
- `app/offline/page.tsx`
- `app/pricing/page.tsx`

## 검증 결과
- `npm run lint`: pass
- `npm run typecheck`: pass
- Railway 배포 확인: pending (푸시 후 4분 대기 + Railway 확인 예정)
