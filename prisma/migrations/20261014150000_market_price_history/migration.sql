CREATE TABLE "MarketPrice" (
    "id" TEXT NOT NULL,
    "commodity" TEXT NOT NULL,
    "marketName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ADMIN_ENTERED',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketPrice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketPrice_commodity_location_createdAt_idx"
ON "MarketPrice"("commodity", "location", "createdAt");

ALTER TABLE "MarketPrice"
ADD CONSTRAINT "MarketPrice_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
