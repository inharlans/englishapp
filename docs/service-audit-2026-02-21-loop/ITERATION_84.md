# Iteration 84 (2026-02-21)

## 점검 범위
- MCP 실측 기반 상세 페이지 점검: `https://www.oingapp.com/wordbooks/55`
- 상세 페이지 내 학습 탭(`WordbookStudyTabs`) 동선 확인

## 확인된 리스크
1. 상세 페이지에서도 탭 컴포넌트 `뒤로` 버튼이 노출되며, 대상이 현재 페이지(`/wordbooks/[id]`)와 동일해 무의미한 자기참조 링크가 됨
2. 탭 영역의 시각적 노이즈를 증가시키고 사용자의 동작 의도를 흐릴 수 있음

## 조치
- `app/wordbooks/[id]/page.tsx`
  - 상세 페이지에서 `WordbookStudyTabs` 호출 시 `showBack={false}` 적용
  - 학습 하위 화면에서만 `뒤로` 버튼을 유지하고 상세 페이지에서는 제거

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
