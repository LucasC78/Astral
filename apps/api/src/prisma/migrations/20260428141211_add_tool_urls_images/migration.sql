-- CreateEnum
CREATE TYPE "UrlType" AS ENUM ('OFFICIAL_WEBSITE', 'PRODUCT_PAGE', 'DOCS', 'PRICING', 'GITHUB', 'LINKEDIN', 'DIRECTORY', 'CONTACT', 'OTHER');

-- CreateEnum
CREATE TYPE "ImageType" AS ENUM ('LOGO', 'FAVICON', 'SCREENSHOT', 'BANNER', 'PRODUCT_IMAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "CrawlJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "CrawlJobType" AS ENUM ('DISCOVER', 'ENRICH', 'RECRAWL');

-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "primaryImageId" INTEGER,
ADD COLUMN     "primaryUrlId" INTEGER;

-- CreateTable
CREATE TABLE "ToolUrl" (
    "id" SERIAL NOT NULL,
    "toolId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "domain" TEXT,
    "type" "UrlType" NOT NULL DEFAULT 'OTHER',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolUrl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolImage" (
    "id" SERIAL NOT NULL,
    "toolId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "type" "ImageType" NOT NULL DEFAULT 'OTHER',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sourcePageUrl" TEXT,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "altText" TEXT,
    "contentHash" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlQueue" (
    "id" SERIAL NOT NULL,
    "toolId" INTEGER,
    "url" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "domain" TEXT,
    "status" "CrawlJobStatus" NOT NULL DEFAULT 'PENDING',
    "jobType" "CrawlJobType" NOT NULL DEFAULT 'DISCOVER',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrawlQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ToolUrl_toolId_idx" ON "ToolUrl"("toolId");

-- CreateIndex
CREATE INDEX "ToolUrl_domain_idx" ON "ToolUrl"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "ToolUrl_toolId_normalizedUrl_key" ON "ToolUrl"("toolId", "normalizedUrl");

-- CreateIndex
CREATE INDEX "ToolImage_toolId_idx" ON "ToolImage"("toolId");

-- CreateIndex
CREATE INDEX "ToolImage_type_idx" ON "ToolImage"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ToolImage_toolId_normalizedUrl_key" ON "ToolImage"("toolId", "normalizedUrl");

-- CreateIndex
CREATE INDEX "CrawlQueue_status_nextRunAt_idx" ON "CrawlQueue"("status", "nextRunAt");

-- CreateIndex
CREATE INDEX "CrawlQueue_toolId_idx" ON "CrawlQueue"("toolId");

-- CreateIndex
CREATE INDEX "CrawlQueue_domain_idx" ON "CrawlQueue"("domain");

-- AddForeignKey
ALTER TABLE "Tool" ADD CONSTRAINT "Tool_primaryUrlId_fkey" FOREIGN KEY ("primaryUrlId") REFERENCES "ToolUrl"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tool" ADD CONSTRAINT "Tool_primaryImageId_fkey" FOREIGN KEY ("primaryImageId") REFERENCES "ToolImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolUrl" ADD CONSTRAINT "ToolUrl_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolImage" ADD CONSTRAINT "ToolImage_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrawlQueue" ADD CONSTRAINT "CrawlQueue_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

