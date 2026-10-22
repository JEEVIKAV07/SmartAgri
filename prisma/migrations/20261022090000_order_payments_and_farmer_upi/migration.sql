CREATE TYPE "PaymentMethod" AS ENUM ('UPI', 'CASH');
CREATE TYPE "PaymentStatus" AS ENUM ('INCOMPLETE', 'COMPLETED');

ALTER TABLE "User" ADD COLUMN "upiId" TEXT;

ALTER TABLE "Order"
ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'INCOMPLETE',
ADD COLUMN "buyerPaymentMarkedAt" TIMESTAMP(3),
ADD COLUMN "paymentCompletedAt" TIMESTAMP(3);
