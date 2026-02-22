# Frontend API Unification Wave 3

Date: 2026-02-22

## Goal
- Remove remaining direct `apiFetch(...)` usage in `app/*` and `components/*`.
- Route all frontend API calls through `lib/api/*` modules.

## Added API Modules
- `lib/api/words.ts`
  - `importWordsRaw`
- `lib/api/users.ts`
  - `updateDailyGoal`
- `lib/api/blockedOwners.ts`
  - `unblockOwner`

## Expanded API Module
- `lib/api/wordbook.ts`
  - `addWordbookItems`
  - `blockWordbookOwner`
  - `downloadWordbook`
  - `fetchWordbookReviews`
  - `fetchWordbookDetail`
  - `setWordbookPublic`
  - `rateWordbook`
  - `reportWordbook`
  - `syncDownloadedWordbook`
  - `importWordbookItems`

## Refactored Call Sites
- `components/ImportPanel.tsx`
- `components/wordbooks/AddItemsForm.tsx`
- `components/wordbooks/BlockOwnerButton.tsx`
- `components/wordbooks/DailyGoalSetter.tsx`
- `components/wordbooks/DownloadButton.tsx`
- `components/wordbooks/MarketRatingReviews.tsx`
- `components/wordbooks/OfflineSaveButton.tsx`
- `components/wordbooks/PendingWordbookItemsRetryBanner.tsx`
- `components/wordbooks/PublishToggle.tsx`
- `components/wordbooks/RateBox.tsx`
- `components/wordbooks/ReportWordbookButton.tsx`
- `components/wordbooks/SyncDownloadButton.tsx`
- `components/wordbooks/WordbookImportExportPanel.tsx`
- `app/wordbooks/blocked/unblockOwnerButton.tsx`

## Validation
- `npm run typecheck` pass
- `npm run lint` pass
- `npm run mcp:cycle` pass

## Result
- Remaining direct `apiFetch(...)` in UI layers:
  - `app/*`: none
  - `components/*`: none
