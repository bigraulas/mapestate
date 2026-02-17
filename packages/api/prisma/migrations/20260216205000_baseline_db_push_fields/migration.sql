-- Baseline: these columns were previously applied via prisma db push.
-- This migration aligns the migration history with the actual database state.

-- DropForeignKey
ALTER TABLE "buildings" DROP CONSTRAINT "buildings_locationId_fkey";

-- AlterTable
ALTER TABLE "buildings" ADD COLUMN     "minContractYears" INTEGER,
ADD COLUMN     "osmId" INTEGER,
ADD COLUMN     "ownerEmail" TEXT,
ADD COLUMN     "ownerName" TEXT,
ADD COLUMN     "ownerPhone" TEXT,
ALTER COLUMN "locationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "units" ADD COLUMN     "floorPlan" TEXT,
ADD COLUMN     "hasOffice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasSanitary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maintenancePrice" DOUBLE PRECISION,
ADD COLUMN     "officePrice" DOUBLE PRECISION,
ADD COLUMN     "officeSqm" DOUBLE PRECISION,
ADD COLUMN     "photos" JSONB,
ADD COLUMN     "sanitarySqm" DOUBLE PRECISION,
ADD COLUMN     "usefulHeight" DOUBLE PRECISION,
ADD COLUMN     "warehousePrice" DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "buildings_osmId_key" ON "buildings"("osmId");

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
