CREATE TABLE "MobileRefreshToken" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "deviceId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "rotatedFromId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MobileRefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MobileRefreshToken_tokenHash_key" ON "MobileRefreshToken"("tokenHash");
CREATE UNIQUE INDEX "MobileRefreshToken_userId_deviceId_active_key"
  ON "MobileRefreshToken"("userId", "deviceId")
  WHERE "revokedAt" IS NULL;
CREATE INDEX "MobileRefreshToken_userId_deviceId_createdAt_idx" ON "MobileRefreshToken"("userId", "deviceId", "createdAt");
CREATE INDEX "MobileRefreshToken_expiresAt_idx" ON "MobileRefreshToken"("expiresAt");
CREATE INDEX "MobileRefreshToken_revokedAt_idx" ON "MobileRefreshToken"("revokedAt");

ALTER TABLE "MobileRefreshToken"
  ADD CONSTRAINT "MobileRefreshToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MobileRefreshToken"
  ADD CONSTRAINT "MobileRefreshToken_rotatedFromId_fkey"
  FOREIGN KEY ("rotatedFromId") REFERENCES "MobileRefreshToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;
