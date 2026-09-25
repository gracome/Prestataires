-- CreateEnum
CREATE TYPE "QuoteQuestionKind" AS ENUM ('SINGLE_CHOICE', 'MULTI_CHOICE');

-- AlterTable
ALTER TABLE "quote_requests" ADD COLUMN     "estimateAnswers" JSONB,
ADD COLUMN     "estimateMax" INTEGER,
ADD COLUMN     "estimateMin" INTEGER,
ADD COLUMN     "estimateMinutes" INTEGER;

-- CreateTable
CREATE TABLE "quote_settings" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "estimatorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "basePrice" INTEGER NOT NULL DEFAULT 0,
    "baseDurationMinutes" INTEGER NOT NULL DEFAULT 60,
    "marginPercent" INTEGER NOT NULL DEFAULT 15,
    "intro" TEXT,
    "disclaimer" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "quote_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_questions" (
    "id" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "helpText" TEXT,
    "kind" "QuoteQuestionKind" NOT NULL DEFAULT 'SINGLE_CHOICE',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quote_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "priceAdjustment" INTEGER NOT NULL DEFAULT 0,
    "durationAdjustment" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quote_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quote_settings_providerId_key" ON "quote_settings"("providerId");

-- CreateIndex
CREATE INDEX "quote_questions_settingsId_position_idx" ON "quote_questions"("settingsId", "position");

-- CreateIndex
CREATE INDEX "quote_options_questionId_position_idx" ON "quote_options"("questionId", "position");

-- AddForeignKey
ALTER TABLE "quote_settings" ADD CONSTRAINT "quote_settings_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_questions" ADD CONSTRAINT "quote_questions_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "quote_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_options" ADD CONSTRAINT "quote_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "quote_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

