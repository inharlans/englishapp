CREATE INDEX "WordbookStudyItemState_userId_wordbookId_status_idx"
ON "WordbookStudyItemState"("userId", "wordbookId", "status");

CREATE INDEX "WordbookStudyItemState_userId_wordbookId_everCorrect_everWrong_idx"
ON "WordbookStudyItemState"("userId", "wordbookId", "everCorrect", "everWrong");
