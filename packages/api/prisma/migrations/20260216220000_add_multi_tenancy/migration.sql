-- CreateEnum
CREATE TYPE "AgencyStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PLATFORM_ADMIN';

-- CreateTable
CREATE TABLE "agencies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "coverImage" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#0d9488',
    "status" "AgencyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "agencyId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add agencyId to users
ALTER TABLE "users" ADD COLUMN "agencyId" INTEGER;

-- Migrate data: insert agency from agency_settings
INSERT INTO "agencies" ("id", "name", "logo", "coverImage", "address", "phone", "email", "website", "primaryColor", "updatedAt")
SELECT "id", "name", "logo", "coverImage", "address", "phone", "email", "website", "primaryColor", "updatedAt"
FROM "agency_settings"
WHERE "id" = 1;

-- If no agency_settings row exists, create default
INSERT INTO "agencies" ("id", "name", "primaryColor", "updatedAt")
SELECT 1, 'Dunwell', '#0d9488', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "agencies" WHERE "id" = 1);

-- Reset sequence
SELECT setval('"agencies_id_seq"', (SELECT COALESCE(MAX("id"), 0) FROM "agencies"));

-- Set all existing users to agency 1
UPDATE "users" SET "agencyId" = 1 WHERE "agencyId" IS NULL;

-- DropTable
DROP TABLE "agency_settings";

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_agencyId_idx" ON "invitations"("agencyId");

-- CreateIndex
CREATE INDEX "users_agencyId_idx" ON "users"("agencyId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
