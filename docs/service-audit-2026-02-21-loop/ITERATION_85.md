# Iteration 85 (2026-02-21)

## 점검 범위
- MCP 점검: `https://www.oingapp.com/login`
- 로그인 리다이렉트 파라미터(`next`) 처리 검토

## 확인된 리스크
1. 로그인 페이지에서 `next` 쿼리를 별도 검증 없이 리다이렉트 경로로 사용
2. 외부 URL이 주입될 경우 오픈 리다이렉트로 악용될 가능성 존재

## 조치
- `app/login/page.tsx`
  - `normalizeNextPath` 추가
  - `next`는 내부 경로(`/...`)만 허용하고, 비정상 값(`null`, 외부 스킴, `//`)은 `/`로 강제

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
