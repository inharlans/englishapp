ALTER TABLE "User"
ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "stripeSubscriptionId" TEXT,
ADD COLUMN "stripeSubscriptionStatus" TEXT;

CREATE UNIQUE INDEX "User_stripeCustomerId_key"
ON "User"("stripeCustomerId");

CREATE UNIQUE INDEX "User_stripeSubscriptionId_key"
ON "User"("stripeSubscriptionId");

CREATE TABLE "PaymentEvent" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" INTEGER,
    "currency" TEXT,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentEvent_providerEventId_key"
ON "PaymentEvent"("providerEventId");

CREATE INDEX "PaymentEvent_userId_createdAt_idx"
ON "PaymentEvent"("userId", "createdAt");

CREATE INDEX "PaymentEvent_provider_eventType_createdAt_idx"
ON "PaymentEvent"("provider", "eventType", "createdAt");

ALTER TABLE "PaymentEvent"
ADD CONSTRAINT "PaymentEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ApiRequestMetric" (
    "id" SERIAL NOT NULL,
    "route" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiRequestMetric_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApiRequestMetric_createdAt_idx"
ON "ApiRequestMetric"("createdAt");

CREATE INDEX "ApiRequestMetric_route_createdAt_idx"
ON "ApiRequestMetric"("route", "createdAt");

CREATE INDEX "ApiRequestMetric_status_createdAt_idx"
ON "ApiRequestMetric"("status", "createdAt");

ALTER TABLE "ApiRequestMetric"
ADD CONSTRAINT "ApiRequestMetric_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AppErrorEvent" (
    "id" SERIAL NOT NULL,
    "level" TEXT NOT NULL,
    "route" TEXT,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "context" JSONB,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppErrorEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AppErrorEvent_createdAt_idx"
ON "AppErrorEvent"("createdAt");

CREATE INDEX "AppErrorEvent_level_createdAt_idx"
ON "AppErrorEvent"("level", "createdAt");

CREATE INDEX "AppErrorEvent_route_createdAt_idx"
ON "AppErrorEvent"("route", "createdAt");

ALTER TABLE "AppErrorEvent"
ADD CONSTRAINT "AppErrorEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
