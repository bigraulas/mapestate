-- CreateEnum
CREATE TYPE "DealType" AS ENUM ('REQUEST', 'COLD_SALES');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "requests" ADD COLUMN "dealType" "DealType" NOT NULL DEFAULT 'REQUEST';

-- AlterTable
ALTER TABLE "offers" ADD COLUMN "sentAt" TIMESTAMP(3),
ADD COLUMN "emailStatus" "EmailStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "emailId" TEXT;
