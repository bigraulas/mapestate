-- CreateEnum
CREATE TYPE "OfferFeedback" AS ENUM ('SENT', 'VIEWED', 'INTERESTED', 'REJECTED');

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'RENT_AND_SALE';

-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "offers" ADD COLUMN     "feedback" "OfferFeedback",
ADD COLUMN     "feedbackNotes" TEXT;

-- AlterTable
ALTER TABLE "requests" ADD COLUMN     "actualFee" DOUBLE PRECISION,
ADD COLUMN     "agreedPrice" DOUBLE PRECISION,
ADD COLUMN     "closureNotes" TEXT,
ADD COLUMN     "contractEndDate" TIMESTAMP(3),
ADD COLUMN     "contractStartDate" TIMESTAMP(3),
ADD COLUMN     "holdReason" TEXT,
ADD COLUMN     "signedDate" TIMESTAMP(3),
ADD COLUMN     "wonBuildingId" INTEGER,
ADD COLUMN     "wonUnitIds" JSONB;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "dealId" INTEGER;

-- CreateIndex
CREATE INDEX "tenants_dealId_idx" ON "tenants"("dealId");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
