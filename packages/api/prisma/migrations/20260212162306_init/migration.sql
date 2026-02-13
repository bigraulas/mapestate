-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'BROKER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('RENT', 'SALE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('NEW', 'OFFERING', 'TOUR', 'SHORTLIST', 'NEGOTIATION', 'HOT_SIGNED', 'ON_HOLD', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('RENT', 'SALE');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'TOUR', 'NOTE', 'TASK');

-- CreateEnum
CREATE TYPE "OfferGroupStatus" AS ENUM ('UNFINISHED', 'READY');

-- CreateEnum
CREATE TYPE "PriceCalcOption" AS ENUM ('OPTION_ONE', 'OPTION_TWO');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'BROKER',
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "county" TEXT NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "propertyCode" TEXT,
    "totalSqm" DOUBLE PRECISION,
    "availableSqm" DOUBLE PRECISION,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "transactionType" "TransactionType" NOT NULL DEFAULT 'RENT',
    "clearHeight" DOUBLE PRECISION,
    "floorLoading" DOUBLE PRECISION,
    "sprinkler" BOOLEAN NOT NULL DEFAULT false,
    "heating" TEXT,
    "powerSupply" TEXT,
    "buildingStructure" TEXT,
    "lighting" TEXT,
    "gridStructure" TEXT,
    "gridFormat" TEXT,
    "hydrantSystem" BOOLEAN NOT NULL DEFAULT false,
    "isuAuthorization" BOOLEAN NOT NULL DEFAULT false,
    "temperature" TEXT,
    "buildToSuit" BOOLEAN NOT NULL DEFAULT false,
    "polygonPoints" JSONB,
    "serviceCharge" DOUBLE PRECISION,
    "availableFrom" TIMESTAMP(3),
    "description" TEXT,
    "locationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "developerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "warehouseSpace" JSONB,
    "officeSpace" JSONB,
    "sanitarySpace" JSONB,
    "othersSpace" JSONB,
    "docks" INTEGER,
    "driveins" INTEGER,
    "crossDock" BOOLEAN NOT NULL DEFAULT false,
    "images" JSONB,
    "buildingId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "vatNumber" TEXT,
    "jNumber" TEXT,
    "iban" TEXT,
    "address" TEXT,
    "logo" TEXT,
    "openDeals" INTEGER NOT NULL DEFAULT 0,
    "closedDeals" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "jobTitle" TEXT,
    "emails" JSONB NOT NULL DEFAULT '[]',
    "phones" JSONB NOT NULL DEFAULT '[]',
    "source" TEXT,
    "openDeals" INTEGER NOT NULL DEFAULT 0,
    "closedDeals" INTEGER NOT NULL DEFAULT 0,
    "companyId" INTEGER,
    "labelId" INTEGER,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labels" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "numberOfSqm" INTEGER,
    "estimatedFeeValue" DOUBLE PRECISION,
    "contractPeriod" INTEGER,
    "breakOptionAfter" INTEGER,
    "startDate" TIMESTAMP(3),
    "requestType" "RequestType",
    "status" "RequestStatus" NOT NULL DEFAULT 'NEW',
    "lostReason" TEXT,
    "notes" TEXT,
    "closedAt" TIMESTAMP(3),
    "lastStatusChange" TIMESTAMP(3),
    "companyId" INTEGER,
    "personId" INTEGER,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" SERIAL NOT NULL,
    "offerCode" TEXT NOT NULL,
    "downloadable" BOOLEAN NOT NULL DEFAULT false,
    "requestedSqm" INTEGER,
    "requestedType" TEXT,
    "requestedStartDate" TIMESTAMP(3),
    "requestedLocations" JSONB,
    "requestId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "companyId" INTEGER,
    "personId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_groups" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" "OfferGroupStatus" NOT NULL DEFAULT 'UNFINISHED',
    "leaseTermMonths" INTEGER,
    "incentiveMonths" INTEGER,
    "earlyAccessMonths" INTEGER,
    "startDate" TIMESTAMP(3),
    "priceCalcOption" "PriceCalcOption",
    "warehouseSqm" DOUBLE PRECISION,
    "warehouseRentPrice" DOUBLE PRECISION,
    "officeSqm" DOUBLE PRECISION,
    "officeRentPrice" DOUBLE PRECISION,
    "sanitarySqm" DOUBLE PRECISION,
    "sanitaryRentPrice" DOUBLE PRECISION,
    "othersSqm" DOUBLE PRECISION,
    "othersRentPrice" DOUBLE PRECISION,
    "serviceCharge" DOUBLE PRECISION,
    "serviceChargeType" TEXT,
    "docks" INTEGER,
    "driveins" INTEGER,
    "crossDock" BOOLEAN NOT NULL DEFAULT false,
    "images" JSONB,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "polygonPoints" JSONB,
    "description" TEXT,
    "offerId" INTEGER NOT NULL,
    "buildingId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_items" (
    "id" SERIAL NOT NULL,
    "unitName" TEXT NOT NULL,
    "warehouseSqm" DOUBLE PRECISION,
    "offerGroupId" INTEGER NOT NULL,
    "unitId" INTEGER NOT NULL,

    CONSTRAINT "group_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT,
    "duration" INTEGER,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "activityType" "ActivityType" NOT NULL,
    "userId" INTEGER NOT NULL,
    "companyId" INTEGER,
    "requestId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" SERIAL NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "unitId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_LocationToPropertyRequest" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_ActivityToPerson" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "buildings_locationId_idx" ON "buildings"("locationId");

-- CreateIndex
CREATE INDEX "buildings_userId_idx" ON "buildings"("userId");

-- CreateIndex
CREATE INDEX "buildings_developerId_idx" ON "buildings"("developerId");

-- CreateIndex
CREATE INDEX "units_buildingId_idx" ON "units"("buildingId");

-- CreateIndex
CREATE INDEX "units_userId_idx" ON "units"("userId");

-- CreateIndex
CREATE INDEX "companies_userId_idx" ON "companies"("userId");

-- CreateIndex
CREATE INDEX "persons_companyId_idx" ON "persons"("companyId");

-- CreateIndex
CREATE INDEX "persons_labelId_idx" ON "persons"("labelId");

-- CreateIndex
CREATE INDEX "persons_userId_idx" ON "persons"("userId");

-- CreateIndex
CREATE INDEX "requests_companyId_idx" ON "requests"("companyId");

-- CreateIndex
CREATE INDEX "requests_personId_idx" ON "requests"("personId");

-- CreateIndex
CREATE INDEX "requests_userId_idx" ON "requests"("userId");

-- CreateIndex
CREATE INDEX "requests_status_idx" ON "requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "offers_offerCode_key" ON "offers"("offerCode");

-- CreateIndex
CREATE INDEX "offers_requestId_idx" ON "offers"("requestId");

-- CreateIndex
CREATE INDEX "offers_userId_idx" ON "offers"("userId");

-- CreateIndex
CREATE INDEX "offers_companyId_idx" ON "offers"("companyId");

-- CreateIndex
CREATE INDEX "offers_personId_idx" ON "offers"("personId");

-- CreateIndex
CREATE INDEX "offer_groups_offerId_idx" ON "offer_groups"("offerId");

-- CreateIndex
CREATE INDEX "offer_groups_buildingId_idx" ON "offer_groups"("buildingId");

-- CreateIndex
CREATE INDEX "group_items_offerGroupId_idx" ON "group_items"("offerGroupId");

-- CreateIndex
CREATE INDEX "group_items_unitId_idx" ON "group_items"("unitId");

-- CreateIndex
CREATE INDEX "activities_userId_idx" ON "activities"("userId");

-- CreateIndex
CREATE INDEX "activities_companyId_idx" ON "activities"("companyId");

-- CreateIndex
CREATE INDEX "activities_requestId_idx" ON "activities"("requestId");

-- CreateIndex
CREATE INDEX "activities_date_idx" ON "activities"("date");

-- CreateIndex
CREATE INDEX "tenants_unitId_idx" ON "tenants"("unitId");

-- CreateIndex
CREATE INDEX "tenants_companyId_idx" ON "tenants"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "_LocationToPropertyRequest_AB_unique" ON "_LocationToPropertyRequest"("A", "B");

-- CreateIndex
CREATE INDEX "_LocationToPropertyRequest_B_index" ON "_LocationToPropertyRequest"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ActivityToPerson_AB_unique" ON "_ActivityToPerson"("A", "B");

-- CreateIndex
CREATE INDEX "_ActivityToPerson_B_index" ON "_ActivityToPerson"("B");

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "labels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_groups" ADD CONSTRAINT "offer_groups_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_groups" ADD CONSTRAINT "offer_groups_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_items" ADD CONSTRAINT "group_items_offerGroupId_fkey" FOREIGN KEY ("offerGroupId") REFERENCES "offer_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_items" ADD CONSTRAINT "group_items_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LocationToPropertyRequest" ADD CONSTRAINT "_LocationToPropertyRequest_A_fkey" FOREIGN KEY ("A") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LocationToPropertyRequest" ADD CONSTRAINT "_LocationToPropertyRequest_B_fkey" FOREIGN KEY ("B") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActivityToPerson" ADD CONSTRAINT "_ActivityToPerson_A_fkey" FOREIGN KEY ("A") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActivityToPerson" ADD CONSTRAINT "_ActivityToPerson_B_fkey" FOREIGN KEY ("B") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
