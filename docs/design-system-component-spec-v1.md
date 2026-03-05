# 공통 컴포넌트 스펙 v1

기준 토큰: `docs/design-system-unified-tokens-v1.json`

## 1) Button
- variants: `primary`, `secondary`, `ghost`, `danger`
- sizes: `sm`, `md`, `lg`
- states: `default`, `hover`, `focus-visible`, `pressed`, `disabled`, `loading`
- 접근성:
  - focus-visible 시 `color.semantic.focus` 기반 외곽선 표시
  - disabled는 `opacity`만 낮추지 않고 상호작용 불가 상태를 명시
  - 모바일 최소 터치 타깃 44x44 이상

## 2) Input/Form
- variants: `default`, `error`, `disabled`
- sizes: `md`, `lg`
- states: `default`, `focus-visible`, `error`, `disabled`, `readonly`
- 접근성:
  - 모든 입력에 label 연결 (`label` + `id`)
  - 오류 메시지는 필드 옆 인라인 노출, 스크린리더가 읽을 수 있도록 연결
  - 에러 색상만으로 의미를 전달하지 않고 텍스트 메시지 포함

## 3) Card/Surface
- variants: `default`, `subtle`, `interactive`
- sizes: `md`, `lg`
- states: `default`, `hover(interactive only)`, `focus-within`
- 규칙:
  - 정보 우선순위를 위해 보더/그림자 강도를 낮게 유지
  - 카드 내 보조 액션은 링크 또는 메뉴로 우선 배치

## 4) Feedback (Toast/Alert/Skeleton)
- variants: `info`, `success`, `warning`, `danger`
- states: `default`, `dismissible`, `persistent`
- 규칙:
  - 비동기 상태 메시지는 간결한 문장 + 다음 행동 제시
  - toast는 짧은 확인용, 복구 행동이 필요한 경우 alert 사용
  - skeleton은 과한 모션 없이 opacity 기반 최소 표현

## 카피 톤 규칙
- CTA: 짧고 행동 중심 (`학습 시작`, `저장`, `다시 시도`)
- 빈 상태: 현재 상태 + 다음 행동 1개
- 오류 상태: 문제 + 복구 행동 1개

## 자체 검증
- 이 문서의 컴포넌트/상태는 모두 토큰으로 치환 가능하다.
- 임의 색상/간격/반경을 스펙에 포함하지 않았다.
