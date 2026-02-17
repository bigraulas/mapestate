-- AlterTable
ALTER TABLE "units" ADD COLUMN "salePrice" DOUBLE PRECISION;
ALTER TABLE "units" ADD COLUMN "salePriceVatIncluded" BOOLEAN NOT NULL DEFAULT false;
