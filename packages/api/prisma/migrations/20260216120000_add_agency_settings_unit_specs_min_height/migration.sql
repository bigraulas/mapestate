-- AlterTable
ALTER TABLE "buildings" ADD COLUMN     "expandingPossibilities" TEXT;

-- AlterTable
ALTER TABLE "requests" ADD COLUMN     "minHeight" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "units" ADD COLUMN     "availableFrom" TIMESTAMP(3),
ADD COLUMN     "buildingStructure" TEXT,
ADD COLUMN     "contractLength" TEXT,
ADD COLUMN     "expandingPossibilities" TEXT,
ADD COLUMN     "floorLoading" DOUBLE PRECISION,
ADD COLUMN     "gridFormat" TEXT,
ADD COLUMN     "gridStructure" TEXT,
ADD COLUMN     "heating" TEXT,
ADD COLUMN     "hydrantSystem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isuAuthorization" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lighting" TEXT,
ADD COLUMN     "serviceCharge" DOUBLE PRECISION,
ADD COLUMN     "sprinkler" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "temperature" TEXT;

-- CreateTable
CREATE TABLE "agency_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL DEFAULT 'Dunwell',
    "logo" TEXT,
    "coverImage" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#0d9488',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_settings_pkey" PRIMARY KEY ("id")
);
