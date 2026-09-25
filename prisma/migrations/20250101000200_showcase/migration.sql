-- CreateEnum
CREATE TYPE "HighlightKind" AS ENUM ('COMMITMENT', 'CREDENTIAL');

-- DropIndex
DROP INDEX "gallery_images_providerId_idx";

-- AlterTable
ALTER TABLE "gallery_images" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "serviceId" TEXT;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "aftercare" TEXT,
ADD COLUMN     "idealFor" TEXT,
ADD COLUMN     "included" TEXT,
ADD COLUMN     "popular" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preparation" TEXT,
ADD COLUMN     "shortDescription" TEXT;

-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN     "aboutPortraitUrl" TEXT,
ADD COLUMN     "aboutQuote" TEXT,
ADD COLUMN     "heroCtaLabel" TEXT,
ADD COLUMN     "heroEyebrow" TEXT,
ADD COLUMN     "realisationsIntro" TEXT,
ADD COLUMN     "servicesIntro" TEXT,
ADD COLUMN     "showRealisations" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "provider_highlights" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "kind" "HighlightKind" NOT NULL DEFAULT 'COMMITMENT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "meta" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "provider_highlights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_steps" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "service_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "provider_highlights_providerId_kind_idx" ON "provider_highlights"("providerId", "kind");

-- CreateIndex
CREATE INDEX "service_steps_serviceId_position_idx" ON "service_steps"("serviceId", "position");

-- CreateIndex
CREATE INDEX "gallery_images_providerId_active_idx" ON "gallery_images"("providerId", "active");

-- CreateIndex
CREATE INDEX "gallery_images_serviceId_idx" ON "gallery_images"("serviceId");

-- AddForeignKey
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_highlights" ADD CONSTRAINT "provider_highlights_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_steps" ADD CONSTRAINT "service_steps_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

