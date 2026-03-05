# 웹/모바일 플랫폼 매핑표 v1

기준 토큰: `docs/design-system-unified-tokens-v1.json`

## Color 매핑
- `color.brand.primary`
  - Web: `--ds-color-brand-primary`
  - Mobile: `colors.brandPrimary`
- `color.semantic.background`
  - Web: `--ds-color-background`
  - Mobile: `colors.background`
- `color.semantic.surface`
  - Web: `--ds-color-surface`
  - Mobile: `colors.surface`
- `color.semantic.text`
  - Web: `--ds-color-text`
  - Mobile: `colors.textPrimary`
- `color.semantic.textMuted`
  - Web: `--ds-color-text-muted`
  - Mobile: `colors.textSecondary`
- `color.semantic.border`
  - Web: `--ds-color-border`
  - Mobile: `colors.border`
- `color.semantic.success|warning|danger`
  - Web: `--ds-color-success|warning|danger`
  - Mobile: `colors.success|warning|danger`

## Typography 매핑
- `type.display`
  - Web: `--ds-type-display-size|weight|line`
  - Mobile: `typography.display`
- `type.title`
  - Web: `--ds-type-title-size|weight|line`
  - Mobile: `typography.title`
- `type.body`
  - Web: `--ds-type-body-size|weight|line`
  - Mobile: `typography.body`
- `type.caption`
  - Web: `--ds-type-caption-size|weight|line`
  - Mobile: `typography.caption`

## Spacing/Radius/Shadow/Motion 매핑
- `spacing.*`
  - Web: `--ds-space-*`
  - Mobile: `spacing.*`
- `radius.*`
  - Web: `--ds-radius-*`
  - Mobile: `radius.*`
- `shadow.*`
  - Web: `--ds-shadow-*`
  - Mobile: `shadow.*`
- `motion.duration.*`
  - Web: `--ds-motion-fast|base|slow`
  - Mobile: `motion.duration.*`
- `motion.easing.standard`
  - Web: `--ds-ease-standard`
  - Mobile: `motion.easing.standard`

## Tailwind 매핑 규칙 (Web)
- `tailwind.config.ts`에서 semantic alias 등록
  - `bg-surface` -> `var(--ds-color-surface)`
  - `text-foreground` -> `var(--ds-color-text)`
  - `text-muted` -> `var(--ds-color-text-muted)`
  - `border-default` -> `var(--ds-color-border)`

## React Native 매핑 규칙 (Mobile)
- 스타일 값 직접 하드코딩 금지
- `StyleSheet.create`에서 `@/theme`의 토큰만 사용
- 컴포넌트 공통 상태값(pressed/disabled/loading)은 `componentTokens`에서 관리

## 접근성 매핑
- Focus visibility:
  - Web: `:focus-visible` + 3px outline
  - Mobile: Pressable 상태 변화 + 충분한 대비
- Touch target:
  - Web: 클릭 가능 요소 최소 높이 40px 이상
  - Mobile: 주요 터치 요소 최소 44px 이상
- Form errors:
  - Web/Mobile 모두 오류 문구 텍스트 명시
