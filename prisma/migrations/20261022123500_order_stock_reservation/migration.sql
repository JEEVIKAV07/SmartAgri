ALTER TABLE "Order" ADD COLUMN "stockReservedAt" TIMESTAMP(3);

UPDATE "Order"
SET "stockReservedAt" = "createdAt"
WHERE "status" IN ('ACCEPTED', 'READY', 'COMPLETED');
