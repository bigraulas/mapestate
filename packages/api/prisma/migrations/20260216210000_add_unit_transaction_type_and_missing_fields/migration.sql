-- AlterTable: Add transactionType to units (RENT or SALE per space)
ALTER TABLE "units" ADD COLUMN "transactionType" "TransactionType" NOT NULL DEFAULT 'RENT';
